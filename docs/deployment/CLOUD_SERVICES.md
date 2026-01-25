---
title: Cloud Services Deployment
description: GCP Cloud Run deployment for Nostr relay, embedding API, and image services
last_updated: 2026-01-25
---

# Cloud Services Deployment

This document covers deployment of backend services to Google Cloud Platform (GCP) Cloud Run:
- **Nostr Relay** - WebSocket-based Nostr protocol relay
- **Embedding API** - Text embedding service with ML models
- **Image API** - Image processing and storage service
- **Link Preview API** - URL link preview generation (if applicable)

## Architecture Overview

```
GitHub Repository
    ↓
GitHub Actions Workflows
    ├─ fairfield-relay.yml
    ├─ fairfield-embedding-api.yml
    └─ fairfield-image-api.yml
    ↓
GCP Artifact Registry
    ↓
GCP Cloud Run
    ├─ nostr-relay (ws://...)
    ├─ embedding-api (http://...)
    └─ image-api (http://...)
    ↓
Database: Cloud SQL PostgreSQL
Storage: Google Cloud Storage (GCS)
```

## Prerequisites

### GCP Project Setup

1. **Create GCP Project**
   ```bash
   gcloud projects create dreamlab-community --name="DreamLab Community"
   gcloud config set project dreamlab-community
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     artifactregistry.googleapis.com \
     cloudbuild.googleapis.com \
     sqladmin.googleapis.com \
     storage.googleapis.com \
     secretmanager.googleapis.com
   ```

3. **Create Service Account**
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions CI/CD"

   # Grant necessary roles
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

4. **Create and Download Service Account Key**
   ```bash
   gcloud iam service-accounts keys create github-key.json \
     --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
   ```

### GitHub Secrets Configuration

Store the following in GitHub repository secrets (Settings → Secrets and variables → Actions):

```
GCP_PROJECT_ID        # Your GCP project ID
GCP_SA_KEY            # Contents of github-key.json (full JSON)
```

### Artifact Registry Setup

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create minimoonoir \
  --repository-format=docker \
  --location=us-central1 \
  --description="Fairfield services"

# Get artifact registry URL
gcloud artifacts repositories describe minimoonoir \
  --location=us-central1
# Should output: us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir
```

## Service: Nostr Relay

### Overview

The Fairfield Nostr relay is a whitelist-controlled WebSocket relay implementing the Nostr protocol with NIP-01, NIP-11, NIP-16, NIP-33, and NIP-98 support. It provides secure event storage, signature verification, and rate limiting.

**Key Features**:
- Whitelist-based access control with cohort membership
- PostgreSQL persistence with JSONB indexing
- NIP-16 event treatment (replaceable, ephemeral, parameterized)
- NIP-98 HTTP authentication for secure endpoints
- Rate limiting per IP address
- did:nostr identity resolution

### Deployment Workflow

**Trigger**: Push to `main` branch with changes in `community-forum/services/nostr-relay/`

**File**: `.github/workflows/fairfield-relay.yml`

### Build Process

1. **Test & Validate**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies: `npm ci`
   - TypeScript type checking: `npm run typecheck`
   - Build project: `npm run build`
   - Verify dist directory exists

2. **Build Docker Image**
   - Multi-stage build (builder + runtime)
   - Installs native dependencies (python3, make, g++)
   - Compiles TypeScript to JavaScript
   - Strips dev dependencies
   - Final image: Node.js 20 slim + dist files

3. **Push to Artifact Registry**
   ```
   us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:COMMIT_SHA
   us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:latest
   ```

4. **Deploy to Cloud Run**
   - Service name: `nostr-relay`
   - Memory: 512Mi
   - CPU: 1 vCPU
   - Min instances: 1
   - Max instances: 1
   - Timeout: 3600s (1 hour for long-lived WebSocket connections)
   - CPU throttling: Disabled
   - Port: 8080

### Configuration

**Environment Variables**:
```bash
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=[secret from Secret Manager]
ADMIN_PUBKEYS=[secret from Secret Manager]
RATE_LIMIT_EVENTS_PER_SEC=10
RATE_LIMIT_MAX_CONNECTIONS=10
```

**Cloud SQL Connection**:
```
--add-cloudsql-instances PROJECT_ID:us-central1:nostr-db
```

**Service Account**:
```
fairfield-applications@PROJECT_ID.iam.gserviceaccount.com
```

### Database Schema

The relay stores events and whitelist data in Cloud SQL PostgreSQL:

**events table**:
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  kind INTEGER NOT NULL,
  tags JSONB NOT NULL,
  content TEXT NOT NULL,
  sig TEXT NOT NULL,
  received_at BIGINT
);

CREATE INDEX idx_pubkey ON events(pubkey);
CREATE INDEX idx_kind ON events(kind);
CREATE INDEX idx_created_at ON events(created_at DESC);
CREATE INDEX idx_tags ON events USING GIN(tags);
```

**whitelist table**:
```sql
CREATE TABLE whitelist (
  pubkey TEXT PRIMARY KEY,
  cohorts JSONB NOT NULL DEFAULT '[]',
  added_at BIGINT,
  added_by TEXT,
  expires_at BIGINT,
  notes TEXT
);
```

See [API Documentation](../api/NOSTR_RELAY.md) for complete protocol details.

### Monitoring Nostr Relay

**Check Deployment Status**:
```bash
gcloud run services describe nostr-relay --region=us-central1
```

**View Logs**:
```bash
gcloud run services logs read nostr-relay --region=us-central1 --limit=50
```

**Test WebSocket Connection**:
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe nostr-relay \
  --region=us-central1 \
  --format='value(status.url)')

# WebSocket URL (replace https:// with wss://)
echo "wss://${SERVICE_URL#https://}"

# Test with wscat
npm install -g wscat
wscat -c wss://your-nostr-relay-url
```

## Service: Embedding API

### Deployment Workflow

**Trigger**: Push to `main` branch with changes in `community-forum/services/embedding-api/`

**File**: `.github/workflows/fairfield-embedding-api.yml`

### Build Process

1. **Test & Validate**
   - Checkout code
   - Setup Python 3.11
   - Install dependencies: `pip install -r requirements.txt`
   - Lint with ruff: `ruff check main.py`
   - Type check with mypy: `mypy main.py`

2. **Build via Cloud Build**
   - Uses `community-forum/services/embedding-api/cloudbuild.yaml`
   - High-CPU machine (E2_HIGHCPU_8) for ML model loading
   - Builds Docker image
   - Pushes to Artifact Registry

3. **Deploy to Cloud Run**
   - Service name: `embedding-api`
   - Memory: 2Gi (ML model requires ~2GB)
   - CPU: 1 vCPU
   - Max instances: 3 (scale up with demand)
   - Min instances: 0 (cost optimization)
   - Concurrency: 80 requests per instance
   - Timeout: 60s
   - Port: 8080

### Configuration

**Environment Variables**:
```
ALLOWED_ORIGINS=https://dreamlab-ai.github.io,https://jjohare.github.io,http://localhost:5173
```

**Cloud Build Settings**:
- Machine Type: E2_HIGHCPU_8 (high CPU for embedding model)
- Timeout: 1200s (20 minutes for large model loading)
- Logging: CLOUD_LOGGING_ONLY

### Monitoring Embedding API

**Health Check**:
```bash
SERVICE_URL=$(gcloud run services describe embedding-api \
  --region=us-central1 \
  --format='value(status.url)')

curl -s "${SERVICE_URL}/health" | jq .
```

**Test Endpoint**:
```bash
curl -X POST "${SERVICE_URL}/embed" \
  -H "Content-Type: application/json" \
  -d '{"text":"sample text"}'
```

**View Logs**:
```bash
gcloud run services logs read embedding-api --region=us-central1 --limit=50
```

**Monitor Scaling**:
```bash
gcloud run services describe embedding-api --region=us-central1 | grep -A 5 metrics
```

## Service: Image API

### Deployment Workflow

**Trigger**: Push to `main` branch with changes in `community-forum/services/image-api/`

**File**: `.github/workflows/fairfield-image-api.yml`

### Build Process

1. **Build Docker Image**
   - Node.js/Docker-based image processing
   - Uses multi-stage build
   - Installs only production dependencies

2. **Push to Artifact Registry**
   ```
   us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/image-api:COMMIT_SHA
   us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/image-api:latest
   ```

3. **Deploy to Cloud Run**
   - Service name: `image-api`
   - Memory: 512Mi
   - CPU: 1 vCPU
   - Max instances: 10 (handles image resizing/processing)
   - Timeout: Not specified (default 300s)
   - Port: 8080

### Configuration

**Environment Variables**:
```
GCS_BUCKET=minimoonoir-images
GOOGLE_CLOUD_PROJECT=PROJECT_ID
```

**Service Account**:
```
fairfield-applications@PROJECT_ID.iam.gserviceaccount.com
```

**GCS Bucket Setup**:
```bash
# Create bucket
gsutil mb -l us-central1 gs://minimoonoir-images

# Configure CORS (if client-side uploads)
gsutil cors set cors.json gs://minimoonoir-images

# Set bucket lifecycle (optional - auto-delete old images)
gsutil lifecycle set lifecycle.json gs://minimoonoir-images
```

### Monitoring Image API

**Health Check**:
```bash
SERVICE_URL=$(gcloud run services describe image-api \
  --region=us-central1 \
  --format='value(status.url)')

curl "${SERVICE_URL}/health"
```

**View Logs**:
```bash
gcloud run services logs read image-api --region=us-central1 --limit=50
```

## Database: Cloud SQL

### PostgreSQL Instance Setup

```bash
# Create Cloud SQL instance
gcloud sql instances create nostr-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --backup-location=us
```

### Create Database & User

```bash
# Create database
gcloud sql databases create nostr \
  --instance=nostr-db

# Create user
gcloud sql users create nostr-app \
  --instance=nostr-db \
  --password=STRONG_PASSWORD
```

### Connection Configuration

**Store in Secret Manager**:
```bash
# Create secret for DATABASE_URL
echo "postgresql://nostr-app:PASSWORD@/nostr?cloudSqlInstance=PROJECT_ID:us-central1:nostr-db&user=nostr-app&password=PASSWORD" | \
  gcloud secrets create nostr-db-url --data-file=-

# Create secret for admin pubkeys
echo "ADMIN_PUBKEY_1,ADMIN_PUBKEY_2" | \
  gcloud secrets create admin-pubkey --data-file=-
```

**Grant Cloud Run service account access**:
```bash
gcloud sql instances patch nostr-db \
  --database-flags=cloudsql_iam_authentication=on

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:fairfield-applications@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## Storage: Google Cloud Storage

### Setup GCS Buckets

```bash
# Images bucket
gsutil mb -l us-central1 gs://minimoonoir-images

# Relay data backup (optional)
gsutil mb -l us-central1 gs://minimoonoir-relay-backup

# Configure versioning (optional)
gsutil versioning set on gs://minimoonoir-images
```

### Access Control

**Grant Cloud Run service account**:
```bash
gsutil iam ch serviceAccount:fairfield-applications@PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
  gs://minimoonoir-images
```

## Manual Deployment (if needed)

### Deploy Nostr Relay

```bash
# Build locally
cd community-forum/services/nostr-relay
npm run build

# Build image
docker build -t nostr-relay:latest .

# Tag for Artifact Registry
docker tag nostr-relay:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:latest

# Push to registry
docker push us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:latest

# Deploy to Cloud Run
gcloud run deploy nostr-relay \
  --image us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --no-cpu-throttling \
  --timeout 3600 \
  --port 8080
```

### Deploy Embedding API

```bash
cd community-forum/services/embedding-api

# Deploy via Cloud Build
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=COMMIT_SHA=manual-$(date +%s)
```

### Deploy Image API

```bash
cd community-forum/services/image-api

# Build and push
docker build -t image-api:latest .
docker tag image-api:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/image-api:latest
docker push us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/image-api:latest

# Deploy
gcloud run deploy image-api \
  --image us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/image-api:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --max-instances 10
```

## Troubleshooting

### Service Not Starting

**Check Logs**:
```bash
gcloud run services logs read SERVICE_NAME --region=us-central1 --limit=100
```

**Common Issues**:
- Image not found in Artifact Registry
- Environment secrets not set correctly
- Cloud SQL connection failed
- Out of memory

### High Latency

**Check Metrics**:
```bash
gcloud monitoring read \
  --filter='resource.type="cloud_run_revision"' \
  --format=json
```

**Optimization**:
- Increase memory allocation
- Increase max instances
- Enable concurrency limits
- Cache frequent requests

### Database Connection Issues

**Test Connection**:
```bash
gcloud sql connect nostr-db --user=nostr-app
```

**Check Connection Quota**:
```bash
gcloud sql instances describe nostr-db | grep connections
```

## Security Best Practices

1. **Secret Management**: Use Google Secret Manager for sensitive data
2. **Service Accounts**: Use minimal IAM roles
3. **Network**: Enable VPC Service Controls if needed
4. **Monitoring**: Set up Cloud Logging and Cloud Monitoring alerts
5. **Image Scanning**: Enable Container Analysis for vulnerability scanning
6. **Backup**: Enable automated Cloud SQL backups

## Performance Tuning

### Nostr Relay
- Increase max instances if WebSocket connections spike
- Monitor memory usage (typically stable around 256Mi)
- Consider regional failover setup

### Embedding API
- Pre-warm instances for consistent latency
- Use concurrency limits to prevent overload
- Monitor model loading time in logs

### Image API
- Enable CDN caching for processed images
- Set appropriate cache headers
- Monitor GCS bandwidth usage

## Cost Optimization

- Use min instances = 0 for non-critical services
- Set max instances limits to prevent runaway costs
- Use Cloud SQL shared-core tier for development
- Enable automatic scaling based on metrics
- Regularly review Cloud Run invocation logs

## Related Documentation

- [GitHub Pages Deployment](./GITHUB_PAGES.md) - Static site deployment
- [Monitoring & Health Checks](./MONITORING.md) - Service health verification
- [Rollback Procedures](./ROLLBACK.md) - Emergency recovery
- [Environment Setup](./ENVIRONMENTS.md) - Configuration details

## References

- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Guide](https://cloud.google.com/artifact-registry/docs)
- [Cloud Build Configuration](https://cloud.google.com/build/docs/build-config)
- [Cloud SQL Connection](https://cloud.google.com/sql/docs/postgres/cloud-run-connections)
