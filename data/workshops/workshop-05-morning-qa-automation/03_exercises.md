# Exercises: Build Your Testing Pipeline

## Exercise 1: Integration Tests

Write integration tests for the Task API using Supertest.

### Create tests/integration/api.test.js

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { Task } from '../../src/models/Task.js';

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    Task.reset();
  });

  describe('GET /api/tasks', () => {
    it('should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      Task.create({ title: 'Task 1' });
      Task.create({ title: 'Task 2' });

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Buy groceries',
        description: 'Milk, bread, eggs',
        priority: 'high',
        dueDate: '2024-12-31'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 1,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        completed: false
      });
    });

    it('should reject task without title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ description: 'No title' })
        .expect(400);

      expect(response.body.errors).toContain('Title is required');
    });

    it('should trim and sanitize input', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: '  Spaced out  ' })
        .expect(201);

      expect(response.body.title).toBe('Spaced out');
      expect(response.body.priority).toBe('medium'); // default
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by ID', async () => {
      const task = Task.create({ title: 'Find me' });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .expect(200);

      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe('Find me');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/999')
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update existing task', async () => {
      const task = Task.create({ title: 'Original', priority: 'low' });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: 'Updated', priority: 'high' })
        .expect(200);

      expect(response.body.title).toBe('Updated');
      expect(response.body.priority).toBe('high');
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .put('/api/tasks/999')
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should validate update data', async () => {
      const task = Task.create({ title: 'Task' });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: '' })
        .expect(400);

      expect(response.body.errors).toContain('Title is required');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const task = Task.create({ title: 'Delete me' });

      await request(app)
        .delete(`/api/tasks/${task.id}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .delete('/api/tasks/999')
        .expect(404);
    });
  });

  describe('Complete workflow', () => {
    it('should handle full CRUD operations', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Complete workflow test' })
        .expect(201);

      const taskId = createRes.body.id;

      // Read
      await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      // Update
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Updated title', completed: true })
        .expect(200);

      // Verify update
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(getRes.body.completed).toBe(true);

      // Delete
      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(404);
    });
  });
});
```

### Run Integration Tests

```bash
npm run test:integration
```

## Exercise 2: E2E Tests with Playwright

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Create playwright.config.js

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
});
```

### Create tests/e2e/tasks.spec.js

```javascript
import { test, expect } from '@playwright/test';

test.describe('Task Manager E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display empty task list', async ({ page }) => {
    const taskList = page.locator('[data-testid="task-list"]');
    await expect(taskList).toBeEmpty();

    const emptyMessage = page.locator('[data-testid="empty-message"]');
    await expect(emptyMessage).toContainText('No tasks yet');
  });

  test('should create a new task', async ({ page }) => {
    // Fill form
    await page.fill('[data-testid="task-title"]', 'Buy groceries');
    await page.fill('[data-testid="task-description"]', 'Milk, bread, eggs');
    await page.selectOption('[data-testid="task-priority"]', 'high');

    // Submit
    await page.click('[data-testid="submit-task"]');

    // Verify task appears
    const taskItem = page.locator('[data-testid="task-item"]').first();
    await expect(taskItem).toContainText('Buy groceries');
    await expect(taskItem).toHaveAttribute('data-priority', 'high');
  });

  test('should mark task as complete', async ({ page }) => {
    // Create task first
    await page.fill('[data-testid="task-title"]', 'Test task');
    await page.click('[data-testid="submit-task"]');

    // Toggle completion
    const checkbox = page.locator('[data-testid="task-checkbox"]').first();
    await checkbox.check();

    // Verify visual feedback
    const taskItem = page.locator('[data-testid="task-item"]').first();
    await expect(taskItem).toHaveClass(/completed/);
  });

  test('should edit existing task', async ({ page }) => {
    // Create task
    await page.fill('[data-testid="task-title"]', 'Original title');
    await page.click('[data-testid="submit-task"]');

    // Click edit
    await page.click('[data-testid="edit-task"]');

    // Update title
    await page.fill('[data-testid="edit-title-input"]', 'Updated title');
    await page.click('[data-testid="save-edit"]');

    // Verify update
    const taskItem = page.locator('[data-testid="task-item"]').first();
    await expect(taskItem).toContainText('Updated title');
  });

  test('should delete task', async ({ page }) => {
    // Create task
    await page.fill('[data-testid="task-title"]', 'Delete me');
    await page.click('[data-testid="submit-task"]');

    // Delete
    await page.click('[data-testid="delete-task"]');

    // Confirm deletion dialog
    await page.click('[data-testid="confirm-delete"]');

    // Verify task is gone
    const taskList = page.locator('[data-testid="task-list"]');
    await expect(taskList).toBeEmpty();
  });

  test('should filter tasks by priority', async ({ page }) => {
    // Create tasks with different priorities
    const tasks = [
      { title: 'High priority', priority: 'high' },
      { title: 'Medium priority', priority: 'medium' },
      { title: 'Low priority', priority: 'low' }
    ];

    for (const task of tasks) {
      await page.fill('[data-testid="task-title"]', task.title);
      await page.selectOption('[data-testid="task-priority"]', task.priority);
      await page.click('[data-testid="submit-task"]');
    }

    // Filter by high priority
    await page.selectOption('[data-testid="priority-filter"]', 'high');

    // Verify only high priority task shown
    const visibleTasks = page.locator('[data-testid="task-item"]:visible');
    await expect(visibleTasks).toHaveCount(1);
    await expect(visibleTasks.first()).toContainText('High priority');
  });

  test('should search tasks', async ({ page }) => {
    // Create multiple tasks
    await page.fill('[data-testid="task-title"]', 'Buy groceries');
    await page.click('[data-testid="submit-task"]');

    await page.fill('[data-testid="task-title"]', 'Walk the dog');
    await page.click('[data-testid="submit-task"]');

    // Search
    await page.fill('[data-testid="search-input"]', 'groceries');

    // Verify results
    const visibleTasks = page.locator('[data-testid="task-item"]:visible');
    await expect(visibleTasks).toHaveCount(1);
    await expect(visibleTasks.first()).toContainText('Buy groceries');
  });

  test('should persist tasks across page reload', async ({ page }) => {
    // Create task
    await page.fill('[data-testid="task-title"]', 'Persistent task');
    await page.click('[data-testid="submit-task"]');

    // Reload page
    await page.reload();

    // Verify task still exists
    const taskItem = page.locator('[data-testid="task-item"]').first();
    await expect(taskItem).toContainText('Persistent task');
  });
});
```

### Run E2E Tests

```bash
npm run test:e2e

# With UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

## Exercise 3: GitHub Actions CI/CD

### Create .github/workflows/ci.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Run integration tests
        run: npm run test:integration

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  lint:
    name: Lint Code
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - run: npm ci
      - run: npm run lint

  security:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [test, lint]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - run: npm ci
      - run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
```

## Exercise 4: Code Quality Tools

### Add ESLint Configuration

Create `.eslintrc.json`:

```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

### Add Pre-commit Hooks

Install Husky:

```bash
npm install -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Create `.lintstagedrc.json`:

```json
{
  "*.js": [
    "eslint --fix",
    "vitest related --run"
  ]
}
```

## Exercise 5: Mutation Testing

Install Stryker:

```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

Create `stryker.config.json`:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.js",
    "!src/**/*.test.js"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

Run mutation testing:

```bash
npx stryker run
```

## Challenge Tasks

1. **Achieve 90%+ Coverage**: Ensure all critical paths are tested
2. **Fix Mutations**: Address any surviving mutants
3. **Optimize Tests**: Reduce test execution time by 20%
4. **Add Visual Tests**: Implement Percy or similar
5. **Performance Testing**: Add Lighthouse CI checks

## Navigation
- Previous: [Hands-On Setup](02_hands_on.md)
- Next: [Project](04_project.md)
- [Back to Module Overview](README.md)
