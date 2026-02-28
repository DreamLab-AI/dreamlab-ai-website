# Testing Guide

Last updated: 2026-02-28

Testing strategies and tooling across the DreamLab AI monorepo.

---

## Overview

The monorepo has two packages with different testing setups:

| Package | Test runner | E2E | Status |
|---------|------------|-----|--------|
| Main site (`/`) | None configured | None | Manual testing only |
| Community forum (`community-forum/`) | Vitest | Playwright | Active |

---

## Main site

The main React site does not currently have a test runner configured. Verification relies on:

1. **Linting**: `npm run lint`
2. **Build verification**: `npm run build`
3. **Manual browser testing**: `npm run dev` or `npm run preview`

### Manual testing checklist

Before committing changes to the main site, verify:

**Build**
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` serves the site without errors

**Components**
- [ ] New or modified components render correctly
- [ ] Props are handled as expected
- [ ] Styling is correct at mobile (< 768px) and desktop widths
- [ ] Dark mode styling works (if applicable)
- [ ] No errors in the browser console

**Pages**
- [ ] Route loads via direct URL navigation
- [ ] Navigation to/from the page works
- [ ] Data loads (workshop lists, team profiles, etc.)
- [ ] Loading states display during data fetch
- [ ] 404 page displays for unknown routes

**Cross-browser**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Adding automated tests (future)

If you add Vitest to the main site, the recommended setup is:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Add `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

## Community forum

The community forum has a full testing setup with unit and end-to-end tests.

### Unit tests (Vitest)

```bash
cd community-forum

# Run all unit tests
npm test

# Run in watch mode
npx vitest

# Run a specific test file
npx vitest src/lib/auth/passkey.test.ts

# Run with coverage report
npx vitest run --coverage
```

Tests use `@vitest/coverage-v8` for coverage reporting.

### End-to-end tests (Playwright)

```bash
cd community-forum

# Run all E2E tests
npm run test:e2e

# Run with browser UI
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Debug mode (pauses on failure)
npm run test:e2e:debug

# Run for a specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Type checking

```bash
cd community-forum
npm run check          # svelte-check + TypeScript
npm run typecheck      # TypeScript only (tsc --noEmit)
```

### Full validation

```bash
cd community-forum
npm run validate       # lint + typecheck + test + docs validation
```

---

## Backend service testing

Backend services in `community-forum/services/` each have their own testing approach.

### auth-api

The auth-api is an Express application. Test it by running locally and verifying endpoints:

```bash
cd community-forum/services/auth-api
npm install
npm run dev

# In another terminal:
curl http://localhost:8080/health
# Expected: {"ok":true,"service":"auth-api"}
```

Key endpoints to verify:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/auth/register/options` | WebAuthn registration options |
| POST | `/auth/register/verify` | Verify registration |
| POST | `/auth/login/options` | WebAuthn login options |
| POST | `/auth/login/verify` | Verify login |

### Other services

| Service | Health check |
|---------|-------------|
| nostr-relay | `GET /health` |
| embedding-api | `GET /health` |
| image-api | `GET /health` |
| link-preview-api | `GET /health` |

---

## Writing tests for the community forum

### Unit test example

```typescript
// community-forum/src/lib/auth/__tests__/passkey.test.ts
import { describe, it, expect, vi } from "vitest";

describe("passkey", () => {
  it("derives a 32-byte key from PRF output via HKDF", async () => {
    const prfOutput = new Uint8Array(32).fill(0x42);
    const key = await deriveKey(prfOutput);

    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it("produces the same key for the same PRF input (deterministic)", async () => {
    const prfOutput = new Uint8Array(32).fill(0xab);
    const key1 = await deriveKey(prfOutput);
    const key2 = await deriveKey(prfOutput);

    expect(key1).toEqual(key2);
  });
});
```

### E2E test example

```typescript
// community-forum/tests/e2e/auth-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("displays login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("shows error for unsupported authenticator", async ({ page }) => {
    await page.goto("/");
    // Simulate cross-platform authenticator (blocked)
    await page.click("text=Sign in");
    await expect(page.locator("text=not supported")).toBeVisible();
  });
});
```

### Test conventions

- Place unit tests alongside source files or in a `__tests__/` directory.
- Place E2E tests in `community-forum/tests/`.
- Name test files with `.test.ts` (unit) or `.spec.ts` (E2E).
- Follow AAA pattern: Arrange, Act, Assert.
- Test behaviour, not implementation details.
- Mock external dependencies (NDK, fetch, WebAuthn API).

---

## Pre-commit verification

Before every commit across any part of the monorepo:

```bash
# Main site
npm run lint
npm run build

# Community forum (if changed)
cd community-forum
npm run validate
```

---

## CI/CD integration

The `deploy.yml` workflow runs `npm run build` for the main site on every push to `main`. The community forum build is included in the same workflow.

Individual service workflows (`auth-api.yml`, `jss.yml`, etc.) build and deploy their respective Cloud Run containers on push.

---

## Related documentation

- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) -- daily workflow
- [CODE_STYLE.md](./CODE_STYLE.md) -- coding standards
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) -- directory layout
