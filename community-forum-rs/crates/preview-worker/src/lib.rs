//! DreamLab link-preview-api Worker (Rust port)
//!
//! Proxies requests to fetch OpenGraph metadata, bypassing CORS.
//! Replaces the TypeScript Cloudflare Workers implementation.
//!
//! Endpoints:
//!   GET /preview?url=...  -- fetch OG metadata or Twitter oEmbed
//!   GET /health           -- health check
//!   GET /stats            -- cache statistics (CF Cache API)
//!   OPTIONS               -- CORS preflight

use regex::Regex;
use serde::{Deserialize, Serialize};
use worker::*;

// ── Constants ────────────────────────────────────────────────────────────────

const TWITTER_OEMBED_URL: &str = "https://publish.twitter.com/oembed";
const CACHE_TTL_OG: u32 = 10 * 24 * 60 * 60; // 10 days (seconds)
const CACHE_TTL_TWITTER: u32 = 24 * 60 * 60; // 1 day  (seconds)

// ── Response types ───────────────────────────────────────────────────────────

#[derive(Serialize)]
struct OgPreviewResponse {
    r#type: &'static str,
    url: String,
    domain: String,
    favicon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(rename = "siteName", skip_serializing_if = "Option::is_none")]
    site_name: Option<String>,
    cached: bool,
}

#[derive(Serialize)]
struct TwitterEmbedResponse {
    r#type: &'static str,
    url: String,
    html: String,
    author_name: String,
    author_url: String,
    provider_name: String,
    cached: bool,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    runtime: &'static str,
}

#[derive(Serialize)]
struct StatsResponse {
    cache: &'static str,
    note: &'static str,
}

/// Intermediate struct for deserializing Twitter oEmbed API response.
#[derive(Deserialize)]
struct TwitterOembedData {
    html: String,
    author_name: String,
    author_url: String,
    #[serde(default)]
    provider_name: Option<String>,
}

/// Intermediate for round-tripping cached OG data (without `cached` field baked in).
#[derive(Serialize, Deserialize, Clone)]
struct OgCachePayload {
    r#type: String,
    url: String,
    domain: String,
    favicon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(rename = "siteName", skip_serializing_if = "Option::is_none")]
    site_name: Option<String>,
}

/// Intermediate for round-tripping cached Twitter data.
#[derive(Serialize, Deserialize, Clone)]
struct TwitterCachePayload {
    r#type: String,
    url: String,
    html: String,
    author_name: String,
    author_url: String,
    provider_name: String,
}

/// Unified cache payload for serialization/deserialization.
#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum CachePayload {
    Twitter(TwitterCachePayload),
    Og(OgCachePayload),
}

// ── CORS ─────────────────────────────────────────────────────────────────────

fn allowed_origin(env: &Env) -> String {
    env.var("ALLOWED_ORIGIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string())
}

fn cors_headers(env: &Env) -> Headers {
    let headers = Headers::new();
    let _ = headers.set("Access-Control-Allow-Origin", &allowed_origin(env));
    let _ = headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    let _ = headers.set("Access-Control-Allow-Headers", "Content-Type");
    let _ = headers.set("Access-Control-Max-Age", "86400");
    headers
}

fn json_response(body: &impl Serialize, status: u16, env: &Env) -> Result<Response> {
    json_response_extra(body, status, env, None)
}

fn json_response_extra(
    body: &impl Serialize,
    status: u16,
    env: &Env,
    extra_headers: Option<(&str, &str)>,
) -> Result<Response> {
    let json = serde_json::to_string(body).map_err(|e| Error::RustError(e.to_string()))?;
    let headers = cors_headers(env);
    let _ = headers.set("Content-Type", "application/json");
    if let Some((key, value)) = extra_headers {
        let _ = headers.set(key, value);
    }
    Ok(Response::from_body(ResponseBody::Body(json.into_bytes()))?
        .with_headers(headers)
        .with_status(status))
}

// ── SSRF protection ──────────────────────────────────────────────────────────

fn is_private_url(raw_url: &str) -> bool {
    let parsed = match Url::parse(raw_url) {
        Ok(u) => u,
        Err(_) => return true, // unparseable -> block
    };

    // Only allow HTTP(S)
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return true,
    }

    let hostname: String = match parsed.host_str() {
        Some(h) => h.to_lowercase(),
        None => return true,
    };

    // Block non-standard IP obfuscation (integer/hex) that may bypass
    // the dotted-decimal regex on URL implementations that don't normalize them.
    if !hostname.is_empty() && hostname.chars().all(|c: char| c.is_ascii_digit()) {
        return true; // pure integer (e.g., 2130706433 = 127.0.0.1)
    }
    if let Some(rest) = hostname.strip_prefix("0x") {
        if !rest.is_empty() && rest.chars().all(|c: char| c.is_ascii_hexdigit()) {
            return true; // pure hex (e.g., 0x7f000001)
        }
    }

    // Loopback / localhost
    if hostname == "localhost" || hostname.ends_with(".localhost") {
        return true;
    }

    // Cloud metadata endpoints
    if hostname == "169.254.169.254"
        || hostname == "metadata.google.internal"
        || hostname == "metadata.goog"
    {
        return true;
    }

    // Plain IPv4 -- block private, loopback, and link-local ranges
    if let Some(octets) = parse_ipv4(&hostname) {
        return is_private_ipv4(octets);
    }

    // IPv6 patterns (may have brackets from URL parsing)
    let host: &str = hostname
        .strip_prefix('[')
        .and_then(|s: &str| s.strip_suffix(']'))
        .unwrap_or(&hostname);

    // IPv6 loopback
    if host == "::1" {
        return true;
    }

    // ULA fc00::/7
    if host.starts_with("fc") || host.starts_with("fd") {
        return true;
    }

    // Link-local fe80::/10
    if host.starts_with("fe80") {
        return true;
    }

    // IPv4-mapped IPv6 (::ffff:a.b.c.d) -- check embedded IPv4
    if let Some(rest) = host.strip_prefix("::ffff:") {
        if let Some(octets) = parse_ipv4(rest) {
            return is_private_ipv4(octets);
        }
        // Hex-form mapped addresses that didn't match dotted-decimal above
        // Block since we can't reliably parse hex octets without a full IPv6 parser
        return true;
    }

    false
}

fn parse_ipv4(s: &str) -> Option<[u8; 4]> {
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() != 4 {
        return None;
    }
    let mut octets = [0u8; 4];
    for (i, part) in parts.iter().enumerate() {
        octets[i] = part.parse().ok()?;
    }
    Some(octets)
}

fn is_private_ipv4(octets: [u8; 4]) -> bool {
    let [a, b, _, _] = octets;
    if a == 10 {
        return true;
    } // 10.0.0.0/8
    if a == 127 {
        return true;
    } // 127.0.0.0/8 loopback
    if a == 172 && (16..=31).contains(&b) {
        return true;
    } // 172.16.0.0/12
    if a == 192 && b == 168 {
        return true;
    } // 192.168.0.0/16
    if a == 169 && b == 254 {
        return true;
    } // 169.254.0.0/16 link-local
    if a == 0 {
        return true;
    } // 0.0.0.0/8
    if a >= 240 {
        return true;
    } // 240.0.0.0/4 reserved
    false
}

// ── Twitter detection ────────────────────────────────────────────────────────

fn is_twitter_url(raw_url: &str) -> bool {
    let parsed = match Url::parse(raw_url) {
        Ok(u) => u,
        Err(_) => return false,
    };

    let hostname: String = match parsed.host_str() {
        Some(h) => h.to_lowercase(),
        None => return false,
    };

    matches!(
        hostname.as_str(),
        "twitter.com"
            | "x.com"
            | "www.twitter.com"
            | "www.x.com"
            | "mobile.twitter.com"
            | "mobile.x.com"
    )
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

fn decode_html_entities(text: &str) -> String {
    let mut decoded = text.to_string();

    // Named entities (case-insensitive)
    let named: &[(&str, &str)] = &[
        ("&amp;", "&"),
        ("&lt;", "<"),
        ("&gt;", ">"),
        ("&quot;", "\""),
        ("&#39;", "'"),
        ("&apos;", "'"),
        ("&nbsp;", " "),
    ];
    for (entity, replacement) in named {
        let re = Regex::new(&format!("(?i){}", regex::escape(entity))).unwrap();
        decoded = re.replace_all(&decoded, *replacement).to_string();
    }

    // Numeric decimal entities: &#123;
    let decimal_re = Regex::new(r"&#(\d+);").unwrap();
    decoded = decimal_re
        .replace_all(&decoded, |caps: &regex::Captures| {
            let num: u32 = caps[1].parse().unwrap_or(0);
            if num > 0 && num < 0x10FFFF {
                char::from_u32(num)
                    .map(|c| c.to_string())
                    .unwrap_or_default()
            } else {
                String::new()
            }
        })
        .to_string();

    // Hex entities: &#x7B;
    let hex_re = Regex::new(r"&#x([0-9a-fA-F]+);").unwrap();
    decoded = hex_re
        .replace_all(&decoded, |caps: &regex::Captures| {
            let num = u32::from_str_radix(&caps[1], 16).unwrap_or(0);
            if num > 0 && num < 0x10FFFF {
                char::from_u32(num)
                    .map(|c| c.to_string())
                    .unwrap_or_default()
            } else {
                String::new()
            }
        })
        .to_string();

    decoded
}

fn resolve_url(relative_url: &str, base_url: &str) -> String {
    match Url::parse(base_url).and_then(|base: Url| base.join(relative_url)) {
        Ok(u) => u.to_string(),
        Err(_) => relative_url.to_string(),
    }
}

// ── OG parser ────────────────────────────────────────────────────────────────

struct OgPreview {
    url: String,
    domain: String,
    favicon: String,
    title: Option<String>,
    description: Option<String>,
    image: Option<String>,
    site_name: Option<String>,
}

fn extract_meta(html: &str, pattern: &Regex) -> Option<String> {
    pattern
        .captures(html)
        .map(|caps| decode_html_entities(&caps[1]))
}

fn parse_open_graph_tags(html: &str, target_url: &str) -> OgPreview {
    let domain = Url::parse(target_url)
        .ok()
        .and_then(|u: Url| u.host_str().map(|h: &str| h.to_string()))
        .unwrap_or_default()
        .trim_start_matches("www.")
        .to_string();

    let favicon = format!(
        "https://www.google.com/s2/favicons?domain={}&sz=32",
        domain
    );

    // og:title patterns (property-first and content-first attribute order)
    let og_title_1 =
        Regex::new(r#"(?i)<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']"#)
            .unwrap();
    let og_title_2 =
        Regex::new(r#"(?i)<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']"#)
            .unwrap();
    let html_title = Regex::new(r"(?i)<title>([^<]+)</title>").unwrap();

    let title = extract_meta(html, &og_title_1)
        .or_else(|| extract_meta(html, &og_title_2))
        .or_else(|| extract_meta(html, &html_title));

    // og:description patterns
    let og_desc_1 = Regex::new(
        r#"(?i)<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']"#,
    )
    .unwrap();
    let og_desc_2 = Regex::new(
        r#"(?i)<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']"#,
    )
    .unwrap();
    let meta_desc =
        Regex::new(r#"(?i)<meta\s+name=["']description["']\s+content=["']([^"']+)["']"#).unwrap();

    let description = extract_meta(html, &og_desc_1)
        .or_else(|| extract_meta(html, &og_desc_2))
        .or_else(|| extract_meta(html, &meta_desc));

    // og:image patterns
    let og_image_1 =
        Regex::new(r#"(?i)<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']"#)
            .unwrap();
    let og_image_2 =
        Regex::new(r#"(?i)<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']"#)
            .unwrap();

    let image_url = extract_meta(html, &og_image_1).or_else(|| extract_meta(html, &og_image_2));
    let image = image_url.map(|u| resolve_url(&u, target_url));

    // og:site_name
    let og_site_name = Regex::new(
        r#"(?i)<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']"#,
    )
    .unwrap();
    let site_name = extract_meta(html, &og_site_name);

    OgPreview {
        url: target_url.to_string(),
        domain,
        favicon,
        title,
        description,
        image,
        site_name,
    }
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async fn fetch_twitter_embed(target_url: &str) -> Result<TwitterCachePayload> {
    let oembed_url = format!(
        "{}?url={}&omit_script=true&dnt=true&theme=dark",
        TWITTER_OEMBED_URL,
        percent_encode(target_url)
    );

    let headers = Headers::new();
    let _ = headers.set("Accept", "application/json");
    let _ = headers.set("User-Agent", "LinkPreviewAPI/1.0");

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let request = Request::new_with_init(&oembed_url, &init)?;
    let mut response = Fetch::Request(request).send().await?;

    if response.status_code() != 200 {
        return Err(Error::RustError(format!(
            "Twitter oEmbed failed: {}",
            response.status_code()
        )));
    }

    let data: TwitterOembedData = response.json().await?;
    Ok(TwitterCachePayload {
        r#type: "twitter".to_string(),
        url: target_url.to_string(),
        html: data.html,
        author_name: data.author_name,
        author_url: data.author_url,
        provider_name: data.provider_name.unwrap_or_else(|| "X".to_string()),
    })
}

async fn fetch_open_graph_data(target_url: &str) -> Result<OgCachePayload> {
    let headers = Headers::new();
    let _ = headers.set("Accept", "text/html,application/xhtml+xml");
    let _ = headers.set("User-Agent", "LinkPreviewAPI/1.0 (Link Preview Bot)");

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let request = Request::new_with_init(target_url, &init)?;
    let mut response = Fetch::Request(request).send().await?;

    if response.status_code() != 200 {
        return Err(Error::RustError(format!(
            "Failed to fetch: {}",
            response.status_code()
        )));
    }

    let html = response.text().await?;
    let preview = parse_open_graph_tags(&html, target_url);

    Ok(OgCachePayload {
        r#type: "opengraph".to_string(),
        url: preview.url,
        domain: preview.domain,
        favicon: preview.favicon,
        title: preview.title,
        description: preview.description,
        image: preview.image,
        site_name: preview.site_name,
    })
}

// ── Cache helpers (CF Cache API) ─────────────────────────────────────────────

/// Build a deterministic cache key URL from the target URL.
/// The Cache API requires a valid URL as key; we namespace under
/// a synthetic host so keys never collide with real requests.
fn cache_key(target_url: &str) -> String {
    format!(
        "https://link-preview-cache.internal/v1?url={}",
        percent_encode(target_url)
    )
}

async fn get_from_cache(target_url: &str) -> Option<Response> {
    let cache = Cache::default();
    let key = cache_key(target_url);
    cache.get(&key, false).await.ok().flatten()
}

async fn put_to_cache(target_url: &str, payload: &CachePayload, ttl: u32, env: &Env) {
    let cache = Cache::default();
    let key = cache_key(target_url);

    let body = match serde_json::to_string(payload) {
        Ok(b) => b,
        Err(_) => return,
    };

    let headers = cors_headers(env);
    let _ = headers.set("Content-Type", "application/json");
    let _ = headers.set("Cache-Control", &format!("public, max-age={}", ttl));

    if let Ok(response) =
        Response::from_body(ResponseBody::Body(body.into_bytes())).map(|r| r.with_headers(headers))
    {
        let _ = cache.put(&key, response).await;
    }
}

// ── Percent encoding (inline to avoid extra crate) ───────────────────────────

fn percent_encode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len() * 3);
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async fn handle_preview(req: &Request, env: &Env) -> Result<Response> {
    let url = req.url()?;
    let target_url = url
        .query_pairs()
        .find(|(k, _)| k == "url")
        .map(|(_, v)| v.to_string());

    let target_url = match target_url {
        Some(u) => u,
        None => {
            return json_response(
                &ErrorResponse {
                    error: "Missing url parameter".to_string(),
                },
                400,
                env,
            )
        }
    };

    // Validate URL
    if Url::parse(&target_url).is_err() {
        return json_response(
            &ErrorResponse {
                error: "Invalid URL".to_string(),
            },
            400,
            env,
        );
    }

    // SSRF check
    if is_private_url(&target_url) {
        return json_response(
            &ErrorResponse {
                error: "URL not allowed (private or internal address)".to_string(),
            },
            400,
            env,
        );
    }

    let is_twitter = is_twitter_url(&target_url);

    // Check CF Cache API
    if let Some(mut cached) = get_from_cache(&target_url).await {
        if let Ok(text) = cached.text().await {
            if let Ok(mut data) = serde_json::from_str::<serde_json::Value>(&text) {
                data["cached"] = serde_json::Value::Bool(true);
                return json_response_extra(&data, 200, env, Some(("X-Cache", "HIT")));
            }
        }
    }

    if is_twitter {
        match fetch_twitter_embed(&target_url).await {
            Ok(data) => {
                let cache_payload = CachePayload::Twitter(data.clone());
                put_to_cache(&target_url, &cache_payload, CACHE_TTL_TWITTER, env).await;

                let response = TwitterEmbedResponse {
                    r#type: "twitter",
                    url: data.url,
                    html: data.html,
                    author_name: data.author_name,
                    author_url: data.author_url,
                    provider_name: data.provider_name,
                    cached: false,
                };
                json_response_extra(&response, 200, env, Some(("X-Cache", "MISS")))
            }
            Err(e) => json_response(
                &ErrorResponse {
                    error: e.to_string(),
                },
                500,
                env,
            ),
        }
    } else {
        match fetch_open_graph_data(&target_url).await {
            Ok(data) => {
                let cache_payload = CachePayload::Og(data.clone());
                put_to_cache(&target_url, &cache_payload, CACHE_TTL_OG, env).await;

                let response = OgPreviewResponse {
                    r#type: "opengraph",
                    url: data.url,
                    domain: data.domain,
                    favicon: data.favicon,
                    title: data.title,
                    description: data.description,
                    image: data.image,
                    site_name: data.site_name,
                    cached: false,
                };
                json_response_extra(&response, 200, env, Some(("X-Cache", "MISS")))
            }
            Err(e) => json_response(
                &ErrorResponse {
                    error: e.to_string(),
                },
                500,
                env,
            ),
        }
    }
}

fn handle_health(env: &Env) -> Result<Response> {
    json_response(
        &HealthResponse {
            status: "ok",
            service: "link-preview-api",
            runtime: "workers-rs",
        },
        200,
        env,
    )
}

fn handle_stats(env: &Env) -> Result<Response> {
    json_response(
        &StatsResponse {
            cache: "cf-cache-api",
            note: "Per-key hit stats are available in Cloudflare Analytics dashboard",
        },
        200,
        env,
    )
}

// ── Router ───────────────────────────────────────────────────────────────────

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // CORS preflight
    if req.method() == Method::Options {
        let headers = cors_headers(&env);
        return Ok(Response::empty()?.with_headers(headers).with_status(204));
    }

    let url = req.url()?;
    let path = url.path();

    let result = match (req.method(), path) {
        (Method::Get, "/preview") => handle_preview(&req, &env).await,
        (Method::Get, "/health") => handle_health(&env),
        (Method::Get, "/stats") => handle_stats(&env),
        _ => json_response(
            &ErrorResponse {
                error: "Not found".to_string(),
            },
            404,
            &env,
        ),
    };

    match result {
        Ok(resp) => Ok(resp),
        Err(e) => {
            console_error!("Worker error: {}", e);
            json_response(
                &ErrorResponse {
                    error: e.to_string(),
                },
                500,
                &env,
            )
        }
    }
}

// Cron keep-warm: prevents cold starts by running periodically
#[event(scheduled)]
async fn scheduled(_event: ScheduledEvent, _env: Env, _ctx: ScheduleContext) {
    // No persistent storage to touch -- the cron itself keeps the isolate warm
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // SSRF protection tests
    #[test]
    fn blocks_non_http_protocols() {
        assert!(is_private_url("ftp://example.com/file"));
        assert!(is_private_url("file:///etc/passwd"));
        assert!(is_private_url("gopher://localhost"));
    }

    #[test]
    fn blocks_integer_ip() {
        assert!(is_private_url("http://2130706433/")); // 127.0.0.1
    }

    #[test]
    fn blocks_hex_ip() {
        assert!(is_private_url("http://0x7f000001/"));
    }

    #[test]
    fn blocks_localhost() {
        assert!(is_private_url("http://localhost/"));
        assert!(is_private_url("http://sub.localhost/"));
    }

    #[test]
    fn blocks_metadata_endpoints() {
        assert!(is_private_url("http://169.254.169.254/latest/meta-data/"));
        assert!(is_private_url("http://metadata.google.internal/"));
        assert!(is_private_url("http://metadata.goog/"));
    }

    #[test]
    fn blocks_private_ipv4() {
        assert!(is_private_url("http://10.0.0.1/"));
        assert!(is_private_url("http://127.0.0.1/"));
        assert!(is_private_url("http://172.16.0.1/"));
        assert!(is_private_url("http://172.31.255.255/"));
        assert!(is_private_url("http://192.168.1.1/"));
        assert!(is_private_url("http://169.254.0.1/"));
        assert!(is_private_url("http://0.0.0.0/"));
        assert!(is_private_url("http://240.0.0.1/"));
    }

    #[test]
    fn allows_public_ipv4() {
        assert!(!is_private_url("http://8.8.8.8/"));
        assert!(!is_private_url("http://93.184.216.34/"));
    }

    #[test]
    fn blocks_ipv6_loopback() {
        assert!(is_private_url("http://[::1]/"));
    }

    #[test]
    fn blocks_ipv6_ula() {
        assert!(is_private_url("http://[fc00::1]/"));
        assert!(is_private_url("http://[fd12::1]/"));
    }

    #[test]
    fn blocks_ipv6_link_local() {
        assert!(is_private_url("http://[fe80::1]/"));
    }

    #[test]
    fn blocks_ipv4_mapped_ipv6_private() {
        assert!(is_private_url("http://[::ffff:127.0.0.1]/"));
        assert!(is_private_url("http://[::ffff:10.0.0.1]/"));
        assert!(is_private_url("http://[::ffff:192.168.1.1]/"));
    }

    #[test]
    fn blocks_ipv4_mapped_ipv6_hex_form() {
        assert!(is_private_url("http://[::ffff:7f00:1]/"));
    }

    #[test]
    fn allows_public_urls() {
        assert!(!is_private_url("https://example.com/"));
        assert!(!is_private_url("https://google.com/search?q=test"));
    }

    #[test]
    fn blocks_unparseable() {
        assert!(is_private_url("not a url at all"));
    }

    // Twitter detection tests
    #[test]
    fn detects_twitter_urls() {
        assert!(is_twitter_url("https://twitter.com/user/status/123"));
        assert!(is_twitter_url("https://x.com/user/status/123"));
        assert!(is_twitter_url("https://www.twitter.com/user"));
        assert!(is_twitter_url("https://www.x.com/user"));
        assert!(is_twitter_url("https://mobile.twitter.com/user"));
        assert!(is_twitter_url("https://mobile.x.com/user"));
    }

    #[test]
    fn rejects_non_twitter() {
        assert!(!is_twitter_url("https://example.com/"));
        assert!(!is_twitter_url("https://nottwitter.com/"));
    }

    // HTML entity decoding tests
    #[test]
    fn decodes_named_entities() {
        assert_eq!(decode_html_entities("&amp;"), "&");
        assert_eq!(decode_html_entities("&lt;b&gt;"), "<b>");
        assert_eq!(decode_html_entities("&quot;hello&quot;"), "\"hello\"");
        assert_eq!(decode_html_entities("don&#39;t"), "don't");
    }

    #[test]
    fn decodes_decimal_entities() {
        assert_eq!(decode_html_entities("&#65;"), "A");
        assert_eq!(decode_html_entities("&#123;"), "{");
    }

    #[test]
    fn decodes_hex_entities() {
        assert_eq!(decode_html_entities("&#x41;"), "A");
        assert_eq!(decode_html_entities("&#x7B;"), "{");
    }

    // OG parser tests
    #[test]
    fn parses_og_title_property_first() {
        let html = r#"<meta property="og:title" content="Test Title">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.title.as_deref(), Some("Test Title"));
    }

    #[test]
    fn parses_og_title_content_first() {
        let html = r#"<meta content="Test Title" property="og:title">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.title.as_deref(), Some("Test Title"));
    }

    #[test]
    fn falls_back_to_html_title() {
        let html = r#"<title>Fallback Title</title>"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.title.as_deref(), Some("Fallback Title"));
    }

    #[test]
    fn parses_description() {
        let html = r#"<meta property="og:description" content="A description">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.description.as_deref(), Some("A description"));
    }

    #[test]
    fn falls_back_to_meta_description() {
        let html = r#"<meta name="description" content="Meta desc">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.description.as_deref(), Some("Meta desc"));
    }

    #[test]
    fn parses_image_and_resolves_relative() {
        let html = r#"<meta property="og:image" content="/images/hero.jpg">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(
            preview.image.as_deref(),
            Some("https://example.com/images/hero.jpg")
        );
    }

    #[test]
    fn parses_site_name() {
        let html = r#"<meta property="og:site_name" content="Example Site">"#;
        let preview = parse_open_graph_tags(html, "https://example.com/page");
        assert_eq!(preview.site_name.as_deref(), Some("Example Site"));
    }

    #[test]
    fn sets_domain_and_favicon() {
        let html = "";
        let preview = parse_open_graph_tags(html, "https://www.example.com/page");
        assert_eq!(preview.domain, "example.com");
        assert_eq!(
            preview.favicon,
            "https://www.google.com/s2/favicons?domain=example.com&sz=32"
        );
    }

    // URL resolution tests
    #[test]
    fn resolves_absolute_url() {
        assert_eq!(
            resolve_url("https://cdn.example.com/img.png", "https://example.com/"),
            "https://cdn.example.com/img.png"
        );
    }

    #[test]
    fn resolves_relative_url() {
        assert_eq!(
            resolve_url("/img.png", "https://example.com/page"),
            "https://example.com/img.png"
        );
    }

    // Cache key tests
    #[test]
    fn cache_key_is_deterministic() {
        let key1 = cache_key("https://example.com/page");
        let key2 = cache_key("https://example.com/page");
        assert_eq!(key1, key2);
        assert!(key1.starts_with("https://link-preview-cache.internal/v1?url="));
    }

    #[test]
    fn cache_keys_differ_for_different_urls() {
        let key1 = cache_key("https://example.com/a");
        let key2 = cache_key("https://example.com/b");
        assert_ne!(key1, key2);
    }

    // IPv4 parser tests
    #[test]
    fn parses_valid_ipv4() {
        assert_eq!(parse_ipv4("192.168.1.1"), Some([192, 168, 1, 1]));
        assert_eq!(parse_ipv4("0.0.0.0"), Some([0, 0, 0, 0]));
        assert_eq!(parse_ipv4("255.255.255.255"), Some([255, 255, 255, 255]));
    }

    #[test]
    fn rejects_invalid_ipv4() {
        assert_eq!(parse_ipv4("not.an.ip"), None);
        assert_eq!(parse_ipv4("256.1.1.1"), None);
        assert_eq!(parse_ipv4("1.2.3"), None);
        assert_eq!(parse_ipv4("1.2.3.4.5"), None);
    }

    // Percent encoding tests
    #[test]
    fn encodes_special_chars() {
        assert_eq!(percent_encode("hello world"), "hello%20world");
        assert_eq!(percent_encode("a=b&c=d"), "a%3Db%26c%3Dd");
    }

    #[test]
    fn preserves_unreserved_chars() {
        assert_eq!(percent_encode("abc-_.~"), "abc-_.~");
        assert_eq!(percent_encode("ABC123"), "ABC123");
    }
}
