# Feature Parity Matrix: SvelteKit Forum -> Rust/WASM Port

[Back to Documentation Index](../README.md)

**Task:** T1.5 -- Feature Audit
**Date:** 2026-03-08
**Scope:** All user-facing capabilities in `community-forum/src/`
**WASM Crate:** `community-forum-rs/crates/nostr-core/`

---

## Legend

| Column | Description |
|--------|-------------|
| **Feature** | User-facing capability name |
| **Category** | Auth, Messaging, DMs, Search, Media, Admin, Calendar, Profile, Navigation |
| **JS Implementation** | Source file(s) under `community-forum/src/` |
| **Crypto Dep** | NIP-44, NIP-98, Schnorr, HKDF, AES-GCM, ECDH, or none |
| **WASM Avail** | Y = nostr-core WASM bridge has replacement; N = not yet |
| **Risk** | LOW = drop-in WASM swap; MEDIUM = partial coverage or refactoring needed; HIGH = no WASM equivalent, complex JS/browser API dependency |
| **Notes** | Known issues, tech debt, constraints |

---

## 1. Auth

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| A1 | Passkey registration (WebAuthn PRF + HKDF) | `lib/auth/passkey.ts` | HKDF-SHA-256 | Y | MEDIUM | HKDF derivation in WASM (`derive_keypair_from_prf`). WebAuthn ceremony itself is browser-only (`navigator.credentials.create`), cannot move to WASM. WASM replaces the HKDF + key derivation step only. |
| A2 | Passkey login (WebAuthn PRF + HKDF) | `lib/auth/passkey.ts` | HKDF-SHA-256 | Y | MEDIUM | Same as A1 -- WASM handles HKDF derivation, browser handles credential assertion. Blocks hybrid transport (QR) and Windows Hello (no PRF). |
| A3 | NIP-07 extension login | `lib/nostr/nip07.ts`, `lib/stores/auth.ts` | none (extension signs) | N | LOW | Pure browser API (`window.nostr`). No crypto in our code -- extension provides signing. No WASM needed. |
| A4 | nsec/hex key login | `lib/nostr/keys.ts`, `lib/stores/auth.ts` | Schnorr | Y | LOW | `schnorr_sign` available in WASM. Key parsing is trivial. |
| A5 | BIP-39 mnemonic generation | `lib/nostr/keys.ts` | none (BIP-39 + NIP-06 HD) | N | MEDIUM | Uses `@scure/bip39` + `@scure/bip32` for HD derivation path `m/44'/1237'/0'/0/0`. Not in nostr-core. Consider adding to Tranche 2. |
| A6 | Session persistence (v2 schema) | `lib/stores/auth.ts` | none | N | LOW | localStorage/sessionStorage/cookie management. Pure JS state, no crypto, no WASM needed. |
| A7 | Logout + key zeroing | `lib/stores/auth.ts` | none | N | LOW | Zeroes `_privkeyMem` closure on `pagehide`. JS-side memory management. Rust `SecretKey` has `Zeroize` derive but only applies in WASM memory. |
| A8 | NIP-98 token creation | `lib/auth/nip98-client.ts` | NIP-98 + Schnorr | Y | LOW | Direct WASM replacement via `create_nip98_token`. Drop-in swap. |
| A9 | NIP-98 fetch wrapper (`fetchWithNip98`) | `lib/auth/nip98-client.ts` | NIP-98 + Schnorr | Y | LOW | Token creation via WASM, fetch call stays in JS. |
| A10 | NIP-07 NIP-44 support detection | `lib/nostr/nip07.ts` | none | N | LOW | Feature detection only (`hasNip44Support()`). No WASM needed. |

---

## 2. Messaging (NIP-28 Public Chat)

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| M1 | Channel creation (kind 40) | `lib/nostr/channels.ts`, `lib/nostr/events.ts` | Schnorr | Partial | MEDIUM | Event signing available via WASM (`schnorr_sign`, `compute_event_id`). Channel-specific event construction (kind 40 with metadata JSON) not in WASM bridge. |
| M2 | Channel metadata update (kind 41) | `lib/nostr/channels.ts` | Schnorr | Partial | MEDIUM | Same as M1 -- signing in WASM, event structure assembly in JS. |
| M3 | Channel message send (kind 42) | `lib/nostr/channels.ts`, `lib/nostr/events.ts` | Schnorr | Partial | MEDIUM | High-frequency operation. Event ID + signing in WASM. Message construction (tags, content, reply markers) stays in JS or needs new WASM helper. |
| M4 | Message replies (e-tag with reply marker) | `lib/nostr/channels.ts` | Schnorr | Partial | LOW | Tag construction is pure data. Signing via WASM. |
| M5 | Message hide (kind 43) | `lib/nostr/channels.ts` | Schnorr | Partial | LOW | Admin action. Same signing pattern. |
| M6 | User mute in channel (kind 44) | `lib/nostr/channels.ts` | Schnorr | Partial | LOW | Admin action. Same signing pattern. |
| M7 | Real-time message subscription | `lib/nostr/channels.ts`, `lib/nostr/relay.ts` | none | N | HIGH | NDK subscription management, Dexie cache adapter, WebSocket lifecycle. Deeply tied to NDK library. Cannot move to WASM. |
| M8 | Channel message caching | `lib/nostr/channels.ts` | none | N | LOW | Module-level Map caches. Pure JS state management. |
| M9 | Cohort-based channel filtering | `lib/nostr/channels.ts` | none | N | MEDIUM | UX-layer filtering by cohort zones. Known tech debt: hardcoded section IDs, `moomaa-tribe` union type. |
| M10 | Encrypted channel messages (NIP-44) | `lib/nostr/encryption.ts` | NIP-44 + ECDH | Y | MEDIUM | `nip44_encrypt`/`nip44_decrypt` available in WASM. Per-recipient key distribution logic stays in JS. Kind 9 event construction needs JS orchestration. |

---

## 3. Direct Messages (NIP-17 / NIP-59 Gift Wrap)

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| D1 | Send gift-wrapped DM | `lib/nostr/dm.ts` | NIP-44 + Schnorr + ECDH | Partial | HIGH | 3-layer construction: rumor (kind 14) -> seal (kind 13, NIP-44 encrypted) -> gift wrap (kind 1059, random keypair, fuzzed timestamp). NIP-44 encrypt in WASM, but random keypair generation + timestamp fuzzing + multi-layer event assembly not in WASM bridge. |
| D2 | Receive/decrypt gift-wrapped DM | `lib/nostr/dm.ts` | NIP-44 + Schnorr | Partial | HIGH | Reverse of D1: unwrap gift -> unseal (NIP-44 decrypt) -> extract rumor. NIP-44 decrypt in WASM, but multi-step unwrap logic not in bridge. |
| D3 | DM conversation management | `lib/stores/dm.ts` | NIP-44 | Partial | MEDIUM | Store with conversation grouping, message ordering, read status. Decryption via WASM, state management in JS. |
| D4 | DM real-time subscription | `lib/stores/dm.ts`, `lib/nostr/relay.ts` | none | N | HIGH | NDK subscription for kind 1059 events. WebSocket + NDK dependency. |
| D5 | DM localStorage persistence | `lib/stores/dm.ts` | none | N | LOW | 2MB quota guard, muted user filtering. Pure JS. |

---

## 4. Search

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| S1 | Server-side RuVector search | `lib/semantic/ruvector-search.ts` | NIP-98 (for /embed) | Partial | MEDIUM | NIP-98 auth for embedding ingestion via WASM. Search query itself is HTTP to CF Worker. RuVector WASM runs server-side, not client. |
| S2 | ONNX WASM embedding generation | `lib/semantic/ruvector-search.ts` | none | N | HIGH | ONNX Runtime WASM for client-side embeddings. Separate WASM module, not part of nostr-core. |
| S3 | Offline fallback search (IndexedDB) | `lib/semantic/ruvector-search.ts` | none | N | MEDIUM | IndexedDB cached embeddings + cosine similarity. Pure JS math + browser storage. |
| S4 | Embedding sync pipeline | `lib/semantic/ruvector-search.ts` | NIP-98 | Partial | MEDIUM | NIP-98 authenticated POST to /embed endpoint. Auth token via WASM, pipeline logic in JS. |

---

## 5. Media

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| MD1 | Image compression (canvas) | `lib/utils/imageUpload.ts` | none | N | LOW | Browser Canvas API for resize/compress. Cannot move to WASM (needs DOM). |
| MD2 | Image upload to Solid pods | `lib/utils/imageUpload.ts` | NIP-98 | Y | LOW | NIP-98 authenticated PUT to pod-api. Auth token via WASM. |
| MD3 | Encrypted image upload (AES-GCM) | `lib/utils/imageUpload.ts` | AES-GCM + NIP-44 | Partial | HIGH | Client-side AES-GCM encryption via Web Crypto API, per-recipient key distribution via NIP-44. AES-GCM not in nostr-core. NIP-44 key exchange available. |
| MD4 | Thumbnail generation | `lib/utils/imageUpload.ts` | none | N | LOW | Canvas-based. Browser-only. |
| MD5 | Avatar upload | `lib/utils/imageUpload.ts` | NIP-98 | Y | LOW | Subset of MD2 with category=avatar. |

---

## 6. Admin

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| AD1 | Whitelist verification | `lib/nostr/whitelist.ts` | NIP-98 | Y | LOW | HTTP check via relay API + NIP-98 auth. Token via WASM. 5-min cache with client-side fallback. |
| AD2 | User approval (whitelist add) | `lib/nostr/whitelist.ts` | NIP-98 | Y | LOW | NIP-98 authenticated POST. Token via WASM. |
| AD3 | Cohort management (update cohorts) | `lib/nostr/whitelist.ts` | NIP-98 | Y | LOW | NIP-98 authenticated POST. Token via WASM. |
| AD4 | Join request management (kind 9021) | `lib/nostr/groups.ts`, `lib/stores/admin.ts` | Schnorr | Partial | MEDIUM | Event signing via WASM. NIP-29 group event construction in JS. |
| AD5 | Registration request (kind 9024) | `lib/nostr/groups.ts` | Schnorr | Partial | MEDIUM | Same as AD4. |
| AD6 | Approve/reject join requests | `lib/nostr/groups.ts` | Schnorr | Partial | MEDIUM | Admin signs approval events. |
| AD7 | User kick (kind 9001) | `lib/nostr/groups.ts` | Schnorr | Partial | LOW | Moderation event. Signing via WASM. |
| AD8 | User ban | `lib/nostr/groups.ts` | Schnorr | Partial | LOW | Moderation event. Signing via WASM. |
| AD9 | Delete message (kind 9005) | `lib/nostr/groups.ts` | Schnorr | Partial | LOW | Moderation event. Signing via WASM. |
| AD10 | Section access request (kind 9022) | `lib/nostr/sections.ts` | Schnorr | Partial | MEDIUM | Custom event kind. Signing via WASM. |
| AD11 | Section access approval (kind 9023) | `lib/nostr/sections.ts` | Schnorr + NIP-44 | Partial | MEDIUM | Approval sends NIP-59 gift-wrapped DM notification. Complex multi-step: sign approval + gift wrap DM. |
| AD12 | Section stats (kind 30079) | `lib/nostr/sections.ts` | Schnorr | Partial | LOW | Replaceable event. Signing via WASM. |
| AD13 | Pending requests store | `lib/stores/admin.ts` | none | N | LOW | Svelte derived stores. Pure JS state. |
| AD14 | Channel management (admin store) | `lib/stores/admin.ts` | none | N | LOW | Kind 40/41 aggregation. Pure JS state. |

---

## 7. Calendar (NIP-52)

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| C1 | Calendar event creation (kind 31923) | `lib/nostr/calendar.ts` | Schnorr | Partial | MEDIUM | Addressable replaceable event with d-tag, date tags, location, linked chatroom. Signing via WASM, event construction in JS. |
| C2 | Calendar event fetch | `lib/nostr/calendar.ts` | none | N | LOW | NDK subscription filter. Pure JS. |
| C3 | RSVP (kind 31925) | `lib/nostr/calendar.ts` | Schnorr | Partial | MEDIUM | Addressable replaceable event. Signing via WASM. |
| C4 | Event deletion (kind 5) | `lib/nostr/calendar.ts` | Schnorr | Partial | LOW | Standard deletion event. Signing via WASM. |
| C5 | Upcoming events filter | `lib/nostr/calendar.ts` | none | N | LOW | Client-side date filtering. Pure JS. |

---

## 8. Profile / Identity

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| P1 | Profile metadata (kind 0) | `lib/nostr/events.ts` | Schnorr | Partial | LOW | Standard metadata event. Signing via WASM. |
| P2 | Profile sync/indexing confirmation | `lib/nostr/profile-sync.ts` | NIP-98 | Y | LOW | HTTP polling with NIP-98 auth. Exponential backoff. Token via WASM. |
| P3 | DID:NOSTR generation | `lib/nostr/did.ts` | none | N | LOW | Pure string formatting: `did:nostr:<hex-pubkey>`. No crypto. |
| P4 | DID Document generation (W3C) | `lib/nostr/did.ts` | none | N | LOW | JSON-LD construction with multikey encoding. Secp256k1 multicodec prefix (0xe701). No signing needed. |
| P5 | NIP-19 encode/decode | `lib/nostr/events.ts`, `lib/nostr/did.ts` | none | N | LOW | Bech32 encoding (npub, nsec, note, nevent, nprofile). Uses `nostr-tools/nip19`. Not in nostr-core. Consider adding. |
| P6 | Public key hex derivation | `lib/nostr/keys.ts` | Schnorr | Y | LOW | `pubkey_hex()` in nostr-core. Direct replacement. |

---

## 9. Navigation / UX Infrastructure

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| N1 | Zone/category navigation | Svelte routes (`src/routes/`) | none | N | LOW | SvelteKit routing. Maps to Leptos/Dioxus router in Rust. No crypto. |
| N2 | Section switching | Svelte routes, `lib/nostr/sections.ts` | none | N | LOW | Route params + section state. |
| N3 | Channel discovery/listing | `lib/nostr/channels.ts` | none | N | LOW | NDK subscription for kind 40 events. |
| N4 | Cohort-based access filtering | `lib/nostr/channels.ts`, `lib/nostr/whitelist.ts` | NIP-98 | Partial | MEDIUM | UX filtering + server whitelist check. NIP-98 via WASM. Known tech debt: hardcoded cohort IDs, `moomaa-tribe` union. |
| N5 | Relay connection management | `lib/nostr/relay.ts` | Schnorr (NIP-42 AUTH) | Partial | HIGH | Singleton RelayManager, NDK with Dexie cache, NIP-42 AUTH (kind 22242). Deeply coupled to NDK. Signing for AUTH events via WASM, but relay lifecycle is JS. |
| N6 | Event signature verification | `lib/nostr/events.ts` | Schnorr | Y | LOW | `verify_event` / Schnorr verify available in nostr-core. Can offload all verification to WASM. |

---

## 10. Reactions (NIP-25)

| # | Feature | JS Implementation | Crypto Dep | WASM Avail | Risk | Notes |
|---|---------|-------------------|------------|------------|------|-------|
| R1 | Create reaction (kind 7) | `lib/nostr/reactions.ts`, `lib/nostr/events.ts` | Schnorr | Partial | LOW | Event signing via WASM. Reaction event construction (e/p tags, content=emoji) in JS. |
| R2 | Parse/group reactions | `lib/nostr/reactions.ts` | none | N | LOW | Pure data transformation. No crypto. |
| R3 | Reaction normalization (emoji map) | `lib/nostr/reactions.ts` | none | N | LOW | LIKE/DISLIKE/emoji mapping. Pure JS. |

---

## Summary

### Feature Count by Category

| Category | Total | WASM Y | WASM Partial | WASM N | Crypto Features |
|----------|-------|--------|--------------|--------|-----------------|
| Auth | 10 | 3 | 0 | 7 | 5 (HKDF x2, NIP-98 x2, Schnorr x1) |
| Messaging | 10 | 1 | 7 | 2 | 8 (Schnorr x7, NIP-44 x1) |
| DMs | 5 | 0 | 3 | 2 | 3 (NIP-44 x2, Schnorr x1) |
| Search | 4 | 0 | 2 | 2 | 1 (NIP-98 x1) |
| Media | 5 | 2 | 1 | 2 | 2 (NIP-98 x1, AES-GCM x1) |
| Admin | 14 | 3 | 9 | 2 | 11 (Schnorr x8, NIP-98 x3) |
| Calendar | 5 | 0 | 3 | 2 | 3 (Schnorr x3) |
| Profile | 6 | 2 | 1 | 3 | 2 (Schnorr x1, NIP-98 x1) |
| Navigation | 6 | 1 | 2 | 3 | 2 (Schnorr x1, NIP-98 x1) |
| Reactions | 3 | 0 | 1 | 2 | 1 (Schnorr x1) |
| **TOTAL** | **68** | **12** | **29** | **27** | **38** |

### Migration Risk Distribution

| Risk | Count | Percentage | Examples |
|------|-------|------------|----------|
| LOW | 38 | 55.9% | NIP-98 token creation, session management, DID generation, reactions parsing |
| MEDIUM | 21 | 30.9% | Passkey registration (browser+WASM split), channel creation, NIP-29 groups, calendar events |
| HIGH | 9 | 13.2% | Gift-wrapped DMs, real-time subscriptions, ONNX embeddings, relay management, encrypted media |

### HIGH Risk Features (Require Significant New WASM or Remain JS)

| Feature | Why HIGH |
|---------|----------|
| D1: Send gift-wrapped DM | 3-layer NIP-17/59 construction (rumor->seal->gift wrap) with random keypair + timestamp fuzzing. Partial NIP-44 in WASM but orchestration gap is large. |
| D2: Receive/decrypt gift-wrapped DM | Reverse multi-layer unwrap. NIP-44 decrypt available but full flow not bridged. |
| D4: DM real-time subscription | NDK WebSocket lifecycle. Cannot move to WASM. |
| M7: Real-time message subscription | NDK subscription + Dexie cache. WebSocket dependency. |
| S2: ONNX WASM embeddings | Separate ONNX Runtime WASM module. Not related to nostr-core. |
| MD3: Encrypted image upload | AES-GCM via Web Crypto API + NIP-44 key distribution. AES-GCM not in nostr-core. |
| N5: Relay connection management | NDK singleton, NIP-42 AUTH, Dexie cache. Core transport layer. |

---

## Tranche 1 WASM-Accelerated Features

These features have direct WASM replacements in `nostr-core` today and can be swapped in Tranche 1:

| WASM Bridge Function | Replaces | Features Affected |
|----------------------|----------|-------------------|
| `derive_keypair_from_prf` | HKDF-SHA-256 in `passkey.ts` | A1, A2 |
| `create_nip98_token` | NIP-98 creation in `nip98-client.ts` | A8, A9, S1, S4, MD2, MD5, AD1, AD2, AD3, P2, N4 |
| `verify_nip98_token` | NIP-98 verification (server-side) | Server-side only (workers) |
| `nip44_encrypt` | NIP-44 encryption in `encryption.ts`, `dm.ts` | M10, D1, D3, AD11 |
| `nip44_decrypt` | NIP-44 decryption in `encryption.ts`, `dm.ts` | M10, D2, D3 |
| `compute_event_id` | SHA-256 event ID in `events.ts` | All event-creating features (M1-M6, M10, D1, AD4-AD12, C1, C3, C4, P1, R1) |
| `schnorr_sign` | BIP-340 signing in `events.ts`, `keys.ts` | All event-signing features (28 features) |
| Schnorr verify (in crate, not yet in bridge) | Signature verification in `events.ts` | N6 and all event verification paths |

### Tranche 1 Impact Summary

- **12 features** get full WASM replacement (drop-in swap)
- **29 features** get partial WASM acceleration (crypto hot path in WASM, orchestration in JS)
- **27 features** remain pure JS (no crypto, or browser-API-dependent)
- **~41 features (60.3%)** benefit from Tranche 1 WASM in some way

### Features Deferred to Later Tranches

| Feature Area | Tranche | Reason |
|--------------|---------|--------|
| NIP-17/59 gift wrap construction | T2 | Need full rumor->seal->wrap pipeline in WASM with random keypair gen |
| NIP-19 bech32 encode/decode | T2 | Pure encoding, low priority but useful for full Rust event model |
| BIP-39/NIP-06 mnemonic derivation | T2 | HD key derivation needs `bip32`/`bip39` crates |
| AES-GCM media encryption | T2-T3 | Separate crypto primitive, Web Crypto API interop |
| NIP-29 group event builders | T2 | Event construction helpers for kinds 9/9000-9005/9021-9024/39000/39002 |
| NIP-52 calendar event builders | T2 | Addressable replaceable event construction |
| ONNX embedding pipeline | T3+ | Separate WASM module, independent of nostr-core |
| NDK relay replacement (Rust WS) | T3+ | Fundamental transport rewrite; evaluate `nostr-rs-relay` or custom |
| Schnorr verify in WASM bridge | T1.x | Already implemented in crate (`event.rs`), just needs `#[wasm_bindgen]` export |

---

## Known Tech Debt Affecting Migration

| Issue | Location | Impact |
|-------|----------|--------|
| Hardcoded section/cohort IDs | `channels.ts`, `sections.ts` | Migration must parameterize these; currently `moomaa-tribe` union type |
| 3 NDK singleton patterns | `relay.ts` (primary), legacy refs | Must converge to single relay manager before Rust port |
| `$userStore.profile?.cohorts` usage | Multiple components | Fragile access pattern; needs typed cohort model |
| `as ChannelSection` casts | UI components | Type-unsafe; Rust port should use proper enums |
| `public-lobby` defaults | Channel routing | Hardcoded fallback channel; needs configuration |
| NIP-04 removed but NIP-07 checked | `nip07.ts` | NIP-04 methods explicitly removed (2025-12-01); code checks for NIP-44 support |
| Session schema v2 migration | `auth.ts` | Must preserve migration path or clean-break in Rust port |
| Module-level caches (non-reactive) | `channels.ts` | Map-based caches outside Svelte stores; need equivalent in Leptos/Dioxus |
