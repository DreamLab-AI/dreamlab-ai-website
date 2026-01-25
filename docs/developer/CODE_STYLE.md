# Code Style Guide

Coding standards and conventions for DreamLab AI.

## General Principles

### 1. Clarity Over Cleverness

```typescript
// ❌ Clever but unclear
const x = arr.reduce((a,b)=>a+b.p,0);

// ✅ Clear and readable
const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
```

### 2. Consistency

- Follow existing patterns in the codebase
- Use the same naming conventions
- Match the formatting style
- Keep similar things similar

### 3. Simplicity

- Write simple solutions first
- Refactor for performance only when needed
- Avoid premature optimization
- Don't add features before they're needed

## TypeScript

### Type Annotations

```typescript
// ✅ Always type function parameters
function calculateTotal(items: Item[], tax: number): number {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
}

// ✅ Type object properties
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// ✅ Prefer interfaces over types for objects
interface WorkshopProps {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

// ✅ Use types for unions and primitives
type Status = 'pending' | 'active' | 'completed';
type ID = string | number;
```

### Type Safety

```typescript
// ❌ Avoid 'any'
const data: any = fetchData();

// ✅ Use proper types
interface ApiResponse {
  data: Workshop[];
  status: number;
}
const response: ApiResponse = await fetchData();

// ❌ Don't use type assertions unnecessarily
const value = getValue() as string;

// ✅ Use type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(value)) {
  // TypeScript knows value is string here
}
```

### Null Safety

```typescript
// ✅ Use optional chaining
const name = user?.profile?.name;

// ✅ Use nullish coalescing
const displayName = name ?? 'Anonymous';

// ✅ Check for null/undefined explicitly
if (value !== null && value !== undefined) {
  // Use value
}
```

## React Components

### Component Structure

```typescript
// Standard component order:
// 1. Imports
// 2. Types/Interfaces
// 3. Component function
// 4. Hooks
// 5. Event handlers
// 6. Render helpers
// 7. Return JSX

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkshopCardProps {
  title: string;
  description: string;
  className?: string;
  onEnroll?: () => void;
}

export const WorkshopCard = ({
  title,
  description,
  className,
  onEnroll
}: WorkshopCardProps) => {
  // Hooks
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    // Effect logic
  }, []);

  // Event handlers
  const handleEnroll = () => {
    setIsEnrolled(true);
    onEnroll?.();
  };

  // Render helpers
  const renderStatus = () => {
    return isEnrolled ? 'Enrolled' : 'Available';
  };

  // JSX
  return (
    <div className={cn("workshop-card", className)}>
      <h3>{title}</h3>
      <p>{description}</p>
      <span>{renderStatus()}</span>
      <Button onClick={handleEnroll}>Enroll</Button>
    </div>
  );
};
```

### Naming Conventions

```typescript
// ✅ Components: PascalCase
export const WorkshopCard = () => {};

// ✅ Hooks: camelCase with 'use' prefix
export const useWorkshopFilter = () => {};

// ✅ Utilities: camelCase
export const formatDate = () => {};

// ✅ Constants: UPPER_SNAKE_CASE
export const MAX_WORKSHOPS = 100;

// ✅ Types/Interfaces: PascalCase
export interface WorkshopData {}
export type UserRole = 'admin' | 'user';

// ✅ Props interfaces: ComponentName + 'Props'
interface WorkshopCardProps {}
```

### Props Destructuring

```typescript
// ✅ Destructure props in function signature
export const Button = ({ children, onClick, disabled }: ButtonProps) => {
  return <button onClick={onClick} disabled={disabled}>{children}</button>;
};

// ❌ Don't use props object
export const Button = (props: ButtonProps) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

### Component Organization

```
src/components/
├── ui/                  # Radix UI components
│   ├── button.tsx
│   ├── card.tsx
│   └── dialog.tsx
├── features/            # Feature-specific components
│   ├── WorkshopCard.tsx
│   ├── WorkshopFilter.tsx
│   └── WorkshopList.tsx
└── layout/              # Layout components
    ├── Header.tsx
    ├── Footer.tsx
    └── Sidebar.tsx
```

## File Organization

### File Naming

```bash
# ✅ Components: PascalCase
WorkshopCard.tsx
UserProfile.tsx

# ✅ Utilities: kebab-case
date-utils.ts
string-helpers.ts

# ✅ Hooks: kebab-case
use-workshop-filter.ts
use-auth.ts

# ✅ Types: kebab-case
workshop-types.ts
user-types.ts
```

### File Location Rules

```bash
# ✅ CORRECT - Organized in subdirectories
src/components/features/WorkshopCard.tsx
src/lib/date-utils.ts
src/hooks/use-auth.ts
docs/developer/GUIDE.md
tests/unit/workshop.test.ts

# ❌ WRONG - Never save to root
./WorkshopCard.tsx
./utils.ts
./test.md
```

## Imports

### Import Order

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal components
import { Button } from '@/components/ui/button';
import { WorkshopCard } from '@/components/features/WorkshopCard';

// 3. Hooks
import { useWorkshopFilter } from '@/hooks/use-workshop-filter';

// 4. Utils and libraries
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';

// 5. Types
import type { Workshop, WorkshopLevel } from '@/types';

// 6. Styles (if any)
import './styles.css';
```

### Path Aliases

```typescript
// ✅ Use @ alias for src
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ❌ Don't use relative paths
import { Button } from '../../../components/ui/button';
```

## Styling

### Tailwind CSS Classes

```typescript
// ✅ Order: Layout -> Spacing -> Sizing -> Appearance -> Interaction
<div className="flex flex-col gap-4 w-full h-auto bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" />

// ✅ Use cn() for conditional classes
<div className={cn(
  "base-class",
  isActive && "active-class",
  error && "error-class",
  className
)} />

// ❌ Don't concatenate strings
<div className={"base-class" + (isActive ? " active-class" : "")} />
```

### Responsive Design

```typescript
// ✅ Mobile-first approach
<div className="
  text-sm md:text-base lg:text-lg
  p-4 md:p-6 lg:p-8
  grid-cols-1 md:grid-cols-2 lg:grid-cols-3
" />
```

### Dark Mode

```typescript
// ✅ Use dark: prefix
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
```

## Functions

### Function Length

```typescript
// ✅ Keep functions short and focused (< 50 lines)
const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ✅ Extract complex logic into helper functions
const processWorkshops = (workshops: Workshop[]) => {
  const filtered = filterByLevel(workshops);
  const sorted = sortByDate(filtered);
  return paginate(sorted);
};
```

### Arrow Functions vs Regular Functions

```typescript
// ✅ Use arrow functions for most cases
const calculateTotal = (items: Item[]) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ✅ Use regular functions for methods that need 'this'
class WorkshopManager {
  function calculateTotal(items: Item[]) {
    return this.applyDiscount(items);
  }
}

// ✅ Use arrow functions in components
export const MyComponent = () => {
  const handleClick = () => {
    console.log('Clicked');
  };

  return <button onClick={handleClick}>Click</button>;
};
```

### Function Parameters

```typescript
// ✅ Limit parameters (≤ 3)
const createWorkshop = (title: string, level: string, duration: number) => {};

// ✅ Use object for many parameters
interface CreateWorkshopParams {
  title: string;
  level: string;
  duration: number;
  description?: string;
  instructor?: string;
}

const createWorkshop = (params: CreateWorkshopParams) => {};
```

## Comments

### When to Comment

```typescript
// ✅ Explain WHY, not WHAT
// Calculate tax based on user's location (EU requires VAT)
const tax = calculateTax(location);

// ❌ Don't state the obvious
// Set the count to 0
const count = 0;

// ✅ Document complex algorithms
/**
 * Uses binary search to find workshop by ID.
 * Time complexity: O(log n)
 */
const findWorkshop = (id: string) => {};

// ✅ Mark temporary code
// TODO: Replace with API call once endpoint is ready
const mockData = [{ id: 1, name: 'Workshop' }];

// ✅ Explain workarounds
// HACK: Force re-render due to library bug
// See: https://github.com/library/issues/123
key={Math.random()}
```

### Documentation Comments

```typescript
/**
 * Filters workshops based on level and duration.
 *
 * @param workshops - Array of workshops to filter
 * @param level - Workshop difficulty level
 * @param maxDuration - Maximum duration in hours
 * @returns Filtered array of workshops
 *
 * @example
 * const filtered = filterWorkshops(workshops, 'beginner', 20);
 */
export const filterWorkshops = (
  workshops: Workshop[],
  level: string,
  maxDuration: number
): Workshop[] => {
  return workshops.filter(w =>
    w.level === level && w.duration <= maxDuration
  );
};
```

## Error Handling

### Graceful Error Handling

```typescript
// ✅ Always handle errors
try {
  const data = await fetchWorkshops();
  return data;
} catch (error) {
  console.error('Failed to fetch workshops:', error);
  return [];
}

// ✅ Provide user feedback
const [error, setError] = useState<string | null>(null);

try {
  await enrollInWorkshop(id);
} catch (err) {
  setError('Failed to enroll. Please try again.');
}

// ✅ Use error boundaries for React errors
<ErrorBoundary fallback={<ErrorMessage />}>
  <MyComponent />
</ErrorBoundary>
```

## Security

### Input Validation

```typescript
// ✅ Validate user input
const sanitizeInput = (input: string) => {
  return input.trim().replace(/[<>]/g, '');
};

// ✅ Validate on both client and server
if (!email.includes('@')) {
  throw new Error('Invalid email');
}
```

### Sensitive Data

```typescript
// ✅ Never log sensitive data
if (import.meta.env.DEV) {
  console.log('User logged in:', { id: user.id }); // OK
}

// ❌ Never log passwords, tokens, API keys
console.log('Password:', password); // NEVER DO THIS
```

### Environment Variables

```typescript
// ✅ Use environment variables for secrets
const apiKey = import.meta.env.VITE_API_KEY;

// ✅ Check if variables exist
if (!apiKey) {
  console.error('API key not configured');
  return;
}

// ❌ Never hardcode secrets
const apiKey = 'sk-1234567890'; // NEVER DO THIS
```

## Performance

### Optimization Guidelines

```typescript
// ✅ Memoize expensive computations
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);

// ✅ Memoize callbacks
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);

// ✅ Code split heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

// ❌ Don't optimize prematurely
// Profile first, then optimize hot paths
```

## Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing guidelines.

## Linting

### ESLint Configuration

Project uses ESLint with TypeScript support:

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Common Rules

- No unused variables
- No console.log in production
- Prefer const over let
- Use === instead of ==
- Require semicolons

## Git Commit Messages

### Conventional Commits

```bash
feat: add workshop enrollment feature
fix: resolve navigation state bug
docs: update API reference
style: format code with prettier
refactor: simplify workshop filter logic
perf: optimize image loading
test: add workshop card tests
chore: update dependencies
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:
```
feat(workshops): add advanced filtering options

- Add level filter dropdown
- Add duration slider
- Add search by title
- Update workshop list display

Closes #123
```

## Code Review Checklist

- [ ] Code follows style guide
- [ ] TypeScript types are correct
- [ ] No console.log statements
- [ ] Error handling is present
- [ ] Component is properly tested
- [ ] No hardcoded values
- [ ] Responsive design works
- [ ] Accessibility considered
- [ ] Performance optimized if needed
- [ ] Documentation updated

## Resources

- React: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Tailwind: https://tailwindcss.com
- ESLint: https://eslint.org

## Summary

1. **Clarity**: Write code others can understand
2. **Consistency**: Follow existing patterns
3. **Type Safety**: Use TypeScript properly
4. **Organization**: Put files in right places
5. **Testing**: Test your code
6. **Security**: Handle data safely
7. **Performance**: Optimize when needed
8. **Documentation**: Comment complex code
