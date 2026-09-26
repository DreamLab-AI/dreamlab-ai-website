# 3.b: Project Configuration — CLAUDE.md and AGENTS.MD

Both Claude Code and OpenAI Codex CLI support project-specific configuration files that provide persistent instructions to the AI agent. These files encode "tribal knowledge" — coding conventions, testing procedures, architectural decisions, and forbidden actions — into a machine-readable format that the agent consults on every task.

This is one of the most impactful things you can do to improve agent output quality. A well-crafted configuration file eliminates the need to repeat project context in every prompt.

## CLAUDE.md — Claude Code's Project Configuration

Claude Code reads `CLAUDE.md` files at startup and uses their contents to guide behaviour throughout the session. This is Claude Code's most distinctive feature: a persistent, hierarchical project configuration system.

### Hierarchy and Merging

Claude Code looks for CLAUDE.md files in a specific order and merges their contents, with more specific files taking precedence:

1.  **`~/.claude/CLAUDE.md`** — Personal, global guidance applicable across all projects
2.  **`CLAUDE.md` at the repository root** — Shared project-wide standards (commit this to Git)
3.  **`CLAUDE.md` in subdirectories** — Specific instructions for particular components

This cascading system lets you set organisation-wide defaults, project standards, and component-specific overrides.

### What to Include in CLAUDE.md

**Project Identity and Tech Stack:**
```markdown
# My Project

## Tech Stack
- Framework: React 18 + TypeScript 5.9
- Build: Vite 5
- Testing: Vitest + Testing Library
- Styling: Tailwind CSS 3 + shadcn/ui
- Backend: Node.js + Express + PostgreSQL
```

**Build and Test Commands:**
```markdown
## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run test` — Run unit tests
- `npm run lint` — ESLint checks
- Always run `npm run build && npm run lint` before committing
```

**Coding Conventions:**
```markdown
## Conventions
- Use functional components with hooks (no class components)
- Prefer named exports over default exports
- Use Zod schemas for all input validation
- All public functions must have JSDoc comments
- Error handling: never swallow errors silently
```

**Forbidden Actions:**
```markdown
## Forbidden
- Do not modify files in src/generated/ (these are auto-generated)
- Do not add new npm dependencies without asking first
- Never disable ESLint rules with eslint-disable comments
- Do not commit directly to main — always use feature branches
- Never hardcode API keys, secrets, or credentials
```

**Architecture Notes:**
```markdown
## Architecture
- src/lib/ contains shared utilities — prefer extending these over creating new ones
- The auth middleware in src/middleware/auth.ts must not be modified without review
- Database migrations live in db/migrations/ — use sequential numbering
- API routes follow REST conventions: /api/v1/{resource}
```

### CLAUDE.md vs README

CLAUDE.md is specifically for the AI agent, not human readers. Key differences:

| CLAUDE.md | README.md |
|-----------|-----------|
| Instructions for the AI agent | Documentation for human developers |
| Coding conventions and constraints | Project description and setup guide |
| Build/test commands to execute | How to get started |
| Forbidden actions | Feature overview |
| Architecture decisions | Contributing guidelines |

There is deliberate overlap (both might mention the tech stack), but CLAUDE.md focuses on operational instructions: what to do, what not to do, and how to verify work.

### Real-World CLAUDE.md Example

```markdown
# E-Commerce API

## Stack
TypeScript 5.9, Express 4, PostgreSQL 16, Drizzle ORM, Vitest

## Commands
- `npm test` — Run all tests
- `npm run test:unit` — Unit tests only
- `npm run lint` — ESLint + Prettier check
- `npm run db:migrate` — Run pending migrations
- Run `npm test && npm run lint` before every commit

## Conventions
- All endpoints return { data, error, meta } response envelope
- Use Zod schemas for request validation (see src/schemas/)
- Database queries go in src/repositories/, not in route handlers
- Errors use the AppError class from src/lib/errors.ts
- Logging via the logger instance from src/lib/logger.ts

## Testing
- Unit tests live alongside source: src/foo/__tests__/foo.test.ts
- Integration tests in tests/integration/
- Mock external services using msw (see tests/mocks/)
- Database tests use the test database (see .env.test)

## Forbidden
- Never use raw SQL — always use Drizzle ORM
- Do not add express middleware to app.ts — use the middleware/ directory
- Do not modify the migration runner in db/migrate.ts
- Never store passwords in plain text — use bcrypt
- Do not import from src/internal/ outside of that directory

## Current Focus
- We are migrating from Sequelize to Drizzle ORM
- Files in src/models/ are legacy Sequelize — do not extend them
- New code should use src/repositories/ with Drizzle
```

## AGENTS.MD — Codex CLI's Project Configuration

The OpenAI Codex CLI reads `AGENTS.MD` files for project-specific instructions. The concept is similar to CLAUDE.md but with some differences in convention and hierarchy.

### Hierarchy

1.  **`~/.codex/AGENTS.MD`** (or `~/.codex/instructions.md`) — Personal, global guidance
2.  **`AGENTS.MD` at the repository root** — Project-wide standards
3.  **`AGENTS.MD` in subdirectories** — Component-specific instructions

### AGENTS.MD Example

```markdown
# AGENTS.MD - Project Guidance

## Code Style
- Use Prettier for formatting: `npx prettier --write .`
- Variable names in camelCase
- JSDoc comments for all public functions

## Testing
- All new features must include unit tests using Jest
- Run `npm test` before proposing changes
- Ensure test coverage does not decrease
- Mock external API calls using msw

## PR Instructions
- PR titles: `<type>(<scope>): <subject>` (e.g., `feat(api): Add user endpoint`)
- PR body must include: summary, how to test, related issue numbers

## Forbidden Actions
- Do not commit to main or develop branches
- Do not introduce new dependencies without approval
- Never disable linting or type-checking rules
- Do not write to src/generated/ by hand
```

### Why Separate Files? Why Not README?

Both CLAUDE.md and AGENTS.MD exist because AI agents need different information than human developers. A human reading a README wants to understand what the project does and how to set it up. An AI agent needs to know what conventions to follow, what commands to run, and what actions are forbidden.

The non-branded name "AGENTS.MD" was chosen by OpenAI to be tool-agnostic — any AI coding tool can read it. Claude Code's "CLAUDE.md" is specific to Claude Code but offers deeper integration (hierarchical merging, hooks, etc.).

## Cross-Tool Compatibility

If your team uses both Claude Code and Codex CLI (or expects different team members to use different tools), you can maintain both files:

```
project-root/
  CLAUDE.md      # Claude Code reads this
  AGENTS.MD      # Codex CLI reads this
  README.md      # Humans read this
```

Alternatively, keep a single source of truth and symlink:

```bash
# Write your conventions in CLAUDE.md, symlink for Codex CLI
ln -s CLAUDE.md AGENTS.MD
```

## Best Practices for Configuration Files

1.  **Start simple:** A few lines about your tech stack and test commands is enough to start. Add more as you discover what the agent gets wrong.
2.  **Be explicit about commands:** Do not assume the agent knows how to run your tests. Spell out the exact command.
3.  **List forbidden actions:** Agents will try to be helpful, which sometimes means doing things you do not want. Explicit "do not" instructions prevent this.
4.  **Update iteratively:** When the agent makes a mistake that better instructions would have prevented, add that instruction to your configuration file.
5.  **Commit to version control:** These files are part of your project. Commit them so the whole team benefits.
6.  **Keep it focused:** Do not turn the file into a novel. A concise, well-organised file is more effective than a verbose one.

---

Next: [3.c: Managing Tasks Efficiently](./03_c_managing_tasks_efficiently.md)
