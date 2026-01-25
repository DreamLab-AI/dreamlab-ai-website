# README File Inventory

**Complete catalog of all README.md files across the documentation**

Last Updated: 2026-01-25

---

## Primary Documentation READMEs

### Root-Level Documentation

| Path | File | Purpose | Ownership | Status |
|------|------|---------|-----------|--------|
| `/docs/` | `README.md` | **Primary docs entry point** - Links to all major sections | Documentation Team | Active |
| `/docs/` | `index.md` | MkDocs home page - Configured in .pages.yml | DevOps | Active |

### Category READMEs

| Category | Path | Purpose | Type | Status |
|----------|------|---------|------|--------|
| ADR | `/docs/adr/README.md` | Architecture Decision Records index & template guide | Decisions | Active |
| Architecture | `/docs/architecture/README.md` | System architecture overview & component guide | Technical | Active |
| Domain-Driven Design | `/docs/ddd/README.md` | Domain model & bounded context overview | Design | Active |
| Deployment | `/docs/deployment/README.md` | Deployment processes, environments, monitoring | Operations | Active |
| Developer | `/docs/developer/README.md` | **Developer hub** - Getting started, workflows, standards | Development | Active |
| Developer Architecture | `/docs/developer/architecture/index.md` | Developer-focused architecture quick reference | Development | Active |
| Contributing | `/docs/developer/contributing/index.md` | How to contribute, PR guidelines, testing | Development | Active |
| Security | `/docs/security/README.md` | Security framework, policies, compliance | Security | Active |
| User Guide | `/docs/user/README.md` | **User documentation hub** - Guides, FAQ, tutorials | Product/Support | Active |

---

## Secondary Documentation READMEs

### Community Forum Services

| Service | Path | Purpose | Owner | Status |
|---------|------|---------|-------|--------|
| Forum Overview | `/community-forum/README.md` | Community forum service overview | Frontend Lead | Active |
| Embedding API | `/community-forum/services/embedding-api/README.md` | Embedding service interface & usage | Backend Lead | Active |
| Nostr Relay | `/community-forum/services/nostr-relay/README.md` | **Relay service hub** - Overview & deployment | Backend Lead | Active |
| Relay Development | `/community-forum/services/nostr-relay/docs/` | (No README - use parent) | Backend Lead | — |

### Component & Library Documentation

| Component | Path | Purpose | Owner | Status |
|-----------|------|---------|-------|--------|
| Auth Components | `/community-forum/src/lib/components/auth/README.md` | Authentication component implementation | Frontend Lead | Active |
| Nostr Library | `/community-forum/src/lib/nostr/README.md` | Nostr protocol utilities & helpers | Backend Lead | Active |

### Testing & QA

| Suite | Path | Purpose | Owner | Status |
|-------|------|---------|-------|--------|
| Test Overview | `/community-forum/tests/README.md` | Test suite organization & quickstart | QA Lead | Active |
| E2E Testing | `/community-forum/tests/e2e/README.md` | End-to-end test framework setup | QA Lead | Active |

---

## Complete README File Listing

### By Location

```
/docs/
├── README.md ⭐
├── adr/
│   └── README.md
├── architecture/
│   └── README.md
├── ddd/
│   └── README.md
├── deployment/
│   └── README.md
├── developer/
│   ├── README.md ⭐
│   ├── architecture/
│   │   └── index.md (README equivalent)
│   └── contributing/
│       └── index.md (README equivalent)
├── security/
│   └── README.md
└── user/
    └── README.md ⭐

/community-forum/
├── README.md
├── services/
│   ├── embedding-api/
│   │   └── README.md
│   └── nostr-relay/
│       ├── README.md ⭐
│       └── docs/
│           ├── API.md
│           ├── ARCHITECTURE.md
│           ├── DEPLOYMENT.md
│           └── DEVELOPMENT.md
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── auth/
│   │   │       └── README.md
│   │   └── nostr/
│   │       └── README.md
│   └── [other components without README]
└── tests/
    ├── README.md
    └── e2e/
        └── README.md
```

### Total Count

| Category | READMEs | Total Files | Coverage |
|----------|---------|-------------|----------|
| Docs | 9 | 91 files | 10% |
| Forum | 6 | 50+ files | 12% |
| **Total** | **15** | **141+** | **11%** |

---

## README Purposes & Content Standards

### Category READMEs (Primary Structure)

**Standard Content**:
1. Overview of the category
2. Quick links to major docs
3. File organization explanation
4. Maintenance & update frequency
5. Contact/owner information

**Example**: `/docs/architecture/README.md`
```markdown
# Architecture Documentation

## Overview
Describes system architecture, design patterns, and component interactions.

## Quick Links
- [System Overview](SYSTEM_OVERVIEW.md)
- [Backend Services](BACKEND_SERVICES.md)
- ...

## File Organization
- **SYSTEM_OVERVIEW.md**: High-level architecture
- **BACKEND_SERVICES.md**: Service specifications
- ...
```

### Hub READMEs (Major Entry Points)

**Standard Content**:
1. Welcome & navigation
2. Getting started quick links
3. Common tasks & how-tos
4. Links to all subsections
5. Search/index capability

**Key Hubs**:
- `/docs/README.md` - Main documentation home
- `/docs/developer/README.md` - Developer hub
- `/docs/user/README.md` - User documentation hub
- `/community-forum/README.md` - Forum services home

### Service READMEs

**Standard Content**:
1. Service overview & purpose
2. Quick start / getting started
3. API or usage basics
4. Links to detailed documentation
5. Support & troubleshooting

**Examples**:
- `/community-forum/services/embedding-api/README.md`
- `/community-forum/services/nostr-relay/README.md`

### Component READMEs

**Standard Content**:
1. Component purpose & usage
2. Installation / import instructions
3. API or props documentation
4. Basic examples
5. Advanced configuration options

**Examples**:
- `/community-forum/src/lib/components/auth/README.md`
- `/community-forum/src/lib/nostr/README.md`

---

## README Maintenance Checklist

### Monthly Review (Each README Owner)

- [ ] Links are not broken (test with tools)
- [ ] Content is current & accurate
- [ ] Quick links still point to correct files
- [ ] No orphaned documentation
- [ ] File organization still accurate
- [ ] Update frequency is correct

### When Adding New Files

1. **Create new file** in appropriate category
2. **Add to parent README** quick links section
3. **Update file count** in category overview
4. **Check for duplicates** using STRUCTURE.md
5. **Link to canonical source** if needed

### When Moving/Renaming Files

1. **Update README** in old location to note relocation
2. **Update README** in new location
3. **Update all cross-references** using grep
4. **Update STRUCTURE.md** and TREE_DIAGRAM.md
5. **Verify links** in parent README files

---

## Quick Navigation by Role

### For Users

**Start here**: `/docs/user/README.md`
- Guides for features, setup, booking
- FAQ and troubleshooting
- Links to comprehensive docs

### For Developers

**Start here**: `/docs/developer/README.md`
- Getting started guide
- Development workflow
- Architecture overview
- Testing & debugging
- Contributing guidelines

**Quick links**:
- Setup: `/docs/developer/GETTING_STARTED.md`
- Architecture: `/docs/architecture/README.md`
- Contributing: `/docs/developer/contributing/index.md`

### For Backend Engineers

**Start here**: `/community-forum/services/nostr-relay/README.md`
- Service overview
- API documentation
- Deployment guide
- Development setup

**Alternative**: `/docs/architecture/BACKEND_SERVICES.md`

### For Frontend Engineers

**Start here**: `/community-forum/README.md`
- Forum UI overview
- Component documentation
- Toast system
- Testing guides

**Alternative**: `/docs/architecture/FRONTEND_ARCHITECTURE.md`

### For Operations/DevOps

**Start here**: `/docs/deployment/README.md`
- Environment configuration
- Cloud services setup
- Monitoring & alerting
- Deployment procedures
- Rollback procedures

### For Security Team

**Start here**: `/docs/security/README.md`
- Security framework
- Authentication implementation
- Data protection measures
- Audit procedures
- Vulnerability management

### For Product/Management

**Start here**: `/docs/user/README.md`
- User guides
- Feature documentation
- Product requirements (prd.md)

**Alternative**: `/docs/README.md` for technical overview

---

## README Standards

### Naming

- Use `README.md` for directory indexes
- Use `index.md` only in MkDocs collections
- All uppercase for emphasis (e.g., `GETTING_STARTED.md`)
- Lowercase-kebab for subtopics (e.g., `data-flow.md`)

### Structure

```markdown
# Title

## Quick Links
- [Link 1](path/to/file.md)
- [Link 2](path/to/file.md)

## Overview
Brief description (2-3 sentences)

## File Organization
Explanation of files in this directory

## Getting Started
Quick start for new users/developers

## Related Documentation
Links to related topics

## Support
How to get help / who to contact
```

### Format Guidelines

- Use markdown headings (# ## ###)
- Include code blocks with language specified
- Use relative links: `[text](./filename.md)`
- Include dates for last update
- List all subdirectories
- Provide search/index capability

---

## Common Issues & Solutions

### Issue: README is out of date

**Solution**:
- Identify actual file structure
- Update README file list
- Add last update date
- Create issue tracker task

### Issue: Dead links in README

**Solution**:
- Run link checker: `linkchecker /docs/README.md`
- Update or remove broken links
- Create redirects if files moved
- Document in README

### Issue: Missing README in new directory

**Solution**:
- Create README.md with standard template
- Add to parent README
- Link to canonical sources
- Add owner & update frequency

### Issue: Duplicate READMEs

**Solution**:
- Identify canonical version (in /docs usually)
- Keep mirror in secondary location
- Use cross-reference links
- Document in STRUCTURE.md

---

## Template: New Category README

Use this template when creating a new documentation category:

```markdown
# [Category Name]

## Overview
[Brief description of what this category covers]

## Quick Links
- [Subtopic 1](file1.md)
- [Subtopic 2](file2.md)
- [Subtopic 3](file3.md)

## File Organization

| File | Purpose |
|------|---------|
| `file1.md` | Description |
| `file2.md` | Description |
| `file3.md` | Description |

## Getting Started
[How to use this documentation]

## Related Documentation
- [Related Topic](../other-category/file.md)
- [Another Reference](../reference/file.md)

## Support & Questions
Contact: [@Owner](profile)

---

**Last Updated**: [YYYY-MM-DD]
**Maintained By**: [Team/Person]
**Update Frequency**: [Monthly/Quarterly/As-needed]
```

---

## Master README Change Log

### Recent Updates (2026-01)

- Created STRUCTURE.md (master structure reference)
- Created TREE_DIAGRAM.md (visual documentation tree)
- Consolidated api/* to architecture/BACKEND_SERVICES.md
- Created README_INVENTORY.md (this file)
- Updated developer/README.md with new links
- Added cross-reference guidance to all hubs

### Planned Updates (2026-Q1)

- Audit all broken links
- Create search index
- Add breadcrumb navigation
- Standardize README templates
- Complete missing READMEs

---

## Ownership Matrix

| README | Owner | Contact | Update Frequency |
|--------|-------|---------|------------------|
| `/docs/README.md` | Documentation Team | @docs-lead | Monthly |
| `/docs/developer/README.md` | Lead Developer | @dev-lead | Monthly |
| `/docs/security/README.md` | Security Lead | @security-lead | Quarterly |
| `/docs/user/README.md` | Product/Support | @product-lead | Monthly |
| `/community-forum/README.md` | Frontend Lead | @frontend-lead | Quarterly |
| `/community-forum/services/nostr-relay/README.md` | Backend Lead | @backend-lead | Quarterly |

---

**Inventory Version**: 1.0
**Last Updated**: 2026-01-25
**Next Audit**: 2026-04-25
**Related Files**: [`STRUCTURE.md`](STRUCTURE.md), [`TREE_DIAGRAM.md`](TREE_DIAGRAM.md), [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)
