# Environment Configuration

**Last Updated:** 2026-03-02

Development, staging, and production environment setup for the DreamLab AI platform.

---

## Environment Overview

| Aspect | Development | Staging | Production |
|--------|-------------|---------|-----------|
| **Location** | Local machine | Not configured | GitHub Pages + Cloudflare Workers |
| **Main site** | `npm run dev` (localhost:5173) | -- | https://dreamlab-ai.com |
| **Forum** | `npm run dev` (localhost:5174) | -- | https://dreamlab-ai.com/community |
| **Backend** | Local services (optional) | -- | Cloudflare Workers |
| **Database** | Local SQLite (optional) | -- | D1 + KV + R2 |
| **Build time** | ~1 min | -- | 5-10 min |
| **Cost** | Free | -- | ~$6/month |

---

## Development Environment

### Prerequisites

```bash
node --version   # 20+
npm --version    # 9+
git --version    # 2.x
```

### Installation

```bash
# 1. Clone repository
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website

# 2. Install main site dependencies
npm install

# 3. Install community forum dependencies
cd community-forum
npm install
cd ..
```

### Environment Variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AUTH_API_URL=https://dreamlab-auth-api.solitary-paper-764d.workers.dev
```

Create `.env` in `community-forum/`:

```env
VITE_AUTH_API_URL=https://dreamlab-auth-api.solitary-paper-764d.workers.dev
VITE_RELAY_URL=wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev
VITE_SEARCH_API_URL=https://dreamlab-search-api.solitary-paper-764d.workers.dev
VITE_ADMIN_PUBKEY=<admin-pubkey-hex>
```

### Running the Development Server

```bash
# Main site (React SPA)
npm run dev
# Serves at http://localhost:5173

# Community forum (in a separate terminal)
cd community-forum
npm run dev
# Serves at http://localhost:5174
```

The main site dev server automatically runs `scripts/generate-workshop-list.mjs` before starting.

### Running Backend Workers Locally (Optional)

```bash
# auth-api Worker
cd workers/auth-api
npx wrangler dev
# Serves at http://localhost:8787

# pod-api Worker
cd workers/pod-api
npx wrangler dev
# Serves at http://localhost:8788

# search-api Worker
cd workers/search-api
npx wrangler dev
# Serves at http://localhost:8789
```

### Building and Previewing

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

---

## Staging Environment

A staging environment is not currently configured. To add one:

1. Create a GitHub environment named `staging` in repository settings
2. Add environment-specific secrets and variables
3. Modify `deploy.yml` to include a staging deployment job with environment protection rules
4. Deploy backend Workers with staging-specific wrangler configuration

---

## Production Environment

### Infrastructure

| Component | Service | URL/Endpoint |
|-----------|---------|-------------|
| Main site | GitHub Pages | https://dreamlab-ai.com |
| Forum | GitHub Pages | https://dreamlab-ai.com/community |
| auth-api | Cloudflare Worker | `dreamlab-auth-api.solitary-paper-764d.workers.dev` |
| pod-api | Cloudflare Worker | `dreamlab-pod-api.solitary-paper-764d.workers.dev` |
| search-api | Cloudflare Worker | `dreamlab-search-api.solitary-paper-764d.workers.dev` |
| nostr-relay | Cloudflare Worker + D1 + DO | `dreamlab-nostr-relay.solitary-paper-764d.workers.dev` |
| Database | D1 | `dreamlab-auth`, `dreamlab-relay` |
| Pod storage | R2 | `dreamlab-pods` |
| Vector storage | R2 | `dreamlab-vectors` |

### Deployment Process

1. Push to `main` branch (or merge PR)
2. GitHub Actions workflows trigger automatically
3. Static site builds and deploys to `gh-pages` branch (5-10 min)
4. Workers deploy via `workers-deploy.yml` (2-3 min, triggered by changes in `workers/`)

### Production Secrets

**GitHub Repository Secrets**:

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_AUTH_API_URL` | Auth API Cloudflare Workers URL |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

**Cloudflare Workers Secrets** (via `wrangler secret put`):

| Secret | Purpose |
|--------|---------|
| `ADMIN_PUBKEYS` | Admin Nostr pubkeys |

### Environment Variables Reference

#### Main Site (.env, build-time)

| Variable | Required | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |
| `VITE_AUTH_API_URL` | Yes | Auth API base URL |

#### auth-api Worker (wrangler.toml vars)

| Variable | Required | Source | Description |
|----------|---------|--------|-------------|
| `RP_ID` | Yes | wrangler.toml `[vars]` | WebAuthn relying party ID (`dreamlab-ai.com`) |
| `RP_NAME` | Yes | wrangler.toml `[vars]` | WebAuthn relying party name |
| `EXPECTED_ORIGIN` | Yes | wrangler.toml `[vars]` | Expected origin (`https://dreamlab-ai.com`) |
| `DB` | Yes | D1 binding | `dreamlab-auth` D1 database |
| `SESSIONS` | Yes | KV binding | Session KV namespace |

#### nostr-relay (Cloudflare Worker — wrangler.toml vars)

| Variable | Required | Source | Description |
|----------|---------|--------|-------------|
| `ADMIN_PUBKEYS` | Yes | wrangler.toml `[vars]` | Comma-separated admin pubkeys |
| `RELAY_NAME` | No | wrangler.toml `[vars]` | Relay display name |
| `ALLOWED_ORIGIN` | No | wrangler.toml `[vars]` | CORS origin |
| `DB` | Yes | D1 binding | `dreamlab-relay` D1 database |
| `RELAY` | Yes | DO binding | `NostrRelayDO` Durable Object |

#### Community Forum (build-time)

| Variable | Required | Description |
|----------|---------|-------------|
| `BASE_PATH` | Yes | `/community` |
| `VITE_RELAY_URL` | Yes | Nostr relay WebSocket URL |
| `VITE_POD_API_URL` | Yes | Pod-api Worker URL |
| `VITE_SEARCH_API_URL` | Yes | Search-api Worker URL |
| `VITE_LINK_PREVIEW_API_URL` | Yes | Link-preview Worker URL |
| `VITE_IMAGE_ENCRYPTION_ENABLED` | No | `true` to enable |
| `VITE_ADMIN_PUBKEY` | Yes | Admin Nostr pubkey (hex) |
| `VITE_APP_NAME` | No | `DreamLab Community` |
| `VITE_AUTH_API_URL` | Yes | Auth API base URL |

---

## Health Checks

```bash
# Main site
curl -s -o /dev/null -w "%{http_code}" https://dreamlab-ai.com

# auth-api
curl -s https://<auth-api-url>/health | jq .

# Cloudflare Workers
npx wrangler deployments list

# Recent deployments
gh run list --workflow=deploy.yml --limit=5
```

---

## Related Documentation

- [Deployment Overview](./README.md)
- [GitHub Pages](./GITHUB_PAGES.md)
- [Cloud Services](./CLOUD_SERVICES.md)
- [Cloudflare Workers](./CLOUDFLARE_WORKERS.md)

---

*Last major revision: 2026-02-28.*
