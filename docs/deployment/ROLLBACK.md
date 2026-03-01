---
title: Rollback Procedures
description: Emergency rollback procedures for all deployment environments
last_updated: 2026-01-25
---

# Rollback Procedures

This document provides step-by-step procedures for rolling back deployments across all environments (GitHub Pages, Cloud Run services, and Cloud SQL).

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

## Cloud Run Services Rollback

### Nostr Relay Rollback

#### Immediate Rollback (< 5 min)

**Symptoms**: WebSocket connections failing, relay unresponsive

```bash
# 1. Get current and previous revisions
gcloud run revisions list \
  --service=nostr-relay \
  --region=us-central1 \
  --format='value(name,status)' \
  --limit=5

# 2. Identify last stable revision
# Output shows: revision-name | ACTIVE
# Note the previous revision

# 3. Route 100% traffic to previous revision
gcloud run services update-traffic nostr-relay \
  --to-revisions=<previous-revision-name>=100 \
  --region=us-central1

# 4. Verify traffic routed
gcloud run services describe nostr-relay \
  --region=us-central1 \
  --format='value(status.traffic)'

# 5. Test connectivity
SERVICE_URL=$(gcloud run services describe nostr-relay \
  --region=us-central1 \
  --format='value(status.url)')
wscat -c wss://$(echo ${SERVICE_URL} | cut -d'/' -f3)/
```

**Key Advantage**: Instant effect without redeployment

**Verification**:
```bash
# Check logs
gcloud run services logs read nostr-relay \
  --region=us-central1 \
  --limit=50 \
  --format=json | jq '.[] | select(.severity=="ERROR")'

# Monitor connections
watch -n 5 "gcloud run services describe nostr-relay --region=us-central1"
```

#### Full Rollback (Rebuild Previous Version)

```bash
# 1. Get previous working image tag
gcloud container images list \
  --repository=us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir

# 2. List image tags
gcloud container image-tags list \
  us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay

# 3. Deploy previous image
gcloud run deploy nostr-relay \
  --image us-central1-docker.pkg.dev/PROJECT_ID/minimoonoir/nostr-relay:PREVIOUS_TAG \
  --region=us-central1 \
  --platform=managed

# 4. Verify deployment
gcloud run services describe nostr-relay --region=us-central1
```

### Embedding API Rollback

```bash
# Similar to Nostr Relay

# Get revisions
gcloud run revisions list \
  --service=embedding-api \
  --region=us-central1 \
  --limit=5

# Route traffic to previous
gcloud run services update-traffic embedding-api \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1

# Verify health
SERVICE_URL=$(gcloud run services describe embedding-api \
  --region=us-central1 \
  --format='value(status.url)')

curl "${SERVICE_URL}/health" | jq .
```

### Image API Rollback

```bash
# Same pattern as above services

gcloud run services update-traffic image-api \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1

# Test
SERVICE_URL=$(gcloud run services describe image-api \
  --region=us-central1 \
  --format='value(status.url)')

curl "${SERVICE_URL}/health"
```

### Cloud Run Rollback Validation

**Post-Rollback Checklist**:
- [ ] Service responding to requests
- [ ] Error rate back to normal (< 1%)
- [ ] Latency acceptable (< 2s)
- [ ] All traffic routed to previous revision
- [ ] No errors in logs
- [ ] Database connections healthy

## Cloud SQL Rollback

### Data Corruption Detected

**Severity**: P1 - Requires immediate action

#### Emergency Data Recovery

```bash
# 1. Stop all connections (optional, if corruption spreading)
gcloud sql instances patch nostr-db \
  --deny-maintenance-window

# 2. List available backups
gcloud sql backups list --instance=nostr-db \
  --format='table(name, windowStartTime, status)'

# 3. Find last good backup BEFORE corruption
# Check backup timestamps and verify against incident timeline
gcloud sql backups describe <backup-id> --instance=nostr-db

# 4. Restore from backup
gcloud sql backups restore <backup-id> \
  --backup-instance=nostr-db \
  --backup-configuration=default

# NOTE: This creates new instance - requires manual steps below
```

#### Restoration Steps (if creating new instance)

```bash
# 1. Backup current (corrupted) instance
gcloud sql instances patch nostr-db \
  --backup-start-time=03:00

# 2. Create clone from backup
gcloud sql instances clone nostr-db nostr-db-restored \
  --point-in-time=2026-01-25T10:00:00Z

# 3. Verify restored instance
gcloud sql connect nostr-db-restored --user=nostr-app
# SELECT * FROM information_schema.tables;

# 4. Update Cloud Run to use restored instance
gcloud run services update nostr-relay \
  --update-cloudsql-instances=PROJECT_ID:us-central1:nostr-db-restored \
  --region=us-central1

# 5. Test connections
# Check relay logs for connectivity

# 6. Rename instances
gcloud sql instances delete nostr-db --quiet
gcloud sql instances patch nostr-db-restored --backup-start-time=03:00

# 7. Point Cloud Run back
gcloud run services update nostr-relay \
  --update-cloudsql-instances=PROJECT_ID:us-central1:nostr-db \
  --region=us-central1
```

### Database Query Issues

**Situation**: Slow queries, high CPU, resource exhaustion

```bash
# 1. Connect to database
gcloud sql connect nostr-db --user=nostr-app

# 2. Find long-running queries
SELECT pid, now() - pg_stat_activity.query_start as duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

# 3. Cancel problematic query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE query LIKE '%<problematic-query>%';

# 4. Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

# 5. If deadlock detected, rollback transaction
-- Rollback is automatic on connection close
-- Or manually ROLLBACK; if in explicit transaction
```

### Database Migration Rollback

**Situation**: Schema migration caused issues

```bash
# 1. Get latest backup before migration
gcloud sql backups list --instance=nostr-db

# 2. Restore to point-in-time (before migration)
gcloud sql backups restore <backup-id> \
  --backup-instance=nostr-db

# 3. Verify schema reverted
gcloud sql connect nostr-db --user=nostr-app
\dt  -- list tables
\d <table>  -- describe table structure
```

## Coordinated Multi-Service Rollback

### Scenario: App Broken

**Situation**: Changes to multiple services cause failures

```bash
# 1. Assess which services affected
#    - GitHub Pages (frontend)
#    - Nostr Relay (WebSocket)
#    - Embedding API (search)
#    - Image API (media)

# 2. Identify last known-good deployment
# Check git history, deployment timestamps

# 3. Rollback in order:
#    - Cloud Run services first (backend)
#    - GitHub Pages last (frontend)

# Rollback backend services
gcloud run services update-traffic nostr-relay \
  --to-revisions=<previous>=100 \
  --region=us-central1

gcloud run services update-traffic embedding-api \
  --to-revisions=<previous>=100 \
  --region=us-central1

gcloud run services update-traffic image-api \
  --to-revisions=<previous>=100 \
  --region=us-central1

# Wait for services to stabilize
sleep 30

# Then rollback frontend
git revert <problematic-commit> --no-edit
git push origin main

# Monitor deployment
gh run watch $(gh run list --workflow=deploy.yml --limit=1 \
  --json databaseId -q .[0].databaseId)
```

## Canary/Blue-Green Deployment (Prevention)

### Setup Traffic Split for Testing

```bash
# After new Cloud Run deployment, route only 10% traffic
gcloud run services update-traffic nostr-relay \
  --to-revisions=<new-revision>=10,<previous>=90 \
  --region=us-central1

# Monitor new revision
sleep 5m
gcloud run services logs read nostr-relay \
  --region=us-central1 \
  --format=json | jq '.[] | select(.severity=="ERROR")'

# If good, increase to 100%
gcloud run services update-traffic nostr-relay \
  --to-revisions=<new-revision>=100 \
  --region=us-central1

# If bad, revert immediately
gcloud run services update-traffic nostr-relay \
  --to-revisions=<previous>=100 \
  --region=us-central1
```

## Post-Incident Actions

### Investigation

```bash
# 1. Review deployment changes
git diff <good-commit> <bad-commit>

# 2. Check logs before/after
gcloud run services logs read <service> \
  --region=us-central1 \
  --start-time=2026-01-25T09:00:00 \
  --end-time=2026-01-25T11:00:00 \
  --format=json

# 3. Query metrics during incident
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/request_count AND resource.labels.service_name=nostr-relay' \
  --start-time=2026-01-25T09:00:00 \
  --end-time=2026-01-25T11:00:00
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
    │   ├─ Cloud Run → Update traffic to previous revision
    │   └─ Cloud SQL → Restore from backup
    │
    ├─ P2 (High)
    │   ├─ GitHub Pages → Revert commit and redeploy
    │   ├─ Cloud Run → Update traffic or redeploy
    │   └─ Cloud SQL → Check queries, optimize if possible
    │
    └─ P3 (Medium)
        └─ Schedule rollback during maintenance window
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
| Nostr Relay | Update traffic | `gcloud run services update-traffic` |
| Embedding API | Update traffic | `gcloud run services update-traffic` |
| Image API | Update traffic | `gcloud run services update-traffic` |
| Cloud SQL | Restore backup | `gcloud sql backups restore` |

