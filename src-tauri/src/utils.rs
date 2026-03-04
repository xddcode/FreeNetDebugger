use std::time::{SystemTime, UNIX_EPOCH};

/// Read buffer size per connection — 64 KB is a good balance between latency
/// and syscall overhead. At 100 MB/s this means ~1563 read() calls/second.
pub const READ_BUF: usize = 65_536;

/// mpsc channel capacity — 2048 pending outgoing messages before backpressure.
pub const CHAN_CAP: usize = 2048;

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
