use std::sync::Arc;

use tauri::AppHandle;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};

use super::handler::ProtocolHandler;
use crate::events::{emit_data, emit_status};
use crate::utils::{CHAN_CAP, READ_BUF};

pub struct TcpClientHandler {
    pub host: String,
    pub port: u16,
}

impl ProtocolHandler for TcpClientHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            emit_status(&app, &id, "connecting", ""
            ).await;

            let addr = format!("{}:{}", self.host, self.port);
            match TcpStream::connect(&addr).await {
                Ok(stream) => {
                    let _ = stream.set_nodelay(true);
                    let peer = stream
                        .peer_addr()
                        .map(|a| a.to_string())
                        .unwrap_or_default();
                    emit_status(&app, &id, "connected", &peer).await;

                    let (mut rd, wr) = stream.into_split();
                    let mut buf = vec![0u8; READ_BUF];
                    let mut bwr = BufWriter::with_capacity(READ_BUF, wr);

                    loop {
                        tokio::select! {
                            n = rd.read(&mut buf) => match n {
                                Ok(0) => {
                                    emit_status(&app, &id, "disconnected", "Remote closed").await;
                                    break;
                                }
                                Ok(n) => {
                                    emit_data(&app, &id, "recv", buf[..n].to_vec(), None).await;
                                }
                                Err(e) => {
                                    emit_status(&app, &id, "error", &e.to_string()).await;
                                    break;
                                }
                            },
                            msg = data_rx.recv() => match msg {
                                Some(d) => {
                                    if bwr.write_all(&d).await.is_err() || bwr.flush().await.is_err() {
                                        emit_status(&app, &id, "error", "Write failed").await;
                                        break;
                                    }
                                }
                                None => break,
                            },
                        }
                    }
                }
                Err(e) => emit_status(&app, &id, "error", &e.to_string()).await,
            }
        }).abort_handle()
    }
}

pub struct TcpServerHandler {
    pub host: String,
    pub port: u16,
}

impl ProtocolHandler for TcpServerHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            let bind_addr = format!("{}:{}", self.host, self.port);
            match TcpListener::bind(&bind_addr).await {
                Ok(listener) => {
                    let local = listener
                        .local_addr()
                        .map(|a| a.to_string())
                        .unwrap_or(bind_addr);
                    emit_status(&app, &id, "listening", &local).await;

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
                                emit_status(&app, &id, "client_connected", &addr.to_string()
                                ).await;

                                let (client_tx, mut client_rx) =
                                    mpsc::channel::<Vec<u8>>(CHAN_CAP);
                                client_txs.lock().await.push(client_tx);

                                let app2 = app.clone();
                                let id2 = id.clone();

                                tokio::spawn(async move {
                                    let (mut rd, wr) = stream.into_split();
                                    let mut buf = vec![0u8; READ_BUF];
                                    let mut bwr = BufWriter::with_capacity(READ_BUF, wr);

                                    loop {
                                        tokio::select! {
                                            n = rd.read(&mut buf) => match n {
                                                Ok(0) | Err(_) => {
                                                    emit_status(&app2, &id2, "client_disconnected", &addr.to_string()).await;
                                                    break;
                                                }
                                                Ok(n) => {
                                                    emit_data(&app2, &id2, "recv", buf[..n].to_vec(), Some(addr.to_string())).await;
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
                Err(e) => emit_status(&app, &id, "error", &e.to_string()).await,
            }
        }).abort_handle()
    }
}
