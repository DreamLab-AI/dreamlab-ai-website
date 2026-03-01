---
title: Monitoring & Health Checks
description: Health monitoring, alerting, and metrics for deployed services
last_updated: 2026-03-01
---

# Monitoring & Health Checks

This document covers monitoring, alerting, and health verification for all deployed services (GitHub Pages, Cloud Run services, and Cloud SQL).

## Overview

```
Services
├─ GitHub Pages (Static Site)
├─ Nostr Relay (Cloud Run)
├─ Embedding API (Cloud Run)
├─ Image API (Cloud Run)
└─ Cloud SQL (PostgreSQL)
    ↓
Monitoring Stack
├─ Cloud Monitoring (GCP)
├─ Cloud Logging (GCP)
├─ Manual Health Checks
└─ Alerting Policies
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

## Cloud Run Services Monitoring

### GCP Cloud Monitoring Setup

#### Enable Monitoring

```bash
# Create monitoring workspace
gcloud monitoring workspaces create --display-name="DreamLab Services"

# List available services
gcloud run services list --region=us-central1
```

#### View Cloud Run Metrics

```bash
# Nostr Relay metrics
gcloud run services describe nostr-relay \
  --region=us-central1 \
  --format='json' | jq '.status.conditions[]'

# List all metrics
gcloud monitoring metrics-descriptors list \
  --filter='resource.type:cloud_run_revision'
```

### Health Endpoints

Each service should implement health check endpoints:

#### Nostr Relay Health

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe nostr-relay \
  --region=us-central1 \
  --format='value(status.url)')

# Check health endpoint (if implemented)
curl "${SERVICE_URL}/health" || echo "Service active"

# Test WebSocket connectivity
wscat -c wss://$(echo ${SERVICE_URL} | cut -d'/' -f3)/
```

#### Embedding API Health

```bash
SERVICE_URL=$(gcloud run services describe embedding-api \
  --region=us-central1 \
  --format='value(status.url)')

# Health check
curl "${SERVICE_URL}/health" | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-01-25T...",
#   "uptime_seconds": 3600
# }
```

#### Image API Health

```bash
SERVICE_URL=$(gcloud run services describe image-api \
  --region=us-central1 \
  --format='value(status.url)')

# Health check
curl "${SERVICE_URL}/health"

# Test functionality
curl -X POST "${SERVICE_URL}/upload" \
  -F "file=@test-image.jpg"
```

### Viewing Logs

#### Real-time Log Streaming

```bash
# Nostr Relay logs
gcloud run services logs read nostr-relay \
  --region=us-central1 \
  --limit=50 \
  --follow

# Embedding API logs
gcloud run services logs read embedding-api \
  --region=us-central1 \
  --limit=50 \
  --follow

# Image API logs
gcloud run services logs read image-api \
  --region=us-central1 \
  --limit=50 \
  --follow
```

#### Log Filtering

```bash
# Errors only
gcloud run services logs read nostr-relay \
  --region=us-central1 \
  --limit=100 \
  --format='jsonPayload' | grep -i error

# Warnings and errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=WARNING" \
  --format=json \
  --limit=50

# Specific time range
gcloud run services logs read embedding-api \
  --region=us-central1 \
  --start-time=2026-01-25T10:00:00 \
  --end-time=2026-01-25T11:00:00
```

#### Log Search via Cloud Logging

Use Cloud Console:
1. Navigation → Logging → Logs Explorer
2. Filter by resource:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="nostr-relay"
   ```

### Key Metrics to Monitor

#### Nostr Relay

```bash
# Connection count (WebSocket connections)
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/request_count'

# Request latency
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/request_latencies'

# Memory usage
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/instance_memory'
```

**Expected Values**:
- Active connections: 1-100+
- Request latency: < 100ms
- Memory usage: 200-400Mi

#### Embedding API

```bash
# Request count
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/request_count AND resource.labels.service_name=embedding-api'

# Model loading time (in logs)
gcloud run services logs read embedding-api \
  --region=us-central1 | grep -i "model.*load"

# Cache hit ratio (if implemented)
```

**Expected Values**:
- Request latency: 500ms-2000ms (model inference)
- Concurrency: 10-80 requests/instance
- Uptime: 99.5%+

#### Image API

```bash
# Requests per second
gcloud monitoring time-series list \
  --filter='metric.type:run.googleapis.com/request_count AND resource.labels.service_name=image-api'

# Image processing time
# (Check logs for timing)
```

**Expected Values**:
- Request latency: 100-500ms
- Throughput: 100+ requests/minute
- GCS operations: sub-second

### Setting Up Alerts

#### Create Alert Policy (via Console)

1. Go to: Cloud Console → Monitoring → Alerting
2. Click: Create Policy
3. Configure:
   - **Metric**: cloud_run_revision/request_latencies
   - **Condition**: > 2000ms
   - **Duration**: 5 minutes
   - **Notification**: Email/Slack

#### Command-line Alert Creation

```bash
# Create uptime check
gcloud monitoring checks create \
  --display-name="Nostr Relay Uptime" \
  --check-type=http \
  --monitored-resource=uptime_url \
  --http-method=GET \
  --timeout-seconds=10 \
  --period-seconds=60 \
  --display-name="Nostr Relay"
```

#### Alert Channels

**Email Alerts**:
```bash
gcloud alpha monitoring channels create \
  --display-name="Team Email" \
  --type=email \
  --channel-labels=email_address=team@example.com
```

**Slack Alerts** (via Cloud Logging):
- Create Slack webhook: https://api.slack.com/messaging/webhooks
- Add to Cloud Logging sinks
- Configure notification filter

## Cloud SQL Monitoring

### Database Connectivity

```bash
# Connect to database
gcloud sql connect nostr-db --user=nostr-app

# Run query
SELECT version();
SELECT * FROM pg_stat_activity;
```

### Performance Metrics

```bash
# View Cloud SQL metrics
gcloud monitoring time-series list \
  --filter='resource.type:cloudsql_database' \
  --format=json | jq '.[] | .metric.type' | sort -u
```

**Key Metrics**:
- CPU utilization
- Memory usage
- Database connections
- Query latency
- Storage usage

### Backup Verification

```bash
# List recent backups
gcloud sql backups list --instance=nostr-db

# Backup details
gcloud sql backups describe BACKUP_ID --instance=nostr-db
```

**Expected Backup Window**: 03:00-04:00 UTC (daily)

### Connection Pool Monitoring

```sql
-- Connect to database
gcloud sql connect nostr-db --user=nostr-app

-- View active connections
SELECT datname, usename, application_name, state
FROM pg_stat_activity
WHERE datname = 'nostr';

-- Check connection limits
SHOW max_connections;
```

## Alerting Strategy

### Critical Alerts

**Nostr Relay Down** (P1):
- Trigger: Service not responding for 5 minutes
- Action: Page on-call engineer immediately
- Escalation: 15 minutes

**Embedding API Memory High** (P2):
- Trigger: Memory > 90% for 10 minutes
- Action: Notify team, check logs
- Escalation: 1 hour

**Cloud SQL CPU High** (P2):
- Trigger: CPU > 80% for 15 minutes
- Action: Check query performance
- Escalation: 30 minutes

### Warning Alerts

**High Request Latency** (P3):
- Trigger: Latency > 1000ms for 5 minutes
- Action: Investigate, may indicate resource exhaustion
- Info: Create ticket

**Low Disk Space** (P3):
- Trigger: < 20% available
- Action: Plan storage upgrade
- Info: Weekly report

## Custom Dashboards

### Create GCP Dashboard

1. Cloud Console → Monitoring → Dashboards
2. Click: Create Dashboard
3. Add widgets:
   - Cloud Run request count
   - Cloud Run request latency
   - Cloud SQL CPU/Memory
   - Cloud Run error rates

### Export Metrics

```bash
# Export metrics to BigQuery
gcloud logging sinks create cloud-run-sink \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/monitoring \
  --log-filter='resource.type="cloud_run_revision"'
```

## Health Check Automation

### Weekly Status Report

```bash
#!/bin/bash
# health-check.sh

echo "=== Weekly Health Check Report ==="
echo "Date: $(date)"
echo ""

# GitHub Pages
echo "GitHub Pages Status:"
curl -I https://dreamlab-ai.com 2>/dev/null | head -1

# Cloud Run Services
echo ""
echo "Cloud Run Services:"
for service in nostr-relay embedding-api image-api; do
  url=$(gcloud run services describe $service \
    --region=us-central1 \
    --format='value(status.url)')

  echo -n "$service: "
  curl -s -o /dev/null -w "%{http_code}" "$url" || echo "FAIL"
done

# Cloud SQL
echo ""
echo "Cloud SQL:"
gcloud sql instances describe nostr-db \
  --format='value(state)'
```

### Scheduled Checks

```bash
# Add to crontab (runs daily at 6 AM)
0 6 * * * /path/to/health-check.sh | mail -s "Daily Health Check" ops@example.com
```

## Troubleshooting Monitoring Issues

### No Metrics Showing

**Problem**: Metrics not appearing in Cloud Monitoring
- **Solution**: Service may need 5-10 minutes to generate metrics
- **Verification**: Ensure service is receiving traffic

### High False Positives

**Problem**: Alerts triggering too frequently
- **Solution**: Increase alert threshold or duration
- **Example**: Change from 1 minute to 5 minute window

### Log Spam

**Problem**: Logs too verbose
- **Solution**: Increase log level to WARNING or ERROR
- **Example**: Set `LOG_LEVEL=WARNING` environment variable

## Related Documentation

- [GitHub Pages Deployment](./GITHUB_PAGES.md) - Site deployment
- [Cloud Services Deployment](./CLOUD_SERVICES.md) - Service deployment details
- [Rollback Procedures](./ROLLBACK.md) - Emergency recovery
- [Environment Setup](./ENVIRONMENTS.md) - Configuration reference

## References

- [GCP Cloud Monitoring Docs](https://cloud.google.com/monitoring/docs)
- [Cloud Run Observability](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
- [Cloud Logging Guide](https://cloud.google.com/logging/docs)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
