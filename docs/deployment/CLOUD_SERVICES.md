# Cloud Services Deployment

**Last Updated:** 2026-03-01

> **Migration Notice (2026-03-01):** The following services are being migrated to Cloudflare Workers per [ADR-010](../adr/010-return-to-cloudflare.md): **auth-api**, **jss** (replaced by pod-api Worker), and **image-api**. Worker code is complete in `workers/` and deployment is pending Cloudflare account setup. See [CLOUDFLARE_WORKERS.md](./CLOUDFLARE_WORKERS.md) for details.
>
> Services **retained** on Cloud Run: **nostr-relay** (WebSocket, always-on), **embedding-api** (Python ML runtime).

GCP Cloud Run backend services for the DreamLab AI platform. GCP project: `cumbriadreamlab`, region: `us-central1`.

---

## Architecture

```
GitHub Actions Workflows
  |
  +-- auth-api.yml ---------> auth-api (Express + WebAuthn)
  |                              +-- Cloud SQL (PostgreSQL)
  |                              +-- Secret Manager
  |
  +-- jss.yml --------------> jss (Community Solid Server 7.x)
  |                              +-- Cloud Storage volume (dreamlab-pods)
  |                              +-- Secret Manager
  |
  +-- fairfield-relay.yml ---> nostr-relay (Node.js WebSocket)
  |                              +-- Cloud SQL (PostgreSQL)
  |                              +-- Secret Manager
  |
  +-- fairfield-embedding-api.yml -> embedding-api (Python FastAPI)
  |
  +-- fairfield-image-api.yml ----> image-api (Node.js)
                                      +-- Cloud Storage (images)
```

All Docker images are pushed to **Artifact Registry**: `us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/`

---

## Service: auth-api

> **Migration target: Cloudflare Workers.** Worker code complete in `workers/auth-api/`. Deployment pending Cloudflare account setup. This Cloud Run service will be decommissioned after Workers deployment is verified.

WebAuthn registration and authentication server with NIP-98 verification and Solid pod provisioning.

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/auth-api.yml` |
| **Source** | `community-forum/services/auth-api/` |
| **Runtime** | Node.js 20, Express |
| **Memory** | 512Mi |
| **CPU** | 1 vCPU |
| **Instances** | 0-3 (scale-to-zero) |
| **Port** | 8080 |
| **Service account** | `fairfield-applications@cumbriadreamlab.iam.gserviceaccount.com` |

### Environment Variables

```
RP_ID=dreamlab-ai.com
RP_NAME=DreamLab Community
RP_ORIGIN=https://dreamlab-ai.com
NODE_ENV=production
```

### Secrets (from Secret Manager)

```
DATABASE_URL=nostr-db-url:latest    # PostgreSQL connection string
JSS_BASE_URL=jss-base-url:latest   # JSS Cloud Run URL
```

### Cloud SQL Connection

```
--add-cloudsql-instances cumbriadreamlab:us-central1:nostr-db
```

### Endpoints

See [Auth API Reference](../api/AUTH_API.md) for full endpoint documentation.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (unauthenticated) |
| POST | `/auth/register/options` | WebAuthn registration options |
| POST | `/auth/register/verify` | Registration verification + pod provisioning |
| POST | `/auth/login/options` | WebAuthn authentication options |
| POST | `/auth/login/verify` | Authentication verification (NIP-98 protected) |

---

## Service: jss

> **Migration target: Cloudflare Workers.** Replaced by pod-api Worker in `workers/pod-api/` (R2 + WAC evaluator). Worker code complete. Deployment pending Cloudflare account setup. This Cloud Run service will be decommissioned after Workers deployment is verified.

JavaScript Solid Server (Community Solid Server 7.x) providing per-user pod storage.

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/jss.yml` |
| **Source** | `community-forum/services/jss/` |
| **Runtime** | Node.js 20 slim, `@solid/community-server@7.1.8` |
| **Memory** | 1Gi |
| **CPU** | 1 vCPU |
| **Instances** | 0-2 (scale-to-zero) |
| **Port** | 8080 |
| **Storage** | Cloud Storage volume (`dreamlab-pods` bucket, mounted at `/data/pods`) |

### Secrets

```
JSS_BASE_URL=jss-base-url:latest
```

### Bootstrap: Chicken-and-Egg

JSS needs its own Cloud Run URL as the `JSS_BASE_URL` environment variable before it can start. But that URL only exists after the first deployment.

**Resolution**:

1. Deploy with `--no-traffic` to get the service URL:
   ```bash
   gcloud run deploy jss --image <image> --no-traffic --region us-central1
   ```
2. Create the secret from the returned URL:
   ```bash
   echo -n "https://<SERVICE_URL>/" | \
     gcloud secrets create jss-base-url --data-file=- --project=cumbriadreamlab
   ```
3. Re-run the workflow.

The `jss.yml` workflow includes a **bootstrap guard** that checks for the `jss-base-url` secret and fails with instructions if it is missing.

The auth-api has the same dependency: it needs `JSS_BASE_URL` from Secret Manager to provision pods. After the JSS service URL is created, re-deploy auth-api as well.

---

## Service: nostr-relay

> **Retained on Cloud Run.** WebSocket always-on requirement and Durable Objects complexity make this service unsuitable for immediate migration. Future migration to Cloudflare Durable Objects may be evaluated.

Nostr protocol relay with NIP-01, NIP-16, NIP-28, NIP-33, NIP-42, and NIP-98 support.

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/fairfield-relay.yml` |
| **Source** | `community-forum/services/nostr-relay/` |
| **Runtime** | Node.js 20 |
| **Memory** | 512Mi |
| **CPU** | 1 vCPU |
| **Instances** | 1-1 (always-on for WebSocket connections) |
| **Timeout** | 3600s (1 hour, for long-lived WebSocket) |
| **CPU throttling** | Disabled (`--no-cpu-throttling`) |
| **Port** | 8080 |

### Secrets

```
DATABASE_URL=nostr-db-url:latest
ADMIN_PUBKEYS=admin-pubkey:latest
```

### Cloud SQL Connection

```
--add-cloudsql-instances cumbriadreamlab:us-central1:nostr-db
```

See [Nostr Relay API](../api/NOSTR_RELAY.md) for protocol documentation.

---

## Service: embedding-api

> **Retained on Cloud Run.** Requires Python runtime and ~2GB ML model. Not suitable for Cloudflare Workers.

Text embedding service for semantic search, using the all-MiniLM-L6-v2 model (384 dimensions).

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/fairfield-embedding-api.yml` |
| **Source** | `community-forum/services/embedding-api/` |
| **Runtime** | Python 3.11, FastAPI |
| **Memory** | 2Gi (ML model requires ~2GB) |
| **CPU** | 1 vCPU |
| **Instances** | 0-3 (scale-to-zero) |
| **Concurrency** | 80 requests per instance |
| **Build** | Cloud Build (E2_HIGHCPU_8, 20-min timeout for model loading) |

### Environment

```
ALLOWED_ORIGINS=https://dreamlab-ai.com,http://localhost:5173
```

See [Embedding Service API](../api/EMBEDDING_SERVICE.md) for documentation.

---

## Service: image-api

> **Migration target: Cloudflare Workers.** Will be replaced by an image-api Worker using R2 for storage. Worker code not yet started.

Image upload, processing, and serving via Google Cloud Storage.

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/fairfield-image-api.yml` |
| **Source** | `community-forum/services/image-api/` |
| **Runtime** | Node.js 20 |
| **Memory** | 512Mi |
| **Instances** | 0-10 |
| **Port** | 8080 |
| **Storage** | GCS bucket (`minimoonoir-images`) |

### NIP-98 Protection

Image uploads require a valid NIP-98 `Authorization` header. The image-api uses the shared `packages/nip98/verify.js` module for token verification.

---

## GCP Project Setup

### First-Time Bootstrap

See `.github/workflows/SECRETS_SETUP.md` for the full 8-step GCP bootstrap sequence.

Summary:

1. Create GCP project (`cumbriadreamlab`)
2. Enable required APIs (Cloud Run, Artifact Registry, Cloud SQL, Secret Manager, Cloud Storage)
3. Create service account (`github-actions`) with Cloud Run Admin and Artifact Registry Writer roles
4. Create and download service account key JSON
5. Store key as `GCP_SA_KEY` GitHub secret
6. Create Cloud SQL instance (`nostr-db`, PostgreSQL 15)
7. Create database and user
8. Store `DATABASE_URL` in Secret Manager

### Service Account

```
fairfield-applications@cumbriadreamlab.iam.gserviceaccount.com
```

Roles:

- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/iam.serviceAccountUser`
- `roles/cloudsql.client`
- `roles/secretmanager.secretAccessor`

---

## Database: Cloud SQL PostgreSQL

### Instance

```
Instance: nostr-db
Version: PostgreSQL 15
Region: us-central1
Tier: db-g1-small
Backups: Daily at 03:00 UTC, 7-day retention
```

### Schema

The auth-api manages its schema via auto-migration on startup:

**webauthn_credentials**:
```sql
CREATE TABLE webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL UNIQUE,
  did_nostr TEXT NOT NULL,
  webid TEXT,
  pod_url TEXT,
  public_key_bytes BYTEA NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type TEXT DEFAULT 'singleDevice',
  backed_up BOOLEAN DEFAULT false,
  transports TEXT[],
  prf_salt BYTEA NOT NULL DEFAULT gen_random_bytes(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**webauthn_challenges**:
```sql
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,
  pubkey TEXT,
  used BOOLEAN DEFAULT FALSE,
  prf_salt BYTEA,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

The nostr-relay manages its own `events` and `whitelist` tables (see [Nostr Relay API](../api/NOSTR_RELAY.md)).

---

## Secrets Management

### GitHub Secrets

Store in GitHub repository Settings > Secrets and variables > Actions:

| Secret | Purpose |
|--------|---------|
| `GCP_PROJECT_ID` | `cumbriadreamlab` |
| `GCP_SA_KEY` | Service account JSON key (full content) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_AUTH_API_URL` | Auth API Cloud Run URL |

### GCP Secret Manager

| Secret | Purpose |
|--------|---------|
| `nostr-db-url` | PostgreSQL connection string |
| `jss-base-url` | JSS Cloud Run URL |
| `admin-pubkey` | Admin Nostr pubkeys (comma-separated) |

### Rotation

- GCP service account keys: rotate quarterly
- Database passwords: rotate on compromise or personnel change
- Supabase keys: rotate on compromise

---

## Manual Deployment

### Deploy nostr-relay (Retained on Cloud Run)

```bash
cd community-forum/services/nostr-relay
npm ci && npm run build
docker build -t nostr-relay:latest .
docker tag nostr-relay:latest us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/nostr-relay:latest
docker push us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/nostr-relay:latest
gcloud run deploy nostr-relay \
  --image us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/nostr-relay:latest \
  --region us-central1 \
  --memory 512Mi --cpu 1 --no-cpu-throttling --timeout 3600
```

### Legacy: Deploy auth-api (Cloud Run -- Being Replaced by Workers)

> This deployment method will be retired after the auth-api Worker is deployed to Cloudflare.

```bash
cd community-forum/services/auth-api
npm ci && npm run build
docker build -t auth-api:latest .
docker tag auth-api:latest us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/auth-api:latest
docker push us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/auth-api:latest
gcloud run deploy auth-api \
  --image us-central1-docker.pkg.dev/cumbriadreamlab/minimoonoir/auth-api:latest \
  --region us-central1 \
  --memory 512Mi --cpu 1 --port 8080
```

---

## Monitoring

### Health Checks

```bash
# auth-api
curl https://<auth-api-url>/health

# Check all Cloud Run services
gcloud run services list --region=us-central1
```

### Logs

```bash
gcloud run services logs read auth-api --region=us-central1 --limit=50
gcloud run services logs read nostr-relay --region=us-central1 --limit=50
gcloud run services logs read jss --region=us-central1 --limit=50
```

---

## Related Documentation

- [Deployment Overview](./README.md)
- [GitHub Pages](./GITHUB_PAGES.md)
- [Cloudflare Workers](./CLOUDFLARE_WORKERS.md)
- [Environments](./ENVIRONMENTS.md)
- [Auth API Reference](../api/AUTH_API.md)
- [Nostr Relay API](../api/NOSTR_RELAY.md)

---

*Last major revision: 2026-03-01.*
