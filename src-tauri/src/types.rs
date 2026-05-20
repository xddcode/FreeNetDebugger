use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub protocol: String,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub local_port: Option<u16>,
    pub local_host: Option<String>,
    pub ws_url: Option<String>,
    pub serial_port: Option<String>,
    pub baud_rate: Option<u32>,
    pub data_bits: Option<u8>,
    pub stop_bits: Option<u8>,
    pub parity: Option<String>,
    pub http_url: Option<String>,
    pub http_method: Option<String>,
    #[serde(default)]
    pub http_headers: Vec<HttpHeader>,
    pub http_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpHeader {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub mem_used: u64,
    pub mem_total: u64,
    pub mem_percent: f32,
}
