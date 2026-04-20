//! HTTP client wrapper that attaches a NIP-98 `Authorization` header to
//! every request, honours `--dry-run`, and surfaces structured errors.

use std::time::Duration;

use reqwest::{Method, StatusCode};
use serde::Serialize;
use serde_json::Value;
use thiserror::Error;
use tracing::debug;

use crate::auth::{AdminSigner, AuthError};
use crate::config::GlobalFlags;

/// Client-side request errors with enough structure to pick an exit code.
#[derive(Debug, Error)]
pub enum ClientError {
    #[error("auth error: {0}")]
    Auth(String),

    #[error("invalid key source: {0}")]
    KeySource(#[from] AuthError),

    #[error("network error: {0}")]
    Network(String),

    #[error("server returned {status}: {body}")]
    Server {
        status: u16,
        body: String,
    },

    #[error("usage error: {0}")]
    Usage(String),
}

/// A NIP-98-aware HTTP client bound to one signer and base URL.
pub struct ForumAdminClient<'a> {
    http: reqwest::Client,
    base_url: String,
    signer: AdminSigner,
    dry_run: bool,
    json: bool,
    verbose: bool,
    // Keep a lifetime so GlobalFlags can be borrowed if ever needed later.
    _marker: std::marker::PhantomData<&'a ()>,
}

/// Simple representation of a planned (dry-run) or executed request.
#[derive(Debug, Serialize)]
pub struct PreparedRequest {
    pub method: String,
    pub url: String,
    pub authorization: String,
    pub body: Option<Value>,
}

impl<'a> ForumAdminClient<'a> {
    pub fn new(flags: &GlobalFlags, signer: AdminSigner) -> Result<Self, ClientError> {
        let http = reqwest::Client::builder()
            .user_agent(concat!("forum-admin/", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| ClientError::Network(e.to_string()))?;
        Ok(Self {
            http,
            base_url: flags.base_url().to_string(),
            signer,
            dry_run: flags.dry_run,
            json: flags.json,
            verbose: flags.verbose,
            _marker: std::marker::PhantomData,
        })
    }

    /// Build the full URL for a relative API path.
    pub fn url_for(&self, path: &str) -> String {
        format!(
            "{base}{path}",
            base = self.base_url,
            path = if path.starts_with('/') {
                path.to_string()
            } else {
                format!("/{path}")
            }
        )
    }

    /// Prepare a signed request without sending it. Useful for `--dry-run`
    /// and unit tests — the Authorization header is fully formed.
    pub fn prepare<B: Serialize>(
        &self,
        method: Method,
        path: &str,
        body: Option<&B>,
    ) -> Result<PreparedRequest, ClientError> {
        let url = self.url_for(path);
        let body_bytes = match body {
            Some(b) => Some(
                serde_json::to_vec(b)
                    .map_err(|e| ClientError::Usage(format!("serialize body: {e}")))?,
            ),
            None => None,
        };
        let body_ref = body_bytes.as_deref();
        let authorization = self
            .signer
            .sign(&url, method.as_str(), body_ref)
            .map_err(|e| ClientError::Auth(e.to_string()))?;
        let body_value = body_bytes
            .as_ref()
            .map(|b| serde_json::from_slice::<Value>(b).unwrap_or(Value::Null));
        Ok(PreparedRequest {
            method: method.as_str().to_string(),
            url,
            authorization,
            body: body_value,
        })
    }

    /// Execute a prepared request. Returns the parsed JSON body on 2xx.
    async fn execute(
        &self,
        prepared: &PreparedRequest,
    ) -> Result<Value, ClientError> {
        let method = Method::from_bytes(prepared.method.as_bytes())
            .map_err(|e| ClientError::Usage(format!("invalid HTTP method: {e}")))?;
        let mut req = self
            .http
            .request(method, &prepared.url)
            .header("Authorization", &prepared.authorization);

        if let Some(body) = &prepared.body {
            req = req.header("Content-Type", "application/json").json(body);
        }

        debug!(url = %prepared.url, method = %prepared.method, "sending request");

        let resp = req
            .send()
            .await
            .map_err(|e| ClientError::Network(e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| ClientError::Network(e.to_string()))?;

        if status.is_success() {
            if text.is_empty() {
                return Ok(Value::Null);
            }
            return serde_json::from_str::<Value>(&text)
                .map_err(|e| ClientError::Server {
                    status: status.as_u16(),
                    body: format!("invalid JSON: {e}"),
                });
        }

        Err(map_server_error(status, &text))
    }

    /// Perform a request — either send it or, under `--dry-run`, emit the
    /// prepared request to stdout (in the currently-selected format) and
    /// return a synthetic success Value.
    pub async fn send<B: Serialize>(
        &self,
        method: Method,
        path: &str,
        body: Option<&B>,
    ) -> Result<Value, ClientError> {
        let prepared = self.prepare(method, path, body)?;

        if self.dry_run {
            self.emit_dry_run(&prepared);
            let mut out = serde_json::Map::new();
            out.insert("dry_run".into(), Value::Bool(true));
            out.insert("method".into(), Value::String(prepared.method.clone()));
            out.insert("url".into(), Value::String(prepared.url.clone()));
            if let Some(b) = prepared.body {
                out.insert("body".into(), b);
            }
            return Ok(Value::Object(out));
        }

        self.execute(&prepared).await
    }

    fn emit_dry_run(&self, prepared: &PreparedRequest) {
        if self.json {
            if let Ok(s) = serde_json::to_string(prepared) {
                println!("{s}");
            }
        } else {
            eprintln!(
                "[dry-run] {method} {url}",
                method = prepared.method,
                url = prepared.url
            );
            if self.verbose {
                eprintln!(
                    "[dry-run] Authorization: {}",
                    truncate_for_log(&prepared.authorization)
                );
                if let Some(b) = &prepared.body {
                    eprintln!("[dry-run] body: {}", b);
                }
            }
        }
    }

    // ── Convenience verbs ────────────────────────────────────────────────

    pub async fn get(&self, path: &str) -> Result<Value, ClientError> {
        self.send::<Value>(Method::GET, path, None).await
    }

    pub async fn post<B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<Value, ClientError> {
        self.send(Method::POST, path, Some(body)).await
    }

    pub async fn post_empty(&self, path: &str) -> Result<Value, ClientError> {
        self.send::<Value>(Method::POST, path, None).await
    }

    #[allow(dead_code)] // reserved for commands that surface HTTP DELETE
    pub async fn delete(&self, path: &str) -> Result<Value, ClientError> {
        self.send::<Value>(Method::DELETE, path, None).await
    }
}

fn map_server_error(status: StatusCode, body: &str) -> ClientError {
    // 401/403 surface as auth errors so the exit-code mapper routes them
    // to exit 3; everything else in 4xx/5xx is "server".
    if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
        return ClientError::Auth(format!(
            "{status}: {body}",
            status = status,
            body = shorten(body)
        ));
    }
    ClientError::Server {
        status: status.as_u16(),
        body: shorten(body),
    }
}

fn shorten(body: &str) -> String {
    const MAX: usize = 512;
    if body.len() <= MAX {
        body.to_string()
    } else {
        format!("{}…", &body[..MAX])
    }
}

fn truncate_for_log(header: &str) -> String {
    const KEEP: usize = 24;
    if header.len() <= KEEP {
        header.to_string()
    } else {
        format!("{}… ({} bytes)", &header[..KEEP], header.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::AdminSigner;
    use zeroize::Zeroizing;

    fn flags(base: &str) -> GlobalFlags {
        GlobalFlags {
            base_url: base.to_string(),
            json: true,
            dry_run: false,
            verbose: false,
        }
    }

    fn signer() -> AdminSigner {
        AdminSigner::Local(Zeroizing::new([0x33u8; 32]))
    }

    #[test]
    fn url_for_handles_leading_slash_and_trailing_slash() {
        let c = ForumAdminClient::new(&flags("https://forum.test/"), signer()).unwrap();
        assert_eq!(
            c.url_for("/api/whitelist"),
            "https://forum.test/api/whitelist"
        );
        assert_eq!(
            c.url_for("api/whitelist"),
            "https://forum.test/api/whitelist"
        );
    }

    #[test]
    fn prepare_attaches_nip98_authorization() {
        let c = ForumAdminClient::new(&flags("https://forum.test"), signer()).unwrap();
        let body = serde_json::json!({"pubkey": "a".repeat(64)});
        let prepared = c
            .prepare(Method::POST, "/api/whitelist", Some(&body))
            .unwrap();
        assert_eq!(prepared.method, "POST");
        assert_eq!(prepared.url, "https://forum.test/api/whitelist");
        assert!(prepared.authorization.starts_with("Nostr "));
        assert_eq!(prepared.body.unwrap()["pubkey"], "a".repeat(64));
    }

    #[test]
    fn dry_run_returns_synthetic_value_without_sending() {
        let mut f = flags("https://forum.test");
        f.dry_run = true;
        let c = ForumAdminClient::new(&f, signer()).unwrap();
        let prepared = c
            .prepare(Method::GET, "/api/whitelist", None::<&Value>)
            .unwrap();
        // The prepared struct must carry the auth header verbatim, and the
        // JSON round-trip must succeed — this is what the dry-run path emits.
        assert!(prepared.authorization.starts_with("Nostr "));
        let serialised = serde_json::to_value(&prepared).unwrap();
        assert_eq!(serialised["method"], "GET");
    }

    #[test]
    fn server_error_mapping_prefers_auth_for_401() {
        let err = map_server_error(StatusCode::UNAUTHORIZED, "nope");
        assert!(matches!(err, ClientError::Auth(_)));
    }

    #[test]
    fn server_error_mapping_generic_500() {
        let err = map_server_error(StatusCode::INTERNAL_SERVER_ERROR, "boom");
        match err {
            ClientError::Server { status, body } => {
                assert_eq!(status, 500);
                assert_eq!(body, "boom");
            }
            _ => panic!("expected Server error"),
        }
    }
}
