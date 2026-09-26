# Assessment: Publishing & Deployment Mastery

> **Duration:** 20 minutes
> **Passing Score:** 80% (16/20 correct)

## Multiple Choice Questions

### Platform Selection (5 questions)

**1. Which platform is best for deploying a Next.js application?**
- A) Netlify
- B) Railway
- C) Vercel ✓
- D) Heroku

**2. What advantage does Cloudflare Pages offer over competitors?**
- A) Free database
- B) Unlimited bandwidth on free tier ✓
- C) Built-in CMS
- D) Email hosting

**3. Which platform provides one-click PostgreSQL provisioning?**
- A) Vercel
- B) Netlify
- C) Railway ✓
- D) GitHub Pages

**4. For a static documentation site, which is the most cost-effective option?**
- A) AWS S3 + CloudFront
- B) GitHub Pages ✓
- C) DigitalOcean Droplet
- D) Vercel Pro

**5. Which deployment platform is specifically optimized for JAMstack?**
- A) Railway
- B) Render
- C) Netlify ✓
- D) Fly.io

---

### CI/CD Concepts (5 questions)

**6. In GitHub Actions, what triggers a workflow on every pull request?**
```yaml
- A) on: push
- B) on: pull_request ✓
- C) on: merge
- D) on: commit
```

**7. What is the purpose of preview deployments?**
- A) Test performance in production
- B) Review changes before merging to main ✓
- C) Deploy to multiple regions
- D) Create backups

**8. Which GitHub Actions step is required first in most workflows?**
- A) actions/setup-node
- B) actions/cache
- C) actions/checkout ✓
- D) actions/upload-artifact

**9. How do you run jobs sequentially in GitHub Actions?**
- A) Use `parallel: false`
- B) Use `needs: [job-name]` ✓
- C) Use `depends-on`
- D) Use `wait-for`

**10. What does `runs-on: ubuntu-latest` specify?**
- A) The deployment target
- B) The virtual machine for the job ✓
- C) The Node.js version
- D) The database server

---

### Environment Management (5 questions)

**11. Where should API keys be stored in a production application?**
- A) In the code repository
- B) In environment variables ✓
- C) In a config.js file
- D) In localStorage

**12. What is the correct three-environment strategy?**
- A) Dev → Test → Prod
- B) Local → Cloud → Edge
- C) Development → Preview → Production ✓
- D) Staging → Beta → Release

**13. In Vercel, how do you set environment variables for all environments?**
- A) Add to each environment separately ✓
- B) Use `.env` file
- C) Add to `vercel.json`
- D) Use `--env` flag

**14. What happens if you commit `.env` file to GitHub?**
- A) GitHub automatically encrypts it
- B) Secrets are exposed publicly ✓
- C) Deployment will fail
- D) Nothing, it's secure

**15. How does Railway inject environment variables?**
- A) Through .env files
- B) As system environment variables ✓
- C) Through config.json
- D) Via CLI arguments

---

### Documentation & Best Practices (5 questions)

**16. What is the primary purpose of Storybook?**
- A) API testing
- B) Component documentation and development ✓
- C) Database migrations
- D) State management

**17. Which format is used for API documentation in OpenAPI?**
- A) JSON or XML
- B) YAML or JSON ✓
- C) Markdown
- D) TypeScript

**18. What is the benefit of `mkdocs gh-deploy`?**
- A) Deploys to Vercel
- B) Automatically builds and publishes to GitHub Pages ✓
- C) Creates pull request
- D) Generates API docs

**19. What should you do before deploying to production on Friday afternoon?**
- A) Deploy immediately
- B) Wait until Monday unless urgent ✓
- C) Deploy to all environments at once
- D) Skip testing to save time

**20. What is the purpose of a health check endpoint?**
- A) Monitor user activity
- B) Verify service is running correctly ✓
- C) Check database size
- D) Test API performance

---

## Practical Assessment

### Task 1: Deployment (10 points)

Deploy a React application to Vercel with:
- [ ] Automatic HTTPS (2 points)
- [ ] Preview deployment for a PR (3 points)
- [ ] Environment variables configured (2 points)
- [ ] Custom domain (optional, 3 bonus points)

### Task 2: CI/CD Pipeline (10 points)

Create a GitHub Actions workflow that:
- [ ] Runs tests on every push (3 points)
- [ ] Deploys to staging on PR merge (3 points)
- [ ] Deploys to production on main branch (4 points)

### Task 3: Documentation (5 points)

Set up MkDocs Material with:
- [ ] At least 3 pages (2 points)
- [ ] Custom theme configuration (2 points)
- [ ] Deployed to GitHub Pages (1 point)

---

## Scoring

| Category | Points | Your Score |
|----------|--------|------------|
| Multiple Choice (20 questions × 1) | 20 | |
| Practical Task 1 | 10 | |
| Practical Task 2 | 10 | |
| Practical Task 3 | 5 | |
| **Total** | **45** | |

**Passing Score:** 36/45 (80%)

---

## Answer Key

1. C, 2. B, 3. C, 4. B, 5. C
6. B, 7. B, 8. C, 9. B, 10. B
11. B, 12. C, 13. A, 14. B, 15. B
16. B, 17. B, 18. B, 19. B, 20. B

---

**Next:** [06_resources.md](06_resources.md) - Additional Resources
