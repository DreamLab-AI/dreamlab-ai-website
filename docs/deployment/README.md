# Deployment Documentation

**Last Updated:** 2026-03-01

Comprehensive guide to deploying and maintaining the DreamLab AI platform: a React SPA on GitHub Pages, SvelteKit community forum, GCP Cloud Run backend services (being migrated), and Cloudflare Workers (deployed).

---

## Architecture Overview

```
+---------------------------------------------------------------+
| GitHub Repository (main branch)                               |
| - React 18.3 SPA (Vite + TypeScript + Tailwind CSS)           |
| - SvelteKit community forum (static adapter)                  |
| - Workers code in workers/ (auth-api, pod-api, search-api)    |
| - GCP service directories (retained: embedding, image, jss)   |
| - GitHub Actions CI/CD workflows                               |
+----------+------------------+--------------------+------------+
           |                  |                    |
           v                  v                    v
+------------------+  +-------------------+  +------------------+
| GitHub Pages      |  | Cloudflare Workers |  | GCP Cloud Run    |
|                   |  | (deployed to       |  | (retained svcs)  |
| - React SPA       |  |  *.workers.dev)    |  |                  |
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
| **auth-api** | Cloudflare Worker + D1 | `workers-deploy.yml` | Deployed at `dreamlab-auth-api.solitary-paper-764d.workers.dev` |
| **pod-api** | Cloudflare Worker + R2 | `workers-deploy.yml` | Deployed at `dreamlab-pod-api.solitary-paper-764d.workers.dev` |
| **search-api** | Cloudflare Worker + WASM | `workers-deploy.yml` | Deployed at `dreamlab-search-api.solitary-paper-764d.workers.dev` |
| **nostr-relay** | Cloudflare Worker + D1 + DO | `workers-deploy.yml` | Deployed at `dreamlab-nostr-relay.solitary-paper-764d.workers.dev` |
| **embedding-api** | Python (FastAPI) | `fairfield-embedding-api.yml` | Cloud Run (us-central1) -- manual deploy only |
| **image-api** | Node.js | `fairfield-image-api.yml` | Cloud Run (us-central1) -- manual deploy only |
| **link-preview-api** | Node.js | (existing) | Cloud Run (us-central1) |
| **Cloudflare Pages** | Static SPA | `deploy.yml` (gated) | Ready to enable |

## Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [GITHUB_PAGES.md](./GITHUB_PAGES.md) | Static site build and deployment | All developers |
| [CLOUD_SERVICES.md](./CLOUD_SERVICES.md) | GCP Cloud Run backend services | DevOps, infrastructure |
| [CLOUDFLARE_WORKERS.md](./CLOUDFLARE_WORKERS.md) | Cloudflare Workers deployment | Architecture, DevOps |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Dev, staging, production configuration | All developers |
| [MONITORING.md](./MONITORING.md) | Health checks and observability | DevOps, SRE |
| [ROLLBACK.md](./ROLLBACK.md) | Emergency recovery procedures | DevOps, on-call |

## Deployment Workflows

### Automatic (on push to main)

| Workflow | Trigger Path | Duration |
|----------|-------------|----------|
| `deploy.yml` | Any push to main | 5-10 min |
| `workers-deploy.yml` | `workers/**` | 3-5 min |

### Manual Only (GCP Cloud Run -- requires GCP_SA_KEY)

| Workflow | Service | Duration |
|----------|---------|----------|
| `visionflow-bridge.yml` | VisionFlow Bridge | 3-5 min |
| `fairfield-embedding-api.yml` | Embedding API | 10-15 min |
| `fairfield-image-api.yml` | Image API | 3-5 min |
| `jss.yml` | JSS (Solid pods) | 3-5 min |

### Removed Workflows

| Workflow | Reason |
|----------|--------|
| `auth-api.yml` | Replaced by Cloudflare Worker in `workers-deploy.yml` |
| `fairfield-relay.yml` | Replaced by Cloudflare Worker in `workers-deploy.yml` |

### Manual Trigger

```bash
gh workflow run deploy.yml --ref main
gh workflow run workers-deploy.yml --ref main
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
