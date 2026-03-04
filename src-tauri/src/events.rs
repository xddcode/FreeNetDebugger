use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::utils::now_ms;

#[derive(Clone, Serialize)]
pub struct DataEvent {
    connection_id: String,
    direction: String,
    data: Vec<u8>,
    source: Option<String>,
    timestamp: u64,
}

#[derive(Clone, Serialize)]
pub struct StatusEvent {
    connection_id: String,
    status: String,
    message: String,
}

pub async fn emit_status(app: &AppHandle, id: &str, status: &str, message: &str) {
    let _ = app.emit(
        "net:status",
        StatusEvent {
            connection_id: id.to_string(),
            status: status.to_string(),
            message: message.to_string(),
        },
    );
}

pub async fn emit_data(
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
