---
title: "ADR-010: Return to Cloudflare Platform"
description: "Decision to migrate services back to Cloudflare Workers, Pages, D1, KV, and R2 from GCP Cloud Run"
category: reference
tags: [adr, cloudflare, workers, infrastructure, migration, devops]
difficulty: advanced
last-updated: 2026-02-28
---

# ADR-010: Return to Cloudflare Platform

## Status

Accepted (supersedes ADR-003)

## Date

2026-02-28

## Context

DreamLab previously ran on Cloudflare Workers under the name "Nosflare" before migrating to GCP Cloud Run on 2026-01-25 (commit `7df51e1`). ADR-003 rejected Cloudflare Workers citing two primary concerns:

1. **WebSocket limitations** -- now resolved. Durable Objects support full WebSocket connections with the Hibernation API for idle cost reduction.
2. **D1 immaturity** -- now resolved. Cloudflare D1 is GA with a production SLA, supporting transactions, indexes, and databases up to 10GB.

Additional platform improvements since ADR-003:

- Workers paid tier provides 30s CPU time (up from 10ms on free tier)
- R2 provides S3-compatible object storage with 10GB free tier
- KV provides globally replicated key-value storage
- Cloudflare Pages offers unlimited bandwidth, automatic PR preview deploys, and 300+ edge PoPs
- Worker bundle size limit increased to 10MB on paid tier with WASM support
- The paa.pub project demonstrates that WebAuthn + Solid Pod storage runs entirely on Cloudflare Workers + KV + R2 with zero containers

The current GCP infrastructure costs approximately $50-100/month, requires 8 GitHub Actions workflows, a complex 8-step bootstrap sequence (SECRETS_SETUP.md), Docker builds via Artifact Registry, IAM service accounts, and Secret Manager versioning. Cold start latency ranges from 1-10 seconds on Cloud Run.

## Decision

Return to the Cloudflare platform. Migrate the majority of services to Cloudflare Workers while retaining select services on GCP Cloud Run where Cloudflare limitations remain relevant.

### Services migrated to Cloudflare Workers

| Service | Storage Backend | Rationale |
|---------|----------------|-----------|
| **auth-api** | D1 (credentials, challenges) + KV (sessions) | WebAuthn + NIP-98 proven on Workers (paa.pub). PostgreSQL schema maps cleanly to D1 SQLite. |
| **pod-api** (replaces JSS) | R2 (pod files) + KV (ACLs, metadata) | Replace CSS 7.x with custom Workers-native pod storage. Eliminates ephemeral storage and permissive ACL problems. |
| **image-api** | R2 (uploads) | Image storage on R2. Transforms via Workers paid tier (30s CPU). |
| **link-preview-api** | Stateless | Lightweight HTTP fetch + parse. Natural Workers fit. |

### Services retained on GCP Cloud Run

| Service | Rationale |
|---------|-----------|
| **nostr-relay** | Persistent WebSocket connections with Cloud SQL. Durable Objects migration possible but adds complexity -- evaluate separately. |
| **embedding-api** | ML inference needs CPU/memory beyond Workers limits. |

### Frontend deployment

Deploy the existing Vite SPA to Cloudflare Pages with zero code changes. The `dist/` build output deploys directly via `wrangler pages deploy`.

### Storage architecture

| Cloudflare Service | Usage |
|--------------------|-------|
| **D1** | Structured data: `webauthn_credentials`, `challenges` tables (auth-api) |
| **KV** | Sessions, ACL documents, pod metadata, configuration |
| **R2** | Pod file storage (per-user Solid pods), uploaded media/images |

### DDD bounded contexts

| Context | Runtime | Storage |
|---------|---------|---------|
| **AuthContext** | Cloudflare Workers | D1 + KV |
| **PodContext** | Cloudflare Workers | R2 + KV |
| **MediaContext** | Cloudflare Workers | R2 |
| **RelayContext** | GCP Cloud Run | Cloud SQL (PostgreSQL) |
| **IdentityContext** | Cross-cutting | did:nostr:{pubkey} + WebID at pod URL |

## Consequences

### Positive

- **~50-60% cost reduction**: $50-100/month (GCP) to $20-40/month (Cloudflare $5/mo paid + retained Cloud Run services)
- **Sub-5ms cold starts** on Workers vs 1-10s on Cloud Run
- **300+ edge PoPs** for global low-latency responses (vs single us-central1 region on GCP)
- **Reduced deployment complexity**: no Artifact Registry, no Docker builds for migrated services, no 8-step bootstrap sequence
- **Automatic PR preview deploys** via Cloudflare Pages
- **Pod data durability**: R2 provides 99.999999999% durability vs ephemeral Cloud Run filesystem
- **Simplified secrets management**: Workers secrets are free and integrated (no Secret Manager versioning)
- **Fewer GitHub Actions workflows**: consolidate from 8 workflows to 4-5

### Negative

- **Workers CPU limit**: 30s on paid tier constrains compute-heavy operations (image transforms, ML)
- **KV write limit**: 1K writes/day on free tier requires $5/month paid plan for production
- **Split infrastructure**: relay and embedding-api remain on GCP, requiring two platforms to manage
- **D1 limitations**: SQLite semantics differ from PostgreSQL (no full-text search, different type system)
- **Migration effort**: multi-week phased migration with service-by-service cutover

### Neutral

- Cloudflare vendor lock-in replaces GCP vendor lock-in (storage APIs differ but workloads are portable)
- Durable Objects available as future option for relay WebSocket migration but not required
- JSON-LD ACL evaluator (~200 lines, custom) replaces unmaintained WAC libraries

## Alternatives Considered

### Stay on GCP Cloud Run

- Maintains current infrastructure with no migration effort
- Rejected: higher ongoing cost, cold start latency, deployment complexity, ephemeral pod storage unresolved

### Hybrid with Cloudflare CDN only (no Workers)

- Use Cloudflare as CDN/proxy in front of GCP Cloud Run
- Rejected: does not address cold starts, cost, or deployment complexity; adds another layer without eliminating GCP

### Full migration including relay to Durable Objects

- Move all services including nostr-relay to Cloudflare
- Rejected (for now): Durable Objects WebSocket + Hibernation API adds Cloudflare-specific complexity for the relay. Evaluate separately after primary migration completes.

### AWS Lambda + CloudFront

- Mature ecosystem with broad service coverage
- Rejected: higher complexity and cost than Cloudflare Workers; no advantage over current GCP setup

## References

- Supersedes: ADR-003 (GCP Cloud Run Infrastructure)
- Related: ADR-008 (PostgreSQL Relay Storage -- retained for relay on Cloud Run)
- PRD: `docs/prd-cloudflare-workers-migration.md`
- GCP migration history: `.github/workflows/GCP_MIGRATION_SUMMARY.md`
- paa.pub reference implementation: Cloudflare Workers + KV + R2 for WebAuthn + Solid Pod
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
