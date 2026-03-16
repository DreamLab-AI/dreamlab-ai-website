# Route Parity Matrix -- DreamLab Rust Port (T1.4)

> **HISTORICAL** — Parity sprint COMPLETE (2026-03-12). All routes have been migrated to Rust/Leptos. The SvelteKit `community-forum/` directory has been deleted. This document tracked the SvelteKit→Leptos route migration and is retained for historical reference only.

[Back to Documentation Index](../README.md)

Generated: 2026-03-08

## Overview

This matrix catalogs every SvelteKit route in the community forum, documenting the
crypto operations, Nostr event kinds, access zones, implementation quality, and
WASM migration priority for each route. It serves as the authoritative reference
for the Rust port's route-by-route parity tracking.

Source directory: `community-forum/src/routes/` (historical — now deleted, migrated to `community-forum-rs/crates/forum-client/src/pages/`)

---

## Route Matrix

| # | Route Path | Files | Crypto Operations | Nostr Event Kinds | Access Zone | JS Quality | WASM Priority |
|---|-----------|-------|-------------------|-------------------|-------------|------------|---------------|
| 1 | `/` (root) | `+page.svelte` | Key restore (mnemonic, nsec/hex via `restoreFromMnemonic`, `restoreFromNsecOrHex`); `authStore.setKeys` | None consumed directly | public | solid | LOW |
| 2 | `/login` | `login/+page.svelte` | WebAuthn PRF + HKDF key derivation (passkey path), NIP-07 extension signing, local key nsec decode. All via `AuthFlow` component which calls `authStore.loginWithPasskey`, `authStore.loginWithLocalKey`, `authStore.loginWithExtension` | None directly; auth-api Worker receives kind 27235 (NIP-98) | public | solid | HIGH |
| 3 | `/signup` | `signup/+page.svelte` | WebAuthn PRF registration + HKDF (`registerPasskey`), secp256k1 key generation (`generateSimpleKeys`), Schnorr signing for registration event | kind 9024 (user registration) published via auth flow | public | solid | HIGH |
| 4 | `/setup` | `setup/+page.svelte`, `+page.ts` | None (YAML config upload/parse) | None | public (first-run) | solid | N/A |
| 5 | `/pending` | `pending/+page.svelte` | None (polls whitelist status) | Reads whitelist status (kind 10000 app-specific) | freshman | solid | N/A |
| 6 | `/forums` | `forums/+page.svelte` | None (reads permissions store) | None directly; relies on `userPermissionsStore` from whitelist | cohort | solid | N/A |
| 7 | `/chat` | `chat/+page.svelte`, `+page.ts`, `chat/+layout.svelte` | Schnorr signing for NIP-42 AUTH on relay connect; NIP-98 tokens for API calls | kind 40 (channel creation/metadata) consumed via `fetchChannels`; subscription filters on kind 40 | cohort | solid | MEDIUM |
| 8 | `/chat/[channelId]` | `chat/[channelId]/+page.svelte`, `+page.ts` | Schnorr signing for relay AUTH; NIP-44 decrypt for encrypted channels (kind 9); Schnorr signing for message publish | kind 40 (channel metadata) consumed; kind 42 (channel messages) consumed + published; kind 9 (encrypted group messages, NIP-44) consumed; kind 7 (reactions, NIP-25) consumed | cohort | solid | HIGH |
| 9 | `/dm` | `dm/+page.svelte`, `+page.ts` | NIP-44 v2 decrypt for DM listing (`receiveDM` via `dmStore.fetchConversations`); `hexToBytes` on privateKey | kind 1059 (gift wrap, NIP-59) consumed; kind 13 (seal) decrypted; kind 14 (sealed rumor, NIP-17) decrypted | cohort | solid | HIGH |
| 10 | `/dm/[pubkey]` | `dm/[pubkey]/+page.svelte`, `+page.ts` | NIP-44 v2 encrypt/decrypt for sending/receiving DMs (`sendDM`, `receiveDM`); ECDH shared secret via `nip44.v2.utils.getConversationKey`; ephemeral key generation (`generateSecretKey`); Schnorr signing for gift wrap events | kind 1059 (gift wrap) published + consumed; kind 13 (seal) created; kind 14 (sealed rumor) created; kind 7 (reactions) | cohort | solid | HIGH |
| 11 | `/admin` | `admin/+page.svelte`, `+page.ts` | NIP-98 tokens for whitelist API calls (`approveUserRegistration`); Schnorr signing for admin events (kind 9000, 5); relay AUTH | kind 40 (channels) consumed; kind 42 + kind 1 (messages) consumed for stats; kind 9021 (join requests) consumed + subscribed; kind 9024 (user registration) consumed + subscribed; kind 9000 (add user) published; kind 5 (deletion, NIP-09) published; kind 9005 (group delete) | admin | solid | MEDIUM |
| 12 | `/admin/calendar` | `admin/calendar/+page.svelte` | Relay AUTH via `ensureRelayConnected` | kind 31923 (calendar events, NIP-52) consumed; kind 40 (channels) consumed | admin | solid | LOW |
| 13 | `/admin/stats` | `admin/stats/+page.svelte` | Whitelist verification via relay (`verifyWhitelistStatus`) | Channel stats (kind 42 messages aggregated); whitelist query (kind 10000 app-specific) | admin | solid | N/A |
| 14 | `/events` | `events/+page.svelte`, `events/+layout.svelte` | Relay AUTH | kind 31923 (NIP-52 calendar events) consumed; kind 40 (channels) consumed; custom birthday events | cohort | solid | LOW |
| 15 | `/view/[noteId]` | `view/[noteId]/+page.svelte`, `+page.ts` | NIP-19 decode (`nip19.decode` for note1/nevent1 bech32); lightweight NDK read-only connect | Any event kind (fetched by ID); kind 0 (profile metadata) consumed | public | solid | LOW |
| 16 | `/settings/muted` | `settings/muted/+page.svelte` | NIP-19 encode (`nip19.npubEncode`) for display | None directly (reads local mute store) | cohort | solid | N/A |
| 17 | `/[category]` | `[category]/+page.svelte` | None (reads permissions store for zone access) | None directly | cohort | solid | N/A |
| 18 | `/[category]/[section]` | `[category]/[section]/+page.svelte` | Relay AUTH; Schnorr signing for channel creation (`createChannel`) | kind 40 (channels) consumed via `fetchEvents`; kind 40 published (new forum creation) | cohort | solid | MEDIUM |
| 19 | `/[category]/[section]/calendar` | `[category]/[section]/calendar/+page.svelte` | Relay AUTH | kind 31923 (NIP-52 section calendar events) consumed; custom birthday events | cohort | solid | LOW |
| 20 | `/[category]/[section]/[forumId]` | `[category]/[section]/[forumId]/+page.svelte` | None (redirects to `/chat/[forumId]` after access check) | None (redirect only) | cohort | solid | N/A |
| 21 | `/[section]/calendar` | `[section]/calendar/+page.svelte` | Relay AUTH; Schnorr signing for event creation | kind 31923 (NIP-52 section calendar events) consumed + published; custom birthday events | cohort | solid | LOW |
| 22 | `/api/proxy` (server) | `api/proxy/+server.ts` | None (server-side link preview proxy with SSRF protection) | None | public (server endpoint) | solid | N/A |

---

## Layout Files

| File | Role | Crypto Operations | Notes |
|------|------|-------------------|-------|
| `+layout.svelte` (root) | App shell, relay connection, auth guard, navigation, session management | Relay connect with privkey signer (`connectRelay`) or NIP-07 signer (`connectRelayWithNip07`); session monitoring | Controls relay lifecycle for entire app. Reactive connection based on `$authStore.isAuthenticated` and `$authStore.privateKey`. |
| `+layout.ts` (root) | SPA config | None | Sets `prerender = true`, `ssr = false` (client-side SPA) |
| `chat/+layout.svelte` | Chat layout wrapper | None | Thin layout; zones provided by root layout |
| `events/+layout.svelte` | Events layout with calendar sidebar | None | Desktop/mobile calendar sidebar toggle |

---

## Crypto Operations Summary

### WebAuthn PRF + HKDF (Key Derivation)
- **Files**: `src/lib/auth/passkey.ts`
- **Flow**: WebAuthn PRF output (32 bytes) -> HKDF-SHA-256 (salt=[], info="nostr-secp256k1-v1") -> 32-byte secp256k1 privkey
- **Used by**: `/login`, `/signup`
- **WASM priority**: HIGH -- hot path for every authentication

### NIP-44 v2 Encryption (ECDH + ChaCha20-Poly1305)
- **Files**: `src/lib/nostr/dm.ts`, `src/lib/nostr/encryption.ts`
- **Operations**: `nip44.v2.utils.getConversationKey` (ECDH), `nip44.v2.encrypt`, `nip44.v2.decrypt`
- **Used by**: `/dm`, `/dm/[pubkey]`, `/chat/[channelId]` (encrypted channels)
- **WASM priority**: HIGH -- hot path for every DM send/receive and encrypted channel message

### NIP-98 HTTP Auth (Schnorr Signing)
- **Files**: `src/lib/auth/nip98-client.ts`, `packages/nip98/sign.js`
- **Operations**: Build kind 27235 event, SHA-256 payload hash, Schnorr sign, base64 encode
- **Used by**: `/login` (verify endpoint), `/admin` (whitelist API calls), all `fetchWithNip98` calls
- **WASM priority**: HIGH -- every authenticated API call

### Schnorr Signing (Event Publishing)
- **Files**: `nostr-tools` `finalizeEvent`, NDK signer
- **Operations**: secp256k1 Schnorr sign for all published Nostr events
- **Used by**: Every route that publishes events (chat messages, DMs, admin actions, calendar events, reactions, channel creation)
- **WASM priority**: HIGH -- every event publish

### NIP-19 Encoding/Decoding
- **Files**: `nostr-tools` `nip19`
- **Operations**: `npubEncode`, `decode` (note1, nevent1)
- **Used by**: `/view/[noteId]`, `/settings/muted`
- **WASM priority**: LOW -- infrequent display-only operations

### SHA-256 Hashing
- **Files**: `@noble/hashes/sha256`
- **Operations**: PRF salt derivation, NIP-98 payload hash, NIP-01 event ID computation
- **Used by**: Passkey auth, NIP-98, all event creation
- **WASM priority**: HIGH -- used in every crypto path

---

## Nostr Event Kinds Reference

| Kind | NIP | Name | Routes Using | Direction |
|------|-----|------|-------------|-----------|
| 0 | NIP-01 | Profile Metadata | `/view/[noteId]` | consume |
| 1 | NIP-01 | Short Text Note | `/admin` (stats) | consume |
| 5 | NIP-09 | Deletion | `/admin` | publish + consume |
| 7 | NIP-25 | Reaction | `/chat/[channelId]`, `/dm/[pubkey]` | publish + consume |
| 9 | NIP-29 | Group Chat Message (encrypted) | `/chat/[channelId]` | publish + consume |
| 13 | NIP-59 | Seal | `/dm`, `/dm/[pubkey]` | create (intermediate) |
| 14 | NIP-17 | Sealed Rumor (DM) | `/dm`, `/dm/[pubkey]` | create (intermediate) |
| 40 | NIP-28 | Channel Creation | `/chat`, `/chat/[channelId]`, `/admin`, `/[cat]/[sec]` | publish + consume |
| 42 | NIP-28 | Channel Message | `/chat/[channelId]`, `/admin` | publish + consume |
| 1059 | NIP-59 | Gift Wrap | `/dm`, `/dm/[pubkey]` | publish + consume |
| 9000 | NIP-29 | Add User to Group | `/admin` | publish + consume |
| 9001 | NIP-29 | Remove User from Group | `/admin` | publish |
| 9005 | NIP-29 | Delete Event from Group | `/admin` | publish |
| 9021 | custom | Join Request | `/admin` | consume + subscribe |
| 9024 | custom | User Registration | `/signup`, `/admin` | publish + consume |
| 27235 | NIP-98 | HTTP Auth | `/login`, `/admin`, all `fetchWithNip98` | publish (to auth-api) |
| 31923 | NIP-52 | Calendar Event | `/events`, `/admin/calendar`, `*/calendar` routes | publish + consume |
| 31925 | NIP-52 | RSVP | calendar routes | publish + consume |

---

## Access Zone Summary

| Zone | Description | Routes |
|------|-------------|--------|
| **public** | No auth required | `/`, `/login`, `/signup`, `/setup`, `/view/[noteId]`, `/api/proxy` |
| **freshman** | Authenticated but not yet approved | `/pending` |
| **cohort** | Authenticated + whitelisted (zone-filtered) | `/forums`, `/chat`, `/chat/[channelId]`, `/dm`, `/dm/[pubkey]`, `/events`, `/settings/muted`, `/[category]`, `/[category]/[section]`, `/[category]/[section]/calendar`, `/[category]/[section]/[forumId]`, `/[section]/calendar` |
| **admin** | Authenticated + `isAdmin` verified via relay whitelist | `/admin`, `/admin/calendar`, `/admin/stats` |

---

## WASM Migration Priority Summary

| Priority | Count | Routes |
|----------|-------|--------|
| **HIGH** | 6 | `/login`, `/signup`, `/chat/[channelId]`, `/dm`, `/dm/[pubkey]`, `/[category]/[section]` |
| **MEDIUM** | 2 | `/chat`, `/admin` |
| **LOW** | 5 | `/`, `/admin/calendar`, `/events`, `/view/[noteId]`, `/[category]/[section]/calendar`, `/[section]/calendar` |
| **N/A** | 9 | `/setup`, `/pending`, `/forums`, `/admin/stats`, `/settings/muted`, `/[category]`, `/[category]/[section]/[forumId]`, `/api/proxy` |

**Total routes**: 22 (including 1 server endpoint)

---

## Critical Route Notes (PRD Reference)

The following 14 routes are identified as critical for the Rust port based on
the PRD's feature requirements:

1. **`/login`** -- Passkey PRF + HKDF is the core auth primitive. Must port WebAuthn PRF handling, HKDF derivation, and NIP-98 token creation to Rust/WASM.

2. **`/signup`** -- Same crypto as login plus secp256k1 key generation and user registration event (kind 9024). The `registerPasskey` flow must be fully ported.

3. **`/chat/[channelId]`** -- Highest-traffic route. Needs NIP-28 message subscribe/publish, NIP-44 decrypt for encrypted channels, NIP-25 reactions, real-time WebSocket subscription management. Schnorr signing on every message send.

4. **`/dm`** -- NIP-17/59 gift-wrap DM listing. Requires NIP-44 v2 decrypt for each conversation's latest message. The `receiveDM` function is CPU-intensive (3 layers of decryption per message).

5. **`/dm/[pubkey]`** -- Full DM conversation. NIP-44 encrypt on send, decrypt on receive, ephemeral key generation for gift wrapping. The `sendDM` function involves 2 ECDH key agreements, 2 NIP-44 encryptions, 2 Schnorr signatures.

6. **`/admin`** -- Admin dashboard with NIP-98 authenticated API calls, event publishing for user management (kind 9000, 5), real-time subscription to registrations and join requests.

7. **`/chat`** -- Channel listing with relay connection and NIP-28 channel fetch. Moderate crypto (relay AUTH signing).

8. **`/events`** -- Calendar with NIP-52 events. Low crypto but needs relay connectivity.

9. **`/forums`** -- Forum index using permission-gated zone access. No direct crypto.

10. **`/[category]/[section]`** -- Section forum listing with channel creation (kind 40 publish) capability. Requires Schnorr signing.

11. **`/view/[noteId]`** -- Public note viewer. NIP-19 decode (bech32) and read-only relay fetch. Low crypto priority.

12. **`/pending`** -- Approval waiting room. No crypto operations; polls whitelist status.

13. **`/settings/muted`** -- Mute list management. NIP-19 encode for display. No crypto.

14. **`/admin/calendar`** -- Admin calendar aggregate view. Read-only relay fetch of NIP-52 events.

---

## Key Shared Modules for WASM Port

These modules contain the crypto hot paths that should be the first WASM compilation targets:

| Module | Location | Operations | Port Priority |
|--------|----------|-----------|---------------|
| `passkey.ts` | `src/lib/auth/passkey.ts` | WebAuthn PRF, HKDF-SHA-256, secp256k1 key validation | P0 |
| `nip98-client.ts` | `src/lib/auth/nip98-client.ts` | NIP-98 event construction, SHA-256 payload hash, Schnorr sign | P0 |
| `dm.ts` | `src/lib/nostr/dm.ts` | NIP-44 v2 encrypt/decrypt, ECDH, ephemeral keys, gift wrap | P0 |
| `encryption.ts` | `src/lib/nostr/encryption.ts` | NIP-44 v2 per-member encrypt/decrypt for group channels | P0 |
| `reactions.ts` | `src/lib/nostr/reactions.ts` | NIP-25 reaction event creation, Schnorr sign | P1 |
| `channels.ts` | `src/lib/nostr/channels.ts` | NIP-28 channel operations, event publish | P1 |
| `calendar.ts` | `src/lib/nostr/calendar.ts` | NIP-52 calendar event creation, event publish | P2 |
| `groups.ts` | `src/lib/nostr/groups.ts` | NIP-29 group operations, join/add/remove, Schnorr sign | P1 |
| `relay.ts` | `src/lib/nostr/relay.ts` | NDK connection, NIP-42 AUTH, event publishing | P0 |
| `auth.ts` (store) | `src/lib/stores/auth.ts` | Session management, privkey lifecycle, multi-auth-path | P1 |
