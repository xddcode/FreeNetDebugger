use std::io::{Read, Write};
use std::time::Duration;

use tauri::AppHandle;
use tokio::sync::mpsc;

use super::handler::ProtocolHandler;
use crate::events::{emit_data, emit_status};

fn is_permission_error(e: &serialport::Error) -> bool {
    let s = e.to_string().to_lowercase();
    s.contains("permission") || s.contains("access") || s.contains("denied")
}

pub struct SerialHandler {
    pub port_name: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
}

impl ProtocolHandler for SerialHandler {
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        mut data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle {
        tokio::spawn(async move {
            emit_status(&app, &id, "connecting", &format!("Opening {}", self.port_name)).await;

            let port_result = tokio::task::spawn_blocking({
                let port_name = self.port_name.clone();
                let baud_rate = self.baud_rate;
                let data_bits = self.data_bits;
                let stop_bits = self.stop_bits;
                let parity = self.parity.clone();
                move || {
                    let data_bits = match data_bits {
                        5 => serialport::DataBits::Five,
                        6 => serialport::DataBits::Six,
                        7 => serialport::DataBits::Seven,
                        _ => serialport::DataBits::Eight,
                    };
                    let stop_bits = match stop_bits {
                        2 => serialport::StopBits::Two,
                        _ => serialport::StopBits::One,
                    };
                    let parity = match parity.as_str() {
                        "odd" => serialport::Parity::Odd,
                        "even" => serialport::Parity::Even,
                        _ => serialport::Parity::None,
                    };

                    serialport::new(&port_name, baud_rate)
                        .data_bits(data_bits)
                        .stop_bits(stop_bits)
                        .parity(parity)
                        .timeout(Duration::from_millis(100))
                        .open()
                }
            })
            .await;

            let mut port = match port_result {
                Ok(Ok(port)) => port,
                Ok(Err(e)) => {
                    let msg = if is_permission_error(&e) {
                        #[cfg(target_os = "linux")]
                        { format!("Permission denied: add your user to the 'dialout' group (sudo usermod -a -G dialout $USER)") }
                        #[cfg(target_os = "macos")]
                        { format!("Permission denied: ensure you have access to {}", self.port_name) }
                        #[cfg(not(any(target_os = "linux", target_os = "macos")))]
                        { format!("Serial open failed: {}", e) }
                    } else {
                        format!("Serial open failed: {}", e)
                    };
                    emit_status(&app, &id, "error", &msg).await;
                    return;
                }
                Err(e) => {
                    emit_status(&app, &id, "error", &format!("Serial task failed: {}", e)).await;
                    return;
                }
            };

            emit_status(&app, &id, "connected", &self.port_name).await;

            // Clone port for read/write split
            let mut read_port = match port.try_clone() {
                Ok(p) => p,
                Err(e) => {
                    emit_status(&app, &id, "error", &format!("Serial clone failed: {}", e)).await;
                    return;
                }
            };

            let (serial_tx, mut serial_rx) = mpsc::channel::<Vec<u8>>(1024);

            // Spawn blocking read thread
            let read_handle = tokio::task::spawn_blocking(move || {
                let mut buf = [0u8; 4096];
                loop {
                    match read_port.read(&mut buf) {
                        Ok(0) => break,
                        Ok(n) => {
                            if serial_tx.blocking_send(buf[..n].to_vec()).is_err() {
                                break;
                            }
                        }
                        Err(e) => {
                            if e.kind() != std::io::ErrorKind::TimedOut {
                                break;
                            }
                        }
                    }
                }
            });

            // Pin the read handle so it can be used across select iterations
            let mut read_handle = std::pin::pin!(read_handle);

            // Async loop: forward received data to app and handle outgoing data
            loop {
                tokio::select! {
                    data = serial_rx.recv() => match data {
                        Some(d) => {
                            emit_data(&app, &id, "recv", d, None).await;
                        }
                        None => break,
                    },
                    msg = data_rx.recv() => match msg {
                        Some(d) => {
                            if port.write_all(&d).is_err() || port.flush().is_err() {
                                break;
                            }
                        }
                        None => break,
                    },
                    _ = &mut read_handle => break,
                }
            }

            emit_status(&app, &id, "disconnected", "Serial port closed").await;
        })
        .abort_handle()
    }
}
