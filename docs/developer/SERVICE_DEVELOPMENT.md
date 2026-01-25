# Backend Service Development

Guide for developing backend services including the Nostr relay and APIs.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- PostgreSQL 14+ (for local testing)

## Nostr Relay Development

### Setup

```bash
# Clone and navigate
cd community-forum/services/nostr-relay

# Install dependencies
npm install

# Create development environment
cp .env.example .env
```

Edit `.env`:

```bash
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@localhost:5432/nostr_relay
WHITELIST_PUBKEYS=pubkey1,pubkey2,pubkey3
ADMIN_PUBKEYS=admin-pubkey
RATE_LIMIT_EVENTS_PER_SEC=10
RATE_LIMIT_MAX_CONNECTIONS=10
```

### Development Workflow

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Run production build
npm start
```

### Project Structure

```
nostr-relay/
├── src/
│   ├── server.ts       # HTTP/WebSocket server entry point
│   ├── handlers.ts     # WebSocket message handlers (EVENT, REQ, CLOSE)
│   ├── db.ts           # PostgreSQL database operations (pg driver)
│   ├── whitelist.ts    # Access control and cohort management
│   ├── rateLimit.ts    # Rate limiting per IP address
│   ├── nip16.ts        # NIP-16 event treatment logic
│   ├── nip98.ts        # NIP-98 HTTP authentication
│   └── did-nostr.ts    # DID:nostr identity resolution
├── tests/
│   └── unit/           # Unit tests
├── docs/               # Service documentation (being consolidated)
├── dist/               # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── jest.config.js
```

### Code Style

#### TypeScript Guidelines

- Use strict mode: `strict: true` in tsconfig.json
- Prefer explicit types over inference
- Use interfaces for object shapes
- Avoid `any` - use `unknown` when type is uncertain

#### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `rate-limit.ts` |
| Classes | PascalCase | `NostrDatabase` |
| Functions | camelCase | `saveEvent()` |
| Constants | UPPER_SNAKE | `MAX_CONNECTIONS` |
| Interfaces | PascalCase | `NostrEvent` |

#### Example Code

```typescript
import { NostrEvent } from './db';

const MAX_EVENT_SIZE = 64 * 1024;

interface EventValidation {
  valid: boolean;
  error?: string;
}

export function validateEvent(event: NostrEvent): EventValidation {
  if (event.id.length !== 64) {
    return { valid: false, error: 'Invalid event ID length' };
  }

  return { valid: true };
}
```

### Testing

#### Unit Tests (Jest)

Located in `tests/unit/`. Uses Jest framework.

```typescript
import { describe, it, expect } from '@jest/globals';
import { isReplaceableKind } from '../../src/nip16';

describe('NIP-16 Event Treatment', () => {
  describe('isReplaceableKind', () => {
    it('should identify kind 0 as replaceable', () => {
      expect(isReplaceableKind(0)).toBe(true);
    });

    it('should identify kind 1 as not replaceable', () => {
      expect(isReplaceableKind(1)).toBe(false);
    });
  });
});
```

#### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/nip16.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="replaceable"
```

#### Coverage Goals

- **Line coverage**: 80%+ overall
- **Critical paths**: 100% (signature verification, whitelist checks)

### Adding Features

#### Adding a New NIP

1. **Create module**: `src/nipXX.ts`
2. **Add tests**: `tests/unit/nipXX.test.ts`
3. **Integrate**: Update handlers or server as needed
4. **Update NIP-11**: Add to `supported_nips` array in `/health` endpoint
5. **Document**: Update API docs and README

#### Example: Adding NIP-50 Search

```typescript
// src/nip50.ts
export interface SearchFilter {
  search?: string;
}

export function parseSearchFilter(filter: any): SearchFilter | null {
  if (typeof filter.search !== 'string') {
    return null;
  }
  return { search: filter.search };
}

export function matchesSearch(event: NostrEvent, search: string): boolean {
  const terms = search.toLowerCase().split(/\s+/);
  const content = event.content.toLowerCase();
  return terms.every(term => content.includes(term));
}
```

### Debugging

#### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["ts-node", "src/server.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["jest", "--runInBand"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

#### Logging

```typescript
// Add contextual logging
console.log(`[${new Date().toISOString()}] Event received: ${event.id.slice(0, 8)}...`);
console.error(`[${new Date().toISOString()}] Signature verification failed for ${event.pubkey.slice(0, 8)}...`);
```

#### Database Inspection

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Or with explicit connection
psql -h localhost -U nostr -d nostr_relay

# Useful queries
\dt                                    -- List tables
\d events                              -- Describe events table
SELECT COUNT(*) FROM events;
SELECT kind, COUNT(*) FROM events GROUP BY kind;
SELECT * FROM whitelist;

# Check table sizes
SELECT pg_size_pretty(pg_total_relation_size('events'));
```

### Contributing

#### Pull Request Process

```mermaid
graph TD
    A[Fork Repository] --> B[Create Branch]
    B --> C[Make Changes]
    C --> D[Write Tests]
    D --> E[Run Test Suite]
    E -->|Pass| F[Create PR]
    E -->|Fail| C
    F --> G[Code Review]
    G -->|Approved| H[Merge]
    G -->|Changes Requested| C
```

#### Commit Messages

Use conventional commits:

```
feat: add NIP-50 search support
fix: handle empty d-tag in parameterized events
docs: update API reference for NIP-98
test: add coverage for ephemeral events
refactor: extract signature verification
```

#### Branch Naming

- `feat/nip-50-search` - New features
- `fix/empty-dtag` - Bug fixes
- `docs/api-update` - Documentation
- `refactor/handlers` - Code improvements

### Dependencies

#### Production

| Package | Version | Purpose |
|---------|---------|---------|
| `pg` | 8.x | PostgreSQL database driver |
| `ws` | 8.x | WebSocket server |
| `@noble/curves` | Latest | Schnorr signatures |
| `@noble/hashes` | Latest | Cryptographic hashing |
| `nostr-tools` | 2.x | Nostr utilities |
| `dotenv` | Latest | Environment configuration |

#### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.x | Type checking |
| `jest` | 29.x | Testing framework |
| `ts-jest` | Latest | TypeScript Jest integration |
| `ts-node` | Latest | TypeScript execution |
| `@types/*` | Latest | Type definitions |

### Performance Optimization

#### PostgreSQL Connection Pool

```typescript
// Already configured in db.ts
this.pool = new Pool({
  connectionString,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000,  // Connection timeout
});
```

#### Efficient Queries

```typescript
// Use parameterized queries (prevents SQL injection)
const result = await this.pool.query(
  'SELECT * FROM events WHERE pubkey = $1',
  [pubkey]
);

// Use JSONB containment for tag queries (uses GIN index)
const result = await this.pool.query(
  `SELECT * FROM events WHERE tags @> $1::jsonb`,
  [JSON.stringify([['e', eventId]])]
);

// Batch inserts with transactions
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  for (const event of events) {
    await client.query(
      'INSERT INTO events (id, pubkey, ...) VALUES ($1, $2, ...)',
      [event.id, event.pubkey, ...]
    );
  }
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

#### Memory Management

- Limit subscription result sets
- Clean up closed connections promptly
- Monitor heap usage in production

---

## Related Documentation

- [API Reference](../api/NOSTR_RELAY.md) - WebSocket and HTTP API
- [Architecture](../architecture/BACKEND_SERVICES.md) - System design
- [Deployment](../deployment/CLOUD_SERVICES.md) - Production deployment
- [Main README](../../community-forum/services/nostr-relay/README.md) - Service overview

---

**Document Owner**: Backend Development Team
**Last Updated**: 2026-01-25
