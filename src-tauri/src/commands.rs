use tauri::{AppHandle, State};
use tokio::sync::mpsc;

use crate::events::emit_status;
use crate::protocols::spawn_connection_task;
use crate::state::{AppState, ConnEntry};
use crate::types::ConnectionConfig;
use crate::utils::CHAN_CAP;

#[tauri::command]
pub async fn connect(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    config: ConnectionConfig,
) -> Result<(), String> {
    {
        let mut conns = state.connections.lock().await;
        if let Some(old) = conns.remove(&id) {
            old.abort.abort();
        }
    }

    let (data_tx, data_rx) = mpsc::channel::<Vec<u8>>(CHAN_CAP);
    let abort_handle = spawn_connection_task(app, id.clone(), config, data_rx)?;

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
pub async fn disconnect(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut conns = state.connections.lock().await;
    if let Some(entry) = conns.remove(&id) {
        entry.abort.abort();
    }

    emit_status(&app, &id, "idle", "Disconnected by user").await;
    Ok(())
}

#[tauri::command]
pub async fn send_data(
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
pub fn list_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
        .unwrap_or_default()
}
