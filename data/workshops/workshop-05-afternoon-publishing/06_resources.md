# Additional Resources: Publishing & Deployment

## Official Documentation

### Deployment Platforms

**Vercel**
- [Official Documentation](https://vercel.com/docs)
- [CLI Reference](https://vercel.com/docs/cli)
- [Build Configuration](https://vercel.com/docs/build-step)
- [Environment Variables](https://vercel.com/docs/environment-variables)

**Railway**
- [Documentation](https://docs.railway.app/)
- [CLI Guide](https://docs.railway.app/develop/cli)
- [Database Setup](https://docs.railway.app/databases/postgresql)
- [Environment Config](https://docs.railway.app/develop/variables)

**Netlify**
- [Documentation](https://docs.netlify.com/)
- [Build Settings](https://docs.netlify.com/configure-builds/overview/)
- [Serverless Functions](https://docs.netlify.com/functions/overview/)

**Cloudflare Pages**
- [Documentation](https://developers.cloudflare.com/pages/)
- [Framework Guides](https://developers.cloudflare.com/pages/framework-guides/)
- [Workers Integration](https://developers.cloudflare.com/pages/functions/)

---

## GitHub Actions

**Official Resources**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)

**Popular Actions**
- [actions/checkout@v4](https://github.com/actions/checkout)
- [actions/setup-node@v4](https://github.com/actions/setup-node)
- [actions/cache@v4](https://github.com/actions/cache)
- [amondnet/vercel-action](https://github.com/amondnet/vercel-action)

**Workflow Examples**
- [Starter Workflows](https://github.com/actions/starter-workflows)
- [Awesome Actions](https://github.com/sdras/awesome-actions)

---

## Documentation Tools

**MkDocs Material**
- [Official Site](https://squidfunk.github.io/mkdocs-material/)
- [Setup Guide](https://squidfunk.github.io/mkdocs-material/getting-started/)
- [Reference](https://squidfunk.github.io/mkdocs-material/reference/)
- [Plugins](https://squidfunk.github.io/mkdocs-material/plugins/)

**Storybook**
- [Documentation](https://storybook.js.org/docs)
- [React Setup](https://storybook.js.org/docs/react/get-started/install)
- [Component Story Format](https://storybook.js.org/docs/react/api/csf)
- [Chromatic](https://www.chromatic.com/) - Visual testing & hosting

**Docusaurus**
- [Official Site](https://docusaurus.io/)
- [Quick Start](https://docusaurus.io/docs)
- [Deployment](https://docusaurus.io/docs/deployment)

**OpenAPI/Swagger**
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://github.com/Redocly/redoc)
- [Stoplight](https://stoplight.io/)

---

## Video Tutorials

**Vercel Deployments**
- [Vercel Next.js Deployment](https://www.youtube.com/watch?v=Pd2tVxhFnO4) - 15 min
- [Vercel Environment Variables](https://www.youtube.com/watch?v=pRbQcy9f5ew) - 8 min

**GitHub Actions**
- [GitHub Actions Tutorial](https://www.youtube.com/watch?v=R8_veQiYBjI) - 1 hour
- [CI/CD Pipeline Setup](https://www.youtube.com/watch?v=mFFXuXjVgkU) - 45 min

**Railway**
- [Railway Deployment Guide](https://www.youtube.com/watch?v=xpBLr8VjqgY) - 12 min

**Documentation**
- [MkDocs Material Theme](https://www.youtube.com/watch?v=Q-YA_dA8C20) - 30 min
- [Storybook React Tutorial](https://www.youtube.com/watch?v=BySFuXgG-ow) - 40 min

---

## Books & Articles

**Deployment & DevOps**
- [The DevOps Handbook](https://www.amazon.com/DevOps-Handbook-World-Class-Reliability-Organizations/dp/1950508404)
- [Continuous Delivery](https://www.amazon.com/Continuous-Delivery-Deployment-Automation-Addison-Wesley/dp/0321601912)
- [Vercel Platform Guide](https://vercel.com/blog/vercel-platform-guide) - Blog series

**GitHub Actions**
- [GitHub Actions: The Complete Guide](https://www.manning.com/books/github-actions-in-action)
- [Automating Workflows with GitHub Actions](https://www.packtpub.com/product/automating-workflows-with-github-actions/9781800560406)

**Documentation**
- [Docs for Developers](https://docsfordevelopers.com/)
- [The Good Docs Project](https://thegooddocsproject.dev/)

---

## Cheat Sheets

### Vercel CLI Commands

```bash
vercel                        # Deploy preview
vercel --prod                # Deploy production
vercel ls                    # List deployments
vercel logs <url>            # View deployment logs
vercel env ls                # List environment variables
vercel env add <name>        # Add environment variable
vercel domains ls            # List domains
vercel alias                 # Manage domain aliases
vercel rollback <url>        # Rollback deployment
```

### Railway CLI Commands

```bash
railway login                # Authenticate
railway init                 # Initialize project
railway up                   # Deploy
railway logs                 # View logs
railway logs -f              # Follow logs
railway open                 # Open in browser
railway variables            # List variables
railway variables set KEY=val # Set variable
railway status               # Check status
railway link                 # Link to GitHub repo
```

### MkDocs Commands

```bash
mkdocs new [dir]             # Create new project
mkdocs serve                 # Start dev server
mkdocs build                 # Build static site
mkdocs gh-deploy             # Deploy to GitHub Pages
mkdocs --help                # Show help
```

### GitHub Actions Syntax

```yaml
# Trigger on push to main
on:
  push:
    branches: [main]

# Multiple events
on: [push, pull_request]

# Scheduled (cron)
on:
  schedule:
    - cron: '0 0 * * *'  # Daily

# Manual trigger
on: workflow_dispatch

# Environment variables
env:
  NODE_VERSION: '20'

# Job with multiple steps
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - run: npm build
```

---

## Community & Support

**Discord Servers**
- [Vercel Community](https://vercel.com/discord)
- [Railway Discord](https://discord.gg/railway)
- [Netlify Community](https://community.netlify.com/)

**Forums**
- [GitHub Community](https://github.community/)
- [Stack Overflow - GitHub Actions](https://stackoverflow.com/questions/tagged/github-actions)
- [Stack Overflow - Vercel](https://stackoverflow.com/questions/tagged/vercel)

**Newsletters**
- [Console](https://console.dev/) - Developer tools weekly
- [Frontend Focus](https://frontendfoc.us/) - Frontend news
- [DevOps'ish](https://devopsish.com/) - DevOps weekly

---

## Practice Projects

### Beginner
1. Deploy a static portfolio site to Vercel
2. Set up MkDocs documentation for a project
3. Create GitHub Actions workflow for linting

### Intermediate
4. Deploy full-stack app (React + Express) with databases
5. Set up preview deployments for all PRs
6. Build Storybook for component library

### Advanced
7. Multi-environment deployment pipeline
8. Zero-downtime deployment with health checks
9. Custom deployment scripts with rollback capability

---

## Troubleshooting Resources

**Common Issues**
- [Vercel Build Errors](https://vercel.com/support/articles/why-is-my-build-failing)
- [Railway Deployment Issues](https://docs.railway.app/troubleshoot/deployment)
- [GitHub Actions Debugging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)

**Status Pages**
- [Vercel Status](https://www.vercel-status.com/)
- [Railway Status](https://status.railway.app/)
- [GitHub Status](https://www.githubstatus.com/)
- [Netlify Status](https://www.netlifystatus.com/)

---

## Tools & Extensions

**VS Code Extensions**
- [GitHub Actions](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions)
- [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
- [Vercel](https://marketplace.visualstudio.com/items?itemName=haydenbleasel.vercel)

**Chrome Extensions**
- [Vercel Toolbar](https://chrome.google.com/webstore/detail/vercel-toolbar/)
- [Railway Dashboard](https://chrome.google.com/webstore/detail/railway/)

**CLI Tools**
- [gh (GitHub CLI)](https://cli.github.com/)
- [vercel](https://vercel.com/cli)
- [railway](https://docs.railway.app/develop/cli)

---

## What's Next?

**Recommended Learning Path:**
1. Master Docker for containerized deployments
2. Learn Kubernetes for orchestration
3. Explore AWS/GCP/Azure for enterprise deployments
4. Study infrastructure as code (Terraform)
5. Advanced monitoring with Datadog/New Relic

**Related Workshops:**
- Workshop 04: Version Control & Collaboration (Git/GitHub)
- Workshop 06: Testing & Quality Assurance
- Workshop 09: Performance Optimization
- Workshop 11: Security Best Practices

---

*Stay current with deployment best practices by following platform blogs and changelogs.*
