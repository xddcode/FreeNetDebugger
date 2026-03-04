mod commands;
mod events;
mod protocols;
mod state;
mod types;
mod utils;

use commands::{connect, disconnect, exit_app, list_serial_ports, send_data};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            connect,
            disconnect,
            send_data,
            list_serial_ports,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
