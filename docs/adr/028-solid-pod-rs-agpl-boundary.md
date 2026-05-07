# ADR-028: Adopt solid-pod-rs Published Crates — Remove Duplicate Code

## Status: Accepted (amended Sprint v9 — partial implementation; full migration deferred)

## Date: 2026-05-06 (amended from initial draft)

## Sprint v9 amendment summary

The original ADR was written against an unreleased `solid-pod-rs` v0.5.0-alpha.2.
The version published on crates.io as of 2026-05-06 is **v0.4.0-alpha.2** (verified
via `cargo search solid-pod-rs`). v0.5 has not shipped. This ADR has been
rewritten to match what is realistic to land in the v9 sprint window:

- Pin to `solid-pod-rs = "0.4.0-alpha.2"` (the actually-published version).
- Keep the existing hand-rolled `acl.rs` (673 LOC), `webid.rs` (86 LOC),
  `provision.rs` (432 LOC), `did.rs` (300 LOC) in `pod-worker` for v9.
  These are tagged "to be replaced by solid-pod-rs once 0.5 ships and once
  STREAM-B's WAC `Control` coercion fix lands".
- Land the `pod-worker/src/storage/cf_backend.rs` adapter as a forward-compatible
  R2/KV wrapper. The trait shape is what `solid-pod-rs::storage::Storage`
  expects, so a future swap is mechanical.
- LOC numbers in the original ADR were stale: `acl.rs` is 673 not 519. Updated
  below.

## Context

`solid-pod-rs` and the broader DreamLab-AI Rust crate suite are **DreamLab's own
published work**. The AGPL-3.0 licence is irrelevant because DreamLab-AI is the
copyright holder and can use its own crates under any terms. The initial draft
of this ADR incorrectly treated `solid-pod-rs` as a third-party dependency
subject to copyleft propagation concerns — that was wrong and the premise is
removed entirely.

The current `community-forum-rs` workspace duplicates substantial logic that is
expected to land in `solid-pod-rs` once v0.5 publishes:

| Duplicated in community-forum-rs | LOC (verified 2026-05-06) | Future location in solid-pod-rs |
|---|---|---|
| `pod-worker/src/acl.rs`        | 673 | `solid-pod-rs::wac` — `evaluate_access()`, `AclDocument`, WAC 2.0 conditions |
| `pod-worker/src/webid.rs`      | 86  | `solid-pod-rs::webid` — profile helpers, `extract_oidc_issuer()` |
| `pod-worker/src/provision.rs`  | 432 | `solid-pod-rs::provision::provision_pod()`, `generate_webid_html()` |
| `pod-worker/src/did.rs`        | 300 | `solid-pod-rs-nostr::did::render_did_document_tier{1,3}()` |
| NIP-98 verify path in `nostr-core::nip98` | (kept) | `solid-pod-rs::auth::Nip98Verifier` |

The correct engineering direction remains **simplification**: pull in published
crates, delete duplicated code, keep only the thin Cloudflare Workers adapter
layer that wires the `solid-pod-rs` trait abstractions to CF R2, KV, and Durable
Objects. v0.4 does not yet expose all the surfaces needed; v0.5 is the target
release.

The one genuine technical constraint is that `solid-pod-rs`'s storage backend
implementations (`FsBackend`, `MemoryBackend`, `S3Backend`) depend on `tokio`,
which differs from the `workers-rs` async executor. However, the **trait
definitions** and **pure-logic modules** (WAC evaluator, NIP-98 verifier, DID
document builder, WebID helpers, provisioning logic) are runtime-agnostic —
they use `async-trait` for the Storage trait abstraction and their own logic
is either purely synchronous or executor-neutral.

## Decision

### 1. Workspace dependencies — current sprint (v9)

`community-forum-rs/Cargo.toml` declares (already merged):

```toml
[workspace.dependencies]
solid-pod-rs = { version = "0.4.0-alpha.2", default-features = false, features = ["nip98-schnorr"] }
solid-pod-rs-nostr = { version = "0.4.0-alpha.2", default-features = false }
```

These are workspace-level declarations only. **No crate currently depends on
them**. They are reserved for the v0.5 migration once it ships. Adding them as
direct deps in `pod-worker/Cargo.toml` is **deferred** until:

1. `solid-pod-rs` v0.5.0-alpha.2 (or later) is published with the WAC,
   `provision`, `webid`, `notifications` feature flags exposed and proven to
   compile to `wasm32-unknown-unknown` with `default-features = false`.
2. STREAM-B's WAC `Control` coercion fix lands in `pod-worker/src/{acl,lib}.rs`
   so that the migration starts from a security-correct baseline rather than
   a leaky one.

Until both gates pass, `pod-worker/src/{acl,webid,provision,did}.rs` stay as
hand-rolled modules in this repo. They are now annotated with parity comments
pointing at the upstream `solid-pod-rs[-nostr]` sources to keep drift visible.

### 2. Storage adapter — landed in v9

`pod-worker/src/storage/cf_backend.rs` exists and wraps `worker::Bucket` (R2)
behind a small ergonomic surface (`get_object`, `put_object`, `delete_object`,
`list_objects`, `head_object`, `object_exists`, `pod_r2_key()`). This is the
**forward-compatible adapter** prescribed by the solid-pod-rs-first strategy:
the Cloudflare Worker delegates persistence to CF R2/KV through this adapter,
not to `solid-pod-rs`'s `Storage` trait directly (which pulls `tokio` and is
incompatible with WASM Workers).

When v0.5 ships, this adapter can either:
- Implement `solid_pod_rs::storage::Storage` directly (if v0.5 exposes a
  `tokio`-free trait variant), or
- Continue as a pod-worker-internal abstraction that the routing layer
  consumes alongside `solid-pod-rs`'s pure-logic modules.

Either path is mechanical because the surface is small and the contract is
already R2/KV-shaped.

### 3. Code-deletion plan — **deferred to a future sprint**

The original ADR-028 prescribed deleting `acl.rs`, `webid.rs`, simplifying
`provision.rs`, replacing inline NIP-98 verify, and replacing DID string
templates. **None of those deletions happen in v9.** They are blocked on the
two preconditions in §1. The intent and target file actions remain, restated
here for the next sprint:

| File action | Replacement via solid-pod-rs |
|---|---|
| DELETE `pod-worker/src/acl.rs` (673 LOC) | `solid_pod_rs::wac::evaluate_access()` |
| DELETE `pod-worker/src/webid.rs` (86 LOC) | `solid_pod_rs::webid::generate_webid_html()` + solid-pod-rs-nostr |
| SIMPLIFY `pod-worker/src/provision.rs` (432 LOC) | `solid_pod_rs::provision::provision_pod()` handles TypeIndex |
| SIMPLIFY NIP-98 verify call sites | `solid_pod_rs::auth::Nip98Verifier` |
| DELETE `pod-worker/src/did.rs` (300 LOC) | `solid_pod_rs_nostr::Tier1Document` / `Tier3Document` |

Target: pod-worker reduces from 4 hand-rolled modules totalling **1,491 LOC** to
`lib.rs` (routing) + `storage/cf_backend.rs` (adapter). Net reduction once the
migration completes: **~1,000+ LOC**.

### 4. ADR-027 alignment — landed in v9

`pod-worker/src/did.rs` has been amended in v9 to:

- Emit `"type": "SchnorrSecp256k1VerificationKey2019"` (W3C-registered
  cryptosuite) instead of the bespoke `"NostrSchnorrKey2024"` string in both
  Tier-1 and Tier-3 renderers.
- Include `"https://w3id.org/security/suites/secp256k1-2019/v1"` in the
  `@context` array of Tier-1 documents (Tier-3 already had it).
- Cover both fixes in the existing test suite (`tier1_has_required_fields`).

This brings the hand-rolled DID document into spec-conformance with ADR-027
ahead of the eventual `solid-pod-rs-nostr` swap. When the swap happens, the
upstream renderer must satisfy the same invariants.

### 5. NIP-98 verifier alignment — unchanged

`solid-pod-rs::auth::Nip98Verifier` remains the canonical verifier. It will
replace the inline NIP-98 verify logic in CF Workers once v0.5 ships and STREAM-B
has rebased its perimeter fixes onto it. In the Leptos WASM forum-client, keep
`nostr-core::nip98` (the existing client-side token *creation* code) — the
client creates tokens, it does not verify them. No redundancy on the client
side.

## Consequences

### Positive (once full migration completes)
- **Net code reduction** of ~1,000+ LOC from community-forum-rs.
- **Single source of truth** for WAC, WebID, provisioning, NIP-98 across the
  DreamLab stack.
- **Automatic conformance improvements** — solid-pod-rs Sprint 12 already adds
  TypeIndex provisioning, WAC 2.0 conditions, SSRF hardening; bumping the
  version gets them for free.
- **did:nostr DID documents** become spec-conformant via solid-pod-rs-nostr
  rather than hand-crafted strings.
- **Security patches** (e.g. CVE-class DPoP bypass fix) propagate via version
  bump.

### Sprint-v9 reality
- Adapter `cf_backend.rs` landed.
- DID document type/`@context` corrected to ADR-027 spec.
- LOC accounting in this ADR fixed (acl.rs 673, not 519; webid.rs 86;
  provision.rs 432; did.rs 300; total 1,491).
- Workspace deps pinned to the published `0.4.0-alpha.2`, not the
  unreleased `0.5.0-alpha.2`.
- All deletion tasks **explicitly deferred** to a follow-up sprint.

### Negative / Trade-offs
- `solid-pod-rs` 0.4 is pre-release and may not yet expose the surfaces this
  ADR depends on. Treat as a soft dep until 0.5 ships.
- `watch()` on the future Storage trait will require a documented no-op stub
  for CF Workers (Solid Notifications routes through relay-worker WebSocket/DO).
- CF Workers bundle size will grow slightly when the migration lands. Monitor
  with `wrangler dev` against the 10 MB limit.
- The `solid-pod-rs-nostr` Tier 3 DID document builder requires an outbound
  fetch to the relay-worker for kind-0/kind-3 events — add SSRF guard via
  solid-pod-rs's `SsrfPolicy` once available.

### Neutral
- `async-trait(?Send)` is already standard in community-forum-rs. No new
  patterns.
- Resolver v2 will de-duplicate `k256`, `sha2`, `serde_json` shared with the
  workspace once the deps land.
