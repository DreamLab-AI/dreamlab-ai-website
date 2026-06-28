# Advanced Deployment Exercises

> **Duration:** 45 minutes
> **Difficulty:** 🔴 Advanced

## Exercise 1: Preview Deployments for Pull Requests (15 min)

Configure automatic preview deployments for every PR.

### Vercel Preview Deployments

Already automatic! Every PR gets a unique URL.

**Test it:**
1. Create a feature branch: `git checkout -b feature/new-button`
2. Make a change to your React app
3. Commit and push: `git push origin feature/new-button`
4. Create PR on GitHub
5. Vercel bot comments with preview URL

### Railway PR Previews

Create `.github/workflows/pr-preview.yml`:

```yaml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy Preview
        run: |
          railway up --service=api-preview --detach
          echo "Preview URL: $(railway status --service=api-preview --json | jq -r '.url')" >> $GITHUB_STEP_SUMMARY
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Exercise 2: Multi-Environment Setup (15 min)

Set up development, staging, and production environments.

### Vercel Environments

Configure in `vercel.json`:

```json
{
  "env": {
    "API_URL": "@api-url"
  },
  "build": {
    "env": {
      "VITE_ENV": "production"
    }
  }
}
```

Add environment-specific variables:

```bash
# Production
vercel env add API_URL production
# Enter: https://api.production.com

# Preview (staging)
vercel env add API_URL preview
# Enter: https://api.staging.com

# Development
vercel env add API_URL development
# Enter: http://localhost:3000
```

### Railway Environments

Create separate services:
- `my-api-dev` (development branch)
- `my-api-staging` (staging branch)
- `my-api-prod` (main branch)

Configure in Railway dashboard or via config file:

```toml
# railway.toml
[environments.production]
branch = "main"

[environments.staging]
branch = "staging"

[environments.development]
branch = "dev"
```

---

## Exercise 3: Storybook Deployment (15 min)

Deploy component library documentation.

### Setup Storybook

```bash
cd my-app
npx storybook@latest init
```

Create `Button.stories.jsx`:

```javascript
import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger']
    }
  }
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Delete'
  }
};
```

### Build and Deploy

```bash
# Build Storybook
npm run build-storybook

# Deploy to Vercel
vercel deploy --prod

# Or use Chromatic (recommended)
npx chromatic --project-token=YOUR_TOKEN
```

### GitHub Actions for Storybook

```yaml
name: Deploy Storybook

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Chromatic needs full history
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      
      - name: Publish to Chromatic
        uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

---

## Exercise 4: API Documentation with OpenAPI

Generate interactive API docs from your Express API.

### Install Swagger Dependencies

```bash
npm install swagger-jsdoc swagger-ui-express
```

### Configure Swagger

```javascript
// server.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager API',
      version: '1.0.0',
      description: 'REST API for task management'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
      }
    ]
  },
  apis: ['./server.js']  // Path to API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Document Your Endpoints

```javascript
/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: List all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
app.get('/api/tasks', async (req, res) => {
  // ...
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         completed:
 *           type: boolean
 */
```

Visit `https://your-api.railway.app/api-docs` to see interactive docs.

---

## Challenge Exercises

### Challenge 1: Zero-Downtime Deployment

Implement health checks and graceful shutdown.

```javascript
// server.js
let isShuttingDown = false;

app.get('/health', (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting down' });
  } else {
    res.json({ status: 'healthy', uptime: process.uptime() });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  isShuttingDown = true;
  
  // Close server after existing requests complete
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});
```

### Challenge 2: Automated Rollbacks

Create a workflow that automatically rolls back on failure.

```yaml
name: Deploy with Rollback

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Production
        id: deploy
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Health Check
        id: health
        run: |
          sleep 10
          curl -f https://my-app.vercel.app/health || exit 1
      
      - name: Rollback on Failure
        if: failure()
        run: |
          vercel rollback --token=${{ secrets.VERCEL_TOKEN }}
```

### Challenge 3: Performance Monitoring

Add Sentry error tracking and performance monitoring.

```bash
npm install @sentry/node
```

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Your routes here

app.use(Sentry.Handlers.errorHandler());
```

---

**Next:** [04_project.md](04_project.md) - Final Project
