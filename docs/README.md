# DreamLab AI Documentation

**Last updated:** 2026-03-01 | **Version:** 2.0.0 | **Repository:** [DreamLab-AI/dreamlab-ai-website](https://github.com/DreamLab-AI/dreamlab-ai-website)

DreamLab AI is a premium AI training and consulting platform at [dreamlab-ai.com](https://dreamlab-ai.com) (also [thedreamlab.uk](https://thedreamlab.uk)). The platform comprises a React single-page application with 3D visualisations, a SvelteKit community forum with passkey authentication, and backend services on GCP Cloud Run (migration to Cloudflare Workers in progress -- auth-api and pod-api Workers are code complete, deployment pending).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3 + TypeScript 5.5 + Vite 5.4 (SWC) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Routing | React Router DOM 6.26 (lazy-loaded, 13 routes) |
| State | TanStack React Query 5.56 |
| Forms | React Hook Form 7.53 + Zod 3.23 |
| 3D | Three.js 0.156 + @react-three/fiber + @react-three/drei |
| WASM | Rust (Voronoi tessellation in `wasm-voronoi/`) |
| Forum | SvelteKit 2.49 (`community-forum/`) |
| Protocol | Nostr (NDK 2.13) for community features |
| Auth | WebAuthn PRF + HKDF + NIP-98 (nostr-tools 2.19.3) |
| Database | Supabase (main site), PostgreSQL (auth-api) |

---

## Quick Navigation

### For Users

- [Website guide](user/WEBSITE_GUIDE.md) -- navigating the main site
- [Workshop booking](user/WORKSHOP_BOOKING.md) -- booking AI training workshops
- [FAQ](user/FAQ.md) -- frequently asked questions

### For Developers

- [Getting started](developer/GETTING_STARTED.md) -- local development environment
- [Architecture overview](architecture.md) -- system design and components
- [Development workflow](developer/DEVELOPMENT_WORKFLOW.md) -- day-to-day development
- [Component development](developer/COMPONENT_DEVELOPMENT.md) -- building UI components
- [Code style](developer/CODE_STYLE.md) -- coding standards
- [Testing guide](developer/TESTING_GUIDE.md) -- writing and running tests
- [Service development](developer/SERVICE_DEVELOPMENT.md) -- backend service development

### For Operators

- [Deployment overview](deployment/README.md) -- deployment strategies
- [GitHub Pages deployment](deployment/GITHUB_PAGES.md) -- static site hosting
- [Cloud services](deployment/CLOUD_SERVICES.md) -- GCP Cloud Run configuration
- [Environments](deployment/ENVIRONMENTS.md) -- environment configuration
- [Monitoring](deployment/MONITORING.md) -- observability and alerting
- [Rollback procedures](deployment/ROLLBACK.md) -- incident recovery

### For Architects

- [Architecture overview](architecture.md) -- high-level system design
- [Architecture Decision Records](adr/README.md) -- 10 ADRs covering all major decisions
- [Domain model](ddd/01-domain-model.md) -- Domain-Driven Design documentation
- [Feature status matrix](features/STATUS_MATRIX.md) -- what is running, planned, or broken
- [Cloudflare migration PRD](prd-cloudflare-workers-migration.md) -- return to Cloudflare platform (in progress)

---

## Feature Status

| Feature | Status |
|---------|--------|
| Main React SPA (13 routes) | Running on GitHub Pages |
| 3D visualisations (VoronoiGoldenHero, TesseractProjection) | Running |
| Workshop content system (15 workshops) | Running |
| Team profiles (44 experts) | Running |
| Community forum (SvelteKit) | Builds and deploys to `/community` |
| Auth API (WebAuthn + NIP-98) | Deployed on GCP Cloud Run |
| JSS (Solid pod storage) | Deployed on GCP Cloud Run |
| Nostr relay | Deployed on GCP Cloud Run |
| Embedding API | Deployed on GCP Cloud Run |
| Image API | Deployed on GCP Cloud Run |
| Link preview API | Deployed on GCP Cloud Run |
| NIP-98 shared module | Built (consolidated from 4 implementations) |
| Cloudflare Workers (auth-api, pod-api) | Code complete, deployment pending |

For the full breakdown, see [features/STATUS_MATRIX.md](features/STATUS_MATRIX.md).

---

## Document Index

### Core

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file -- master documentation hub |
| [index.md](index.md) | Quick-navigation page |
| [architecture.md](architecture.md) | High-level architecture overview |
| [features/STATUS_MATRIX.md](features/STATUS_MATRIX.md) | Comprehensive feature status matrix |
| [prd-cloudflare-workers-migration.md](prd-cloudflare-workers-migration.md) | Cloudflare migration PRD |

### Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](adr/001-nostr-protocol-foundation.md) | Nostr Protocol as Foundation | Accepted |
| [ADR-002](adr/002-three-tier-hierarchy.md) | Three-Tier BBS Hierarchy | Accepted |
| [ADR-003](adr/003-gcp-cloud-run-infrastructure.md) | GCP Cloud Run Infrastructure | Superseded by ADR-010 |
| [ADR-004](adr/004-zone-based-access-control.md) | Zone-Based Access Control | Accepted |
| [ADR-005](adr/005-nip-44-encryption-mandate.md) | NIP-44 Encryption Mandate | Accepted |
| [ADR-006](adr/006-client-side-wasm-search.md) | Client-Side WASM Search | Accepted |
| [ADR-007](adr/007-sveltekit-ndk-frontend.md) | SvelteKit + NDK Frontend | Accepted |
| [ADR-008](adr/008-postgresql-relay-storage.md) | PostgreSQL Relay Storage | Accepted |
| [ADR-009](adr/009-user-registration-flow.md) | User Registration Flow | Resolved |
| [ADR-010](adr/010-return-to-cloudflare.md) | Return to Cloudflare Platform | Accepted |

### Domain-Driven Design

| Document | Description |
|----------|-------------|
| [Domain model](ddd/01-domain-model.md) | Core domain entities |
| [Bounded contexts](ddd/02-bounded-contexts.md) | System boundaries |
| [Aggregates](ddd/03-aggregates.md) | Data aggregates |
| [Domain events](ddd/04-domain-events.md) | Event model |
| [Value objects](ddd/05-value-objects.md) | Value types |
| [Ubiquitous language](ddd/06-ubiquitous-language.md) | Terminology |

### Security

| Document | Description |
|----------|-------------|
| [Security overview](security/SECURITY_OVERVIEW.md) | Security posture summary |
| [Authentication](security/AUTHENTICATION.md) | Auth system details |
| [Data protection](security/DATA_PROTECTION.md) | Data handling policies |
| [Vulnerability management](security/VULNERABILITY_MANAGEMENT.md) | Vulnerability response |
| [Security audit report](security/security-audit-report.md) | Audit findings |
| [Admin security](security/admin-security.md) | Administrator guidelines |

### API

| Document | Description |
|----------|-------------|
| [Embedding service](api/EMBEDDING_SERVICE.md) | Vector embedding API |
| [Supabase schema](api/SUPABASE_SCHEMA.md) | Database schema reference |
| [Nostr relay](api/NOSTR_RELAY.md) | Relay protocol reference |

### Features

| Document | Description |
|----------|-------------|
| [Authentication](features/authentication.md) | Auth system implementation |
| [DM implementation](features/dm-implementation.md) | NIP-17/59 encrypted messaging |
| [Mobile UI components](features/mobile-ui-components.md) | Touch-optimised components |
| [Secure clipboard](features/secure-clipboard.md) | Memory-safe data handling |

### Community Forum

| Document | Description |
|----------|-------------|
| [Community overview](community/README.md) | Forum architecture |
| [UI components](community/UI_COMPONENTS.md) | Forum component library |

---

## Build Commands

```bash
# Development server (generates workshop list first)
npm run dev

# Production build
npm run build

# Development build
npm run build:dev

# Lint (ESLint 9 flat config)
npm run lint

# Preview production build
npm run preview
```

---

## Repository

- **Source:** [github.com/DreamLab-AI/dreamlab-ai-website](https://github.com/DreamLab-AI/dreamlab-ai-website)
- **Live site:** [dreamlab-ai.com](https://dreamlab-ai.com) / [thedreamlab.uk](https://thedreamlab.uk)
- **Issues:** [GitHub Issues](https://github.com/DreamLab-AI/dreamlab-ai-website/issues)
- **Forked from:** [TheDreamLabUK/website](https://github.com/TheDreamLabUK/website)

---

**Last updated:** 2026-03-01
**Maintained by:** DreamLab AI Engineering
