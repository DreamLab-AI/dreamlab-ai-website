# Documentation Structure Map

**Last Updated**: 2026-01-25
**Version**: 1.0 (Post-Consolidation)
**Purpose**: Master reference for all documentation across DreamLab AI platform

---

## Table of Contents

1. [Documentation Tree](#documentation-tree)
2. [Directory Purpose & Ownership](#directory-purpose--ownership)
3. [File Naming Conventions](#file-naming-conventions)
4. [Content Guidelines by Type](#content-guidelines-by-type)
5. [Cross-References & Single Source of Truth](#cross-references--single-source-of-truth)
6. [Adding New Documentation](#adding-new-documentation)
7. [Maintenance Responsibilities](#maintenance-responsibilities)

---

## Documentation Tree

```
project2/
├── docs/                                    # PRIMARY: Main documentation
│   ├── README.md                            # Docs index & quick links
│   ├── index.md                             # MkDocs homepage
│   ├── CONTRIBUTING.md                      # Contribution guidelines
│   ├── QUICK_REFERENCE.md                   # Fast lookup reference
│   │
│   ├── adr/                                 # Architecture Decision Records
│   │   ├── README.md                        # ADR index
│   │   ├── 000-template.md                  # Template for new ADRs
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
│   ├── api/                                 # API Documentation (Deprecated)
│   │   ├── EMBEDDING_SERVICE.md             # Legacy - see architecture/BACKEND_SERVICES.md
│   │   ├── NOSTR_RELAY.md                   # Legacy - see architecture/BACKEND_SERVICES.md
│   │   └── SUPABASE_SCHEMA.md               # Legacy - see architecture/BACKEND_SERVICES.md
│   │
│   ├── architecture/                        # CANONICAL: System Architecture
│   │   ├── README.md                        # Architecture overview & index
│   │   ├── SYSTEM_OVERVIEW.md               # High-level system design
│   │   ├── BACKEND_SERVICES.md              # Backend services architecture
│   │   │                                    # (Replaces api/* documentation)
│   │   ├── FRONTEND_ARCHITECTURE.md         # SvelteKit + React frontend
│   │   ├── DATA_FLOW.md                     # Data flow diagrams
│   │   └── DEPLOYMENT.md                    # Deployment architecture
│   │
│   ├── ddd/                                 # Domain-Driven Design
│   │   ├── README.md                        # DDD overview
│   │   ├── 01-domain-model.md               # Domain model definitions
│   │   ├── 02-bounded-contexts.md           # Bounded contexts & relationships
│   │   ├── 03-aggregates.md                 # Aggregate root definitions
│   │   ├── 04-domain-events.md              # Domain events & patterns
│   │   ├── 05-value-objects.md              # Value objects
│   │   └── 06-ubiquitous-language.md        # Ubiquitous language glossary
│   │
│   ├── deployment/                          # Deployment & Operations
│   │   ├── README.md                        # Deployment overview
│   │   ├── ENVIRONMENTS.md                  # Environment configuration
│   │   ├── CLOUD_SERVICES.md                # GCP Cloud Run, Supabase, Storage
│   │   ├── GITHUB_PAGES.md                  # Static site deployment
│   │   ├── MONITORING.md                    # Monitoring & observability
│   │   └── ROLLBACK.md                      # Rollback procedures
│   │
│   ├── developer/                           # CANONICAL: Developer Guide
│   │   ├── README.md                        # Developer guide index
│   │   ├── GETTING_STARTED.md               # First-time setup
│   │   ├── DEVELOPMENT_WORKFLOW.md          # Daily development process
│   │   ├── CODE_STYLE.md                    # Code standards & conventions
│   │   ├── COMPONENT_DEVELOPMENT.md         # Building components
│   │   ├── TESTING_GUIDE.md                 # Testing strategies
│   │   ├── DEBUGGING.md                     # Debugging techniques
│   │   │
│   │   ├── architecture/                    # Developer-focused architecture
│   │   │   ├── index.md                     # Quick reference
│   │   │   ├── components.md                # Component architecture
│   │   │   ├── data-flow.md                 # Data flow for developers
│   │   │   └── security.md                  # Security considerations
│   │   │
│   │   └── contributing/                    # Contribution process
│   │       ├── index.md                     # Contributing overview
│   │       ├── code-style.md                # Code style rules
│   │       ├── pull-requests.md             # PR guidelines
│   │       └── testing.md                   # Testing requirements
│   │
│   ├── features/                            # Feature Documentation
│   │   ├── authentication.md                # Auth system & NIP-based auth
│   │   ├── dm-implementation.md             # Direct messaging system
│   │   ├── mobile-ui-components.md          # Mobile-specific components
│   │   └── secure-clipboard.md              # Secure clipboard feature
│   │
│   ├── guides/                              # User & Developer Guides
│   │   └── quick-start.md                   # Quick start guide
│   │
│   ├── reference/                           # API & Technical Reference
│   │   ├── api-reference.md                 # API endpoints reference
│   │   ├── architecture-reference.md        # Architecture reference
│   │   └── authentication.md                # Auth API reference
│   │
│   ├── security/                            # Security Documentation
│   │   ├── README.md                        # Security overview
│   │   ├── SECURITY_OVERVIEW.md             # Security framework
│   │   ├── AUTHENTICATION.md                # Authentication implementation
│   │   ├── DATA_PROTECTION.md               # Data protection measures
│   │   ├── VULNERABILITY_MANAGEMENT.md      # Vulnerability handling
│   │   ├── security-audit-report.md         # Latest security audit
│   │   ├── security-audit.md                # Audit procedures
│   │   ├── admin-security.md                # Admin panel security
│   │   ├── quick-reference.md               # Security checklist
│   │   └── summary.md                       # Executive summary
│   │
│   ├── user/                                # CANONICAL: User Documentation
│   │   ├── README.md                        # User guide index
│   │   ├── INDEX.md                         # Comprehensive user index
│   │   ├── FAQ.md                           # Frequently asked questions
│   │   ├── NOSTR_SETUP.md                   # Nostr wallet & setup
│   │   ├── WEBSITE_GUIDE.md                 # Website navigation guide
│   │   └── WORKSHOP_BOOKING.md              # Workshop booking process
│   │
│   ├── prd.md                               # Product Requirements Document
│   ├── architecture.md                      # Architecture overview
│   ├── user-guide.md                        # User guide summary
│   ├── DOCUMENTATION_SUMMARY.md             # Consolidation summary
│   ├── validation-report.md                 # Validation & QA report
│   │
│   ├── screenshots/                         # Screenshot resources
│   └── scripts/                             # Documentation build scripts
│
└── community-forum/                         # SECONDARY: Forum-specific docs
    ├── README.md                            # Forum overview
    │
    ├── services/
    │   ├── embedding-api/README.md          # Embedding service
    │   │
    │   └── nostr-relay/
    │       ├── README.md                    # Relay service overview
    │       └── docs/                        # Relay service documentation
    │           ├── API.md                   # Relay API
    │           ├── ARCHITECTURE.md          # Relay architecture
    │           ├── DEPLOYMENT.md            # Relay deployment
    │           └── DEVELOPMENT.md           # Relay development
    │
    ├── src/
    │   ├── docs/                            # UI & Implementation docs
    │   │   ├── toast-architecture.md        # Toast notification system
    │   │   ├── toast-implementation-summary.md
    │   │   ├── toast-migration-guide.md
    │   │   ├── toast-quick-reference.md
    │   │   └── toast-usage-examples.md
    │   │
    │   ├── lib/
    │   │   ├── components/auth/README.md    # Auth component docs
    │   │   └── nostr/README.md              # Nostr lib docs
    │   │
    │   └── docs/                            # Component documentation
    │
    ├── tests/                               # Test Documentation
    │   ├── README.md                        # Test suite overview
    │   ├── e2e/README.md                    # E2E testing guide
    │   ├── e2e/QUICKSTART.md                # E2E quick start
    │   ├── semantic/TEST_COVERAGE.md        # Coverage report
    │   ├── performance/PERFORMANCE_REPORT.md # Performance analysis
    │   ├── qa-screenshots/QA-SUMMARY.md     # QA visual summary
    │   ├── MOBILE-TESTING-QUICKSTART.md     # Mobile testing guide
    │   ├── manual-mobile-test.md            # Manual mobile tests
    │   └── [other QA reports]               # Various test reports
    │
    ├── working/                             # Working Documentation (Temp)
    │   ├── content-cleaning-report.md       # Content cleanup work
    │   ├── corpus-analysis.md               # Analysis work
    │   └── reference-consolidation-report.md # Consolidation notes
    │
    ├── task.md                              # Task tracking
    └── [Static Build Output]                # Generated from SvelteKit build
```

---

## Directory Purpose & Ownership

### Primary Documentation (`/docs`)

| Directory | Purpose | Owner | Update Frequency |
|-----------|---------|-------|------------------|
| **adr/** | Architecture decisions with rationale | Tech Lead | On decision |
| **architecture/** | System design & technical specs | Architect | Quarterly |
| **ddd/** | Domain model & bounded contexts | Domain Expert | As needed |
| **deployment/** | Environment, CI/CD, monitoring | DevOps/SRE | Monthly |
| **developer/** | Setup, workflow, coding standards | Lead Developer | Monthly |
| **features/** | Feature implementation details | Product/Dev | Feature release |
| **guides/** | User & developer quick starts | Product Manager | Monthly |
| **reference/** | API & technical reference | Tech Lead | Per API change |
| **security/** | Auth, data protection, audits | Security Lead | Monthly |
| **user/** | User guides, tutorials, FAQs | Support/Product | Monthly |

### Secondary Documentation (`/community-forum`)

| Directory | Purpose | Owner | Update Frequency |
|-----------|---------|-------|------------------|
| **services/** | Service-specific documentation | Backend Lead | Per service |
| **src/docs/** | UI implementation details | Frontend Lead | Per feature |
| **tests/** | QA reports & testing guides | QA Lead | Per release |
| **working/** | Temporary analysis & notes | Project Team | As needed |

---

## File Naming Conventions

### Markdown Files

**Primary Documentation** (`/docs`):
- `README.md` - Directory index (always first)
- `UPPERCASE_WITH_UNDERSCORES.md` - Major topics (e.g., `GETTING_STARTED.md`)
- `lowercase-with-hyphens.md` - Subtopics (e.g., `pull-requests.md`)
- `NN-slug-format.md` - Numbered sequences (e.g., `01-domain-model.md`)

**Secondary Documentation** (`/community-forum`):
- `UPPERCASE.md` - Service/component overviews
- `lowercase-kebab.md` - Implementation details
- `report.md` or `summary.md` - Analysis/QA documents

### Special Files

- `STRUCTURE.md` - This file (master reference)
- `CONTRIBUTING.md` - Contribution guidelines
- `DOCUMENTATION_SUMMARY.md` - Consolidation notes
- `QUICK_REFERENCE.md` - Fast lookup reference

---

## Content Guidelines by Type

### Architecture Decision Records (ADR)

**Location**: `/docs/adr/`
**Format**:
```markdown
# ADR-NNN: Decision Title

## Status
Accepted | Proposed | Deprecated

## Context
Background and problem statement

## Decision
What was decided and why

## Consequences
Positive & negative impacts

## Alternatives Considered
Other options evaluated

## References
Related decisions, docs, issues
```

**Update**: Only when decision changes or is deprecated

---

### Architecture Documentation

**Location**: `/docs/architecture/`
**Types**:
- **System Overview**: High-level architecture, component interactions
- **Backend Services**: API specs, service architecture, data models
- **Frontend Architecture**: Client-side structure, state management
- **Data Flow**: Request/response flows, data transformations
- **Deployment**: Infrastructure, environments, CI/CD

**Update**: When architecture changes or quarterly review

---

### Developer Guides

**Location**: `/docs/developer/`
**Types**:
- **Getting Started**: Environment setup, dependencies, first run
- **Development Workflow**: Daily tasks, Git workflow, code review
- **Code Style**: Conventions, linting, formatting rules
- **Component Development**: React/Svelte component patterns
- **Testing**: Unit, integration, E2E strategies
- **Debugging**: Tools, techniques, common issues

**Update**: When process changes or new tool introduced

---

### Security Documentation

**Location**: `/docs/security/`
**Types**:
- **Security Overview**: Security framework, principles, threat model
- **Authentication**: Auth mechanisms, NIP-98, session management
- **Data Protection**: Encryption, PII handling, storage security
- **Audit Reports**: Security assessments, findings, remediation

**Update**: Quarterly audits, immediately for vulnerabilities

---

### User Documentation

**Location**: `/docs/user/`
**Types**:
- **User Guide**: Feature walkthroughs, how-to guides
- **FAQ**: Common questions and troubleshooting
- **Nostr Setup**: Wallet configuration, key management
- **Workshop Booking**: Booking process, prerequisites

**Update**: When features change or user feedback indicates gaps

---

### Test Documentation

**Location**: `/community-forum/tests/`
**Types**:
- **E2E Tests**: User journey testing, test quickstart
- **QA Reports**: Test results, coverage, issues found
- **Performance Reports**: Load testing, optimization findings
- **Mobile Testing**: Mobile-specific test cases, device compatibility

**Update**: Per test run, QA reports per release

---

## Cross-References & Single Source of Truth

### Canonical Documentation Locations

To prevent duplication and ensure consistency:

| Topic | Canonical Location | Mirror/Legacy Locations |
|-------|-------------------|------------------------|
| Backend Service APIs | `/docs/architecture/BACKEND_SERVICES.md` | `/docs/api/*` (deprecated) |
| Frontend Architecture | `/docs/architecture/FRONTEND_ARCHITECTURE.md` | `/developer/architecture/components.md` (mirror) |
| Auth Implementation | `/docs/security/AUTHENTICATION.md` | `/docs/reference/authentication.md` (mirror) |
| Development Setup | `/docs/developer/GETTING_STARTED.md` | `/community-forum/services/*/DEVELOPMENT.md` (service-specific) |
| Data Flow | `/docs/architecture/DATA_FLOW.md` | `/developer/architecture/data-flow.md` (mirror) |
| User Guides | `/docs/user/` | `/docs/guides/` (mirrors) |

### Reference Standards

**When to Link**:
```markdown
// DO: Link to canonical source
See [Backend Services Architecture](/docs/architecture/BACKEND_SERVICES.md#embedding-service)

// DON'T: Duplicate information
The embedding service uses FastAPI...
```

**When to Mirror**:
```markdown
// DO: Mirror for developer convenience in developer docs
// developer/architecture/components.md mirrors architecture/FRONTEND_ARCHITECTURE.md

## Frontend Component Architecture
See canonical version at [Architecture - Frontend](/docs/architecture/FRONTEND_ARCHITECTURE.md)

Quick summary for developers:
- [Your quick summary here]
```

---

## Adding New Documentation

### Workflow

1. **Determine Type & Location**
   - Feature docs → `/docs/features/`
   - Backend changes → `/docs/architecture/` + `/community-forum/services/`
   - User-facing → `/docs/user/`
   - Development → `/docs/developer/`

2. **Check for Existing Content**
   - Search `/docs/STRUCTURE.md` for similar topics
   - Link to canonical source if it exists
   - Only create new if no canonical version

3. **Follow Naming Convention**
   - Use kebab-case for subtopics
   - Use UPPERCASE for major sections
   - Add to appropriate `README.md`

4. **Create in Correct Directory**
   ```bash
   # Example: New feature documentation
   touch /docs/features/new-feature-name.md
   ```

5. **Link from Parent README**
   ```markdown
   ## Features
   - [New Feature](features/new-feature-name.md)
   ```

6. **Update STRUCTURE.md**
   - Add new file to tree
   - Update ownership table if needed
   - Add cross-references if applicable

### Checklist for New Documentation

- [ ] File follows naming convention
- [ ] Content follows appropriate format (ADR, API, etc.)
- [ ] Links use relative paths: `[text](path/to/file.md)`
- [ ] Canonical location identified (no duplicates)
- [ ] Mirrors created if needed
- [ ] Parent `README.md` updated
- [ ] `STRUCTURE.md` updated
- [ ] Cross-references documented
- [ ] Owner and update frequency assigned

---

## Maintenance Responsibilities

### Monthly Reviews

- **Developer Lead**: Review `/docs/developer/` for currency
- **Product Manager**: Review `/docs/user/` & `/docs/guides/`
- **Architect**: Review `/docs/architecture/` & `/docs/reference/`
- **Security Lead**: Review `/docs/security/` for audit updates

### Quarterly Full Audits

**Process**:
1. Check all files for broken links
2. Update `DOCUMENTATION_SUMMARY.md` with changes
3. Review cross-references for accuracy
4. Ensure no duplicate content
5. Verify ownership & update frequency assignments

**Run Check**:
```bash
# Find broken links (requires linkchecker)
linkchecker /docs/

# Find documentation without parents
grep -r "^#" docs/**/*.md | grep -v "README"
```

### Consolidation Rules

**DO**:
- Link to canonical sources
- Keep developer mirrors for convenience
- Update STRUCTURE.md when adding docs
- Update README.md in parent directory

**DON'T**:
- Create duplicate documentation
- Leave documentation orphaned
- Update multiple copies of same content
- Create docs in root directory

---

## Quick Navigation

- **Getting Started**: [`/docs/developer/GETTING_STARTED.md`](/developer/GETTING_STARTED.md)
- **Architecture Overview**: [`/docs/architecture/SYSTEM_OVERVIEW.md`](/architecture/SYSTEM_OVERVIEW.md)
- **Security**: [`/docs/security/SECURITY_OVERVIEW.md`](/security/SECURITY_OVERVIEW.md)
- **User Guide**: [`/docs/user/README.md`](/user/README.md)
- **Contributing**: [`/CONTRIBUTING.md`](/CONTRIBUTING.md)

---

## Consolidation Summary

This structure map was created following consolidation of:
- **Forum Service Docs** → Merged into `/docs/architecture/`
- **API Documentation** → Consolidated into `/docs/architecture/BACKEND_SERVICES.md`
- **Legacy api/* Files** → Marked deprecated, references updated
- **Duplicate Content** → Canonical sources identified, mirrors created
- **Orphaned Docs** → Reparented to appropriate categories

See [`DOCUMENTATION_SUMMARY.md`](/DOCUMENTATION_SUMMARY.md) for detailed consolidation notes.

---

**Document Version**: 1.0
**Last Modified**: 2026-01-25
**Next Review**: 2026-04-25
**Owner**: Documentation Maintenance Team
