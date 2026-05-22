use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::{mpsc, Mutex};

use crate::protocols::http_client::build_http_client;

pub struct ConnEntry {
    pub data_tx: mpsc::Sender<Vec<u8>>,
    pub abort: tokio::task::AbortHandle,
}

pub struct AppState {
    pub connections: Arc<Mutex<HashMap<String, ConnEntry>>>,
    pub http_client: reqwest::Client,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
            http_client: build_http_client(),
        }
    }
}
