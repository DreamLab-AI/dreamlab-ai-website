# Nostr Community Forum

A privacy-first community platform powered by the Nostr protocol. End-to-end encrypted conversations, true account ownership, and complete offline support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-purple.svg)](https://nostr.com)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5-FF3E00.svg)](https://kit.svelte.dev)

---

## Overview

Nostr Community Forum is a decentralized chat and collaboration platform built on the Nostr protocol. Unlike traditional messaging platforms, it gives users complete control over their identity and conversations.

### Why Nostr?

- **Your identity is yours** - Cryptographic keys, not passwords
- **Private messages are truly private** - End-to-end encrypted with NIP-44 and NIP-59 gift wrapping
- **No central authority** - Messages route through a relay network you control
- **Works offline** - Read cached messages without internet
- **Portable** - Your identity works across any Nostr-compatible app

---

## Key Features

### Communication
- **Group Channels** - Organized conversations by topic with channel discovery
- **Private Messages** - End-to-end encrypted, gift-wrapped for maximum privacy
- **Forums** - Long-form discussions with threaded replies
- **Events & Calendar** - Schedule community events with RSVP tracking

### Security & Privacy
- **NIP-44 Encryption** - Modern, performant encryption standard
- **NIP-59 Gift Wrapping** - Messages hidden from relay operators
- **NIP-42 Authentication** - Cryptographic identity verification
- **Cohort-based Access** - Fine-grained permissions per zone/group
- **No Server Secrets** - Keys never leave your device

### Platform
- **Progressive Web App** - Install on desktop and mobile
- **Offline First** - IndexedDB caching with local-first architecture
- **Real-time Sync** - WebSocket connection to Nostr relay
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Self-hosted Ready** - Deploy with Docker Compose

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | SvelteKit 5, Svelte 4, TailwindCSS, DaisyUI |
| **Protocol** | Nostr with NDK (Nostr Dev Kit) |
| **Encryption** | NIP-44 (modern), NIP-17/59 (gift wrap) |
| **Storage** | IndexedDB (client), Cloud Storage (vectors) |
| **Search** | HNSW vector search with sentence-transformers |
| **Relay** | Custom Nostr relay service |
| **APIs** | Embedding API (vector generation), Image API |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Build** | Vite with SvelteKit adapter |

---

## Project Structure

```
community-forum/
├── src/
│   ├── lib/
│   │   ├── components/          # Svelte components (UI)
│   │   ├── stores/              # Svelte stores (state management)
│   │   ├── services/            # Business logic (relay, API calls)
│   │   ├── semantic/            # Vector search and embeddings
│   │   ├── nostr/               # Nostr protocol handlers
│   │   ├── config/              # Configuration
│   │   ├── security/            # Encryption and auth
│   │   ├── utils/               # Utility functions
│   │   ├── types/               # TypeScript types
│   │   └── workers/             # Web Workers
│   ├── routes/                  # SvelteKit pages and API
│   │   ├── +layout.svelte       # App root
│   │   ├── chat/                # Chat interface
│   │   ├── dm/                  # Direct messages
│   │   ├── forums/              # Forum discussions
│   │   ├── events/              # Calendar and events
│   │   ├── admin/               # Admin panel
│   │   ├── settings/            # User settings
│   │   ├── [category]/          # Dynamic channel routes
│   │   └── api/                 # Server-side API routes
│   └── app.postcss              # Global styles
├── services/
│   ├── nostr-relay/             # Nostr relay service
│   ├── embedding-api/           # Vector embedding service
│   ├── image-api/               # Image upload and optimization
│   └── link-preview-api/        # Link preview generation
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── performance/             # Performance benchmarks
├── docs/                        # User and developer documentation
├── config/                      # Deployment configurations
├── scripts/                     # Build and utility scripts
├── static/                      # PWA manifest, icons, images
├── package.json                 # Dependencies
├── svelte.config.js             # SvelteKit configuration
├── vite.config.ts               # Vite configuration
└── playwright.config.ts         # E2E test configuration
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Access to Nostr relay (credentials in `.env`)
- (Optional) Google Cloud credentials for deployment

### Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/jjohare/Nostr-BBS.git
   cd community-forum
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy example configuration
   cp .env.example .env

   # Edit .env with your settings
   nano .env
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173 in your browser

4. **Create test account**
   - Click "Create Account"
   - Choose a nickname
   - Save your recovery phrase (critical!)
   - Request zone access from an admin

### Environment Variables

```bash
# Required - Nostr Relay
VITE_RELAY_URL=wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev
VITE_ADMIN_PUBKEY=<64-character-hex-pubkey>

# Cloud Run APIs (optional - for full features)
VITE_EMBEDDING_API_URL=https://embedding-api-617806532906.us-central1.run.app
VITE_IMAGE_API_URL=https://image-api-617806532906.us-central1.run.app
VITE_LINK_PREVIEW_API_URL=https://link-preview-api-617806532906.us-central1.run.app

# Application
VITE_APP_NAME=Community Forum
VITE_NDK_DEBUG=false

# Google Cloud (for deployment)
GOOGLE_CLOUD_PROJECT=your-project-id
```

See `.env.example` for complete list.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (PWA)                          │
│  SvelteKit Frontend + IndexedDB Cache                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─── WebSocket ─────> Nostr Relay
       │                    (Message Protocol)
       │
       ├─── HTTPS ─────────> Embedding API
       │                    (Vector Generation)
       │
       └─── HTTPS ─────────> Image API
                            (Upload & Storage)
```

### Data Flow

1. **Message Creation**
   - User composes message in UI
   - Content is encrypted (NIP-44)
   - Message signed with user's private key
   - Published to Nostr relay

2. **Message Reception**
   - Relay emits events via WebSocket
   - App decrypts private messages
   - Stores in IndexedDB for offline access
   - Updates UI reactively

3. **Search & Embeddings**
   - Optional: Send message text to Embedding API
   - Receive vector representation (384 dimensions)
   - Store vector in local HNSW index
   - Enable semantic search across messages

### Nostr Protocol Support

| NIP | Feature | Status |
|-----|---------|--------|
| NIP-01 | Basic protocol, events | ✅ Full |
| NIP-17 | Private DMs (encrypted) | ✅ Full |
| NIP-28 | Public chat channels | ✅ Full |
| NIP-42 | Relay authentication | ✅ Full |
| NIP-44 | Modern encryption | ✅ Full |
| NIP-52 | Calendar events | ✅ Full |
| NIP-59 | Gift wrapping | ✅ Full |

---

## Development

### Available Commands

```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run build              # Build for production
npm run preview            # Preview production build locally

# Testing
npm run test               # Run all unit tests (Vitest)
npm run test:e2e           # Run Playwright e2e tests
npm run test:e2e:ui        # Run e2e tests with UI
npm run test:e2e:headed    # Run e2e tests in headed mode
npm run test:e2e:debug     # Debug e2e tests

# Code Quality
npm run check              # TypeScript type checking
npm run lint               # Run ESLint and Prettier checks
npm run format             # Auto-format code
npm run typecheck          # Full type checking

# Validation
npm run validate           # Run all checks: lint, typecheck, test
npm run validate:docs      # Validate documentation
npm run validate:docs:links  # Check markdown links
npm run validate:docs:mermaid # Validate Mermaid diagrams
```

### Testing Strategy

**Unit Tests (Vitest)**
- Component tests with happy path and edge cases
- Service layer tests (embeddings, encryption)
- Store tests (state management)
- 90%+ code coverage target

**Integration Tests**
- API contract validation
- Nostr relay communication
- Database operations
- Cross-service workflows

**E2E Tests (Playwright)**
- Full user journeys (create account → send message)
- Channel navigation
- DM workflows
- Event RSVP
- Mobile responsiveness
- Multi-browser testing (Chromium, Firefox, WebKit)

**Running Tests**
```bash
# Unit tests with coverage
npm run test -- --coverage

# E2E tests on specific browser
npm run test:e2e:chromium

# E2E tests with visual output
npm run test:e2e:headed
```

---

## Service Dependencies

### Nostr Relay Service
The core message transport. Stores and broadcasts Nostr events.

**Location:** `/services/nostr-relay`

**Features:**
- WebSocket support for real-time messaging
- NIP-01 and NIP-42 support
- Event storage and filtering
- Rate limiting and authentication

**Health Check:**
```bash
curl wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev/health
```

### Embedding API Service
Generates vector embeddings for semantic search.

**Location:** `/services/embedding-api`

**Technology:** FastAPI (Python)
- Model: sentence-transformers/all-MiniLM-L6-v2
- Output: 384-dimensional vectors
- Endpoint: `/embed` (POST)

**Usage:**
```bash
curl -X POST https://embedding-api-617806532906.us-central1.run.app/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "hello world"}'
```

### Image API Service
Handles image uploads, optimization, and storage.

**Location:** `/services/image-api`

**Features:**
- Image upload and validation
- Automatic optimization (resize, compress)
- Cloud Storage integration
- CDN delivery

### Link Preview API Service
Generates rich previews for shared links.

**Location:** `/services/link-preview-api`

**Features:**
- Open Graph metadata extraction
- Fallback to generic preview
- Security validation

---

## Deployment

### Local Deployment (Docker)

```bash
# Start all services locally
docker-compose -f docker-compose.yml.local up

# Services available at:
# App: http://localhost:5173
# Relay: ws://localhost:8081
# Embedding API: http://localhost:8000
# Image API: http://localhost:8001
```

### Production Deployment (Google Cloud)

```bash
# Set project
gcloud config set project <your-project>

# Deploy frontend to Cloud Run
gcloud run deploy community-forum \
  --source . \
  --platform managed \
  --region us-central1

# Deploy relay service
cd services/nostr-relay
gcloud run deploy nostr-relay --source .

# Deploy embedding API
cd services/embedding-api
gcloud run deploy embedding-api --source .
```

**Cost Estimate:** $0-5/month on free tier (100k messages)

---

## Contributing

### Development Workflow

1. Create feature branch from `main`
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. Make changes following code style
   ```bash
   npm run format  # Auto-format code
   npm run check   # Verify types
   ```

3. Write tests for new features
   ```bash
   # Add unit tests in src/lib/__tests__/
   # Add e2e tests in tests/e2e/
   npm run test    # Verify tests pass
   ```

4. Commit with conventional commits
   ```bash
   git commit -m 'feat: add amazing feature'
   # or
   git commit -m 'fix: resolve critical issue'
   git commit -m 'docs: update API documentation'
   git commit -m 'test: add coverage for edge case'
   ```

5. Open Pull Request
   - Reference related issues
   - Describe changes and testing
   - Request review from maintainers

### Code Standards

- **TypeScript** - Strict mode enabled
- **Formatting** - Prettier (auto-formatted on commit)
- **Linting** - ESLint with svelte plugin
- **Testing** - Minimum 80% coverage for new code
- **Naming** - camelCase for functions/variables, PascalCase for components

### Issue Labels

- `good first issue` - Perfect for new contributors
- `help wanted` - Ready for community contribution
- `bug` - Confirmed bug reports
- `enhancement` - Feature requests
- `documentation` - Docs improvements needed

---

## Security & Privacy

### Encryption Standards

| Message Type | Encryption | Standard |
|--------------|-----------|----------|
| Private DMs | End-to-end | NIP-44 (ChaCha20-Poly1305) |
| Gift Wrapping | Hidden sender/timestamp | NIP-59 |
| Public Messages | Transport only | TLS 1.3 |

### What Can Administrators See?

✅ **Can see:**
- Public channel messages
- Member lists and profiles
- Event attendance data
- Zone moderation info

❌ **Cannot see:**
- Private DM content (encrypted)
- Your private key or recovery phrase
- Messages in zones they don't administrate
- Other users' devices/locations

### Key Security Features

- **Cryptographic Identity** - Derived from BIP39 seed phrase
- **No Central Authority** - Relay can't read private messages
- **Rate Limiting** - Prevents spam and abuse
- **Input Validation** - All user inputs sanitized
- **Dependency Audit** - Regular security updates

### Reporting Security Issues

Found a vulnerability? Report privately via [GitHub Security Advisories](https://github.com/jjohare/Nostr-BBS/security/advisories/new)

**Do not** open public issues for security vulnerabilities.

---

## Performance & Scaling

### Optimization Techniques

- **Code Splitting** - Lazy-load routes and components
- **Vector Search** - HNSW indexing for O(log n) semantic search
- **Compression** - WASM bindings for performance-critical paths
- **Caching** - IndexedDB for offline, HTTP caching for assets
- **Web Workers** - Offload encryption to background thread

### Performance Targets

- **First Contentful Paint** - < 2s on 3G
- **Time to Interactive** - < 5s on 3G
- **Vector Search** - < 100ms for 10k embeddings
- **Message Send** - < 500ms from compose to relay
- **App Size** - < 500KB gzipped (with lazy loading)

---

## Documentation

### For Users
- [Getting Started Guide](docs/user/getting-started.md)
- [Privacy & Safety](docs/user/safety/privacy.md)
- [Account Security](docs/user/safety/account-security.md)
- [Mobile Installation](docs/user/platforms/mobile.md)

### For Developers
- [Development Setup](docs/developer/getting-started/development-setup.md)
- [Project Structure](docs/developer/getting-started/project-structure.md)
- [System Architecture](docs/developer/architecture/index.md)
- [Component Guide](docs/developer/architecture/components.md)
- [Data Flow](docs/developer/architecture/data-flow.md)
- [NIP Protocol Reference](docs/developer/reference/nip-protocol-reference.md)
- [Testing Guide](docs/developer/contributing/testing.md)
- [Code Style Guide](docs/developer/contributing/code-style.md)

### For Administrators
- [Admin Guide](docs/admin-guide.md)
- [Relay Configuration](docs/deployment/relay-setup.md)
- [Deployment Guide](docs/deployment/index.md)

---

## Community

- **GitHub Issues** - [Report bugs and request features](https://github.com/jjohare/Nostr-BBS/issues)
- **GitHub Discussions** - [Ask questions and discuss ideas](https://github.com/jjohare/Nostr-BBS/discussions)
- **Nostr Community** - Connect via Nostr using your pubkey
- **Code of Conduct** - Be respectful, inclusive, and constructive

---

## License

MIT License - See [LICENSE](LICENSE) for details.

This project is free and open-source. Use it for any purpose, commercial or personal.

---

## Acknowledgments

Built with:
- [Nostr Protocol](https://nostr.com) - Decentralized protocol specification
- [NDK](https://github.com/nostr-dev-kit/ndk) - Nostr Dev Kit
- [SvelteKit](https://kit.svelte.dev) - Modern meta-framework
- [TailwindCSS](https://tailwindcss.com) - Utility-first CSS
- [DaisyUI](https://daisyui.com) - Component library
- [Playwright](https://playwright.dev) - Browser automation
- [Vitest](https://vitest.dev) - Unit testing framework

---

**Made with privacy in mind for communities that value it.**
