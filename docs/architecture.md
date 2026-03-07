# DreamLab AI -- Architecture Overview

**Last updated:** 2026-03-01

This document describes the high-level architecture of the DreamLab AI platform. For detailed SPARC methodology documents, see the `architecture/` directory. For individual technology decisions, see the [ADR index](adr/README.md).

---

## System Context

DreamLab AI consists of two deployment targets: a static frontend on GitHub Pages (with Cloudflare Pages opt-in) and five Cloudflare Workers backend services. All GCP infrastructure has been deleted as of 2026-03-02.

```mermaid
graph TB
    subgraph Users["Users"]
        Browser["Web Browser"]
    end

    subgraph GitHubPages["GitHub Pages (current) / Cloudflare Pages (target)"]
        SPA["React SPA<br/>Vite + TypeScript + Tailwind"]
        Forum["SvelteKit Forum<br/>at /community"]
    end

    subgraph CloudflareWorkers["Cloudflare Workers (5 services)"]
        CFAuth["auth-api Worker<br/>D1 + KV"]
        CFPod["pod-api Worker<br/>R2 + KV"]
        CFSearch["search-api Worker<br/>WASM + R2"]
        CFRelay["nostr-relay Worker<br/>D1 + Durable Objects"]
        CFLink["link-preview Worker<br/>Cache API"]
    end

    subgraph External["External Services"]
        Supabase["Supabase<br/>PostgreSQL + Auth"]
    end

    Browser --> SPA
    Browser --> Forum
    SPA --> Supabase
    Forum --> CFAuth
    Forum --> CFRelay
    Forum --> CFSearch
    Forum --> CFLink

```

*All Workers deployed at `*.solitary-paper-764d.workers.dev`. Custom domain routes configured.*

### Detailed System Architecture

```mermaid
flowchart TB
    subgraph "Static Hosting (GitHub Pages)"
        REACT["React SPA<br/>Main Website"]
        SVELTE["SvelteKit Forum<br/>Community"]
    end

    subgraph "Cloudflare Workers"
        AUTH["auth-api<br/>WebAuthn + NIP-98"]
        POD["pod-api<br/>Solid Pods"]
        SEARCH["search-api<br/>RuVector WASM"]
        RELAY["nostr-relay<br/>WebSocket NIP-01/42"]
        PREVIEW["link-preview<br/>OG Metadata"]
    end

    subgraph "Cloudflare Storage"
        D1["D1 (SQLite)<br/>Auth + Relay"]
        KV["KV Namespaces<br/>Sessions, Config"]
        R2["R2 Buckets<br/>Pods, Vectors"]
        DO["Durable Objects<br/>WebSocket State"]
    end

    SVELTE --> AUTH & SEARCH & RELAY & POD & PREVIEW
    AUTH --> D1 & KV & R2
    POD --> R2 & KV
    SEARCH --> R2 & KV
    RELAY --> D1 & DO
    PREVIEW -.-> |Cache API| PREVIEW
```

---

## Frontend Architecture

The platform has two frontend applications sharing the same domain:

### React SPA (Main Site)

The main site at `dreamlab-ai.com` is a React 18.3 single-page application built with Vite 5.4.

| Concern | Implementation |
|---------|---------------|
| Routing | React Router DOM 6.26, 13 lazy-loaded routes |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI primitives) |
| State | TanStack React Query 5.56 for server state |
| Forms | React Hook Form 7.53 + Zod 3.23 validation |
| 3D | Three.js 0.156 via @react-three/fiber (declarative) |
| WASM | Rust Voronoi tessellation (`wasm-voronoi/`) |
| Build | Vite SWC plugin, manual chunks (vendor, three, ui) |
| Content | Markdown in `public/data/` loaded at runtime |

**Routes:**

| Path | Page | Description |
|------|------|-------------|
| `/` | Index | Landing page with hero, featured content, CTAs |
| `/team` | Team | 44 expert profiles loaded from markdown |
| `/work` | Work | Portfolio and case studies |
| `/workshops` | WorkshopIndex | Workshop catalogue |
| `/workshops/:workshopId` | WorkshopPage | Individual workshop |
| `/workshops/:workshopId/:pageSlug` | WorkshopPage | Workshop sub-page |
| `/residential-training` | ResidentialTraining | 2-day masterclass details |
| `/masterclass` | Masterclass | AI agent training programme |
| `/contact` | Contact | Contact form (React Hook Form + Zod) |
| `/privacy` | Privacy | Privacy policy |
| `/system-design` | SystemDesign | Architecture documentation |
| `/research-paper` | ResearchPaper | Research content |
| `/testimonials` | Testimonials | Customer reviews |

### SvelteKit Forum (Community)

The community forum at `dreamlab-ai.com/community` is a SvelteKit 2.49 application with passkey-first authentication and Nostr-based messaging.

| Concern | Implementation |
|---------|---------------|
| Framework | SvelteKit 2.49, static adapter for GitHub Pages |
| Auth | WebAuthn PRF + HKDF key derivation |
| Protocol | Nostr (NDK 2.13) for messaging and identity |
| Routes | 16 Svelte routes (channels, DMs, calendar, profiles) |
| Testing | Vitest (unit) + Playwright (e2e) |

---

## Backend Services

### Cloudflare Workers (Production)

Five Workers deployed at `*.solitary-paper-764d.workers.dev`. All GCP Cloud Run services deleted as of 2026-03-02.

| Service | Storage | Purpose |
|---------|---------|---------|
| **auth-api** (`workers/auth-api/`) | D1 + KV | WebAuthn registration/authentication, NIP-98 gating, pod provisioning |
| **pod-api** (`workers/pod-api/`) | R2 + KV | Solid pod storage per pubkey with WAC enforcement |
| **search-api** (`workers/search-api/`) | R2 + KV + WASM | Vector similarity search (42KB rvf-wasm microkernel) |
| **nostr-relay** (`workers/nostr-relay/`) | D1 + Durable Objects | WebSocket Nostr relay (NIP-01, NIP-28, NIP-42, NIP-98) |
| **link-preview** (`workers/link-preview-api/`) | Cache API | URL metadata extraction |

Shared NIP-98 utilities live in `workers/shared/nip98.ts`.

---

## Authentication Architecture

DreamLab uses a passkey-first authentication model where the user's cryptographic identity is derived from WebAuthn PRF output. The private key is never stored -- it lives only in a JavaScript closure and is zeroed on `pagehide`.

### Key Derivation

```
WebAuthn PRF output (32 bytes, HMAC-SHA-256 from authenticator)
  --> HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")
  --> 32-byte secp256k1 private key
  --> getPublicKey() --> hex pubkey (Nostr identity)
```

### Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant AuthAPI as auth-api (Cloudflare Worker)
    participant PodAPI as pod-api (Cloudflare Worker)

    User->>Browser: Tap "Register" (passkey)
    Browser->>AuthAPI: POST /auth/register/options
    AuthAPI-->>Browser: Challenge + PRF salt

    Browser->>Browser: navigator.credentials.create()<br/>with PRF extension
    Browser->>Browser: Check extensions.prf.enabled<br/>(abort if false)
    Browser->>Browser: HKDF(PRF output) --> privkey --> pubkey

    Browser->>AuthAPI: POST /auth/register/verify<br/>(attestation + pubkey)
    AuthAPI->>AuthAPI: Store credential + prf_salt<br/>in D1
    AuthAPI->>PodAPI: Provision Solid pod in R2
    PodAPI-->>AuthAPI: { webId, podUrl }
    AuthAPI-->>Browser: { didNostr, webId, podUrl }

    Browser->>Browser: Store pubkey in auth state<br/>privkey in closure only
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant AuthAPI as auth-api (Cloudflare Worker)

    User->>Browser: Tap "Login" (passkey)
    Browser->>AuthAPI: POST /auth/login/options
    AuthAPI-->>Browser: Challenge + stored prf_salt

    Browser->>Browser: navigator.credentials.get()<br/>with same prf_salt
    Browser->>Browser: Check authenticatorAttachment<br/>!== 'cross-platform'
    Browser->>Browser: HKDF(PRF output) --> privkey<br/>(same result as registration)

    Browser->>AuthAPI: POST /auth/login/verify<br/>(assertion)
    AuthAPI->>AuthAPI: Verify assertion<br/>update counter
    AuthAPI-->>Browser: OK

    Browser->>Browser: privkey in closure<br/>ready to sign NIP-98 tokens
```

### NIP-98 HTTP Auth

Every state-mutating API call uses NIP-98 `Authorization: Nostr <base64(event)>`:

- **Event kind:** 27235
- **Tags:** `u` (URL), `method`, optional `payload` (SHA-256 of body)
- **Signing:** Schnorr signature with privkey from auth store closure
- **Verification:** Server recomputes event ID from NIP-01 canonical form
- **Payload hash:** Uses raw body bytes (server captures via `express.raw` before JSON parsing)

A consolidated shared NIP-98 module exists at `community-forum/packages/nip98/` (sign.ts, verify.ts, types.ts), built to replace the four independent implementations across services.

### Identity Model

| Layer | Format | Example |
|-------|--------|---------|
| Nostr pubkey | Hex (32 bytes) | `a1b2c3...` |
| DID | `did:nostr:{pubkey}` | `did:nostr:a1b2c3...` |
| WebID | `{pod-url}/{pubkey}/profile/card#me` | `https://pods.dreamlab-ai.com/a1b2c3.../profile/card#me` |

---

## Data Flow

### Main Site

```mermaid
flowchart LR
    Browser["Browser"] --> GHP["GitHub Pages<br/>(static assets)"]
    GHP --> SPA["React SPA"]
    SPA --> Supabase["Supabase<br/>(PostgreSQL + Auth)"]
    SPA --> WS["Workshop Markdown<br/>(public/data/)"]
    SPA --> Team["Team Profiles<br/>(public/data/team/)"]
```

### Community Forum

```mermaid
flowchart LR
    Browser["Browser"] --> GHP["GitHub Pages<br/>(static assets)"]
    GHP --> Forum["SvelteKit Forum"]
    Forum -->|"WebAuthn + NIP-98"| AuthAPI["auth-api"]
    Forum -->|"WSS"| Relay["nostr-relay"]
    Forum -->|"HTTPS"| CFSearch["search-api"]
    Forum -->|"HTTPS"| CFLink["link-preview"]
```

---

## Technology Decisions

All major technology decisions are documented as Architecture Decision Records:

| ADR | Decision | Status |
|-----|----------|--------|
| [ADR-001](adr/001-nostr-protocol-foundation.md) | Nostr protocol as foundation for identity and messaging | Accepted |
| [ADR-002](adr/002-three-tier-hierarchy.md) | Three-tier hierarchy (Zone > Section > Forum) | Accepted |
| [ADR-003](adr/003-gcp-cloud-run-infrastructure.md) | GCP Cloud Run for backend services | **Superseded by ADR-010** |
| [ADR-004](adr/004-zone-based-access-control.md) | Zone-based cohort access control | Accepted |
| [ADR-005](adr/005-nip-44-encryption-mandate.md) | NIP-44 mandatory for new encryption | Accepted |
| [ADR-006](adr/006-client-side-wasm-search.md) | Client-side WASM semantic search | Accepted |
| [ADR-007](adr/007-sveltekit-ndk-frontend.md) | SvelteKit + NDK for forum frontend | Accepted |
| [ADR-008](adr/008-postgresql-relay-storage.md) | PostgreSQL for relay event storage | **Superseded by ADR-010** |
| [ADR-009](adr/009-user-registration-flow.md) | User registration and approval flow | Resolved |
| [ADR-010](adr/010-return-to-cloudflare.md) | Return to Cloudflare platform (Workers, D1, KV, R2) | Accepted |

---

## Deployment Architecture

### Current State (as of 2026-03-02)

```mermaid
graph TB
    subgraph GHP["GitHub Pages"]
        ReactSPA["React SPA (dist/)"]
        ForumStatic["SvelteKit Forum (dist/community/)"]
    end

    subgraph CFWorkers["Cloudflare Workers"]
        CFAuth["auth-api"]
        CFPod["pod-api"]
        CFSearch["search-api"]
        CFRelay["nostr-relay"]
        CFLink["link-preview"]
    end

    subgraph CFStorage["Cloudflare Storage"]
        D1["D1 (credentials, events)"]
        KV["KV (sessions, ACLs, config)"]
        R2["R2 (pods, images, vectors)"]
        DO["Durable Objects (relay)"]
    end

    CFAuth --> D1
    CFAuth --> KV
    CFPod --> R2
    CFPod --> KV
    CFSearch --> R2
    CFRelay --> D1
    CFRelay --> DO
```

### CI/CD Workflows

| Workflow | Trigger | Deploys To |
|----------|---------|------------|
| `deploy.yml` | Push to main | GitHub Pages (SPA + forum) + Cloudflare Pages (opt-in) |
| `workers-deploy.yml` | Push to main (workers/) | Cloudflare Workers (all 5 services) |

---

## Project Structure

```
src/                          # React SPA source
  App.tsx                     # Root: QueryClient, Router, lazy routes
  main.tsx                    # Vite entry point
  pages/                      # 13 route page components
  components/                 # Reusable components
    ui/                       # 50+ shadcn/ui primitives
    VoronoiGoldenHero.tsx     # 3D golden ratio Voronoi
    TesseractProjection.tsx   # 4D hyperdimensional visualisation
  hooks/                      # Custom React hooks
  lib/                        # Utilities, Supabase client, markdown
  data/                       # Static data (skills.json, workshop-list.json)

public/
  data/                       # Runtime-loaded content
    team/                     # 44 expert profiles (markdown + images)
    workshops/                # 15 workshop directories
    showcase/                 # Portfolio project manifests
    media/                    # Videos, thumbnails
  images/                     # Static image assets

community-forum/              # SvelteKit forum (separate package.json)
  src/routes/                 # 16 Svelte routes
  src/lib/auth/               # WebAuthn PRF + NIP-98
  src/lib/stores/             # Auth state, privkey closure
  packages/nip98/             # Consolidated NIP-98 shared module
  services/
    auth-api/                 # Legacy reference code (migrated to workers/)

workers/                      # Cloudflare Workers (deployed)
  auth-api/                   # WebAuthn Worker (D1 + KV)
  pod-api/                    # Pod storage Worker (R2 + KV)
  search-api/                 # RuVector WASM search Worker (R2 + KV)
  nostr-relay-api/            # WebSocket relay Worker (D1 + Durable Objects)
  link-preview-api/           # OG metadata Worker (Cache API)
  shared/                     # Shared NIP-98 utilities

wasm-voronoi/                 # Rust WASM (Cargo.toml, src/lib.rs)

scripts/                      # Build and utility scripts
docs/                         # Project documentation
.github/workflows/            # CI/CD pipelines
```

---

## Related Documents

- [Feature status matrix](features/STATUS_MATRIX.md)
- [Cloudflare migration PRD](prd-cloudflare-workers-migration.md)
- [Security overview](security/SECURITY_OVERVIEW.md)
- [Domain model](ddd/01-domain-model.md)
- [Frontend architecture](architecture/FRONTEND_ARCHITECTURE.md)
- [Backend services](architecture/BACKEND_SERVICES.md)
- [Data flow](architecture/DATA_FLOW.md)

---

**Last updated:** 2026-03-01
