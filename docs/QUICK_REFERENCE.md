---
title: Documentation Quick Reference Card
description: Quick navigation guide for Nostr-BBS documentation
category: reference
tags: [documentation, quick-reference, navigation, index]
last_updated: 2026-01-25
---

# Documentation Quick Reference Card

**Nostr-BBS Documentation Master Index v1.0.0**

Quickly find what you need using this reference card.

---

## I Am...

### 👤 An End User
Want to use the platform? Start here.

```
START HERE: /docs/README.md → "For End Users"

Quick Path:
1. docs/user/getting-started/creating-account.md
2. docs/user/getting-started/first-steps.md
3. docs/user/features/index.md
4. docs/user/safety/index.md

Search Tips:
- Feature not working? → docs/user/features/
- Account issues? → docs/user/safety/
- Want to join zones? → docs/user/zones/
```

### 👨‍💻 A Developer
Want to code or contribute? Start here.

```
START HERE: /docs/README.md → "For Developers"

Quick Path:
1. docs/developer/getting-started/development-setup.md
2. docs/developer/getting-started/project-structure.md
3. docs/developer/architecture/index.md
4. docs/developer/contributing/index.md

Search Tips:
- Setting up locally? → developer/getting-started/
- Understanding code? → developer/architecture/
- Want to contribute? → developer/contributing/
- Building a feature? → developer/features/
```

### 🛠️ An Operator or DevOps Engineer
Want to deploy or maintain the system? Start here.

```
START HERE: /docs/README.md → "For Operators & DevOps"

Quick Path:
1. docs/developer/deployment/index.md
2. Choose your platform:
   - docs/developer/deployment/github-pages.md (Static)
   - docs/developer/deployment/cloud-run.md (Cloud)
   - docs/developer/deployment/self-hosting.md (Self-hosted)
3. docs/security/security-audit-report.md
4. docs/security/admin-security.md

Search Tips:
- Deploying? → developer/deployment/
- Security concerns? → security/
- Setting up admin? → security/admin-security.md
```

### 🏗️ An Architect or Decision Maker
Want to understand the design? Start here.

```
START HERE: /docs/README.md → "For Architects"

Quick Path:
1. docs/prd.md (Requirements)
2. docs/adr/README.md (9 key decisions)
3. docs/architecture.md (High-level overview)
4. docs/ddd/01-domain-model.md (Core concepts)
5. docs/security/security-audit-report.md (Security findings)

Search Tips:
- Design decisions? → adr/
- Domain model? → ddd/
- How it all fits? → architecture.md
- Security review? → security/
```

---

## I Want To...

### Deploy the Application
```
→ docs/developer/deployment/index.md
  ├─ GitHub Pages? → deployment/github-pages.md
  ├─ Google Cloud? → deployment/cloud-run.md
  └─ Self-hosted? → deployment/self-hosting.md
```

### Understand the System
```
→ docs/adr/README.md (Architecture Decisions)
→ docs/architecture.md (High-level overview)
→ docs/ddd/01-domain-model.md (Domain model)
```

### Use a Feature
```
→ docs/user/features/index.md
  ├─ Messaging? → messaging.md
  ├─ Private messages? → private-messages.md
  ├─ Calendar? → calendar.md
  └─ Search? → searching.md
```

### Implement a Feature
```
→ docs/developer/features/
  ├─ Direct messages? → dm-implementation.md
  ├─ Search? → semantic-search.md
  └─ Mobile UI? → ../reference/ (components)
```

### Contribute Code
```
→ docs/developer/contributing/index.md
  ├─ Code style? → code-style.md
  ├─ Testing? → testing.md
  └─ Pull requests? → pull-requests.md
```

### Review Security
```
→ docs/security/security-audit-report.md
→ docs/security/admin-security.md
→ docs/security/quick-reference.md
```

### Set Up Development
```
→ docs/developer/getting-started/development-setup.md
→ docs/developer/getting-started/project-structure.md
```

### Find API Documentation
```
→ docs/developer/reference/api.md
→ docs/developer/reference/configuration.md
→ docs/developer/reference/nip-protocol-reference.md
```

---

## By Topic

| Topic | Files |
|-------|-------|
| **Messaging** | [User Guide](user/features/messaging.md), [DM Implementation](developer/features/dm-implementation.md) |
| **Calendar** | [User Guide](user/features/calendar.md) |
| **Search** | [Semantic Search](developer/features/semantic-search.md) |
| **Security** | [Audit Report](security/security-audit-report.md), [Quick Ref](security/quick-reference.md) |
| **Zones** | [Zone Guide](user/zones/index.md) |
| **Authentication** | [Implementation](features/authentication.md) |
| **Deployment** | [All Guides](developer/deployment/index.md) |
| **Architecture** | [ADR Records](adr/README.md), [Overview](architecture.md) |

---

## By Protocol (Nostr)

| Protocol | Use Case | Docs |
|----------|----------|------|
| **NIP-01** | Core event model | [Reference](developer/reference/nip-protocol-reference.md) |
| **NIP-17/59** | Encrypted direct messages | [Implementation](developer/features/dm-implementation.md) |
| **NIP-28** | Public channels | [User Guide](user/features/messaging.md) |
| **NIP-44** | Encryption standard | [ADR-005](adr/005-nip-44-encryption-mandate.md) |
| **NIP-52** | Calendar events | [User Guide](user/features/calendar.md) |

---

## Navigation Shortcuts

### Hub Files (Start Here for Category)
- **User Hub**: `/docs/user/index.md`
- **Developer Hub**: `/docs/developer/index.md`
- **Architecture Hub**: `/docs/adr/README.md`
- **Domain Model Hub**: `/docs/ddd/README.md`

### Master Files
- **README.md** - Master index with audience navigation
- **index.md** - Comprehensive documentation index
- **DOCUMENTATION_SUMMARY.md** - Implementation details
- **QUICK_REFERENCE.md** - This file

### Common Questions

**Q: I'm new, where do I start?**
A: `/docs/README.md` → Your role section

**Q: I want to use the app**
A: `/docs/user/getting-started/first-steps.md`

**Q: I want to code**
A: `/docs/developer/getting-started/development-setup.md`

**Q: I want to deploy**
A: `/docs/developer/deployment/index.md`

**Q: I want to understand the design**
A: `/docs/adr/README.md`

**Q: I need security info**
A: `/docs/security/security-audit-report.md`

**Q: I need API reference**
A: `/docs/developer/reference/api.md`

**Q: I want to contribute**
A: `/docs/developer/contributing/index.md`

---

## Search Tips

### Using Ctrl+F
- Search for feature name (e.g., "messaging", "calendar")
- Search for protocol (e.g., "NIP-28", "NIP-44")
- Search for file type (e.g., ".md" for markdown files)

### By Topic
- Features → `/docs/user/features/` or `/docs/developer/features/`
- Deployment → `/docs/developer/deployment/`
- Security → `/docs/security/`
- Architecture → `/docs/adr/` or `/docs/architecture.md`

### By File Type
- **Guides** → File ending in `.md` in `guides/` or `user/`
- **References** → File ending in `.md` in `reference/`
- **Records** → Files numbered `001-009` in `adr/`

---

## File Organisation Structure

```
/docs/
├── README.md                    ← START HERE
├── index.md                     ← Full index
├── QUICK_REFERENCE.md           ← This file
├── DOCUMENTATION_SUMMARY.md     ← Implementation details
│
├── user/                        ← End user documentation
│   ├── index.md                ← User hub
│   ├── getting-started/        ← Onboarding
│   ├── features/               ← How-to guides
│   ├── safety/                 ← Safety & privacy
│   └── zones/                  ← Community zones
│
├── developer/                   ← Developer documentation
│   ├── index.md                ← Developer hub
│   ├── getting-started/        ← Setup guides
│   ├── architecture/           ← Technical design
│   ├── features/               ← Feature implementation
│   ├── contributing/           ← Contribution guide
│   ├── deployment/             ← Deployment guides
│   └── reference/              ← API reference
│
├── adr/                        ← Architecture decisions
│   ├── README.md               ← ADR index
│   ├── 001-009/                ← Decision records
│   └── 000-template.md         ← Template
│
├── ddd/                        ← Domain model
│   ├── README.md               ← DDD overview
│   └── 01-06/                  ← Domain documentation
│
├── security/                   ← Security documentation
│   ├── security-audit-report.md
│   ├── admin-security.md
│   └── ...
│
└── [other directories]
```

---

## Support

### Need Help?
1. Check this Quick Reference Card
2. Search documentation with Ctrl+F
3. Review topic-specific guides
4. Check FAQ/Q&A sections
5. Ask in GitHub Discussions

### Report Issues
- Documentation bugs → [GitHub Issues](https://github.com/jjohare/Nostr-BBS/issues)
- Suggestions → [GitHub Discussions](https://github.com/jjohare/Nostr-BBS/discussions)
- Security concerns → Contact maintainer privately

### External Resources
- **GitHub**: [jjohare/Nostr-BBS](https://github.com/jjohare/Nostr-BBS)
- **Nostr**: [nostr.com](https://nostr.com)
- **NIPs**: [github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips)

---

## Key Info

| Item | Details |
|------|---------|
| **Version** | 1.0.0 |
| **Last Updated** | 2026-01-25 |
| **Total Files** | 80+ markdown files |
| **Audiences** | Users, Developers, Operators, Architects |
| **Standards** | Diataxis, YAML, UK English, WCAG 2.1 AA |
| **Status** | Production Ready |

---

**Bookmark this page for quick access to documentation!**

Last Updated: 2026-01-25 | v1.0.0
