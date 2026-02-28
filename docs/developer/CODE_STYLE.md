# Code Style Guide

Last updated: 2026-02-28

Coding standards and conventions for the DreamLab AI codebase.

---

## General principles

1. **Clarity over cleverness** -- write code that reads well. Favour explicit names and straightforward logic over terse one-liners.
2. **Consistency** -- follow the patterns already established in the codebase. When in doubt, match the style of surrounding code.
3. **Simplicity** -- solve the problem at hand. Do not add abstractions or features before they are needed.

---

## TypeScript conventions

### Configuration

The project uses relaxed TypeScript settings (defined in `tsconfig.json`):

- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`
- Target: ES2020
- JSX: react-jsx

Despite the relaxed compiler settings, aim for type safety in new code.

### Type annotations

```typescript
// Type function parameters and return values
function calculateTotal(items: Item[], taxRate: number): number {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// Use interfaces for object shapes
interface WorkshopProps {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
}

// Use type aliases for unions and primitives
type Status = "pending" | "active" | "completed";
type ID = string | number;
```

### Prefer interfaces for objects, types for unions

```typescript
// Object shapes -- use interface
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

// Unions and computed types -- use type
type UserRole = "admin" | "user";
type Nullable<T> = T | null;
```

### Null safety

```typescript
// Optional chaining
const name = user?.profile?.name;

// Nullish coalescing
const displayName = name ?? "Anonymous";
```

### Avoid `any`

```typescript
// Avoid
const data: any = fetchData();

// Prefer
interface ApiResponse {
  data: Workshop[];
  status: number;
}
const response: ApiResponse = await fetchData();
```

---

## React component patterns

### Component structure

Follow this order within a component file:

1. Imports
2. Types/interfaces
3. Component function
4. Hooks
5. Event handlers
6. Render helpers
7. Return JSX

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkshopCardProps {
  title: string;
  description: string;
  className?: string;
  onEnrol?: () => void;
}

export const WorkshopCard = ({
  title,
  description,
  className,
  onEnrol,
}: WorkshopCardProps) => {
  // 1. Hooks
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    // Effect logic
  }, []);

  // 2. Event handlers
  const handleEnrol = () => {
    setIsEnrolled(true);
    onEnrol?.();
  };

  // 3. Render helpers (optional)
  const renderStatus = () => {
    return isEnrolled ? "Enrolled" : "Available";
  };

  // 4. JSX
  return (
    <div className={cn("workshop-card", className)}>
      <h3>{title}</h3>
      <p>{description}</p>
      <span>{renderStatus()}</span>
      <Button onClick={handleEnrol}>Enrol</Button>
    </div>
  );
};
```

### Export style

- **Pages**: use `export default` (required for `React.lazy()`).
- **Components, hooks, utilities**: use named exports.

### Props

- Destructure props in the function signature.
- Always accept an optional `className` prop on presentational components.
- Suffix props interfaces with `Props`: `WorkshopCardProps`.

```typescript
// Preferred
export const Button = ({ children, onClick, disabled }: ButtonProps) => {
  return <button onClick={onClick} disabled={disabled}>{children}</button>;
};

// Avoid
export const Button = (props: ButtonProps) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

### shadcn/ui and Radix UI

The `src/components/ui/` directory contains shadcn/ui primitives built on Radix UI. These components follow a consistent pattern:

- Radix UI provides the accessible, unstyled primitive.
- `class-variance-authority` (CVA) defines visual variants.
- `cn()` merges Tailwind classes with consumer overrides.

Example (simplified `button.tsx` pattern):

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

Do not modify existing `ui/` components without good reason. Compose them via props and `className` instead.

---

## Tailwind CSS patterns

### Class ordering

Follow this general order: layout, spacing, sizing, appearance, interaction.

```typescript
<div className="flex flex-col gap-4 w-full h-auto bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" />
```

### Conditional classes with `cn()`

Always use `cn()` (from `@/lib/utils`) for conditional classes. Never concatenate strings.

```typescript
// Correct
<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-primary text-primary-foreground",
  hasError && "border-destructive",
  className
)} />

// Avoid
<div className={"p-4 rounded-lg" + (isActive ? " bg-primary" : "")} />
```

### Responsive design

Use mobile-first breakpoints:

```typescript
<div className="text-sm md:text-base lg:text-lg p-4 md:p-6 lg:p-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
```

### Dark mode

The project uses class-based dark mode (`darkMode: ["class"]` in `tailwind.config.ts`). Use the `dark:` prefix:

```typescript
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
```

### Colour system

Colours are defined as HSL CSS variables in `index.css` and referenced via the Tailwind theme. Use semantic names:

```typescript
// Use semantic colour names
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground" />
<div className="bg-muted text-muted-foreground" />
<div className="border-border" />

// Avoid raw colour values in components
<div className="bg-slate-900" />  // only for one-off cases
```

---

## File naming conventions

| Type | Convention | Examples |
|------|-----------|----------|
| React components | PascalCase `.tsx` | `WorkshopCard.tsx`, `Header.tsx` |
| Pages | PascalCase `.tsx` | `Index.tsx`, `WorkshopPage.tsx` |
| Hooks | camelCase with `use-` prefix `.ts`/`.tsx` | `use-mobile.tsx`, `use-toast.ts` |
| Utilities | kebab-case `.ts` | `image-utils.ts`, `og-meta.ts` |
| UI primitives | kebab-case `.tsx` | `button.tsx`, `scroll-area.tsx` |
| Type definitions | kebab-case `.ts` | `workshop-types.ts` |
| Data files | kebab-case `.json` | `workshop-list.json`, `skills.json` |

---

## Import ordering

Group imports in this order, separated by blank lines:

```typescript
// 1. React and external libraries
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

// 2. Internal components
import { Button } from "@/components/ui/button";
import { WorkshopCard } from "@/components/WorkshopCard";

// 3. Hooks
import { useMobile } from "@/hooks/use-mobile";

// 4. Utilities and libraries
import { cn } from "@/lib/utils";

// 5. Types (use `import type` where possible)
import type { Workshop } from "@/types";

// 6. Data
import workshopList from "@/data/workshop-list.json";
```

### Path aliases

Always use the `@/` alias for imports from `src/`. Never use deep relative paths.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Avoid
import { Button } from "../../../components/ui/button";
```

---

## Functions

### Length

Keep functions short and focused. Aim for under 50 lines. Extract complex logic into helper functions.

### Arrow functions

Use arrow functions for components, event handlers, and most utility functions:

```typescript
export const WorkshopCard = ({ title }: WorkshopCardProps) => { ... };

const handleClick = () => { ... };

const calculateTotal = (items: Item[]) => { ... };
```

### Parameters

Limit positional parameters to three. Use an options object for functions with more:

```typescript
// Up to 3 parameters -- positional is fine
const createWorkshop = (title: string, level: string, duration: number) => {};

// More than 3 -- use an object
interface CreateWorkshopParams {
  title: string;
  level: string;
  duration: number;
  description?: string;
  instructor?: string;
}

const createWorkshop = (params: CreateWorkshopParams) => {};
```

---

## Comments

### When to comment

Comment the **why**, not the **what**:

```typescript
// Calculate tax based on user's location (EU requires VAT)
const tax = calculateTax(location);
```

Do not state the obvious:

```typescript
// Avoid -- adds no information
// Set the count to 0
const count = 0;
```

### JSDoc

Use JSDoc for exported functions with non-obvious behaviour:

```typescript
/**
 * Filters workshops by level and maximum duration.
 *
 * @param workshops - Array of workshops to filter
 * @param level - Difficulty level to match
 * @param maxDuration - Maximum duration in hours
 * @returns Filtered array of workshops
 */
export const filterWorkshops = (
  workshops: Workshop[],
  level: string,
  maxDuration: number
): Workshop[] => {
  return workshops.filter((w) => w.level === level && w.duration <= maxDuration);
};
```

### Markers

```typescript
// TODO: Replace with API call once endpoint is ready
// HACK: Force re-render due to library bug (see https://github.com/library/issues/123)
```

---

## Error handling

### Components

Use the `ErrorBoundary` component to catch rendering errors:

```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <RiskyComponent />
</ErrorBoundary>
```

### Async operations

Always handle errors in async code. Provide user-facing feedback:

```typescript
try {
  const data = await fetchWorkshops();
  return data;
} catch (error) {
  console.error("Failed to fetch workshops:", error);
  return [];
}
```

### Form validation

Use Zod schemas with React Hook Form for form validation:

```typescript
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});
```

---

## Security

### Environment variables

```typescript
// Access via import.meta.env
const apiUrl = import.meta.env.VITE_SUPABASE_URL;

// Check existence before use
if (!apiUrl) {
  console.error("Supabase URL not configured");
  return;
}
```

### Sensitive data

- Never hardcode secrets, API keys, or credentials in source files.
- Never log sensitive values. Log only their presence:

```typescript
if (import.meta.env.DEV) {
  console.log("Has API key:", !!apiKey);
}
```

### HTML sanitisation

Use DOMPurify for any user-provided or markdown-rendered HTML:

```typescript
import DOMPurify from "dompurify";

const sanitised = DOMPurify.sanitize(rawHtml);
```

---

## Performance guidelines

### Code splitting

All route pages are lazy-loaded via `React.lazy()`. This is already configured in `App.tsx`. Follow the same pattern for any heavy component:

```typescript
const HeavyChart = lazy(() => import("./HeavyChart"));

<Suspense fallback={<div>Loading...</div>}>
  <HeavyChart />
</Suspense>
```

### Memoisation

Use `useMemo` and `useCallback` for expensive computations and stable callback references, but only when profiling shows a measurable benefit:

```typescript
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```

### Image optimisation

Use the `useOptimizedImages` hook for lazy loading and srcset generation:

```typescript
import { useOptimizedImages } from "@/hooks/use-optimized-images";
```

---

## Commit messages

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

Examples:

```
feat(workshops): add advanced filtering by level and duration
fix(auth): handle missing PRF extension gracefully
docs: update developer getting started guide
refactor: extract workshop filter into custom hook
```

---

## Code review checklist

- [ ] Code follows the patterns described in this guide
- [ ] TypeScript types are correct and meaningful
- [ ] No `console.log` statements in production code
- [ ] Error handling is present for async operations
- [ ] No hardcoded values that should be configuration
- [ ] Responsive design works at mobile and desktop widths
- [ ] Accessibility: keyboard navigation, ARIA attributes where needed
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

---

## Related documentation

- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) -- daily workflow
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) -- testing practices
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) -- directory layout
