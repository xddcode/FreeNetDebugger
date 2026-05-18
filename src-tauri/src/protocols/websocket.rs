use tauri::AppHandle;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

use super::handler::ProtocolHandler;
use crate::events::{emit_data, emit_status};

pub struct WebSocketHandler {
    pub url: String,
}

impl ProtocolHandler for WebSocketHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            emit_status(&app, &id, "connecting", "").await;

            match connect_async(&self.url).await {
                Ok((ws, _)) => {
                    emit_status(&app, &id, "connected", &self.url).await;

                    let (mut sink, mut stream) = ws.split();
                    let app2 = app.clone();
                    let id2 = id.clone();

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
                                emit_data(&app2, &id2, "recv", d.to_vec(), None).await;
                            }
                            Ok(Message::Text(t)) => {
                                emit_data(&app2, &id2, "recv", t.as_bytes().to_vec(), None).await;
                            }
                            Ok(Message::Close(_)) => {
                                emit_status(&app2, &id2, "disconnected", "Server closed").await;
                                break;
                            }
                            Err(e) => {
                                emit_status(&app2, &id2, "error", &e.to_string()).await;
                                break;
                            }
                            _ => {}
                        }
                    }
                }
                Err(e) => emit_status(&app, &id, "error", &e.to_string()).await,
            }
        }).abort_handle()
    }
}
