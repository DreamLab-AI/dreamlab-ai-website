# Getting Started

Last updated: 2026-02-28

Complete guide to setting up your development environment for the DreamLab AI website.

---

## Prerequisites

| Tool | Minimum version | Check command |
|------|-----------------|---------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | 2.x | `git --version` |

A code editor with TypeScript support is recommended. VS Code with the ESLint and Tailwind CSS IntelliSense extensions works well.

Optional (for specific subsystems):

- **Rust toolchain** -- required only for building the WASM Voronoi module (`wasm-voronoi/`).
- **Wrangler CLI** -- required only for Cloudflare Workers development (`workers/`).
- **Docker** -- required only for running backend services locally.

---

## Clone and install

### 1. Clone the repository

```bash
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website
```

The repository has two remotes configured:

| Remote | Repository | Purpose |
|--------|-----------|---------|
| `origin` | `DreamLab-AI/dreamlab-ai-website` | Primary development |
| `upstream` | `TheDreamLabUK/website` | Upstream fork source |

### 2. Install dependencies

```bash
npm install
```

This installs all dependencies for the main React site. The community forum has its own `package.json` and must be installed separately:

```bash
cd community-forum
npm install
cd ..
```

---

## Environment setup

### Main site `.env`

Create a `.env` file in the project root. The site runs without these variables, but backend-connected features (Supabase data, auth redirects) require them.

```bash
# Supabase (optional -- site works without these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Auth API URL (optional -- needed for forum auth integration)
VITE_AUTH_API_URL=https://auth-api-xxx-uc.a.run.app
```

### Community forum `.env`

Create `community-forum/.env`:

```bash
VITE_AUTH_API_URL=https://auth-api-xxx-uc.a.run.app
```

### auth-api `.env`

Only needed if running the auth-api service locally. Create `community-forum/services/auth-api/.env`:

```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
RELAY_URL=wss://relay.dreamlab-ai.com
RP_ID=localhost
RP_NAME=DreamLab Community
RP_ORIGIN=http://localhost:5173
JSS_BASE_URL=https://jss-xxx-uc.a.run.app
```

**Security**: Never commit `.env` files. They are listed in `.gitignore`.

---

## Running the development server

```bash
npm run dev
```

This runs two pre-steps automatically before starting Vite:

1. `node scripts/generate-workshop-list.mjs` -- scans `public/data/workshops/` and writes `src/data/workshop-list.json`.
2. `node scripts/generate-testimonials.mjs` -- generates `src/data/testimonials.json`.

The site is then available at `http://localhost:5173`.

### Community forum (separate server)

```bash
cd community-forum
npm run dev
```

The forum runs on a separate port (typically `http://localhost:5174`).

---

## Building for production

```bash
npm run build
```

Output is written to `dist/`. The build uses Vite with SWC for fast transpilation and produces three manual chunks:

- `vendor` -- React, ReactDOM, React Router
- `three` -- Three.js, @react-three/fiber, @react-three/drei
- `ui` -- Radix UI component primitives

Preview the production build locally:

```bash
npm run preview
```

### Development build

```bash
npm run build:dev
```

Produces an unminified build useful for debugging production-only issues.

---

## Linting

```bash
npm run lint
```

ESLint 9 with flat config. It checks all `*.ts` and `*.tsx` files, excluding `dist/`, `community-forum/`, `workers/`, and `scripts/`.

---

## Project structure overview

The repository is a monorepo containing:

| Directory | Description |
|-----------|-------------|
| `src/` | React SPA source (Vite + TypeScript + Tailwind) |
| `community-forum/` | SvelteKit community forum (separate package.json) |
| `workers/` | Cloudflare Workers (deployed, migrated from Cloud Run) |
| `wasm-voronoi/` | Rust WASM module for Voronoi tessellation |
| `public/` | Static assets served as-is (team profiles, workshop content) |
| `scripts/` | Build-time scripts (workshop list generator, image tools) |
| `docs/` | Project documentation |
| `.github/workflows/` | CI/CD pipelines |

For a detailed breakdown, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

---

## First run checklist

- [ ] Node.js 20+ installed
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts the server
- [ ] Browser loads `http://localhost:5173`
- [ ] Home page renders (including 3D hero section)
- [ ] Navigation links work
- [ ] No errors in the browser console
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

---

## Common first-time issues

### Port already in use

```bash
npm run dev -- --port 3000
```

### Node.js version too old

```bash
node --version
# Must be 20.x or higher
```

If using nvm:

```bash
nvm install 20
nvm use 20
```

### Installation errors

Clear the cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build errors after pulling new changes

The workshop list generator may fail if workshop content has changed. Regenerate:

```bash
node scripts/generate-workshop-list.mjs
npm run build
```

---

## Next steps

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) -- full directory tree with explanations
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) -- daily development practices
- [CODE_STYLE.md](./CODE_STYLE.md) -- coding standards and conventions
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) -- testing strategies
- [../reference/tech-stack.md](../reference/tech-stack.md) -- complete technology reference
