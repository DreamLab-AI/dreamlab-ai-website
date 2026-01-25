# Debugging Guide

Common issues and solutions for DreamLab AI development.

## Quick Diagnostic Commands

```bash
# Check Node version
node --version        # Should be 18+

# Check npm version
npm --version         # Should be 9+

# Check Git status
git status

# Verify dependencies
npm list --depth=0

# Check for outdated packages
npm outdated

# Verify build
npm run build
```

## Common Issues

### Development Server Won't Start

#### Problem: Port Already in Use

```bash
Error: Port 5173 is already in use
```

**Solution 1**: Use different port
```bash
npm run dev -- --port 3000
```

**Solution 2**: Kill process using port
```bash
# Linux/Mac
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

#### Problem: Module Not Found

```bash
Error: Cannot find module '@/components/ui/button'
```

**Solution**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Problem: TypeScript Errors

```bash
Error: Type 'string' is not assignable to type 'number'
```

**Solution 1**: Check types in your code
```typescript
// Wrong
const age: number = "25";

// Correct
const age: number = 25;
```

**Solution 2**: Restart TypeScript server (VS Code)
```
Cmd/Ctrl + Shift + P > TypeScript: Restart TS Server
```

### Build Failures

#### Problem: Build Out of Memory

```bash
Error: JavaScript heap out of memory
```

**Solution**: Increase Node memory
```bash
# Set in package.json scripts
"build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"

# Or run directly
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

#### Problem: Vite Config Error

```bash
Error in vite.config.ts
```

**Solution**: Check Vite configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Problem: Import Path Issues

```bash
Error: Failed to resolve import "@/components/ui/button"
```

**Solution**: Check path alias configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

### Runtime Errors

#### Problem: Hydration Mismatch (SSR)

```bash
Warning: Text content did not match. Server: "X" Client: "Y"
```

**Solution**: Ensure consistent rendering
```typescript
// Wrong - different on server/client
<div>{typeof window !== 'undefined' ? 'Client' : 'Server'}</div>

// Correct - same on both
import { useState, useEffect } from 'react';

const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) return null;
return <div>Client only content</div>;
```

#### Problem: useState/useEffect Errors

```bash
Error: Rendered more hooks than during the previous render
```

**Solution**: Don't use hooks conditionally
```typescript
// Wrong
if (condition) {
  const [state, setState] = useState();
}

// Correct
const [state, setState] = useState();
if (condition) {
  // Use state here
}
```

#### Problem: Infinite Loop

```bash
Warning: Maximum update depth exceeded
```

**Solution**: Fix dependency array
```typescript
// Wrong - infinite loop
useEffect(() => {
  setCount(count + 1);
}, [count]);

// Correct
useEffect(() => {
  const timer = setTimeout(() => setCount(c => c + 1), 1000);
  return () => clearTimeout(timer);
}, []);
```

### Component Issues

#### Problem: Component Not Rendering

**Checklist**:
- [ ] Component imported correctly
- [ ] Component exported correctly
- [ ] Props passed correctly
- [ ] No errors in console
- [ ] Component in correct location

```typescript
// Check export
export const MyComponent = () => { /* ... */ };

// Check import
import { MyComponent } from '@/components/MyComponent';

// Check usage
<MyComponent prop1="value" />
```

#### Problem: Styles Not Applying

```typescript
// Check Tailwind class is valid
<div className="bg-blue-500 text-white p-4">

// Check cn() usage
import { cn } from '@/lib/utils';
<div className={cn("base-class", conditional && "active-class")}>

// Check CSS import
import './styles.css';
```

#### Problem: Event Handler Not Firing

```typescript
// Wrong - function called immediately
<button onClick={handleClick()}>

// Correct - function reference
<button onClick={handleClick}>

// Correct - inline arrow function
<button onClick={() => handleClick()}>

// Correct - with arguments
<button onClick={() => handleClick(id)}>
```

### State Management Issues

#### Problem: State Not Updating

```typescript
// Wrong - direct mutation
const [items, setItems] = useState([1, 2, 3]);
items.push(4); // Doesn't trigger re-render

// Correct - create new array
setItems([...items, 4]);

// Wrong - mutating object
const [user, setUser] = useState({ name: 'John' });
user.name = 'Jane'; // Doesn't trigger re-render

// Correct - create new object
setUser({ ...user, name: 'Jane' });
```

#### Problem: Stale Closure

```typescript
// Wrong - captures old value
const [count, setCount] = useState(0);
const increment = () => setCount(count + 1);

useEffect(() => {
  const timer = setInterval(increment, 1000);
  return () => clearInterval(timer);
}, []); // increment uses stale count

// Correct - functional update
const increment = () => setCount(c => c + 1);

useEffect(() => {
  const timer = setInterval(increment, 1000);
  return () => clearInterval(timer);
}, []);
```

### API/Data Issues

#### Problem: Supabase Client Not Initialized

```typescript
import { supabase } from '@/lib/supabase';

// Always check if client exists
if (!supabase) {
  console.error('Supabase client not initialized');
  return;
}

// Then use it
const { data, error } = await supabase.from('table').select('*');
```

#### Problem: CORS Errors

```bash
Access to fetch at 'https://api.example.com' has been blocked by CORS
```

**Solution**: Configure Vite proxy (development)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

#### Problem: Fetch Not Working

```typescript
// Wrong - not handling errors
const data = await fetch('/api/data').then(r => r.json());

// Correct - proper error handling
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Fetch error:', error);
}
```

## Browser DevTools

### Console

```typescript
// Debug logging
if (import.meta.env.DEV) {
  console.log('Debug:', variable);
  console.table(arrayOfObjects);
  console.group('Group Name');
  console.log('Grouped message');
  console.groupEnd();
}
```

### React DevTools

1. Install React DevTools browser extension
2. Open DevTools > Components tab
3. Inspect component tree
4. View props and state
5. Profile component performance

### Network Tab

- Check API requests
- Verify request/response
- Check status codes
- Inspect headers
- Monitor timing

### Performance Tab

- Record page load
- Check rendering time
- Identify bottlenecks
- Analyze frame rate

## VS Code Debugging

### Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### Breakpoints

```typescript
// Set breakpoint in VS Code by clicking line number

// Or use debugger statement
const calculateTotal = (items) => {
  debugger; // Pauses execution here
  return items.reduce((sum, item) => sum + item.price, 0);
};
```

## Performance Debugging

### Identifying Slow Components

```typescript
import { Profiler } from 'react';

const onRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

### Checking Re-renders

```typescript
// Add to component
useEffect(() => {
  console.log('Component rendered');
});

// Use React DevTools Profiler
// - Record interaction
// - Check render times
// - Identify unnecessary renders
```

### Memory Leaks

```typescript
// Common causes
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  // Forgot to cleanup
  // return () => clearInterval(timer);
}, []);

// Correct
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  return () => clearInterval(timer); // Always cleanup
}, []);
```

## Error Boundaries

### Catching React Errors

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <pre className="mt-2 text-sm text-red-600">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## Getting Help

### Before Asking

1. Check this debugging guide
2. Search error message online
3. Check GitHub issues
4. Read relevant documentation
5. Create minimal reproduction

### When Asking

Provide:
- Exact error message
- Steps to reproduce
- What you've tried
- Environment info (Node version, OS, etc.)
- Relevant code snippets
- Console logs

### Useful Resources

- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev
- TypeScript Docs: https://www.typescriptlang.org/docs
- Tailwind Docs: https://tailwindcss.com/docs
- Radix UI Docs: https://www.radix-ui.com

## Preventive Measures

### Code Reviews

- Review changes before committing
- Test in multiple browsers
- Check for console errors
- Verify TypeScript types
- Test edge cases

### Monitoring

```typescript
// Add error tracking (future)
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

### Best Practices

- Use TypeScript strictly
- Enable all linter rules
- Write tests
- Handle errors gracefully
- Log useful information
- Clean up resources
- Avoid premature optimization

## Next Steps

- Read [CODE_STYLE.md](./CODE_STYLE.md) for coding standards
- See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing strategies
- Check [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for workflow
