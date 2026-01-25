---
title: Deployment Documentation
description: Complete guide to DreamLab deployment infrastructure and procedures
last_updated: 2026-01-25
---

# Deployment Documentation

Comprehensive guide to deploying and maintaining the DreamLab AI and Fairfield community applications.

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [GITHUB_PAGES.md](./GITHUB_PAGES.md) | Static site deployment to GitHub Pages | Developers, DevOps |
| [CLOUD_SERVICES.md](./CLOUD_SERVICES.md) | GCP Cloud Run backend services | DevOps, Infrastructure |
| [MONITORING.md](./MONITORING.md) | Health checks and observability | DevOps, SRE, On-call |
| [ROLLBACK.md](./ROLLBACK.md) | Emergency recovery procedures | DevOps, On-call, Team Lead |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Dev/staging/production setup | All developers |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Repository (main branch)                             │
│ - Source code                                               │
│ - GitHub Actions workflows                                  │
│ - Configuration as code                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─────────────────────┬─────────────────────┐
                       ↓                     ↓                     ↓
          ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
          │  GitHub Pages      │  │  GCP Cloud Run   │  │  GCP Cloud SQL  │
          ├────────────────────┤  ├──────────────────┤  ├─────────────────┤
          │ - Main site        │  │ - nostr-relay    │  │ - PostgreSQL    │
          │ - SvelteKit        │  │ - embedding-api  │  │ - Backups       │
          │ - Fairfield app    │  │ - image-api      │  │ - Replication   │
          │ - Static assets    │  │ - Artifact Reg   │  └─────────────────┘
          │ - Team data        │  │ - Auto-scaling   │
          └────────────────────┘  └──────────────────┘
          dreamlab-ai.com         us-central1
          HTTP/2 + CDN           Container services
```

## Key Technologies

| Component | Technology | Version |
|-----------|----------|---------|
| Frontend | SvelteKit | Latest |
| Community App | SvelteKit | Latest |
| Relay Server | Node.js | 20 |
| Embedding API | Python | 3.11 |
| Image API | Node.js | 20 |
| Database | PostgreSQL | 15 |
| Container Registry | GCP Artifact Registry | - |
| Deployment | GitHub Actions | - |
| Infrastructure | Google Cloud Platform | - |

## Deployment Workflows

### Automatic Deployments

**GitHub Pages** (`deploy.yml`):
- Trigger: Push to `main` branch
- Duration: 5-10 minutes
- Target: https://dreamlab-ai.com
- Built-in: Health checks, data verification

**Nostr Relay** (`fairfield-relay.yml`):
- Trigger: Changes to `community-forum/services/nostr-relay/`
- Duration: 3-5 minutes
- Target: GCP Cloud Run (us-central1)
- Built-in: Type checking, build validation

**Embedding API** (`fairfield-embedding-api.yml`):
- Trigger: Changes to `community-forum/services/embedding-api/`
- Duration: 10-15 minutes (includes model loading)
- Target: GCP Cloud Run (us-central1)
- Built-in: Python linting, type checking

**Image API** (`fairfield-image-api.yml`):
- Trigger: Changes to `community-forum/services/image-api/`
- Duration: 3-5 minutes
- Target: GCP Cloud Run (us-central1)
- Built-in: Docker build optimization

### Manual Deployments

```bash
# GitHub Pages (if workflow fails)
git push origin main

# Trigger specific workflow
gh workflow run deploy.yml --ref main

# Watch deployment progress
gh run watch <run-id>
```

## Environment Configuration

### Required Secrets (GitHub)

```
VITE_SUPABASE_URL              # Supabase project URL
VITE_SUPABASE_ANON_KEY         # Supabase API key
GCP_PROJECT_ID                 # GCP project ID
GCP_SA_KEY                      # Service account credentials (JSON)
```

### Required Variables (GitHub)

```
FAIRFIELD_RELAY_URL             # wss://relay endpoint
FAIRFIELD_EMBEDDING_API_URL     # https://embedding service
FAIRFIELD_LINK_PREVIEW_API_URL  # https://link preview service
FAIRFIELD_IMAGE_API_URL         # https://image service
FAIRFIELD_IMAGE_BUCKET          # GCS bucket name
FAIRFIELD_ADMIN_PUBKEY          # Nostr admin public key
```

### GCP Secret Manager

```
nostr-db-url                    # PostgreSQL connection string
admin-pubkey                    # Admin public keys (comma-separated)
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing: `npm run test`
- [ ] Type checking: `npm run typecheck`
- [ ] Linting: `npm run lint`
- [ ] Code reviewed and approved
- [ ] Team data files present: `src/data/team/`
- [ ] Environment variables configured
- [ ] Secrets valid and current
- [ ] GCP project accessible
- [ ] Cloud SQL instance healthy

### During Deployment

- [ ] Monitor GitHub Actions workflow
- [ ] Check build logs for errors
- [ ] Verify no assets missing
- [ ] Confirm push to appropriate branch
- [ ] Track deployment progress

### Post-Deployment

- [ ] Site loads at production URL
- [ ] All services responding
- [ ] No console errors
- [ ] Team member profiles display
- [ ] Community app functional
- [ ] Images load correctly
- [ ] External links work
- [ ] Mobile responsive
- [ ] Check monitoring alerts

## Incident Response

### Alert Response

| Alert | Severity | Response | Time |
|-------|----------|----------|------|
| Service 502 Error | P1 | Page on-call | < 5 min |
| Error Rate > 10% | P2 | Notify team | < 15 min |
| Latency > 5s | P2 | Investigate | < 30 min |
| Low Disk Space | P3 | Plan upgrade | < 1 hour |

### Quick Rollback

```bash
# GitHub Pages
git revert <commit-sha> --no-edit && git push origin main

# Cloud Run (traffic routing)
gcloud run services update-traffic <service> \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1

# See ROLLBACK.md for detailed procedures
```

## Monitoring & Observability

### Health Checks

```bash
# Main site
curl -I https://dreamlab-ai.com

# Cloud Run services
curl https://embedding-api.cloudrun.app/health
curl https://image-api.cloudrun.app/health

# Database connectivity
gcloud sql connect nostr-db --user=nostr-app
```

### Metrics & Logs

- **Cloud Monitoring**: https://console.cloud.google.com/monitoring
- **Cloud Logging**: https://console.cloud.google.com/logs
- **GitHub Actions**: Repository → Actions tab
- **Cloud Run Logs**: `gcloud run services logs read <service>`

### Alerts

**Production alerts sent to**:
- Slack: #deployment-alerts (when configured)
- Email: ops-team@example.com
- PagerDuty: Production-incident (when configured)

## Common Tasks

### Deploy New Feature

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test
npm run test

# 3. Create PR
gh pr create --title "feat: new feature"

# 4. After approval, merge to main
# (Automatic deployment triggers)

# 5. Monitor deployment
gh run watch
```

### Update Team Data

```bash
# 1. Add/update files in src/data/team/
# 2. Commit changes
git add src/data/team/
git commit -m "data: update team member profiles"

# 3. Push to main (triggers deployment)
git push origin main

# 4. Verify in https://dreamlab-ai.com/team
```

### Hotfix Production Issue

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/issue-description

# 2. Make minimal fix
# (Don't include other changes)

# 3. Test thoroughly
npm run test

# 4. Push for urgent review
git push origin hotfix/issue-description
gh pr create --title "fix: issue description" --draft false

# 5. After approval, merge
# (Deployment auto-triggers)

# 6. Tag release (if needed)
git tag -a v1.2.3 -m "hotfix: description"
git push origin v1.2.3
```

### Scale Service

```bash
# Nostr Relay (more WebSocket connections)
gcloud run services update nostr-relay \
  --max-instances=5 \
  --region=us-central1

# Embedding API (more concurrent requests)
gcloud run services update embedding-api \
  --min-instances=1 \
  --max-instances=10 \
  --region=us-central1

# Check scaling
gcloud run services describe nostr-relay \
  --region=us-central1 | grep -A 5 instances
```

## Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| Build timeout | GitHub Actions fails after 30min | Check dependency installation, optimize build |
| Service 503 | Cloud Run returns error | Check logs, verify Cloud SQL connectivity |
| High latency | Requests take > 5s | Scale service, check database performance |
| Asset missing | 404 on images/files | Verify copy in workflow, check build output |
| CORS errors | API requests fail | Check ALLOWED_ORIGINS in service config |
| Memory exceeded | OOM killer triggered | Increase memory allocation, optimize code |

## Performance Targets

| Metric | Target | Service |
|--------|--------|---------|
| Page load time | < 3 seconds | GitHub Pages |
| API latency (relay) | < 100ms | Nostr Relay |
| Embedding request | 500-2000ms | Embedding API |
| Image upload | < 500ms | Image API |
| Database query | < 100ms | Cloud SQL |
| Error rate | < 1% | All services |
| Uptime | 99.5%+ | All services |

## Cost Optimization

### Current Estimated Costs

```
GitHub Pages:        Free
Cloud Run (3x):      ~$150/month
Cloud SQL:           ~$100/month
Google Cloud Store:  ~$50/month
Monitoring:          ~$50/month
───────────────────────────
Total:              ~$350/month
```

### Cost Reduction Strategies

1. **Use Cloud Run min instances = 0** for non-critical services
2. **Set reasonable max instances** to prevent runaway costs
3. **Enable Cloud SQL autoscaling** instead of fixed tier
4. **Set GCS lifecycle policies** to delete old objects
5. **Use commit caching** in Cloud Build
6. **Monitor invocations** in Cloud Logging

## Security

### Secret Management

- All secrets stored in GitHub secrets or GCP Secret Manager
- Never commit secrets to repository
- Rotate secrets quarterly
- Use service accounts with minimal permissions
- Enable secret versioning

### Deployment Security

- Protected main branch (require reviews)
- CI/CD checks mandatory before merge
- Limited deployment permissions (release team only)
- Audit logs for all deployments
- Auto-rollback on detection of issues

### Data Protection

- HTTPS/TLS for all services
- Database encrypted at rest
- GCS versioning enabled
- Automated daily backups
- Point-in-time recovery available

## Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GCP Cloud Run Guide](https://cloud.google.com/run/docs)
- [GCP Cloud Build Docs](https://cloud.google.com/build/docs)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
- [SvelteKit Deployment](https://kit.svelte.dev/docs/adapter-auto)

## Support & Escalation

### First Contact

- **Deployment Questions**: Check this documentation
- **Slack Channel**: #deployments (post question)
- **GitHub Issues**: Create issue with `[deployment]` label

### Escalation

**P1 (Critical Outage)**:
- Page on-call engineer immediately
- Escalation: Platform lead

**P2 (Major Issue)**:
- Notify team in Slack
- Create incident ticket
- Escalation: Engineering manager (1 hour)

**P3 (Minor Issue)**:
- Create GitHub issue
- Schedule for next sprint
- No escalation needed

## Document Maintenance

This documentation is maintained by the infrastructure team.

**Last Updated**: 2026-01-25

**Next Review**: Quarterly or after major deployment changes

**Maintainers**:
- DevOps / SRE team
- Platform engineering lead

**Contributing**:
1. Create pull request with changes
2. Updates require infrastructure team approval
3. Deploy documentation changes to staging first
4. Update version date when published

---

**For emergency deployment issues, reference [ROLLBACK.md](./ROLLBACK.md) for recovery procedures.**

