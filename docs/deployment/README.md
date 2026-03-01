# Deployment Documentation

**Last Updated:** 2026-03-01

Comprehensive guide to deploying and maintaining the DreamLab AI platform: a React SPA on GitHub Pages, SvelteKit community forum, GCP Cloud Run backend services (being migrated), and Cloudflare Workers (code complete, deployment pending).

---

## Architecture Overview

```
+---------------------------------------------------------------+
| GitHub Repository (main branch)                               |
| - React 18.3 SPA (Vite + TypeScript + Tailwind CSS)           |
| - SvelteKit community forum (static adapter)                  |
| - Workers code in workers/ (auth-api, pod-api, search-api)    |
| - GCP service directories (retained: nostr-relay, embedding)  |
| - GitHub Actions CI/CD workflows                               |
+----------+------------------+--------------------+------------+
           |                  |                    |
           v                  v                    v
+------------------+  +-------------------+  +------------------+
| GitHub Pages      |  | Cloudflare Workers |  | GCP Cloud Run    |
|                   |  | (code complete,    |  | (retained svcs)  |
| - React SPA       |  |  deploy pending)   |  |                  |
|   -> dist/        |  |                    |  | - nostr-relay    |
| - SvelteKit forum |  | - auth-api Worker  |  | - embedding-api  |
|   -> dist/community|  |   +-- D1, KV      |  |                  |
| - Static assets   |  | - pod-api Worker   |  +--------+---------+
|                   |  |   +-- R2, KV       |           |
| dreamlab-ai.com   |  | - search-api Worker|  +--------v---------+
| thedreamlab.uk    |  |   +-- WASM (42KB)  |  | Cloud SQL (PG)   |
+------------------+  |   +-- R2, KV       |  | Artifact Registry |
                      |                    |  +------------------+
                      | - D1: credentials  |
                      | - R2: pods, images |
                      | - KV: sessions,ACL |
                      +--------------------+

+---------------------------------------------------+
| Cloudflare Pages (gated, ready to enable)         |
| - Static SPA deployment                           |
| - Set CLOUDFLARE_PAGES_ENABLED='true' to activate |
+---------------------------------------------------+
```

## Quick Reference

| Target | Technology | Workflow | Status |
|--------|-----------|---------|--------|
| **Main site** | React SPA (Vite) | `deploy.yml` | Live (https://dreamlab-ai.com) |
| **Community forum** | SvelteKit (static adapter) | `deploy.yml` (bundled) | Live (https://dreamlab-ai.com/community) |
| **auth-api** | Cloudflare Worker + D1 | `workers-deploy.yml` | Workers (code complete, deployment pending) |
| **pod-api** | Cloudflare Worker + R2 | `workers-deploy.yml` | Workers (code complete, deployment pending) |
| **search-api** | Cloudflare Worker + WASM | `workers-deploy.yml` | Workers (code complete, deployment pending) |
| **nostr-relay** | Node.js WebSocket relay | `fairfield-relay.yml` | Cloud Run (us-central1) -- retained |
| **embedding-api** | Python (FastAPI) | `fairfield-embedding-api.yml` | Cloud Run (us-central1) -- retained |
| **image-api** | Node.js | `fairfield-image-api.yml` | Cloud Run (us-central1) -- migration target |
| **link-preview-api** | Node.js | (existing) | Cloud Run (us-central1) |
| **Cloudflare Pages** | Static SPA | `deploy.yml` (gated) | Ready to enable |

## Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [GITHUB_PAGES.md](./GITHUB_PAGES.md) | Static site build and deployment | All developers |
| [CLOUD_SERVICES.md](./CLOUD_SERVICES.md) | GCP Cloud Run backend services | DevOps, infrastructure |
| [CLOUDFLARE_WORKERS.md](./CLOUDFLARE_WORKERS.md) | Cloudflare Workers migration (code complete) | Architecture, DevOps |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Dev, staging, production configuration | All developers |
| [MONITORING.md](./MONITORING.md) | Health checks and observability | DevOps, SRE |
| [ROLLBACK.md](./ROLLBACK.md) | Emergency recovery procedures | DevOps, on-call |

## Deployment Workflows

### Automatic (on push to main)

| Workflow | Trigger Path | Duration |
|----------|-------------|----------|
| `deploy.yml` | Any push to main | 5-10 min |
| `workers-deploy.yml` | `workers/**`, `community-forum/packages/nip98/**` | 3-5 min |
| `auth-api.yml` | `community-forum/services/auth-api/**` | 3-5 min (legacy, being replaced) |
| `jss.yml` | `community-forum/services/jss/**` | 3-5 min (legacy, being replaced) |
| `fairfield-relay.yml` | `community-forum/services/nostr-relay/**` | 3-5 min |
| `fairfield-embedding-api.yml` | `community-forum/services/embedding-api/**` | 10-15 min |
| `fairfield-image-api.yml` | `community-forum/services/image-api/**` | 3-5 min |

### Manual Trigger

All workflows support `workflow_dispatch` for manual execution:

```bash
gh workflow run deploy.yml --ref main
gh workflow run auth-api.yml --ref main
gh run watch
```

## Required Secrets and Variables

### GitHub Repository Secrets

```
VITE_SUPABASE_URL              # Supabase project URL
VITE_SUPABASE_ANON_KEY         # Supabase anonymous key
VITE_AUTH_API_URL               # auth-api URL (will point to Workers after migration)
GCP_PROJECT_ID                 # cumbriadreamlab (for retained Cloud Run services)
GCP_SA_KEY                     # Service account JSON key (for retained Cloud Run services)
CLOUDFLARE_API_TOKEN            # Cloudflare API token (REQUIRED for Workers + Pages deploy)
CLOUDFLARE_ACCOUNT_ID           # Cloudflare account ID (REQUIRED for Workers + Pages deploy)
```

### GitHub Repository Variables

```
FAIRFIELD_RELAY_URL             # wss://... Nostr relay
FAIRFIELD_EMBEDDING_API_URL     # https://... embedding service
FAIRFIELD_LINK_PREVIEW_API_URL  # https://... link preview service
FAIRFIELD_IMAGE_API_URL         # https://... image service
FAIRFIELD_IMAGE_BUCKET          # GCS bucket name
FAIRFIELD_ADMIN_PUBKEY          # Nostr admin pubkey (hex)
CLOUDFLARE_PAGES_ENABLED        # 'true' to enable Cloudflare Pages deploy
```

### GCP Secret Manager

```
nostr-db-url                    # PostgreSQL connection string
jss-base-url                    # JSS Cloud Run URL (chicken-and-egg)
admin-pubkey                    # Admin Nostr pubkeys (comma-separated)
```

## Quick Rollback

```bash
# GitHub Pages: revert commit and re-deploy
git revert <sha> --no-edit && git push origin main

# Cloud Run: route traffic to previous revision
gcloud run services update-traffic <service> \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1
```

See [ROLLBACK.md](./ROLLBACK.md) for detailed procedures.

---

## Related Documentation

- [Security Overview](../security/SECURITY_OVERVIEW.md)
- [Auth API Reference](../api/AUTH_API.md)
- [Nostr Relay API](../api/NOSTR_RELAY.md)

---

*Last major revision: 2026-03-01.*
