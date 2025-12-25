# Hands-On: Deploy to Production

> **Duration:** 90 minutes
> **Difficulty:** 🟡 Intermediate

## Overview

In this hands-on session, you'll deploy three types of projects to production:
1. A React application to Vercel
2. A Node.js API to Railway
3. A documentation site with MkDocs Material

By the end, you'll have live URLs for all three projects with automated CI/CD pipelines.

---

## Exercise 1: Deploy React App to Vercel (30 minutes)

### Step 1: Prepare Your React Application

Create a simple React app or use an existing one:

```bash
# Create new React app with Vite
npm create vite@latest my-app -- --template react
cd my-app
npm install
```

Add a production build script to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Test the build locally:

```bash
npm run build
npm run preview
```

### Step 2: Push to GitHub

```bash
# Initialize Git
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
gh repo create my-app --public --source=. --remote=origin --push
# Or manually create on GitHub and:
git remote add origin https://github.com/YOUR_USERNAME/my-app.git
git push -u origin main
```

### Step 3: Deploy to Vercel

**Option A: Using Vercel Dashboard** (Recommended for beginners)

1. Visit [vercel.com](https://vercel.com)
2. Sign up/log in with GitHub
3. Click "Add New... → Project"
4. Import your GitHub repository
5. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click "Deploy"

**Option B: Using Vercel CLI** (Faster for repeat deployments)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# Set up and deploy? Yes
# Which scope? (select your account)
# Link to existing project? No
# Project name? (accept default)
# Directory? (press Enter for current)
# Want to override settings? No

# Production deployment
vercel --prod
```

### Step 4: Verify Deployment

Your app is now live! You'll get two URLs:
- **Preview URL**: `my-app-abc123.vercel.app` (for this specific deployment)
- **Production URL**: `my-app.vercel.app` (always points to latest production)

Visit the URL and verify your app works.

### Step 5: Add Custom Domain (Optional)

In Vercel Dashboard:
1. Project Settings → Domains
2. Add your domain (e.g., `myapp.com`)
3. Configure DNS records as instructed
4. Vercel automatically provisions SSL certificate

---

## Exercise 2: Deploy Node.js API to Railway (30 minutes)

### Step 1: Create Express API

```bash
mkdir my-api
cd my-api
npm init -y
npm install express cors dotenv
```

Create `server.js`:

```javascript
// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Sample API endpoint
app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Deploy to Railway', completed: true },
    { id: 2, title: 'Configure environment variables', completed: false }
  ]);
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  res.status(201).json({ id: Date.now(), title, completed: false });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
```

Update `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

Test locally:

```bash
npm run dev
# Visit http://localhost:3000/health
```

### Step 2: Push to GitHub

```bash
git init
echo "node_modules\n.env" > .gitignore
git add .
git commit -m "Initial API commit"
gh repo create my-api --public --source=. --remote=origin --push
```

### Step 3: Deploy to Railway

**Option A: Using Railway Dashboard**

1. Visit [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `my-api` repository
6. Railway auto-detects Node.js and deploys

**Option B: Using Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to GitHub repo (optional)
railway link

# Deploy
railway up
```

### Step 4: Configure Environment Variables

In Railway Dashboard:
1. Select your service
2. Go to "Variables" tab
3. Add variables:
   - `NODE_ENV`: `production`
   - `API_KEY`: `your-secret-key`

Or via CLI:

```bash
railway variables set NODE_ENV=production
railway variables set API_KEY=your-secret-key
```

### Step 5: Get Your API URL

Railway generates a URL like:
`https://my-api-production.up.railway.app`

Test your API:

```bash
curl https://my-api-production.up.railway.app/health
```

### Step 6: Add PostgreSQL Database (Optional)

In Railway Dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Railway automatically sets `DATABASE_URL` environment variable
3. Access in your code:

```javascript
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/tasks', async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks');
  res.json(result.rows);
});
```

---

## Exercise 3: Deploy Documentation with MkDocs Material (30 minutes)

### Step 1: Install MkDocs Material

```bash
pip install mkdocs-material
# Or with pipx for isolation
pipx install mkdocs-material
```

### Step 2: Create Documentation Site

```bash
mkdir my-docs
cd my-docs
mkdocs new .
```

This creates:
```
my-docs/
├── mkdocs.yml      # Configuration
└── docs/
    └── index.md    # Homepage
```

### Step 3: Configure Material Theme

Edit `mkdocs.yml`:

```yaml
site_name: My Project Documentation
site_url: https://my-docs.example.com
repo_url: https://github.com/username/my-docs

theme:
  name: material
  palette:
    # Light mode
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    # Dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy
    - content.code.annotate

plugins:
  - search

markdown_extensions:
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.tabbed:
      alternate_style: true
  - admonition
  - pymdownx.details
  - attr_list
  - md_in_html

nav:
  - Home: index.md
  - Getting Started:
    - Installation: getting-started/installation.md
    - Quick Start: getting-started/quickstart.md
  - API Reference:
    - Overview: api/overview.md
    - Endpoints: api/endpoints.md
```

### Step 4: Add Documentation Pages

Create `docs/getting-started/installation.md`:

```markdown
# Installation

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## Install via npm

\`\`\`bash
npm install my-package
\`\`\`

## Install via yarn

\`\`\`bash
yarn add my-package
\`\`\`

!!! warning "Python 3.8+"
    This package requires Python 3.8 or higher for CLI tools.
```

Test locally:

```bash
mkdocs serve
# Visit http://localhost:8000
```

### Step 5: Deploy to GitHub Pages

```bash
# Push to GitHub first
git init
git add .
git commit -m "Initial docs"
gh repo create my-docs --public --source=. --remote=origin --push

# Deploy to GitHub Pages
mkdocs gh-deploy
```

Your docs are now live at:
`https://username.github.io/my-docs/`

### Step 6: Alternative - Deploy to Vercel

```bash
# Build static site
mkdocs build

# Deploy to Vercel
vercel deploy
```

In Vercel, configure:
- **Build Command**: `pip install mkdocs-material && mkdocs build`
- **Output Directory**: `site`

---

## Bonus Exercise: GitHub Actions Automation (20 minutes)

Set up automatic deployments on every push.

### For Vercel (React App)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### For Railway (API)

Create `.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy to Railway
        run: railway up --service=my-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### For MkDocs (Documentation)

Create `.github/workflows/docs.yml`:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: 3.x

      - name: Install MkDocs
        run: pip install mkdocs-material

      - name: Deploy to GitHub Pages
        run: mkdocs gh-deploy --force
```

---

## Troubleshooting Common Issues

### Vercel Build Fails

**Problem**: `Error: Command "npm run build" exited with 1`

**Solutions**:
1. Check `package.json` has correct build script
2. Verify all dependencies are in `dependencies` (not `devDependencies`)
3. Set Node.js version: Create `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "framework": "vite",
     "installCommand": "npm install",
     "outputDirectory": "dist"
   }
   ```

### Railway Port Issues

**Problem**: Service starts but shows "Application failed to respond"

**Solution**: Railway provides `PORT` environment variable. Use it:
```javascript
const PORT = process.env.PORT || 3000;
```

### MkDocs GitHub Pages 404

**Problem**: Documentation deploys but shows 404

**Solutions**:
1. Check GitHub Pages is enabled: Settings → Pages → Source: `gh-pages` branch
2. Verify `site_url` in `mkdocs.yml` matches GitHub Pages URL
3. Wait 2-3 minutes for DNS propagation

### Environment Variables Not Working

**Problem**: Secrets not accessible in application

**Solutions**:
1. Restart service after adding variables
2. Check variable names match exactly (case-sensitive)
3. For preview deployments, ensure variables are set for "Preview" environment

---

## Verification Checklist

After completing all exercises, verify:

- [ ] React app accessible at Vercel URL
- [ ] API health check endpoint responds
- [ ] Documentation site loads with correct theme
- [ ] All sites use HTTPS automatically
- [ ] Environment variables configured correctly
- [ ] GitHub Actions workflows (if configured) passing

---

## Next Steps

Now that you have live deployments, you'll learn to:
- Set up preview deployments for PRs
- Configure custom domains
- Add monitoring and error tracking
- Implement zero-downtime deployments

**Next:** [03_exercises.md](03_exercises.md) - Advanced Deployment Patterns

---

## Quick Reference Commands

```bash
# Vercel
vercel                    # Deploy preview
vercel --prod            # Deploy production
vercel logs              # View logs
vercel env ls            # List environment variables

# Railway
railway up               # Deploy
railway logs             # View logs
railway open             # Open in browser
railway variables        # Manage environment variables

# MkDocs
mkdocs serve            # Local preview
mkdocs build            # Build static site
mkdocs gh-deploy        # Deploy to GitHub Pages
```
