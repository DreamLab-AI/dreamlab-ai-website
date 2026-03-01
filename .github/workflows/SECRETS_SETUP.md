# GitHub Actions Secrets Setup Guide

## Required Secrets

Go to your repository: **Settings → Secrets and variables → Actions**

### Repository Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `GCP_PROJECT_ID` | Your Google Cloud Project ID | Run: `gcloud config get-value project` |
| `GCP_SA_KEY` | Service Account JSON key | See "Generate Service Account Key" below |
| `GCP_REGION` | GCP region for deployments | Example: `us-central1` |
| `VITE_AUTH_API_URL` | Auth API Cloud Run URL | Set after first auth-api deploy (step 6) |

### Repository Variables

| Variable Name | Description | Set After First Deploy |
|--------------|-------------|----------------------|
| `RELAY_URL` | Cloud Run relay WebSocket URL | Yes - from deploy output |
| `EMBEDDING_API_URL` | Cloud Run embedding API URL | Yes - from deploy output |
| `ADMIN_PUBKEY` | Nostr admin public key | Keep existing value |

## Bootstrap Sequence (8 Steps — Order Matters)

Services have circular dependencies (auth-api needs the JSS URL; JSS needs its own URL as a
secret). Follow these steps in order to break the chicken-and-egg cycle.

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
gcloud config set project $PROJECT_ID
```

### Step 1 — Enable Required GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  iam.googleapis.com \
  storage.googleapis.com \
  --project $PROJECT_ID
```

### Step 2 — Create Artifact Registry Repository (minimoonoir)
```bash
gcloud artifacts repositories create minimoonoir \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for DreamLab community services" \
  --project $PROJECT_ID
```

### Step 3 — Create Cloud SQL Instance
```bash
gcloud sql instances create nostr-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --project $PROJECT_ID

gcloud sql databases create nostr --instance=nostr-db --project $PROJECT_ID
gcloud sql users create nostr-user --instance=nostr-db --password=<STRONG_PASSWORD> --project $PROJECT_ID
```

### Step 4 — Create DATABASE_URL Secret
```bash
echo -n "postgresql://nostr-user:<PASSWORD>@localhost/nostr?host=/cloudsql/$PROJECT_ID:$REGION:nostr-db" \
  | gcloud secrets create nostr-db-url --data-file=- --project $PROJECT_ID
```

### Step 5 — First Deploy auth-api (no-traffic) to Get Its URL
```bash
# Push the image first (trigger the workflow, or build/push manually), then:
gcloud run deploy auth-api \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/minimoonoir/auth-api:latest \
  --no-traffic \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID

AUTH_API_URL=$(gcloud run services describe auth-api \
  --region $REGION \
  --format 'value(status.url)' \
  --project $PROJECT_ID)
echo "auth-api URL: $AUTH_API_URL"
```

### Step 6 — Store auth-api URL as Secret
```bash
# Store as GitHub Actions repository secret (via UI or gh CLI):
gh secret set VITE_AUTH_API_URL --body "$AUTH_API_URL"

# Also store in Secret Manager if consumed by other Cloud Run services:
echo -n "$AUTH_API_URL" \
  | gcloud secrets create auth-api-url --data-file=- --project $PROJECT_ID
```

### Step 7 — First Deploy JSS (no-traffic) to Get Its URL
```bash
# Push the image first (trigger the workflow, or build/push manually), then:
gcloud run deploy jss \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/minimoonoir/jss:latest \
  --no-traffic \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID

JSS_URL=$(gcloud run services describe jss \
  --region $REGION \
  --format 'value(status.url)' \
  --project $PROJECT_ID)
echo "JSS URL: $JSS_URL"
```

### Step 8 — Store JSS URL as Secret, then Re-deploy Both with Traffic
```bash
# Create the jss-base-url secret (trailing slash required by @solid/community-server):
echo -n "$JSS_URL/" \
  | gcloud secrets create jss-base-url --data-file=- --project $PROJECT_ID

# Now re-run both workflows (or deploy manually with --traffic=100):
gcloud run services update-traffic jss --to-latest --region $REGION --project $PROJECT_ID
gcloud run services update-traffic auth-api --to-latest --region $REGION --project $PROJECT_ID
```

## Step-by-Step Setup (Service Account & Permissions)

### Create GitHub Actions Service Account
```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment" \
  --description="Service account for GitHub Actions CI/CD"
```

### Grant Required Permissions
```bash
# Cloud Run Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Storage Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Artifact Registry Writer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Secret Manager Accessor
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Service Account User
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Create Embedding API Service Account
```bash
gcloud iam service-accounts create embedding-api \
  --display-name="Embedding API Runtime" \
  --description="Service account for Embedding API Cloud Run service"

# Grant Storage Object Viewer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:embedding-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Create Storage Bucket
```bash
gcloud storage buckets create gs://dreamlab-vectors \
  --location=$REGION \
  --uniform-bucket-level-access

# Make bucket publicly readable (for frontend access)
gcloud storage buckets add-iam-policy-binding gs://dreamlab-vectors \
  --member="allUsers" \
  --role="roles/storage.objectViewer"
```

### Generate Service Account Key
```bash
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

echo "Service account key created: github-actions-key.json"
echo "Copy the entire contents of this file to GitHub secret: GCP_SA_KEY"
echo ""
cat github-actions-key.json
```

### Add Secrets to GitHub

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret:

**GCP_PROJECT_ID:**
```bash
echo $PROJECT_ID
```

**GCP_SA_KEY:**
```bash
cat github-actions-key.json
```

**GCP_REGION:**
```
us-central1
```

**VITE_AUTH_API_URL** (set after Step 6 above):
```bash
echo $AUTH_API_URL
```

### Verify Setup
```bash
# List service accounts
gcloud iam service-accounts list

# Verify permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com"

# Check bucket exists
gcloud storage buckets list | grep dreamlab-vectors

# Check Artifact Registry (minimoonoir)
gcloud artifacts repositories list --location=$REGION
```

## Security Best Practices

1. **Service Account Keys:**
   - Store only in GitHub Secrets (encrypted)
   - Never commit to version control
   - Rotate periodically (every 90 days recommended)

2. **Least Privilege:**
   - Each service account has only required permissions
   - Runtime service accounts (like embedding-api) have read-only access

3. **Bucket Access:**
   - Public read for frontend embedding access
   - Service accounts can write/admin via IAM roles

4. **Key Rotation:**
```bash
# Delete old key
gcloud iam service-accounts keys list \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create github-actions-key-new.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

## Troubleshooting

### Workflow fails with "Permission denied"
- Verify service account has required roles
- Check if APIs are enabled
- Ensure service account key is correctly copied to GitHub secret

### Docker push fails
- Verify Artifact Registry repository `minimoonoir` exists (not `nosflare`)
- Check repository location matches GCP_REGION
- Ensure github-actions SA has artifactregistry.writer role

### Cloud Run deployment fails with "jss-base-url secret not found"
- Follow the bootstrap sequence above (Steps 5-8)
- The secret must be created manually before the first full deployment

### Cloud Run deployment fails
- Check if github-actions SA has run.admin role
- Verify github-actions SA has iam.serviceAccountUser role
- Ensure embedding-api service account exists (for embedding API deployments)

### Storage bucket access issues
- Verify bucket exists: `gcloud storage buckets list`
- Check IAM permissions: `gcloud storage buckets get-iam-policy gs://dreamlab-vectors`
- Ensure embedding-api SA has storage.objectViewer role

## Cloudflare Secrets (for Workers deployment)

Required secrets (set via `gh secret set`):
- `CLOUDFLARE_API_TOKEN` — Scoped API token with Workers Scripts Edit, D1 Edit, KV Edit, R2 Edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID

Required variables (set via `gh variable set`):
- `CLOUDFLARE_PAGES_ENABLED` — Set to `true` to enable Pages deployment in deploy.yml

## Next Steps

After setup:
1. Follow the 8-step bootstrap sequence above in order
2. Push code to trigger workflows after bootstrap is complete
3. Monitor GitHub Actions runs
4. Copy Cloud Run URLs from deployment outputs
5. Update repository variables (RELAY_URL, EMBEDDING_API_URL)
6. Re-deploy frontend with updated URLs
