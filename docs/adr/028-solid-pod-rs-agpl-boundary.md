# ADR-028: Adopt solid-pod-rs Published Crates — Remove Duplicate Code

## Status: Accepted (supersedes initial draft)

## Date: 2026-05-06

## Context

`solid-pod-rs` (v0.5.0-alpha.2) and the broader DreamLab-AI Rust crate suite are **DreamLab's own
published work**. The AGPL-3.0 licence is irrelevant because DreamLab-AI is the copyright holder
and can use its own crates under any terms. The initial draft of this ADR incorrectly treated
`solid-pod-rs` as a third-party dependency subject to copyleft propagation concerns — that was
wrong and the premise is removed entirely.

The current `community-forum-rs` workspace duplicates substantial logic that is now published and
maintained in `solid-pod-rs`:

| Duplicated in community-forum-rs | Canonical location in solid-pod-rs |
|---|---|
| `pod-worker/src/acl.rs` (519 LOC) | `solid-pod-rs::wac` — `evaluate_access()`, `AclDocument`, WAC 2.0 conditions |
| `pod-worker/src/webid.rs` | `solid-pod-rs::webid` — profile helpers, `extract_oidc_issuer()` |
| `pod-worker/src/provision.rs` (partial) | `solid-pod-rs::provision::provision_pod()`, `generate_webid_html()` |
| NIP-98 verify path in `pod-worker/src/auth.rs` | `solid-pod-rs::auth::Nip98Verifier` + `Nip98Verified` |
| hand-crafted DID document strings | `solid-pod-rs-nostr` — `NostrWebIdResolver`, Tier 1/3 DID docs |

The correct engineering direction is **simplification**: pull in the published crates, delete the
duplicated code, and keep only the thin Cloudflare Workers adapter layer that wires the
`solid-pod-rs` trait abstractions to CF R2, KV, and Durable Objects.

The one genuine technical constraint is that `solid-pod-rs`'s storage backend implementations
(`FsBackend`, `MemoryBackend`, `S3Backend`) depend on `tokio`, which differs from the
`workers-rs` async executor. However, the **trait definitions** and **pure-logic modules** (WAC
evaluator, NIP-98 verifier, DID document builder, WebID helpers, provisioning logic) are
runtime-agnostic — they use `async-trait` for the Storage trait abstraction and their own
logic is either purely synchronous or executor-neutral.

## Decision

### 1. Add solid-pod-rs crates to workspace dependencies

In `community-forum-rs/Cargo.toml` workspace dependencies:

```toml
[workspace.dependencies]
solid-pod-rs = { version = "0.5.0-alpha.2", default-features = false, features = [
    "nip98-schnorr",   # NIP-98 Schnorr verification via k256
    "wac",             # WAC 2.0 evaluator (evaluate_access, AclDocument, conditions)
    "webid",           # WebID profile helpers
    "provision",       # provision_pod(), generate_webid_html(), TypeIndex creation
    "notifications",   # Solid Notifications channel types (WebSocket + Webhook)
] }
solid-pod-rs-nostr = { version = "0.5.0-alpha.2", default-features = false }
solid-pod-rs-didkey = { version = "0.5.0-alpha.2", default-features = false }
```

`default-features = false` excludes tokio-backed storage backends (`fs-backend`, `s3-backend`,
`memory-backend`) and the actix-web server binary. Only executor-agnostic feature flags are
enabled. The `k256`, `sha2`, `serde_json`, `base64`, `url` transitive deps are already in the
workspace and will be de-duplicated by resolver v2.

### 2. Implement the Storage trait against Cloudflare bindings

Create `pod-worker/src/storage/cf_backend.rs` implementing `solid_pod_rs::storage::Storage`
against CF R2 and KV:

```rust
use solid_pod_rs::storage::{Storage, ResourceMeta, StorageEvent};
use async_trait::async_trait;
use worker::{Bucket, Env};

pub struct CloudflareStorage {
    bucket: Bucket,
}

#[async_trait(?Send)]
impl Storage for CloudflareStorage {
    async fn get(&self, path: &str) -> Result<Option<(Vec<u8>, ResourceMeta)>, PodError> { .. }
    async fn put(&self, path: &str, body: Vec<u8>, meta: ResourceMeta) -> Result<(), PodError> { .. }
    async fn delete(&self, path: &str) -> Result<(), PodError> { .. }
    async fn list(&self, prefix: &str) -> Result<Vec<String>, PodError> { .. }
    async fn head(&self, path: &str) -> Result<Option<ResourceMeta>, PodError> { .. }
    async fn exists(&self, path: &str) -> bool { .. }
    async fn create_container(&self, path: &str) -> Result<(), PodError> { .. }

    async fn watch(&self) -> Result<tokio::sync::broadcast::Receiver<StorageEvent>, PodError> {
        // Solid Notifications in DreamLab route through relay-worker WebSocket/DO,
        // not filesystem events. This surface is deliberately unimplemented.
        Err(PodError::NotSupported("storage watch not available in CF Workers"))
    }
}
```

`pod-worker/src/lib.rs` becomes a pure routing and binding layer — dispatches CF Worker
requests, instantiates `CloudflareStorage`, delegates all Solid Protocol logic to solid-pod-rs.

### 3. Delete duplicated code — net code reduction

| File action | Replacement via solid-pod-rs |
|---|---|
| DELETE `pod-worker/src/acl.rs` | `solid_pod_rs::wac::evaluate_access()` |
| DELETE `pod-worker/src/webid.rs` | `solid_pod_rs::webid::generate_webid_html()` + solid-pod-rs-nostr |
| SIMPLIFY `pod-worker/src/provision.rs` | `solid_pod_rs::provision::provision_pod()` handles TypeIndex |
| SIMPLIFY `pod-worker/src/auth.rs` | `solid_pod_rs::auth::Nip98Verifier` |
| DELETE DID string templates | `solid_pod_rs_nostr::Tier1Document` / `Tier3Document` |

Target: pod-worker reduces from ~4 files × 300-500 LOC to `lib.rs` (routing) + `storage/cf_backend.rs` (adapter).

### 4. DID document endpoint using solid-pod-rs-nostr

The `/.well-known/did/nostr/{pubkey}.json` route (ADR-027):

```rust
use solid_pod_rs_nostr::{NostrPubkey, Tier1Document, Tier3Document, well_known_path};

async fn handle_did_nostr(pubkey_hex: &str, enrich: bool) -> worker::Result<Response> {
    let pk = NostrPubkey::from_hex(pubkey_hex)?;
    if enrich {
        // fetch kind-0/kind-3 from relay-worker, pass to Tier3Document::generate()
        let doc = Tier3Document::generate(&pk, profile_data, follows).await?;
        Response::from_json(&doc)
    } else {
        let doc = Tier1Document::generate(&pk);  // offline, no network
        Response::from_json(&doc)
    }
}
```

### 5. NIP-98 verifier alignment

`solid-pod-rs::auth::Nip98Verifier` is the canonical verifier. In CF Workers that already import
solid-pod-rs, replace inline NIP-98 verify logic with:

```rust
use solid_pod_rs::auth::Nip98Verifier;
let verified = Nip98Verifier::verify_at(&auth_header, &url, &method, body_bytes, now).await?;
let pubkey = verified.pubkey; // hex string
```

In the Leptos WASM forum-client, keep `nostr-core::nip98` (the existing client-side token
*creation* code) — the client creates tokens, it does not verify them. No redundancy on the
client side.

## Consequences

### Positive
- **Net code reduction** of ~1,000+ LOC from community-forum-rs (deleting acl.rs, webid.rs,
  duplicated provision logic, NIP-98 inline verify)
- **Single source of truth** for WAC, WebID, provisioning, NIP-98 across the DreamLab stack
- **Automatic conformance improvements** — solid-pod-rs Sprint 12 already adds TypeIndex
  provisioning, WAC 2.0 conditions, SSRF hardening; bumping the version gets them for free
- **did:nostr DID documents** become spec-conformant via solid-pod-rs-nostr rather than
  hand-crafted strings
- **Security patches** (e.g. CVE-class DPoP bypass fix) propagate via version bump

### Negative / Trade-offs
- `solid-pod-rs` is v0.5.0-alpha.2 — pre-release. Pin to exact version; bump deliberately.
- `watch()` on the Storage trait requires a documented no-op stub.
- CF Workers bundle size will grow slightly. Monitor with `wrangler dev` against the 10 MB limit.
- The `solid-pod-rs-nostr` Tier 3 DID document builder requires an outbound fetch to the
  relay-worker for kind-0/kind-3 events — add SSRF guard via solid-pod-rs's `SsrfPolicy`.

### Neutral
- `async-trait(?Send)` is already standard in community-forum-rs. No new patterns.
- Resolver v2 de-duplicates `k256`, `sha2`, `serde_json` shared with the workspace.
