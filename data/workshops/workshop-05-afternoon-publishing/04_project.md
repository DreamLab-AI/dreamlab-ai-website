# Final Project: Full-Stack Deployment Pipeline

> **Duration:** 60 minutes
> **Difficulty:** 🔴 Advanced

## Project Overview

Build and deploy a complete full-stack application with:
- React frontend on Vercel
- Node.js API on Railway with PostgreSQL
- MkDocs documentation on GitHub Pages
- Storybook component library on Chromatic
- Full CI/CD pipeline with GitHub Actions

---

## Project Specification

**Application:** AI-Powered Task Manager

**Features:**
1. User authentication (JWT)
2. Create, read, update, delete tasks
3. AI-powered task suggestions (OpenAI API)
4. Real-time updates (WebSockets)
5. Component library documentation
6. API documentation

---

## Phase 1: Backend API (20 minutes)

### Database Setup

```bash
# In Railway: Add PostgreSQL database
# Note the DATABASE_URL from environment variables
```

### API Implementation

```javascript
// server.js
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Initialize database
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, hash]
  );
  
  const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE user_id = $1',
    [req.user.id]
  );
  res.json(result.rows);
});

app.post('/api/tasks/suggest', authenticateToken, async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Suggest 3 actionable tasks based on the user context.' },
      { role: 'user', content: req.body.context }
    ]
  });
  
  res.json({ suggestions: completion.choices[0].message.content });
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

### Deploy to Railway

```bash
git add .
git commit -m "Complete API implementation"
git push origin main
```

Set environment variables in Railway:
- `DATABASE_URL` (auto-set)
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `FRONTEND_URL`

---

## Phase 2: Frontend Application (20 minutes)

### React Setup with Vite

```bash
npm create vite@latest task-manager-ui -- --template react
cd task-manager-ui
npm install axios react-router-dom zustand
```

### State Management

```javascript
// src/store/useTaskStore.js
import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  
  fetchTasks: async () => {
    set({ loading: true });
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    set({ tasks: data, loading: false });
  },
  
  addTask: async (task) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(`${API_URL}/api/tasks`, task, {
      headers: { Authorization: `Bearer ${token}` }
    });
    set({ tasks: [...get().tasks, data] });
  },
  
  getSuggestions: async (context) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(
      `${API_URL}/api/tasks/suggest`,
      { context },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return data.suggestions;
  }
}));
```

### Deploy to Vercel

```bash
# Create .env.production
echo "VITE_API_URL=https://your-api.railway.app" > .env.production

git add .
git commit -m "Complete frontend"
git push

# Deploy
vercel --prod
```

---

## Phase 3: Documentation (10 minutes)

### API Documentation

Create `docs/api/endpoints.md`:

```markdown
# API Endpoints

## Authentication

### POST /api/auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Tasks

### GET /api/tasks

List all tasks for authenticated user.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
[
  {
    "id": 1,
    "title": "Complete deployment",
    "completed": false,
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```
```

### Deploy Documentation

```bash
mkdocs gh-deploy
```

---

## Phase 4: CI/CD Pipeline (10 minutes)

Create `.github/workflows/full-stack-deploy.yml`:

```yaml
name: Full Stack Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
  
  deploy-api:
    needs: test-api
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up --service=api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
  
  deploy-docs:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: 3.x
      - run: pip install mkdocs-material
      - run: mkdocs gh-deploy --force
```

---

## Success Criteria

Your project is complete when:

- [ ] API deployed to Railway with PostgreSQL
- [ ] Frontend deployed to Vercel
- [ ] Documentation live on GitHub Pages
- [ ] CI/CD pipeline running successfully
- [ ] Health check endpoints responding
- [ ] Authentication working
- [ ] Task CRUD operations functional
- [ ] AI suggestions working
- [ ] Preview deployments for PRs
- [ ] Custom domain configured (optional)

---

## Bonus Enhancements

1. **Monitoring:** Add Sentry error tracking
2. **Analytics:** Integrate Vercel Analytics
3. **Performance:** Add Redis caching layer
4. **SEO:** Implement meta tags and Open Graph
5. **PWA:** Make frontend installable

---

**Next:** [05_assessment.md](05_assessment.md) - Knowledge Check
