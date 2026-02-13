# Claude Code Configuration - DreamLab AI Website

## Project Overview

DreamLab AI is a premium AI training and consulting platform. This is a React SPA (Vite + TypeScript + Tailwind CSS) with a SvelteKit community forum, 3D WebGL visualizations (Three.js + Rust WASM), Supabase backend, and Nostr-based decentralized social features.

- **Domain:** dreamlab-ai.com
- **Hosting:** GitHub Pages (static site) + Google Cloud Run (backend services)
- **Repository:** https://github.com/DreamLab-AI/dreamlab-ai-website

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.5 |
| Build | Vite 5.4 (SWC plugin) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Routing | React Router DOM 6.26 (lazy-loaded routes) |
| State/Data | TanStack React Query 5.56 |
| Forms | React Hook Form 7.53 + Zod 3.23 |
| 3D | Three.js 0.156 + @react-three/fiber + @react-three/drei |
| WASM | Rust (Voronoi tessellation in `wasm-voronoi/`) |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Protocol | Nostr (NDK 2.13) for community forum |
| Charts | Recharts 2.12, Mermaid 11.6 |
| Sanitization | DOMPurify 3.3 |
| Forum | SvelteKit 2.49 (in `community-forum/`) |

## Build & Test Commands

```bash
# Development server (generates workshop list first)
npm run dev

# Production build
npm run build

# Development build
npm run build:dev

# Lint (ESLint 9 flat config, TypeScript rules)
npm run lint

# Preview production build
npm run preview
```

- No test runner is configured for the main website (community-forum uses Vitest + Playwright)
- Build pre-step: `node scripts/generate-workshop-list.mjs` runs automatically before dev/build
- ESLint config: `eslint.config.js` (flat config, ignores `dist/`)

## Project Structure

```
src/
  App.tsx              # Root: QueryClient, TooltipProvider, BrowserRouter, lazy routes
  main.tsx             # Vite entry point
  pages/               # 13 route pages (lazy-loaded)
    Index.tsx           # Landing page (hero, featured, CTAs)
    Team.tsx            # Team profiles (loads markdown from public/data/team/)
    Work.tsx            # Portfolio/case studies
    Contact.tsx         # Contact form (React Hook Form + Zod)
    WorkshopIndex.tsx   # Workshop catalog
    WorkshopPage.tsx    # Individual workshop (:workshopId/:pageSlug)
    ResidentialTraining.tsx  # 2-day masterclass details
    Masterclass.tsx     # AI agent training program
    SystemDesign.tsx    # Architecture documentation
    ResearchPaper.tsx   # Research content
    Testimonials.tsx    # Customer reviews
    Privacy.tsx         # Privacy policy
    NotFound.tsx        # 404 page
  components/
    ui/                 # 50+ shadcn/ui primitives (Radix-based)
    VoronoiGoldenHero.tsx     # 3D golden ratio Voronoi (Three.js)
    TesseractProjection.tsx   # 4D hyperdimensional visualization
    TorusKnot.tsx             # Mathematical knot visualization
    Header.tsx                # Site navigation
    CourseCard.tsx             # Training card component
    WorkshopCard.tsx          # Workshop listing card
    WorkshopHeader.tsx        # Workshop page header
    EmailSignupForm.tsx       # Newsletter subscription
    ErrorBoundary.tsx         # Error boundary wrapper
    RouteLoader.tsx           # Suspense fallback
  hooks/
    use-mobile.tsx            # Mobile breakpoint detection
    use-toast.ts              # Toast notification hook
    use-optimized-images.ts   # Image optimization hook
    useOGMeta.ts              # Open Graph metadata hook
  lib/
    supabase.ts         # Supabase client init (uses VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    utils.ts            # cn() utility (clsx + tailwind-merge)
    og-meta.ts          # Open Graph metadata generation
    image-utils.ts      # Image optimization (lazy load, srcset, WebP)
    markdown.ts         # Markdown processing
  data/
    skills.json         # Skills taxonomy
    workshop-list.json  # Generated workshop metadata (from scripts/)
    work/               # Case study data

public/
  data/
    team/               # 44 expert profiles (markdown + images)
    workshops/          # 15 workshop directories with content
    showcase/           # Portfolio project manifests
    media/              # Videos, thumbnails
  images/               # Static image assets
  robots.txt, sitemap.xml, site.webmanifest, CNAME

community-forum/        # SvelteKit app (separate package.json)
  src/routes/           # 16 Svelte routes (channels, DMs, calendar, profiles)
  services/             # 4 microservices (nostr-relay, embedding-api, image-api, link-preview-api)
  tests/                # Vitest unit + Playwright e2e

wasm-voronoi/           # Rust WASM (Cargo.toml, src/lib.rs)

scripts/
  generate-workshop-list.mjs  # Pre-build: scans public/data/workshops/ → workshop-list.json
  generate-heroes.sh          # Hero image generation
  optimize-images.sh          # Image compression

.github/workflows/
  deploy.yml                  # Main CI/CD → GitHub Pages
  fairfield-relay.yml         # Cloud Run: Nostr relay
  fairfield-embedding-api.yml # Cloud Run: Embedding API
  fairfield-image-api.yml     # Cloud Run: Image API
```

## Routing

All routes are lazy-loaded via `React.lazy()` in `src/App.tsx`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Landing page |
| `/team` | Team | Expert profiles |
| `/work` | Work | Case studies |
| `/workshops` | WorkshopIndex | Workshop catalog |
| `/workshops/:workshopId` | WorkshopPage | Workshop detail |
| `/workshops/:workshopId/:pageSlug` | WorkshopPage | Workshop sub-page |
| `/residential-training` | ResidentialTraining | 2-day masterclass |
| `/masterclass` | Masterclass | AI agent training |
| `/contact` | Contact | Contact form |
| `/privacy` | Privacy | Privacy policy |
| `/system-design` | SystemDesign | Architecture docs |
| `/research-paper` | ResearchPaper | Research content |
| `/testimonials` | Testimonials | Customer reviews |
| `*` | NotFound | 404 page |

## Path Aliases

- `@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

## Key Patterns

- **Component style:** shadcn/ui primitives (Radix + Tailwind + CVA)
- **Styling:** Tailwind utility classes, CSS variables for theming (HSL), dark mode via `dark:` class
- **Forms:** React Hook Form + Zod schemas for validation
- **Data fetching:** TanStack React Query for server state
- **Content:** Workshop/team data stored as markdown in `public/data/`, loaded at runtime
- **3D scenes:** Three.js via @react-three/fiber (declarative), wrapped in Canvas components
- **Code splitting:** Vite manual chunks (vendor, three, ui) + route-level lazy loading
- **Image optimization:** Custom hooks for lazy loading, srcset, WebP conversion

## TypeScript Configuration

- Strict mode: **disabled** (noImplicitAny: false, strictNullChecks: false)
- Unused vars/params: **not enforced**
- Target: ES2020, Module: ESNext, JSX: react-jsx

## Environment Variables

Required in `.env` (never commit):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Deployment

- **Static site:** `npm run build` → `dist/` → GitHub Pages (gh-pages branch)
- **Community forum:** SvelteKit static adapter → `dist/community/`
- **Backend:** Cloud Run containers (relay, embedding, image, link-preview APIs)
- **Custom domain:** dreamlab-ai.com (CNAME file in public/)

## Behavioral Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for the goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files unless explicitly requested
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER save working files to the root folder
- Run `npm run build` to verify changes compile before committing
- Run `npm run lint` to check for linting issues

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at form boundaries (Zod schemas)
- Always sanitize rendered HTML with DOMPurify
- Always validate file paths to prevent directory traversal (see vite.config.ts middleware)

## File Organization

- `/src/pages/` for route page components
- `/src/components/` for reusable components
- `/src/components/ui/` for shadcn/ui primitives
- `/src/hooks/` for custom React hooks
- `/src/lib/` for utilities and client setup
- `/src/data/` for static data files
- `/public/data/` for runtime-loaded content (markdown, manifests)
- `/scripts/` for build and utility scripts
- `/docs/` for project documentation

## Claude Flow V3 Integration

### MCP Server
Configured in `.mcp.json` — claude-flow MCP with v3 mode, hierarchical-mesh topology, max 15 agents, hybrid memory.

### Hooks
7 hook types in `.claude/settings.json`: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, Stop, PreCompact, SubagentStart, TeammateIdle, TaskCompleted.

### Skills & Agents
- 29 skills in `.claude/skills/`
- 10 command groups in `.claude/commands/`
- 24 agent categories in `.claude/agents/`

### Agentic QE v3
14 domains: test-generation, test-execution, coverage-analysis, quality-assessment, defect-intelligence, requirements-validation, code-intelligence, security-compliance, contract-testing, visual-accessibility, chaos-resilience, learning-optimization, enterprise-integration, coordination.

### CLI Quick Reference

```bash
# Claude Flow
claude-flow daemon start           # Start background workers
claude-flow memory init            # Initialize memory database
claude-flow swarm init             # Initialize a swarm
claude-flow doctor --fix           # Diagnose and fix issues

# Agentic QE
agentic-qe status                  # System status
agentic-qe health                  # Health check
agentic-qe domain list             # List all domains
agentic-qe fleet spawn             # Spawn multi-agent fleet
agentic-qe test generate <target>  # Generate tests
agentic-qe coverage <target>       # Coverage analysis
agentic-qe security                # Security scanning
agentic-qe code analyze <target>   # Code intelligence
```

## Concurrency Rules

- All independent operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents
- Batch all related file reads/writes/edits in one message
- Batch all Bash commands in one message when independent
- Never continuously poll after spawning agents — wait for results

## Swarm Configuration

- Topology: hierarchical-mesh
- Max agents: 15
- Memory backend: hybrid (HNSW enabled)
- Use `run_in_background: true` for all agent Task calls
- Put all agent Task calls in one message for parallel execution
