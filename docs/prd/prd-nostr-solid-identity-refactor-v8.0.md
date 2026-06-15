# PRD: Nostr + Solid + did:nostr Unified Identity Refactor

**Version:** 8.0
**Date:** 2026-05-06
**Author:** DreamLab Engineering
**Status:** Draft
**Depends on:** [ADR-027 through ADR-034], [PRD v7.0](./prd-forum-professionalisation-v7.0.md)

---

## 1. Overview & Motivation

### Why

The DreamLab community forum has completed its professionalisation upgrade (PRD v7.0) and now has solid product-layer foundations: trust levels, relay-side zone enforcement, moderation queues, badge system, and admin tooling. The underlying identity and protocol stack, however, still has critical correctness bugs and substantial gaps relative to the current Nostr NIP corpus and the emerging W3C Solid + did:nostr specifications.

Four categories of debt have accumulated:

**Critical correctness bugs:** The NIP-04 decrypt path calls `nip44_decrypt()` on AES-256-CBC ciphertext, silently breaking all DMs from external Nostr clients (Damus, Amethyst). Kind-1059 gift-wrap events are not AUTH-gated, exposing all encrypted messages to any subscriber. The pod provisioning path returns a `pod_url` that nothing in the client or relay consumes. The multi-admin `is_admin` D1 column has never been wired.

**Protocol gaps:** Twelve NIPs are partially or entirely unimplemented, ranging from NIP-19 TLV links and NIP-24 typed metadata to NIP-46 remote signing, NIP-65 relay lists, and NIP-90 Data Vending Machines. The relay still broadcasts kind-1059 events to all subscribers and still uses kind-30913 (a non-standard event kind) for reports rather than the standard kind-1984.

**Solid conformance gaps:** The pod-worker advertises Solid Notifications, Turtle content negotiation, TypeIndex documents, and ActivityPub federation in discovery documents but implements none of them. JSON-LD is hand-crafted string templates without `@context` resolution; cross-pod RDF operations silently produce invalid linked data.

**Missing identity layer:** There is no did:nostr DID document endpoint per the W3C Nostr CG draft spec. The `webid` tag extension in NIP-98 HTTP auth is not implemented. Agent identities (did:nostr + Solid WebID + NIP-05) are not unified. There is no NIP-26 delegation, no NIP-90 agent marketplace, and no ldp:inbox for structured task delivery.

These gaps collectively prevent the forum from acting as a credible foundation for the DreamLab AI agent ecosystem that the product roadmap requires. External Nostr clients cannot interoperate reliably. Agents cannot authenticate, delegate, or advertise capabilities. Cross-pod data exchange produces invalid RDF.

### What

A four-phase refactor that:

1. **P0 (Sprint, ~2 weeks):** Fixes all four critical bugs, corrects the relay's NIP conformance for kind-1059 AUTH-gating, migrates reports to standard kind-1984, wires the multi-admin system, and adds the highest-value missing NIPs (NIP-19, NIP-24, NIP-65).

2. **P1 (Sprint, ~3 weeks):** Replaces hand-crafted JSON-LD with a proper JSON-LD 1.1 processor (`json-ld = "0.21.4"`), brings Solid conformance to green across TypeIndex, Notifications, and Turtle, and fills NIP-07 extension delegation and NIP-46 remote signing.

3. **P2 (Sprint, ~3 weeks):** Builds the complete agent identity stack -- did:nostr resolution (three-tier), NIP-26 delegation tokens, kind-31990 capability advertisements, ldp:inbox task delivery, and the NIP-90 DVM job protocol foundation.

4. **P3 (Sprint, ~4 weeks):** Full agent marketplace -- job queue, result escrow, capability negotiation, ACP upgrade from WAC, ActivityPub bridge, and federation primitives.

### Scope

| In scope | Out of scope |
|----------|-------------|
| NIP-04 decrypt bug fix | Email system |
| Kind-1059 AUTH gating | Mobile native app |
| Multi-admin system (is_admin column wired) | PostgreSQL migration |
| did:nostr DID document endpoint | ActivityPub full federation (P3 foundation only) |
| NIP-05 client-side verification | Plugin architecture |
| NIP-07 encrypt/decrypt delegation | SPARQL Update (PATCH) on pod-worker |
| NIP-17 read receipts + kind-10050 | Video/audio streaming |
| NIP-19 TLV (nprofile, nevent, naddr) | Solid SAI (deferred post-P3) |
| NIP-24 typed UserMetadata | User merge / anonymize |
| NIP-26 delegation tokens | Paid content (HTTP 402) |
| NIP-46 remote signing (nostr-connect) | ZK proof integration |
| NIP-65 relay list metadata (kind-10002) | Desktop native client |
| NIP-90 DVM job protocol | IPFS/Filecoin storage |
| JSON-LD 1.1 processor (json-ld crate) | |
| Solid TypeIndex provisioning | |
| Solid Notifications handler | |
| Turtle serialisation (real implementation) | |
| did:nostr three-tier resolution | |
| NIP-98 webid tag extension | |
| kind-31990 agent capability advertisements | |
| ldp:inbox task delivery | |
| NIP-90 DVM foundation | |
| ACP upgrade (from WAC) | |
| Agent marketplace UI (P3) | |

### Codebase Reference

| Component | Location | Current state |
|-----------|----------|---------------|
| Relay Worker | `community-forum-rs/crates/relay-worker/src/` | `lib.rs`, `auth.rs`, `nip11.rs`, `whitelist.rs`, `relay_do/`, `trust.rs`, `audit.rs`, `moderation.rs` |
| Auth Worker | `community-forum-rs/crates/auth-worker/src/` | `lib.rs`, `auth.rs`, `webauthn.rs`, `pod.rs`, `admin.rs`, `schema.rs`, `rate_limit.rs`, `invites.rs`, `welcome.rs`, `wot.rs`, `moderation.rs`, `http.rs`, `crypto.rs` |
| Forum Client | `community-forum-rs/crates/forum-client/src/` | 17 pages, 58+ components, 7 stores |
| Nostr Core | `community-forum-rs/crates/nostr-core/src/` | `event.rs`, `keys.rs`, `types.rs`, `nip44.rs`, `nip98.rs`, `gift_wrap.rs`, `groups.rs`, `moderation_events.rs`, `deletion.rs`, `calendar.rs`, `wasm_bridge.rs` |
| Pod Worker | `community-forum-rs/crates/pod-worker/src/` | `lib.rs`, `acl.rs`, `auth.rs`, `conditional.rs`, `container.rs`, `content_negotiation.rs`, `notifications.rs`, `patch.rs`, `payments.rs`, `provision.rs`, `quota.rs`, `remote_storage.rs`, `webid.rs` |
| Search Worker | `community-forum-rs/crates/search-worker/src/lib.rs` | RuVector cosine k-NN |
| Preview Worker | `community-forum-rs/crates/preview-worker/src/lib.rs` | OG metadata, SSRF protection |
| Admin CLI | `community-forum-rs/crates/admin-cli/src/` | Management tooling |

---

## 2. Success Criteria

### Phase 1 (P0 -- Critical Fixes + NIP Gaps)

| Metric | Target |
|--------|--------|
| kind-4 DMs from Damus/Amethyst decrypt correctly | 100% of test vectors from external client exports |
| kind-1059 events visible only to the intended recipient (NIP-42 AUTH required) | Verified end-to-end: subscriber without AUTH cannot retrieve gift-wrap events |
| Pod URL surfaced to forum client and stored in identity store | `stores/identity.rs` reads `pod_url` from auth response; profile page shows pod link |
| Multi-admin: any pubkey with `is_admin = 1` in D1 can call admin endpoints | Verified with 3 distinct test admin pubkeys |
| kind-30913 reports migrated to kind-1984 | Zero kind-30913 events emitted; external NIP-56 tooling can ingest reports |
| NIP-19 TLV encode/decode for nprofile, nevent, naddr | All property-based test vectors pass in nostr-core |
| NIP-24 UserMetadata fields (banner, display_name, bot, website) present in kind-0 | Profile editor writes all NIP-24 fields; kind-0 stored and returned correctly |
| NIP-65 kind-10002 relay list published on registration | Every new account has a kind-10002 event in relay; relay uses it for outbox routing |
| Existing 457 tests pass with zero regressions | 0 failures |
| New tests for P0 features | >80% coverage on new/modified modules |

### Phase 2 (P1 -- JSON-LD + Solid Conformance + NIP Gaps)

| Metric | Target |
|--------|--------|
| JSON-LD `@context` resolution produces valid expanded form | Solid conformance test suite passes on WebID profile and ACL documents |
| TypeIndex documents created at pod provisioning time | `GET /pods/{pubkey}/settings/publicTypeIndex` returns valid Turtle |
| Solid Notifications subscription lifecycle (WebSocket) | Subscribe, receive event, unsubscribe -- verified end-to-end |
| Turtle content negotiation (Accept: text/turtle) | `GET /pods/{pubkey}/profile/card` returns valid Turtle when requested |
| NIP-07 encrypt/decrypt delegated to browser extension | Extension encrypt/decrypt called for DM composition; fallback to in-page key |
| NIP-46 remote signing handshake completes | `nostr-connect://` URI generated; signing request round-trip verified in staging |
| All P0 metrics continue to pass | 0 regressions |

### Phase 3 (P2 -- Agent Identity Stack)

| Metric | Target |
|--------|--------|
| did:nostr DID document served at `/.well-known/did/nostr/{pubkey}.json` | Valid W3C DID document per Nostr CG draft spec |
| Tier-1 offline DID resolution from pubkey alone | Round-trip: `did:nostr:<pubkey>` -> minimal DID doc in <1ms, no network required |
| Tier-2 HTTP DID resolution retrieves full document | `GET /.well-known/did/nostr/{pubkey}.json` returns document with WebID + relays |
| NIP-98 `webid` tag extension validates server-side | Server extracts signing pubkey from WebID profile RDF, authenticates without pre-registration |
| NIP-26 delegation token issued and validated relay-side | Delegated agent can post kinds specified in token; relay rejects out-of-scope kinds |
| kind-31990 capability advertisement published for every agent account | Queryable via REQ; external tooling discovers agent capabilities |
| ldp:inbox receives structured LDN task and routes to agent | POST to `/{pubkey}/inbox/` creates resource; agent WebSocket receives notification |
| NIP-90 DVM job request (kind-5xxx) processed by at least one agent | Job request -> bid -> result round-trip verified in staging |
| All P0 and P1 metrics continue to pass | 0 regressions |

### Phase 4 (P3 -- Agent Marketplace + Federation)

| Metric | Target |
|--------|--------|
| Agent marketplace UI lists available agents with capabilities and pricing | Functional listing page with NIP-90 job kinds, pricing, reputation score |
| Job queue: user posts job, selects agent bid, result delivered | End-to-end round-trip <30s for a text-transformation job |
| ACP policies replace WAC for all pod resources | All pod ACL documents in ACP format; WAC reader removed |
| ActivityPub bridge: kind-1 notes federated to ActivityPub inbox | Verified with a local Mastodon instance in staging |
| did:nostr resolution via relay (Tier 3): kind-0 + kind-3 aggregated | Returns full profile + follows graph as DID document extension |
| Cross-pod RDF operation with json-ld + oxigraph SPARQL | Two-pod SPARQL query returns merged dataset with valid linked data |
| Agent reputation score updated after job completion | Score persists in D1; visible on marketplace listing |

### Definition of Done (per feature)

1. All existing tests pass; new tests added for the feature (>80% coverage on new code).
2. Forum client compiles to `wasm32-unknown-unknown` without errors: `cargo check --target wasm32-unknown-unknown -p forum-client`.
3. `cargo check` passes for all modified crates in workspace.
4. D1 migrations are additive (no DROP COLUMN, no table renames).
5. Feature documented in source module doc comments.
6. Manual end-to-end test passes on staging relay and staging pod-worker.
7. NIP conformance: if the feature implements a NIP, the relevant NIP test vectors pass.

---

## 3. Phase 1: P0 -- Critical Fixes + Relay Conformance (~2 weeks)

### 3.1 NIP-04 Decrypt Bug Fix

**Root Cause:** `nostr-core/src/gift_wrap.rs` (or the message handling path that calls `process_kind4_event()`) invokes `nip44_decrypt()` on kind-4 events. Kind-4 (NIP-04) uses AES-256-CBC with PKCS7 padding and HMAC-SHA256 in the format `<base64-ciphertext>?iv=<base64-iv>`. NIP-44 uses ChaCha20-Poly1305 with a versioned binary framing. These are incompatible decrypt paths.

**Fix:**

New module: `nostr-core/src/nip04.rs`

```rust
/// NIP-04 AES-256-CBC DM encrypt/decrypt.
/// Distinct from nip44.rs (ChaCha20-Poly1305). Do not conflate.
pub fn nip04_encrypt(
    sender_sk: &k256::SecretKey,
    recipient_pk: &k256::PublicKey,
    plaintext: &str,
) -> Result<String, Nip04Error>;

pub fn nip04_decrypt(
    recipient_sk: &k256::SecretKey,
    sender_pk: &k256::PublicKey,
    ciphertext_with_iv: &str,   // "<base64ciphertext>?iv=<base64iv>"
) -> Result<String, Nip04Error>;
```

The shared secret is derived via ECDH (x-coordinate of `sender_sk * recipient_pk`), matching the NIP-04 spec exactly. The ciphertext format parser splits on `?iv=`, base64-decodes both parts, and passes them to `aes::Aes256CbcDec` (add `aes = "0.8"` + `cbc = "0.1"` to `nostr-core/Cargo.toml`).

**Relay Worker Change:**

In `relay_do/` event dispatch, replace the call `nip44_decrypt(...)` for kind-4 events with `nip04_decrypt(...)`. Kind-44 (NIP-44) events continue to use `nip44_decrypt()`.

**Forum Client Change:**

`components/dm_composer.rs`: when composing a kind-4 DM, use `nip04_encrypt`. `stores/messages.rs`: when displaying kind-4 DMs, use `nip04_decrypt`.

**Tests:**

Add `nostr-core/src/nip04.rs` test vectors from the NIP-04 spec. Add property-based round-trip test (proptest). Add cross-client compatibility vectors exported from Amethyst and Damus (manually captured).

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/nip04.rs` | NEW -- AES-256-CBC encrypt/decrypt |
| `community-forum-rs/crates/nostr-core/src/lib.rs` | Export `nip04` module |
| `community-forum-rs/crates/nostr-core/Cargo.toml` | Add `aes`, `cbc` dependencies |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Fix kind-4 dispatch to use nip04_decrypt |
| `community-forum-rs/crates/forum-client/src/stores/messages.rs` | Fix DM decrypt path |
| `community-forum-rs/crates/forum-client/src/components/dm_composer.rs` | Fix DM encrypt path |

### 3.2 Kind-1059 AUTH Gating

**Root Cause:** The relay's REQ handler returns kind-1059 (gift-wrap, NIP-59) events to any subscriber matching the `#p` tag, regardless of whether the subscriber has authenticated via NIP-42 AUTH. This defeats the privacy layer.

**Fix:**

In `relay_do/` REQ handler:

1. Before returning any kind-1059 event, verify that the WebSocket session has completed NIP-42 AUTH.
2. For an authenticated session, return kind-1059 events only where the `p` tag matches the authenticated session pubkey.
3. Unauthenticated sessions receive `NOTICE: restricted: authentication required for kind 1059` and the event is withheld.

**New helper in `relay_do/`:**

```rust
fn is_gift_wrap_authorized(session: &SessionState, event: &NostrEvent) -> bool {
    match &session.authed_pubkey {
        Some(pk) => event.tags.iter().any(|t| t.kind == "p" && t.values.first() == Some(pk)),
        None => false,
    }
}
```

**NIP-11 Update:**

`nip11.rs`: Add `"auth_required": true` to the relay information document's `limitation` field for kind 1059 event retrieval. This signals to clients that AUTH is required before subscribing to encrypted DMs.

| File | Change |
|------|--------|
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Add AUTH check for kind-1059 REQ |
| `community-forum-rs/crates/relay-worker/src/nip11.rs` | Add auth_required limitation for kind 1059 |

### 3.3 Multi-Admin System

**Root Cause:** All admin endpoint checks compare the NIP-98 signing pubkey against a single `ADMIN_PUBKEY` environment variable. The D1 `whitelist` table has an `is_admin` column that was never read.

**Fix:**

**`whitelist.rs`:** Replace `ADMIN_PUBKEY` comparisons with a D1 query:

```rust
async fn is_admin(env: &Env, pubkey: &str) -> Result<bool> {
    let db = env.d1("DB")?;
    let result = db
        .prepare("SELECT is_admin FROM whitelist WHERE pubkey = ?1 AND is_admin = 1")
        .bind(&[pubkey.into()])?
        .first::<AdminRow>(None)
        .await?;
    Ok(result.is_some())
}
```

Cache the result in DO session state for the lifetime of the WebSocket session. Invalidate on `whitelist_update` events.

**D1 Schema Change (Migration 010):**

```sql
-- Migration 010: Wire is_admin + add admin_granted_at
ALTER TABLE whitelist ADD COLUMN admin_granted_at INTEGER;
ALTER TABLE whitelist ADD COLUMN admin_granted_by TEXT;

-- Migrate existing ADMIN_PUBKEY to D1 on first deploy
-- (run via admin-cli: admin-cli migrate-admin-pubkey)
```

**Admin CLI command:** `admin-cli grant-admin <pubkey>` -- sets `is_admin = 1`, `admin_granted_at`, `admin_granted_by` in D1. `admin-cli revoke-admin <pubkey>` -- sets `is_admin = 0`, logs to audit trail.

**Audit trail:** Every admin grant/revoke logs to `admin_log` with action `admin_grant` or `admin_revoke`.

**Forum Client Change:**

`pages/admin.rs`: Add "Administrators" section listing all pubkeys with `is_admin = 1`. "Grant Admin" and "Revoke Admin" buttons (visible to existing admins only).

| File | Change |
|------|--------|
| `community-forum-rs/crates/relay-worker/src/whitelist.rs` | Replace ADMIN_PUBKEY with D1 is_admin lookup |
| `community-forum-rs/crates/relay-worker/src/auth.rs` | Update NIP-98 admin auth to use is_admin() |
| `community-forum-rs/crates/admin-cli/src/` | Add grant-admin and revoke-admin commands |
| `community-forum-rs/crates/forum-client/src/pages/admin.rs` | Add Administrators section |

### 3.4 Pod URL Surfacing

**Root Cause:** `auth-worker/src/pod.rs` returns `pod_url` and `web_id` in the passkey auth response, but `forum-client/src/stores/` has no signal for them and no UI component renders them.

**Fix:**

**`stores/identity.rs`:** Add:

```rust
pub struct IdentityState {
    // existing fields...
    pub pod_url: RwSignal<Option<String>>,
    pub web_id: RwSignal<Option<String>>,
}
```

Populate from the auth response JSON after successful passkey authentication.

**`pages/profile.rs`:** Add "Data Pod" section: pod URL as a clickable link; web_id as a copyable text field. Show only when authenticated user is viewing their own profile.

**`components/identity_card.rs`** (new): Compact display of `did:nostr:<pubkey>`, NIP-05 identifier, and pod URL. Used in message bubbles (collapsed) and profile page (expanded).

| File | Change |
|------|--------|
| `community-forum-rs/crates/forum-client/src/stores/identity.rs` | Add pod_url and web_id signals |
| `community-forum-rs/crates/forum-client/src/pages/profile.rs` | Add Data Pod section |
| `community-forum-rs/crates/forum-client/src/components/identity_card.rs` | NEW |

### 3.5 Kind-30913 -> Kind-1984 Migration

**Root Cause:** Reports use a custom kind-30913 instead of the standard NIP-56 kind-1984, breaking compatibility with external Nostr moderation tooling.

**Fix:**

**`nostr-core/src/moderation_events.rs`:**

- Change `ReportEvent::KIND` constant from `30913` to `1984`.
- Update `build_report_event()` to produce kind-1984 with standard NIP-56 tags: `["e", event_id]`, `["p", pubkey]`, `["report", reason]`.
- Add `reason` tag values: `nudity`, `profanity`, `illegal`, `spam`, `impersonation`. Free-text goes in the `content` field.

**Relay Worker:** Update EVENT handler to accept kind-1984. Update the `reports` D1 table population to parse kind-1984 tags. Remove any special handling for kind-30913.

**Migration:** Existing kind-30913 events in the relay can remain in storage (they are historical); no backfill needed. New reports from this version forward are kind-1984.

**Forum Client:** `components/report_button.rs` -- update event kind used when submitting reports. Existing `pages/admin.rs` moderation queue reads reports from D1 `reports` table (already kind-agnostic at DB level) -- no change needed.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/moderation_events.rs` | Change KIND to 1984, update tag structure |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Update kind-1984 event handler |
| `community-forum-rs/crates/relay-worker/src/moderation.rs` | Update report parsing for kind-1984 tags |
| `community-forum-rs/crates/forum-client/src/components/report_button.rs` | Update event kind |

### 3.6 NIP-19 TLV Encoding

**Decision (see ADR-027):** Add `nostr = "0.44.2"` to `Cargo.toml` as a workspace dependency for higher-level NIP support. The DreamLab `nostr-core` crate continues to own NIP-01/04/44/59/98/29/42 for CF Workers/relay use. The upstream `nostr` crate is used for NIP-19 TLV, NIP-26, NIP-46, NIP-65, NIP-90 -- types the custom crate does not implement. Upstream types are re-exported via `nostr-core` where the forum client needs them.

**`nostr-core/src/nip19.rs`** (new): Re-export and thin wrappers around `nostr::nip19`:

```rust
pub use nostr::nip19::{Nip19Profile, Nip19Event, Nip19Addr, ToBech32, FromBech32};

/// Encode a pubkey + optional relay list as nprofile1...
pub fn encode_nprofile(pubkey: &[u8; 32], relays: &[&str]) -> Result<String, Nip19Error>;

/// Decode any bech32-encoded entity (npub, nsec, nprofile, nevent, naddr, note)
pub fn decode_bech32(encoded: &str) -> Result<Nip19Entity, Nip19Error>;
```

**Forum Client Changes:**

- `components/message_bubble.rs`: Render `nostr:nevent1...` and `nostr:nprofile1...` links as embedded previews (fetch event or profile from relay).
- `pages/profile.rs`: Show user's `npub` and `nprofile` (with relay hints) as copyable fields.
- `components/share_modal.rs` (new): Copy nevent TLV link for any message; copy nprofile for any user.

| File | Change |
|------|--------|
| `community-forum-rs/Cargo.toml` | Add `nostr = "0.44.2"` to workspace dependencies |
| `community-forum-rs/crates/nostr-core/Cargo.toml` | Add `nostr` workspace dep |
| `community-forum-rs/crates/nostr-core/src/nip19.rs` | NEW -- TLV encode/decode wrappers |
| `community-forum-rs/crates/nostr-core/src/lib.rs` | Export nip19 module |
| `community-forum-rs/crates/forum-client/src/components/share_modal.rs` | NEW |
| `community-forum-rs/crates/forum-client/src/pages/profile.rs` | Add npub / nprofile display |

### 3.7 NIP-24 Typed UserMetadata

**`nostr-core/src/types.rs`:** Extend `UserMetadata` struct to include all NIP-24 fields:

```rust
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct UserMetadata {
    // NIP-01 base fields
    pub name: Option<String>,
    pub about: Option<String>,
    pub picture: Option<String>,
    pub nip05: Option<String>,
    pub lud06: Option<String>,
    pub lud16: Option<String>,

    // NIP-24 extended fields
    pub display_name: Option<String>,
    pub website: Option<String>,
    pub banner: Option<String>,
    pub bot: Option<bool>,
}
```

**Forum Client Changes:**

- `pages/profile.rs`: Render `banner` as a full-width header image behind the avatar. Show `display_name` as the primary name (fall back to `name`). Show `website` as a link. Show "Bot" badge if `bot: true`.
- `components/profile_editor.rs` (new, or extend existing): Add fields for `display_name`, `website`, `banner` URL, `bot` toggle.

**Relay Worker:** No change needed -- kind-0 events are stored as-is. The `UserMetadata` struct change is client-side only.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/types.rs` | Add NIP-24 fields to UserMetadata |
| `community-forum-rs/crates/forum-client/src/pages/profile.rs` | Render banner, display_name, website, bot badge |
| `community-forum-rs/crates/forum-client/src/components/profile_editor.rs` | Add NIP-24 edit fields |

### 3.8 NIP-65 Relay List Metadata (Kind-10002)

**`nostr-core/src/types.rs`:** Add:

```rust
pub struct RelayListEntry {
    pub url: String,
    pub marker: Option<RelayMarker>,  // read | write | None (both)
}

pub struct RelayListMetadata {
    pub relays: Vec<RelayListEntry>,
}

impl RelayListMetadata {
    pub const KIND: u64 = 10002;
    pub fn to_event(&self, keys: &NostrKeys, created_at: u64) -> NostrEvent;
    pub fn from_event(event: &NostrEvent) -> Result<Self, Nip65Error>;
}
```

**Auth Worker Change (`auth-worker/src/pod.rs`):** After provisioning a new account, publish a kind-10002 event with the DreamLab relay URL as a read+write relay. This gives the user a baseline relay list that external clients can discover.

**Relay Worker Change:** Remove hardcoded relay URL from outbox routing. For events tagged to external pubkeys (kind-4 DMs, gift wraps), look up the recipient's kind-10002 event to determine their preferred relay for delivery.

**Forum Client Change:**

`pages/settings.rs` (or `pages/profile.rs`): Add "Relay List" section. Display current kind-10002 relay list. Allow adding/removing relays. Publish updated kind-10002 event on save.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/types.rs` | Add RelayListMetadata, RelayListEntry |
| `community-forum-rs/crates/auth-worker/src/pod.rs` | Publish kind-10002 on account creation |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Use kind-10002 for outbox routing |
| `community-forum-rs/crates/forum-client/src/pages/settings.rs` | Add Relay List section |

### P0 D1 Migration Summary

| Migration | Table | Type | Description |
|-----------|-------|------|-------------|
| 010 | `whitelist` | ALTER | Add `admin_granted_at`, `admin_granted_by` columns |

---

## 4. Phase 2: P1 -- JSON-LD Processor + Solid Conformance + NIP Gaps (~3 weeks)

### 4.1 JSON-LD 1.1 Processor

**Problem:** Pod-worker currently produces JSON-LD documents by string template concatenation. This generates documents that fail `@context` resolution, produce incorrect expanded forms, and break cross-pod RDF operations.

**Decision (see ADR-028):** Add `json-ld = "0.21.4"`, `iref = "4.0.0"`, and `rdf-types = "0.22.5"` to the pod-worker's `Cargo.toml`. These crates are wasm32-safe with `NoLoader` (offline context resolution). The Solid contexts (`ldp`, `acl`, `foaf`, `vcard`) are bundled as static byte slices at compile time via `include_bytes!` -- no network required in the CF Worker environment.

**`pod-worker/src/jsonld.rs`** (new):

```rust
use json_ld::{JsonLdProcessor, Options, NoLoader};
use iref::IriBuf;

/// Embedded Solid contexts loaded at compile time
static LDP_CONTEXT: &[u8] = include_bytes!("../contexts/ldp.jsonld");
static ACL_CONTEXT: &[u8] = include_bytes!("../contexts/acl.jsonld");
static FOAF_CONTEXT: &[u8] = include_bytes!("../contexts/foaf.jsonld");
static VCARD_CONTEXT: &[u8] = include_bytes!("../contexts/vcard.jsonld");
static SCHEMA_CONTEXT: &[u8] = include_bytes!("../contexts/schema.jsonld");

/// Expand a JSON-LD document to its expanded form using bundled contexts.
pub async fn expand(doc: &serde_json::Value, base: &IriBuf) -> Result<Vec<serde_json::Value>, JsonLdError>;

/// Compact an expanded JSON-LD graph using a given context.
pub async fn compact(
    expanded: &[serde_json::Value],
    context: &serde_json::Value,
    base: &IriBuf,
) -> Result<serde_json::Value, JsonLdError>;

/// Produce a Turtle serialisation of an expanded JSON-LD graph.
pub fn to_turtle(expanded: &[serde_json::Value]) -> Result<String, JsonLdError>;
```

**Bundled context files** (`pod-worker/contexts/`):

```
contexts/
  ldp.jsonld     -- W3C LDP context
  acl.jsonld     -- W3C WAC (Web Access Control) context
  foaf.jsonld    -- FOAF 0.1 (subset: Agent, Person, knows, name, mbox)
  vcard.jsonld   -- vCard 4.0 (subset used by Solid WebID profiles)
  schema.jsonld  -- Schema.org (subset: Person, name, url, image)
  solid.jsonld   -- Solid terms (storage, account, privateTypeIndex, publicTypeIndex)
```

**Retrofit existing pod-worker documents:**

| Document | Current | After |
|----------|---------|-------|
| WebID profile (`webid.rs`) | String template | `jsonld::compact()` with foaf+vcard context |
| WAC ACL document (`acl.rs`) | String template | `jsonld::compact()` with acl context |
| Container listing (`container.rs`) | String template | `jsonld::compact()` with ldp context |
| LDN notification body | String template | `jsonld::expand()` + validate before store |

**Turtle Content Negotiation (`content_negotiation.rs`):**

Previously advertised but not implemented. After this phase: `to_turtle()` is called when `Accept: text/turtle` is in the request. WebID profile, container listings, and ACL documents all support Turtle output.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/Cargo.toml` | Add json-ld, iref, rdf-types |
| `community-forum-rs/crates/pod-worker/src/jsonld.rs` | NEW -- JSON-LD 1.1 processor |
| `community-forum-rs/crates/pod-worker/contexts/` | NEW -- 6 bundled context files |
| `community-forum-rs/crates/pod-worker/src/webid.rs` | Replace string templates with jsonld::compact |
| `community-forum-rs/crates/pod-worker/src/acl.rs` | Replace string templates with jsonld::compact |
| `community-forum-rs/crates/pod-worker/src/container.rs` | Replace string templates with jsonld::compact |
| `community-forum-rs/crates/pod-worker/src/content_negotiation.rs` | Implement Turtle via jsonld::to_turtle |

### 4.2 Solid TypeIndex Provisioning

**Problem:** The WebID profile declares `solid:publicTypeIndex` and `solid:privateTypeIndex` properties pointing to type index documents that are never created at pod provisioning time. Any Solid application that follows these links receives a 404.

**Fix (`pod-worker/src/provision.rs`):** After creating the WebID profile card, create two LDP resources:

```
/pods/{pubkey}/settings/publicTypeIndex
/pods/{pubkey}/settings/privateTypeIndex
```

Each is an empty Solid TypeIndex document (valid Turtle with `@type solid:TypeIndex`):

```turtle
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
<> a solid:TypeIndex, solid:UnlistedDocument .
```

The public TypeIndex has a WAC ACL allowing public read; the private TypeIndex has a WAC ACL allowing only the owner (identified by their WebID) to read.

**D1 Schema Change (Migration 011):**

No schema change needed -- provisioned resources are stored in R2 like any other pod resource.

**Forum Client Change:**

`stores/solid.rs` (new): Fetches the user's TypeIndex documents on login. Stores as `RwSignal<Option<SolidTypeIndex>>`. Other stores register type registrations (e.g., `nostr:Event` mapped to the Nostr events container).

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/provision.rs` | Create TypeIndex documents on pod provisioning |
| `community-forum-rs/crates/forum-client/src/stores/solid.rs` | NEW -- TypeIndex client |

### 4.3 Solid Notifications Handler

**Problem:** The pod-worker discovery document advertises Solid Notifications (WebSocket channel) but no handler routes exist.

**Scope for P1:** Implement the Solid Notifications WebSocket channel protocol (version 0.2). Scope is limited to resource update notifications (create, update, delete events on pod resources).

**`pod-worker/src/notifications.rs`** (currently stub, extend):

```rust
/// POST /notifications/  -- Subscribe to a resource
/// Body: { "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
///         "topic": "<resource URI>" }
/// Returns: { "type": "...", "receiveFrom": "wss://pods.dreamlab-ai.com/notifications/{token}" }

/// WebSocket upgrade at /notifications/{token}
/// On resource create/update/delete at the subscribed topic, send:
/// { "@context": ["https://www.w3.org/ns/activitystreams", ...],
///   "type": "Update", "object": { "id": "<resource_uri>", "type": "..." } }
```

**Implementation:** Use a Cloudflare Durable Object (`NotificationsDO`) to hold open WebSocket connections keyed by `{pubkey}/{resource_path}`. When the LDP PUT/DELETE handler modifies a resource, it sends a message to the appropriate `NotificationsDO` via DO RPC stub, which fans out to all WebSocket subscribers.

**D1 Schema Change (Migration 012):**

```sql
-- Migration 012: Notification subscriptions (for expiry management)
CREATE TABLE notification_subscriptions (
    token TEXT PRIMARY KEY,
    pubkey TEXT NOT NULL,
    topic TEXT NOT NULL,
    channel_type TEXT NOT NULL DEFAULT 'WebSocketChannel2023',
    expires_at INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_notif_subs_pubkey ON notification_subscriptions(pubkey);
CREATE INDEX idx_notif_subs_topic ON notification_subscriptions(topic);
```

**`wrangler.toml` change:** Add `NotificationsDO` Durable Object binding.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/notifications.rs` | Implement WebSocket channel protocol |
| D1 migration 012 | CREATE notification_subscriptions |

### 4.4 NIP-07 Encrypt/Decrypt Delegation

**Problem:** `nostr-core/src/nip98.rs` implements NIP-07 `signEvent` delegation but not `encrypt`/`decrypt`. Users with existing Nostr identities in browser extensions (Alby, nos2x, Flamingo) cannot use those keys for DMs -- the forum falls back to an in-page key, which may differ from the user's canonical identity.

**`nostr-core/src/wasm_bridge.rs`:** Extend the NIP-07 WASM bridge:

```rust
/// Calls window.nostr.nip04.encrypt(pubkey, plaintext) if extension present.
/// Falls back to in-page nip04_encrypt() if extension absent.
pub async fn nip07_encrypt(recipient_pubkey: &str, plaintext: &str) -> Result<String, Nip07Error>;

/// Calls window.nostr.nip04.decrypt(pubkey, ciphertext) if extension present.
/// Falls back to in-page nip04_decrypt() if extension absent.
pub async fn nip07_decrypt(sender_pubkey: &str, ciphertext: &str) -> Result<String, Nip07Error>;

/// Calls window.nostr.nip44.encrypt / window.nostr.nip44.decrypt if extension
/// supports NIP-44 (check via window.nostr.nip44 !== undefined).
pub async fn nip07_nip44_encrypt(recipient_pubkey: &str, plaintext: &str) -> Result<String, Nip07Error>;
pub async fn nip07_nip44_decrypt(sender_pubkey: &str, ciphertext: &str) -> Result<String, Nip07Error>;
```

**Forum Client Change:**

`components/dm_composer.rs`: Replace direct `nip04_encrypt()` calls with `nip07_encrypt()`. The wasm_bridge handles extension delegation transparently.

`stores/auth.rs`: On login, detect extension availability via `window.nostr !== undefined`. Store `ExtensionAvailable(bool)` in session state. Show "Connected to Nostr extension" indicator in the identity card when extension is active.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/wasm_bridge.rs` | Add nip07_encrypt/decrypt, nip44 variants |
| `community-forum-rs/crates/forum-client/src/components/dm_composer.rs` | Use nip07_encrypt |
| `community-forum-rs/crates/forum-client/src/stores/auth.rs` | Detect and surface extension availability |

### 4.5 NIP-46 Remote Signing (Nostr Connect)

**Decision (see ADR-029):** Implement NIP-46 client-side (the forum acts as a "client app" requesting signatures from a remote signer). Server-side NIP-46 bunker is out of scope for P1 -- DreamLab users can use third-party signers (nsecBunker, Amber).

**`nostr-core/src/nip46.rs`** (new):

```rust
pub struct NostrConnectClient {
    app_keypair: NostrKeys,         // ephemeral keypair for this connection
    signer_pubkey: Option<[u8; 32]>, // remote signer's pubkey (learned after connect)
    relay_url: String,
    secret: String,                  // random secret for the connect URI
}

impl NostrConnectClient {
    /// Generate a nostr+bunker:// or nostr-connect:// URI for display to the user.
    pub fn connect_uri(&self, app_name: &str, permissions: &[&str]) -> String;

    /// Listen on relay for a kind-24133 response to the connect request.
    /// Returns the signer's pubkey once the handshake is complete.
    pub async fn await_connect(&mut self, relay: &RelayConnection) -> Result<[u8; 32], Nip46Error>;

    /// Request a signature for an event via kind-24133.
    /// Blocks until the signer sends a signed response.
    pub async fn sign_event(&self, event: &UnsignedEvent, relay: &RelayConnection)
        -> Result<NostrEvent, Nip46Error>;

    /// Disconnect: publish kind-24133 disconnect request.
    pub async fn disconnect(&self, relay: &RelayConnection) -> Result<(), Nip46Error>;
}
```

**Forum Client Change:**

`pages/settings.rs`: Add "Remote Signer" section. "Connect via Nostr Connect" button generates a `nostr-connect://` URI and displays it as a QR code (use `qrcode-rs` or a JS interop call). Polls for kind-24133 connect response via the relay WebSocket. On success, stores the signer pubkey in session state.

`stores/auth.rs`: When `signer_pubkey` is set, route all sign operations via `NostrConnectClient::sign_event()` instead of local key.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/nip46.rs` | NEW -- NIP-46 client |
| `community-forum-rs/crates/nostr-core/src/lib.rs` | Export nip46 module |
| `community-forum-rs/crates/forum-client/src/pages/settings.rs` | Add Remote Signer section |
| `community-forum-rs/crates/forum-client/src/stores/auth.rs` | Route signing via NIP-46 when active |

### 4.6 NIP-17 Read Receipts + Kind-10050

**Problem:** NIP-17 infrastructure (kind-13/14/1059) exists but kind-10050 (preferred DM relay list), read receipts, and conversation threading are absent.

**`nostr-core/src/types.rs`:** Add:

```rust
pub struct PreferredDmRelayList {
    pub relays: Vec<String>,
}

impl PreferredDmRelayList {
    pub const KIND: u64 = 10050;
    pub fn to_event(&self, keys: &NostrKeys, created_at: u64) -> NostrEvent;
    pub fn from_event(event: &NostrEvent) -> Result<Self, Nip17Error>;
}
```

**Auth Worker:** Publish a kind-10050 event pointing to `wss://relay.dreamlab-ai.com` on account creation (alongside kind-10002).

**Forum Client:**

`stores/dms.rs`: On DM conversation load, fetch sender's kind-10050 to determine their preferred DM relay. If they prefer a relay other than DreamLab's, surface a note: "This user prefers DMs via [relay]."

`components/dm_thread.rs` (new): Display DM conversation as a thread. Group messages by day. Show read receipt indicator (a small checkmark) when the recipient publishes a kind-14 (chat message) event referencing the sent message in an `e` tag with `marker: "reply"`. Read receipts are opt-in; the UI shows "read receipts off" when the counterparty has not published one.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/types.rs` | Add PreferredDmRelayList, KIND 10050 |
| `community-forum-rs/crates/auth-worker/src/pod.rs` | Publish kind-10050 on account creation |
| `community-forum-rs/crates/forum-client/src/stores/dms.rs` | Fetch kind-10050 for DM routing |
| `community-forum-rs/crates/forum-client/src/components/dm_thread.rs` | NEW -- threaded DM view |

### P1 D1 Migration Summary

| Migration | Table | Type | Description |
|-----------|-------|------|-------------|
| 011 | (R2 resources) | Provision | TypeIndex documents created; no D1 change |
| 012 | `notification_subscriptions` | CREATE | Solid Notifications subscription tracking |

---

## 5. Phase 3: P2 -- Agent Identity Stack (~3 weeks)

### 5.1 did:nostr DID Document Endpoint

**Specification:** W3C Nostr CG draft (2025-11). A did:nostr DID document is derived from the public key using the three-tier resolution process.

**Decision (see ADR-030):** The did:nostr resolver and DID document generator algorithms from `solid-pod-rs 0.5.0-alpha.2` are re-implemented in `nostr-core` rather than using the crate directly, avoiding AGPL copyleft propagation. The algorithms are defined in the open W3C CG draft spec. The re-implementation is < 200 LOC.

**`nostr-core/src/did_nostr.rs`** (new):

```rust
/// Tier 1: Offline DID document generation from pubkey alone.
/// No network required. Returns a minimal conformant DID document.
pub fn did_doc_from_pubkey(pubkey: &[u8; 32]) -> DidDocument;

/// Tier 2: Attempt HTTP resolution from the pod-worker's well-known endpoint.
/// Falls back to Tier 1 if not found.
pub async fn did_doc_from_http(pubkey: &[u8; 32], pod_base: &str)
    -> Result<DidDocument, DidResolutionError>;

/// Tier 3: Augment a DID document with relay data (kind-0 + kind-3).
/// Adds service endpoints for known relays and verificationMethod for kind-3 follows.
pub fn augment_with_relay_data(
    base_doc: DidDocument,
    kind0: Option<&NostrEvent>,
    kind3: Option<&NostrEvent>,
) -> DidDocument;

/// Serialise a DID document to JSON-LD (did+json media type).
pub fn to_json_ld(doc: &DidDocument) -> serde_json::Value;
```

**DID Document Structure (converged did:nostr CG / `create-agent` single form, per ADR-125):**

> The shape below was updated 2026-06-15 to the converged scheme. It supersedes
> the earlier 2019-suite shape (`SchnorrSecp256k1VerificationKey2019` /
> `publicKeyHex` / `#key-0`). This is a document-shape change only — the
> `did:nostr:<hex-pubkey>` identifier, the hex pubkey identity, and the NIP-98
> auth path are unchanged.

```json
{
  "@context": [
    "https://w3id.org/did",
    "https://w3id.org/nostr/context"
  ],
  "id": "did:nostr:<hex-pubkey>",
  "type": "DIDNostr",
  "verificationMethod": [{
    "id": "did:nostr:<hex-pubkey>#key1",
    "type": "Multikey",
    "controller": "did:nostr:<hex-pubkey>",
    "publicKeyMultibase": "fe70102<hex-pubkey>"
  }],
  "authentication": ["#key1"],
  "assertionMethod": ["#key1"],
  "service": []
}
```

`publicKeyMultibase` = literal `fe70102` + the same 64-char lowercase x-only hex (`f` base16-lower multibase ‖ `e701` varint of multicodec `0xe7` secp256k1-pub ‖ `02` SEC1 compressed even-y prefix ‖ 32-byte x-only key); fixed 71-char string, round-trips to the identical key.

The canonical `create-agent` form emits `service: []`. DreamLab populates `service[]` with **agentbox extensions** (`Relay`, `SolidStorage`, `SolidWebID`) — these are optional/permitted, NOT part of the canonical reference form:

```json
{
  "service": [
    { "id": "did:nostr:<hex-pubkey>#nostr-relay", "type": "Relay",       "serviceEndpoint": "wss://relay.dreamlab-ai.com" },
    { "id": "did:nostr:<hex-pubkey>#solid-pod",   "type": "SolidStorage", "serviceEndpoint": "https://pods.dreamlab-ai.com/<hex-pubkey>/" },
    { "id": "did:nostr:<hex-pubkey>#webid",       "type": "SolidWebID",   "serviceEndpoint": "https://pods.dreamlab-ai.com/<hex-pubkey>/profile/card#me" }
  ]
}
```

**Pod Worker Route:**

`GET /.well-known/did/nostr/{pubkey}.json`

1. Validate `pubkey` is 64-character hex.
2. Check D1 whitelist for existence (if not found, return 404).
3. Call `did_doc_from_pubkey(pubkey)` for Tier 1.
4. Query relay (via internal fetch to relay-worker) for kind-0 and kind-3 events for augmentation.
5. Call `augment_with_relay_data()`.
6. Return with `Content-Type: application/did+ld+json`.

Additionally expose: `GET /.well-known/did.json` -- the DreamLab domain DID document (for `did:web:dreamlab-ai.com` resolution).

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/did_nostr.rs` | NEW -- DID document generation |
| `community-forum-rs/crates/nostr-core/src/lib.rs` | Export did_nostr module |
| `community-forum-rs/crates/pod-worker/src/lib.rs` | Add /.well-known/did/nostr/{pubkey}.json route |

### 5.2 NIP-05 Client-Side Verification

**Problem:** Pod-worker serves `/.well-known/nostr.json` correctly, but the forum client has no client-side NIP-05 verification. Users cannot verify that a NIP-05 identifier actually maps to the claimed pubkey.

**`nostr-core/src/nip05.rs`** (new):

```rust
/// Verify that a NIP-05 identifier (user@domain) resolves to the claimed pubkey.
/// Fetches /.well-known/nostr.json?name={user} via the preview-worker (SSRF guard).
pub async fn verify_nip05(
    identifier: &str,  // "alice@dreamlab-ai.com"
    claimed_pubkey: &[u8; 32],
    preview_worker_url: &str,
) -> Result<Nip05VerificationResult, Nip05Error>;

pub enum Nip05VerificationResult {
    Verified,                   // identifier maps to claimed_pubkey
    Mismatch { actual: String },// identifier maps to a different pubkey
    NotFound,                   // no entry for this name
    DomainError(String),        // network or parse error
}
```

**Forum Client Change:**

`components/user_name.rs`: After rendering a user's NIP-05 identifier (from kind-0 metadata), trigger a background verification. Show a checkmark (green) for `Verified`, a warning (amber) for `Mismatch`, and nothing for unverified (pending). Cache verification results in `sessionStorage` for 1 hour.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/nip05.rs` | NEW -- NIP-05 verification |
| `community-forum-rs/crates/forum-client/src/components/user_name.rs` | Add verification indicator |

### 5.3 NIP-98 `webid` Tag Extension

**Specification:** The NIP-98 HTTP Schnorr Auth W3C CG spec adds an optional `webid` tag to the kind-27235 auth event. When present, the server may discover the signing pubkey from the WebID profile's `nostr:pubkey` RDF property, without pre-registered credentials.

**`pod-worker/src/auth.rs`:** Extend NIP-98 verification:

1. Parse the `webid` tag value (a WebID URI) from the kind-27235 event if present.
2. Fetch the WebID profile (from R2 or external URL).
3. Use `jsonld.rs` to expand the profile and extract the `nostr:pubkey` triple.
4. Compare with the event's `pubkey` field. If they match, the authentication is valid even if the pubkey is not in the local whitelist.
5. Cache WebID-to-pubkey mappings in KV with a 15-minute TTL.

**Use case:** External agents authenticating with `did:nostr:<pubkey>` and a corresponding WebID can write to their own pod resources without being pre-whitelisted in the DreamLab D1 database.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/auth.rs` | Add webid tag resolution in NIP-98 verifier |

### 5.4 NIP-26 Delegation Tokens

**Use case:** An AI agent needs to post Nostr events on behalf of a user, scoped to specific event kinds and a time window. The user signs a NIP-26 delegation token; the agent includes it in events as a `delegation` tag.

**`nostr-core/src/nip26.rs`** (new, wrapping `nostr::nip26`):

```rust
pub use nostr::nip26::{Delegation, DelegationTag, DelegationConditions};

/// Issue a delegation token.
/// conditions: "kind=1&kind=42&created_at>1700000000&created_at<1800000000"
pub fn create_delegation(
    delegator_sk: &NostrKeys,
    delegatee_pk: &[u8; 32],
    conditions: &str,
) -> Result<DelegationTag, Nip26Error>;

/// Verify a delegation tag on an incoming event.
pub fn verify_delegation(event: &NostrEvent) -> Result<DelegationVerification, Nip26Error>;

pub enum DelegationVerification {
    ValidDelegation { delegator_pubkey: [u8; 32] },
    NoDelegation,
    InvalidSignature,
    ConditionsNotMet { reason: String },
}
```

**Relay Worker Change:**

In `relay_do/` EVENT handler, after accepting an event, call `verify_delegation()`. If `ValidDelegation`, record the `delegator_pubkey` alongside the event in the D1 events table for audit purposes. Trust level and zone access checks should be evaluated against the **delegator** pubkey, not the agent's pubkey, since the agent acts on the delegator's behalf.

**D1 Schema Change (Migration 013):**

```sql
-- Migration 013: Delegation tracking
ALTER TABLE events ADD COLUMN delegator_pubkey TEXT;
CREATE INDEX idx_events_delegator ON events(delegator_pubkey) WHERE delegator_pubkey IS NOT NULL;
```

**Forum Client Change:**

`pages/settings.rs`: Add "Delegation Tokens" section. "Issue Delegation" modal: select event kinds to allow, set time window. Shows resulting NIP-26 token as a copyable string. Lists active delegation tokens.

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/nip26.rs` | NEW -- NIP-26 delegation |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Verify delegation on EVENT; record delegator |
| D1 migration 013 | ALTER events: add delegator_pubkey column |
| `community-forum-rs/crates/forum-client/src/pages/settings.rs` | Add Delegation Tokens section |

### 5.5 Kind-31990 Agent Capability Advertisements

**Event kind 31990** (NIP-89-adjacent, used in agent ecosystems for capability discovery): A replaceable event where an agent publishes what job kinds it can handle.

**`nostr-core/src/types.rs`:** Add:

```rust
pub struct AgentCapability {
    pub kind: u64,              // NIP-90 job kind handled (e.g., 5100 for text generation)
    pub description: String,
    pub pricing: Option<AgentPricing>,
    pub model: Option<String>,  // for AI agents: model name/version
}

pub struct AgentCapabilityEvent {
    pub agent_pubkey: [u8; 32],
    pub name: String,
    pub about: String,
    pub capabilities: Vec<AgentCapability>,
    pub web_id: Option<String>,
}

impl AgentCapabilityEvent {
    pub const KIND: u64 = 31990;
    pub fn to_event(&self, keys: &NostrKeys, created_at: u64) -> NostrEvent;
    pub fn from_event(event: &NostrEvent) -> Result<Self, CapabilityError>;
}
```

**Relay Worker:** Accept and store kind-31990 events (they are replaceable -- one per pubkey per `d` tag value). Add REQ filter support for kind-31990 with `#k` tag filter (to query agents that handle a specific job kind).

**Forum Client:**

`pages/agents.rs` (new): Agent directory page. Lists all kind-31990 capability events stored in the relay. For each agent: name, avatar (from kind-0), capabilities list, "Hire" button (opens NIP-90 job request composer, P3).

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/types.rs` | Add AgentCapabilityEvent, AgentCapability |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Handle kind-31990 replaceable event storage |
| `community-forum-rs/crates/forum-client/src/pages/agents.rs` | NEW -- Agent directory |

### 5.6 ldp:inbox Task Delivery

**Concept:** Each agent's Solid pod has an `ldp:inbox` container at `/{pubkey}/inbox/`. Other agents or users POST Linked Data Notifications (LDN) to this inbox, delivering structured task requests. The agent monitors its inbox via Solid Notifications WebSocket (implemented in P1).

**Pod Worker Change (`pod-worker/src/lib.rs`):**

1. At pod provisioning (`provision.rs`), create the `/{pubkey}/inbox/` LDP container with appropriate WAC ACL: public POST (any authenticated NIP-98 request can POST); owner-only GET/DELETE.
2. Add POST handler for `/{pubkey}/inbox/`: validate LDN body (must be valid JSON-LD with `@type` from ActivityStreams 2.0 or schema.org), store as a resource in the inbox container, notify via `NotificationsDO`.
3. The inbox `ldp:inbox` property is declared in the WebID profile (already present in `webid.rs` -- verify it points to the correct URL after provisioning).

**LDN Task Format (example for a text-generation job):**

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", "https://schema.org/"],
  "@type": "Offer",
  "actor": { "@id": "https://pods.dreamlab-ai.com/<user-pubkey>/profile/card#me" },
  "object": {
    "@type": "Action",
    "identifier": "dreamlab:job:text-gen",
    "description": "Summarise the following document in 3 bullet points.",
    "result": { "@type": "TextObject", "text": "..." }
  },
  "instrument": {
    "@type": "PaymentMethod",
    "value": 100,
    "currency": "sats"
  }
}
```

**Relay Worker Integration:** When a new resource is created in `/{pubkey}/inbox/`, the `NotificationsDO` triggers a WebSocket message to any subscribed relay session for that pubkey. This allows the forum client (if the agent is logged in) to react to incoming tasks in real time.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/provision.rs` | Create inbox container on pod provisioning |
| `community-forum-rs/crates/pod-worker/src/lib.rs` | Add POST /{pubkey}/inbox/ handler with LDN validation |

### 5.7 NIP-90 Data Vending Machine Foundation

**Scope for P2:** Implement the core NIP-90 event kinds and relay-side routing. The full agent marketplace UI is P3.

**NIP-90 Event Kinds:**

| Kind | Name | Description |
|------|------|-------------|
| 5000-5999 | Job Request | User requests a job; kind determines job type |
| 6000-6999 | Job Result | Agent publishes result (kind = 1000 + request kind) |
| 7000 | Job Feedback | Agent publishes status updates during processing |

**`nostr-core/src/nip90.rs`** (new, wrapping `nostr::nip90`):

```rust
pub use nostr::nip90::{DataVendingMachineStatus};

pub struct JobRequest {
    pub kind: u64,              // 5000-5999
    pub input: Vec<JobInput>,
    pub output_mime: Option<String>,
    pub relays: Vec<String>,
    pub bid: Option<u64>,       // millisats
    pub encrypted: bool,        // if true, inputs are NIP-44 encrypted to agent pubkey
}

pub struct JobResult {
    pub request_event_id: String,
    pub requester_pubkey: [u8; 32],
    pub output: String,
    pub amount: Option<u64>,    // millisats charged
}

pub struct JobFeedback {
    pub request_event_id: String,
    pub status: DataVendingMachineStatus,
    pub extra_info: Option<String>,
    pub amount: Option<u64>,    // bid/partial payment
}

impl JobRequest {
    pub fn to_event(&self, keys: &NostrKeys, created_at: u64) -> Result<NostrEvent, Nip90Error>;
    pub fn from_event(event: &NostrEvent) -> Result<Self, Nip90Error>;
}
// similar for JobResult and JobFeedback
```

**Relay Worker Change:**

Accept and store kinds 5000-5999, 6000-6999, and 7000. For job request events (5000-5999), check if the `p` tag names a specific agent and route accordingly. Encrypted job requests (NIP-44 sealed) are stored without inspection.

**D1 Schema Change (Migration 014):**

```sql
-- Migration 014: Job tracking
CREATE TABLE dvm_jobs (
    request_event_id TEXT PRIMARY KEY,
    requester_pubkey TEXT NOT NULL,
    kind INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    agent_pubkey TEXT,
    result_event_id TEXT,
    bid_msats INTEGER,
    amount_charged_msats INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX idx_dvm_jobs_requester ON dvm_jobs(requester_pubkey);
CREATE INDEX idx_dvm_jobs_agent ON dvm_jobs(agent_pubkey);
CREATE INDEX idx_dvm_jobs_status ON dvm_jobs(status);
```

| File | Change |
|------|--------|
| `community-forum-rs/crates/nostr-core/src/nip90.rs` | NEW -- NIP-90 types and helpers |
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Handle NIP-90 event kinds |
| D1 migration 014 | CREATE dvm_jobs |

### P2 D1 Migration Summary

| Migration | Table | Type | Description |
|-----------|-------|------|-------------|
| 013 | `events` | ALTER | Add `delegator_pubkey` column |
| 014 | `dvm_jobs` | CREATE | NIP-90 job tracking |

---

## 6. Phase 4: P3 -- Agent Marketplace + Federation (~4 weeks)

### 6.1 Agent Marketplace UI

**`pages/agents.rs`** (extends P2 foundation):

Full marketplace view with:

- **Discovery tab:** Grid of agent cards. Each card: avatar, name (from kind-0), capabilities (from kind-31990), rating (from `dvm_jobs` completed count + rating events), price range.
- **Hire tab:** Job request composer. Select job kind (dropdown), enter inputs, set max bid (millisats), select privacy (public/encrypted). Publishes kind-5xxx event.
- **My Jobs tab:** List of user's pending and completed jobs. For each job: status (from kind-7000 feedback), result preview, "Accept & Pay" button (P3 -- Lightning integration deferred; show amount due).
- **My Agent tab:** Shown only to users who have published a kind-31990 event. Shows incoming job requests, status controls, earnings summary.

**`components/job_card.rs`** (new): Renders a single NIP-90 job with status timeline (pending, processing, done/error), result content, and rating widget (1-5 stars, published as a custom kind-1985 reaction).

**D1 Schema Change (Migration 015):**

```sql
-- Migration 015: Agent ratings
CREATE TABLE agent_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rater_pubkey TEXT NOT NULL,
    agent_pubkey TEXT NOT NULL,
    job_event_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (rater_pubkey, job_event_id)
);
CREATE INDEX idx_ratings_agent ON agent_ratings(agent_pubkey);
```

**Relay Worker Change:**

New endpoint `GET /api/agents` -- Returns list of kind-31990 events with aggregated rating from `agent_ratings`. Cached in KV with 5-minute TTL.

| File | Change |
|------|--------|
| `community-forum-rs/crates/forum-client/src/pages/agents.rs` | Full marketplace UI |
| `community-forum-rs/crates/forum-client/src/components/job_card.rs` | NEW |
| D1 migration 015 | CREATE agent_ratings |
| `community-forum-rs/crates/relay-worker/src/lib.rs` | Add GET /api/agents endpoint |

### 6.2 ACP Upgrade (from WAC)

**Decision (see ADR-031):** Upgrade pod-worker access control from WAC (Web Access Control) to ACP (Access Control Policy). ACP provides policy/matcher separation that is critical for agent identity: ACP can match agents by IRI equality using `did:nostr:<pubkey>` as the agent IRI, which is not expressible in WAC.

**Key ACP concepts:**

- `acp:AccessControlResource` -- replaces WAC `.acl` files; linked via `Link: <...acr>; rel="acl"` header.
- `acp:Policy` -- named policy with `acp:allow` and `acp:deny` (replaces `acl:Authorization`).
- `acp:Matcher` -- matches agents, clients, and/or contexts. `acp:agent` accepts any IRI including `did:nostr:...`.
- `acp:AccessControl` -- binds a policy to a resource. Supports inheritance via `acp:applyMembers`.

**`pod-worker/src/acl.rs`:** Add ACP evaluator alongside existing WAC evaluator. Feature flag `USE_ACP` (D1 setting, default `false` in P3 start, toggle to `true` after testing).

```rust
pub enum AccessControlMode {
    Wac,
    Acp,
}

/// Evaluate whether a request is permitted under ACP.
/// agent_iri can be "did:nostr:<pubkey>" or a WebID URI.
pub async fn acp_evaluate(
    env: &Env,
    resource_path: &str,
    agent_iri: &str,
    access_mode: LdpAccessMode,  // Read | Write | Append | Control
) -> Result<bool, AclError>;
```

**Provisioning:** New pods get ACP resources (`.acr` files) instead of WAC `.acl` files when `USE_ACP = true`. Existing pods retain WAC ACLs until migrated (migration tool in `admin-cli`).

**Admin CLI:** `admin-cli migrate-acl-to-acp <pubkey>` -- converts a pod's WAC `.acl` files to ACP `.acr` files. Dry-run mode available.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/acl.rs` | Add ACP evaluator |
| `community-forum-rs/crates/pod-worker/src/provision.rs` | Create .acr files when USE_ACP=true |
| `community-forum-rs/crates/admin-cli/src/` | Add migrate-acl-to-acp command |

### 6.3 ActivityPub Bridge (Foundation)

**Decision (see ADR-032):** Implement the minimal ActivityPub server profile required to federate DreamLab kind-1 notes and kind-0 profiles to the Fediverse. Full AP federation is a separate long-running project; this PRD delivers the foundation.

**Scope for P3:**

- Webfinger: `GET /.well-known/webfinger?resource=acct:{nip05}@dreamlab-ai.com` -- already advertised in discovery, now actually implemented.
- Actor document: `GET /users/{pubkey}` -- returns AP Actor JSON-LD for the user.
- Outbox: `GET /users/{pubkey}/outbox` -- returns the user's kind-1 notes as AP Note objects (paged, most recent 20).
- Inbox: `POST /users/{pubkey}/inbox` -- receives AP activities from remote servers. For P3: process `Follow` and `Like`. Reject `Create` (incoming notes from AP are not posted to Nostr relay in P3).

**`pod-worker/src/activitypub.rs`** (new):

```rust
pub struct ApActor {
    pub id: String,          // https://dreamlab-ai.com/users/{pubkey}
    pub name: String,
    pub summary: Option<String>,
    pub icon: Option<String>,
    pub inbox: String,
    pub outbox: String,
    pub followers: String,
    pub following: String,
    pub public_key: ApPublicKey,  // RSA-SHA256 key for AP HTTP signatures
}
```

**Cryptography note:** ActivityPub HTTP signatures (RFC 9421-style) use RSA-SHA256 by convention in the current Fediverse. Each DreamLab user needs an RSA keypair generated at provisioning time, stored in R2 (private key encrypted with the user's PRF-derived key, public key in the AP Actor document). This is orthogonal to their Nostr keypair.

**D1 Schema Change (Migration 016):**

```sql
-- Migration 016: ActivityPub
CREATE TABLE ap_rsa_keys (
    pubkey TEXT PRIMARY KEY,  -- Nostr pubkey (hex) -- links user to their AP identity
    ap_public_key_pem TEXT NOT NULL,
    ap_private_key_encrypted TEXT NOT NULL, -- encrypted with PRF-derived key
    created_at INTEGER NOT NULL
);

CREATE TABLE ap_followers (
    follower_actor_uri TEXT NOT NULL,
    followed_pubkey TEXT NOT NULL,  -- Nostr pubkey of the DreamLab user being followed
    accepted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_actor_uri, followed_pubkey)
);
```

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/activitypub.rs` | NEW -- AP Actor, Outbox, Inbox, Webfinger |
| `community-forum-rs/crates/pod-worker/src/provision.rs` | Generate RSA keypair on pod provisioning |
| D1 migration 016 | CREATE ap_rsa_keys, ap_followers |

### 6.4 SPARQL + Oxigraph (Cross-Pod RDF)

**Decision (see ADR-033):** Add `oxigraph = "0.5.8"` with `no-default-features` (wasm32-safe, in-memory store) to pod-worker. Scope for P3: in-memory SPARQL 1.1 SELECT queries over a merged dataset from up to 5 pod containers.

**`pod-worker/src/sparql.rs`** (new):

```rust
use oxigraph::store::Store;
use oxigraph::sparql::QueryResults;

/// Load RDF triples from a list of pod resource paths into an in-memory oxigraph store.
/// Each resource is fetched (with NIP-98 auth for private resources) and parsed as Turtle or JSON-LD.
pub async fn load_into_store(
    env: &Env,
    pod_paths: &[&str],
    auth_pubkey: &str,
) -> Result<Store, SparqlError>;

/// Execute a SPARQL 1.1 SELECT query over the loaded store.
pub fn execute_select(store: &Store, query: &str) -> Result<QueryResults, SparqlError>;
```

**Endpoint:**

`POST /sparql` -- Accepts a SPARQL query (Content-Type: `application/sparql-query`) and a JSON body listing pod resource paths to query. Returns SPARQL JSON results (Content-Type: `application/sparql-results+json`). Requires NIP-98 auth. Limited to 5 resource paths per request and 5-second timeout.

This endpoint enables cross-pod agent reasoning -- an agent can run a SPARQL query that merges data from multiple pods without needing to download and concatenate the data manually.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/Cargo.toml` | Add oxigraph |
| `community-forum-rs/crates/pod-worker/src/sparql.rs` | NEW -- SPARQL endpoint |
| `community-forum-rs/crates/pod-worker/src/lib.rs` | Add POST /sparql route |

### 6.5 did:nostr Tier-3 Relay Resolution

**Extends P2's did:nostr endpoint** with Tier-3 resolution: augment the DID document with data from the relay's stored kind-0 and kind-3 events.

**`pod-worker/src/lib.rs`:** The `GET /.well-known/did/nostr/{pubkey}.json` endpoint gains an optional `?resolve=full` query parameter. When present:

1. Fetch kind-0 from relay (internal fetch to relay-worker).
2. Fetch kind-3 (contact list) from relay.
3. Call `augment_with_relay_data()` from `nostr-core::did_nostr`.
4. Return augmented document with `service` entries for all known relays from kind-10002, and `alsoKnownAs` for the NIP-05 identifier.

**Caching:** Cache the resolved DID document in KV with a 10-minute TTL. The cache key is `did:nostr:{pubkey}:doc`.

> **Note (2026-06-15, ADR-125 convergence):** the Tier-1/Tier-3 split is superseded
> by a single canonical document form, so there is no separate `:tier3` cache
> variant — one cache entry per pubkey. The cache key is an internal KV string, not
> the DID identifier; the `did:nostr:<hex>` identifier is unchanged. The relay
> enrichment above populates the optional `service[]`/`alsoKnownAs` of that single
> document rather than producing a distinct tier.

| File | Change |
|------|--------|
| `community-forum-rs/crates/pod-worker/src/lib.rs` | Add ?resolve=full to DID endpoint |

### 6.6 Agent Reputation + Job Escrow Foundation

**Reputation:** After a job result (kind-6xxx) is accepted, either party can publish a rating (a custom kind-1985 label event with `L` tag `dreamlab/rating`, `l` tag value `1-5`). The relay stores these; `GET /api/agents` aggregates them per agent.

**Job lifecycle enforcement (relay-side):**

1. Job request (kind-5xxx) is published by user.
2. Agent publishes job feedback (kind-7000) with status `processing`.
3. Agent publishes job result (kind-6xxx).
4. User accepts result -- publishes a kind-7000 ack from their pubkey.
5. Payment (millisats) is handled out-of-band for P3 (Lightning invoice in the result event's `amount` tag). The relay records `amount_charged_msats` in `dvm_jobs` but does not enforce payment.

Full payment escrow (NIP-60 wallet or LNURL integration) is explicitly deferred post-P3.

| File | Change |
|------|--------|
| `community-forum-rs/crates/relay-worker/src/relay_do/` | Handle kind-1985 rating events; update dvm_jobs status |

### P3 D1 Migration Summary

| Migration | Table | Type | Description |
|-----------|-------|------|-------------|
| 015 | `agent_ratings` | CREATE | Agent rating storage |
| 016 | `ap_rsa_keys`, `ap_followers` | CREATE | ActivityPub RSA keys and follower tracking |

---

## 7. Migration Strategy

### Cargo.toml Additions (phased)

| Phase | Crate | Version | Workspace | Notes |
|-------|-------|---------|-----------|-------|
| P0 | `aes` | `0.8` | nostr-core | NIP-04 AES-256-CBC |
| P0 | `cbc` | `0.1` | nostr-core | NIP-04 CBC mode |
| P0 | `nostr` | `0.44.2` | workspace | NIP-19, NIP-26, NIP-65, NIP-90 upstream types |
| P1 | `json-ld` | `0.21.4` | pod-worker | JSON-LD 1.1 processor |
| P1 | `iref` | `4.0.0` | pod-worker | IRI/URI parsing |
| P1 | `rdf-types` | `0.22.5` | pod-worker | RDF data structures |
| P3 | `oxigraph` | `0.5.8` | pod-worker | In-memory SPARQL 1.1 |

**AGPL Note on `solid-pod-rs`:** The `solid-pod-rs = "0.5.0-alpha.2"` crate is AGPL-3.0 licensed. DreamLab will NOT add it as a library dependency. The algorithms it contains (did:nostr resolver, NIP-98 Schnorr verifier) are re-implemented in `nostr-core` and `pod-worker` from the open standards they implement. This avoids AGPL copyleft propagation to the worker binaries. See ADR-034.

### D1 Migrations (all additive)

| Migration | Phase | Tables | Operation |
|-----------|-------|--------|-----------|
| 010 | P0 | `whitelist` | ALTER: add `admin_granted_at`, `admin_granted_by` |
| 011 | P1 | (R2) | Provision: TypeIndex resources created per-pod on next login |
| 012 | P1 | `notification_subscriptions` | CREATE |
| 013 | P2 | `events` | ALTER: add `delegator_pubkey` |
| 014 | P2 | `dvm_jobs` | CREATE |
| 015 | P3 | `agent_ratings` | CREATE |
| 016 | P3 | `ap_rsa_keys`, `ap_followers` | CREATE |

### Rollback Plan (per migration)

Each migration ships with a corresponding `rollback_NNN.sql` file committed alongside `migration_NNN.sql`. For ALTER TABLE ADD COLUMN migrations: rollback drops the column (not supported in all D1 versions -- if unavailable, the column is left with NULL and the application code treats NULL as the default). For CREATE TABLE migrations: rollback is `DROP TABLE IF EXISTS`.

### NIP Deprecation: Kind-30913

Kind-30913 is a non-standard event kind used only by DreamLab. There are no external consumers. Existing stored kind-30913 events are retained in the relay's events table as historical records but are not surfaced in any UI after P0. The `reports` D1 table is the canonical source of record for moderation actions; it is already kind-agnostic at the DB level.

### Admin CLI Migration Commands

Run after deploying each phase to staging before production:

```bash
admin-cli migrate-admin-pubkey    # P0: copy ADMIN_PUBKEY env var to D1
admin-cli verify-nip04-vectors    # P0: run cross-client test vectors against staging
admin-cli provision-type-indexes  # P1: create TypeIndex docs for existing pods
admin-cli migrate-acl-to-acp --dry-run  # P3: preview WAC->ACP migration
admin-cli migrate-acl-to-acp       # P3: execute migration
```

---

## 8. Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|------------|--------|-----------|
| R1 | AES + CBC crates increase `nostr-core` binary size, exceeding CF Worker script size limits (1MB compressed) | Low | High | Measure binary sizes after P0 (`wrangler deploy --dry-run`). AES/CBC crates are small (<20KB). The upstream `nostr` crate (wasm32, no_std) is ~150KB. Total budget is ~900KB before compression. |
| R2 | `json-ld` crate with bundled contexts increases pod-worker binary significantly | Medium | Medium | Bundle only the 6 required contexts (estimated <30KB each). Profile binary size with `twiggy`. Use `--no-default-features` on json-ld. |
| R3 | Rewriting JSON-LD from string templates breaks existing Solid clients that work with the current (invalid) documents | Medium | High | Deploy new JSON-LD processor alongside old path behind a feature flag (`USE_JSONLD_PROCESSOR`). Test against a local Solid client (Community Solid Server) in staging before cutting over. |
| R4 | NIP-46 remote signing introduces latency: each sign operation requires a round-trip to a remote relay | Medium | Medium | Use NIP-46 only for explicit "remote signer" sessions. Default path remains in-page key. Show latency indicator in UI. Cache signed events locally for up to 30s if the signer is unreachable. |
| R5 | ActivityPub RSA keypair generation on pod provisioning adds latency to account creation | Low | Low | Generate RSA keypair asynchronously after provisioning completes. Return pod URL immediately; the AP Actor document is available within 5s. |
| R6 | oxigraph in-memory store exceeds CF Worker memory limit (128MB) when loading multiple large pod containers | Medium | High | Limit `POST /sparql` to 5 resource paths. Add per-resource size limit (500KB per resource). Timeout SPARQL queries at 5 seconds. Return 413 if aggregate input exceeds 2MB. |
| R7 | did:nostr DID document endpoint creates a privacy leak: any unauthenticated caller can discover whether a pubkey has a DreamLab account | Low | Medium | The endpoint returns 404 for pubkeys not in the D1 whitelist. This is the same information already available via NIP-11 relay information + whitelist check. Document in privacy policy. |
| R8 | NIP-26 delegation tokens allow agents to impersonate users at the relay level if a delegation is too broad | Medium | High | Relay enforces delegation conditions strictly (kind filter + time window). Log all delegated events with `delegator_pubkey` in D1. Admin audit trail shows delegated events. |
| R9 | ACP upgrade introduces a period where WAC and ACP coexist, creating ambiguous access control for pods in transition | Medium | High | Feature-flag `USE_ACP` per-pod (default WAC). Migration is opt-in via `admin-cli`. Never mix WAC and ACP for the same resource path. |
| R10 | Solid Notifications `NotificationsDO` is a new Durable Object class: Cloudflare charges per DO invocation; heavy notification load could increase costs | Low | Medium | Rate-limit notifications to 10 per resource per minute. Consolidate multiple writes to the same resource within a 1s window into a single notification. |
| R11 | `nostr = "0.44.2"` upstream crate may have API churn between minor versions | Medium | Low | Pin to exact minor version in workspace. Re-export only specific types via nostr-core wrappers -- upstream API changes do not propagate to forum-client directly. |
| R12 | kind-1059 AUTH gating may break existing forum clients that do not send NIP-42 AUTH before subscribing to DMs | Medium | High | Add transitional NOTICE message explaining AUTH requirement. Update forum client (P0) to send AUTH proactively on WebSocket connect. Document in NIP-11 `limitation` field. |

---

## 9. Dependencies

### ADR Forward References

| ADR | Decision | Required by |
|-----|----------|-------------|
| ADR-027 | Add `nostr = "0.44.2"` as workspace dependency; keep nostr-core for CF Workers, use upstream for higher NIPs | P0 (NIP-19, NIP-65) |
| ADR-028 | Add `json-ld`, `iref`, `rdf-types` to pod-worker; bundle contexts at compile time via include_bytes! | P1 (JSON-LD processor) |
| ADR-029 | NIP-46 client-side only (forum acts as client app); no bunker server for P1 | P1 (NIP-46) |
| ADR-030 | Re-implement did:nostr algorithms from W3C CG spec rather than depending on AGPL solid-pod-rs | P2 (did:nostr endpoint) |
| ADR-031 | ACP replaces WAC for pod access control; feature-flagged and per-pod; WAC reader retained during migration | P3 (ACP upgrade) |
| ADR-032 | ActivityPub bridge: foundation only in P3; RSA keypair per user; no incoming Create processing | P3 (AP bridge) |
| ADR-033 | oxigraph in-memory SPARQL with hard limits (5 resources, 2MB, 5s timeout); not persistent | P3 (SPARQL endpoint) |
| ADR-034 | solid-pod-rs AGPL analysis: do not add as dependency; re-implement required algorithms from open specs | All phases |

### Inter-Phase Dependencies

```
P0 (Critical Fixes + NIP Gaps)
  [NIP-04 Fix] ─────────────────────┐
  [Kind-1059 AUTH] ─────────────────┤
  [Multi-Admin] ────────────────────┤── All P0 independent; all must complete before P1
  [Pod URL Surfacing] ──────────────┤
  [Kind-30913->1984] ───────────────┤
  [NIP-19 TLV] ─────────────────────┤
  [NIP-24 UserMetadata] ────────────┤
  [NIP-65 Relay List] ──────────────┘
                                     │
P1 (JSON-LD + Solid + NIP Gaps)     ▼
  [JSON-LD Processor] ──── depends on: P0 (nostr crate added to workspace)
  [TypeIndex Provisioning] depends on: JSON-LD Processor (Turtle output)
  [Solid Notifications] ── independent (new DO class)
  [NIP-07 Delegation] ──── depends on: P0 NIP-04 Fix (uses nip04_encrypt)
  [NIP-46 Remote Signing] depends on: NIP-07 Delegation (extends auth store)
  [NIP-17 Read Receipts] ─ depends on: P0 NIP-04 Fix (kind-4 decrypt correctness)
                                     │
P2 (Agent Identity Stack)           ▼
  [did:nostr Endpoint] ──── depends on: P1 JSON-LD (DID doc is JSON-LD)
  [NIP-05 Verification] ─── depends on: P0 NIP-19 (nprofile links)
  [NIP-98 webid] ────────── depends on: P1 JSON-LD (WebID profile parsing)
  [NIP-26 Delegation] ────── depends on: P0 nostr crate (upstream NIP-26 types)
  [Kind-31990 Capabilities] depends on: P0 NIP-65 (agents have relay lists)
  [ldp:inbox] ───────────── depends on: P1 Solid Notifications, P1 TypeIndex
  [NIP-90 Foundation] ────── depends on: Kind-31990 Capabilities
                                     │
P3 (Marketplace + Federation)       ▼
  [Agent Marketplace UI] ─── depends on: P2 NIP-90 Foundation, Kind-31990
  [ACP Upgrade] ─────────── depends on: P1 JSON-LD (ACP docs are JSON-LD)
  [ActivityPub Bridge] ────── depends on: P1 JSON-LD, did:nostr endpoint
  [SPARQL + Oxigraph] ────── depends on: P1 JSON-LD, P1 Turtle
  [did:nostr Tier 3] ──────── depends on: P2 did:nostr endpoint
  [Reputation + Escrow] ───── depends on: P2 NIP-90 Foundation, P3 Marketplace
```

### External Dependencies

| Dependency | Type | Constraint |
|-----------|------|-----------|
| Cloudflare Workers runtime | Platform | CF Workers `wasm32-unknown-unknown` target; no `std::net`, no `std::thread` |
| Cloudflare Durable Objects | Platform | NotificationsDO is a new DO class; requires wrangler.toml update and migration |
| Cloudflare D1 | Storage | All schema changes must be additive; no transactions that exceed 1000 SQL statements |
| W3C Nostr CG draft spec | Specification | did:nostr document structure may change during P2 sprint; pin to draft-2025-11 |
| NIP-90 specification | Specification | Job kind registry (5000-5999) is community-maintained; collisions possible |
| `nostr = "0.44.2"` | Library | Pin to minor version; patch upgrades only without engineering review |
| Fediverse HTTP signatures | Specification | RFC 9421 vs draft-cavage-http-signatures-12 variance; test against Mastodon and Misskey |

### Timeline

| Milestone | Deliverables | Duration | Cumulative |
|-----------|-------------|----------|-----------|
| **M1: NIP-04 + KIND-1059 + Admin** | NIP-04 decrypt fix, kind-1059 AUTH gating, multi-admin, pod URL surfacing | 5 days | Day 5 |
| **M2: Kind-1984 + NIP-19 + NIP-24 + NIP-65** | Report kind migration, TLV encoding, UserMetadata, relay list, NIP-11 update | 5 days | Day 10 |
| **M3: JSON-LD Processor** | json-ld crate integration, bundled contexts, WebID + ACL + container retrofit, Turtle | 7 days | Day 17 |
| **M4: Solid Conformance** | TypeIndex provisioning, Notifications DO, TypeIndex client in forum | 5 days | Day 22 |
| **M5: NIP-07 + NIP-46 + NIP-17** | Extension delegation, remote signing flow, read receipts, kind-10050 | 6 days | Day 28 |
| **M6: did:nostr + NIP-05 + NIP-98 webid** | DID endpoint, three-tier resolver, NIP-05 verification, webid tag in auth | 6 days | Day 34 |
| **M7: NIP-26 + Kind-31990 + ldp:inbox + NIP-90** | Delegation tokens, agent capabilities, inbox task delivery, DVM event kinds | 7 days | Day 41 |
| **M8: Agent Marketplace UI + ACP** | Marketplace pages, job cards, rating, ACP evaluator + provisioning | 8 days | Day 49 |
| **M9: ActivityPub + SPARQL** | Webfinger, AP Actor/Outbox/Inbox, oxigraph SPARQL endpoint | 7 days | Day 56 |
| **M10: did:nostr Tier 3 + Reputation** | Relay augmentation, rating aggregation, job lifecycle enforcement | 4 days | Day 60 |
| **M11: Integration QA + Staging** | End-to-end NIP conformance, Solid conformance test suite, external client interop | 5 days | Day 65 |

### Files Modified Per Phase (complete list)

**Phase 1 (P0):**

- `community-forum-rs/Cargo.toml` -- add `nostr = "0.44.2"` workspace dep
- `community-forum-rs/crates/nostr-core/Cargo.toml` -- add `aes`, `cbc`, `nostr` deps
- `community-forum-rs/crates/nostr-core/src/nip04.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/nip19.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/types.rs` -- NIP-24 UserMetadata fields, RelayListMetadata
- `community-forum-rs/crates/nostr-core/src/moderation_events.rs` -- KIND 1984
- `community-forum-rs/crates/nostr-core/src/lib.rs` -- export nip04, nip19 modules
- `community-forum-rs/crates/relay-worker/src/relay_do/` -- NIP-04/kind-1059/NIP-90 event dispatch
- `community-forum-rs/crates/relay-worker/src/whitelist.rs` -- multi-admin D1 lookup
- `community-forum-rs/crates/relay-worker/src/auth.rs` -- admin auth uses is_admin()
- `community-forum-rs/crates/relay-worker/src/nip11.rs` -- auth_required for kind-1059
- `community-forum-rs/crates/relay-worker/src/moderation.rs` -- kind-1984 tag parsing
- `community-forum-rs/crates/auth-worker/src/pod.rs` -- publish kind-10002 and kind-10050 on registration
- `community-forum-rs/crates/admin-cli/src/` -- grant-admin, revoke-admin, migrate-admin-pubkey
- `community-forum-rs/crates/forum-client/src/stores/identity.rs` -- pod_url, web_id signals
- `community-forum-rs/crates/forum-client/src/stores/messages.rs` -- fix DM decrypt path
- `community-forum-rs/crates/forum-client/src/components/dm_composer.rs` -- fix DM encrypt
- `community-forum-rs/crates/forum-client/src/components/identity_card.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/share_modal.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/report_button.rs` -- kind-1984
- `community-forum-rs/crates/forum-client/src/components/profile_editor.rs` -- NIP-24 fields
- `community-forum-rs/crates/forum-client/src/pages/profile.rs` -- banner, display_name, npub, nprofile, pod link, relay list
- `community-forum-rs/crates/forum-client/src/pages/admin.rs` -- Administrators section
- `community-forum-rs/crates/forum-client/src/pages/settings.rs` -- Relay List section

**Phase 2 (P1):**

- `community-forum-rs/crates/pod-worker/Cargo.toml` -- add json-ld, iref, rdf-types
- `community-forum-rs/crates/pod-worker/src/jsonld.rs` -- NEW
- `community-forum-rs/crates/pod-worker/contexts/` -- 6 NEW context files
- `community-forum-rs/crates/pod-worker/src/webid.rs` -- retrofit JSON-LD
- `community-forum-rs/crates/pod-worker/src/acl.rs` -- retrofit JSON-LD
- `community-forum-rs/crates/pod-worker/src/container.rs` -- retrofit JSON-LD
- `community-forum-rs/crates/pod-worker/src/content_negotiation.rs` -- Turtle via to_turtle()
- `community-forum-rs/crates/pod-worker/src/provision.rs` -- TypeIndex creation
- `community-forum-rs/crates/pod-worker/src/notifications.rs` -- WebSocket channel protocol
- `community-forum-rs/crates/nostr-core/src/wasm_bridge.rs` -- nip07_encrypt/decrypt
- `community-forum-rs/crates/nostr-core/src/nip46.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/nip05.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/lib.rs` -- export nip46, nip05 modules
- `community-forum-rs/crates/forum-client/src/stores/auth.rs` -- NIP-46 routing, extension detect
- `community-forum-rs/crates/forum-client/src/stores/solid.rs` -- NEW (TypeIndex client)
- `community-forum-rs/crates/forum-client/src/stores/dms.rs` -- kind-10050 routing
- `community-forum-rs/crates/forum-client/src/components/user_name.rs` -- NIP-05 verification badge
- `community-forum-rs/crates/forum-client/src/components/dm_thread.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/pages/settings.rs` -- Remote Signer section

**Phase 3 (P2):**

- `community-forum-rs/crates/nostr-core/src/did_nostr.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/nip26.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/nip90.rs` -- NEW
- `community-forum-rs/crates/nostr-core/src/lib.rs` -- export did_nostr, nip26, nip90 modules
- `community-forum-rs/crates/pod-worker/src/lib.rs` -- /.well-known/did/nostr/{pubkey}.json, ldp:inbox POST
- `community-forum-rs/crates/pod-worker/src/auth.rs` -- NIP-98 webid tag resolution
- `community-forum-rs/crates/pod-worker/src/provision.rs` -- inbox container creation
- `community-forum-rs/crates/relay-worker/src/relay_do/` -- NIP-26 delegation, kind-31990, NIP-90 kinds, kind-1985 rating
- `community-forum-rs/crates/forum-client/src/pages/agents.rs` -- NEW (Agent directory, P2 foundation)
- `community-forum-rs/crates/forum-client/src/pages/settings.rs` -- Delegation Tokens section

**Phase 4 (P3):**

- `community-forum-rs/crates/pod-worker/Cargo.toml` -- add oxigraph
- `community-forum-rs/crates/pod-worker/src/acl.rs` -- ACP evaluator
- `community-forum-rs/crates/pod-worker/src/activitypub.rs` -- NEW
- `community-forum-rs/crates/pod-worker/src/sparql.rs` -- NEW
- `community-forum-rs/crates/pod-worker/src/provision.rs` -- RSA keypair + ACP provisioning
- `community-forum-rs/crates/admin-cli/src/` -- migrate-acl-to-acp
- `community-forum-rs/crates/forum-client/src/pages/agents.rs` -- Full marketplace UI
- `community-forum-rs/crates/forum-client/src/components/job_card.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/lib.rs` -- GET /api/agents endpoint

---

## Appendix A: NIP Coverage Matrix

| NIP | Name | Previous State | P0 | P1 | P2 | P3 |
|-----|------|---------------|-----|-----|-----|-----|
| NIP-01 | Basic protocol | Full | -- | -- | -- | -- |
| NIP-04 | Encrypted DMs | **Broken** (wrong cipher) | Fixed | -- | -- | -- |
| NIP-05 | Mapping to DNS | Server only | -- | Client verify | -- | -- |
| NIP-07 | Extension auth | signEvent only | -- | encrypt/decrypt | -- | -- |
| NIP-09 | Event deletion | Full | -- | -- | -- | -- |
| NIP-11 | Relay info | Partial | kind-1059 limitation | -- | -- | -- |
| NIP-16 | Event treatment | Full | -- | -- | -- | -- |
| NIP-17 | Private DMs | Infrastructure only | -- | read receipts + kind-10050 | -- | -- |
| NIP-19 | bech32 entities | nsec decode only | TLV encode/decode | -- | -- | -- |
| NIP-22 | Comments | Full (kind-1111) | -- | -- | -- | -- |
| NIP-24 | UserMetadata | NIP-01 fields only | Full fields | -- | -- | -- |
| NIP-25 | Reactions | Full | -- | -- | -- | -- |
| NIP-26 | Delegated signing | None | -- | -- | Token issue + relay verify | -- |
| NIP-29 | Relay groups | Full | -- | -- | -- | -- |
| NIP-33 | Replaceable events | Full | -- | -- | -- | -- |
| NIP-40 | Expiration | Full | -- | -- | -- | -- |
| NIP-42 | Auth | Full | -- | -- | -- | -- |
| NIP-44 | Encrypted payloads | Full | -- | -- | -- | -- |
| NIP-45 | Event counts | Full | -- | -- | -- | -- |
| NIP-46 | Remote signing | Stub | -- | Client-side | -- | -- |
| NIP-50 | Search | Full (RuVector) | -- | -- | -- | -- |
| NIP-56 | Reporting | **Wrong kind** (30913) | kind-1984 | -- | -- | -- |
| NIP-58 | Badges | Full (from PRD v7.0) | -- | -- | -- | -- |
| NIP-59 | Gift wrap | Unauth'd | AUTH gate | -- | -- | -- |
| NIP-65 | Relay lists | None | kind-10002 | -- | -- | -- |
| NIP-78 | App data | Full (from PRD v7.0) | -- | -- | -- | -- |
| NIP-89 | Handlers | None | -- | -- | kind-31990 | -- |
| NIP-90 | DVMs | None | -- | -- | Foundation | Marketplace |
| NIP-98 | HTTP auth | Full | webid tag | webid tag server verify | -- | -- |

## Appendix B: Solid Conformance Targets

| Requirement | Current | P1 Target |
|------------|---------|-----------|
| LDP CRUD | Full | Maintained |
| WAC access control | Full | Maintained (ACP added P3) |
| WebID profile | Broken JSON-LD | Valid JSON-LD via json-ld crate |
| Turtle content type | Advertised, returns error | Implemented via to_turtle() |
| TypeIndex documents | Not created | Created at provisioning |
| Solid Notifications | Advertised, stub | WebSocket channel 2023 |
| PATCH (N3/SPARQL Update) | Not implemented | Not in scope (post-P3) |
| Solid-OIDC | Not implemented | Not in scope (NIP-98 is the auth) |
| SAI (App Interop) | Not in scope | Not in scope |

## Appendix C: Agent Identity Comparison

| Capability | Centralised (Web2) | DreamLab P3 |
|-----------|--------------------|----|
| Stable identifier | Username (mutable, service-dependent) | `did:nostr:<pubkey>` (immutable, service-independent) |
| Human-readable address | email@service.com | agent@dreamlab-ai.com (NIP-05) |
| Dereferenceable profile | Service API | WebID at `pods.dreamlab-ai.com/{pubkey}/profile/card#me` |
| Task inbox | Service-specific API | `ldp:inbox` at `/{pubkey}/inbox/` (LDN) |
| Capability advertisement | Platform-specific | kind-31990 (Nostr, open) |
| Job protocol | Platform-specific | NIP-90 DVM (Nostr, open) |
| Delegation | OAuth 2.0 (centralised AS) | NIP-26 (self-sovereign, cryptographic) |
| Authentication | API key / OAuth token | NIP-98 HTTP Auth (Schnorr) + NIP-42 relay auth |
| Payment | Stripe / PayPal | Lightning invoice (in kind-6xxx result event) |
| Reputation | Platform-internal | kind-1985 ratings on Nostr (portable) |
