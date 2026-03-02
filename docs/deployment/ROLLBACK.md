---
title: Rollback Procedures
description: Emergency rollback procedures for all deployment environments
last_updated: 2026-01-25
---

# Rollback Procedures

> **Updated 2026-03-02:** All GCP Cloud Run services have been deleted. Rollback for backend services now uses `wrangler rollback`. Cloud Run rollback sections below are retained for historical reference only.

This document provides step-by-step procedures for rolling back deployments across all environments (GitHub Pages and Cloudflare Workers).

## Overview

```
Incident Detected
    ↓
Assess Severity & Impact
    ↓
Select Appropriate Rollback Method
    ├─ Immediate (< 5 min)
    ├─ Standard (5-15 min)
    └─ Database (15-30 min)
    ↓
Execute Rollback
    ↓
Verify Stability
    ↓
Post-Incident Review
```

## Severity Assessment

### P1 (Critical) - Rollback Immediately

**Symptoms**:
- Service completely unavailable
- Data corruption or loss
- Security vulnerability exposed
- All users affected

**Response Time**: < 5 minutes

### P2 (High) - Rollback Within 15 Minutes

**Symptoms**:
- Service severely degraded
- Major features broken
- Performance unacceptable (> 5s latency)
- Partial outage affecting 50%+ of users

**Response Time**: < 15 minutes

### P3 (Medium) - Plan Rollback

**Symptoms**:
- Minor features broken
- Non-critical service down
- Cosmetic issues
- Limited user impact

**Response Time**: Within business hours (can plan carefully)

## GitHub Pages Rollback

### Quick Rollback (< 5 min)

**Situation**: Site shows errors, needs immediate revert

#### Option 1: Revert Previous Commit

```bash
# 1. Identify problematic commit
git log --oneline -10

# 2. Revert commit (creates new commit that undoes changes)
git revert <commit-sha> --no-edit

# 3. Push to main (triggers automatic deployment)
git push origin main

# Expected time: 2-3 minutes to deploy
```

**Advantages**:
- Creates clear audit trail
- Can be reviewed before push
- Safe (doesn't lose history)

**Disadvantages**:
- Takes 5-10 minutes to redeploy
- Not fastest for true emergency

#### Option 2: Force Reset gh-pages Branch

```bash
# CAUTION: Only use if commit not yet pushed or for true emergency

# 1. Get previous good commit from gh-pages
git log gh-pages --oneline -5

# 2. Reset to known-good state
git checkout gh-pages
git reset --hard <known-good-commit-sha>

# 3. Force push (NOT recommended for team environments)
git push origin gh-pages --force-with-lease

# Immediate effect: Site reverts to previous version
```

**Advantages**:
- Immediate effect (no rebuild)
- Oldest/safest version restored

**Disadvantages**:
- Loses git history
- Can cause issues in team
- Use only for emergency

### Standard Rollback (5-15 min)

**Situation**: Issue discovered during or after deployment

#### Step-by-Step Rollback

```bash
# 1. Check deployment status
gh workflow view deploy.yml

# 2. Identify last successful deployment
git log gh-pages --oneline -5
# Take note of commit hash and date

# 3. Create rollback commit
git revert <problematic-commit-sha> --no-edit

# 4. Review changes
git diff HEAD~1 HEAD

# 5. Push to main
git push origin main

# 6. Monitor deployment
gh run list --workflow=deploy.yml --limit=1

# 7. Verify site
curl -I https://dreamlab-ai.com
```

**Monitoring Deployment**:
```bash
# Watch workflow in real-time
gh run watch $(gh run list --workflow=deploy.yml --limit=1 --json databaseId -q .[0].databaseId)

# Check final status
gh run view $(gh run list --workflow=deploy.yml --limit=1 --json databaseId -q .[0].databaseId) --log
```

### Recovery Validation

**Post-Rollback Checklist**:
- [ ] GitHub Actions workflow completed successfully
- [ ] gh-pages branch updated
- [ ] Site loads at https://dreamlab-ai.com
- [ ] Community app accessible at /community/
- [ ] No JavaScript errors in console
- [ ] Team data pages load
- [ ] External links work
- [ ] HTTPS certificate valid

## Cloudflare Workers Rollback

### Immediate Rollback (< 1 min)

```bash
# Rollback any Worker to its previous deployment
npx wrangler rollback --name dreamlab-auth-api
npx wrangler rollback --name dreamlab-pod-api
npx wrangler rollback --name dreamlab-search-api
npx wrangler rollback --name dreamlab-nostr-relay
npx wrangler rollback --name dreamlab-link-preview
```

### Verify After Rollback

```bash
# Health checks
for worker in dreamlab-auth-api dreamlab-pod-api dreamlab-nostr-relay dreamlab-link-preview; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${worker}.solitary-paper-764d.workers.dev/health")
  echo "${worker}: HTTP ${STATUS}"
done

# search-api uses /status
curl -s "https://dreamlab-search-api.solitary-paper-764d.workers.dev/status" | jq .
```

### View Deployment History

```bash
# List deployments for a Worker
npx wrangler deployments list --name dreamlab-auth-api

# Stream real-time logs
npx wrangler tail dreamlab-nostr-relay
```

### D1 Database Recovery

```bash
# D1 Time Travel — restore to a specific point in time
npx wrangler d1 time-travel restore dreamlab-auth --timestamp 2026-03-02T10:00:00Z
npx wrangler d1 time-travel restore dreamlab-relay --timestamp 2026-03-02T10:00:00Z

# Export D1 data for backup
npx wrangler d1 execute dreamlab-auth --command "SELECT * FROM webauthn_credentials" --json
```

### R2 Data Recovery

R2 does not have automatic backups. For critical data:
- Pod data: Users can re-upload; profile cards are regenerated on registration
- Vector store (.rvf): Re-ingest from relay via `scripts/ingest-embeddings.ts`

## Coordinated Multi-Service Rollback

### Scenario: App Broken

```bash
# 1. Rollback all Workers
for worker in dreamlab-auth-api dreamlab-pod-api dreamlab-search-api dreamlab-nostr-relay dreamlab-link-preview; do
  npx wrangler rollback --name $worker
done

# 2. Wait for propagation
sleep 10

# 3. Rollback frontend
git revert <problematic-commit> --no-edit
git push origin main

# 4. Monitor deployment
gh run watch $(gh run list --workflow=deploy.yml --limit=1 \
  --json databaseId -q .[0].databaseId)
```

## Post-Incident Actions

### Investigation

```bash
# 1. Review deployment changes
git diff <good-commit> <bad-commit>

# 2. Check Worker logs
npx wrangler tail <worker-name> --format=json

# 3. Check deployment history
npx wrangler deployments list --name <worker-name>
```

### Root Cause Analysis

- [ ] What changed in the deployment?
- [ ] Were tests sufficient?
- [ ] Was monitoring alerting properly?
- [ ] How long was service down?
- [ ] What was actual impact?

### Prevention

- [ ] Add better testing
- [ ] Improve deployment checks
- [ ] Update alerting thresholds
- [ ] Document new edge case
- [ ] Update runbooks

### Documentation

```bash
# Create incident report
cat > /tmp/incident-report-2026-01-25.md <<EOF
# Incident Report - 2026-01-25

**Title**: Nostr Relay Down - Connection Pool Exhaustion

**Timeline**:
- 10:15 UTC: Deployment triggered
- 10:22 UTC: Alerts fired (high error rate)
- 10:25 UTC: Incident acknowledged
- 10:28 UTC: Rollback initiated
- 10:32 UTC: Service recovered

**Root Cause**: Database connection pool limit reached due to inefficient cleanup

**Resolution**: Rolled back to previous revision, added connection pooling

**Prevention**: Add load testing to CI/CD pipeline
EOF
```

## Rollback Decision Tree

```
Incident Detected
    ↓
Severity?
    ├─ P1 (Critical)
    │   ├─ GitHub Pages → Force reset gh-pages OR revert commit
    │   ├─ Workers → npx wrangler rollback --name <worker>
    │   └─ D1 → npx wrangler d1 time-travel restore <db> --timestamp <ISO>
    │
    ├─ P2 (High)
    │   ├─ GitHub Pages → Revert commit and redeploy
    │   └─ Workers → Rollback + tail logs for investigation
    │
    └─ P3 (Medium)
        └─ Schedule fix during next deploy
```

## Related Documentation

- [GitHub Pages Deployment](./GITHUB_PAGES.md) - Site deployment details
- [Cloud Services Deployment](./CLOUD_SERVICES.md) - Service architecture
- [Monitoring & Health Checks](./MONITORING.md) - Incident detection
- [Environment Setup](./ENVIRONMENTS.md) - Configuration reference

## Emergency Contacts

```
On-Call Engineer: [populate with actual contact]
Platform Lead: [populate with actual contact]
Infrastructure Team: [populate with actual contact]
```

## Testing Rollback Procedures

**Monthly Drill**:
```bash
# Test rollback without actual incident
# 1. Deploy test version
# 2. Verify rollback procedure works
# 3. Document any issues
# 4. Update procedures
```

## Quick Reference

| Service | P1 Action | Command |
|---------|-----------|---------|
| GitHub Pages | Revert commit | `git revert SHA --no-edit && git push` |
| Cloudflare Workers | Rollback to previous version | `npx wrangler rollback --env production` |
| D1 Database | Restore from Time Travel | `npx wrangler d1 time-travel restore dreamlab-auth --timestamp <ISO>` |

