use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter};
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// Read buffer size per connection — 64 KB is a good balance between latency
/// and syscall overhead. At 100 MB/s this means ~1563 read() calls/second.
const READ_BUF: usize = 65_536;

/// mpsc channel capacity — 2048 pending outgoing messages before backpressure.
const CHAN_CAP: usize = 2048;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ─── Tauri Event Payloads ────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
struct DataEvent {
    connection_id: String,
    direction: String,
    data: Vec<u8>,
    source: Option<String>,
    timestamp: u64,
}

#[derive(Clone, Serialize)]
struct StatusEvent {
    connection_id: String,
    status: String,
    message: String,
}

// ─── Connection Input ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub protocol: String,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub local_port: Option<u16>,
    pub local_host: Option<String>,
    pub ws_url: Option<String>,
}

// ─── Managed App State ───────────────────────────────────────────────────────

struct ConnEntry {
    data_tx: mpsc::Sender<Vec<u8>>,
    abort: tokio::task::AbortHandle,
}

pub struct AppState {
    connections: Arc<Mutex<HashMap<String, ConnEntry>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn emit_status(app: &AppHandle, id: &str, status: &str, message: &str) {
    let _ = app.emit(
        "net:status",
        StatusEvent {
            connection_id: id.to_string(),
            status: status.to_string(),
            message: message.to_string(),
        },
    );
}

async fn emit_data(
    app: &AppHandle,
    id: &str,
    direction: &str,
    data: Vec<u8>,
    source: Option<String>,
) {
    let _ = app.emit(
        "net:data",
        DataEvent {
            connection_id: id.to_string(),
            direction: direction.to_string(),
            data,
            source,
            timestamp: now_ms(),
        },
    );
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
async fn connect(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    config: ConnectionConfig,
) -> Result<(), String> {
    // Drop existing connection for this id
    {
        let mut conns = state.connections.lock().await;
        if let Some(old) = conns.remove(&id) {
            old.abort.abort();
        }
    }

    let (data_tx, mut data_rx) = mpsc::channel::<Vec<u8>>(CHAN_CAP);

    let abort_handle = match config.protocol.as_str() {
        // ── TCP Client ──────────────────────────────────────────────────────
        "TCP_CLIENT" => {
            let host = config.remote_host.ok_or("Missing remote_host")?;
            let port = config.remote_port.ok_or("Missing remote_port")?;
            let app2 = app.clone();
            let id2 = id.clone();

            let jh = tokio::spawn(async move {
                emit_status(&app2, &id2, "connecting", "").await;

                let addr = format!("{}:{}", host, port);
                match TcpStream::connect(&addr).await {
                    Ok(stream) => {
                        // Disable Nagle's algorithm for minimum send latency
                        let _ = stream.set_nodelay(true);
                        let peer = stream
                            .peer_addr()
                            .map(|a| a.to_string())
                            .unwrap_or_default();
                        emit_status(&app2, &id2, "connected", &peer).await;

                        let (mut rd, wr) = stream.into_split();
                        let mut buf = vec![0u8; READ_BUF];
                        // Buffered writer reduces syscalls for small sends
                        let mut bwr = BufWriter::with_capacity(READ_BUF, wr);

                        loop {
                            tokio::select! {
                                n = rd.read(&mut buf) => match n {
                                    Ok(0) => {
                                        emit_status(&app2, &id2, "disconnected", "Remote closed").await;
                                        break;
                                    }
                                    Ok(n) => {
                                        emit_data(&app2, &id2, "recv", buf[..n].to_vec(), None).await;
                                    }
                                    Err(e) => {
                                        emit_status(&app2, &id2, "error", &e.to_string()).await;
                                        break;
                                    }
                                },
                                msg = data_rx.recv() => match msg {
                                    Some(d) => {
                                        if bwr.write_all(&d).await.is_err() || bwr.flush().await.is_err() {
                                            emit_status(&app2, &id2, "error", "Write failed").await;
                                            break;
                                        }
                                    }
                                    None => break,
                                },
                            }
                        }
                    }
                    Err(e) => emit_status(&app2, &id2, "error", &e.to_string()).await,
                }
            });
            jh.abort_handle()
        }

        // ── TCP Server ──────────────────────────────────────────────────────
        "TCP_SERVER" => {
            let port = config.local_port.ok_or("Missing local_port")?;
            let host = config.local_host.unwrap_or_else(|| "0.0.0.0".to_string());
            let app2 = app.clone();
            let id2 = id.clone();

            let jh = tokio::spawn(async move {
                let bind_addr = format!("{}:{}", host, port);
                match TcpListener::bind(&bind_addr).await {
                    Ok(listener) => {
                        let local = listener.local_addr().map(|a| a.to_string()).unwrap_or(bind_addr);
                        emit_status(&app2, &id2, "listening", &local).await;

                        // Per-client broadcast channels
                        let client_txs: Arc<Mutex<Vec<mpsc::Sender<Vec<u8>>>>> =
                            Arc::new(Mutex::new(Vec::new()));

                        // Broadcast task — forwards data from the command channel to all clients
                        let txs2 = client_txs.clone();
                        tokio::spawn(async move {
                            while let Some(data) = data_rx.recv().await {
                                let mut txs = txs2.lock().await;
                                txs.retain(|tx| !tx.is_closed());
                                for tx in txs.iter() {
                                    let _ = tx.try_send(data.clone());
                                }
                            }
                        });

                        loop {
                            match listener.accept().await {
                                Ok((stream, addr)) => {
                                    let _ = stream.set_nodelay(true);
                                    emit_status(&app2, &id2, "client_connected", &addr.to_string()).await;

                                    let (client_tx, mut client_rx) = mpsc::channel::<Vec<u8>>(CHAN_CAP);
                                    client_txs.lock().await.push(client_tx);

                                    let app3 = app2.clone();
                                    let id3 = id2.clone();

                                    tokio::spawn(async move {
                                        let (mut rd, wr) = stream.into_split();
                                        let mut buf = vec![0u8; READ_BUF];
                                        let mut bwr = BufWriter::with_capacity(READ_BUF, wr);

                                        loop {
                                            tokio::select! {
                                                n = rd.read(&mut buf) => match n {
                                                    Ok(0) | Err(_) => {
                                                        emit_status(&app3, &id3, "client_disconnected", &addr.to_string()).await;
                                                        break;
                                                    }
                                                    Ok(n) => {
                                                        emit_data(&app3, &id3, "recv", buf[..n].to_vec(), Some(addr.to_string())).await;
                                                    }
                                                },
                                                data = client_rx.recv() => match data {
                                                    Some(d) => {
                                                        let _ = bwr.write_all(&d).await;
                                                        let _ = bwr.flush().await;
                                                    }
                                                    None => break,
                                                },
                                            }
                                        }
                                    });
                                }
                                Err(_) => break,
                            }
                        }
                    }
                    Err(e) => emit_status(&app2, &id2, "error", &e.to_string()).await,
                }
            });
            jh.abort_handle()
        }

        // ── UDP ─────────────────────────────────────────────────────────────
        "UDP_CLIENT" | "UDP_SERVER" => {
            let port = config.local_port.unwrap_or(0);
            let remote = if let (Some(h), Some(p)) = (config.remote_host, config.remote_port) {
                Some(format!("{}:{}", h, p))
            } else {
                None
            };
            let app2 = app.clone();
            let id2 = id.clone();

            let jh = tokio::spawn(async move {
                let bind_addr = format!("0.0.0.0:{}", port);
                match UdpSocket::bind(&bind_addr).await {
                    Ok(sock) => {
                        let local = sock.local_addr().map(|a| a.to_string()).unwrap_or(bind_addr);
                        emit_status(&app2, &id2, "connected", &local).await;

                        let sock = Arc::new(sock);
                        let sock_r = sock.clone();
                        let app3 = app2.clone();
                        let id3 = id2.clone();

                        // Receive loop
                        tokio::spawn(async move {
                            let mut buf = vec![0u8; 65536];
                            loop {
                                match sock_r.recv_from(&mut buf).await {
                                    Ok((n, addr)) => {
                                        emit_data(&app3, &id3, "recv", buf[..n].to_vec(), Some(addr.to_string())).await;
                                    }
                                    Err(_) => break,
                                }
                            }
                        });

                        // Send loop
                        while let Some(data) = data_rx.recv().await {
                            if let Some(ref r) = remote {
                                let _ = sock.send_to(&data, r).await;
                            }
                        }
                    }
                    Err(e) => emit_status(&app2, &id2, "error", &e.to_string()).await,
                }
            });
            jh.abort_handle()
        }

        // ── WebSocket ───────────────────────────────────────────────────────
        "WEBSOCKET" => {
            let url = config
                .ws_url
                .or_else(|| {
                    config.remote_host.as_ref().and_then(|h| {
                        config
                            .remote_port
                            .map(|p| format!("ws://{}:{}", h, p))
                    })
                })
                .ok_or("Missing WebSocket URL")?;

            let app2 = app.clone();
            let id2 = id.clone();

            let jh = tokio::spawn(async move {
                emit_status(&app2, &id2, "connecting", "").await;

                match connect_async(&url).await {
                    Ok((ws, _)) => {
                        emit_status(&app2, &id2, "connected", &url).await;

                        let (mut sink, mut stream) = ws.split();
                        let app3 = app2.clone();
                        let id3 = id2.clone();

                        // Write task
                        tokio::spawn(async move {
                            while let Some(data) = data_rx.recv().await {
                                let msg = Message::binary(data);
                                if sink.send(msg).await.is_err() {
                                    break;
                                }
                            }
                        });

                        // Read loop
                        while let Some(msg) = stream.next().await {
                            match msg {
                                Ok(Message::Binary(d)) => {
                                    emit_data(&app3, &id3, "recv", d.to_vec(), None).await;
                                }
                                Ok(Message::Text(t)) => {
                                    emit_data(&app3, &id3, "recv", t.as_bytes().to_vec(), None).await;
                                }
                                Ok(Message::Close(_)) => {
                                    emit_status(&app3, &id3, "disconnected", "Server closed").await;
                                    break;
                                }
                                Err(e) => {
                                    emit_status(&app3, &id3, "error", &e.to_string()).await;
                                    break;
                                }
                                _ => {}
                            }
                        }
                    }
                    Err(e) => emit_status(&app2, &id2, "error", &e.to_string()).await,
                }
            });
            jh.abort_handle()
        }

        proto => return Err(format!("Unsupported protocol: {}", proto)),
    };

    state.connections.lock().await.insert(
        id,
        ConnEntry {
            data_tx,
            abort: abort_handle,
        },
    );

    Ok(())
}

#[tauri::command]
async fn disconnect(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut conns = state.connections.lock().await;
    if let Some(entry) = conns.remove(&id) {
        entry.abort.abort();
    }
    let _ = app.emit(
        "net:status",
        StatusEvent {
            connection_id: id,
            status: "idle".to_string(),
            message: "Disconnected by user".to_string(),
        },
    );
    Ok(())
}

#[tauri::command]
async fn send_data(
    state: State<'_, AppState>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let conns = state.connections.lock().await;
    match conns.get(&id) {
        Some(entry) => entry
            .data_tx
            .send(data)
            .await
            .map_err(|e| e.to_string()),
        None => Err("No active connection".to_string()),
    }
}

#[tauri::command]
fn list_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
        .unwrap_or_default()
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            connect,
            disconnect,
            send_data,
            list_serial_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
