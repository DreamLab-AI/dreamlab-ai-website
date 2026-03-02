# Deployment Documentation

**Last Updated:** 2026-03-01

Comprehensive guide to deploying and maintaining the DreamLab AI platform: a React SPA on GitHub Pages, SvelteKit community forum, and 5 Cloudflare Workers backend services. All GCP infrastructure has been deleted as of 2026-03-02.

---

## Architecture Overview

```
+---------------------------------------------------------------+
| GitHub Repository (main branch)                               |
| - React 18.3 SPA (Vite + TypeScript + Tailwind CSS)           |
| - SvelteKit community forum (static adapter)                  |
| - Workers code in workers/ (auth-api, pod-api, search-api)    |
| - Legacy services dir (auth-api reference code only)          |
| - GitHub Actions CI/CD workflows                               |
+----------+------------------+--------------------+------------+
           |                  |                    |
           v                  v                    v
+------------------+  +------------------------+
| GitHub Pages      |  | Cloudflare Workers     |
|                   |  | (*.workers.dev)        |
| - React SPA       |  |                        |
|   -> dist/        |  | - auth-api    (D1+KV)  |
| - SvelteKit forum |  | - pod-api     (R2+KV)  |
|   -> dist/community|  | - search-api  (WASM+R2)|
| - Static assets   |  | - nostr-relay (D1+DO)  |
|                   |  | - link-preview (Cache) |
| dreamlab-ai.com   |  |                        |
| thedreamlab.uk    |  | D1: credentials, relay |
+------------------+  | R2: pods, vectors      |
                      | KV: sessions, ACLs     |
                      +------------------------+

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
| **link-preview** | Cloudflare Worker + Cache API | `workers-deploy.yml` | Deployed at `dreamlab-link-preview.solitary-paper-764d.workers.dev` |
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

### Removed Workflows (GCP — deleted 2026-03-02)

All GCP Cloud Run workflows have been deleted. Services now deploy via `workers-deploy.yml`.

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
CLOUDFLARE_API_TOKEN            # Cloudflare API token (Workers + Pages deploy)
CLOUDFLARE_ACCOUNT_ID           # Cloudflare account ID (Workers + Pages deploy)
```

### GitHub Repository Variables

```
FAIRFIELD_ADMIN_PUBKEY          # Nostr admin pubkey (hex)
CLOUDFLARE_PAGES_ENABLED        # 'true' to enable Cloudflare Pages deploy
```

## Quick Rollback

```bash
# GitHub Pages: revert commit and re-deploy
git revert <sha> --no-edit && git push origin main

# Cloudflare Workers: rollback to previous deployment
npx wrangler rollback --name <worker-name>
```

See [ROLLBACK.md](./ROLLBACK.md) for detailed procedures.

---

## Related Documentation

- [Security Overview](../security/SECURITY_OVERVIEW.md)
- [Auth API Reference](../api/AUTH_API.md)
- [Nostr Relay API](../api/NOSTR_RELAY.md)

---

*Last major revision: 2026-03-01.*
