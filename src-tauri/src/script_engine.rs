use std::sync::{Arc, Mutex};

use rquickjs::{Context, Function, Runtime};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::events::emit_data;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptConfig {
    pub id: String,
    pub source: String,
    pub session_id: String,
}

pub struct ScriptEngine {
    _runtime: Runtime,
    context: Context,
    output: Arc<Mutex<Vec<String>>>,
    app: AppHandle,
    session_id: String,
}

impl ScriptEngine {
    pub fn new(app: AppHandle, session_id: String) -> Result<Self, String> {
        let runtime = Runtime::new().map_err(|e| format!("Runtime create failed: {}", e))?;
        let context = Context::base(&runtime).map_err(|e| format!("Context create failed: {}", e))?;

        let output = Arc::new(Mutex::new(Vec::new()));
        let engine = Self {
            _runtime: runtime,
            context,
            output,
            app,
            session_id,
        };

        engine.register_globals()?;
        Ok(engine)
    }

    fn register_globals(&self) -> Result<(), String> {
        let app = self.app.clone();
        let session_id = self.session_id.clone();
        let output = self.output.clone();

        self.context.with(|ctx| {
            // log(message)
            let log_output = output.clone();
            let log_fn = Function::new(ctx.clone(), move |msg: String| {
                let mut out = log_output.lock().unwrap();
                out.push(format!("[LOG] {}", msg));
            }).map_err(|e| format!("log fn: {}", e))?;
            ctx.globals().set("log", log_fn).map_err(|e| format!("set log: {}", e))?;

            // send(data)
            let send_app = app.clone();
            let send_id = session_id.clone();
            let send_fn = Function::new(ctx.clone(), move |data: String| {
                let bytes = data.into_bytes();
                let app = send_app.clone();
                let id = send_id.clone();
                tokio::spawn(async move {
                    let _ = emit_data(&app, &id, "send", bytes, Some("script".to_string())).await;
                });
            }).map_err(|e| format!("send fn: {}", e))?;
            ctx.globals().set("send", send_fn).map_err(|e| format!("set send: {}", e))?;

            // sleep(ms) - blocking sleep for simplicity in script context
            let sleep_fn = Function::new(ctx.clone(), move |ms: u64| {
                std::thread::sleep(std::time::Duration::from_millis(ms));
            }).map_err(|e| format!("sleep fn: {}", e))?;
            ctx.globals().set("sleep", sleep_fn).map_err(|e| format!("set sleep: {}", e))?;

            // onReceive(callback) - store callback for later invocation
            let recv_output = output.clone();
            let onrecv_fn = Function::new(ctx.clone(), move |_callback: Function| {
                let mut out = recv_output.lock().unwrap();
                out.push("[SYS] onReceive registered".to_string());
            }).map_err(|e| format!("onrecv fn: {}", e))?;
            ctx.globals().set("onReceive", onrecv_fn).map_err(|e| format!("set onReceive: {}", e))?;

            Ok(())
        }).map_err(|e: String| e)
    }

    pub fn run(&self, source: &str) -> Result<Vec<String>, String> {
        {
            let mut out = self.output.lock().unwrap();
            out.clear();
        }

        self.context.with(|ctx| {
            ctx.eval::<(), &str>(source).map_err(|e| format!("Script error: {}", e))?;
            Ok(())
        }).map_err(|e: String| e)?;

        let out = self.output.lock().unwrap().clone();
        Ok(out)
    }

    pub fn get_output(&self) -> Vec<String> {
        self.output.lock().unwrap().clone()
    }
}
