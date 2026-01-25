# Nostr-BBS Documentation

Complete documentation hub for Nostr-BBS - A decentralised community bulletin board system built on the Nostr protocol.

**Latest Release**: 1.0.0 | **Last Updated**: 2026-01-25 | **Status**: Production Ready

---

## Quick Navigation

### For Different Audiences

#### End Users
Get started using the platform, explore features, and understand privacy/security.

- **[User Getting Started](user/getting-started/index.md)** - Create account, first steps, basic navigation
- **[User Features Guide](user/features/index.md)** - All available features and how to use them
- **[Community Zones](user/zones/index.md)** - Join and participate in community zones
- **[Safety & Privacy](user/safety/index.md)** - Account security, privacy controls, reporting

#### Developers
Understand the architecture, set up development environment, and contribute code.

- **[Developer Hub](developer/index.md)** - Main development documentation
- **[Development Setup](developer/getting-started/development-setup.md)** - Local environment configuration
- **[Architecture Overview](developer/architecture/index.md)** - System design and components
- **[Contributing Guide](developer/contributing/index.md)** - Code style, testing, pull requests
- **[API Reference](developer/reference/api.md)** - Component and store documentation

#### Operators & DevOps
Deploy, configure, and maintain the system in production.

- **[Deployment Guide](developer/deployment/index.md)** - All deployment options
- **[Cloud Run Setup](developer/deployment/cloud-run.md)** - Google Cloud Run deployment
- **[GitHub Pages Deployment](developer/deployment/github-pages.md)** - Static site hosting
- **[Self-Hosting](developer/deployment/self-hosting.md)** - Run your own instance
- **[Security Audit](security/security-audit-report.md)** - Security findings and recommendations

#### Architects & Decision Makers
Review system design, architectural decisions, and domain model.

- **[Architecture Decisions](adr/README.md)** - 9 ADRs covering all major decisions
- **[System Architecture](architecture.md)** - High-level system overview
- **[Domain Model](ddd/01-domain-model.md)** - Domain-Driven Design documentation
- **[PRD](prd.md)** - Product requirements document

---

## Documentation Structure

### Getting Started

**New to the project?** Start here:

- [User Getting Started](user/getting-started/index.md) - For end users
- [Developer Getting Started](developer/getting-started/index.md) - For developers
- [Quick Start Guide](guides/quick-start.md) - Implementation quick start
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

### Core Documentation

#### 📘 User Documentation (`/user`)
End-user guides and feature documentation.

```
user/
├── getting-started/          # Account creation, first steps
├── features/                 # Feature guides (messaging, calendar, etc.)
├── safety/                   # Privacy, security, reporting
└── zones/                    # Community zone documentation
```

**Key Files:**
- [Messaging Guide](user/features/messaging.md) - Using public channels and discussions
- [Private Messages](user/features/private-messages.md) - NIP-17/59 encrypted DMs
- [Calendar Events](user/features/calendar.md) - NIP-52 calendar event creation
- [Semantic Search](developer/features/semantic-search.md) - Client-side WASM search
- [Account Security](user/safety/account-security.md) - Protecting your account

#### 👨‍💻 Developer Documentation (`/developer`)
Technical documentation for implementation and development.

```
developer/
├── getting-started/          # Setup and project structure
├── architecture/             # Technical system design
├── features/                 # Feature implementation guides
├── contributing/             # Code guidelines and processes
├── deployment/               # Deployment to production
└── reference/                # API and configuration reference
```

**Key Files:**
- [Development Setup](developer/getting-started/development-setup.md) - Configure local environment
- [Project Structure](developer/getting-started/project-structure.md) - Directory organisation
- [Architecture Guide](developer/architecture/index.md) - System design overview
- [Component Reference](developer/reference/api.md) - Component documentation
- [NIP Protocol Reference](developer/reference/nip-protocol-reference.md) - Nostr protocols used

#### 🏗️ Architecture & Design (`/adr`, `/ddd`)
System design decisions and domain model.

```
adr/                         # Architecture Decision Records
├── 001-nostr-protocol-foundation.md
├── 002-three-tier-hierarchy.md
├── 003-gcp-cloud-run-infrastructure.md
├── 004-zone-based-access-control.md
├── 005-nip-44-encryption-mandate.md
├── 006-client-side-wasm-search.md
├── 007-sveltekit-ndk-frontend.md
├── 008-postgresql-relay-storage.md
└── 009-user-registration-flow.md

ddd/                         # Domain-Driven Design
├── 01-domain-model.md       # Core domain entities
├── 02-bounded-contexts.md   # System boundaries
├── 03-aggregates.md         # Data aggregates
├── 04-domain-events.md      # Event model
├── 05-value-objects.md      # Value types
└── 06-ubiquitous-language.md # Terminology
```

**Key Files:**
- [ADR Index](adr/README.md) - All architectural decisions
- [Nostr Protocol Foundation](adr/001-nostr-protocol-foundation.md) - Why Nostr
- [Three-Tier Hierarchy](adr/002-three-tier-hierarchy.md) - Architecture layers
- [Infrastructure](adr/003-gcp-cloud-run-infrastructure.md) - Cloud deployment
- [Domain Model](ddd/01-domain-model.md) - Core concepts

#### 🔒 Security (`/security`)
Security audit, recommendations, and admin security guidelines.

```
security/
├── security-audit-report.md  # Full security audit findings
├── security-audit.md         # Detailed security analysis
├── quick-reference.md        # Security best practices
├── admin-security.md         # Admin security guidelines
└── summary.md                # Security summary
```

**Key Files:**
- [Security Audit Report](security/security-audit-report.md) - Findings and recommendations
- [Admin Security](security/admin-security.md) - For system administrators
- [Quick Reference](security/quick-reference.md) - Security checklist

#### 📚 Reference (`/reference`)
API and configuration reference documentation.

```
reference/
├── api-reference.md          # API endpoints
├── architecture-reference.md # Architecture reference
└── authentication.md         # Auth system reference
```

---

## Key Features

Nostr-BBS implements the following Nostr protocols:

| Protocol | Purpose | Docs |
|----------|---------|------|
| **NIP-01** | Basic event handling | [Reference](developer/reference/nip-protocol-reference.md) |
| **NIP-17/59** | Encrypted direct messages (gift wrap) | [DM Implementation](developer/features/dm-implementation.md) |
| **NIP-28** | Public channels and basic messaging | [Messaging](user/features/messaging.md) |
| **NIP-44** | Encryption standard (mandatory) | [ADR-005](adr/005-nip-44-encryption-mandate.md) |
| **NIP-52** | Calendar events | [Calendar](user/features/calendar.md) |

---

## Technology Stack

### Frontend
- **Framework**: SvelteKit (SSR-disabled for GitHub Pages)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui adaptations
- **Search**: WASM-based semantic search (client-side)
- **Mobile**: PWA with responsive design

### Backend
- **Runtime**: Node.js
- **Relay**: Custom Nostr relay server
- **Database**: PostgreSQL with pgvector
- **Cloud**: Google Cloud Run (serverless)
- **Storage**: Cloud Storage for files

### Protocols & Libraries
- **Nostr Client**: ndk (Nostr Development Kit)
- **Encryption**: libsecp256k1, crypto-js
- **Search**: TF-IDF vectors with WASM

---

## Documentation Standards

This documentation follows systematic frameworks and standards:

### Diataxis Framework
Documentation is organised using [Diataxis principles](https://diataxis.fr/):

- **Tutorials** - Learning-oriented step-by-step guides
- **How-to Guides** - Task-oriented practical solutions
- **Reference** - Information-oriented technical descriptions
- **Explanations** - Understanding-oriented design discussion

### Quality Standards

✅ **UK English** - Consistent spelling and grammar throughout
✅ **Mermaid Diagrams** - Architecture and flow visualisations
✅ **YAML Metadata** - Title, description, tags, and last-updated in frontmatter
✅ **100% Link Coverage** - All links validated and working
✅ **Accessibility** - WCAG 2.1 Level AA compliance

### File Organisation

- **Breadcrumb Navigation** - Each page includes breadcrumb context
- **Internal Cross-references** - Linked related documentation
- **Metadata Headers** - YAML frontmatter with metadata
- **Code Examples** - All examples are tested and current
- **Last Updated Dates** - Track documentation freshness

---

## Common Tasks

### I want to...

#### Deploy the application
- **GitHub Pages**: [GitHub Pages Deployment](developer/deployment/github-pages.md)
- **Google Cloud**: [Cloud Run Deployment](developer/deployment/cloud-run.md)
- **Self-hosted**: [Self-Hosting Guide](developer/deployment/self-hosting.md)

#### Understand the system
- **High-level overview**: [Architecture Overview](architecture.md)
- **Design decisions**: [Architecture Decision Records](adr/README.md)
- **Domain model**: [Domain-Driven Design](ddd/01-domain-model.md)

#### Contribute code
- **Getting started**: [First Contribution](developer/getting-started/first-contribution.md)
- **Code standards**: [Code Style Guide](developer/contributing/code-style.md)
- **Testing**: [Testing Guide](developer/contributing/testing.md)
- **PR process**: [Pull Requests](developer/contributing/pull-requests.md)

#### Implement a feature
- **Direct messages**: [DM Implementation](developer/features/dm-implementation.md)
- **Semantic search**: [Semantic Search](developer/features/semantic-search.md)
- **Mobile components**: [Mobile UI Components](features/mobile-ui-components.md)

#### Secure the system
- **Audit findings**: [Security Audit Report](security/security-audit-report.md)
- **Admin guidelines**: [Admin Security](security/admin-security.md)
- **Best practices**: [Security Quick Reference](security/quick-reference.md)

---

## Navigation by Role

### End User Journey
1. [Creating an Account](user/getting-started/creating-account.md)
2. [First Steps](user/getting-started/first-steps.md)
3. Explore [Features](user/features/index.md)
4. Join [Zones](user/zones/index.md)
5. Learn [Safety](user/safety/index.md)

### Developer Journey
1. [Development Setup](developer/getting-started/development-setup.md)
2. [Project Structure](developer/getting-started/project-structure.md)
3. [Architecture Overview](developer/architecture/index.md)
4. [Contributing Guide](developer/contributing/index.md)
5. [Reference Documentation](developer/reference/api.md)

### Operator Journey
1. Choose [Deployment Option](developer/deployment/index.md)
2. Follow deployment guide (Cloud Run, GitHub Pages, or Self-hosted)
3. Review [Security Audit](security/security-audit-report.md)
4. Configure [Admin Security](security/admin-security.md)
5. Monitor application health

### Architect Journey
1. Read [Product Requirements](prd.md)
2. Review [Architecture Decisions](adr/README.md)
3. Study [System Architecture](architecture.md)
4. Examine [Domain Model](ddd/01-domain-model.md)
5. Review [Security Audit](security/security-audit-report.md)

---

## Search & Discovery

### By Topic
- **Authentication**: [Auth System](features/authentication.md), [Auth Reference](reference/authentication.md)
- **Messaging**: [User Guide](user/features/messaging.md), [DM Implementation](developer/features/dm-implementation.md)
- **Calendar**: [User Guide](user/features/calendar.md)
- **Search**: [Semantic Search](developer/features/semantic-search.md)
- **Deployment**: [Deployment Guide](developer/deployment/index.md)
- **Security**: [Security Audit](security/security-audit-report.md)

### By Protocol
- **NIP-01**: [Basics](developer/reference/nip-protocol-reference.md)
- **NIP-17/59**: [Encrypted DMs](developer/features/dm-implementation.md)
- **NIP-28**: [Public Channels](user/features/messaging.md)
- **NIP-44**: [Encryption Mandate](adr/005-nip-44-encryption-mandate.md)
- **NIP-52**: [Calendar Events](user/features/calendar.md)

### By Audience
- **Users**: [User Documentation](user/index.md)
- **Developers**: [Developer Documentation](developer/index.md)
- **Operators**: [Deployment Guides](developer/deployment/index.md)
- **Architects**: [Architecture Records](adr/README.md)

---

## External Resources

### Official Links
- **GitHub Repository**: [jjohare/Nostr-BBS](https://github.com/jjohare/Nostr-BBS)
- **Live Site**: [nostr-bbs.com](https://nostr-bbs.com)
- **Issue Tracking**: [GitHub Issues](https://github.com/jjohare/Nostr-BBS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jjohare/Nostr-BBS/discussions)

### Nostr Protocol
- **Nostr Overview**: [nostr.com](https://nostr.com)
- **NIP Repository**: [github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips)
- **ndk Library**: [NDK Documentation](https://docs.nostr.dev/ndk/)

---

## Documentation Maintenance

### Validation
- **Link Status**: [Link Validation Report](link-validation-report.md) - Latest validation results
- **Quality**: All documentation follows Diataxis framework standards
- **Currency**: Last updated dates track documentation freshness

### Issues & Feedback
- **Report Issues**: [GitHub Issues](https://github.com/jjohare/Nostr-BBS/issues/new)
- **Suggest Changes**: [GitHub Discussions](https://github.com/jjohare/Nostr-BBS/discussions)
- **Security Concerns**: Contact [@jjohare](https://github.com/jjohare) privately

---

## Quick Start

### For Users
```bash
1. Visit nostr-bbs.com
2. Follow "Creating an Account" guide
3. Explore zones and features
```

### For Developers
```bash
1. Clone: git clone https://github.com/jjohare/Nostr-BBS.git
2. Setup: npm install && npm run dev
3. Read: developer/getting-started/development-setup.md
```

### For Deployment
```bash
1. Choose platform: GitHub Pages / Cloud Run / Self-hosted
2. Follow relevant deployment guide in developer/deployment/
3. Review security audit findings
```

---

## Document Index

**Total Documentation**: 80+ files organised in 12 categories

| Category | Files | Purpose |
|----------|-------|---------|
| User Getting Started | 3 | Onboarding end users |
| User Features | 8 | Feature guides for users |
| User Safety | 4 | Privacy and security for users |
| User Zones | 4 | Community zone documentation |
| Developer Getting Started | 4 | Development setup |
| Developer Architecture | 4 | Technical design |
| Developer Features | 4 | Feature implementation |
| Developer Contributing | 4 | Code contribution |
| Developer Deployment | 5 | Production deployment |
| Developer Reference | 5 | API and configuration |
| Architecture Decisions | 10 | ADRs with decisions |
| Domain Model | 7 | DDD documentation |
| Security | 5 | Security audit and guidelines |
| Deployment | 3 | Deployment options |
| Features | 4 | Developer feature docs |
| Guides | 1 | Implementation guides |
| Reference | 3 | API reference |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Master documentation hub created |
| (Previous) | 2026-01-16 | Initial index.md |

---

## Support

### Documentation Support
- **Questions**: Ask in [GitHub Discussions](https://github.com/jjohare/Nostr-BBS/discussions)
- **Bugs**: Report in [GitHub Issues](https://github.com/jjohare/Nostr-BBS/issues)
- **Security**: Contact [@jjohare](https://github.com/jjohare) privately

### Getting Help
1. Search this documentation using Ctrl+F
2. Check [GitHub Issues](https://github.com/jjohare/Nostr-BBS/issues) for similar problems
3. Review [Troubleshooting](developer/getting-started/development-setup.md#troubleshooting)
4. Ask in [GitHub Discussions](https://github.com/jjohare/Nostr-BBS/discussions)

---

**Last Updated**: 2026-01-25
**Documentation Version**: 1.0.0
**Status**: ✅ Production Ready
**Maintained By**: Nostr-BBS Project Team
