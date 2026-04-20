# Claude Code Configuration - DreamLab AI Website

## Project Overview

DreamLab AI is a premium AI training and consulting platform. This is a React SPA (Vite + TypeScript + Tailwind CSS) with a Leptos community forum (Rust/WASM), 3D WebGL visualizations (Three.js + Rust WASM), Supabase backend, Cloudflare Workers (Rust) backend services, and Nostr-based decentralized social features.

- **Domain:** dreamlab-ai.com
- **Hosting:** GitHub Pages (static site) + Cloudflare Workers (backend services)
- **Repository:** https://github.com/DreamLab-AI/dreamlab-ai-website

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.5 |
| Build | Vite 5.4 (SWC plugin) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Routing | React Router DOM 6.26 (lazy-loaded routes) |
| State/Data | TanStack React Query 5.56 |
| Forms | React Hook Form 7.53 + Zod 3.23 |
| 3D | Three.js 0.156 + @react-three/fiber + @react-three/drei |
| WASM | Rust (Voronoi tessellation in `wasm-voronoi/`) |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Protocol | Nostr (nostr-core crate) for community forum |
| Charts | Recharts 2.12, Mermaid 11.6 |
| Sanitization | DOMPurify 3.3 |
| Forum | Leptos 0.7 CSR (Rust/WASM in `community-forum-rs/crates/forum-client/`) |
| Workers | Rust (workers-rs) — 5 Cloudflare Workers in `community-forum-rs/crates/` |
| Forum Build | Trunk (WASM target) |
| Admin CLI | `community-forum-rs/crates/admin-cli/` — `forum-admin` Rust binary, NIP-98 authed, AI-agent friendly |
| Moderation | Nostr event kinds 30910-30914 (Ban, Mute, Warning, Report, ModerationAction) + D1 projections |
| WoT/Invites | Referente kind-3 whitelist, tenure-based invite credits, welcome bot |

## Build & Test Commands

```bash
# React marketing site
npm run dev                # Development server (generates workshop list first)
npm run build              # Production build
npm run build:dev          # Development build
npm run lint               # Lint (ESLint 9 flat config, TypeScript rules)
npm run preview            # Preview production build

# Leptos forum (Rust/WASM)
cargo check --target wasm32-unknown-unknown -p forum-client   # Type-check forum
cargo test -p nostr-core                                       # Run nostr-core tests (129 tests)
trunk build --release community-forum-rs/crates/forum-client/index.html  # Build forum WASM

# Rust workers
cargo check -p auth-worker -p pod-worker -p preview-worker -p relay-worker -p search-worker
```

- No test runner is configured for the main React website
- Build pre-step: `node scripts/generate-workshop-list.mjs` runs automatically before dev/build
- ESLint config: `eslint.config.js` (flat config, ignores `dist/`)
- Forum builds via Trunk with `--public-url /community/` for dual-SPA deployment

## Project Structure

```
src/
  App.tsx              # Root: QueryClient, TooltipProvider, BrowserRouter, lazy routes
  main.tsx             # Vite entry point
  pages/               # 13 route pages (lazy-loaded)
    Index.tsx           # Landing page (hero, featured, CTAs)
    Team.tsx            # Team profiles (loads markdown from public/data/team/)
    Work.tsx            # Portfolio/case studies
    Contact.tsx         # Contact form (React Hook Form + Zod)
    WorkshopIndex.tsx   # Workshop catalog
    WorkshopPage.tsx    # Individual workshop (:workshopId/:pageSlug)
    ResidentialTraining.tsx  # 2-day masterclass details
    Masterclass.tsx     # AI agent training program
    SystemDesign.tsx    # Architecture documentation
    ResearchPaper.tsx   # Research content
    Testimonials.tsx    # Customer reviews
    Privacy.tsx         # Privacy policy
    NotFound.tsx        # 404 page
  components/
    ui/                 # 50+ shadcn/ui primitives (Radix-based)
    VoronoiGoldenHero.tsx     # 3D golden ratio Voronoi (Three.js)
    TesseractProjection.tsx   # 4D hyperdimensional visualization
    TorusKnot.tsx             # Mathematical knot visualization
    Header.tsx                # Site navigation
    CourseCard.tsx             # Training card component
    WorkshopCard.tsx          # Workshop listing card
    WorkshopHeader.tsx        # Workshop page header
    EmailSignupForm.tsx       # Newsletter subscription
    ErrorBoundary.tsx         # Error boundary wrapper
    RouteLoader.tsx           # Suspense fallback
  hooks/
    use-mobile.tsx            # Mobile breakpoint detection
    use-toast.ts              # Toast notification hook
    use-optimized-images.ts   # Image optimization hook
    useOGMeta.ts              # Open Graph metadata hook
  lib/
    supabase.ts         # Supabase client init (uses VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    utils.ts            # cn() utility (clsx + tailwind-merge)
    og-meta.ts          # Open Graph metadata generation
    image-utils.ts      # Image optimization (lazy load, srcset, WebP)
    markdown.ts         # Markdown processing
  data/
    skills.json         # Skills taxonomy
    workshop-list.json  # Generated workshop metadata (from scripts/)
    work/               # Case study data

public/
  data/
    team/               # 44 expert profiles (markdown + images)
    workshops/          # 15 workshop directories with content
    showcase/           # Portfolio project manifests
    media/              # Videos, thumbnails
  images/               # Static image assets
  robots.txt, sitemap.xml, site.webmanifest, CNAME

community-forum-rs/     # Rust workspace (Cargo.toml)
  crates/
    forum-client/       # Leptos 0.7 CSR forum (WASM target)
      src/
        auth/           # passkey.rs, nip98.rs, nip07.rs, webauthn.rs, session.rs, http.rs
        stores/         # channels.rs, zone_access.rs, preferences.rs, notifications.rs, etc.
        pages/          # 17 page components (channel, chat, forums, login, settings, etc.)
        components/     # 58 UI components
        utils/          # search_client.rs, etc.
      index.html        # Trunk entry point
    nostr-core/         # Shared NIP implementations (NIP-01/07/09/29/33/40/42/45/50/52/98)
      src/nip98.rs      # NIP-98 auth (used by all workers + forum client)
    auth-worker/        # CF Worker: WebAuthn + NIP-98 + pod provisioning (D1 + KV + R2)
      src/lib.rs        # Worker entry point
    pod-worker/         # CF Worker: Solid pods, images/media, WAC ACL (R2 + KV)
      src/lib.rs        # Worker entry point
    preview-worker/     # CF Worker: OG metadata, Twitter oEmbed, SSRF protection (Cache API)
      src/lib.rs        # Worker entry point
    relay-worker/       # CF Worker: WebSocket relay + Durable Objects (D1 + DO)
      src/lib.rs        # Worker entry point (NIP-01/09/11/16/29/33/40/42/45/50/98)
    search-worker/      # CF Worker: RuVector, .rvf, cosine k-NN (R2 + KV)
      src/lib.rs        # Worker entry point
    admin-cli/          # forum-admin binary: NIP-98 authed HTTP client for ops + AI agents
      src/              # main.rs, auth.rs, client.rs, commands/{whitelist,wot,invite,mod_ops,channel}.rs
      AGENT.md          # AI-agent usage cheat sheet

wasm-voronoi/           # Rust WASM (Cargo.toml, src/lib.rs)

scripts/
  generate-workshop-list.mjs  # Pre-build: scans public/data/workshops/ → workshop-list.json
  generate-heroes.sh          # Hero image generation
  optimize-images.sh          # Image compression

.github/workflows/
  deploy.yml                  # GitHub Pages + CF Pages
  workers-deploy.yml          # 5 Cloudflare Workers
  docs-update.yml             # Documentation
```

## Routing

All routes are lazy-loaded via `React.lazy()` in `src/App.tsx`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Landing page |
| `/team` | Team | Expert profiles |
| `/work` | Work | Case studies |
| `/workshops` | WorkshopIndex | Workshop catalog |
| `/workshops/:workshopId` | WorkshopPage | Workshop detail |
| `/workshops/:workshopId/:pageSlug` | WorkshopPage | Workshop sub-page |
| `/residential-training` | ResidentialTraining | 2-day masterclass |
| `/masterclass` | Masterclass | AI agent training |
| `/contact` | Contact | Contact form |
| `/privacy` | Privacy | Privacy policy |
| `/system-design` | SystemDesign | Architecture docs |
| `/research-paper` | ResearchPaper | Research content |
| `/testimonials` | Testimonials | Customer reviews |
| `*` | NotFound | 404 page |

## Path Aliases

- `@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

## Key Patterns

- **Component style:** shadcn/ui primitives (Radix + Tailwind + CVA)
- **Styling:** Tailwind utility classes, CSS variables for theming (HSL), dark mode via `dark:` class
- **Forms:** React Hook Form + Zod schemas for validation
- **Data fetching:** TanStack React Query for server state
- **Content:** Workshop/team data stored as markdown in `public/data/`, loaded at runtime
- **3D scenes:** Three.js via @react-three/fiber (declarative), wrapped in Canvas components
- **Code splitting:** Vite manual chunks (vendor, three, ui) + route-level lazy loading
- **Image optimization:** Custom hooks for lazy loading, srcset, WebP conversion

## TypeScript Configuration

- Strict mode: **disabled** (noImplicitAny: false, strictNullChecks: false)
- Unused vars/params: **not enforced**
- Target: ES2020, Module: ESNext, JSX: react-jsx

## Environment Variables

### Main site `.env` (never commit)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AUTH_API_URL=https://dreamlab-auth-api.*.workers.dev
```

### community-forum-rs (Rust workers + forum client)
- Rust workers use `wrangler.toml` bindings (D1, KV, R2) — no `.env` files
- Forum client env vars are compile-time via `FORUM_BASE` env and Trunk build config
- API URLs are configured in forum-client source constants, not env files

## Deployment

- **Static site:** `npm run build` → `dist/` → GitHub Pages (gh-pages branch)
- **Community forum:** Trunk (Leptos/WASM) → `dist/community/` (dual-SPA with `--public-url /community/`)
- **Backend:** Cloudflare Workers (deployed via `workers-deploy.yml`)
- **Custom domain:** dreamlab-ai.com (CNAME file in public/)

### Cloudflare Workers

| Worker | Source | Storage | Purpose |
|--------|--------|---------|---------|
| auth-worker | `community-forum-rs/crates/auth-worker/` | D1 + KV + R2 | WebAuthn, NIP-98, pod provisioning, moderation API, WoT, invite credits, welcome bot |
| pod-worker | `community-forum-rs/crates/pod-worker/` | R2 + KV | Solid pods, images/media, WAC ACL |
| search-worker | `community-forum-rs/crates/search-worker/` | R2 + KV | RuVector, .rvf, cosine k-NN |
| relay-worker | `community-forum-rs/crates/relay-worker/` | D1 + DO | WebSocket relay + ingress mute/ban enforcement (mod_cache) |
| preview-worker | `community-forum-rs/crates/preview-worker/` | Cache API | OG metadata, Twitter oEmbed, SSRF protection |

All workers are Rust (workers-rs), deployed via `workers-deploy.yml`. Runtime: `"workers-rs"`.

### Admin CLI

`forum-admin` (crate `admin-cli`) is a headless NIP-98-authed HTTP client for ops and AI coding agents:

```bash
cargo run -p admin-cli -- --help
cargo run -p admin-cli -- whitelist add <pubkey>
cargo run -p admin-cli -- wot set-referente <pubkey>
cargo run -p admin-cli -- invite create --expiry 168
cargo run -p admin-cli -- mod ban <pubkey> --reason "spam"
```

`--json` flag on all commands for machine consumption. nsec is never persisted to disk — supplied via `--nsec`, `FORUM_ADMIN_NSEC` env, or `--bunker` NIP-46 URI. See `community-forum-rs/crates/admin-cli/AGENT.md` for AI-agent cheat sheet.

### Moderation event model

Nostr custom parameterized-replaceable events:

| Kind | Name | `d` tag | Signer |
|------|------|---------|--------|
| 30910 | Ban | banned pubkey | admin |
| 30911 | Mute | muted pubkey | admin (`expires` tag) |
| 30912 | Warning | warned pubkey + ts | admin |
| 30913 | Report | reported event id | any authed user |
| 30914 | ModerationAction | action uuid | admin |

Enforcement: relay-worker rejects kind-1/42 from pubkeys with active mute or any ban (60s DO-cached lookup against D1).

## Behavioral Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for the goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files unless explicitly requested
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER save working files to the root folder
- Run `npm run build` to verify changes compile before committing
- Run `npm run lint` to check for linting issues

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at form boundaries (Zod schemas)
- Always sanitize rendered HTML with DOMPurify
- Always validate file paths to prevent directory traversal (see vite.config.ts middleware)

## File Organization

- `/src/pages/` for route page components
- `/src/components/` for reusable components
- `/src/components/ui/` for shadcn/ui primitives
- `/src/hooks/` for custom React hooks
- `/src/lib/` for utilities and client setup
- `/src/data/` for static data files
- `/public/data/` for runtime-loaded content (markdown, manifests)
- `/scripts/` for build and utility scripts
- `/docs/` for project documentation

## Forum Auth Architecture

### Overview: Passkey-first, privkey-never-stored

The community forum uses WebAuthn PRF extension to derive a secp256k1 private key
deterministically from the user's passkey. The privkey is **never stored** — it lives
only in the auth session state and is re-derived on each login. It is zeroed on `pagehide`.

### Key derivation flow

```
WebAuthn PRF output (32 bytes, HMAC-SHA-256 from authenticator)
  → HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")
  → 32-byte secp256k1 private key
  → getPublicKey() → hex pubkey (Nostr identity)
```

**Critical constraints:**
- Same passkey credential + same PRF salt → same privkey (deterministic)
- Cross-device QR auth produces DIFFERENT PRF output → cannot derive key → blocked
- Windows Hello has no PRF support → blocked with error message
- PRF salt is generated at registration and stored server-side in `webauthn_credentials.prf_salt`

### Auth flow

```
Registration:
  1. Client: navigator.credentials.create() with PRF extension
  2. Client: check extensions.prf.enabled (abort if false)
  3. Client: HKDF(PRF output) → privkey → pubkey
  4. Server: store credential + prf_salt in D1
  5. Server: provision Solid pod in R2 with WAC ACL
  6. Server: return { didNostr, webId, podUrl }
  7. Client: store pubkey in auth state, privkey in closure

Authentication:
  1. Client: fetch /auth/login/options (returns stored prf_salt in extensions)
  2. Client: navigator.credentials.get() with same prf_salt
  3. Client: block hybrid transport (QR) but allow USB security keys
  4. Client: HKDF(PRF output) → privkey (same result as registration)
  5. Server: verify assertion, verify counter advanced, update counter
  6. Client: privkey in closure, ready to sign NIP-98 tokens

Note: Discoverable credentials allow new-device login — the authenticator stores
the credential ID, so the user can authenticate on any device with the same passkey
provider without needing to remember which credential was used.
```

### NIP-98 HTTP Auth

Every state-mutating API call uses NIP-98 `Authorization: Nostr <base64(event)>`:
- `kind: 27235`, tags: `u` (URL), `method`, optional `payload` (SHA-256 of body)
- Schnorr-signed with privkey from auth store closure
- Server recomputes event ID from NIP-01 canonical form and verifies independently
- Payload hash uses raw body bytes (server captures raw body for payload hash verification)

### Identity

- Nostr pubkey (hex) is the primary identity
- `did:nostr:<pubkey>` for DID-based interop
- WebID at `https://pods.dreamlab-ai.com/{pubkey}/profile/card#me` (Solid/Linked Data)

### Key files

| File | Role |
|------|------|
| `community-forum-rs/crates/forum-client/src/auth/passkey.rs` | WebAuthn PRF ceremony, HKDF derivation |
| `community-forum-rs/crates/forum-client/src/auth/nip98.rs` | NIP-98 token creation (client-side) |
| `community-forum-rs/crates/forum-client/src/auth/session.rs` | Auth session state, privkey management |
| `community-forum-rs/crates/forum-client/src/auth/mod.rs` | Auth module (AuthState, login/register flows) |
| `community-forum-rs/crates/nostr-core/src/nip98.rs` | NIP-98 verification (shared by all workers) |
| `community-forum-rs/crates/auth-worker/src/lib.rs` | CF Worker: WebAuthn + NIP-98 + pod provisioning |
| `community-forum-rs/crates/pod-worker/src/lib.rs` | CF Worker: Solid pod storage on R2 |
| `community-forum-rs/crates/search-worker/src/lib.rs` | CF Worker: RuVector vector search |
| `community-forum-rs/crates/preview-worker/src/lib.rs` | CF Worker: OG metadata proxy |

## Claude Flow V3 Integration

### MCP Server
Configured in `.mcp.json` — claude-flow MCP with v3 mode, hierarchical-mesh topology, max 15 agents, hybrid memory.

### Hooks
7 hook types in `.claude/settings.json`: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, Stop, PreCompact, SubagentStart, TeammateIdle, TaskCompleted.

### Skills & Agents
- 29 skills in `.claude/skills/`
- 10 command groups in `.claude/commands/`
- 24 agent categories in `.claude/agents/`

### Agentic QE v3
14 domains: test-generation, test-execution, coverage-analysis, quality-assessment, defect-intelligence, requirements-validation, code-intelligence, security-compliance, contract-testing, visual-accessibility, chaos-resilience, learning-optimization, enterprise-integration, coordination.

### CLI Quick Reference

```bash
# Claude Flow
claude-flow daemon start           # Start background workers
claude-flow memory init            # Initialize memory database
claude-flow swarm init             # Initialize a swarm
claude-flow doctor --fix           # Diagnose and fix issues

# Agentic QE
agentic-qe status                  # System status
agentic-qe health                  # Health check
agentic-qe domain list             # List all domains
agentic-qe fleet spawn             # Spawn multi-agent fleet
agentic-qe test generate <target>  # Generate tests
agentic-qe coverage <target>       # Coverage analysis
agentic-qe security                # Security scanning
agentic-qe code analyze <target>   # Code intelligence
```

## Concurrency Rules

- All independent operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents
- Batch all related file reads/writes/edits in one message
- Batch all Bash commands in one message when independent
- Never continuously poll after spawning agents — wait for results

## Swarm Configuration

- Topology: hierarchical-mesh
- Max agents: 15
- Memory backend: hybrid (HNSW enabled)
- Use `run_in_background: true` for all agent Task calls
- Put all agent Task calls in one message for parallel execution
