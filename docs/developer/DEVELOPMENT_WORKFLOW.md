# Development Workflow

Last updated: 2026-02-28

Day-to-day development practices for the DreamLab AI website and its subsystems.

---

## Daily development cycle

### 1. Sync with upstream

```bash
git checkout main
git pull origin main
```

### 2. Create a feature branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Start the development server

```bash
npm run dev
```

The server starts at `http://localhost:5173` with hot module replacement. Changes to source files appear instantly in the browser.

### 4. Develop, verify, commit

- Edit files in `src/`.
- Check the browser -- Vite HMR updates components without a full page reload.
- Watch the terminal and browser console for errors.
- Run `npm run lint` periodically.
- Run `npm run build` before committing to confirm the production build succeeds.

---

## Adding a new page/route

### 1. Create the page component

Create a new file in `src/pages/`:

```typescript
// src/pages/NewPage.tsx
import { Header } from "@/components/Header";

const NewPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold">New Page</h1>
      </main>
    </div>
  );
};

export default NewPage;
```

Pages must use a **default export** for React.lazy() to work.

### 2. Register the route

Add a lazy import and route in `src/App.tsx`:

```typescript
// Add the lazy import with the other page imports
const NewPage = lazy(() => import("./pages/NewPage"));

// Add the route inside <Routes>, above the catch-all
<Route path="/new-page" element={<NewPage />} />
```

### 3. Add navigation (optional)

Update `src/components/Header.tsx` to include a link to the new page.

---

## Adding a new component

### UI primitive (shadcn/ui)

shadcn/ui components live in `src/components/ui/`. They follow a standard pattern: Radix UI primitive wrapped with Tailwind styling and the `cn()` utility.

To add a new shadcn/ui component, follow the pattern of existing files such as `button.tsx` or `card.tsx`. Use `class-variance-authority` (CVA) for variant definitions.

### Application component

Custom components live directly in `src/components/`:

```typescript
// src/components/FeatureCard.tsx
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
}

export const FeatureCard = ({ title, description, className }: FeatureCardProps) => {
  return (
    <Card className={cn("transition-shadow hover:shadow-lg", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};
```

Naming conventions:
- File name matches the component name: `FeatureCard.tsx` exports `FeatureCard`.
- Use PascalCase for component files.
- Accept an optional `className` prop for composition.

---

## Working with workshop content

Workshop content lives in `public/data/workshops/`. Each workshop is a directory containing markdown files.

After adding or modifying workshop content, regenerate the index:

```bash
node scripts/generate-workshop-list.mjs
```

This writes `src/data/workshop-list.json`, which is imported by `WorkshopIndex.tsx` and `WorkshopPage.tsx`. The script runs automatically during `npm run dev` and `npm run build`.

---

## Working with team profiles

Team profiles are markdown files in `public/data/team/`. The `Team.tsx` page fetches the directory listing from the Vite dev server middleware (configured in `vite.config.ts`) and renders each profile.

To add a new team member, create a `.md` file in `public/data/team/`.

---

## Working with the community forum

The community forum is a separate SvelteKit application in `community-forum/`.

### Running locally

```bash
cd community-forum
npm install   # first time only
npm run dev
```

### Key differences from the main site

| Aspect | Main site | Community forum |
|--------|-----------|-----------------|
| Framework | React 18 | SvelteKit 2.49 |
| Language | TypeScript | TypeScript |
| Build tool | Vite | Vite (via SvelteKit) |
| Auth | None (static site) | WebAuthn PRF + Nostr |
| Protocol | HTTP | Nostr (NDK) |
| Tests | None configured | Vitest + Playwright |

### Shared NIP-98 module

The `community-forum/packages/nip98/` module provides NIP-98 signing and verification used by both the forum client and backend services. Changes here affect multiple consumers.

---

## Working with backend services

Backend services live in `community-forum/services/`. Each service is deployed as a separate Cloud Run container.

### Running a service locally

Example for `auth-api`:

```bash
cd community-forum/services/auth-api
npm install
cp .env.example .env   # create and configure .env
npm run dev
```

The auth-api requires a PostgreSQL database (see `DATABASE_URL` in the env file).

### Service overview

| Service | Port | Purpose |
|---------|------|---------|
| auth-api | 8080 | WebAuthn registration/authentication, NIP-98 gating |
| jss | 8080 | Solid pod server (WebID + storage per pubkey) |
| nostr-relay | 8080 | Nostr relay (NIP-01, NIP-98 verified) |
| embedding-api | 8080 | Vector embeddings |
| image-api | 8080 | Image resizing and serving |
| link-preview-api | 8080 | URL metadata extraction |
| visionflow-bridge | 8080 | VisionFlow integration |

---

## Git workflow

### Branch naming

```
feature/add-workshop-calendar     # New features
fix/navigation-bug                # Bug fixes
refactor/simplify-routing         # Refactoring
docs/api-reference                # Documentation
chore/update-dependencies         # Maintenance
```

### Commit messages

Follow the Conventional Commits specification:

```
feat: add workshop calendar component
fix: resolve navigation state bug on mobile
refactor: simplify route configuration
docs: update API reference for auth-api
style: apply consistent formatting to components
perf: optimise image loading with srcset
chore: update Radix UI dependencies
```

For scoped commits:

```
feat(workshops): add advanced filtering options
fix(auth): handle PRF extension unavailability
```

### Commit frequency

- Commit logical units of work.
- Keep commits small and focused.
- Ensure each commit leaves the build in a passing state.

### Pull request workflow

```bash
# Create and switch to feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add src/components/NewFeature.tsx
git commit -m "feat: add new feature component"

# Push to remote
git push -u origin feature/my-feature

# Open a pull request via GitHub (or gh CLI)
gh pr create --title "feat: add new feature component" --body "Description of changes"
```

Before opening a PR:

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No console errors in the browser
- [ ] Changes render correctly at mobile and desktop widths

---

## Linting and type checking

### ESLint

```bash
# Run the linter
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

The ESLint configuration (`eslint.config.js`) uses:
- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- `eslint-plugin-react-hooks` for hooks rules
- `eslint-plugin-react-refresh` for fast refresh compatibility

The `@typescript-eslint/no-unused-vars` rule is disabled.

### TypeScript

TypeScript checking happens during:
- Development (Vite reports errors in the terminal)
- Build (`vite build` runs the TypeScript compiler)
- Editor (VS Code provides inline diagnostics)

The project uses relaxed TypeScript settings:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`

These are set in `tsconfig.json`. The `@/*` path alias maps to `./src/*`.

---

## Hot reload behaviour

Vite provides instant hot module replacement for most changes. Some changes trigger a full page reload:

| Change | Behaviour |
|--------|-----------|
| Component JSX/logic | HMR (state preserved) |
| CSS/Tailwind classes | HMR (instant) |
| `vite.config.ts` | Full server restart |
| `.env` files | Full server restart |
| `package.json` | Requires `npm install` + restart |
| `tailwind.config.ts` | Full page reload |
| Files in `public/` | Full page reload |

---

## Build process details

The `npm run build` command executes:

1. **Pre-build scripts** (via `prebuild` in package.json):
   - `node scripts/generate-workshop-list.mjs` -- generates workshop index
   - `node scripts/generate-testimonials.mjs` -- generates testimonials data
2. **Vite build** (`vite build`):
   - TypeScript compilation via SWC
   - Tailwind CSS purging
   - Manual chunk splitting (vendor, three, ui)
   - Asset hashing
   - Minification via esbuild

Output is written to `dist/` and deployed to GitHub Pages via the `deploy.yml` workflow.

---

## Debugging tips

### Browser DevTools

Use conditional logging to avoid leaking data:

```typescript
if (import.meta.env.DEV) {
  console.log("Debug info:", data);
}
```

### React DevTools

Install the React DevTools browser extension to inspect the component tree, props, state, and performance.

### Common issues

**Changes not appearing**: Hard refresh with `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (macOS).

**Type errors in editor**: Restart the TypeScript server. In VS Code: `Cmd+Shift+P` > "TypeScript: Restart TS Server".

**Module not found**: Delete `node_modules` and reinstall:

```bash
rm -rf node_modules
npm install
```

---

## Related documentation

- [GETTING_STARTED.md](./GETTING_STARTED.md) -- initial setup
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) -- directory layout
- [CODE_STYLE.md](./CODE_STYLE.md) -- coding standards
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) -- testing practices
