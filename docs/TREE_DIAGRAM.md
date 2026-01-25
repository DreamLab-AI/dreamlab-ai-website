# Documentation Tree Diagram

**Quick Visual Reference** - For detailed information see [`STRUCTURE.md`](STRUCTURE.md)

---

## Complete Documentation Tree

```
dreamlab-ai/
│
├── PROJECT ROOT DOCS
│   ├── README.md                          # Project overview & tech stack
│   ├── task.md                            # Technical task tracking
│   ├── .pages.yml                         # MkDocs navigation config
│   └── CNAME                              # DNS configuration
│
├── docs/                                  [PRIMARY DOCUMENTATION]
│   │
│   ├── 📋 INDEX & REFERENCE
│   │   ├── README.md                      ⭐ Docs home & quick links
│   │   ├── index.md                       # MkDocs landing page
│   │   ├── STRUCTURE.md                   ⭐ THIS FILE - Master structure
│   │   ├── TREE_DIAGRAM.md                # Visual tree (this file)
│   │   ├── QUICK_REFERENCE.md             # Fast lookup checklists
│   │   ├── DOCUMENTATION_SUMMARY.md       # Consolidation notes
│   │   ├── CONTRIBUTING.md                # How to contribute
│   │   └── validation-report.md           # QA & validation results
│   │
│   ├── 🏗️  ARCHITECTURE (8 files)
│   │   ├── README.md                      ⭐ Architecture overview
│   │   ├── SYSTEM_OVERVIEW.md             # High-level design
│   │   ├── BACKEND_SERVICES.md            # APIs, services, models
│   │   ├── FRONTEND_ARCHITECTURE.md       # Client-side design
│   │   ├── DATA_FLOW.md                   # Request/response flows
│   │   ├── DEPLOYMENT.md                  # Infrastructure design
│   │   ├── architecture.md                # Legacy - redirect to README
│   │   └── 📂 (Deprecated)
│   │       ├── api/EMBEDDING_SERVICE.md   # Legacy - see BACKEND_SERVICES
│   │       ├── api/NOSTR_RELAY.md         # Legacy - see BACKEND_SERVICES
│   │       └── api/SUPABASE_SCHEMA.md     # Legacy - see BACKEND_SERVICES
│   │
│   ├── 🎯 DECISIONS (11 files)
│   │   ├── README.md                      ⭐ ADR overview & index
│   │   ├── 000-template.md                # Template for new ADRs
│   │   ├── 001-nostr-protocol-foundation.md
│   │   ├── 002-three-tier-hierarchy.md
│   │   ├── 003-gcp-cloud-run-infrastructure.md
│   │   ├── 004-zone-based-access-control.md
│   │   ├── 005-nip-44-encryption-mandate.md
│   │   ├── 006-client-side-wasm-search.md
│   │   ├── 007-sveltekit-ndk-frontend.md
│   │   ├── 008-postgresql-relay-storage.md
│   │   └── 009-user-registration-flow.md
│   │
│   ├── 📐 DOMAIN DESIGN (8 files)
│   │   ├── README.md                      ⭐ DDD overview
│   │   ├── 01-domain-model.md             # Entity & value definitions
│   │   ├── 02-bounded-contexts.md         # Context boundaries
│   │   ├── 03-aggregates.md               # Aggregate roots
│   │   ├── 04-domain-events.md            # Event patterns
│   │   ├── 05-value-objects.md            # Value object definitions
│   │   ├── 06-ubiquitous-language.md      # Business terminology
│   │   └── prd.md                         # Product requirements
│   │
│   ├── 🚀 DEPLOYMENT (6 files)
│   │   ├── README.md                      ⭐ Deployment overview
│   │   ├── ENVIRONMENTS.md                # Dev, staging, production
│   │   ├── CLOUD_SERVICES.md              # GCP, Supabase, Storage
│   │   ├── GITHUB_PAGES.md                # Static site deployment
│   │   ├── MONITORING.md                  # Observability & alerting
│   │   └── ROLLBACK.md                    # Recovery procedures
│   │
│   ├── 👨‍💻 DEVELOPER GUIDE (13+ files)
│   │   ├── README.md                      ⭐ Developer overview
│   │   ├── GETTING_STARTED.md             # Setup & installation
│   │   ├── DEVELOPMENT_WORKFLOW.md        # Daily workflow
│   │   ├── CODE_STYLE.md                  # Conventions & linting
│   │   ├── COMPONENT_DEVELOPMENT.md       # Building components
│   │   ├── TESTING_GUIDE.md               # Testing strategies
│   │   ├── DEBUGGING.md                   # Debugging tips
│   │   │
│   │   ├── 📁 architecture/ (4 files)
│   │   │   ├── index.md                   # Developer arch quick ref
│   │   │   ├── components.md              # Component patterns
│   │   │   ├── data-flow.md               # Dev-focused data flow
│   │   │   └── security.md                # Dev security checklist
│   │   │
│   │   └── 📁 contributing/ (4 files)
│   │       ├── index.md                   # Contributing process
│   │       ├── code-style.md              # PR code requirements
│   │       ├── pull-requests.md           # PR guidelines
│   │       └── testing.md                 # Test requirements
│   │
│   ├── ✨ FEATURES (4 files)
│   │   ├── authentication.md              # Auth & NIP-based systems
│   │   ├── dm-implementation.md           # Direct messaging
│   │   ├── mobile-ui-components.md        # Mobile components
│   │   └── secure-clipboard.md            # Clipboard security
│   │
│   ├── 📖 GUIDES (1+ file)
│   │   └── quick-start.md                 # Getting started quickly
│   │
│   ├── 📚 REFERENCE (3 files)
│   │   ├── api-reference.md               # API endpoints
│   │   ├── architecture-reference.md      # Architecture quick ref
│   │   └── authentication.md              # Auth API reference
│   │
│   ├── 🔒 SECURITY (9 files)
│   │   ├── README.md                      ⭐ Security overview
│   │   ├── SECURITY_OVERVIEW.md           # Framework & principles
│   │   ├── AUTHENTICATION.md              # Implementation details
│   │   ├── DATA_PROTECTION.md             # Encryption & handling
│   │   ├── VULNERABILITY_MANAGEMENT.md    # Incident handling
│   │   ├── security-audit-report.md       # Latest audit (2026-01)
│   │   ├── security-audit.md              # Audit procedures
│   │   ├── admin-security.md              # Admin panel security
│   │   ├── quick-reference.md             # Security checklist
│   │   └── summary.md                     # Executive summary
│   │
│   ├── 👥 USER GUIDE (6+ files)
│   │   ├── README.md                      ⭐ User guide home
│   │   ├── INDEX.md                       # Comprehensive index
│   │   ├── FAQ.md                         # Common questions
│   │   ├── NOSTR_SETUP.md                 # Wallet setup
│   │   ├── WEBSITE_GUIDE.md               # Site navigation
│   │   └── WORKSHOP_BOOKING.md            # Booking process
│   │
│   ├── user-guide.md                      # Legacy user guide
│   │
│   └── 📁 RESOURCES
│       ├── screenshots/                   # Screenshot library
│       └── scripts/                       # Build & maintenance scripts
│
└── community-forum/                       [SECONDARY DOCUMENTATION]
    │
    ├── README.md                          # Forum service overview
    ├── task.md                            # Forum task tracking
    │
    ├── 🔧 SERVICES (documentation)
    │   ├── 📁 embedding-api/
    │   │   └── README.md                  # Embedding service docs
    │   │
    │   └── 📁 nostr-relay/ (5 files)
    │       ├── README.md                  ⭐ Relay service overview
    │       └── 📁 docs/
    │           ├── API.md                 # Relay API endpoints
    │           ├── ARCHITECTURE.md        # Relay design
    │           ├── DEPLOYMENT.md          # Relay deployment
    │           └── DEVELOPMENT.md         # Relay development guide
    │
    ├── 💻 SOURCE CODE DOCS
    │   ├── 📁 src/
    │   │   ├── 📁 docs/ (5 files)
    │   │   │   ├── toast-architecture.md  # Toast system design
    │   │   │   ├── toast-implementation-summary.md
    │   │   │   ├── toast-migration-guide.md
    │   │   │   ├── toast-quick-reference.md
    │   │   │   └── toast-usage-examples.md
    │   │   │
    │   │   ├── 📁 lib/
    │   │   │   ├── components/auth/README.md
    │   │   │   └── nostr/README.md
    │   │   │
    │   │   └── [component-level docs]
    │   │
    │   └── 📁 tests/ (30+ QA files)
    │       ├── README.md                  # Test overview
    │       ├── MOBILE-TESTING-QUICKSTART.md
    │       ├── manual-mobile-test.md
    │       ├── MOBILE-QA-DELIVERABLES.md
    │       ├── MOBILE-BUG-TEMPLATE.md
    │       ├── QA-FLEET-COMPREHENSIVE-REPORT.md
    │       ├── QA-RECOMMENDATIONS-PRIORITY-LIST.md
    │       │
    │       ├── 📁 e2e/ (3 files)
    │       │   ├── README.md
    │       │   ├── QUICKSTART.md
    │       │   └── E2E_TEST_SUMMARY.md
    │       │
    │       ├── 📁 semantic/ (3 files)
    │       │   ├── TEST_COVERAGE.md
    │       │   ├── code-quality-report.md
    │       │   └── integration-validation.md
    │       │
    │       ├── 📁 performance/ (1 file)
    │       │   └── PERFORMANCE_REPORT.md
    │       │
    │       ├── 📁 qa-screenshots/ (1 file)
    │       │   └── QA-SUMMARY.md
    │       │
    │       ├── 📁 qa-synthetic/ (1 file)
    │       │   └── QA-REPORT.md
    │       │
    │       ├── 📁 screenshots/
    │       │   └── qe-audit/
    │       │       └── accessibility/
    │       │           └── audit-summary.md
    │       │
    │       └── [various audit & test reports]
    │
    └── 🔨 WORKING (temporary)
        ├── content-cleaning-report.md    # Cleanup work
        ├── corpus-analysis.md            # Analysis work
        └── reference-consolidation-report.md # Consolidation notes
```

---

## Directory Levels Explained

### Level 1: Primary Collections

```
docs/                 → Official documentation (canonical)
community-forum/      → Service-specific docs (secondary)
```

### Level 2: Categories

```
/adr/                 → Architectural decisions (stable)
/architecture/        → System design & specs (canonical)
/developer/           → Development guides (canonical)
/deployment/          → DevOps & infrastructure
/security/            → Security & compliance
/user/                → End-user guides
/features/            → Feature-specific docs
/reference/           → Quick lookup & APIs
/ddd/                 → Domain design patterns
```

### Level 3: Subcategories (where applicable)

```
/developer/
  ├── [root level files]     → Main developer docs
  ├── architecture/          → Developer-focused architecture
  └── contributing/          → Contributing guidelines

/community-forum/tests/
  ├── [root level files]     → Test overview
  ├── e2e/                   → End-to-end tests
  ├── semantic/              → Code quality tests
  └── performance/           → Performance tests
```

---

## File Count by Category

| Category | Files | Type | Status |
|----------|-------|------|--------|
| **adr/** | 11 | Decisions | Active |
| **architecture/** | 8 | Technical | Active |
| **ddd/** | 8 | Design | Active |
| **deployment/** | 6 | Operations | Active |
| **developer/** | 13+ | Guides | Active |
| **features/** | 4 | Features | Active |
| **guides/** | 1+ | Guides | Active |
| **reference/** | 3 | Reference | Active |
| **security/** | 9 | Security | Active |
| **user/** | 6+ | User Guides | Active |
| **API (legacy)/** | 3 | Deprecated | Deprecated |
| **forum services/** | 9 | Services | Active |
| **forum tests/** | 30+ | QA/Tests | Active |
| **TOTAL** | **110+** | Mixed | — |

---

## Color-Coded Legend

```
⭐ = Primary entry point for category
📁 = Directory/folder
📋 = Index/reference files
🏗️  = Architecture documentation
🎯 = Decision records
📐 = Domain-driven design
🚀 = Deployment & operations
👨‍💻 = Developer guides
✨ = Features
📖 = Guides & tutorials
📚 = Reference materials
🔒 = Security documentation
👥 = User guides
🔧 = Services documentation
💻 = Code documentation
📁 = Testing & QA
🔨 = Working/temporary docs
```

---

## Cross-Directory References

### Common Navigation Paths

**New Developer**:
1. [`/docs/README.md`](README.md) - Start here
2. [`/docs/developer/GETTING_STARTED.md`](developer/GETTING_STARTED.md) - Setup
3. [`/docs/architecture/SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) - Understand the system
4. [`/docs/developer/DEVELOPMENT_WORKFLOW.md`](developer/DEVELOPMENT_WORKFLOW.md) - Daily work

**Adding a Feature**:
1. [`/docs/architecture/`](architecture/) - Understand current architecture
2. [`/docs/developer/COMPONENT_DEVELOPMENT.md`](developer/COMPONENT_DEVELOPMENT.md) - Build component
3. [`/docs/developer/TESTING_GUIDE.md`](developer/TESTING_GUIDE.md) - Write tests
4. [`/docs/features/`](features/) - Document the feature

**Security Review**:
1. [`/docs/security/SECURITY_OVERVIEW.md`](security/SECURITY_OVERVIEW.md) - Framework
2. [`/docs/security/AUTHENTICATION.md`](security/AUTHENTICATION.md) - Auth details
3. [`/docs/security/security-audit-report.md`](security/security-audit-report.md) - Latest findings
4. [`/docs/developer/architecture/security.md`](developer/architecture/security.md) - Dev checklist

**Deployment Issue**:
1. [`/docs/deployment/ENVIRONMENTS.md`](deployment/ENVIRONMENTS.md) - Environment details
2. [`/docs/deployment/CLOUD_SERVICES.md`](deployment/CLOUD_SERVICES.md) - Service configs
3. [`/docs/deployment/MONITORING.md`](deployment/MONITORING.md) - Check health
4. [`/docs/deployment/ROLLBACK.md`](deployment/ROLLBACK.md) - Recovery

---

## Quick Access URLs

| Purpose | Location |
|---------|----------|
| **Start here** | `/docs/README.md` |
| **Full structure** | `/docs/STRUCTURE.md` |
| **Visual tree** | `/docs/TREE_DIAGRAM.md` (this file) |
| **Quick lookups** | `/docs/QUICK_REFERENCE.md` |
| **Dev setup** | `/docs/developer/GETTING_STARTED.md` |
| **Architecture** | `/docs/architecture/SYSTEM_OVERVIEW.md` |
| **Decisions** | `/docs/adr/README.md` |
| **Security** | `/docs/security/SECURITY_OVERVIEW.md` |
| **User help** | `/docs/user/README.md` |

---

**Diagram Version**: 1.0
**Last Updated**: 2026-01-25
**Related**: [`STRUCTURE.md`](STRUCTURE.md) | [`README.md`](README.md) | [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)
