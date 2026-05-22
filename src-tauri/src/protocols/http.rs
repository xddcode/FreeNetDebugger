use tauri::AppHandle;
use tokio::sync::mpsc;

use super::handler::ProtocolHandler;
use super::http_client::{build_http_client, execute_http_request, HttpRequestPayload};
use crate::events::{emit_data, emit_status};
use crate::utils::now_ms;

pub struct HttpHandler {
    pub client: reqwest::Client,
}

impl HttpHandler {
    pub fn new() -> Self {
        Self {
            client: build_http_client(),
        }
    }
}

impl ProtocolHandler for HttpHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            emit_status(&app, &id, "connected", "HTTP ready").await;

            while let Some(data) = data_rx.recv().await {
                let payload: HttpRequestPayload = match serde_json::from_slice(&data) {
                    Ok(p) => p,
                    Err(e) => {
                        emit_status(&app, &id, "error", &format!("Invalid request JSON: {}", e)).await;
                        continue;
                    }
                };

                let start = now_ms();
                match execute_http_request(&self.client, payload).await {
                    Ok(dto) => {
                        let header_lines: Vec<String> = dto
                            .headers
                            .iter()
                            .map(|(k, v)| format!("{}: {}", k, v))
                            .collect();
                        let status_text = format!(
                            "HTTP {} {} ({} ms)\n{}",
                            dto.status_code,
                            dto.status_text,
                            dto.elapsed_ms,
                            header_lines.join("\n")
                        );
                        emit_data(&app, &id, "system", status_text.into_bytes(), None).await;
                        emit_data(&app, &id, "recv", dto.body.into_bytes(), None).await;
                    }
                    Err(e) => {
                        let _ = start;
                        emit_status(&app, &id, "error", &e).await;
                    }
                }
            }

            emit_status(&app, &id, "disconnected", "HTTP session closed").await;
        })
        .abort_handle()
    }
}
