# DreamLab AI -- Feature Status Matrix

**Last updated:** 2026-02-28

This document tracks the status of every major feature and service in the DreamLab AI platform. It is the single source of truth for what is running, what is deployed but needs attention, what exists only as code, and what is broken.

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| **Running** | Deployed and functioning in production |
| **Deployed** | Deployed to production infrastructure but may have known issues |
| **Code only** | Source code written but not yet deployed |
| **Built** | Package/module built and tested locally, not deployed as a service |
| **Not running** | Expected to be available but currently offline or inaccessible |
| **Planned** | Documented in PRD or ADR but no code written |

---

## Frontend

| Feature | Status | Detail |
|---------|--------|--------|
| React SPA (13 routes) | **Running** | GitHub Pages at dreamlab-ai.com. Vite 5.4 + TypeScript 5.5 + Tailwind 3.4. All 13 routes lazy-loaded. |
| VoronoiGoldenHero 3D | **Running** | Three.js + @react-three/fiber. Golden ratio Voronoi tessellation with Rust WASM. |
| TesseractProjection 3D | **Running** | 4D hyperdimensional visualisation in Three.js. |
| Workshop content system | **Running** | 15 workshops in `public/data/workshops/`. Pre-build script generates `workshop-list.json`. |
| Team profiles | **Running** | 44 expert profiles loaded from markdown in `public/data/team/`. |
| Contact form | **Running** | React Hook Form + Zod validation. |
| Image optimisation | **Running** | Custom hooks for lazy loading, srcset, WebP conversion. |
| Code splitting | **Running** | Vite manual chunks (vendor, three, ui) + route-level lazy loading. |
| Supabase integration | **Running** | Main site data via Supabase PostgreSQL + Auth. |
| Community forum (SvelteKit) | **Running** | Builds and deploys to `/community` path on GitHub Pages via static adapter. |

## Backend Services -- GCP Cloud Run

| Service | Status | Config | Detail |
|---------|--------|--------|--------|
| auth-api | **Deployed** | 512Mi, scale-to-zero | WebAuthn registration/authentication + NIP-98 gating + JSS pod provisioning. Express + @simplewebauthn/server. PostgreSQL via Cloud SQL. |
| JSS (Solid pod storage) | **Deployed** | 1Gi, scale-to-zero | @solid/community-server 7.1.8. **Known issue:** ephemeral filesystem -- pod data at `/data/pods` lost on every container restart or scale-down. Root `.acl` is world-writable. CSS password not persisted. |
| nostr-relay | **Deployed** | 512Mi, always-on (min=1) | Custom Nostr relay with NIP-01 event handling and NIP-98 verification. PostgreSQL via Cloud SQL. |
| embedding-api | **Deployed** | Via Cloud Build | Vector embeddings for semantic search. |
| image-api | **Deployed** | 512Mi, scale-to-zero, max 10 | Image resizing and serving with NIP-98 auth. |
| link-preview-api | **Deployed** | 512Mi, scale-to-zero | URL metadata extraction (title, description, image). |

### Cloud Run Supporting Infrastructure

| Resource | Status | Detail |
|----------|--------|--------|
| Cloud SQL (nostr-db) | **Running** | Always-on PostgreSQL instance. Used by auth-api and nostr-relay. |
| Artifact Registry | **Running** | Docker image storage for Cloud Run deployments. |
| Secret Manager | **Running** | Stores DATABASE_URL, RELAY_URL, RP_ID, EXPECTED_ORIGIN, JSS_BASE_URL. |
| IAM service accounts | **Configured** | Per-service accounts for Cloud Run. |

## Backend Services -- Cloudflare Workers (Planned)

| Service | Status | Location | Replaces | Detail |
|---------|--------|----------|----------|--------|
| auth-api Worker | **Code only** | `workers/auth-api/index.ts` | Cloud Run auth-api | WebAuthn + NIP-98 on D1 + KV. Not yet deployed. Per ADR-010. |
| pod-api Worker | **Code only** | `workers/pod-api/index.ts` | Cloud Run JSS | Pod storage on R2 + KV with custom JSON-LD ACL evaluator (`workers/pod-api/acl.ts`). Not yet deployed. Per ADR-010. |
| image-api Worker | **Planned** | -- | Cloud Run image-api | Image storage on R2 with Workers transforms. No code written. |
| link-preview-api Worker | **Planned** | -- | Cloud Run link-preview-api | Stateless HTTP fetch + parse. No code written. |

## Shared Modules

| Module | Status | Location | Detail |
|--------|--------|----------|--------|
| NIP-98 shared package | **Built** | `community-forum/packages/nip98/` | Consolidated sign.ts, verify.ts, types.ts. Replaces 4 independent NIP-98 implementations (~330 lines removable). Uses `nostr-tools/nip98` (v2.19.3). |
| NIP-98 Workers shared | **Code only** | `workers/shared/nip98.ts` | NIP-98 utilities for Cloudflare Workers runtime. |
| WASM Voronoi | **Built** | `wasm-voronoi/` | Rust WASM module for Voronoi tessellation. Compiled and used by VoronoiGoldenHero component. |

## Authentication

| Feature | Status | Detail |
|---------|--------|--------|
| WebAuthn PRF registration | **Deployed** | Passkey creation with PRF extension. HKDF derives secp256k1 privkey. Requires PRF-capable authenticator. |
| WebAuthn PRF login | **Deployed** | Same PRF salt re-derives same privkey deterministically. Cross-device QR auth blocked (different PRF output). Windows Hello blocked (no PRF support). |
| NIP-98 HTTP auth | **Deployed** | Kind 27235 Schnorr-signed events. Used by auth-api, nostr-relay, image-api. |
| Solid pod provisioning | **Deployed** | auth-api calls JSS `/idp/register/` on registration. Returns WebID + podUrl. **Known issue:** pod data is ephemeral. |
| did:nostr identity | **Deployed** | `did:nostr:{pubkey}` format. Stored in auth-api. |
| NIP-07 browser extension | **Deployed** | Advanced login option in forum. Fallback to nsec input also available. |

## Forum Features

| Feature | Status | Detail |
|---------|--------|--------|
| Public channels (NIP-28) | **Deployed** | Channel-based messaging via nostr-relay. |
| Encrypted DMs (NIP-17/59) | **Deployed** | Gift-wrapped direct messages with NIP-44 encryption. |
| Calendar events (NIP-52) | **Deployed** | Event scheduling in forum. |
| User profiles | **Deployed** | Nickname setup after registration. Profile data on Nostr. |
| Admin approval flow | **Deployed** | New users require admin approval before accessing zones. |
| Semantic search | **Deployed** | Client-side WASM-based TF-IDF search. |

## Infrastructure and Tooling

| Feature | Status | Detail |
|---------|--------|--------|
| GitHub Pages deployment | **Running** | `deploy.yml` workflow. Builds SPA + forum, deploys to gh-pages branch. |
| Cloud Run CI/CD | **Running** | 5 workflows (auth-api, jss, relay, embedding-api, image-api). Docker builds via Artifact Registry. |
| RuVector memory | **Not running** | `ruvector-postgres` container expected on `docker_ragflow` network. Env vars configured (`RUVECTOR_PG_CONNINFO`) but container does not exist. Vector search and cross-session memory are offline. |
| MCP claude-flow | **Not running** | `autoStart: false` in config. npm cache issues prevent startup. Memory tools non-functional. |

---

## CI/CD Workflows

| Workflow | Trigger | Target | Status |
|----------|---------|--------|--------|
| `deploy.yml` | Push to main | GitHub Pages | **Running** |
| `auth-api.yml` | Push to main (services/auth-api/) | Cloud Run: auth-api | **Running** |
| `jss.yml` | Push to main (services/jss/) | Cloud Run: JSS | **Running** |
| `fairfield-relay.yml` | Push to main | Cloud Run: nostr-relay | **Running** |
| `fairfield-embedding-api.yml` | Push to main | Cloud Run: embedding-api | **Running** |
| `fairfield-image-api.yml` | Push to main | Cloud Run: image-api | **Running** |

---

## Known Issues

| Issue | Severity | Service | Detail |
|-------|----------|---------|--------|
| Ephemeral pod storage | Critical | JSS (Cloud Run) | Pod data at `/data/pods` lost on container restart or scale-down. No persistent volume. R2-backed pod-api Worker (ADR-010) is the planned fix. |
| World-writable root ACL | Critical | JSS (Cloud Run) | Root `.acl` grants Read/Write/Append/Control to `foaf:Agent`. All pods publicly writable. |
| CSS password not persisted | Medium | JSS (Cloud Run) | Per-pod CSS password generated randomly at provisioning, never stored. Cannot re-authenticate to CSS. |
| CSS auth mismatch | High | JSS (Cloud Run) | CSS uses Solid-OIDC (DPoP/Bearer). Forum uses NIP-98. CSS does not understand NIP-98 tokens. |
| Pod frontend unused | Medium | Forum | `podUrl` and `webId` returned to client after registration but never used in UI for data I/O. |
| Cold start latency | Medium | All Cloud Run | 1-10 seconds cold start on scale-to-zero services. Workers target: sub-5ms. |
| RuVector offline | Medium | Infrastructure | Container not running. No vector search or cross-session memory. |
| NIP-98 code duplication | Low | 4 services | ~680 lines across 4 implementations. Consolidated module built but not yet integrated into all services. |

---

## Migration Roadmap (ADR-010)

| Phase | Services | Target Platform | Status |
|-------|----------|----------------|--------|
| Phase 1 | auth-api, pod-api (replaces JSS) | Cloudflare Workers + D1 + KV + R2 | Code only |
| Phase 2 | image-api, link-preview-api | Cloudflare Workers + R2 | Planned |
| Phase 3 | Static site (SPA + forum) | Cloudflare Pages | Planned |
| Retained | nostr-relay, embedding-api | GCP Cloud Run | No change |

See [ADR-010](../adr/010-return-to-cloudflare.md) and the [migration PRD](../prd-cloudflare-workers-migration.md) for full details.

---

## Architecture Decision Records

All technology choices are documented in ADRs. The most relevant to current feature status:

| ADR | Relevance |
|-----|-----------|
| [ADR-003](../adr/003-gcp-cloud-run-infrastructure.md) | Original GCP decision -- now **superseded** |
| [ADR-010](../adr/010-return-to-cloudflare.md) | Return to Cloudflare -- governs migration roadmap |
| [ADR-008](../adr/008-postgresql-relay-storage.md) | PostgreSQL for relay -- retained on Cloud Run |
| [ADR-005](../adr/005-nip-44-encryption-mandate.md) | NIP-44 encryption mandate -- affects all DM features |

---

**Last updated:** 2026-02-28
