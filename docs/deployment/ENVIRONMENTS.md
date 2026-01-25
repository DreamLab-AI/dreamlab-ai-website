---
title: Environment Configuration
description: Development, staging, and production environment setup and configuration
last_updated: 2026-01-25
---

# Environment Configuration

This document defines the deployment environments, their configurations, and setup procedures.

## Environment Overview

```
┌─────────────────────────────────────────────────────────┐
│ Development          Staging              Production    │
├─────────────────────────────────────────────────────────┤
│ Local machine        GCP (optional)        GCP prod      │
│ npm run dev          Cloud Run (staging)   Cloud Run     │
│ SQLite/Postgres      Cloud SQL (dev)       Cloud SQL     │
│ Internal use         Beta testing          Public access │
└─────────────────────────────────────────────────────────┘
```

## Development Environment

### Local Setup

#### Prerequisites

```bash
# Node.js 18+
node --version

# npm 9+
npm --version

# Git
git --version

# PostgreSQL (optional, for local backend testing)
psql --version

# GCP CLI (optional, for testing GCP integration)
gcloud --version
```

#### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-org/project.git
cd project

# 2. Install dependencies
npm install

# 3. Install Fairfield dependencies
cd fairfield
npm install
cd ..

# 4. Install service dependencies (optional)
cd community-forum/services/nostr-relay
npm install
cd ../../../

cd community-forum/services/embedding-api
pip install -r requirements.txt
cd ../../../
```

#### Environment Variables (.env)

Create `.env` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Fairfield App Configuration (when testing locally)
FAIRFIELD_RELAY_URL=http://localhost:8080
FAIRFIELD_EMBEDDING_API_URL=http://localhost:8081
FAIRFIELD_LINK_PREVIEW_API_URL=http://localhost:8082
FAIRFIELD_IMAGE_API_URL=http://localhost:8083
FAIRFIELD_IMAGE_BUCKET=local-test-bucket
FAIRFIELD_ADMIN_PUBKEY=your-admin-pubkey

# Node Environment
NODE_ENV=development
```

#### Running Development Server

```bash
# Main site
npm run dev
# Runs on http://localhost:5173

# In another terminal, Fairfield app
cd fairfield
npm run dev
# Runs on http://localhost:5174 or http://localhost:5173/community

# Optional: Run local backend services
# Nostr Relay
cd community-forum/services/nostr-relay
npm run dev
# Runs on ws://localhost:8080

# Embedding API
cd community-forum/services/embedding-api
python -m uvicorn main:app --reload --port 8081
# Runs on http://localhost:8081

# Image API
cd community-forum/services/image-api
npm run dev
# Runs on http://localhost:8083
```

#### Local Database Setup (PostgreSQL)

```bash
# 1. Start PostgreSQL (if not running)
# macOS with Homebrew:
brew services start postgresql

# Linux (systemd):
sudo systemctl start postgresql

# 2. Create local database
psql -U postgres -c "CREATE DATABASE nostr_dev;"

# 3. Create user
psql -U postgres -c "CREATE USER nostr_app WITH PASSWORD 'dev_password';"
psql -U postgres -c "ALTER USER nostr_app CREATEDB;"

# 4. Update .env
DATABASE_URL=postgresql://nostr_app:dev_password@localhost:5432/nostr_dev

# 5. Run migrations (if applicable)
npm run migrate:dev
```

#### Testing in Development

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Format code
npm run format

# Build for preview
npm run build
npm run preview
```

### Development Troubleshooting

**Port Already in Use**:
```bash
# Kill process on port
lsof -ti:5173 | xargs kill -9
npm run dev
```

**Dependencies Not Resolving**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database Connection Errors**:
```bash
# Check PostgreSQL running
psql -U postgres -c "SELECT 1;"

# Verify credentials in .env
# Reconnect with correct password
```

## Staging Environment

### Staging Configuration

Staging is used for final testing before production deployment. Currently, production deployment is used directly; staging can be set up using GitHub environments.

#### GitHub Environments Setup

```bash
# Via GitHub CLI
gh repo set-default <owner>/<repo>

# Create staging environment
gh api -X PUT repos/{owner}/{repo}/environments/staging

# Add secrets to staging
gh secret set VITE_SUPABASE_URL --env staging
gh secret set VITE_SUPABASE_ANON_KEY --env staging
```

#### Staging Variables

GitHub repository staging environment variables:

```
FAIRFIELD_RELAY_URL              # wss://staging-relay.example.com
FAIRFIELD_EMBEDDING_API_URL      # https://staging-embedding.example.com
FAIRFIELD_LINK_PREVIEW_API_URL   # https://staging-preview.example.com
FAIRFIELD_IMAGE_API_URL          # https://staging-images.example.com
FAIRFIELD_IMAGE_BUCKET           # staging-images-bucket
FAIRFIELD_ADMIN_PUBKEY           # staging-admin-key
```

#### Staging Deployment

To deploy to staging (if configured), modify workflow:

```yaml
# In .github/workflows/deploy.yml
on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'fairfield/**'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.dreamlab-ai.com
    # ... staging deployment steps
```

### Manual Staging Deployment

```bash
# 1. Trigger manual workflow
gh workflow run deploy.yml --ref main

# 2. Wait for completion
gh run watch

# 3. Test staging site
# Visit staging URL and verify functionality
```

## Production Environment

### Production Infrastructure

```
┌─────────────────────────────────────────────┐
│ GitHub Repository (main branch)             │
├─────────────────────────────────────────────┤
│ Automatic Triggers:                         │
│ - Push to main                              │
│ - Manual workflow dispatch                  │
├─────────────────────────────────────────────┤
│ GitHub Pages                                │
│ ├─ dreamlab-ai.com (primary)               │
│ ├─ gh-pages branch (published)              │
│ └─ SvelteKit static export                  │
│                                              │
│ GCP Cloud Run (Managed Services)            │
│ ├─ us-central1 region                       │
│ ├─ nostr-relay (wss://)                     │
│ ├─ embedding-api (https://)                 │
│ ├─ image-api (https://)                     │
│ └─ Artifact Registry storage                │
│                                              │
│ Cloud SQL (PostgreSQL)                      │
│ ├─ nostr-db (primary)                       │
│ ├─ Daily backups (03:00 UTC)                │
│ ├─ 7-day retention                          │
│ └─ Automated failover                       │
│                                              │
│ Google Cloud Storage                        │
│ ├─ minimoonoir-images bucket                │
│ ├─ Image storage and serving                │
│ └─ Versioning enabled                       │
└─────────────────────────────────────────────┘
```

### Production Secrets

**GitHub Repository Secrets**:

```
VITE_SUPABASE_URL              # Supabase project URL
VITE_SUPABASE_ANON_KEY         # Supabase anonymous key
GCP_PROJECT_ID                 # GCP project ID
GCP_SA_KEY                      # Service account JSON key
```

**GCP Secret Manager**:

```
nostr-db-url                    # PostgreSQL connection string
admin-pubkey                    # Nostr admin public key
```

### Production Variables

**GitHub Repository Variables** (not secrets):

```
FAIRFIELD_RELAY_URL             # Production relay endpoint
FAIRFIELD_EMBEDDING_API_URL     # Production embedding service
FAIRFIELD_LINK_PREVIEW_API_URL  # Production link preview service
FAIRFIELD_IMAGE_API_URL         # Production image service
FAIRFIELD_IMAGE_BUCKET          # minimoonoir-images
FAIRFIELD_ADMIN_PUBKEY          # Production admin key (public)
```

### Production Deployment Process

1. **Code Review & Approval**
   - All changes require PR
   - Minimum 1 approval
   - CI/CD checks pass

2. **Merge to Main**
   - PR squashed or rebased
   - Commit message includes context
   - GitHub Actions triggered automatically

3. **Automated Build**
   - GitHub Pages: ~5-10 minutes
   - Cloud Run: ~3-5 minutes (parallel)

4. **Verification**
   - Site loads at https://dreamlab-ai.com
   - Services responsive
   - No critical errors in logs

5. **Monitoring**
   - Check alerts
   - Monitor error rates
   - Verify user reports

### Production Deployment Restrictions

**Protected Branch Rules** (main):

```
- Require pull request reviews: 1
- Require status checks to pass
- Include administrators in restrictions
- Restrict who can push: Release team only
```

**Deployment Protection Rules**:

```
- Production deployments require approval
- Reviewers: Platform leads
- Approval timeout: 24 hours
```

### Production Monitoring

**Continuous Monitoring**:

```bash
# Check site status
curl -I https://dreamlab-ai.com

# Check services
gcloud run services list --region=us-central1

# View recent deployments
gh run list --workflow=deploy.yml --limit=5

# Check error rates
gcloud run services logs read nostr-relay \
  --region=us-central1 \
  --format=json | grep -i error
```

**Daily Checklist**:
- [ ] All services responding (health checks pass)
- [ ] No alerts or warnings
- [ ] Error rate < 1%
- [ ] Performance metrics normal
- [ ] Backups completed
- [ ] User reports checked

## Configuration Comparison

| Aspect | Development | Staging | Production |
|--------|-------------|---------|-----------|
| Location | Local | GCP (us-central1) | GCP (us-central1) |
| Database | Local Postgres/SQLite | Cloud SQL (dev) | Cloud SQL (prod) |
| Storage | Local filesystem | GCS (staging) | GCS (prod) |
| URL | localhost:5173 | staging.domain.com | dreamlab-ai.com |
| Build Time | ~1 min | ~3-5 min | ~5-10 min |
| Deploy Time | Instant | ~2 min | ~2 min |
| Secrets | .env file | GitHub secrets | GitHub secrets + GCP Secret Manager |
| Monitoring | Manual | Cloud Logging | Cloud Monitoring + Alerts |
| Backups | Manual | Daily | Daily + automated retention |
| Cost | Free | ~$50-100/month | ~$200-500/month |

## Environment-Specific Code

Use environment variables to conditionally configure:

```typescript
// In your application
const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = isProduction
  ? 'https://api.dreamlab-ai.com'
  : 'http://localhost:8080';

// Conditional service configuration
const relayUrl = process.env.VITE_RELAY_URL || 'ws://localhost:8080';
```

## Scaling for Production

### Horizontal Scaling

**Nostr Relay**:
```bash
# Increase max instances if WebSocket connections exceed capacity
gcloud run services update nostr-relay \
  --max-instances=5 \
  --region=us-central1
```

**Embedding API**:
```bash
# Scale based on embedding request volume
gcloud run services update embedding-api \
  --min-instances=1 \
  --max-instances=5 \
  --region=us-central1
```

**Image API**:
```bash
# Scale for image processing load
gcloud run services update image-api \
  --min-instances=0 \
  --max-instances=20 \
  --region=us-central1
```

### Vertical Scaling

```bash
# Increase memory for resource-intensive tasks
gcloud run services update embedding-api \
  --memory=2Gi \
  --cpu=1 \
  --region=us-central1
```

### Database Scaling

```bash
# Upgrade Cloud SQL tier for higher load
gcloud sql instances patch nostr-db \
  --tier=db-n1-standard-4 \
  --region=us-central1
```

## Disaster Recovery

### Backup Strategy

**GitHub Pages**:
- Git history maintained indefinitely
- gh-pages branch protected
- Commit history available for rollback

**Cloud Run**:
- Previous revisions retained (auto-cleanup after 2000 revisions)
- Image tags in Artifact Registry
- Deployment history in Cloud Run console

**Cloud SQL**:
- Daily automated backups (3 AM UTC)
- 7-day retention
- Can restore to point-in-time

**GCS**:
- Versioning enabled for image bucket
- Multi-region replication (optional)
- Lifecycle policies for old versions

### Recovery Time Objectives (RTO)

| Component | RTO | Method |
|-----------|-----|--------|
| GitHub Pages | 2-5 min | Revert commit + redeploy |
| Cloud Run | < 1 min | Route to previous revision |
| Cloud SQL | 5-15 min | Restore from backup |
| GCS | 1-2 min | Restore object version |

### Recovery Point Objectives (RPO)

| Component | RPO | Backup Frequency |
|-----------|-----|------------------|
| GitHub Pages | 0 min | Real-time (git) |
| Cloud Run | 0 min (code), 24h (images) | Per deployment |
| Cloud SQL | 1 day | Daily at 3 AM |
| GCS | 1 day | Versioning enabled |

## Cost Estimation

### Development
- Free (local development)
- ~$0/month

### Staging (if used)
- Cloud Run: ~$50/month
- Cloud SQL: ~$10/month
- GCS: ~$5/month
- **Total**: ~$65/month

### Production
- GitHub Pages: Free
- Cloud Run: ~$150/month (3 services)
- Cloud SQL: ~$100/month
- GCS: ~$50/month
- Monitoring: ~$50/month
- **Total**: ~$350/month

## Environment Checklist

### Before Deploying to Production

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Secrets configured in GitHub
- [ ] Variables set in GitHub repo
- [ ] GCP project credentials valid
- [ ] Cloud SQL instance healthy
- [ ] GCS buckets accessible
- [ ] Monitoring alerts active
- [ ] Backup verified recent

### After Production Deployment

- [ ] Site loads without errors
- [ ] All services responding
- [ ] No alerts or warnings
- [ ] Error rate acceptable (< 1%)
- [ ] Performance metrics normal
- [ ] External monitoring confirms success
- [ ] Team notified of deployment

## Related Documentation

- [GitHub Pages Deployment](./GITHUB_PAGES.md) - Static site deployment
- [Cloud Services Deployment](./CLOUD_SERVICES.md) - GCP service setup
- [Monitoring & Health Checks](./MONITORING.md) - Service observability
- [Rollback Procedures](./ROLLBACK.md) - Emergency recovery

## Quick Reference

```bash
# Development
npm install && npm run dev

# Staging (manual)
gh workflow run deploy.yml --ref main --environment staging

# Production (automatic on push to main)
git push origin main

# Check deployment status
gh run list --workflow=deploy.yml --limit=5

# View production logs
gcloud run services logs read nostr-relay --region=us-central1
```

