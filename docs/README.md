# DreamLab AI -- Documentation Hub

**Last updated:** 2026-03-08 | **Repository:** [DreamLab-AI/dreamlab-ai-website](https://github.com/DreamLab-AI/dreamlab-ai-website) | **Project README:** [../README.md](../README.md)

This documentation covers the full DreamLab AI platform: a React marketing site, a Rust/Leptos WASM community forum, and five Cloudflare Workers providing authentication, storage, relay, search, and link preview services.

---

## System Architecture

Seven services (6 Rust crates + 2 TypeScript Workers) compose the backend and forum client. The `nostr-core` crate is the shared foundation, consumed by the forum client and all three Rust Workers.

```mermaid
graph TB
    subgraph "Static Sites (GitHub Pages)"
        REACT["React SPA<br/>Marketing Site<br/><i>src/</i>"]
        LEPTOS["Leptos 0.7 CSR<br/>Community Forum<br/><i>community-forum-rs/crates/forum-client/</i>"]
    end

    subgraph "Shared Library"
        CORE["nostr-core<br/>NIP-01, NIP-44, NIP-59, NIP-98<br/>Key derivation, Schnorr signing"]
    end

    subgraph "Rust Cloudflare Workers"
        AUTH["auth-worker<br/>WebAuthn PRF + NIP-98<br/>Pod provisioning"]
        POD["pod-worker<br/>Solid Pods on R2<br/>WAC ACL"]
        PREVIEW["preview-worker<br/>OG metadata<br/>SSRF protection"]
    end

    subgraph "TypeScript Cloudflare Workers"
        RELAY["nostr-relay<br/>WebSocket NIP-01/42/98<br/>D1 + Durable Objects"]
        SEARCH["search-api<br/>RuVector WASM<br/>.rvf format"]
    end

    subgraph "Cloudflare Storage"
        D1[(D1)]
        KV[(KV)]
        R2[(R2)]
        DO[(Durable<br/>Objects)]
    end

    LEPTOS --> CORE
    AUTH --> CORE
    POD --> CORE
    PREVIEW --> CORE

    LEPTOS -- "HTTPS" --> AUTH
    LEPTOS -- "HTTPS" --> POD
    LEPTOS -- "HTTPS" --> PREVIEW
    LEPTOS -- "WebSocket" --> RELAY
    LEPTOS -- "HTTPS" --> SEARCH

    AUTH --> D1
    AUTH --> KV
    AUTH --> R2
    RELAY --> D1
    RELAY --> DO
    POD --> R2
    POD --> KV
    SEARCH --> R2
    SEARCH --> KV

    style REACT fill:#61DAFB,color:#000
    style LEPTOS fill:#ef3939,color:#fff
    style CORE fill:#dea584,color:#000
    style AUTH fill:#dea584,color:#000
    style POD fill:#dea584,color:#000
    style PREVIEW fill:#dea584,color:#000
    style RELAY fill:#3178C6,color:#fff
    style SEARCH fill:#3178C6,color:#fff
```

---

## Document Index

### Planning and Governance

| Document | Status | Description |
|----------|--------|-------------|
| [PRD: Rust Port v2.0.0](prd-rust-port.md) | Accepted | Architecture baseline for the Rust port. Scope, crate survey, timeline, risk register. |
| [PRD: Rust Port v2.1.0](prd-rust-port-v2.1.md) | In Progress | Refined delivery plan with tranche-based execution, governance gates, and rollback design. |

### Architecture Decision Records

Full index of all 19 ADRs. See [adr/README.md](adr/README.md) for conventions and supersession chains.

| ADR | Title | Status | Link |
|-----|-------|--------|------|
| 001 | Nostr Protocol as Foundation | Accepted | [adr/README.md](adr/README.md) |
| 002 | Three-Tier BBS Hierarchy | Accepted | [adr/README.md](adr/README.md) |
| 003 | GCP Cloud Run Infrastructure | Superseded by 010 | [adr/README.md](adr/README.md) |
| 004 | Zone-Based Access Control | Accepted | [adr/README.md](adr/README.md) |
| 005 | NIP-44 Encryption Mandate | Accepted | [adr/README.md](adr/README.md) |
| 006 | Client-Side WASM Search | Accepted | [adr/README.md](adr/README.md) |
| 007 | SvelteKit + NDK Frontend | Superseded by 013 | [adr/README.md](adr/README.md) |
| 008 | PostgreSQL Relay Storage | Superseded by 010 | [adr/README.md](adr/README.md) |
| 009 | User Registration Flow | Accepted | [adr/README.md](adr/README.md) |
| 010 | Return to Cloudflare Platform | Accepted | [adr/README.md](adr/README.md) |
| 011 | Images to Solid Pods | Accepted | [adr/README.md](adr/README.md) |
| 012 | Hardening Sprint | Accepted | [adr/README.md](adr/README.md) |
| 013 | Rust/Leptos 0.7 as Forum UI Framework | Accepted | [adr/013-rust-leptos-forum-framework.md](adr/013-rust-leptos-forum-framework.md) |
| 014 | Hybrid Validation Phase Before Full Rewrite | Accepted | [adr/014-hybrid-validation-phase.md](adr/014-hybrid-validation-phase.md) |
| 015 | Selective Workers Port Strategy (3 Rust, 2 TS) | Accepted | [adr/015-workers-port-strategy.md](adr/015-workers-port-strategy.md) |
| 016 | nostr-sdk 0.44.x as Nostr Protocol Layer | Accepted | [adr/016-nostr-sdk-protocol-layer.md](adr/016-nostr-sdk-protocol-layer.md) |
| 017 | passkey-rs for WebAuthn/FIDO2 with PRF Extension | Accepted | [adr/017-passkey-rs-webauthn-prf.md](adr/017-passkey-rs-webauthn-prf.md) |
| 018 | Testing Strategy for Rust Port | Accepted | [adr/018-testing-strategy-rust-port.md](adr/018-testing-strategy-rust-port.md) |
| 019 | Versioned Planning Governance and Tranche-Based Delivery | Accepted | [adr/019-plan-governance-and-delivery-structure.md](adr/019-plan-governance-and-delivery-structure.md) |

**Supersession chain:** ADR-003 (GCP) -> ADR-010 (Cloudflare) | ADR-007 (SvelteKit) -> ADR-013 (Rust/Leptos) | ADR-008 (PostgreSQL) -> ADR-010 (D1)

### Domain-Driven Design

Six documents defining the domain model for the Rust workspace. See [ddd/README.md](ddd/README.md) for the full overview and crate-to-context mapping.

| Document | Description |
|----------|-------------|
| [01 - Domain Model](ddd/01-domain-model.md) | Core entities: identity, authentication, community, messaging, content, storage. Includes Rust type definitions. |
| [02 - Bounded Contexts](ddd/02-bounded-contexts.md) | Maps each bounded context to a Rust crate or TypeScript Worker. Dependency graph and ACL boundaries. |
| [03 - Aggregates](ddd/03-aggregates.md) | Five aggregate roots: UserIdentity, Channel, Conversation, ForumThread, Pod. Invariants and commands. |
| [04 - Domain Events](ddd/04-domain-events.md) | Nostr protocol events vs. application domain events. Event kind registry and flow diagrams. |
| [05 - Value Objects](ddd/05-value-objects.md) | Immutable types: EventId, PublicKey, Signature, Timestamp, RoleId, Nip44Ciphertext, GiftWrap. |
| [06 - Ubiquitous Language](ddd/06-ubiquitous-language.md) | 50+ term glossary covering Nostr, DreamLab forum, authentication, and Rust/Leptos concepts. |

### API Reference

| Document | Worker | Language | Description |
|----------|--------|----------|-------------|
| [Auth API](api/AUTH_API.md) | auth-worker | Rust | WebAuthn PRF registration/login, NIP-98 verification, pod provisioning. D1 + KV + R2. |
| [Pod API](api/POD_API.md) | pod-worker | Rust | Solid pod CRUD, media upload, WAC ACL management. R2 + KV. |
| [Nostr Relay](api/NOSTR_RELAY.md) | nostr-relay | TypeScript | WebSocket NIP-01 relay with NIP-42 AUTH and NIP-98 verification. D1 + Durable Objects. |
| [Search API](api/SEARCH_API.md) | search-api | TypeScript | RuVector WASM vector search, `.rvf` format, `/embed` endpoint. R2 + KV. |

### Security

| Document | Description |
|----------|-------------|
| [Security Overview](security/SECURITY_OVERVIEW.md) | Compile-time safety (`#![deny(unsafe_code)]`), NCC-audited crypto stack, zone-based access control, CORS, SSRF protection, input validation, dependency policy. |
| [Authentication](security/AUTHENTICATION.md) | Passkey PRF key derivation flow, `PasskeyCredential` struct, NIP-98 HTTP auth, auth paths (passkey, NIP-07, nsec). |
| [QE Audit: Forum Client](security/QE_AUDIT_FORUM_CLIENT.md) | Leptos WASM forum client audit: 4 critical, 7 high, 9 medium, 6 low findings. |
| [QE Audit: nostr-core](security/QE_AUDIT_NOSTR_CORE.md) | nostr-core crate security audit: crypto, side-channel, NIP compliance, WASM/FFI findings. |
| [QE Audit: Workers](security/QE_AUDIT_WORKERS.md) | auth-worker, pod-worker, preview-worker, relay-worker audit: 4 critical, 7 high findings. |
| [QE Coverage Report](security/QE_COVERAGE_REPORT.md) | Workspace test coverage: 146 tests, ~32% line coverage, prioritized gap analysis. |

### Deployment

| Document | Description |
|----------|-------------|
| [Deployment Overview](deployment/README.md) | CI/CD pipelines, environments (production/dev), DNS records, required GitHub secrets. |
| [Cloudflare Workers](deployment/CLOUDFLARE_WORKERS.md) | Rust Worker build (`worker-build`), TypeScript Worker build (`wrangler`), wrangler.toml configuration. |

### Developer

| Document | Description |
|----------|-------------|
| [Getting Started](developer/GETTING_STARTED.md) | Prerequisites (Rust, trunk, wrangler), clone/setup, dev servers, running tests, environment variables. |
| [Rust Style Guide](developer/RUST_STYLE_GUIDE.md) | Coding standards, error handling patterns, module organization, naming conventions. |

### Benchmarks

| Document | Description |
|----------|-------------|
| [Native Benchmark Baseline](benchmarks/baseline-native.md) | nostr-core performance: NIP-44 encrypt/decrypt throughput, key generation, Schnorr sign/verify timings. |

### Migration Tracking (Tranche 1)

| Document | Description |
|----------|-------------|
| [Feature Parity Matrix](tranche-1/feature-parity-matrix.md) | Every user-facing feature mapped from SvelteKit to Rust/WASM with crypto dependencies and risk ratings. |
| [Route Parity Matrix](tranche-1/route-parity-matrix.md) | Route-by-route catalog: crypto operations, Nostr event kinds, access zones, WASM migration priority. |

---

## Authentication Flow

Passkey-first authentication with PRF key derivation. The private key is never stored -- it is derived deterministically from the authenticator's PRF output and held in a Rust closure until page unload.

```mermaid
sequenceDiagram
    participant User
    participant Browser as Browser<br/>(Leptos WASM)
    participant Authenticator as Passkey<br/>Authenticator
    participant AuthWorker as auth-worker<br/>(Rust CF Worker)
    participant D1 as Cloudflare D1

    Note over User,D1: Registration

    User->>Browser: Click "Register"
    Browser->>AuthWorker: POST /auth/register/options
    AuthWorker->>D1: Store challenge (5-min TTL)
    AuthWorker-->>Browser: CreationOptions + prfSalt
    Browser->>Authenticator: navigator.credentials.create()<br/>with PRF extension
    Authenticator-->>Browser: Attestation + PRF output (32 bytes)
    Browser->>Browser: HKDF(PRF output, info="nostr-secp256k1-v1")<br/>= secp256k1 private key
    Browser->>AuthWorker: POST /auth/register/verify<br/>{credential, pubkey, prfSalt}
    AuthWorker->>D1: Store credential + prf_salt + pubkey
    AuthWorker->>AuthWorker: Provision Solid pod (R2 + KV)
    AuthWorker-->>Browser: {verified, didNostr, webId, podUrl}

    Note over User,D1: Login

    User->>Browser: Click "Login"
    Browser->>AuthWorker: POST /auth/login/options
    AuthWorker->>D1: Fetch stored prf_salt
    AuthWorker-->>Browser: RequestOptions + prfSalt
    Browser->>Authenticator: navigator.credentials.get()<br/>with PRF extension + stored salt
    Authenticator-->>Browser: Assertion + PRF output (32 bytes)
    Browser->>Browser: HKDF(PRF output) = same private key
    Browser->>AuthWorker: POST /auth/login/verify<br/>{credential, assertion}
    AuthWorker->>D1: Verify counter advanced, update
    AuthWorker-->>Browser: {verified, pubkey}

    Note over User,D1: NIP-98 API Calls

    Browser->>Browser: Sign kind 27235 event<br/>(Schnorr with derived key)
    Browser->>AuthWorker: Any API call<br/>Authorization: Nostr base64(event)
    AuthWorker->>AuthWorker: Recompute event ID<br/>Verify Schnorr signature<br/>Check payload hash
```

---

## Data Flow: Events

How Nostr events flow from the forum client through the relay to persistent storage and back to subscribers.

```mermaid
sequenceDiagram
    participant Author as Forum Client<br/>(Author)
    participant Relay as nostr-relay<br/>(TypeScript Worker)
    participant DO as Durable Object<br/>(WebSocket State)
    participant D1 as Cloudflare D1
    participant Sub as Forum Client<br/>(Subscriber)

    Author->>Relay: WebSocket: ["EVENT", signed_event]
    Relay->>Relay: NIP-42 AUTH check<br/>(whitelist + zone ACL)
    Relay->>Relay: Validate: signature, size,<br/>tag count, timestamp drift
    Relay->>D1: INSERT event
    Relay->>DO: Broadcast to matching subscriptions
    DO->>Sub: WebSocket: ["EVENT", subscription_id, event]

    Note over Author,Sub: Subscription Setup

    Sub->>Relay: WebSocket: ["REQ", sub_id, filters...]
    Relay->>D1: SELECT matching events
    Relay-->>Sub: ["EVENT", sub_id, event] (for each match)
    Relay-->>Sub: ["EOSE", sub_id]
    Relay->>DO: Register subscription for live updates
```

---

## DM Encryption: NIP-59 Gift Wrap

Direct messages use three layers of encryption. The relay and server never see the plaintext content or the real sender identity.

```mermaid
graph TB
    subgraph "Layer 1: Rumor (unsigned)"
        RUMOR["kind 14<br/>Plaintext content<br/>Real sender pubkey<br/>Real recipient in tags<br/><i>NOT signed (no proof of authorship)</i>"]
    end

    subgraph "Layer 2: Seal (NIP-44 encrypted)"
        SEAL["kind 13<br/>NIP-44 encrypt(Rumor)<br/>Sender's real pubkey<br/>Signed by sender<br/><i>Only recipient can decrypt</i>"]
    end

    subgraph "Layer 3: Gift Wrap (NIP-44 encrypted)"
        WRAP["kind 1059<br/>NIP-44 encrypt(Seal)<br/>Ephemeral throwaway pubkey<br/>Randomized timestamp<br/><i>Hides sender identity from relay</i>"]
    end

    RUMOR -- "NIP-44 encrypt<br/>with recipient's key" --> SEAL
    SEAL -- "NIP-44 encrypt<br/>with ephemeral key" --> WRAP
    WRAP -- "Published to relay" --> RELAY["nostr-relay<br/>(sees only ephemeral pubkey<br/>+ encrypted blob)"]

    style RUMOR fill:#4ade80,color:#000
    style SEAL fill:#facc15,color:#000
    style WRAP fill:#f87171,color:#000
    style RELAY fill:#3178C6,color:#fff
```

```mermaid
sequenceDiagram
    participant Sender as Sender<br/>(Forum Client)
    participant Relay as nostr-relay
    participant Recipient as Recipient<br/>(Forum Client)

    Note over Sender: Compose DM

    Sender->>Sender: Create Rumor (kind 14)<br/>plaintext + real pubkey<br/>(do NOT sign)
    Sender->>Sender: NIP-44 encrypt(Rumor)<br/>with ECDH(sender_privkey, recipient_pubkey)
    Sender->>Sender: Create Seal (kind 13)<br/>contains encrypted Rumor<br/>sign with real key
    Sender->>Sender: Generate ephemeral keypair
    Sender->>Sender: NIP-44 encrypt(Seal)<br/>with ECDH(ephemeral_privkey, recipient_pubkey)
    Sender->>Sender: Create Gift Wrap (kind 1059)<br/>ephemeral pubkey, randomized timestamp
    Sender->>Relay: Publish Gift Wrap<br/>(relay sees ephemeral pubkey only)

    Note over Recipient: Receive DM

    Relay->>Recipient: Gift Wrap (kind 1059)
    Recipient->>Recipient: NIP-44 decrypt with own privkey<br/>= Seal (kind 13)
    Recipient->>Recipient: Verify Seal signature<br/>= real sender pubkey
    Recipient->>Recipient: NIP-44 decrypt Seal payload<br/>= Rumor (kind 14)
    Recipient->>Recipient: Read plaintext content
```

---

## Zone-Based Access Control

Four access zones with relay-level and client-level enforcement.

```mermaid
graph TB
    subgraph "Zone Hierarchy"
        PL["Public Lobby<br/>All whitelisted users"]
        CC["Cohort Channels<br/>Members of cohort only"]
        SL["Staff Lounge<br/>Staff + Admin"]
        AZ["Admin Zone<br/>Admin only"]
    end

    USER["Authenticated User"] --> PL
    USER -.->|"if cohort member"| CC
    USER -.->|"if staff role"| SL
    USER -.->|"if admin"| AZ

    subgraph "Enforcement"
        RELAY_CHECK["Relay: whitelist check<br/>before event storage"]
        CLIENT_CHECK["Client: UI filtering<br/>based on auth store cohorts"]
    end

    PL --> RELAY_CHECK
    CC --> RELAY_CHECK
    SL --> RELAY_CHECK
    AZ --> RELAY_CHECK
    PL --> CLIENT_CHECK
    CC --> CLIENT_CHECK
    SL --> CLIENT_CHECK
    AZ --> CLIENT_CHECK

    style PL fill:#4ade80,color:#000
    style CC fill:#60a5fa,color:#000
    style SL fill:#facc15,color:#000
    style AZ fill:#f87171,color:#000
```

---

## Crate Dependency Graph

```mermaid
graph LR
    CORE["nostr-core"]
    CLIENT["forum-client<br/>(Leptos WASM)"]
    AUTH["auth-worker"]
    POD["pod-worker"]
    PREVIEW["preview-worker"]
    RELAY_STUB["relay-worker<br/>(Rust stub)"]

    CLIENT --> CORE
    AUTH --> CORE
    POD --> CORE
    PREVIEW --> CORE
    RELAY_STUB --> CORE

    style CORE fill:#dea584,color:#000
    style CLIENT fill:#ef3939,color:#fff
    style AUTH fill:#F38020,color:#000
    style POD fill:#F38020,color:#000
    style PREVIEW fill:#F38020,color:#000
    style RELAY_STUB fill:#F38020,color:#000
```

---

## Quick Reference

### Key Environment Variables

| Variable | Context | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | React `.env` | Supabase project URL (marketing site) |
| `VITE_SUPABASE_ANON_KEY` | React `.env` | Supabase anonymous key (marketing site) |
| `VITE_AUTH_API_URL` | Both `.env` | auth-worker URL (e.g., `https://api.dreamlab-ai.com`) |
| `RP_ID` | Worker `wrangler.toml` | WebAuthn relying party ID (`dreamlab-ai.com` or `localhost`) |
| `EXPECTED_ORIGIN` | Worker `wrangler.toml` | Allowed origin for WebAuthn ceremonies |
| `ADMIN_PUBKEYS` | Worker `wrangler.toml` | Comma-separated admin Nostr pubkeys |
| `CLOUDFLARE_API_TOKEN` | GitHub Secret | Workers deploy permissions |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secret | Cloudflare account identifier |

### Admin Pubkey

```
11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c
```

### DNS Subdomains

| Subdomain | Worker |
|-----------|--------|
| `api.dreamlab-ai.com` | auth-worker (Rust) |
| `pods.dreamlab-ai.com` | pod-worker (Rust) |
| `search.dreamlab-ai.com` | search-api (TypeScript) |
| `preview.dreamlab-ai.com` | preview-worker (Rust) |

### Development URLs

| Service | URL |
|---------|-----|
| React marketing site | `http://localhost:5173` |
| Leptos forum client | `http://localhost:8080` |
| Workers (local) | `http://localhost:8787` (per `wrangler dev`) |

---

## Document Status

| Category | Files | Status |
|----------|-------|--------|
| Planning (PRDs) | 2 | v2.0.0 accepted, v2.1.0 in progress |
| ADRs (001-019) | 8 files (013-019 present; 001-012 tracked in index) | Current |
| DDD | 7 (including README) | Aligned to v2.0.0 baseline |
| API | 4 | Current for Rust port |
| Security | 6 | Current for Rust port (2 docs + 3 QE audits + 1 coverage report) |
| Deployment | 2 | Current for Rust port |
| Developer | 2 | Current for Rust port |
| Benchmarks | 1 | Baseline established |
| Tranche 1 | 2 | Active migration tracking |
| **Total** | **34** | |

---

**Project README:** [../README.md](../README.md) | **ADR Index:** [adr/README.md](adr/README.md) | **DDD Hub:** [ddd/README.md](ddd/README.md)

*Last updated: 2026-03-08*
