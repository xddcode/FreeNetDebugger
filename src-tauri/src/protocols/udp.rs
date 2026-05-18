use std::sync::Arc;

use tauri::AppHandle;
use tokio::net::UdpSocket;
use tokio::sync::mpsc;

use super::handler::ProtocolHandler;
use crate::events::{emit_data, emit_status};

pub struct UdpHandler {
    pub local_port: u16,
    pub remote: Option<String>,
}

impl ProtocolHandler for UdpHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            let bind_addr = format!("0.0.0.0:{}", self.local_port);
            match UdpSocket::bind(&bind_addr).await {
                Ok(sock) => {
                    let local = sock
                        .local_addr()
                        .map(|a| a.to_string())
                        .unwrap_or(bind_addr);
                    emit_status(&app, &id, "connected", &local).await;

                    let sock = Arc::new(sock);
                    let sock_r = sock.clone();
                    let app2 = app.clone();
                    let id2 = id.clone();

                    tokio::spawn(async move {
                        let mut buf = vec![0u8; 65536];
                        loop {
                            match sock_r.recv_from(&mut buf).await {
                                Ok((n, addr)) => {
                                    emit_data(
                                        &app2,
                                        &id2,
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
                        if let Some(ref r) = self.remote {
                            let _ = sock.send_to(&data, r).await;
                        }
                    }
                }
                Err(e) => emit_status(&app, &id, "error", &e.to_string()).await,
            }
        }).abort_handle()
    }
}
