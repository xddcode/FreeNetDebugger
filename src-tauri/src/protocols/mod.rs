pub mod handler;
pub mod http;
pub mod http_client;
pub mod serial;
pub mod tcp;
pub mod udp;
pub mod websocket;

use tauri::AppHandle;
use tokio::sync::mpsc;

use self::handler::ProtocolHandler;
use self::http::HttpHandler;
use self::serial::SerialHandler;
use self::tcp::{TcpClientHandler, TcpServerHandler};
use self::udp::UdpHandler;
use self::websocket::WebSocketHandler;
use crate::types::ConnectionConfig;

/// Build a protocol handler from connection config.
pub fn build_handler(config: ConnectionConfig) -> Result<Box<dyn ProtocolHandler>, String> {
    match config.protocol.as_str() {
        "TCP_CLIENT" => {
            let host = config.remote_host.ok_or("Missing remote_host")?;
            let port = config.remote_port.ok_or("Missing remote_port")?;
            Ok(Box::new(TcpClientHandler { host, port }))
        }
        "TCP_SERVER" => {
            let port = config.local_port.ok_or("Missing local_port")?;
            let host = config.local_host.unwrap_or_else(|| "0.0.0.0".to_string());
            Ok(Box::new(TcpServerHandler { host, port }))
        }
        "UDP_CLIENT" | "UDP_SERVER" => {
            let port = config.local_port.unwrap_or(0);
            let remote = if let (Some(h), Some(p)) = (config.remote_host, config.remote_port) {
                Some(format!("{}:{}", h, p))
            } else {
                None
            };
            Ok(Box::new(UdpHandler { local_port: port, remote }))
        }
        "WEBSOCKET" => {
            let url = config
                .ws_url
                .or_else(|| {
                    config
                        .remote_host
                        .as_ref()
                        .and_then(|h| config.remote_port.map(|p| format!("ws://{}:{}", h, p)))
                })
                .ok_or("Missing WebSocket URL")?;
            Ok(Box::new(WebSocketHandler { url }))
        }
        "SERIAL" => {
            let port_name = config.serial_port.ok_or("Missing serial_port")?;
            let baud_rate = config.baud_rate.unwrap_or(115200);
            let data_bits = config.data_bits.unwrap_or(8);
            let stop_bits = config.stop_bits.unwrap_or(1);
            let parity = config.parity.unwrap_or_else(|| "none".to_string());
            Ok(Box::new(SerialHandler { port_name, baud_rate, data_bits, stop_bits, parity }))
        }
        "HTTP" => Ok(Box::new(HttpHandler::new())),
        proto => Err(format!("Unsupported protocol: {}", proto)),
    }
}

/// Spawn a connection task for the given config.
/// This is the main entry point called by the `connect` command.
pub fn spawn_connection_task(
    app: AppHandle,
    id: String,
    config: ConnectionConfig,
    data_rx: mpsc::Receiver<Vec<u8>>,
) -> Result<tokio::task::AbortHandle, String> {
    let handler = build_handler(config)?;
    Ok(handler.spawn(app, id, data_rx))
}
