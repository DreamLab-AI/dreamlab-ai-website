# Deployment Documentation

**Last Updated:** 2026-02-28

Comprehensive guide to deploying and maintaining the DreamLab AI platform: a React SPA on GitHub Pages, SvelteKit community forum, and 6 GCP Cloud Run backend services, with a planned migration to Cloudflare Workers.

---

## Architecture Overview

```
+---------------------------------------------------------------+
| GitHub Repository (main branch)                               |
| - React 18.3 SPA (Vite + TypeScript + Tailwind CSS)           |
| - SvelteKit community forum (static adapter)                  |
| - 6 backend service directories                               |
| - GitHub Actions CI/CD workflows                               |
+------------------+--------------------+-----------------------+
                   |                    |
                   v                    v
     +------------------+    +-------------------------+
     | GitHub Pages      |    | GCP Cloud Run           |
     |                   |    | (cumbriadreamlab,       |
     | - React SPA       |    |  us-central1)           |
     |   -> dist/        |    |                         |
     | - SvelteKit forum |    | - auth-api              |
     |   -> dist/community|   | - jss (Solid pods)      |
     | - Static assets   |    | - nostr-relay           |
     |                   |    | - embedding-api         |
     | dreamlab-ai.com   |    | - image-api             |
     | thedreamlab.uk    |    | - link-preview-api      |
     +------------------+    +------------+------------+
                                          |
                              +-----------v-----------+
                              | Cloud SQL (PostgreSQL) |
                              | Cloud Storage (pods)   |
                              | Artifact Registry      |
                              | Secret Manager         |
                              +------------------------+

     +--------------------------------------------------+
     | Cloudflare (planned, gated by env var)            |
     | - Pages: static SPA deployment                    |
     | - Workers: auth-api, pod-api, image-api           |
     | - D1: WebAuthn credentials                        |
     | - R2: pod files, image uploads                    |
     | - KV: sessions, ACL metadata                      |
     | Currently: CLOUDFLARE_PAGES_ENABLED != 'true'     |
     +--------------------------------------------------+
```

## Quick Reference

| Target | Technology | Workflow | URL |
|--------|-----------|---------|-----|
| **Main site** | React SPA (Vite) | `deploy.yml` | https://dreamlab-ai.com |
| **Community forum** | SvelteKit (static adapter) | `deploy.yml` (bundled) | https://dreamlab-ai.com/community |
| **auth-api** | Express + WebAuthn | `auth-api.yml` | Cloud Run (us-central1) |
| **jss** | Community Solid Server 7.x | `jss.yml` | Cloud Run (us-central1) |
| **nostr-relay** | Node.js WebSocket relay | `fairfield-relay.yml` | Cloud Run (us-central1) |
| **embedding-api** | Python (FastAPI) | `fairfield-embedding-api.yml` | Cloud Run (us-central1) |
| **image-api** | Node.js | `fairfield-image-api.yml` | Cloud Run (us-central1) |
| **link-preview-api** | Node.js | (existing) | Cloud Run (us-central1) |
| **Cloudflare Pages** | Static SPA | `deploy.yml` (gated) | Planned |

## Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [GITHUB_PAGES.md](./GITHUB_PAGES.md) | Static site build and deployment | All developers |
| [CLOUD_SERVICES.md](./CLOUD_SERVICES.md) | GCP Cloud Run backend services | DevOps, infrastructure |
| [CLOUDFLARE_WORKERS.md](./CLOUDFLARE_WORKERS.md) | Planned Cloudflare Workers architecture | Architecture, DevOps |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Dev, staging, production configuration | All developers |
| [MONITORING.md](./MONITORING.md) | Health checks and observability | DevOps, SRE |
| [ROLLBACK.md](./ROLLBACK.md) | Emergency recovery procedures | DevOps, on-call |

## Deployment Workflows

### Automatic (on push to main)

| Workflow | Trigger Path | Duration |
|----------|-------------|----------|
| `deploy.yml` | Any push to main | 5-10 min |
| `auth-api.yml` | `community-forum/services/auth-api/**` | 3-5 min |
| `jss.yml` | `community-forum/services/jss/**` | 3-5 min |
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
VITE_AUTH_API_URL               # auth-api Cloud Run URL
GCP_PROJECT_ID                 # cumbriadreamlab
GCP_SA_KEY                     # Service account JSON key
CLOUDFLARE_API_TOKEN            # Cloudflare API token (when enabled)
CLOUDFLARE_ACCOUNT_ID           # Cloudflare account ID (when enabled)
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

*Last major revision: 2026-02-28.*
