# Testing Guide

Comprehensive testing strategies for DreamLab AI.

## Testing Philosophy

While we don't have a formal test suite yet, this guide establishes testing patterns for future implementation.

## Manual Testing Checklist

### Component Testing

When creating or modifying components:

- [ ] Component renders without errors
- [ ] Props are handled correctly
- [ ] Event handlers work as expected
- [ ] Styling appears correctly
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Dark mode styling works
- [ ] Accessibility features work (keyboard nav, screen readers)

### Page Testing

For new or modified pages:

- [ ] Route loads correctly
- [ ] Navigation works (to/from page)
- [ ] Data loads properly
- [ ] Loading states display
- [ ] Error states display
- [ ] Empty states display
- [ ] SEO meta tags present

### Build Testing

Before committing:

```bash
# Development build
npm run dev
# Check for errors in console

# Production build
npm run build
# Ensure build succeeds

# Preview production build
npm run preview
# Test in production mode
```

### Browser Testing

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Device Testing

Test responsive behavior:

- [ ] Mobile (320px-767px)
- [ ] Tablet (768px-1023px)
- [ ] Desktop (1024px+)

## Future Automated Testing

### Unit Testing Setup (Recommended)

```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
```

### Example Component Test

```typescript
// src/components/__tests__/WorkshopCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkshopCard } from '../WorkshopCard';

describe('WorkshopCard', () => {
  it('renders workshop information', () => {
    render(
      <WorkshopCard
        title="AI Fundamentals"
        description="Learn AI basics"
        duration="2 weeks"
        level="beginner"
      />
    );

    expect(screen.getByText('AI Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Learn AI basics')).toBeInTheDocument();
    expect(screen.getByText(/2 weeks.*beginner/)).toBeInTheDocument();
  });

  it('calls onEnroll when button clicked', async () => {
    const handleEnroll = vi.fn();
    render(
      <WorkshopCard
        title="AI Fundamentals"
        description="Learn AI basics"
        duration="2 weeks"
        level="beginner"
        onEnroll={handleEnroll}
      />
    );

    const button = screen.getByRole('button', { name: /enroll/i });
    await userEvent.click(button);

    expect(handleEnroll).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WorkshopCard
        title="AI Fundamentals"
        description="Learn AI basics"
        duration="2 weeks"
        level="beginner"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

### Example Hook Test

```typescript
// src/hooks/__tests__/use-workshop-filter.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkshopFilter } from '../use-workshop-filter';

describe('useWorkshopFilter', () => {
  const mockWorkshops = [
    { id: '1', title: 'AI Basics', level: 'beginner', duration: 20 },
    { id: '2', title: 'Advanced AI', level: 'advanced', duration: 40 },
    { id: '3', title: 'Intermediate AI', level: 'intermediate', duration: 30 },
  ];

  it('returns all workshops initially', () => {
    const { result } = renderHook(() => useWorkshopFilter(mockWorkshops));
    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by level', () => {
    const { result } = renderHook(() => useWorkshopFilter(mockWorkshops));

    act(() => {
      result.current.setLevel('beginner');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe('AI Basics');
  });

  it('filters by duration', () => {
    const { result } = renderHook(() => useWorkshopFilter(mockWorkshops));

    act(() => {
      result.current.setMaxDuration(30);
    });

    expect(result.current.filtered).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const { result } = renderHook(() => useWorkshopFilter(mockWorkshops));

    act(() => {
      result.current.setLevel('intermediate');
      result.current.setMaxDuration(30);
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe('Intermediate AI');
  });
});
```

### Integration Testing Example

```typescript
// src/__tests__/WorkshopFlow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Workshop enrollment flow', () => {
  it('completes full enrollment process', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Navigate to workshops
    const workshopsLink = screen.getByRole('link', { name: /workshops/i });
    await userEvent.click(workshopsLink);

    // Find and click workshop
    const workshop = await screen.findByText(/AI Fundamentals/i);
    await userEvent.click(workshop);

    // Enroll in workshop
    const enrollButton = screen.getByRole('button', { name: /enroll/i });
    await userEvent.click(enrollButton);

    // Verify success
    expect(await screen.findByText(/successfully enrolled/i)).toBeInTheDocument();
  });
});
```

## Visual Testing

### Component Development

Use Storybook for isolated component development:

```bash
# Install Storybook
npx storybook@latest init
```

Example story:

```typescript
// src/components/WorkshopCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { WorkshopCard } from './WorkshopCard';

const meta: Meta<typeof WorkshopCard> = {
  title: 'Components/WorkshopCard',
  component: WorkshopCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WorkshopCard>;

export const Beginner: Story = {
  args: {
    title: 'AI Fundamentals',
    description: 'Learn the basics of artificial intelligence',
    duration: '2 weeks',
    level: 'beginner',
  },
};

export const Advanced: Story = {
  args: {
    title: 'Advanced Machine Learning',
    description: 'Deep dive into ML algorithms',
    duration: '6 weeks',
    level: 'advanced',
  },
};

export const WithEnrollButton: Story = {
  args: {
    ...Beginner.args,
    onEnroll: () => alert('Enrolled!'),
  },
};
```

## End-to-End Testing

### Playwright Setup (Recommended)

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install
```

### Example E2E Test

```typescript
// tests/e2e/workshop-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workshop enrollment', () => {
  test('user can browse and enroll in workshop', async ({ page }) => {
    // Navigate to site
    await page.goto('http://localhost:5173');

    // Go to workshops page
    await page.click('text=Workshops');
    await expect(page).toHaveURL(/.*workshops/);

    // Filter by beginner level
    await page.selectOption('select[name="level"]', 'beginner');

    // Click first workshop
    await page.click('article:first-child');

    // Enroll in workshop
    await page.click('button:has-text("Enroll Now")');

    // Verify enrollment success
    await expect(page.locator('text=Successfully enrolled')).toBeVisible();
  });

  test('workshop filter works correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/workshops');

    // Check initial workshop count
    const initialCount = await page.locator('article').count();

    // Apply filter
    await page.selectOption('select[name="level"]', 'advanced');

    // Verify filtered results
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeLessThan(initialCount);
  });
});
```

## Accessibility Testing

### Manual A11y Checks

- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Screen reader announces content correctly
- [ ] Focus indicators visible
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] ARIA attributes correct

### Automated A11y Testing

```bash
# Install axe-core
npm install -D @axe-core/react
```

```typescript
// src/lib/axe.ts
import React from 'react';
import ReactDOM from 'react-dom';

if (import.meta.env.DEV) {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

## Performance Testing

### Lighthouse Audits

```bash
# Install Lighthouse CI
npm install -D @lhci/cli

# Run audit
npx lhci autorun
```

### Web Vitals Monitoring

```typescript
// src/lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFID(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}

// In main.tsx
if (import.meta.env.DEV) {
  reportWebVitals();
}
```

## Test Coverage Goals

Target coverage for future implementation:

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Main user journeys
- **Visual Tests**: All components
- **A11y Tests**: All public pages

## Testing Best Practices

### Write Tests That

- Test behavior, not implementation
- Are independent and isolated
- Run fast
- Are deterministic
- Have clear names
- Follow AAA pattern (Arrange, Act, Assert)

### Avoid Tests That

- Test implementation details
- Depend on other tests
- Use timeouts/delays
- Test third-party libraries
- Are flaky or unreliable

## CI/CD Testing (Future)

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

## Debugging Tests

### Vitest Debug

```bash
# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test src/components/__tests__/WorkshopCard.test.tsx

# Debug specific test
npm run test -- --no-coverage --reporter=verbose
```

### Playwright Debug

```bash
# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Show browser
npx playwright test --headed
```

## Next Steps

- Set up Vitest for unit tests
- Add React Testing Library
- Implement E2E tests with Playwright
- Add visual regression testing
- Set up CI/CD pipeline
- See [DEBUGGING.md](./DEBUGGING.md) for troubleshooting
