# PRD: Return to Cloudflare Platform + Consolidated NIP-98 + Per-User Solid Storage

**Status:** Draft v4 -- Implementation In Progress
**Author:** Claude Code (research synthesis from 7 parallel research agents)
**Date:** 2026-03-01
**Stakeholders:** DreamLab AI Engineering

---

## 1. Executive Summary

This PRD proposes three interconnected changes to the DreamLab AI community forum:

1. **Consolidate NIP-98 authentication** using `nostr-tools/nip98` (already installed) to eliminate ~330 lines of duplicated custom crypto across 4 services
2. **Return to the Cloudflare platform** (Workers, Pages, KV, R2, D1) — the platform DreamLab previously used before the 2026-01-25 GCP migration
3. **Harden per-user Solid pod storage** with R2 persistence, custom WAC-based JSON-LD ACL enforcement, and NIP-98-authenticated pod access

### Research Corrections

| Initial Assumption | Finding |
|---|---|
| "Previously used cloudflared containers" | Previously used **Cloudflare Workers + R2** (relay called "Nosflare"). Migrated to GCP Cloud Run on 2026-01-25 (commit `7df51e1`). ADR-003 rejected Workers citing "WebSocket limitations, D1 immaturity" — both now resolved. |
| "paa.pub is a cloudflared implementation" | paa.pub runs on **Cloudflare Workers + KV + R2** (zero containers). Proves Solid Pod + WebAuthn works entirely on Workers edge compute. |
| "`nip98` npm package can replace custom auth" | `nip98` v0.0.1 (4 days old, no crypto verification, no signature checking) is **not viable**. `nostr-tools/nip98` (v2.19.3+, already in `package.json`) **is viable** — provides `getToken()`, `validateEvent()`, `unpackEventFromToken()`, and granular validators with full Schnorr verification. |
| "Migrate SPA to Vinext (Cloudflare-native)" | Vinext reimplements the **Next.js** API on Vite. DreamLab is already a Vite SPA — Vinext solves a problem DreamLab doesn't have. Requires React 19.2+ (DreamLab is on 18.3) and Vite 7+ (DreamLab is on 5.4). **Not applicable.** Deploy static assets to **Cloudflare Pages** instead. |
| "Use WebACL library for ACL enforcement" | webacl.github.io is **documentation only** (4-day-old static site, no code/npm package). The WAC specification it documents is the correct ACL model. Existing WAC libraries (`@solid/acl-check`, `solid-acl-parser`) are unmaintained and depend on `rdflib` (incompatible with Workers). Build a custom **JSON-LD ACL evaluator** (~200 lines, zero deps). |
| "RuVector memory accessible via MCP" | `ruvector-postgres` container **not running** — env vars set but no container exists on any Docker network. MCP claude-flow also broken (`autoStart: false`, npm cache failure). Needs restoration or migration to Cloudflare-native storage. |

---

## 2. Problem Statement

### 2.1 NIP-98 Code Duplication (4 implementations, ~680 LOC)

| Service | File | Lines | Role |
|---|---|---|---|
| Client (browser) | `src/lib/auth/nip98-client.ts` | 106 | Token creation + fetch wrapper |
| auth-api (Express) | `services/auth-api/src/nip98.ts` | 172 | Server verification |
| nostr-relay | `services/nostr-relay/src/nip98.ts` | 283 | Server verification |
| image-api | `services/image-api/src/server.ts:427-537` | 117 | Inline server verification |

Each independently reimplements: NIP-01 event ID computation, Schnorr signing/verification, SHA-256 payload hashing, base64 encoding/decoding, timestamp validation (+-60s), URL/method tag matching. **~330 lines directly replaceable** with `nostr-tools/nip98`.

### 2.2 GCP Cloud Run Cost & Complexity

| Service | Config | Est. Monthly |
|---|---|---|
| nostr-relay | 512Mi, **always-on** (min=1, no-cpu-throttle), Cloud SQL | ~$15-25 |
| visionflow-bridge | 512Mi, **always-on** (min=1, no-cpu-throttle) | ~$15-25 |
| auth-api | 512Mi, scale-to-zero, Cloud SQL | ~$2-5 |
| jss | 1Gi, scale-to-zero | ~$2-5 |
| image-api | 512Mi, scale-to-zero, max 10 | ~$1-3 |
| embedding-api | Via Cloud Build | ~$1-3 |
| Cloud SQL (`nostr-db`) | Always-on PostgreSQL | ~$10-30 |
| Artifact Registry + Secrets + Storage | Supporting infra | ~$2-4 |
| **Total** | | **~$50-100/mo** |

Additional complexity: 8 GitHub Actions workflows, chicken-and-egg bootstrap (SECRETS_SETUP.md 8-step sequence), Artifact Registry docker builds, IAM service accounts, Secret Manager versioning.

### 2.3 Solid Pod Storage Gaps

| Gap | Severity | Detail |
|---|---|---|
| Ephemeral storage | **Critical** | `/data/pods` lost on every container restart/scale-down |
| Permissive ACLs | **Critical** | Root `.acl` grants Read/Write/Append/Control to `foaf:Agent` (world-writable) |
| No frontend I/O | Medium | `podUrl`/`webId` returned to client but never used |
| CSS auth mismatch | High | CSS uses Solid-OIDC (DPoP/Bearer); forum uses NIP-98. CSS doesn't understand NIP-98. |
| Password not stored | Medium | Per-pod CSS password is random, generated once, never persisted |

### 2.4 RuVector Memory Unavailable

The `ruvector-postgres` container expected on the `docker_ragflow` network does not exist. Env vars (`RUVECTOR_PG_CONNINFO`) are configured but point to a non-running service. The MCP claude-flow memory tools are also non-functional (`autoStart: false`, npm cache broken). Cross-session memory and vector search are effectively offline.

---

## 3. Proposed Architecture

### 3.1 Target State Overview

```
                    Cloudflare Edge (300+ PoPs)
                    ┌─────────────────────────────────────┐
                    │                                     │
  Browser ─────────►│  Pages ─── Static SPA (React/Vite)  │
                    │                                     │
                    │  Workers ─── auth-api (WebAuthn)     │
                    │         │    ├─ D1 (credentials)     │
                    │         │    ├─ KV (sessions)        │
                    │         │    └─ NIP-98 verification  │
                    │         │                            │
                    │         ├── pod-api (Solid storage)  │
                    │         │    ├─ R2 (pod files)       │
                    │         │    ├─ KV (ACLs, metadata)  │
                    │         │    └─ WAC enforcement      │
                    │         │                            │
                    │         ├── search-api (WASM search) │
                    │         │    ├─ R2 (vectors, .rvf)   │
                    │         │    ├─ KV (SEARCH_CONFIG)   │
                    │         │    └─ rvf-wasm (42KB WASM) │
                    │         │                            │
                    │         ├── image-api                │
                    │         │    └─ R2 (uploads)         │
                    │         │                            │
                    │         └── link-preview-api         │
                    │                                     │
                    └─────────────────────────────────────┘

                    GCP Cloud Run (us-central1) — retained
                    ┌─────────────────────────────────────┐
                    │  nostr-relay (WebSocket, always-on)  │
                    │  ├─ Cloud SQL or D1 replica          │
                    │  └─ NIP-98 verification              │
                    │                                     │
                    │  embedding-api (ML inference)        │
                    └─────────────────────────────────────┘
```

### 3.2 Frontend: Cloudflare Pages (not Vinext)

Deploy the existing Vite SPA to Cloudflare Pages with zero code changes:

```bash
# Build as normal
npm run build

# Deploy via wrangler
npx wrangler pages deploy dist/ --project-name=dreamlab-ai
```

| Aspect | GitHub Pages (current) | Cloudflare Pages (proposed) |
|---|---|---|
| Cost | Free | Free (unlimited bandwidth) |
| CDN | GitHub CDN | Cloudflare CDN (300+ PoPs) |
| Build | GitHub Actions → `dist/` → gh-pages | GitHub Actions → `dist/` → Cloudflare Pages |
| Custom domain | CNAME file | Cloudflare DNS |
| Preview deploys | None | Automatic per PR |
| Headers/redirects | None | `_headers`/`_redirects` files |
| Analytics | None | Free built-in |
| SPA routing | 404.html fallback | `_redirects` with `/* /index.html 200` |

**No framework migration required.** The Vite build output (`dist/`) deploys directly. React 18.3, React Router 6.26, Three.js, shadcn/ui — all unchanged.

### 3.3 NIP-98 Consolidation

#### What `nostr-tools/nip98` provides (already installed, v2.19.3+)

```typescript
// Token creation (replaces createNip98Token)
getToken(url, method, sign, includeScheme?, payload?): Promise<string>

// Comprehensive validation (replaces all server verify functions)
validateEvent(event, url, method, body?): Promise<boolean>

// Granular validators
unpackEventFromToken(token: string): Promise<Event>
validateEventTimestamp(event: Event): boolean
validateEventKind(event: Event): boolean
validateEventUrlTag(event: Event, url: string): boolean
validateEventMethodTag(event: Event, method: string): boolean
validateEventPayloadTag(event: Event, payload: any): boolean
```

#### DreamLab-specific hardening (retained as thin wrappers)

| Feature | Reason | Services |
|---|---|---|
| `RP_ORIGIN` URL reconstruction | Anti-SSRF: never trust forwarded headers | auth-api |
| Raw body payload hashing | Hash actual bytes, not `JSON.stringify()` | auth-api, image-api |
| `Basic nostr:` header fallback | Git client compatibility | relay |
| Method wildcard (`*`) | Admin endpoint flexibility | relay |
| URL prefix matching | Git path compatibility | relay |
| 64KB event size limit | DoS prevention | all servers |
| Multipart payload skip | FormData consumed by multer | image-api |

#### Shared module: `packages/nip98/`

```
community-forum/
  packages/
    nip98/
      index.ts          # Re-exports from nostr-tools/nip98 + DreamLab wrappers
      verify.ts         # ~40 lines: unpack → validate → verify sig → check payload
      sign.ts           # ~20 lines: privkey signer adapter for getToken()
      types.ts          # VerifyOptions, VerifyResult interfaces
```

**Client adapter** (wraps raw privkey for `getToken()`):
```typescript
import { getToken } from 'nostr-tools/nip98';
import { finalizeEvent } from 'nostr-tools';

export function createSigner(privkey: Uint8Array) {
  return (event: EventTemplate) => finalizeEvent(event, privkey);
}

export async function createNip98Token(privkey: Uint8Array, url: string, method: string, body?: Uint8Array) {
  return getToken(url, method, createSigner(privkey), true, body ? await hashRawBody(body) : undefined);
}
```

**Server verifier** (shared by auth-api, relay, image-api):
```typescript
import { unpackEventFromToken, validateEventKind, validateEventTimestamp,
         validateEventMethodTag } from 'nostr-tools/nip98';
import { verifyEvent } from 'nostr-tools';

export interface VerifyOptions {
  url: string;              // Caller constructs (RP_ORIGIN for auth-api)
  method: string;
  rawBody?: ArrayBuffer;    // For payload hash verification against raw bytes
  maxSize?: number;         // Default 64KB
  allowBasicNostr?: boolean; // For relay git client compat
}

export async function verifyNip98(authHeader: string, opts: VerifyOptions): Promise<{ pubkey: string } | null> {
  // ~40 lines total
}
```

#### Per-service migration

| Service | Remove | Keep Custom | Add Dep |
|---|---|---|---|
| `nip98-client.ts` | `createNip98Token()`, `computeEventId()` (~52 lines) | `fetchWithNip98()` wrapper | Import from `packages/nip98` |
| auth-api `nip98.ts` | Entire file (~172 lines) → replace with ~30-line wrapper | `RP_ORIGIN` URL construction, raw body capture | `nostr-tools` to `package.json` |
| relay `nip98.ts` | Core verification (~180 lines) | `Basic nostr:` parsing, URL prefix matching, `pubkeyToDidNostr()` | Import from `packages/nip98` |
| image-api `server.ts` | `verifyNip98Auth()` (~117 lines) | Multipart body handling, `getRequestUrl()` | Import from `packages/nip98` |

**Net reduction: ~330 lines removed, ~90 lines added (shared module + service wrappers) = ~240 lines saved.**

### 3.4 Cloudflare Workers Migration

#### Service migration matrix

| Service | Migrate? | Target | Rationale |
|---|---|---|---|
| **auth-api** | **Yes → Workers** | D1 + KV | WebAuthn + NIP-98 proven on Workers (paa.pub). PostgreSQL schema maps cleanly to D1 (SQLite). |
| **jss → pod-api** | **Yes → Workers** | R2 + KV | Replace CSS 7.x with custom Workers-native pod storage. paa.pub proves the pattern. No UI needed — DreamLab has its own frontend. |
| **search-api** | **Yes → Workers** | R2 + KV + WASM | WASM-powered vector similarity search. 42KB rvf-wasm microkernel. 490K vec/sec ingest, 0.47ms query. **Code complete.** |
| **image-api** | **Yes → Workers** | R2 | Image storage on R2. Transforms via Workers paid tier (30s CPU). |
| **link-preview-api** | **Yes → Workers** | (stateless) | Lightweight HTTP fetch + parse. Natural Workers fit. |
| **nostr-relay** | **No → Keep Cloud Run** | Cloud SQL | Persistent WebSockets. Durable Objects possible but adds complexity. Evaluate separately. |
| **embedding-api** | **No → Keep Cloud Run** | (stateless) | ML inference needs CPU/memory beyond Workers limits. |
| **visionflow-bridge** | **Evaluate** | Durable Objects? | Always-on + external WebSocket. Candidate for Durable Objects Hibernation API. |

#### ADR-003 rejection reasons — status update

| Original Rejection (2024-02-01) | Current Status (2026-02-28) |
|---|---|
| "WebSocket limitations" | Durable Objects support WebSockets (GA). Hibernation API reduces idle costs. |
| "D1 immaturity" | D1 is GA with production SLA. Supports transactions, indexes, 10GB databases. |
| "Worker size limits" | 10MB paid tier. WASM modules supported. paa.pub runs Oxigraph SPARQL in WASM. |
| "No persistent storage" | R2, D1, KV all provide durable storage with SLAs. |

#### Cost comparison

| Component | GCP (current) | Cloudflare (proposed) |
|---|---|---|
| auth-api | ~$2-5/mo (Cloud Run) | **$0** (Workers free) or **$5/mo** (paid) |
| jss/pod-api | ~$2-5/mo (Cloud Run) | Included in Workers plan |
| image-api | ~$1-3/mo (Cloud Run) | Included in Workers plan |
| link-preview-api | ~$1-2/mo (Cloud Run) | Included in Workers plan |
| nostr-relay | ~$15-25/mo (always-on) | ~$15-25/mo (keep on Cloud Run) |
| embedding-api | ~$1-3/mo | ~$1-3/mo (keep on Cloud Run) |
| visionflow-bridge | ~$15-25/mo (always-on) | Evaluate (keep or Durable Objects) |
| Cloud SQL | ~$10-30/mo | **$0** if relay moves to D1, else reduced |
| Artifact Registry | ~$1-2/mo | **$0** (no containers for migrated services) |
| Secret Manager | ~$0.50/mo | **$0** (Workers secrets are free) |
| Cloud Storage | ~$1-2/mo | **$0** (migrate to R2, 10GB free) |
| Cloudflare D1 | N/A | **$0** (free: 5M reads/day, 100K writes/day) |
| Cloudflare KV | N/A | **$0** (free: 100K reads/day) or **$5/mo** |
| Cloudflare R2 | N/A | **$0** (10GB free storage) |
| Cloudflare Pages | N/A | **$0** (unlimited sites, 500 builds/mo) |
| **Total** | **~$50-100/mo** | **~$20-40/mo** |

**Savings: ~$30-60/month (50-60% reduction).** With relay on Durable Objects: potentially **~$10-20/mo**.

#### Free tier constraints

| Resource | Free Limit | Impact |
|---|---|---|
| Worker requests | 100K/day | ~70 req/min sustained. Sufficient for current traffic. |
| KV writes | **1K/day** | **Bottleneck for content creation.** $5/mo plan required for production. |
| D1 reads | 5M/day | More than sufficient. |
| D1 writes | 100K/day | Sufficient for auth operations. |
| R2 storage | 10GB | Monitor pod growth. |
| Worker CPU | 10ms (free) / 30s (paid) | Free tier tight for image processing. |
| Pages builds | 500/month | ~16/day. Sufficient. |

**Recommendation:** Free tier for staging/development. $5/mo paid plan for production (removes KV write limit, extends CPU to 30s).

### 3.5 Per-User Solid Pod Storage on Workers + R2

#### Architecture (no CSS, no UI — DreamLab frontend handles presentation)

```
Client (DreamLab SPA)
  │
  │  PUT /pods/{pubkey}/data/post.json
  │  Authorization: Nostr <base64(kind:27235)>
  │
  ▼
Workers pod-api
  ├─ NIP-98 verify → extract pubkey
  ├─ ACL check: pubkey === resource owner? mode allowed?
  ├─ R2: store/retrieve file
  └─ KV: store/retrieve metadata + ACL documents
```

**Storage layout:**
```
R2 bucket: dreamlab-pods
  pods/{pubkey}/profile/card       # WebID document (JSON-LD)
  pods/{pubkey}/data/...           # User content files
  pods/{pubkey}/media/...          # User uploaded media

KV namespace: POD_META
  acl:{pubkey}                     # Pod ACL document (JSON-LD)
  meta:{pubkey}                    # Pod metadata (created_at, storage_used, etc.)
  profile:{pubkey}                 # Cached profile data
```

#### WAC-Based ACL Enforcement (JSON-LD, ~200 lines)

Store ACL documents as **JSON-LD** (not Turtle) — parseable with `JSON.parse()`, no RDF library needed:

```json
{
  "@context": {
    "acl": "http://www.w3.org/ns/auth/acl#",
    "foaf": "http://xmlns.com/foaf/0.1/"
  },
  "@graph": [
    {
      "@id": "#owner",
      "@type": "acl:Authorization",
      "acl:agent": { "@id": "did:nostr:124c0fa994..." },
      "acl:accessTo": { "@id": "./" },
      "acl:default": { "@id": "./" },
      "acl:mode": [
        { "@id": "acl:Read" },
        { "@id": "acl:Write" },
        { "@id": "acl:Control" }
      ]
    },
    {
      "@id": "#public",
      "@type": "acl:Authorization",
      "acl:agentClass": { "@id": "foaf:Agent" },
      "acl:accessTo": { "@id": "./profile/" },
      "acl:mode": [
        { "@id": "acl:Read" }
      ]
    }
  ]
}
```

**Evaluator logic** (custom, ~200 lines, zero dependencies):
```
1. Extract pubkey from NIP-98 Authorization header
2. Construct agent URI: did:nostr:{pubkey}
3. Determine requested mode from HTTP method:
   GET/HEAD → acl:Read
   PUT/DELETE → acl:Write
   POST → acl:Append
4. Fetch effective ACL from KV:
   acl:{resource-owner-pubkey} (pod-level)
   Walk up path hierarchy for container-specific ACLs
5. Evaluate rules:
   - Match acl:agent against did:nostr:{pubkey}
   - Match acl:agentClass foaf:Agent (public) or acl:AuthenticatedAgent
   - Check acl:mode includes requested mode
   - Check acl:accessTo or acl:default covers the resource path
6. Allow or deny
```

**Why JSON-LD instead of Turtle:**
- `JSON.parse()` is native to V8 isolates (Workers, browsers)
- No `rdflib`, `N3.js`, or Turtle parser needed
- All existing WAC libraries (`@solid/acl-check`, `solid-acl-parser`) are unmaintained and depend on Node.js-only `rdflib`
- JSON-LD is a valid RDF serialization — semantically equivalent to Turtle
- paa.pub's approach validates this pattern

#### Pod provisioning (replaces JSS `jss-client.ts`)

During registration, instead of the current 4-step CSS account/pod API:

```typescript
// In auth-api Worker (or called from it)
async function provisionPod(pubkey: string, env: Env): Promise<PodInfo> {
  // 1. Create default ACL in KV
  await env.POD_META.put(`acl:${pubkey}`, JSON.stringify(defaultOwnerAcl(pubkey)));

  // 2. Create profile stub in R2
  await env.PODS.put(`pods/${pubkey}/profile/card`, JSON.stringify({
    "@context": { ... },
    "@id": `did:nostr:${pubkey}`,
    "@type": "foaf:Person"
  }));

  // 3. Store metadata
  await env.POD_META.put(`meta:${pubkey}`, JSON.stringify({
    created: Date.now(),
    storageUsed: 0
  }));

  return {
    webId: `https://pods.dreamlab-ai.com/${pubkey}/profile/card#me`,
    podUrl: `https://pods.dreamlab-ai.com/${pubkey}/`
  };
}
```

### 3.6 RuVector Memory Integration

RuVector provides cross-session agent memory and semantic vector search for the DreamLab AI development workflow. It runs as a standalone service with embedded storage -- not dependent on PostgreSQL.

#### Architecture

RuVector operates as a self-contained Rust-based vector database with the following characteristics:

| Property | Value |
|---|---|
| **Storage engine** | Embedded redb (not PostgreSQL) |
| **Node.js binding** | Pre-built at `/home/devuser/workspace/ruvector/bindings-linux-x64-gnu/ruvector.node` |
| **HTTP server port** | 8100 |
| **Vector dimensions** | 384 |
| **Index type** | HNSW (Hierarchical Navigable Small World) |
| **Consensus** | Raft (for multi-node, single-node default) |

#### Integration points

- **Cross-session agent memory**: Agents store and retrieve learned patterns, reasoning trajectories, and task outcomes across sessions via vector similarity search
- **Semantic vector search**: 384-dimensional embeddings enable fuzzy matching of code patterns, architecture decisions, error resolutions, and implementation strategies
- **MCP integration**: Configured in `.mcp.json` as part of the claude-flow MCP server, providing `memory_store`, `memory_search`, and `memory_retrieve` tool bindings to Claude Code agents

#### Usage

```bash
# Health check
curl http://localhost:8100/health

# Store a vector
curl -X POST http://localhost:8100/vectors \
  -H "Content-Type: application/json" \
  -d '{"id": "pattern-001", "vector": [0.1, 0.2, ...], "metadata": {"task": "auth-migration"}}'

# Search by similarity
curl -X POST http://localhost:8100/search \
  -H "Content-Type: application/json" \
  -d '{"vector": [0.1, 0.2, ...], "k": 5, "threshold": 0.85}'
```

#### Relationship to Cloudflare migration

RuVector is a development-time tool for agent coordination and memory -- it does not run in production alongside the DreamLab website services. The Cloudflare migration (Workers, Pages, D1, KV, R2) handles production infrastructure. RuVector continues to operate within the development container environment regardless of which cloud platform hosts the production services.

For production vector search requirements (e.g., embedding-api), the existing GCP Cloud Run deployment is retained per ADR-010. Cloudflare Vectorize remains an option for future evaluation if edge-native vector search becomes necessary.

---

## 4. Migration Phases

### Phase 0: Immediate Fixes (Week 1)
- [ ] Fix JSS ephemeral storage: mount GCS FUSE volume on Cloud Run JSS service
- [ ] Fix JSS ACL: replace permissive root `.acl` with owner-restricted ACL in Dockerfile
- [x] Add `nostr-tools` to `services/auth-api/package.json`
- [ ] Restore `ruvector-postgres` container on `docker_ragflow` network (or create DB in `vircadia_world_postgres`)

### Phase 1: NIP-98 Consolidation (Weeks 1-2)
- [x] Create `community-forum/packages/nip98/` shared module
- [x] Refactor `nip98-client.ts` → use `packages/nip98/sign.ts` + `getToken()`
- [x] Refactor auth-api `nip98.ts` → use `packages/nip98/verify.ts` + RP_ORIGIN wrapper
- [x] Refactor relay `nip98.ts` → use shared verify + retain `Basic nostr:`/URL prefix matching
- [x] Refactor image-api `verifyNip98Auth()` → use shared verify + retain multipart handling
- [ ] Update tests (`nostr-relay/tests/unit/nip98.test.ts`)
- [ ] E2E test: passkey register → login → NIP-98 protected endpoints

### Phase 2: Cloudflare Infrastructure Setup (Weeks 2-3)
- [ ] Reactivate or create Cloudflare account (check if Nosflare-era account accessible)
- [x] Create Wrangler project (`wrangler.toml`) -- complete with all bindings for auth-api, pod-api, search-api
- [ ] Create D1 database: migrate `webauthn_credentials` + `challenges` schema (needs `wrangler d1 create`)
- [ ] Create KV namespaces: `SESSIONS`, `POD_META`, `CONFIG`, `SEARCH_CONFIG` (needs `wrangler kv namespace create`)
- [ ] Create R2 buckets: `dreamlab-pods`, `dreamlab-vectors` (needs `wrangler r2 bucket create`)
- [ ] Set up Cloudflare Pages project for the SPA
- [ ] Configure custom domains (`api.dreamlab-ai.com`, `pods.dreamlab-ai.com`, `search.dreamlab-ai.com`)
- [x] Set up GitHub Actions with `cloudflare/wrangler-action@v3` (`workers-deploy.yml` exists)

### Phase 3: Frontend to Cloudflare Pages (Week 3)
- [ ] Add `_redirects` file for SPA routing (`/* /index.html 200`)
- [ ] Update GitHub Actions deploy workflow: `wrangler pages deploy dist/`
- [ ] Configure custom domain in Cloudflare Pages
- [ ] Verify all routes, 3D scenes, lazy loading work
- [ ] Cut over DNS from GitHub Pages to Cloudflare Pages

### Phase 4: auth-api to Workers (Weeks 3-5)
- [x] Port Express routes to Workers fetch handler (`workers/auth-api/index.ts`)
- [x] Migrate PostgreSQL → D1 (`webauthn_credentials`, `challenges` tables) -- code written, D1 database needs creation
- [x] Replace Express sessions with KV-backed sessions (paa.pub pattern)
- [x] Port WebAuthn registration/authentication (Web Crypto API compatible)
- [x] Port NIP-98 verification (use consolidated `packages/nip98` + `workers/shared/nip98.ts`)
- [x] Replace JSS pod provisioning with direct R2 + KV writes
- [ ] Deploy to Workers staging domain, test (pending Cloudflare account setup)
- [ ] Cut over, decommission Cloud Run auth-api + JSS

### Phase 5: Pod Storage on Workers + R2 (Weeks 5-7)
- [ ] Implement pod-api Worker: CRUD for pod resources on R2
- [ ] Implement JSON-LD WAC evaluator (~200 lines)
- [ ] Implement NIP-98 → `did:nostr:{pubkey}` → ACL check pipeline
- [ ] Per-pod ACL provisioning during registration
- [ ] Default ACL: owner full control, public read on profile only
- [ ] Build frontend pod I/O (profile data, user content)
- [ ] Migrate any existing pod data from CSS/GCS to R2
- [ ] Decommission Cloud Run JSS service

### Phase 6: Additional Service Migrations (Weeks 7-9)
- [ ] Migrate image-api to Workers + R2
- [ ] Migrate link-preview-api to Workers
- [ ] Evaluate nostr-relay on Durable Objects (WebSocket + Hibernation API)
- [ ] Evaluate visionflow-bridge on Durable Objects
- [ ] Decommission migrated Cloud Run services
- [ ] Decommission Cloud SQL if relay moves
- [ ] Create ADR-004 documenting the return to Cloudflare

### Phase 7: Cleanup (Week 9+)
- [ ] Remove `.yml.disabled` workflow files
- [ ] Update stale docs (`docs/architecture.md`, `docs/security/security-audit.md`, `docs/reference/architecture-reference.md`)
- [ ] Remove Artifact Registry images for migrated services
- [ ] Close GCP billing alerts for decommissioned services
- [ ] Update `CLAUDE.md` with new Cloudflare architecture
- [ ] Update `GCP_MIGRATION_SUMMARY.md` (or archive it)

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| D1 schema limitation | Low | High | Prototype auth-api schema on D1 in Phase 2 before committing |
| KV 1K writes/day on free tier | High | Medium | Use $5/mo paid plan for production |
| Workers 10ms CPU limit on free tier | Medium | Low | Use paid plan (30s limit) for image processing |
| `nostr-tools/nip98` `hashPayload()` uses `JSON.stringify` not raw bytes | High | High | Keep raw body hashing as custom wrapper (already in shared module design) |
| `nostr-tools/nip98` timestamp validation is past-only | Medium | Medium | Use individual validators with custom timestamp check |
| WebSocket relay on Durable Objects adds complexity | Medium | Medium | Keep relay on Cloud Run as fallback (Phase 6 evaluation) |
| Cloudflare Pages SPA routing edge cases | Low | Low | Verify all 13 routes + dynamic segments before DNS cutover |
| JSON-LD ACL evaluator misses WAC edge cases | Medium | Medium | Test against WAC test suite; keep evaluator simple and spec-compliant |
| R2 pod storage growth exceeds 10GB free tier | Low | Low | R2 is $0.015/GB/mo — negligible cost even at 100GB |

---

## 6. Success Metrics

| Metric | Current | Target |
|---|---|---|
| NIP-98 custom crypto LOC | ~680 | ~200 (shared module + service wrappers) |
| Monthly infrastructure cost | ~$50-100 | ~$20-40 ($5 Workers paid + retained Cloud Run) |
| Cold start latency (auth-api) | 1-10s (Cloud Run) | ~5ms (Workers) |
| Global request latency | 50-200ms (us-central1 only) | 5-20ms (nearest PoP) |
| Pod data durability | **None** (ephemeral) | 99.999999999% (R2) |
| Pod access control | World-writable | WAC: owner-only + public profile read |
| Deployment complexity | 8 workflows + 8-step bootstrap | 3-4 wrangler commands + Pages auto-deploy |
| Active GitHub Actions workflows | 8 + 4 disabled | 4-5 |
| Frontend deployment | Single region (GitHub Pages CDN) | 300+ edge PoPs (Cloudflare Pages) |
| RuVector memory | Non-functional | Operational (restored or migrated) |

---

## 7. Open Questions

1. **Is the original Cloudflare account from the Nosflare era still accessible?** If so, existing R2 data and Worker configs may be reusable.

2. **Should the nostr-relay move to Durable Objects or stay on Cloud Run?** The relay is the single largest cost center (~$15-25/mo always-on). Durable Objects with Hibernation API could reduce this, but adds Cloudflare-specific complexity. Evaluate in Phase 6.

3. **What frontend pod I/O is planned?** The `podUrl`/`webId` are returned to the client but unused. Defining the data model (forum posts? user profiles? settings?) drives the R2 storage design and ACL granularity.

4. **Should the shared `packages/nip98` module be an npm package or monorepo workspace?** Workspace avoids npm publishing overhead. Separate package enables reuse outside DreamLab.

5. **What is the actual monthly GCP bill?** Estimates are from configuration analysis. Actual billing data sharpens the cost comparison.

6. **Should we fork/adapt paa.pub's Solid Pod Worker implementation?** It's a proven pattern with WebAuthn, LDP containers, R2 storage, KV ACLs. Could accelerate Phase 5 significantly.

7. **RuVector restoration vs migration?** Short-term: restore the docker container. Long-term: evaluate Cloudflare Vectorize as an edge-native replacement for vector search.

---

## 8. Appendix A: Key File References

### NIP-98 Implementation (consolidation targets)

| File | Lines | Purpose |
|---|---|---|
| `community-forum/src/lib/auth/nip98-client.ts` | 106 | Client token creation |
| `community-forum/services/auth-api/src/nip98.ts` | 172 | Server verification |
| `community-forum/services/nostr-relay/src/nip98.ts` | 283 | Server verification |
| `community-forum/services/image-api/src/server.ts:427-537` | 117 | Inline server verification |
| `community-forum/services/nostr-relay/tests/unit/nip98.test.ts` | 80 | Unit tests |

### Solid Pod / JSS (replacement targets)

| File | Purpose |
|---|---|
| `community-forum/services/jss/Dockerfile` | CSS 7.x container (ephemeral, permissive ACL) |
| `community-forum/services/jss/entrypoint.sh` | CSS startup |
| `community-forum/services/jss/css-config.json` | CSS config (WAC enabled but root ACL is world-writable) |
| `community-forum/services/auth-api/src/jss-client.ts` | 4-step CSS pod provisioning API |
| `community-forum/services/auth-api/src/db.ts` | PostgreSQL schema (webid, pod_url columns) |

### Infrastructure Evidence

| File | Purpose |
|---|---|
| `.github/workflows/GCP_MIGRATION_SUMMARY.md` | Documents Workers → GCP migration |
| `docs/adr/003-gcp-cloud-run-infrastructure.md` | ADR rejecting Workers (reasons now outdated) |
| `community-forum/docker-compose.prod.yml:80-98` | Cloudflare tunnel template (forward-looking, unused) |
| `.github/workflows/fairfield-relay.yml` | Relay deployment (always-on, highest cost) |
| `.github/workflows/auth-api.yml` | auth-api deployment |
| `.github/workflows/jss.yml` | JSS deployment |
| `.github/workflows/SECRETS_SETUP.md` | 8-step bootstrap sequence |

### paa.pub Reference Patterns

| Pattern | File | DreamLab Application |
|---|---|---|
| Single fetch handler with DI | `src/index.js` | Workers routing for auth-api, pod-api |
| KV-backed sessions with TTL | `src/auth/session.js` | Replace Express sessions |
| WebAuthn without SQL DB | `src/auth/webauthn.js` | Credentials in D1 (or KV if schema is simple) |
| KV rate limiting | `src/security/rate-limit.js` | Edge rate limiting |
| SSRF protection | `src/security/ssrf.js` | Validate outbound fetch URLs |
| Solid Pod on Workers + R2 | `src/storage/` | Replace CSS 7.x entirely |
| WASM kernel for RDF | `src/kernel/` | Optional: Oxigraph for SPARQL if needed |

## Appendix B: WAC Specification Reference

Source: [W3C Web Access Control](https://solid.github.io/web-access-control-spec/) + [webacl.github.io](https://webacl.github.io/) documentation

| Concept | URI | Description |
|---|---|---|
| Read | `acl:Read` | GET, HEAD |
| Write | `acl:Write` | PUT, POST, PATCH, DELETE |
| Append | `acl:Append` | POST, INSERT-only PATCH |
| Control | `acl:Control` | Read/modify ACL documents |
| Agent | `acl:agent` | Specific identity (WebID or DID URI) |
| Agent Class | `acl:agentClass` | `foaf:Agent` (public) or `acl:AuthenticatedAgent` |
| Agent Group | `acl:agentGroup` | Members of a vcard:Group |
| Access To | `acl:accessTo` | Named resource |
| Default | `acl:default` | Inherited by children lacking own ACL |
| Origin | `acl:origin` | Restrict to specific web app origins |

DreamLab maps: `did:nostr:{pubkey}` → `acl:agent` identity. NIP-98 verification → authentication layer. JSON-LD ACL documents → parseable without RDF libraries.
