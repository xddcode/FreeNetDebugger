use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tauri::AppHandle;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter};
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};

use crate::events::{emit_data, emit_status};
use crate::types::ConnectionConfig;
use crate::utils::{CHAN_CAP, READ_BUF};

pub fn spawn_connection_task(
    app: AppHandle,
    id: String,
    config: ConnectionConfig,
    mut data_rx: mpsc::Receiver<Vec<u8>>,
) -> Result<tokio::task::AbortHandle, String> {
    let abort_handle = match config.protocol.as_str() {
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
                        let _ = stream.set_nodelay(true);
                        let peer = stream
                            .peer_addr()
                            .map(|a| a.to_string())
                            .unwrap_or_default();
                        emit_status(&app2, &id2, "connected", &peer).await;

                        let (mut rd, wr) = stream.into_split();
                        let mut buf = vec![0u8; READ_BUF];
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
        "TCP_SERVER" => {
            let port = config.local_port.ok_or("Missing local_port")?;
            let host = config.local_host.unwrap_or_else(|| "0.0.0.0".to_string());
            let app2 = app.clone();
            let id2 = id.clone();

            let jh = tokio::spawn(async move {
                let bind_addr = format!("{}:{}", host, port);
                match TcpListener::bind(&bind_addr).await {
                    Ok(listener) => {
                        let local = listener
                            .local_addr()
                            .map(|a| a.to_string())
                            .unwrap_or(bind_addr);
                        emit_status(&app2, &id2, "listening", &local).await;

                        let client_txs: Arc<Mutex<Vec<mpsc::Sender<Vec<u8>>>>> =
                            Arc::new(Mutex::new(Vec::new()));

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
                                    emit_status(&app2, &id2, "client_connected", &addr.to_string())
                                        .await;

                                    let (client_tx, mut client_rx) =
                                        mpsc::channel::<Vec<u8>>(CHAN_CAP);
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
                        let local = sock
                            .local_addr()
                            .map(|a| a.to_string())
                            .unwrap_or(bind_addr);
                        emit_status(&app2, &id2, "connected", &local).await;

                        let sock = Arc::new(sock);
                        let sock_r = sock.clone();
                        let app3 = app2.clone();
                        let id3 = id2.clone();

                        tokio::spawn(async move {
                            let mut buf = vec![0u8; 65536];
                            loop {
                                match sock_r.recv_from(&mut buf).await {
                                    Ok((n, addr)) => {
                                        emit_data(
                                            &app3,
                                            &id3,
                                            "recv",
                                            buf[..n].to_vec(),
                                            Some(addr.to_string()),
                                        )
                                        .await;
                                    }
                                    Err(_) => break,
                                }
                            }
                        });

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
        "WEBSOCKET" => {
            let url = config
                .ws_url
                .or_else(|| {
                    config
                        .remote_host
                        .as_ref()
                        .and_then(|h| config.remote_port.map(|p| format!("ws://{}:{}", h, p)))
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

                        tokio::spawn(async move {
                            while let Some(data) = data_rx.recv().await {
                                let msg = Message::binary(data);
                                if sink.send(msg).await.is_err() {
                                    break;
                                }
                            }
                        });

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

    Ok(abort_handle)
}
