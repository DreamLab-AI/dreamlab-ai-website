# ADR-025: Solid Pod Infrastructure Upgrade

## Status
Accepted

## Date
2026-03-16

## Context

The current pod-worker (`community-forum-rs/crates/pod-worker/`) is a minimal Solid-compatible
storage layer:

- **Storage:** Cloudflare R2 (object storage) + KV (metadata, ACLs)
- **Auth:** NIP-98 (Nostr HTTP auth via nostr-core)
- **Access Control:** WAC (Web Access Control) with JSON-LD ACL documents in KV
- **Operations:** GET, HEAD, PUT, POST, DELETE on `/pods/{pubkey}/{path}`
- **Size:** 898 LOC across 3 files (lib.rs, acl.rs, auth.rs), 22 tests

**Limitations:**

1. No LDP (Linked Data Platform) container concept — flat key-value storage only
2. No directory listing — GET on a "container" path returns 404 unless an object exists at that exact key
3. No conditional requests (If-Match/If-None-Match/ETags for conflict resolution)
4. No HTTP Range Requests (streaming media)
5. No PATCH method support
6. No ACL inheritance (must set ACL per-resource, not per-container)
7. No WebID profile document
8. No storage quotas
9. No container metadata (dcterms:modified, ldp:contains, stat:size)
10. ACLs stored only in KV, not alongside resources in R2

**Research:** The JavaScriptSolidServer (JSS) project demonstrates a comprehensive Solid
implementation with:

- LDP CRUD with N3 Patch/SPARQL Update
- WAC with `.acl` files and inheritance
- Solid-OIDC + NIP-98 + WebAuthn auth
- JSON-LD native storage
- Conditional requests, Range Requests
- Per-user quotas, container management
- ActivityPub federation, remoteStorage compatibility
- HTTP 402 paid access

Our goal is to bring the pod-worker to full Solid Protocol compliance while maintaining the
Cloudflare Workers runtime (R2 + KV + D1) and NIP-98 auth model.

## Decision

### D1: LDP Container Model on R2

R2 is an object store without native directory support. We implement containers as a convention:

- A "container" is identified by a trailing `/` in the path (e.g., `/pods/{pk}/public/`)
- Container metadata stored as a JSON-LD document at the container key itself (e.g., R2 key `pods/{pk}/public/`)
- Container membership tracked via R2 list prefix: `bucket.list({ prefix: "pods/{pk}/public/" })`
- POST to a container creates a child resource (Slug header for naming, fallback to UUID)
- GET on a container returns JSON-LD with `ldp:contains` triples listing members
- DELETE on a non-empty container returns 409 Conflict

**Trade-off**: R2 prefix listing has a 1000-item pagination limit per call. Acceptable for
personal pod sizes. Pagination via `cursor` for large containers.

### D2: ACL Inheritance via R2 Sidecar Files

Migrate ACLs from KV-only to R2 sidecar pattern:

- Each resource `/pods/{pk}/path/file` may have a corresponding `/pods/{pk}/path/file.acl`
- Container ACLs at `/pods/{pk}/path/.acl` apply to all children (default ACL)
- Evaluation walks up the container tree until an applicable ACL is found
- Owner always has Control (derived from the pubkey in the URL path)
- Maintain KV cache for hot ACLs (TTL: 60s) to avoid R2 reads on every request
- Link header `<{resource}.acl>; rel="acl"` on all responses

**Trade-off**: ACL inheritance adds up to N R2 reads per request (one per ancestor container),
mitigated by KV cache with 60s TTL. Cache invalidation on ACL write.

### D3: Conditional Requests

- Generate ETags from R2 object metadata (R2 already provides ETags)
- Support `If-None-Match` → 304 Not Modified
- Support `If-Match` → 412 Precondition Failed if ETag mismatch
- Required for safe concurrent writes to shared resources

**Trade-off**: Minimal overhead. R2 provides ETags natively; we forward them.

### D4: HTTP Range Requests

- R2 supports `range` option on `get()` — expose via HTTP `Range` header
- Return `206 Partial Content` with `Content-Range` header
- Critical for streaming video/audio from pods

**Trade-off**: No additional storage cost. Slightly more complex response construction.

### D5: PATCH Method (N3 Patch)

- Accept `Content-Type: text/n3` PATCH requests
- Parse N3 Patch operations (delete/insert triples on JSON-LD resources)
- Apply patches atomically (read-modify-write with ETag for optimistic concurrency)
- Reject PATCH on non-JSON-LD resources (return 415 Unsupported Media Type)

**Trade-off**: N3 Patch requires parsing N3 syntax in Rust (new dependency or custom parser).
Scoped to JSON-LD resources only to limit complexity.

### D6: Per-User Storage Quotas

- Quota stored in KV: `quota:{pubkey}` → `{ limit: 52428800, used: 12345678 }` (default 50MB)
- Enforced on PUT/POST: check `used + content_length <= limit` before write
- Return 507 Insufficient Storage when exceeded (402 Payment Required reserved for future paid tiers)
- Admin endpoint to adjust quotas: `PUT /api/quota/{pubkey}` (NIP-98 admin auth)

**Trade-off**: Quota tracking adds one KV read/write per upload. Atomic increment prevents
race conditions via KV compare-and-swap.

### D7: WebID Profile Documents

- Auto-create `/pods/{pk}/profile/card` on pod provisioning
- Serve as HTML with embedded JSON-LD (`<script type="application/ld+json">`)
- Include: `foaf:name`, `foaf:img`, `solid:oidcIssuer` (pointing to auth-worker), `rdfs:seeAlso` (links to extended profile)
- Profile updates via PUT (full replace) or PATCH (N3 Patch)

**Trade-off**: Adds 1 R2 object per user at provisioning time. Enables Solid ecosystem
interoperability and decentralized identity resolution.

### D8: Default Pod Structure

On pod provisioning (first access or explicit creation), create:

```
/pods/{pk}/
  profile/
    card              (WebID document)
  public/             (world-readable container)
    .acl              (foaf:Agent Read access)
  private/            (owner-only container)
    .acl              (owner Read+Write+Control)
  inbox/              (append-only for notifications)
    .acl              (AuthenticatedAgent Append, owner Read+Write)
  settings/           (preferences, private)
```

**Trade-off**: Pod provisioning creates 8+ R2 objects upfront. Cost is negligible
(R2 Class A write: $0.0000045 per operation).

### D9: Response Headers

All responses include:

- `Link: <.acl>; rel="acl"` (WAC discovery)
- `Link: <.meta>; rel="describedby"` (metadata)
- `Link: <http://www.w3.org/ns/ldp#Resource>; rel="type"` (LDP resource type)
- `Link: <http://www.w3.org/ns/ldp#Container>; rel="type"` (for containers)
- `WAC-Allow: user="read write", public="read"` (advertise permissions)
- `Accept-Patch: text/n3` (for PATCH-capable resources)
- `Accept-Ranges: bytes` (for range-capable resources)
- `ETag: "{r2_etag}"` (conditional requests)

**Trade-off**: Header construction adds ~20 string allocations per response. Negligible
compared to R2 I/O latency.

### D10: Explicit Non-Goals

We intentionally do NOT implement:

- **Solid-OIDC Identity Provider** — we use NIP-98 + WebAuthn, not OIDC
- **ActivityPub federation** — future ADR if needed
- **MongoDB backend** — we use R2 + KV
- **Git HTTP backend** — out of scope
- **HTTP 402 payment** — future consideration for paid storage tiers

## Consequences

### Positive
- Full Solid Protocol compliance (LDP, WAC, conditional requests)
- Streaming media support via Range Requests (video/audio playback from pods)
- Concurrent write safety via ETags (prevents silent data loss)
- Proper access control inheritance reduces per-resource ACL burden
- WebID profiles enable Solid ecosystem interoperability
- Storage quotas prevent abuse and enable future paid tiers
- Default pod structure provides consistent user experience

### Negative
- ACL inheritance adds R2 reads per request (mitigated by KV cache, 60s TTL)
- N3 Patch requires parsing N3 syntax in Rust (new dependency or custom parser)
- Container listing via R2 prefix scan has 1000-item pagination limit per call
- Pod provisioning creates 8+ R2 objects upfront per user
- Increased worker complexity (~2,000 new LOC, from 898 to ~2,900)

### Neutral
- No changes to auth-worker, relay-worker, search-worker, or preview-worker
- No changes to nostr-core library
- No changes to forum-client (pod interactions are HTTP-based, existing fetch calls still work)
- Existing pods (flat R2 keys) continue to work — container model is additive

### Migration
- Existing pods with flat R2 keys continue to function without changes
- ACL migration: copy KV ACLs to R2 `.acl` sidecar files, retain KV as cache layer
- No breaking changes to existing client code — new features are additive

## Files Affected

| File | Change Type | Scope |
|------|------------|-------|
| `crates/pod-worker/src/lib.rs` | Major | LDP container routing, Range Requests, PATCH, response headers |
| `crates/pod-worker/src/acl.rs` | Major | ACL inheritance, R2 sidecar read/write, KV cache layer |
| `crates/pod-worker/src/auth.rs` | Minor | Admin quota endpoint auth |
| `crates/pod-worker/src/container.rs` | New | LDP container model, JSON-LD generation, membership listing |
| `crates/pod-worker/src/quota.rs` | New | Per-user quota enforcement, KV storage, admin adjustment |
| `crates/pod-worker/src/webid.rs` | New | WebID profile document generation and serving |
| `crates/pod-worker/src/patch.rs` | New | N3 Patch parser and JSON-LD patch application |
| `crates/pod-worker/src/provisioning.rs` | New | Default pod structure creation, migration helpers |

## Implementation

**Phase 1 (P0):** LDP containers (D1), ACL inheritance (D2), conditional requests (D3), Range Requests (D4)
**Phase 2 (P1):** WebID profiles (D7), default pod structure (D8), quota management (D6), response headers (D9)
**Phase 3 (P2):** N3 Patch (D5), remoteStorage compatibility

Estimated new LOC: ~2,000 across pod-worker (currently 898 LOC → ~2,900 LOC across 8-10 files).

## Alternatives Considered

1. **Use Community Solid Server (CSS) as a sidecar** — Too heavy. CSS requires Node.js
   runtime, incompatible with Cloudflare Workers. Would add cold-start latency and
   deployment complexity.

2. **Implement full SPARQL Update instead of N3 Patch** — Over-engineered. N3 Patch
   covers Solid Protocol requirements. SPARQL adds query engine complexity without
   clear benefit for personal pod use cases.

3. **Store ACLs in D1 instead of R2 sidecar files** — Breaks Solid convention where
   `.acl` resources are addressable URIs. R2 sidecar files are discoverable via Link
   headers and can be fetched/modified by standard Solid clients.

4. **Skip container model, use KV-based directory index** — Fragile. KV index can
   desync from R2 contents. R2 prefix listing is authoritative and requires no
   additional bookkeeping.

## References

- [Solid Protocol Specification](https://solidproject.org/TR/protocol) — LDP, WAC, conditional requests
- [Linked Data Platform 1.0](https://www.w3.org/TR/ldp/) — Container model, POST/Slug semantics
- [Web Access Control](https://solidproject.org/TR/wac) — ACL inheritance, agent classes
- [N3 Patch](https://solidproject.org/TR/n3-patch) — PATCH method for RDF resources
- `community-forum-rs/crates/pod-worker/` — Current implementation (898 LOC)
- `docs/adr/011-images-to-solid-pods.md` — Initial Solid pod decision
- `docs/prd-rust-port-v4.0.md` — Parity sprint plan
