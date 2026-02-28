---
title: "Workshop Content System"
description: "Markdown-based workshop content system with auto-generated metadata and lazy-loaded routes"
category: reference
tags: ['workshops', 'content', 'markdown', 'developer']
difficulty: beginner
last-updated: 2026-02-28
---

# Workshop Content System

DreamLab AI hosts 15 workshops covering AI tools, development workflows, and knowledge work. Workshop content is stored as Markdown files in `public/data/workshops/` and served at runtime through lazy-loaded React routes.

## Content Structure

```
public/data/workshops/
  ai-powered-knowledge-work-index.md    -- standalone overview page
  module-summary.txt                    -- module reference
  vscode-learning-pathway/              -- multi-page workshop
  workshop-00-infra/
  workshop-01-morning-vscode-setup/
  workshop-01-afternoon-visual-version-control/
  workshop-02-morning-ai-api-access/
  workshop-02-afternoon-vibe-coding/
  workshop-03-morning-local-ai/
  workshop-03-afternoon-rag-system/
  workshop-04-morning-ai-agents/
  workshop-04-afternoon-orchestration/
  workshop-05-morning-qa-automation/
  workshop-05-afternoon-publishing/
  workshop-06-codex/
```

Each workshop directory contains one or more Markdown files. The directory name serves as the workshop ID and determines the URL path.

## Auto-Generated Workshop List

The build script `scripts/generate-workshop-list.mjs` scans `public/data/workshops/` before every dev server start and production build to produce `src/data/workshop-list.json`.

### How It Works

1. Reads all directories under `public/data/workshops/`
2. For each directory, generates a formatted display name from the directory name (strips `workshop-` prefix, replaces hyphens with spaces, capitalises words)
3. Scans Markdown files within each directory and extracts the first H1 heading as the page title
4. Produces a `manifest.json` inside each workshop directory listing its pages
5. Writes the master workshop list to `src/data/workshop-list.json`

### Build Integration

The script runs automatically via npm scripts:

```json
{
  "dev": "node scripts/generate-workshop-list.mjs && vite",
  "build": "node scripts/generate-workshop-list.mjs && tsc && vite build"
}
```

## Route Structure

Three lazy-loaded routes handle workshop pages:

| Route | Component | Description |
|-------|-----------|-------------|
| `/workshops` | `WorkshopIndex.tsx` | Workshop catalogue -- lists all workshops from `workshop-list.json` |
| `/workshops/:workshopId` | `WorkshopPage.tsx` | Workshop landing -- loads the first page or index of the workshop |
| `/workshops/:workshopId/:pageSlug` | `WorkshopPage.tsx` | Workshop sub-page -- loads a specific Markdown page within the workshop |

### URL Examples

```
/workshops                                        -- catalogue
/workshops/workshop-01-morning-vscode-setup       -- workshop landing
/workshops/workshop-01-morning-vscode-setup/intro  -- specific page
```

## Components

### WorkshopIndex

Renders the full workshop catalogue using data from `src/data/workshop-list.json`. Each workshop is displayed as a `WorkshopCard` component with the formatted name and link.

### WorkshopPage

Loads a workshop's `manifest.json` at runtime to determine available pages, then fetches and renders the requested Markdown file. Includes a `WorkshopHeader` for navigation between pages within the same workshop.

### WorkshopCard

A card component displaying workshop metadata (name, path) with a link to the workshop landing page.

### WorkshopHeader

Navigation component shown on workshop pages. Displays the workshop title and provides links to sibling pages within the same workshop.

## Adding a New Workshop

1. Create a new directory under `public/data/workshops/` with a descriptive kebab-case name (e.g., `workshop-07-morning-deployment`)
2. Add one or more Markdown files with content. The first H1 heading in each file becomes the page title.
3. Run `npm run dev` or `npm run build` -- the script will auto-detect the new directory and regenerate `workshop-list.json` and the per-workshop `manifest.json`
4. The new workshop will appear automatically in the catalogue at `/workshops`

No code changes are required to add workshops.

## Related Documentation

- [3D Visualisations](./3d-visualisations.md) -- visual components used alongside workshop content
