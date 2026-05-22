mod commands;
mod events;
mod protocols;
mod script_engine;
mod state;
mod types;
mod utils;

use commands::{
    connect, disconnect, disconnect_all, exit_app, get_system_stats, http_request, list_serial_ports,
    run_script, send_data,
};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            connect,
            disconnect,
            disconnect_all,
            send_data,
            http_request,
            list_serial_ports,
            run_script,
            exit_app,
            get_system_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
