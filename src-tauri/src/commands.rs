use tauri::{AppHandle, State};
use tokio::sync::mpsc;

use crate::events::emit_status;
use crate::protocols::spawn_connection_task;
use crate::state::{AppState, ConnEntry};
use crate::types::{ConnectionConfig, SystemStats};
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
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    data: Vec<u8>,
    config: Option<ConnectionConfig>,
) -> Result<(), String> {
    let mut conns = state.connections.lock().await;

    // Auto-spawn handler if no active connection and config is provided
    // (used by stateless protocols like HTTP)
    if !conns.contains_key(&id) {
        match config {
            Some(cfg) => {
                let (data_tx, data_rx) = mpsc::channel::<Vec<u8>>(CHAN_CAP);
                let abort_handle = spawn_connection_task(app, id.clone(), cfg, data_rx)?;
                conns.insert(
                    id.clone(),
                    ConnEntry {
                        data_tx,
                        abort: abort_handle,
                    },
                );
            }
            None => return Err("No active connection".to_string()),
        }
    }

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
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn list_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
        .unwrap_or_default()
}

#[tauri::command]
pub fn run_script(app: AppHandle, session_id: String, source: String) -> Result<Vec<String>, String> {
    let engine = crate::script_engine::ScriptEngine::new(app, session_id)
        .map_err(|e| format!("Engine init failed: {}", e))?;
    let output = engine.run(&source)?;
    Ok(output)
}

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    use sysinfo::{System, RefreshKind, CpuRefreshKind, MemoryRefreshKind};

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();
    sys.refresh_memory();

    let cpu_percent = sys.global_cpu_usage();
    let mem_total = sys.total_memory();
    let mem_used = sys.used_memory();
    let mem_percent = if mem_total > 0 {
        (mem_used as f32 / mem_total as f32) * 100.0
    } else {
        0.0
    };

    SystemStats {
        cpu_percent,
        mem_used,
        mem_total,
        mem_percent,
    }
}
