# GitHub Pages Deployment

**Last Updated:** 2026-03-01

Deployment of the DreamLab AI main website (React SPA) and community forum (SvelteKit) to GitHub Pages.

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Trigger** | Push to `main` branch or manual `workflow_dispatch` |
| **Workflow** | `.github/workflows/deploy.yml` |
| **Build tool** | Vite 5.4 (SWC plugin) |
| **Target** | `gh-pages` branch |
| **Custom domain** | `dreamlab-ai.com` (CNAME in `public/`) |
| **Duration** | 5-10 minutes |
| **Node version** | 20 |

---

## Build Process

### 1. Main Site Build

The React SPA is built using Vite:

```bash
# Pre-build step: generates workshop metadata
node scripts/generate-workshop-list.mjs

# Production build
npm run build
```

This produces an optimised static bundle in `dist/` with:

- Vendor chunk splitting (vendor, three, ui)
- Route-level code splitting via `React.lazy()`
- CSS and JavaScript minification
- Static assets from `public/` copied to `dist/`

### 2. Workshop List Generation

Before each build, `scripts/generate-workshop-list.mjs` scans `public/data/workshops/` and generates `src/data/workshop-list.json`. This runs automatically as part of `npm run dev` and `npm run build`.

### 3. Team Data Preparation

The workflow copies team profile data from `src/data/team/` to `public/data/team/` to ensure markdown files and images are available in the build output:

```bash
mkdir -p public/data/team
cp -rv src/data/team/* public/data/team/
```

### 4. SvelteKit Community Forum Build

The community forum is built as a separate SvelteKit project with the static adapter:

```bash
cd community-forum
npm ci
npm run build
```

**Environment variables** passed during the forum build:

| Variable | Purpose |
|----------|---------|
| `BASE_PATH=/community` | URL base path for the SPA |
| `VITE_RELAY_URL` | Nostr relay WebSocket endpoint |
| `VITE_EMBEDDING_API_URL` | Embedding service URL |
| `VITE_LINK_PREVIEW_API_URL` | Link preview service URL |
| `VITE_IMAGE_API_URL` | Image service URL |
| `VITE_IMAGE_BUCKET` | GCS bucket for images |
| `VITE_IMAGE_ENCRYPTION_ENABLED=true` | Enable image encryption |
| `VITE_ADMIN_PUBKEY` | Admin Nostr pubkey |
| `VITE_APP_NAME=DreamLab Community` | Application display name |
| `VITE_AUTH_API_URL` | Auth API Cloud Run URL (from secrets) |

### 5. Asset Consolidation

After both builds, the workflow assembles the final output:

```bash
# Copy forum build into main site
mkdir -p dist/community
cp -r community-forum/build/* dist/community/

# Add .nojekyll to prevent Jekyll processing
touch dist/.nojekyll

# Copy 404.html for SPA routing
cp public/404.html dist/404.html

# Copy all runtime data files
cp -rv public/data/* dist/data/
```

### 6. Build Verification

The workflow verifies critical assets:

- Team data files exist in `dist/data/team/`
- Video files present in `dist/data/media/videos/`
- Thumbnail files present in `dist/data/media/`
- Specific files checked (e.g., `06.md`, `06.png`)

---

## Deployment

### GitHub Pages Deploy

Uses `peaceiris/actions-gh-pages@v3`:

```yaml
- name: Deploy to gh-pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
    publish_branch: gh-pages
    force_orphan: true
    cname: dreamlab-ai.com
    commit_message: "Deploy from GitHub Actions ${{ github.sha }}"
```

- **Orphan branch**: Each deployment creates a clean `gh-pages` branch (no history accumulation).
- **CNAME**: Automatically sets the custom domain.

### Cloudflare Pages Deploy (Gated -- Ready to Enable)

A Cloudflare Pages deployment step is included and ready to enable. The only blockers are configuring two GitHub secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

```yaml
- name: Deploy to Cloudflare Pages
  if: vars.CLOUDFLARE_PAGES_ENABLED == 'true'
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist/ --project-name=dreamlab-ai --commit-dirty=true
```

To enable:

1. Create `CLOUDFLARE_API_TOKEN` secret in GitHub repository settings (Cloudflare API token with Pages permissions)
2. Create `CLOUDFLARE_ACCOUNT_ID` secret in GitHub repository settings
3. Set repository variable `CLOUDFLARE_PAGES_ENABLED=true`

Once enabled, every push to `main` will deploy to both GitHub Pages and Cloudflare Pages simultaneously.

---

## Build Output Structure

```
dist/
  index.html                    # Main site entry point
  404.html                      # SPA routing fallback
  .nojekyll                     # Disable Jekyll processing
  CNAME                         # Custom domain: dreamlab-ai.com
  assets/                       # Vite-generated JS/CSS bundles
  community/                    # SvelteKit forum app
    index.html
    _app/
      immutable/                # Hashed assets (long-cache)
      env.js
      version.json
  data/
    team/                       # 44 expert profiles (markdown + images)
      01.md, 01.png, ...
    workshops/                  # 15 workshop directories
    showcase/                   # Portfolio manifests
    media/
      videos/
      *-thumb.jpg
  images/                       # Static image assets
  robots.txt
  sitemap.xml
  site.webmanifest
```

---

## Custom Domain Configuration

### DNS

`dreamlab-ai.com` is configured with a CNAME record pointing to GitHub Pages:

```
dreamlab-ai.com.  CNAME  dreamlab-ai.github.io.
```

GitHub Pages also responds to:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### Alternative Domain

`thedreamlab.uk` is configured as an alias and redirects to `dreamlab-ai.com`.

### HTTPS

GitHub Pages provides managed TLS certificates for custom domains. HTTPS is enforced (HTTP requests are redirected).

---

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (written to `.env` during build) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (written to `.env` during build) |
| `VITE_AUTH_API_URL` | Auth API URL -- currently Cloud Run, will point to Cloudflare Worker after migration |
| `GITHUB_TOKEN` | Auto-provided by Actions (for gh-pages push) |

## Required Variables

| Variable | Purpose |
|----------|---------|
| `FAIRFIELD_RELAY_URL` | Nostr relay endpoint (forum build) -- retained on Cloud Run |
| `FAIRFIELD_EMBEDDING_API_URL` | Embedding service (forum build) -- retained on Cloud Run |
| `FAIRFIELD_LINK_PREVIEW_API_URL` | Link preview service (forum build) |
| `FAIRFIELD_IMAGE_API_URL` | Image service (forum build) -- will point to Cloudflare Worker after migration |
| `FAIRFIELD_IMAGE_BUCKET` | GCS bucket name (forum build) -- will become R2 bucket after migration |
| `FAIRFIELD_ADMIN_PUBKEY` | Admin Nostr pubkey (forum build) |
| `CLOUDFLARE_PAGES_ENABLED` | Set to `true` to enable Cloudflare Pages deploy (ready to enable) |

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|---------|
| Site not updating | Browser cache | Force refresh (Ctrl+Shift+R) or incognito |
| Community forum 404 | Forum build not copied | Check `dist/community/` exists in build log |
| Team data missing | `src/data/team/` not present | Verify directory exists with markdown files |
| Env vars not found | Secrets/variables not configured | Check GitHub Settings > Secrets and Variables |
| Build fails on Node | Wrong Node version | Workflow uses Node 20; check `package.json` engines |

---

## Rollback

### Option 1: Revert Commit

```bash
git revert <sha> --no-edit
git push origin main
# Workflow re-runs with reverted code
```

### Option 2: Restore Previous gh-pages

```bash
git log gh-pages --oneline | head -5
git checkout gh-pages
git revert HEAD
git push origin gh-pages
```

---

## Related Documentation

- [Deployment Overview](./README.md)
- [Cloud Services](./CLOUD_SERVICES.md)
- [Environments](./ENVIRONMENTS.md)
- [Cloudflare Workers](./CLOUDFLARE_WORKERS.md)

---

*Last major revision: 2026-03-01.*
