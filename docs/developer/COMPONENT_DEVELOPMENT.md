# Component Development

Guide to creating components in DreamLab AI following established patterns.

## Component Architecture

### Component Types

1. **UI Components** (`src/components/ui/`): Radix UI primitives
2. **Feature Components** (`src/components/`): Business logic components
3. **Page Components** (`src/pages/`): Route-level components
4. **Layout Components**: Structural components

## Creating New Components

### Basic Component Template

```typescript
// src/components/features/WorkshopCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkshopCardProps {
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  className?: string;
  onEnroll?: () => void;
}

export const WorkshopCard = ({
  title,
  description,
  duration,
  level,
  className,
  onEnroll
}: WorkshopCardProps) => {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="text-sm text-muted-foreground">
          {duration} · {level}
        </span>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{description}</p>
        {onEnroll && (
          <Button onClick={onEnroll}>Enroll Now</Button>
        )}
      </CardContent>
    </Card>
  );
};
```

### Component Checklist

- [ ] TypeScript interface for props
- [ ] Clear prop names and types
- [ ] Optional `className` prop
- [ ] Use `cn()` for class merging
- [ ] Proper event handlers
- [ ] Accessible markup
- [ ] Responsive design

## Using UI Components

### Available UI Components

All components are from Radix UI with custom styling:

```typescript
// Import pattern
import { ComponentName } from '@/components/ui/component-name';

// Available components
import { Accordion } from '@/components/ui/accordion';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Carousel } from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
```

### Button Component Examples

```typescript
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Icon />
</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading</Button>
```

### Dialog Component Example

```typescript
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const ConfirmDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to proceed?</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Card Component Example

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export const InfoCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Main content goes here</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  );
};
```

## State Management

### Local State (useState)

```typescript
import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  );
};
```

### Side Effects (useEffect)

```typescript
import { useEffect, useState } from 'react';

export const DataFetcher = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []); // Empty deps = run once on mount

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
};
```

### Ref Forwarding

```typescript
import { forwardRef } from 'react';

interface InputProps {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

## Custom Hooks

### Creating Custom Hooks

```typescript
// src/hooks/use-workshop-filter.ts
import { useState, useMemo } from 'react';

interface Workshop {
  id: string;
  title: string;
  level: string;
  duration: number;
}

export const useWorkshopFilter = (workshops: Workshop[]) => {
  const [level, setLevel] = useState<string>('all');
  const [maxDuration, setMaxDuration] = useState<number>(Infinity);

  const filtered = useMemo(() => {
    return workshops.filter(workshop => {
      const levelMatch = level === 'all' || workshop.level === level;
      const durationMatch = workshop.duration <= maxDuration;
      return levelMatch && durationMatch;
    });
  }, [workshops, level, maxDuration]);

  return {
    filtered,
    level,
    setLevel,
    maxDuration,
    setMaxDuration
  };
};
```

### Using Custom Hooks

```typescript
import { useWorkshopFilter } from '@/hooks/use-workshop-filter';

export const WorkshopList = ({ workshops }) => {
  const { filtered, level, setLevel } = useWorkshopFilter(workshops);

  return (
    <div>
      <Select value={level} onValueChange={setLevel}>
        <option value="all">All Levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </Select>

      {filtered.map(workshop => (
        <WorkshopCard key={workshop.id} {...workshop} />
      ))}
    </div>
  );
};
```

## Styling Components

### Using Tailwind CSS

```typescript
export const StyledComponent = () => {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Title</h2>
      <p className="text-gray-600 dark:text-gray-300">
        Content text
      </p>
    </div>
  );
};
```

### Conditional Classes with cn()

```typescript
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const CustomButton = ({ variant, disabled, className }: ButtonProps) => {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md transition-colors",
        variant === 'primary' && "bg-blue-500 text-white hover:bg-blue-600",
        variant === 'secondary' && "bg-gray-200 text-gray-900 hover:bg-gray-300",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
    >
      Click Me
    </button>
  );
};
```

### Responsive Design

```typescript
export const ResponsiveGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols</Card>
    </div>
  );
};
```

## Forms and Validation

### Basic Form

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ContactForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    console.log({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        {errors.name && <span className="text-red-500">{errors.name}</span>}
      </div>

      <div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        {errors.email && <span className="text-red-500">{errors.email}</span>}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
};
```

## Accessibility

### ARIA Labels

```typescript
export const AccessibleButton = () => {
  return (
    <button
      aria-label="Close dialog"
      aria-describedby="dialog-description"
    >
      <Icon />
    </button>
  );
};
```

### Keyboard Navigation

```typescript
export const KeyboardNav = () => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Handle action
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      Keyboard accessible div
    </div>
  );
};
```

### Focus Management

```typescript
import { useRef, useEffect } from 'react';

export const AutoFocus = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
};
```

## Performance Optimization

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize component
export const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Expensive render */}</div>;
});

// Memoize computed values
export const Calculator = ({ items }) => {
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);

  return <div>Total: ${total}</div>;
};

// Memoize callbacks
export const Parent = () => {
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return <Child onClick={handleClick} />;
};
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
};
```

## Testing Components

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing strategies.

## Next Steps

- Read [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing patterns
- Check [CODE_STYLE.md](./CODE_STYLE.md) for style conventions
- See [DEBUGGING.md](./DEBUGGING.md) for debugging techniques
