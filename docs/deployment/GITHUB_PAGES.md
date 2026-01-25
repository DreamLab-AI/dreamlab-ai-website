---
title: GitHub Pages Deployment
description: Main site and Fairfield community app deployment to GitHub Pages
last_updated: 2026-01-25
---

# GitHub Pages Deployment

This document covers the deployment of the main DreamLab AI website and Fairfield community application to GitHub Pages.

## Overview

The GitHub Pages deployment process is automated via GitHub Actions workflow (`deploy.yml`):

- **Trigger**: Push to `main` branch or manual workflow dispatch
- **Target**: GitHub Pages (`gh-pages` branch)
- **Custom Domain**: `dreamlab-ai.com`
- **Build Duration**: ~5-10 minutes
- **Deployment Type**: Static site (SvelteKit)

## Deployment Architecture

```
Push to main
    ↓
GitHub Actions (deploy.yml)
    ↓
├─ Build main site (SvelteKit)
├─ Build Fairfield app (SvelteKit)
├─ Copy team data & assets
├─ Generate dist/ directory
    ↓
GitHub Pages deploy action
    ↓
Deploy to gh-pages branch
    ↓
Serve at https://dreamlab-ai.com
```

## Workflow Details

### Build Stage

1. **Checkout Code**
   - Fetches latest code from main branch
   - Uses `actions/checkout@v3`

2. **Setup Node Environment**
   - Node version: 18 LTS
   - Installs dependencies via npm

3. **Environment Configuration**
   - Creates `.env` file with Supabase secrets:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Team Data Preparation**
   - Copies team data from `src/data/team/` to `public/data/team/`
   - Ensures team markdown and images are available in build

5. **Main Site Build**
   - Runs `npm run build`
   - Generates optimized production build in `dist/`
   - Includes all static assets

6. **Fairfield Community App Build**
   - Builds from `fairfield/` subdirectory
   - Environment variables configured:
     - `BASE_PATH: '/community'` - URL base path
     - `VITE_RELAY_URL` - Nostr relay endpoint
     - `VITE_EMBEDDING_API_URL` - Embedding service
     - `VITE_LINK_PREVIEW_API_URL` - Link preview service
     - `VITE_IMAGE_API_URL` - Image service
     - `VITE_IMAGE_BUCKET` - GCS bucket name
     - `VITE_IMAGE_ENCRYPTION_ENABLED: 'true'`
     - `VITE_ADMIN_PUBKEY` - Admin Nostr public key
   - Output to `community-forum/build/`

7. **Asset Consolidation**
   - Copies Fairfield build to `dist/community/`
   - Adds `.nojekyll` file (disables Jekyll processing)
   - Copies `404.html` for SPA routing
   - Copies all data files to `dist/data/`

8. **Build Verification**
   - Verifies team data files exist
   - Checks video files in `dist/data/media/videos/`
   - Confirms thumbnail files are present

### Deployment Stage

- Uses `peaceiris/actions-gh-pages@v3` action
- Pushes `dist/` to `gh-pages` branch
- Sets CNAME record to `dreamlab-ai.com`
- Creates orphan branch (clean history)
- Includes commit message with SHA reference

## Required Secrets

All secrets must be configured in GitHub repository settings:

```
VITE_SUPABASE_URL      # Supabase project URL
VITE_SUPABASE_ANON_KEY # Supabase anonymous key
GITHUB_TOKEN           # Auto-provided by Actions
```

## Required Variables

GitHub repository variables (Settings → Variables):

```
FAIRFIELD_RELAY_URL              # wss://... Nostr relay endpoint
FAIRFIELD_EMBEDDING_API_URL      # https://... embedding service
FAIRFIELD_LINK_PREVIEW_API_URL   # https://... link preview service
FAIRFIELD_IMAGE_API_URL          # https://... image service
FAIRFIELD_IMAGE_BUCKET           # GCS bucket name
FAIRFIELD_ADMIN_PUBKEY           # Nostr admin public key
```

## Deployment Checklist

### Pre-Deployment

- [ ] Verify all changes committed to `main` branch
- [ ] Run local build: `npm run build`
- [ ] Test SvelteKit app: `npm run preview`
- [ ] Verify Fairfield build: `cd fairfield && npm run build`
- [ ] Confirm team data files in `src/data/team/`
- [ ] Check all environment variables are set

### During Deployment

- [ ] Monitor Actions workflow in GitHub
- [ ] Check build logs for errors
- [ ] Verify no asset copy failures
- [ ] Confirm push to `gh-pages` branch succeeds

### Post-Deployment

- [ ] Visit https://dreamlab-ai.com
- [ ] Verify main site loads correctly
- [ ] Navigate to /community for Fairfield app
- [ ] Test responsive design on mobile
- [ ] Check console for JavaScript errors
- [ ] Verify team member profiles load
- [ ] Test community forum functionality

## Build Output Structure

```
dist/
├── index.html              # Main site entry point
├── 404.html                # SPA routing fallback
├── .nojekyll               # Disables Jekyll processing
├── _app/                   # SvelteKit app bundle
├── community/              # Fairfield community app
│   ├── index.html
│   └── _app/
├── data/
│   ├── team/
│   │   ├── 01.md
│   │   ├── 01.png
│   │   ├── 02.md
│   │   ├── 02.png
│   │   └── ...
│   └── media/
│       ├── videos/
│       └── *-thumb.jpg
└── [other static assets]
```

## Troubleshooting

### Build Failures

**Problem**: Node dependencies installation fails
- **Solution**: Check Node version (18+), clear npm cache
- **Command**: `npm cache clean --force && npm ci`

**Problem**: Fairfield build fails
- **Solution**: Ensure `fairfield/` directory exists with package.json
- **Command**: `cd fairfield && npm ci && npm run build`

**Problem**: Team data not copied
- **Solution**: Verify `src/data/team/` exists with markdown files
- **Command**: `ls -la src/data/team/`

### Deployment Issues

**Problem**: Site not updating after deployment
- **Solution**: Clear browser cache, check GitHub Pages settings
- **Workaround**: Force refresh with Ctrl+Shift+R or visit in incognito window

**Problem**: Community app returns 404
- **Solution**: Verify Fairfield build copied to `dist/community/`
- **Command**: `ls -la dist/community/`

**Problem**: Environment variables not found
- **Solution**: Verify all variables configured in repo settings
- **Check**: GitHub → Settings → Environments/Variables

## Performance Optimization

### Build Caching

Current setup uses npm built-in dependency caching. To optimize:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 18
    cache: 'npm'
    cache-dependency-path: package-lock.json
```

### Asset Optimization

- SvelteKit automatically optimizes assets in production build
- CSS and JavaScript minified
- Images referenced in public directory are copied as-is
- Unused dependencies removed via `--omit=dev`

### Size Reduction Tips

1. Optimize images before committing
2. Remove unused dependencies from package.json
3. Use dynamic imports for large components
4. Enable gzip compression in production

## Custom Domain Setup

The site is configured to use `dreamlab-ai.com`:

1. **CNAME File**: Auto-generated during deployment
2. **GitHub Pages Settings**: Must point to custom domain
3. **DNS Records**: Point domain to GitHub Pages servers

### Verify Custom Domain

```bash
# Check DNS resolution
nslookup dreamlab-ai.com

# Should resolve to GitHub Pages IP
# 185.199.108.153
# 185.199.109.153
# 185.199.110.153
# 185.199.111.153
```

## Rollback Procedure

If deployment introduces issues:

### Option 1: Revert Commit
```bash
git revert <problematic-commit-sha>
git push origin main
# Workflow will automatically re-run with reverted code
```

### Option 2: Manual Rollback
```bash
git checkout gh-pages
git revert HEAD~1
git push origin gh-pages
```

### Option 3: Restore Previous Build
```bash
# If gh-pages history available
git log gh-pages | head -5
git reset --hard <previous-commit-sha>
git push origin gh-pages --force-with-lease
```

## Monitoring & Alerts

### Manual Workflow Check

```bash
# View latest deployment status
gh workflow view deploy.yml --json status

# Watch workflow progress
gh workflow run deploy.yml --watch
```

### GitHub Actions Insights

- Visit: Repository → Actions tab
- Check: Latest workflow runs
- Review: Build logs and deployment status

## Related Documentation

- [Cloud Services Deployment](./CLOUD_SERVICES.md) - Nostr relay & embedding API
- [Monitoring & Health Checks](./MONITORING.md) - Site health verification
- [Rollback Procedures](./ROLLBACK.md) - Emergency recovery steps
- [Environment Setup](./ENVIRONMENTS.md) - Dev/staging/production configs

## FAQ

**Q: How long does deployment take?**
A: Typically 5-10 minutes from push to live, including build and deployment.

**Q: Can I deploy manually?**
A: Yes, use Actions → deploy workflow → "Run workflow" button.

**Q: What if team data files are missing?**
A: The workflow will fail verification. Check `src/data/team/` exists and contains markdown files.

**Q: Does deployment auto-rollback on errors?**
A: No. Failed builds don't affect current `gh-pages` branch. Fix issues and push again.

**Q: Can I deploy to staging first?**
A: Currently only production. Implement using GitHub environments feature if needed.
