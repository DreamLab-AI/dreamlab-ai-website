# Contributing to DreamLab AI

Last updated: 2026-02-28

Guidelines for contributing to the DreamLab AI website and platform.

---

## Getting started

1. Read [docs/developer/GETTING_STARTED.md](./developer/GETTING_STARTED.md) to set up your development environment.
2. Read [docs/developer/CODE_STYLE.md](./developer/CODE_STYLE.md) to understand coding conventions.
3. Read [docs/developer/PROJECT_STRUCTURE.md](./developer/PROJECT_STRUCTURE.md) to understand the directory layout.

---

## Development setup

### Prerequisites

- Node.js 20+
- npm 10+
- Git 2+

### Install and run

```bash
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website
npm install
npm run dev
```

The development server starts at `http://localhost:5173`.

---

## Making contributions

### 1. Create a branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

Branch naming conventions:

| Prefix | Purpose |
|--------|---------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring |
| `docs/` | Documentation changes |
| `chore/` | Maintenance, dependency updates |

### 2. Make your changes

- Follow the [Code Style Guide](./developer/CODE_STYLE.md).
- Keep changes focused. One logical change per branch.
- Run the linter and build before committing.

### 3. Verify your changes

```bash
# Lint
npm run lint

# Build
npm run build

# Preview production build
npm run preview
```

For community forum changes:

```bash
cd community-forum
npm run validate
```

### 4. Commit

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git add src/components/NewFeature.tsx
git commit -m "feat: add new feature component"
```

Commit types:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no logic change) |
| `refactor` | Code restructuring (no behaviour change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance |

### 5. Push and open a pull request

```bash
git push -u origin feature/your-feature-name
```

Open a pull request on GitHub, or use the `gh` CLI:

```bash
gh pr create --title "feat: add new feature" --body "Description of what this change does and why."
```

---

## Pull request process

### Before submitting

- [ ] Branch is up to date with `main`
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Changes render correctly in the browser
- [ ] No console errors
- [ ] Responsive design works (mobile and desktop)

### PR description

Include:

- **What** the change does
- **Why** the change is needed
- **How** to test it (manual steps or test commands)
- Screenshots for visual changes

### Review

All pull requests require at least one approval before merging. Reviewers will check:

- [ ] Code follows the [Code Style Guide](./developer/CODE_STYLE.md)
- [ ] TypeScript types are correct and meaningful
- [ ] No `console.log` in production code
- [ ] Error handling is present for async operations
- [ ] No hardcoded secrets or credentials
- [ ] Responsive design works
- [ ] Accessibility: keyboard navigation, ARIA attributes
- [ ] Build succeeds
- [ ] Changes are appropriately scoped

### Merging

After approval, the PR author merges. Use "Squash and merge" for feature branches to keep the commit history clean.

---

## Code review standards

### What we look for

1. **Correctness** -- does the code do what it claims?
2. **Clarity** -- can another developer understand this without extra context?
3. **Consistency** -- does it follow existing patterns in the codebase?
4. **Security** -- are inputs validated? Are secrets handled safely?
5. **Performance** -- are there obvious inefficiencies?

### Giving feedback

- Be specific. Point to the line and explain the concern.
- Suggest alternatives when requesting changes.
- Distinguish between blocking issues and suggestions.

### Receiving feedback

- Respond to all comments.
- Ask for clarification if feedback is unclear.
- Make requested changes or explain why you disagree.

---

## File organisation

| Content type | Location |
|-------------|----------|
| Page components | `src/pages/` |
| Reusable components | `src/components/` |
| UI primitives (shadcn/ui) | `src/components/ui/` |
| Custom hooks | `src/hooks/` |
| Utilities | `src/lib/` |
| Static data | `src/data/` |
| Runtime content (markdown) | `public/data/` |
| Build scripts | `scripts/` |
| Documentation | `docs/` |
| Tests (forum) | `community-forum/tests/` |

Never save files to the project root directory. Use the appropriate subdirectory.

---

## Documentation contributions

Documentation uses UK English spelling (behaviour, colour, organise, centre).

When contributing documentation:

1. Place files in the appropriate `docs/` subdirectory.
2. Use kebab-case file names (`my-guide.md`).
3. Include a "Last updated" date.
4. Link to related documentation at the end of each file.
5. Test all code examples.

---

## Reporting issues

Open an issue on [GitHub](https://github.com/DreamLab-AI/dreamlab-ai-website/issues) with:

- A clear title
- Steps to reproduce (for bugs)
- Expected vs actual behaviour
- Browser and OS information (for UI issues)
- Screenshots (for visual issues)

---

## Security

If you discover a security vulnerability, **do not open a public issue**. Contact the maintainers privately via the repository's security advisory feature.

Never commit:

- API keys or secrets
- `.env` files
- Credentials or passwords
- Private keys

---

## Related documentation

- [docs/developer/GETTING_STARTED.md](./developer/GETTING_STARTED.md) -- environment setup
- [docs/developer/DEVELOPMENT_WORKFLOW.md](./developer/DEVELOPMENT_WORKFLOW.md) -- daily workflow
- [docs/developer/CODE_STYLE.md](./developer/CODE_STYLE.md) -- coding standards
- [docs/developer/TESTING_GUIDE.md](./developer/TESTING_GUIDE.md) -- testing practices
- [docs/developer/PROJECT_STRUCTURE.md](./developer/PROJECT_STRUCTURE.md) -- directory layout
- [docs/reference/tech-stack.md](./reference/tech-stack.md) -- technology reference
