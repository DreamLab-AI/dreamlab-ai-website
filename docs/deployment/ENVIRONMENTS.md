# Environment Configuration

**Last Updated:** 2026-02-28

Development, staging, and production environment setup for the DreamLab AI platform.

---

## Environment Overview

| Aspect | Development | Staging | Production |
|--------|-------------|---------|-----------|
| **Location** | Local machine | Not configured | GitHub Pages + GCP Cloud Run |
| **Main site** | `npm run dev` (localhost:5173) | -- | https://dreamlab-ai.com |
| **Forum** | `npm run dev` (localhost:5174) | -- | https://dreamlab-ai.com/community |
| **Backend** | Local services (optional) | -- | Cloud Run (us-central1) |
| **Database** | Local PostgreSQL (optional) | -- | Cloud SQL |
| **Build time** | ~1 min | -- | 5-10 min |
| **Cost** | Free | -- | ~$50-100/month |

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
VITE_AUTH_API_URL=https://auth-api-xxx-uc.a.run.app
```

Create `.env` in `community-forum/`:

```env
VITE_AUTH_API_URL=https://auth-api-xxx-uc.a.run.app
VITE_RELAY_URL=wss://nostr-relay-xxx.run.app
VITE_EMBEDDING_API_URL=https://embedding-api-xxx.run.app
VITE_LINK_PREVIEW_API_URL=https://link-preview-xxx.run.app
VITE_IMAGE_API_URL=https://image-api-xxx.run.app
VITE_IMAGE_BUCKET=minimoonoir-images
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

### Running Backend Services Locally (Optional)

```bash
# auth-api
cd community-forum/services/auth-api
npm install
# Create .env with DATABASE_URL, RP_ID, RP_NAME, RP_ORIGIN, RELAY_URL
npm run dev
# Serves at http://localhost:8080

# nostr-relay
cd community-forum/services/nostr-relay
npm install
npm run dev
# Serves at ws://localhost:8080

# embedding-api
cd community-forum/services/embedding-api
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8081
# Serves at http://localhost:8081
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
4. Deploy backend services as separate Cloud Run revisions with staging-specific configuration

---

## Production Environment

### Infrastructure

| Component | Service | URL/Endpoint |
|-----------|---------|-------------|
| Main site | GitHub Pages | https://dreamlab-ai.com |
| Forum | GitHub Pages | https://dreamlab-ai.com/community |
| auth-api | Cloud Run | `https://auth-api-<hash>-uc.a.run.app` |
| jss | Cloud Run | `https://jss-<hash>-uc.a.run.app` |
| nostr-relay | Cloud Run | `wss://nostr-relay-<hash>-uc.a.run.app` |
| embedding-api | Cloud Run | `https://embedding-api-<hash>-uc.a.run.app` |
| image-api | Cloud Run | `https://image-api-<hash>-uc.a.run.app` |
| Database | Cloud SQL | `cumbriadreamlab:us-central1:nostr-db` |
| Images | Cloud Storage | `gs://minimoonoir-images` |
| Pods | Cloud Storage | `gs://dreamlab-pods` |

### Deployment Process

1. Push to `main` branch (or merge PR)
2. GitHub Actions workflows trigger automatically
3. Static site builds and deploys to `gh-pages` branch (5-10 min)
4. Backend services build, push Docker images, and deploy to Cloud Run (3-5 min each, triggered only by path changes)

### Production Secrets

**GitHub Repository Secrets**:

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_AUTH_API_URL` | Auth API Cloud Run URL |
| `GCP_PROJECT_ID` | `cumbriadreamlab` |
| `GCP_SA_KEY` | Service account JSON key |

**GCP Secret Manager**:

| Secret | Purpose |
|--------|---------|
| `nostr-db-url` | PostgreSQL connection string |
| `jss-base-url` | JSS Cloud Run URL |
| `admin-pubkey` | Admin Nostr pubkeys |

### Environment Variables Reference

#### Main Site (.env, build-time)

| Variable | Required | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |
| `VITE_AUTH_API_URL` | Yes | Auth API base URL |

#### auth-api (runtime)

| Variable | Required | Source | Description |
|----------|---------|--------|-------------|
| `DATABASE_URL` | Yes | Secret Manager | PostgreSQL connection string |
| `RELAY_URL` | Yes | Env var | Nostr relay WebSocket URL |
| `RP_ID` | Yes | Env var | WebAuthn relying party ID (`dreamlab-ai.com`) |
| `RP_NAME` | Yes | Env var | WebAuthn relying party name |
| `RP_ORIGIN` | Yes | Env var | Expected origin (`https://dreamlab-ai.com`) |
| `JSS_BASE_URL` | No | Secret Manager | JSS URL for pod provisioning |
| `NODE_ENV` | No | Env var | `production` |
| `PORT` | No | Env var | Default `8080` |

#### jss (runtime)

| Variable | Required | Source | Description |
|----------|---------|--------|-------------|
| `JSS_BASE_URL` | Yes | Secret Manager | Own Cloud Run URL |
| `NODE_ENV` | No | Env var | `production` |

#### nostr-relay (runtime)

| Variable | Required | Source | Description |
|----------|---------|--------|-------------|
| `DATABASE_URL` | Yes | Secret Manager | PostgreSQL connection string |
| `ADMIN_PUBKEYS` | Yes | Secret Manager | Comma-separated admin pubkeys |
| `RATE_LIMIT_EVENTS_PER_SEC` | No | Env var | Default `10` |
| `RATE_LIMIT_MAX_CONNECTIONS` | No | Env var | Default `10` |
| `NODE_ENV` | No | Env var | `production` |

#### Community Forum (build-time)

| Variable | Required | Description |
|----------|---------|-------------|
| `BASE_PATH` | Yes | `/community` |
| `VITE_RELAY_URL` | Yes | Nostr relay WebSocket URL |
| `VITE_EMBEDDING_API_URL` | Yes | Embedding service URL |
| `VITE_LINK_PREVIEW_API_URL` | Yes | Link preview service URL |
| `VITE_IMAGE_API_URL` | Yes | Image service URL |
| `VITE_IMAGE_BUCKET` | Yes | GCS bucket name |
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

# Cloud Run services
gcloud run services list --region=us-central1 --format="table(metadata.name,status.url)"

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
