# Hands-On: Setting Up Your Testing Environment

## Project Setup

We'll build a comprehensive testing pipeline for a task management API. By the end, you'll have:
- Unit tests with Vitest
- Integration tests with Supertest
- E2E tests with Playwright
- CI/CD with GitHub Actions

### Initial Project Structure

```bash
task-manager/
├── src/
│   ├── server.js
│   ├── routes/
│   │   └── tasks.js
│   ├── models/
│   │   └── Task.js
│   └── utils/
│       └── validators.js
├── tests/
│   ├── unit/
│   │   ├── validators.test.js
│   │   └── Task.test.js
│   ├── integration/
│   │   └── api.test.js
│   └── e2e/
│       └── tasks.spec.js
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── vitest.config.js
└── playwright.config.js
```

## Step 1: Initialize the Project

```bash
# Create project directory
mkdir task-manager
cd task-manager

# Initialize npm project
npm init -y

# Install production dependencies
npm install express cors body-parser

# Install development dependencies
npm install -D vitest @vitest/coverage-v8 supertest @playwright/test
```

### Configure package.json

```json
{
  "name": "task-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --run tests/integration",
    "test:e2e": "playwright test",
    "test:all": "npm run test:coverage && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "supertest": "^6.3.3",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  }
}
```

## Step 2: Vitest Configuration

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/types.ts',
        'dist/'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Global test timeout
    testTimeout: 10000,

    // Setup files
    setupFiles: ['./tests/setup.js'],

    // Reporters
    reporters: ['verbose', 'html'],

    // Parallel execution
    threads: true,
    maxThreads: 4,

    // Mock reset
    mockReset: true,
    clearMocks: true,
    restoreMocks: true
  }
});
```

## Step 3: Build the Application

### Create src/utils/validators.js

```javascript
export function validateTask(task) {
  const errors = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (task.title && task.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
    errors.push('Priority must be low, medium, or high');
  }

  if (task.dueDate && isNaN(Date.parse(task.dueDate))) {
    errors.push('Invalid due date format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeTask(task) {
  return {
    title: task.title?.trim(),
    description: task.description?.trim() || '',
    priority: task.priority || 'medium',
    dueDate: task.dueDate || null,
    completed: task.completed || false
  };
}
```

### Create src/models/Task.js

```javascript
let tasks = [];
let nextId = 1;

export class Task {
  constructor(data) {
    this.id = nextId++;
    this.title = data.title;
    this.description = data.description || '';
    this.priority = data.priority || 'medium';
    this.dueDate = data.dueDate || null;
    this.completed = data.completed || false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  static getAll() {
    return tasks;
  }

  static getById(id) {
    return tasks.find(task => task.id === parseInt(id));
  }

  static create(data) {
    const task = new Task(data);
    tasks.push(task);
    return task;
  }

  static update(id, data) {
    const index = tasks.findIndex(task => task.id === parseInt(id));
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...data,
      id: tasks[index].id,
      createdAt: tasks[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    return tasks[index];
  }

  static delete(id) {
    const index = tasks.findIndex(task => task.id === parseInt(id));
    if (index === -1) return false;

    tasks.splice(index, 1);
    return true;
  }

  static reset() {
    tasks = [];
    nextId = 1;
  }
}
```

### Create src/routes/tasks.js

```javascript
import express from 'express';
import { Task } from '../models/Task.js';
import { validateTask, sanitizeTask } from '../utils/validators.js';

const router = express.Router();

// Get all tasks
router.get('/', (req, res) => {
  const tasks = Task.getAll();
  res.json(tasks);
});

// Get single task
router.get('/:id', (req, res) => {
  const task = Task.getById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Create task
router.post('/', (req, res) => {
  const sanitized = sanitizeTask(req.body);
  const validation = validateTask(sanitized);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const task = Task.create(sanitized);
  res.status(201).json(task);
});

// Update task
router.put('/:id', (req, res) => {
  const sanitized = sanitizeTask(req.body);
  const validation = validateTask(sanitized);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const task = Task.update(req.params.id, sanitized);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// Delete task
router.delete('/:id', (req, res) => {
  const deleted = Task.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

export default router;
```

### Create src/server.js

```javascript
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import taskRoutes from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
```

## Step 4: Write Unit Tests

### Create tests/setup.js

```javascript
import { beforeEach } from 'vitest';
import { Task } from '../src/models/Task.js';

// Reset tasks before each test
beforeEach(() => {
  Task.reset();
});
```

### Create tests/unit/validators.test.js

```javascript
import { describe, it, expect } from 'vitest';
import { validateTask, sanitizeTask } from '../../src/utils/validators.js';

describe('validateTask', () => {
  it('should accept valid task', () => {
    const task = {
      title: 'Buy groceries',
      priority: 'high',
      dueDate: '2024-12-31'
    };

    const result = validateTask(task);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject task without title', () => {
    const task = { title: '' };
    const result = validateTask(task);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject task with long title', () => {
    const task = { title: 'a'.repeat(101) };
    const result = validateTask(task);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title must be less than 100 characters');
  });

  it('should reject invalid priority', () => {
    const task = { title: 'Task', priority: 'urgent' };
    const result = validateTask(task);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Priority must be low, medium, or high');
  });

  it('should reject invalid date format', () => {
    const task = { title: 'Task', dueDate: 'not-a-date' };
    const result = validateTask(task);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid due date format');
  });
});

describe('sanitizeTask', () => {
  it('should trim whitespace from title', () => {
    const task = { title: '  Clean room  ' };
    const result = sanitizeTask(task);

    expect(result.title).toBe('Clean room');
  });

  it('should set default priority', () => {
    const task = { title: 'Task' };
    const result = sanitizeTask(task);

    expect(result.priority).toBe('medium');
  });

  it('should set default completed to false', () => {
    const task = { title: 'Task' };
    const result = sanitizeTask(task);

    expect(result.completed).toBe(false);
  });
});
```

### Create tests/unit/Task.test.js

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { Task } from '../../src/models/Task.js';

describe('Task Model', () => {
  beforeEach(() => {
    Task.reset();
  });

  describe('create', () => {
    it('should create task with all fields', () => {
      const taskData = {
        title: 'Learn testing',
        description: 'Master Vitest and Playwright',
        priority: 'high',
        dueDate: '2024-12-31'
      };

      const task = Task.create(taskData);

      expect(task.id).toBe(1);
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.priority).toBe(taskData.priority);
      expect(task.completed).toBe(false);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should auto-increment IDs', () => {
      const task1 = Task.create({ title: 'Task 1' });
      const task2 = Task.create({ title: 'Task 2' });

      expect(task1.id).toBe(1);
      expect(task2.id).toBe(2);
    });
  });

  describe('getAll', () => {
    it('should return all tasks', () => {
      Task.create({ title: 'Task 1' });
      Task.create({ title: 'Task 2' });

      const tasks = Task.getAll();
      expect(tasks).toHaveLength(2);
    });

    it('should return empty array when no tasks', () => {
      const tasks = Task.getAll();
      expect(tasks).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return task by ID', () => {
      const created = Task.create({ title: 'Find me' });
      const found = Task.getById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent ID', () => {
      const task = Task.getById(999);
      expect(task).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update task fields', () => {
      const task = Task.create({ title: 'Original', priority: 'low' });
      const updated = Task.update(task.id, { title: 'Updated', priority: 'high' });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('high');
      expect(updated.updatedAt).not.toBe(task.updatedAt);
    });

    it('should preserve ID and createdAt', () => {
      const task = Task.create({ title: 'Task' });
      const updated = Task.update(task.id, { title: 'Updated' });

      expect(updated.id).toBe(task.id);
      expect(updated.createdAt).toBe(task.createdAt);
    });

    it('should return null for non-existent task', () => {
      const result = Task.update(999, { title: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete task', () => {
      const task = Task.create({ title: 'Delete me' });
      const deleted = Task.delete(task.id);

      expect(deleted).toBe(true);
      expect(Task.getById(task.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      const result = Task.delete(999);
      expect(result).toBe(false);
    });
  });
});
```

## Step 5: Run Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch
```

**Expected Output**:
```
✓ tests/unit/validators.test.js (8 tests)
✓ tests/unit/Task.test.js (11 tests)

Test Files  2 passed (2)
     Tests  19 passed (19)
  Start at  12:00:00
  Duration  234ms

----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   95.2  |   90.1   |   100   |   95.0  |
 src/utils/           |   100   |   100    |   100   |   100   |
  validators.js       |   100   |   100    |   100   |   100   |
 src/models/          |   92.5  |   85.0   |   100   |   92.3  |
  Task.js             |   92.5  |   85.0   |   100   |   92.3  |
----------------------|---------|----------|---------|---------|
```

## Next Steps

In the exercises section, you'll:
1. Write integration tests for the API
2. Set up E2E tests with Playwright
3. Configure GitHub Actions CI/CD
4. Add visual regression testing
5. Implement mutation testing

## Navigation
- Previous: [Testing Concepts](01_concepts.md)
- Next: [Exercises](03_exercises.md)
- [Back to Module Overview](README.md)
