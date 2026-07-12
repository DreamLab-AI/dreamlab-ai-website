# Claude Code Configuration - DreamLab AI Website

## Project Overview

DreamLab AI is a premium AI training and consulting platform. This repo is the
**branded deployment** of the DreamLab stack: a React marketing SPA at `/`, a
Rust/Leptos WASM community forum at `/community/`, and five Rust Cloudflare
Workers. The forum source code lives **upstream** in the
[nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum) kit — this
repo only carries the operator overlay (`forum-config/`) that pins the kit and
supplies DreamLab branding, zones, and Cloudflare resource IDs.

- **Domain:** dreamlab-ai.com
- **Hosting:** GitHub Pages (static dual-SPA) + Cloudflare Workers (backend)
- **Repository:** https://github.com/DreamLab-AI/dreamlab-ai-website
- **Ecosystem:** part of [VisionFlow](https://github.com/DreamLab-AI/VisionFlow)
  (VisionClaw, agentbox, solid-pod-rs, nostr-rust-forum)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.9 |
| Build | Vite 5.4 (SWC plugin) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Routing | React Router DOM 6.26 (lazy-loaded routes) |
| State/Data | TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod 3 |
| Hero scenes | Canvas-based Voronoi/golden-ratio rendering (no Three.js) |
| Database | Supabase (PostgreSQL + Auth) |
| Sanitization | DOMPurify + react-markdown/remark-gfm |
| Forum | Upstream nostr-rust-forum kit (Leptos 0.7 CSR, WASM) + `forum-config/` overlay |
| Workers | 5 Rust Cloudflare Workers (auth, pod, relay, search, preview) — source upstream |
| Unit tests | Vitest + Testing Library (jsdom) |
| E2E/smoke | Playwright (`tests/*.spec.ts`) + Node probes (`tests/*.mjs`) |

## Build & Test Commands

```bash
# React marketing site
npm run dev                # Dev server (pre-step generates workshop list + testimonials)
npm run build              # Production build (same pre-step)
npm run lint               # ESLint 9 flat config
npm run test               # Vitest unit tests (src/**/__tests__)
npm run preview            # Preview production build

# Forum overlay (Rust)
cd forum-config && cargo test   # Operator-overlay tests (config parsing, branding, deploy manifests)

# E2E (requires a running deployment; see playwright.config.ts)
npx playwright test
```

- Pre-build step: `scripts/generate-workshop-list.mjs` scans
  `public/data/workshops/` → `src/data/workshop-list.json`, and
  `scripts/generate-testimonials.mjs` reads `content/site-content.yaml` →
  `src/data/testimonials.json`. Both run automatically before dev/build.
- ESLint config: `eslint.config.js` (flat config, ignores `dist/`)
- Always run `npm run build` and `npm run lint` before committing.

## Project Structure

```
src/
  App.tsx              # Root: QueryClient, BrowserRouter, lazy routes
  main.tsx             # Vite entry point
  pages/               # Route pages (lazy-loaded) + __tests__/
  components/          # React components (shadcn/ui primitives in ui/)
  hooks/               # use-mobile, use-toast, useOGMeta
  lib/                 # supabase, utils, og-meta, image-utils, markdown,
                       # gdpr-erasure + __tests__/
  data/                # skills.json + GENERATED: workshop-list.json,
                       # testimonials.json (do not hand-edit generated files)
  styles/              # design-tokens.css
  test/                # vitest setup

public/
  images/              # All site imagery, by category:
    heroes/            #   programme + forum-zone hero banners
    partners/          #   partner logos
    portfolio/         #   research video poster thumbnails (*-thumb.webp)
    showcase/          #   research/showcase stills
    team/              #   team portraits (01..44.webp), loaded via manifest
    venue/             #   Lake District facility photos
  data/                # Runtime-fetched content:
    team/              #   manifest.json + per-member markdown bios
    workshops/         #   workshop directories (markdown, scanned at build)
    media/videos/      #   research videos (mp4, referenced by Research page)
  sitemap.xml, robots.txt, site.webmanifest, CNAME, 404.html, _redirects

content/
  site-content.yaml    # Source for testimonials (and future site copy)

forum-config/          # Operator overlay for the nostr-rust-forum kit
  Cargo.toml           # Pins nostr-bbs-* crates at the kit commit (dual-pin rule!)
  dreamlab.toml        # Operator config: branding, [[zones]], governance, [mesh]
  src/                 # Branding + per-worker entry shims
  deploy/              # Per-worker wrangler.toml with DreamLab CF resource IDs

scripts/
  generate-workshop-list.mjs   # Pre-build: workshops → src/data/workshop-list.json
  generate-testimonials.mjs    # Pre-build: content YAML → src/data/testimonials.json
  seed/                        # Zone seeding + relay/calendar/pod probes (live ops)
  embeddings/                  # Search embedding tooling
  optimize-images.sh, generate-heroes.sh, optimize-team-portraits.sh

tests/                 # Playwright smoke specs + Node integration probes
docs/                  # Documentation suite — start at docs/README.md
  adr/                 # Architecture Decision Records (013+)
  api/                 # Auth/Pod/Relay/Search/Moderation API docs
  architecture/        # Forum org redesign (zones, cohorts, calendar tiers)
  ddd/                 # Domain model and bounded contexts
  deployment/          # CI/CD, environments, DNS
  developer/           # Getting started, Rust style guide
  prd/                 # Product requirement documents (historical record)
  security/            # Security overview, authentication, audits
  sprint/              # Sprint plans, snag lists, audits
  tranche-1/           # Rust-port parity matrices
  images/screenshots/  # README screenshots
.github/workflows/     # ci, deploy, workers-deploy, rust-ci, docs-update,
                       # set-worker-secrets, test-and-lint
```

## Routing

All routes are lazy-loaded via `React.lazy()` in `src/App.tsx`:

| Route | Component |
|-------|-----------|
| `/` | Index |
| `/programmes` | Programmes |
| `/co-create` | CoCreate |
| `/research` | Research |
| `/ecosystem` | Ecosystem |
| `/team` | Team |
| `/workshops` | WorkshopIndex |
| `/workshops/:workshopId(/:pageSlug)` | WorkshopPage |
| `/testimonials` | Testimonials |
| `/ventures` | Ventures |
| `/contact` | Contact |
| `/privacy` | Privacy |
| `*` | NotFound |

Legacy redirects: `/residential-training` and `/masterclass` → `/programmes`;
`/system-design`, `/research-paper`, and `/work` → `/research`.
The Leptos forum is a separate SPA served at `/community/` (not a React route).
The retro ASCII/BBS forum client is implemented **upstream** in the
nostr-rust-forum kit (`nostr-bbs-bbs-client`, Rust/Leptos) and served at
**`/community/bbs/`** (deploy.yml Trunk-builds it; `/bbs` 301-redirects there). It
is configured entirely via `forum-config/dreamlab.toml` `[branding]`
(theme/node_name/location/banner_url/logo_url → `window.__ENV__`) — **not** a React
route in this overlay. (A React prototype previously lived at `/bbs`; it was removed
in favour of the upstream Rust port — see `docs/sprint/bbs-rust-port-spec.md`.)

Keep `public/sitemap.xml` in sync with this table when routes change.

## Path Aliases

- `@/*` maps to `./src/*` (tsconfig.json, vite.config.ts, vitest.config.ts)

## Key Patterns

- **Components:** shadcn/ui primitives (Radix + Tailwind + CVA)
- **Forms:** React Hook Form + Zod schemas at form boundaries
- **Data fetching:** TanStack React Query
- **Content:** team bios and workshops are markdown under `public/data/`,
  fetched at runtime; testimonials come from `content/site-content.yaml` via
  the pre-build script
- **OG/social meta:** `src/lib/og-meta.ts` — image URLs must point at files
  that actually exist under `public/` (there is no OG-image generation pipeline)
- **Code splitting:** Vite manual chunks (vendor, ui) + route-level lazy loading
- **Dev-server hardening:** `vite.config.ts` middleware validates
  `/data/team` requests against path traversal

## TypeScript Configuration

- Strict mode: **partial** (noImplicitAny: false, strictNullChecks: **true**)
- Target: ES2020, Module: ESNext, JSX: react-jsx

## Environment Variables

Main site `.env` (never commit; see `.env.example`):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AUTH_API_URL=https://dreamlab-auth-api.solitary-paper-764d.workers.dev
VITE_POD_API_URL=https://dreamlab-pod-api.solitary-paper-764d.workers.dev
VITE_SEARCH_API_URL=https://dreamlab-search-api.solitary-paper-764d.workers.dev
VITE_RELAY_URL=wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev
VITE_LINK_PREVIEW_API_URL=https://dreamlab-link-preview.solitary-paper-764d.workers.dev
```

The `/community/` forum and the upstream Rust ASCII BBS read `VITE_RELAY_URL`
(and the other API URLs) at runtime from `window.__ENV__`. Keep this list in sync
with `deploy.yml` `[env]`.

Workers use `forum-config/deploy/*.wrangler.toml` bindings (D1, KV, R2, DO) —
no `.env` files. The forum client receives runtime config via
`window.__ENV__` injected by `deploy.yml`.

## Deployment

- **Static site:** `npm run build` → `dist/` → GitHub Pages (`gh-pages` branch)
- **Forum:** CI clones the kit at `KIT_REF`, builds with Trunk
  (`--public-url /community/`), outputs to `dist/community/`
- **Workers:** `workers-deploy.yml` builds the five kit worker crates with the
  `forum-config/deploy/` wrangler configs overlaid

### The dual-pin rule (critical)

The kit commit is pinned in **four places that must move together** in one
commit, or client/worker/test skew ships:

1. `KIT_REF` in `.github/workflows/deploy.yml`
2. `KIT_REF` in `.github/workflows/workers-deploy.yml`
3. `KIT_REF` in `.github/workflows/rust-ci.yml`
4. The `rev = "..."` pins on every `nostr-bbs-*` dependency in `forum-config/Cargo.toml`
   (and the resolved full SHA in `forum-config/Cargo.lock`)

### Zones

The four-zone org model (public / friends / family / business) is authored
once in `forum-config/dreamlab.toml` `[[zones]]` and projected into the
relay's `ZONE_CONFIG` var (server enforcement) and the client's
`window.__ENV__.ZONE_CONFIG` (rendering) — keep both in sync. See
`docs/architecture/forum-org-redesign.md`.

## Behavioral Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for the goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files unless explicitly requested
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER save working files to the root folder
- Run `npm run build` and `npm run lint` to verify changes before committing
- Forum behaviour changes belong upstream in nostr-rust-forum, not here —
  this repo only configures and pins the kit

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at form boundaries (Zod schemas)
- Always sanitize rendered HTML/markdown (DOMPurify, react-markdown)
- Always validate file paths to prevent directory traversal (see vite.config.ts middleware)
- The seed/probe scripts read the admin key from the environment and must
  never print or persist secret material


## Agentic QE v3

This project uses **Agentic QE v3** - a Domain-Driven Quality Engineering platform with 13 bounded contexts, ReasoningBank learning, HNSW vector search, and Agent Teams coordination (ADR-064).

---

### CRITICAL POLICIES

#### Integrity Rule (ABSOLUTE)
- NO shortcuts, fake data, or false claims
- ALWAYS implement properly, verify before claiming success
- ALWAYS use real database queries for integration tests
- ALWAYS run actual tests, not assume they pass

**We value the quality we deliver to our users.**

#### Test Execution
- NEVER run `npm test` without `--run` flag (watch mode risk)
- Use: `npm test -- --run`, `npm run test:unit`, `npm run test:integration` when available

#### Data Protection
- NEVER run `rm -f` on `.agentic-qe/` or `*.db` files without confirmation
- ALWAYS backup before database operations

#### Git Operations
- NEVER auto-commit/push without explicit user request
- ALWAYS wait for user confirmation before git operations

---

### Quick Reference

```bash
# Run tests
npm test -- --run

# Check quality
aqe quality assess

# Generate tests
aqe test generate <file>

# Coverage analysis
aqe coverage <path>
```

### Using AQE MCP Tools

AQE exposes tools via MCP with the `mcp__agentic-qe__` prefix. You MUST call `fleet_init` before any other tool.

#### 1. Initialize the Fleet (required first step)

```typescript
mcp__agentic-qe__fleet_init({
  topology: "hierarchical",
  maxAgents: 15,
  memoryBackend: "hybrid"
})
```

#### 2. Generate Tests

```typescript
mcp__agentic-qe__test_generate_enhanced({
  targetPath: "src/services/auth.ts",
  framework: "vitest",
  strategy: "boundary-value"
})
```

#### 3. Analyze Coverage

```typescript
mcp__agentic-qe__coverage_analyze_sublinear({
  paths: ["src/"],
  threshold: 80
})
```

#### 4. Assess Quality

```typescript
mcp__agentic-qe__quality_assess({
  scope: "full",
  includeMetrics: true
})
```

#### 5. Store and Query Patterns (with learning persistence)

```typescript
// Store a learned pattern
mcp__agentic-qe__memory_store({
  key: "patterns/coverage-gap/{timestamp}",
  namespace: "learning",
  value: {
    pattern: "...",
    confidence: 0.95,
    type: "coverage-gap",
    metadata: { /* domain-specific */ }
  },
  persist: true
})

// Query stored patterns
mcp__agentic-qe__memory_query({
  pattern: "patterns/*",
  namespace: "learning",
  limit: 10
})
```

#### 6. Orchestrate Multi-Agent Tasks

```typescript
mcp__agentic-qe__task_orchestrate({
  task: "Full quality assessment of auth module",
  domains: ["test-generation", "coverage-analysis", "security-compliance"],
  parallel: true
})
```

### MCP Tool Reference

| Tool | Description |
|------|-------------|
| `fleet_init` | Initialize QE fleet (MUST call first) |
| `fleet_status` | Get fleet health and agent status |
| `agent_spawn` | Spawn specialized QE agent |
| `test_generate_enhanced` | AI-powered test generation |
| `test_execute_parallel` | Parallel test execution with retry |
| `task_orchestrate` | Orchestrate multi-agent QE tasks |
| `coverage_analyze_sublinear` | O(log n) coverage analysis |
| `quality_assess` | Quality gate evaluation |
| `memory_store` | Store patterns with namespace + persist |
| `memory_query` | Query patterns by namespace/pattern |
| `security_scan_comprehensive` | SAST/DAST scanning |

### Configuration

- **Enabled Domains**: test-generation, test-execution, coverage-analysis, quality-assessment, defect-intelligence, requirements-validation (+6 more)
- **Learning**: Enabled (transformer embeddings)
- **Max Concurrent Agents**: 8
- **Background Workers**: pattern-consolidator, routing-accuracy-monitor, coverage-gap-scanner

### V3 QE Agents

QE agents are in `.claude/agents/v3/`. Use with Task tool:

```javascript
Task({ prompt: "Generate tests", subagent_type: "qe-test-architect", run_in_background: true })
Task({ prompt: "Find coverage gaps", subagent_type: "qe-coverage-specialist", run_in_background: true })
Task({ prompt: "Security audit", subagent_type: "qe-security-scanner", run_in_background: true })
```

### Data Storage

- **Memory Backend**: `.agentic-qe/memory.db` (SQLite)
- **Configuration**: `.agentic-qe/config.yaml`

---
*Generated by AQE v3 init - 2026-06-27T12:36:59.809Z*
