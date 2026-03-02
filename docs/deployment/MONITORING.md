---
title: Monitoring & Health Checks
description: Health monitoring, alerting, and metrics for deployed services
last_updated: 2026-01-25
---

# Monitoring & Health Checks

> **Updated 2026-03-02:** All GCP Cloud Run services have been deleted. Monitoring now covers GitHub Pages and Cloudflare Workers. Use the Cloudflare dashboard (Workers Analytics) for request metrics, error rates, and CPU time. GCP Cloud Monitoring references below are retained for historical context only.

This document covers monitoring, alerting, and health verification for all deployed services (GitHub Pages and Cloudflare Workers).

## Overview

```
Services
├─ GitHub Pages (Static Site)
├─ auth-api (Cloudflare Workers)
├─ pod-api (Cloudflare Workers)
├─ search-api (Cloudflare Workers)
├─ nostr-relay (Cloudflare Workers + Durable Objects)
└─ link-preview (Cloudflare Workers)
    ↓
Monitoring Stack
├─ Cloudflare Workers Analytics Dashboard
├─ Cloudflare Logpush (optional)
├─ Manual Health Checks
└─ Wrangler tail (real-time logs)
```

## GitHub Pages Monitoring

### Health Checks

#### 1. Site Availability

```bash
# Check main site
curl -I https://dreamlab-ai.com
# Should return 200 OK

# Check community app
curl -I https://dreamlab-ai.com/community/
# Should return 200 OK
```

#### 2. Content Verification

```bash
# Verify team data loads
curl https://dreamlab-ai.com/data/team/01.md | head -20

# Check if build artifacts exist
curl -I https://dreamlab-ai.com/_app/version.json
```

#### 3. SPA Routing Test

```bash
# Test 404 fallback (should load SPA)
curl -I https://dreamlab-ai.com/invalid-route

# Response should be 200 with 404.html content
```

#### 4. CNAME Resolution

```bash
# Verify DNS setup
nslookup dreamlab-ai.com
# Should resolve to GitHub Pages IP

# Check certificate
openssl s_client -connect dreamlab-ai.com:443 -servername dreamlab-ai.com
```

### Manual Verification

**Weekly Checklist**:
- [ ] Main site loads in < 3 seconds
- [ ] Responsive design on mobile (test width: 375px)
- [ ] Community app loads at `/community/`
- [ ] Team member profiles display correctly
- [ ] Images and media load without CORS errors
- [ ] Console has no JavaScript errors
- [ ] Links to external services work

### Monitoring Setup

**Monitor GitHub Actions**:
```bash
# Check latest deployment status
gh workflow view deploy.yml --json status

# View recent workflow runs
gh run list --workflow=deploy.yml --limit=10
```

**GitHub Pages Insights**:
- Visit: Repository → Deployments → github-pages
- Check: Latest deployment status
- View: Build logs and deployment history

### Common Issues

**Site Returns 404**:
- Check gh-pages branch exists: `git branch -a`
- Verify CNAME file in gh-pages
- Clear GitHub Pages cache: Wait 5-10 minutes

**Community App 404**:
- Verify build output: `dist/community/index.html`
- Check BASE_PATH configuration in workflow
- Confirm DreamLab build succeeded in logs

**Stale Content**:
- Force refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear GitHub cache: Settings → Pages → clear cache
- Purge CDN cache manually if using edge network

## Cloudflare Workers Monitoring

### Health Endpoints

```bash
# auth-api
curl https://dreamlab-auth-api.solitary-paper-764d.workers.dev/health

# pod-api
curl https://dreamlab-pod-api.solitary-paper-764d.workers.dev/health

# search-api
curl https://dreamlab-search-api.solitary-paper-764d.workers.dev/status

# nostr-relay
curl https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev/health

# link-preview
curl https://dreamlab-link-preview.solitary-paper-764d.workers.dev/health
```

### Real-time Logs

```bash
# Stream logs from a specific Worker
npx wrangler tail dreamlab-auth-api
npx wrangler tail dreamlab-nostr-relay

# Filter by status code
npx wrangler tail dreamlab-pod-api --format=json | jq 'select(.outcome == "exception")'
```

### Cloudflare Dashboard Metrics

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Select the Worker to view:
   - Request count and success rate
   - CPU time per request
   - Error rates and exception logs
   - Geographic distribution

### Key Metrics

| Worker | Key Metric | Expected |
|--------|-----------|----------|
| auth-api | Request latency | < 50ms |
| pod-api | R2 read latency | < 20ms |
| search-api | WASM query time | < 1ms |
| nostr-relay | Active WebSocket connections | 1-100+ |
| link-preview | Cache hit rate | > 80% |

### Alerting

Cloudflare Workers does not have built-in alerting. Use external monitoring:

```bash
# Uptime check script
for worker in dreamlab-auth-api dreamlab-pod-api dreamlab-search-api dreamlab-nostr-relay dreamlab-link-preview; do
  URL="https://${worker}.solitary-paper-764d.workers.dev/health"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo "FAIL")
  echo "${worker}: HTTP ${STATUS}"
done
```

### Deployment Status

```bash
# List recent deployments
npx wrangler deployments list --name dreamlab-auth-api

# View Workers deploy workflow
gh run list --workflow=workers-deploy.yml --limit=5
```

## Troubleshooting

### Worker Returns 500

- Check `wrangler tail <worker-name>` for exception details
- Verify D1/KV/R2 bindings in `wrangler.toml`
- Check if D1 database schema is migrated

### High Latency

- Check if WASM cold start is the cause (search-api)
- Verify R2 object sizes are reasonable
- Check for unoptimized D1 queries

## Related Documentation

- [GitHub Pages Deployment](./GITHUB_PAGES.md) - Site deployment
- [Cloudflare Workers](./CLOUDFLARE_WORKERS.md) - Worker deployment details
- [Rollback Procedures](./ROLLBACK.md) - Emergency recovery
- [Environment Setup](./ENVIRONMENTS.md) - Configuration reference

## References

- [Cloudflare Workers Analytics](https://developers.cloudflare.com/workers/observability/)
- [Wrangler tail](https://developers.cloudflare.com/workers/wrangler/commands/#tail)
- [Workers Logpush](https://developers.cloudflare.com/workers/observability/logpush/)
