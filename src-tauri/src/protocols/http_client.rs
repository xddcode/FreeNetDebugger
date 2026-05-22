use std::collections::HashMap;

use reqwest::Url;
use serde::Serialize;

use crate::utils::now_ms;

#[derive(serde::Deserialize)]
pub struct HttpQueryParam {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(serde::Deserialize)]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub params: Vec<HttpQueryParam>,
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponseDto {
    pub status_code: u16,
    pub status_text: String,
    pub elapsed_ms: u64,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub body_size: usize,
    pub content_type: String,
}

fn build_url_with_params(url: &str, params: &[HttpQueryParam]) -> String {
    let mut parsed = match Url::parse(url) {
        Ok(u) => u,
        Err(_) => return url.to_string(),
    };
    parsed.set_query(None);
    {
        let mut pairs = parsed.query_pairs_mut();
        for p in params.iter().filter(|p| p.enabled && !p.key.is_empty()) {
            pairs.append_pair(&p.key, &p.value);
        }
    }
    parsed.to_string()
}

fn format_http_error(err: &reqwest::Error, url: &str) -> String {
    if err.is_connect() {
        let endpoint = Url::parse(url)
            .ok()
            .and_then(|parsed| {
                let host = parsed.host_str()?;
                let port = parsed.port_or_known_default()?;
                Some(format!("{}:{}", host, port))
            })
            .unwrap_or_else(|| url.to_string());

        let detail = err.to_string().to_ascii_lowercase();
        if detail.contains("refused") || detail.contains("10061") {
            return format!("connect ECONNREFUSED {}", endpoint);
        }
        if detail.contains("timed out") || detail.contains("10060") {
            return format!("connect ETIMEDOUT {}", endpoint);
        }
        if detail.contains("unreachable") || detail.contains("10065") {
            return format!("connect EHOSTUNREACH {}", endpoint);
        }
        return format!("connect {} ({})", endpoint, err);
    }

    if err.is_timeout() {
        return format!("timeout: {}", err);
    }

    format!("Request failed: {}", err)
}

pub async fn execute_http_request(
    client: &reqwest::Client,
    payload: HttpRequestPayload,
) -> Result<HttpResponseDto, String> {
    let method = payload.method.to_uppercase();
    let url = build_url_with_params(&payload.url, &payload.params);

    let mut req_builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    for (key, value) in &payload.headers {
        req_builder = req_builder.header(key, value);
    }

    if let Some(body) = payload.body {
        req_builder = req_builder.body(body);
    }

    let start = now_ms();
    let resp = req_builder
        .send()
        .await
        .map_err(|e| format_http_error(&e, &url))?;

    let status = resp.status();
    let resp_headers = resp.headers().clone();
    let body_bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Read body failed: {}", e))?;
    let elapsed = now_ms() - start;

    let mut headers = HashMap::new();
    let mut content_type = String::new();
    for (key, value) in resp_headers.iter() {
        let key_str = key.as_str().to_ascii_lowercase();
        let value_str = value.to_str().unwrap_or("").to_string();
        headers.insert(key_str.clone(), value_str.clone());
        if key_str == "content-type" {
            content_type = value_str;
        }
    }

    let body_size = body_bytes.len();
    let body = String::from_utf8_lossy(&body_bytes).into_owned();

    Ok(HttpResponseDto {
        status_code: status.as_u16(),
        status_text: status
            .canonical_reason()
            .unwrap_or("")
            .to_string(),
        elapsed_ms: elapsed,
        headers,
        body,
        body_size,
        content_type,
    })
}

pub fn build_http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(5))
        .pool_max_idle_per_host(8)
        .tcp_keepalive(Some(std::time::Duration::from_secs(60)))
        .tcp_nodelay(true)
        .build()
        .unwrap_or_default()
}
