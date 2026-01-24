# DreamLab AI Consulting Ltd

Premium AI training and consulting for operations leaders, founders, and technical teams. Building multi-agent systems and advanced AI implementations.

**Live Site**: [dreamlab-ai.com](https://dreamlab-ai.com)

## Overview

DreamLab AI provides hands-on AI training programs including:

- **2-Day Residential Masterclass** - Advanced multi-agent systems for up to 4 participants
- **1-Day Corporate Workshop** - Build a working AI agent at your location for up to 6 participants
- **Bespoke Consulting** - Custom AI implementation and strategy

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tooling |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Three.js | 3D visualizations |
| React Router | Navigation |
| Supabase | Backend services |

## Project Structure

```
src/
├── components/     # 19 reusable UI components
├── pages/          # 13 page components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
└── types/          # TypeScript definitions

public/
└── data/
    ├── team/       # 44 team member profiles
    └── showcase/   # Portfolio projects

docs/               # Architecture and design decisions
```

## Pages

| Page | Description |
|------|-------------|
| Index | Landing page with hero, services overview |
| Masterclass | 2-day residential AI training details |
| ResidentialTraining | Booking and curriculum information |
| WorkshopIndex | Corporate workshop overview |
| WorkshopPage | Individual workshop details |
| Team | 44+ specialists with selection for enquiry |
| Work | Previous projects showcase |
| Contact | Enquiry form |
| Privacy | GDPR-compliant privacy policy |
| SystemDesign | Technical architecture resources |
| ResearchPaper | AI research publications |
| Testimonials | Client feedback |

## Development

### Prerequisites

- Node.js 18+
- npm

### Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Content Management

### Team Profiles

Team members are stored in `/public/data/team/`:
- `manifest.json` - Member ordering
- `{id}.md` - Profile content (markdown)
- `{id}.webp` - Profile image (WebP preferred, PNG fallback)

### Portfolio

Previous work in `/public/data/showcase/manifest.json`. Edit via [Pages CMS](https://app.pagescms.org) for direct GitHub commits.

## Deployment

GitHub Actions automatically deploys to GitHub Pages on push to `main`:

1. Build triggered on `main` branch push
2. Static assets deployed to `gh-pages` branch
3. Custom domain configured via CNAME

Manual deployment available from the Actions tab.

## Documentation

| Document | Description |
|----------|-------------|
| [SITE-ARCHITECTURE.md](docs/SITE-ARCHITECTURE.md) | Component and routing architecture |
| [SECURITY.md](docs/SECURITY.md) | Security considerations |
| [PERFORMANCE_OPTIMIZATIONS.md](docs/PERFORMANCE_OPTIMIZATIONS.md) | Performance tuning |
| [SEO-AUDIT-REPORT.md](docs/SEO-AUDIT-REPORT.md) | SEO analysis |
| [DDD-design-decisions.md](docs/DDD-design-decisions.md) | Design decision records |

## License

Proprietary - DreamLab AI Consulting Ltd. All rights reserved.
