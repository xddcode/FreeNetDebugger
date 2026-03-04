use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub protocol: String,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub local_port: Option<u16>,
    pub local_host: Option<String>,
    pub ws_url: Option<String>,
}
