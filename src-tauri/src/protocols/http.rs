use std::collections::HashMap;

use tauri::AppHandle;
use tokio::sync::mpsc;

use super::handler::ProtocolHandler;
use crate::events::{emit_data, emit_status};
use crate::utils::now_ms;

pub struct HttpHandler {
    pub client: reqwest::Client,
}

impl HttpHandler {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap_or_default();
        Self { client }
    }
}

#[derive(serde::Deserialize)]
struct HttpRequestPayload {
    method: String,
    url: String,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    body: Option<String>,
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

                let method = payload.method.to_uppercase();
                let url = payload.url;

                let mut req_builder = match method.as_str() {
                    "GET" => self.client.get(&url),
                    "POST" => self.client.post(&url),
                    "PUT" => self.client.put(&url),
                    "DELETE" => self.client.delete(&url),
                    "PATCH" => self.client.patch(&url),
                    "HEAD" => self.client.head(&url),
                    "OPTIONS" => self.client.request(reqwest::Method::OPTIONS, &url),
                    _ => {
                        emit_status(&app, &id, "error", &format!("Unsupported method: {}", method)).await;
                        continue;
                    }
                };

                for (key, value) in &payload.headers {
                    req_builder = req_builder.header(key, value);
                }

                if let Some(body) = payload.body {
                    req_builder = req_builder.body(body);
                }

                let start = now_ms();
                match req_builder.send().await {
                    Ok(resp) => {
                        let status = resp.status();
                        let resp_headers = resp.headers().clone();
                        let body_bytes = match resp.bytes().await {
                            Ok(b) => b.to_vec(),
                            Err(e) => {
                                emit_status(&app, &id, "error", &format!("Read body failed: {}", e)).await;
                                continue;
                            }
                        };
                        let elapsed = now_ms() - start;

                        // Emit status + headers as system log
                        let header_lines: Vec<String> = resp_headers
                            .iter()
                            .map(|(k, v)| format!("{}: {}", k, v.to_str().unwrap_or("")))
                            .collect();
                        let status_text = format!(
                            "HTTP {} {} ({} ms)\n{}",
                            status.as_u16(),
                            status.canonical_reason().unwrap_or(""),
                            elapsed,
                            header_lines.join("\n")
                        );
                        emit_data(&app, &id, "system",
                            status_text.into_bytes(),
                            None,
                        ).await;

                        // Emit body as recv data
                        emit_data(&app, &id, "recv", body_bytes, None).await;
                    }
                    Err(e) => {
                        emit_status(&app, &id, "error", &format!("Request failed: {}", e)).await;
                    }
                }
            }

            emit_status(&app, &id, "disconnected", "HTTP session closed").await;
        })
        .abort_handle()
    }
}
