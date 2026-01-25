# Development Workflow

Day-to-day development practices for DreamLab AI.

## Daily Development Cycle

### 1. Start Your Day

```bash
# Update local repository
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature

# Start dev server
npm run dev
```

### 2. Development Process

#### Making Changes

1. **Edit Files**: Use hot reload for instant feedback
2. **Check Browser**: Changes appear automatically
3. **Check Console**: Monitor for errors
4. **Test Features**: Verify functionality works

#### File Organization Rules

**CRITICAL**: Never save working files to root directory.

```bash
# ✅ CORRECT
src/components/NewFeature.tsx
src/lib/new-utility.ts
public/data/new-content.json
docs/new-guide.md

# ❌ WRONG
./NewFeature.tsx           # Don't save to root
./test-file.ts            # Don't save to root
./debug.md                # Don't save to root
```

### 3. Testing Changes

```bash
# Build production version
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Working with Components

### Adding New Components

Create in appropriate directory:

```typescript
// src/components/features/MyFeature.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MyFeatureProps {
  title: string;
  className?: string;
}

export const MyFeature = ({ title, className }: MyFeatureProps) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={cn("p-4", className)}>
      <h2>{title}</h2>
      <Button onClick={() => setIsActive(!isActive)}>
        Toggle
      </Button>
    </div>
  );
};
```

### Using Existing UI Components

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';

// Available UI components:
// - Accordion, Alert, Avatar
// - Badge, Breadcrumb, Button
// - Calendar, Card, Carousel, Chart
// - Checkbox, Command, Dialog
// - Dropdown, Input, Label
// - Popover, Progress, Scroll Area
// - Select, Separator, Slider
// - Switch, Tabs, Toast, Tooltip
```

## Working with Utilities

### Using Utils Library

```typescript
import { cn } from '@/lib/utils';

// Combine Tailwind classes
const classes = cn(
  "base-class",
  isActive && "active-class",
  error && "error-class"
);
```

### Supabase Integration

```typescript
import { supabase } from '@/lib/supabase';

// Check if Supabase is available
if (supabase) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*');
}
```

**Security Note**: Never log API keys or sensitive data:

```typescript
// ✅ CORRECT
if (import.meta.env.DEV) {
  console.log('Has API key:', !!apiKey);
}

// ❌ WRONG
console.log('API key:', apiKey);  // Never log actual values
```

## Git Workflow

### Branch Naming

```bash
feature/add-workshop-calendar   # New features
fix/navigation-bug              # Bug fixes
refactor/simplify-routing       # Refactoring
docs/api-reference              # Documentation
```

### Commit Messages

Follow conventional commits:

```bash
feat: add workshop calendar component
fix: resolve navigation state bug
refactor: simplify route configuration
docs: update API reference
style: format code with prettier
perf: optimize image loading
```

### Commit Frequency

- Commit logical units of work
- Small, focused commits
- Working code at each commit
- Clear, descriptive messages

### Example Workflow

```bash
# Start feature
git checkout -b feature/workshop-filter

# Make changes and commit
git add src/components/WorkshopFilter.tsx
git commit -m "feat: add workshop filter component"

# Continue development
git add src/pages/Workshops.tsx
git commit -m "feat: integrate filter into workshops page"

# Update from main
git checkout main
git pull origin main
git checkout feature/workshop-filter
git rebase main

# Push changes
git push origin feature/workshop-filter
```

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Type Checking

TypeScript checks happen automatically during:
- Development (Vite)
- Build (TypeScript compiler)
- Editor (VS Code)

### Pre-commit Checklist

- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Code follows style guide
- [ ] Components render correctly
- [ ] Build succeeds
- [ ] Commit message is clear

## Environment Variables

### Development

Create `.env` for local development:

```bash
VITE_SUPABASE_URL=your_dev_url
VITE_SUPABASE_ANON_KEY=your_dev_key
```

### Production

Production environment variables are set in deployment platform.

**Security Rules**:
- Never commit `.env` files
- Never log API keys
- Use `import.meta.env.DEV` for dev-only code
- Check for environment variables before using

## Hot Reload and Fast Refresh

Vite provides instant updates:

```typescript
// Changes to this file reflect immediately
export const MyComponent = () => {
  // Component state is preserved during updates
  const [count, setCount] = useState(0);

  return <div>Count: {count}</div>;
};
```

**What triggers full reload**:
- Changes to `vite.config.ts`
- Changes to environment variables
- Changes to `package.json`
- Import/export errors

## Build Process

### Development Build

```bash
# Build with development optimizations
npm run build:dev
```

### Production Build

```bash
# Run workshop list generator
node scripts/generate-workshop-list.mjs

# Build optimized production bundle
npm run build
```

Build creates:
- `dist/` - Production files
- Code splitting (vendor, three, ui chunks)
- Minified and optimized assets

## Debugging

### Browser DevTools

```typescript
// Use conditional logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### React DevTools

Install React DevTools extension:
- Inspect component tree
- Check props and state
- Profile performance

### Common Issues

**Problem**: Changes not appearing
```bash
# Solution: Hard refresh
Ctrl+Shift+R  (Linux/Windows)
Cmd+Shift+R   (Mac)
```

**Problem**: Type errors in editor
```bash
# Solution: Restart TypeScript server
VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

**Problem**: Module not found
```bash
# Solution: Reinstall dependencies
rm -rf node_modules
npm install
```

## Performance Optimization

### Code Splitting

Already configured in `vite.config.ts`:
- Vendor chunk (React, Router)
- Three.js chunk
- UI components chunk

### Image Optimization

```typescript
import { useOptimizedImages } from '@/hooks/use-optimized-images';

const { images } = useOptimizedImages(['/path/to/image.jpg']);
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

## Next Steps

- See [COMPONENT_DEVELOPMENT.md](./COMPONENT_DEVELOPMENT.md) for component patterns
- Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing strategies
- Read [DEBUGGING.md](./DEBUGGING.md) for troubleshooting
