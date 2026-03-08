# Ubiquitous Language

**Last updated:** 2026-03-08 | [Back to DDD Index](README.md) | [Back to Documentation Index](../README.md)

A shared vocabulary for the DreamLab community forum Rust port. Every term here has a precise meaning used consistently across code, documentation, and conversation.

## Nostr Protocol Terms

| Term | Definition |
|------|-----------|
| **Event** | A signed JSON object with `id`, `pubkey`, `created_at`, `kind`, `tags`, `content`, and `sig`. The atomic unit of the Nostr protocol (NIP-01). |
| **Kind** | An integer classifying an event's purpose. Kind 0 = profile metadata, kind 1 = text note, kind 7 = reaction, kind 27235 = NIP-98 HTTP auth, etc. |
| **Tag** | A string array attached to an event. First element is the tag name (`e`, `p`, `t`, `u`, `method`, `payload`). Used for referencing other events, pubkeys, URLs. |
| **Relay** | A WebSocket server that stores and forwards Nostr events. Clients connect to relays to publish and subscribe to events. |
| **Subscription** | A client-initiated filter (REQ message) that tells a relay which events to send. Closed with a CLOSE message. |
| **REQ** | Protocol message from client to relay requesting events matching a filter (kinds, authors, tags, time range). |
| **CLOSE** | Protocol message from client to relay cancelling a subscription. |
| **NIP** | Nostr Implementation Possibility. A numbered specification for protocol features (NIP-01 = core, NIP-44 = encryption, NIP-98 = HTTP auth, etc.). |
| **NIP-01** | Core protocol: event structure, canonical JSON serialization, REQ/CLOSE/EVENT messages, signature verification. |
| **NIP-10** | Event threading: `e` tags with markers (`root`, `reply`, `mention`) for building conversation threads. |
| **NIP-17** | Private direct messages using gift wrapping (kind 14 sealed message inside kind 1059 gift wrap). |
| **NIP-25** | Reactions: kind 7 events referencing another event, with content like `+`, `-`, or an emoji. |
| **NIP-28** | Public channels: kind 40 (create), 41 (metadata), 42 (message), 43 (hide), 44 (mute). |
| **NIP-29** | Relay-enforced groups: kind 39000 (group metadata), 39002 (member list). Server-side access control. |
| **NIP-42** | Client authentication to a relay via a signed event, enabling relay-level access control. |
| **NIP-44** | Versioned encryption: ECDH key agreement + HKDF + ChaCha20-Poly1305. Version 2 is current. |
| **NIP-52** | Calendar events: kind 31922 (time-based) and 31923 (date-based). |
| **NIP-59** | Gift wrap: kind 1059 outer event with a random throwaway key to hide the real sender from relay operators. Contains a kind 13 Seal wrapping a kind 14 Rumor. |
| **NIP-65** | Relay list metadata: kind 10002 events specifying a user's preferred relays. |
| **NIP-98** | HTTP authentication: kind 27235 event with `u` (URL), `method`, and optional `payload` (SHA-256 of body) tags. Sent as `Authorization: Nostr <base64>`. |
| **Rumor** | An unsigned kind 14 event containing the actual DM plaintext. Wrapped inside a Seal. |
| **Seal** | A kind 13 event signed by the sender, containing an encrypted Rumor. Wrapped inside a Gift Wrap. |
| **Gift Wrap** | A kind 1059 event signed by a random throwaway key, containing an encrypted Seal. The `p` tag addresses the intended recipient. |

## DreamLab Forum Terms

| Term | Definition |
|------|-----------|
| **Category** | Tier 1 of the BBS hierarchy. A top-level organizational container (also called a "zone"). Categories can be restricted to specific cohorts for zone isolation. |
| **Section** | Tier 2 of the BBS hierarchy. A grouping of forums/channels within a category. Has its own access config, calendar settings, and role assignments. |
| **Forum** | Tier 3 of the BBS hierarchy. Maps to a NIP-28 channel or NIP-29 group. The space where users post messages and create threads. |
| **Channel** | Synonym for forum in the NIP-28/NIP-29 context. A channel has messages, members, and metadata. |
| **Zone** | Synonym for category. Used when emphasizing access isolation (e.g., "zone-level visibility"). |
| **Cohort** | A named group membership tag assigned to users via the relay whitelist. Determines which zones, sections, and channels a user can access. Examples: `admin`, `mentor`, `business`, `moomaa-tribe`. |
| **Whitelist** | The relay-maintained list of authorized users with their cohort assignments. The whitelist API is the source of truth for permissions. |
| **Pod** | A per-user Solid-compatible storage container backed by Cloudflare R2. Stores profile cards, media, and private files. Accessible at `https://pods.dreamlab-ai.com/{pubkey}/`. |
| **WAC** | Web Access Control. The ACL system used on pods, with rules for agent identity, access modes (Read/Write/Control), and path scoping. |
| **Whitelist Status** | A verified snapshot of a user's permissions, including whether they are whitelisted, their admin status, and their cohort list. Cached for 5 minutes. |
| **BBS** | Bulletin Board System. The 3-tier hierarchy (Category > Section > Forum) that organizes the community forum. |
| **Gated Channel** | A channel that requires explicit membership approval (via JoinRequest) before a user can post. |
| **Open Channel** | A channel where any whitelisted user with cohort access can post without a join request. |

## Authentication Terms

| Term | Definition |
|------|-----------|
| **Passkey** | A FIDO2/WebAuthn credential stored in the user's platform authenticator (e.g., iCloud Keychain, Android Biometric). The primary authentication method. |
| **PRF** | Pseudo-Random Function extension for WebAuthn. Returns deterministic bytes from the authenticator, used as input to key derivation. Same credential + same salt = same output. |
| **HKDF** | HMAC-based Key Derivation Function. Derives the secp256k1 private key from PRF output using `HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")`. |
| **PRF Salt** | A 32-byte random value generated server-side during registration, stored with the credential. Passed back to the authenticator during login to produce the same PRF output. |
| **Discoverable Credential** | A passkey that the authenticator can present without the server knowing the credential ID. Enables login on new devices via iCloud/Google sync. |
| **Hybrid Transport** | Cross-device QR-code WebAuthn flow. Blocked in DreamLab because it produces different PRF outputs than the original device. |
| **NIP-07** | Browser extension signing interface (window.nostr). Used by extensions like Alby and nos2x. No private key access; the extension signs events on behalf of the user. |
| **Credential** | A WebAuthn credential record (credential ID, public key, counter, PRF salt) stored in D1. |
| **Session** | The client-side auth state. For passkey users, the private key lives in a closure (`_privkeyMem`) and is zeroed on page discard. |
| **ECDH** | Elliptic Curve Diffie-Hellman. Key agreement protocol used to derive shared secrets for NIP-44 encryption between two secp256k1 keys. |

## Rust / Leptos Terms

| Term | Definition |
|------|-----------|
| **Crate** | A Rust compilation unit (library or binary). The workspace has 6 crates: `nostr-core`, `forum-client`, `auth-worker`, `pod-worker`, `preview-worker`, `relay-worker`. |
| **Signal** | A Leptos reactive primitive. `Signal<T>` holds a value that triggers re-renders when updated. Replaces Svelte's `writable`/`derived` stores. |
| **Resource** | A Leptos async data primitive. `Resource<T>` loads data asynchronously and integrates with `Suspense` for loading states. |
| **Memo** | A Leptos derived computation. `Memo<T>` caches a derived value and only recomputes when its dependencies change. |
| **Effect** | A Leptos side-effect. `Effect` runs a closure whenever its tracked signals change. Used for subscriptions, logging, DOM manipulation. |
| **Component** | A Leptos function that returns a `View`. Annotated with `#[component]`. The building block of the UI. |
| **View** | The return type of a Leptos component. Describes the DOM tree declaratively using the `view!` macro. |
| **trunk** | The build tool for Leptos CSR apps. Compiles Rust to WASM, bundles assets, serves during development. Located at `crates/forum-client/Trunk.toml`. |
| **worker-build** | The build tool for Cloudflare Workers written in Rust. Compiles to WASM and generates the Worker entry point. |
| **wasm-bindgen** | The FFI layer between Rust/WASM and JavaScript. Generates JS glue code for calling browser APIs from Rust. |
| **web-sys** | Rust bindings to Web APIs (DOM, WebAuthn, Crypto, IndexedDB). Generated from WebIDL specifications. |
| **gloo** | High-level Rust wrappers around browser APIs (timers, events, storage, fetch). Built on top of `web-sys`. |
| **proptest** | Property-based testing framework. Generates random inputs and checks that properties hold. Used for crypto roundtrip testing. |
| **Durable Object** | A Cloudflare Workers feature providing named, single-instance objects with persistent state and WebSocket support. Used by `relay-worker` for WebSocket relay connections. |
