# Project Structure

Last updated: 2026-02-28

Complete directory tree and file role reference for the DreamLab AI monorepo.

---

## Top-level layout

```
dreamlab-ai-website/
|-- src/                          # React SPA source
|-- public/                       # Static assets (served as-is by Vite)
|-- community-forum/              # SvelteKit community forum (separate package)
|-- workers/                      # Cloudflare Workers (planned)
|-- wasm-voronoi/                 # Rust WASM module
|-- scripts/                      # Build and utility scripts
|-- docs/                         # Project documentation
|-- .github/workflows/            # CI/CD pipelines
|-- package.json                  # Main site dependencies and scripts
|-- vite.config.ts                # Vite build configuration
|-- tsconfig.json                 # TypeScript configuration (project references)
|-- tsconfig.app.json             # TypeScript config for the app
|-- tsconfig.node.json            # TypeScript config for Node scripts
|-- tailwind.config.ts            # Tailwind CSS configuration
|-- eslint.config.js              # ESLint 9 flat config
|-- postcss.config.js             # PostCSS (autoprefixer)
|-- wrangler.toml                 # Cloudflare Workers configuration
`-- .env                          # Environment variables (not committed)
```

---

## Package boundaries

The repository contains three independent packages. Each has its own dependency tree and build pipeline.

### 1. Main site (`/`)

The primary React SPA. Built with Vite, deployed to GitHub Pages.

- **Package file**: `package.json`
- **Entry point**: `src/main.tsx`
- **Build output**: `dist/`
- **Build command**: `npm run build`

### 2. Community forum (`community-forum/`)

A SvelteKit application for the community platform. Uses Nostr (NDK) for decentralised messaging and WebAuthn for authentication.

- **Package file**: `community-forum/package.json`
- **Entry point**: `community-forum/src/routes/`
- **Build output**: `community-forum/build/`
- **Build command**: `cd community-forum && npm run build`

### 3. Cloudflare Workers (`workers/`)

Planned replacement for Cloud Run backend services. Not yet deployed.

- **Configuration**: `wrangler.toml` (at project root)
- **Entry points**: `workers/auth-api/index.ts`, `workers/pod-api/index.ts`

---

## Source directory (`src/`)

```
src/
|-- App.tsx                       # Root component: providers, router, lazy routes
|-- main.tsx                      # Vite entry point (renders App into #root)
|-- index.css                     # Global styles and Tailwind directives
|-- vite-env.d.ts                 # Vite type declarations
|
|-- pages/                        # Route page components (lazy-loaded)
|   |-- Index.tsx                 # Landing page (hero, featured content, CTAs)
|   |-- Team.tsx                  # Expert profiles (loads markdown from public/data/team/)
|   |-- Work.tsx                  # Portfolio and case studies
|   |-- Contact.tsx               # Contact form (React Hook Form + Zod validation)
|   |-- WorkshopIndex.tsx         # Workshop catalogue listing
|   |-- WorkshopPage.tsx          # Individual workshop detail (:workshopId/:pageSlug)
|   |-- ResidentialTraining.tsx   # 2-day residential masterclass details
|   |-- Masterclass.tsx           # Legacy (unused -- /masterclass redirects to /)
|   |-- SystemDesign.tsx          # Architecture documentation page
|   |-- ResearchPaper.tsx         # Research content page
|   |-- Testimonials.tsx          # Customer reviews
|   |-- Privacy.tsx               # Privacy policy
|   `-- NotFound.tsx              # 404 page
|
|-- components/
|   |-- ui/                       # 50+ shadcn/ui primitives (Radix-based)
|   |   |-- accordion.tsx
|   |   |-- alert-dialog.tsx
|   |   |-- avatar.tsx
|   |   |-- badge.tsx
|   |   |-- button.tsx
|   |   |-- card.tsx
|   |   |-- carousel.tsx
|   |   |-- chart.tsx
|   |   |-- checkbox.tsx
|   |   |-- command.tsx
|   |   |-- dialog.tsx
|   |   |-- drawer.tsx
|   |   |-- dropdown-menu.tsx
|   |   |-- form.tsx
|   |   |-- input.tsx
|   |   |-- label.tsx
|   |   |-- navigation-menu.tsx
|   |   |-- popover.tsx
|   |   |-- progress.tsx
|   |   |-- scroll-area.tsx
|   |   |-- select.tsx
|   |   |-- separator.tsx
|   |   |-- sheet.tsx
|   |   |-- skeleton.tsx
|   |   |-- slider.tsx
|   |   |-- sonner.tsx
|   |   |-- switch.tsx
|   |   |-- table.tsx
|   |   |-- tabs.tsx
|   |   |-- textarea.tsx
|   |   |-- toast.tsx
|   |   |-- toaster.tsx
|   |   |-- tooltip.tsx
|   |   `-- (and more)
|   |
|   |-- Header.tsx                # Site-wide navigation header
|   |-- RouteLoader.tsx           # Suspense fallback for lazy-loaded routes
|   |-- ErrorBoundary.tsx         # React error boundary wrapper
|   |-- VoronoiGoldenHero.tsx     # 3D golden ratio Voronoi visualisation (Three.js)
|   |-- TesseractProjection.tsx   # 4D hyperdimensional projection visualisation
|   |-- HyperdimensionalHeroBackground.tsx  # CSS-based hero background
|   |-- AnimatedHeroBackground.tsx          # Animated hero variant
|   |-- CourseCard.tsx            # Training course card component
|   |-- WorkshopCard.tsx          # Workshop listing card
|   |-- WorkshopHeader.tsx        # Workshop page header
|   |-- EmailSignupForm.tsx       # Newsletter subscription form
|   |-- AIChatFab.tsx             # Floating AI chat button
|   |-- TeamMember.tsx            # Individual team member display
|   |-- LearningPathDiagram.tsx   # Visual learning path
|   |-- CaseStudyNarrative.tsx    # Case study display
|   |-- ExclusivityBanner.tsx     # Promotional banner
|   |-- FeaturedInstructors.tsx   # Instructor showcase
|   |-- OGImageTemplate.tsx       # Open Graph image generator
|   `-- TestimonialMoments.tsx    # Testimonial display
|
|-- hooks/
|   |-- use-mobile.tsx            # Mobile breakpoint detection (< 768px)
|   |-- use-toast.ts              # Toast notification hook
|   |-- use-optimized-images.ts   # Image optimisation (lazy load, srcset, WebP)
|   `-- useOGMeta.ts              # Open Graph metadata hook
|
|-- lib/
|   |-- utils.ts                  # cn() utility (clsx + tailwind-merge)
|   |-- supabase.ts               # Supabase client initialisation
|   |-- og-meta.ts                # Open Graph metadata generation
|   |-- image-utils.ts            # Image optimisation helpers
|   `-- markdown.ts               # Markdown processing utilities
|
`-- data/
    |-- skills.json               # Skills taxonomy data
    |-- workshop-list.json        # Generated workshop metadata (from scripts/)
    |-- testimonials.json         # Generated testimonials (from scripts/)
    `-- work/                     # Case study data
```

---

## Public assets (`public/`)

```
public/
|-- data/
|   |-- team/                     # 44 expert profiles (markdown + images)
|   |-- workshops/                # 15 workshop directories with markdown content
|   |-- showcase/                 # Portfolio project manifests
|   `-- media/                    # Videos, thumbnails
|-- images/                       # Static image assets
|-- robots.txt                    # Search engine directives
|-- sitemap.xml                   # Site map for crawlers
|-- site.webmanifest              # PWA manifest
`-- CNAME                         # GitHub Pages custom domain (dreamlab-ai.com)
```

Files in `public/` are served at the root URL path. For example, `public/data/team/alice.md` is accessible at `/data/team/alice.md`.

---

## Community forum (`community-forum/`)

```
community-forum/
|-- package.json                  # Separate dependency tree
|-- src/
|   |-- routes/                   # 16 SvelteKit routes (channels, DMs, calendar, profiles)
|   |-- lib/
|   |   |-- auth/
|   |   |   |-- passkey.ts        # WebAuthn PRF ceremony + HKDF key derivation
|   |   |   `-- nip98-client.ts   # NIP-98 kind:27235 token creation + fetchWithNip98()
|   |   |-- stores/
|   |   |   `-- auth.ts           # Auth state: _privkeyMem closure, passkey login/register
|   |   `-- components/auth/
|   |       |-- AuthFlow.svelte   # Orchestrates signup > nickname > pending-approval
|   |       |-- Signup.svelte     # Passkey registration UI
|   |       |-- Login.svelte      # Passkey / NIP-07 / nsec login
|   |       |-- NicknameSetup.svelte  # Profile setup after registration
|   |       `-- NsecBackup.svelte     # One-time privkey download
|   `-- ...
|
|-- packages/
|   `-- nip98/                    # Shared NIP-98 module
|       |-- index.ts              # Package entry point
|       |-- sign.ts               # NIP-98 event signing
|       |-- verify.ts             # NIP-98 event verification
|       `-- types.ts              # Shared type definitions
|
|-- services/                     # Backend service source code
|   |-- auth-api/                 # Express WebAuthn server (Cloud Run)
|   |   `-- src/
|   |       |-- server.ts         # Express app, CORS, env validation
|   |       |-- db.ts             # PostgreSQL pool, schema migrations
|   |       |-- webauthn.ts       # Registration/authentication option generators
|   |       |-- nip98.ts          # NIP-98 server-side verification
|   |       |-- jss-client.ts     # JSS pod provisioning client
|   |       `-- routes/
|   |           |-- register.ts   # POST /auth/register/options + /verify
|   |           `-- authenticate.ts   # POST /auth/login/options + /verify
|   |
|   |-- jss/                      # JavaScript Solid Server (pod storage)
|   |   |-- Dockerfile            # node:20-slim, @solid/community-server@7.1.8
|   |   `-- entrypoint.sh         # Startup script
|   |
|   |-- nostr-relay/              # Nostr relay (NIP-01, NIP-98 verified)
|   |-- embedding-api/            # Vector embeddings service
|   |-- image-api/                # Image processing and resizing
|   |-- link-preview-api/         # URL metadata extraction
|   `-- visionflow-bridge/        # VisionFlow integration bridge
|
`-- tests/                        # Vitest unit + Playwright e2e tests
```

---

## Cloudflare Workers (`workers/`)

Planned migration target for Cloud Run services. Not yet deployed in production.

```
workers/
|-- auth-api/
|   `-- index.ts                  # WebAuthn auth worker
|-- pod-api/
|   |-- index.ts                  # Pod storage worker (R2-backed)
|   `-- acl.ts                    # Access control logic
`-- shared/
    `-- nip98.ts                  # Shared NIP-98 verification
```

Configuration lives in `wrangler.toml` at the project root.

---

## Rust WASM module (`wasm-voronoi/`)

Computes Voronoi tessellation for the 3D golden ratio hero visualisation. Built with `wasm-pack` and consumed by `src/components/VoronoiGoldenHero.tsx`.

```
wasm-voronoi/
|-- Cargo.toml                    # Rust dependencies
|-- Cargo.lock                    # Locked dependency versions
`-- src/
    `-- lib.rs                    # WASM entry point
```

---

## Build scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `generate-workshop-list.mjs` | Scans `public/data/workshops/` and writes `src/data/workshop-list.json`. Runs automatically before `dev` and `build`. |
| `generate-testimonials.mjs` | Generates `src/data/testimonials.json`. Runs automatically before `dev` and `build`. |
| `generate-heroes.sh` | Hero image generation |
| `optimize-images.sh` | Image compression and WebP conversion |
| `start-ruvector.sh` | RuVector memory database startup |

---

## CI/CD pipelines (`.github/workflows/`)

| Workflow | File | Purpose |
|----------|------|---------|
| Main deployment | `deploy.yml` | Build main site + forum, deploy to GitHub Pages |
| Auth API | `auth-api.yml` | Deploy auth-api to Cloud Run |
| JSS | `jss.yml` | Deploy Solid pod server to Cloud Run |
| Nostr relay | `fairfield-relay.yml` | Deploy Nostr relay to Cloud Run |
| Embedding API | `fairfield-embedding-api.yml` | Deploy embedding service to Cloud Run |
| Image API | `fairfield-image-api.yml` | Deploy image service to Cloud Run |
| VisionFlow bridge | `visionflow-bridge.yml` | Deploy VisionFlow bridge |
| Documentation | `docs-update.yml` | Documentation validation |
| Embeddings generation | `generate-embeddings.yml` | Batch embedding generation |

---

## Shared code

### `community-forum/packages/nip98/`

A shared NIP-98 module used by both the community forum client and backend services. Contains signing (`sign.ts`), verification (`verify.ts`), and type definitions (`types.ts`).

### `workers/shared/nip98.ts`

NIP-98 verification logic for the Cloudflare Workers implementation. Separate from the forum's `packages/nip98/` because Workers use a different runtime (Cloudflare Workers runtime vs Node.js).

---

## Build artifacts

| Artefact | Source | Location |
|----------|--------|----------|
| Main site bundle | `npm run build` | `dist/` |
| Forum build | `cd community-forum && npm run build` | `community-forum/build/` |
| Workshop list | `node scripts/generate-workshop-list.mjs` | `src/data/workshop-list.json` |
| Testimonials | `node scripts/generate-testimonials.mjs` | `src/data/testimonials.json` |
| WASM binary | `wasm-pack build` (in `wasm-voronoi/`) | `wasm-voronoi/pkg/` |

All build artefacts are listed in `.gitignore` and must not be committed.

---

## Key configuration files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build: SWC plugin, path aliases, manual chunks, dev server middleware |
| `tsconfig.json` | TypeScript: project references, path aliases, strict mode disabled |
| `tailwind.config.ts` | Tailwind: custom colours (HSL CSS variables), animations, typography plugin |
| `eslint.config.js` | ESLint 9 flat config: TypeScript rules, React hooks, ignores |
| `postcss.config.js` | PostCSS: Tailwind and autoprefixer |
| `wrangler.toml` | Cloudflare Workers: D1 database, KV namespaces, R2 buckets, routes |

---

## Related documentation

- [GETTING_STARTED.md](./GETTING_STARTED.md) -- setup and installation
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) -- daily development practices
- [../reference/tech-stack.md](../reference/tech-stack.md) -- complete dependency reference
