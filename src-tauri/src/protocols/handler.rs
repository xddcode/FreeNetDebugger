use tauri::AppHandle;
use tokio::sync::mpsc;

/// Trait for protocol-specific connection handlers.
/// Each protocol implements this to encapsulate its connection lifecycle.
pub trait ProtocolHandler: Send + 'static {
    /// Spawn the protocol handler as a tokio task and return its abort handle.
    fn spawn(
        self: Box<Self>,
        app: AppHandle,
        id: String,
        data_rx: mpsc::Receiver<Vec<u8>>,
    ) -> tokio::task::AbortHandle;
}
