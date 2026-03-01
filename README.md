# DreamLab AI

Premium AI training and consulting platform at [dreamlab-ai.com](https://dreamlab-ai.com).

React SPA with 3D visualisations, SvelteKit community forum with passkey authentication, and Cloudflare Workers backend services.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3 + TypeScript 5.5 + Vite 5.4 |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| 3D | Three.js 0.156 + React Three Fiber |
| WASM | Rust (Voronoi tessellation) |
| Forum | SvelteKit 2.49 + Nostr (NDK 2.13) |
| Auth | WebAuthn PRF + NIP-98 |
| Backend | Cloudflare Workers + D1 + KV + R2 |
| Hosting | GitHub Pages + Cloudflare Pages |

## Quick Start

```bash
git clone git@github.com:DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint code quality checks |

## Project Structure

```
src/                    React SPA (13 lazy-loaded routes)
  components/           70+ React components (shadcn/ui primitives in ui/)
  pages/                Route pages (Index, Team, Workshops, Contact, etc.)
  hooks/                Custom React hooks
  lib/                  Utilities, Supabase client
community-forum/        SvelteKit community forum
  src/routes/           16 Svelte routes (channels, DMs, calendar, admin)
  src/lib/auth/         WebAuthn PRF + NIP-98 auth
  src/lib/nostr/        NDK Nostr integration
  services/             Legacy GCP Cloud Run services (reference only)
workers/                Cloudflare Workers (active backend)
  auth-api/             WebAuthn + NIP-98 token creation
  pod-api/              Solid pod ACL management
  search-api/           RVF vector search (WASM microkernel)
  nostr-relay/          Nostr relay (D1 + Durable Objects)
wasm-voronoi/           Rust WASM for 3D background effects
content/                Structured site content (YAML)
public/data/            Runtime content (team profiles, workshops, media)
scripts/                Build and utility scripts
docs/                   Full documentation suite
```

## Documentation

- [Documentation hub](docs/README.md) -- navigation, tech stack, feature status
- [Architecture overview](docs/architecture.md) -- system design
- [Architecture Decision Records](docs/adr/README.md) -- 10 ADRs
- [Developer guide](docs/developer/GETTING_STARTED.md) -- local setup
- [Deployment](docs/deployment/README.md) -- CI/CD and operations
- [Security](docs/security/SECURITY_OVERVIEW.md) -- auth, encryption, compliance
- [Community forum](docs/community/README.md) -- Nostr forum architecture
- [Cloudflare migration PRD](docs/prd-cloudflare-workers-migration.md) -- current infrastructure plan

## Licence

Proprietary. Copyright 2024-2026 DreamLab AI Consulting Ltd. All rights reserved.
