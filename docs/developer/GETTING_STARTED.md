# Getting Started

Complete guide to setting up your development environment for DreamLab AI.

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: 2.x or higher
- **Code Editor**: VS Code recommended

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- React 18.3.1
- Vite 5.4.21
- TypeScript 5.5.3
- Tailwind CSS 3.4.11
- Radix UI components
- Three.js for 3D graphics

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
# Supabase Configuration (optional)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Note**: The app works without Supabase configuration. It's only needed for backend features.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure Overview

```
dreamlab-ai-website/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Radix UI components
│   │   └── ...           # Custom components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── pages/            # Route pages
│   └── App.tsx           # Main app component
├── public/
│   ├── data/             # Static data files
│   │   ├── workshops/    # Workshop content
│   │   └── team/         # Team member profiles
│   └── assets/           # Images, fonts
├── docs/                 # Documentation
├── scripts/              # Build scripts
└── package.json          # Dependencies
```

## Key Technologies

### Frontend Framework
- **React 18**: Component-based UI
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

### Styling
- **Tailwind CSS**: Utility-first CSS
- **Radix UI**: Accessible component primitives
- **tailwind-merge**: Class merging utility

### Routing
- **React Router**: Client-side routing with v6

### 3D Graphics
- **Three.js**: 3D rendering
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for R3F

## First Run Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed successfully
- [ ] Dev server starts without errors
- [ ] Browser opens to `localhost:5173`
- [ ] Homepage renders correctly
- [ ] Navigation works
- [ ] No console errors

## Common First-Time Issues

### Port Already in Use

If port 5173 is occupied:

```bash
# Use different port
npm run dev -- --port 3000
```

### Installation Errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Check Node.js version:

```bash
node --version  # Should be 18+
```

## Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit files in `src/`
   - Hot reload shows changes instantly

3. **Test Locally**
   ```bash
   npm run build
   npm run preview
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Next Steps

- Read [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for day-to-day development
- See [COMPONENT_DEVELOPMENT.md](./COMPONENT_DEVELOPMENT.md) to add components
- Check [CODE_STYLE.md](./CODE_STYLE.md) for coding standards

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Maintenance
npm install             # Install/update dependencies
npm run clean           # Clean build artifacts
```

## Getting Help

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Architecture**: See `/docs/architecture/SYSTEM_DESIGN.md`
- **API Reference**: `/docs/api/API_REFERENCE.md`
