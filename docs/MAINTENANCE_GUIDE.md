# Documentation Maintenance Guide

**Procedures for keeping documentation current, organized, and accessible**

Effective Date: 2026-01-25
Owner: Documentation Team

---

## Quick Start

### For Adding New Documentation

1. **Identify category**: Is this about `/docs/` or `/community-forum/`?
2. **Choose location**: Architecture? Developer? User? Features?
3. **Check STRUCTURE.md**: Is a canonical version already there?
4. **Create file**: Follow naming convention (kebab-case for subtopics)
5. **Update parent README**: Add link to quick links section
6. **Update STRUCTURE.md**: Add to tree & ownership table
7. **Cross-reference**: Link to related documents

See [Adding New Documentation](#adding-new-documentation) below.

### For Monthly Reviews

**Assign by category**:
- Docs/Developer → Lead Developer
- Docs/Security → Security Lead
- Docs/User → Product/Support Lead
- Community-forum → Frontend/Backend Lead

**Checklist**:
- [ ] No broken links (test with `linkchecker`)
- [ ] Content is current
- [ ] File names follow convention
- [ ] No duplicate content
- [ ] Parent README is complete
- [ ] Owner & update frequency are correct

See [Monthly Maintenance](#monthly-maintenance) below.

### For Reporting Issues

**Use this format**:
```
Location: /docs/[category]/[file].md
Issue: [Brief description]
Impact: [Why this matters]
Fix: [Suggested solution]
```

**Report to**: Documentation Team lead

---

## Detailed Procedures

## Adding New Documentation

### Step-by-Step Process

#### 1. Determine Document Type

| Type | Location | Format | Update Freq |
|------|----------|--------|------------|
| Architecture Decision | `/docs/adr/` | ADR template | On decision |
| System Architecture | `/docs/architecture/` | Markdown sections | Quarterly |
| Domain Design | `/docs/ddd/` | Numbered files | As needed |
| Developer Guide | `/docs/developer/` | Markdown + code | Monthly |
| Feature Spec | `/docs/features/` | Markdown | Per feature |
| Deployment Info | `/docs/deployment/` | Markdown + configs | Monthly |
| Security | `/docs/security/` | Markdown + audit | Quarterly |
| User Help | `/docs/user/` | Markdown + examples | Monthly |
| Service Docs | `/community-forum/services/*/` | Markdown | Per release |

#### 2. Check for Existing Content

```bash
# Search for similar documentation
cd /home/devuser/workspace/project2
grep -r "your_topic" docs/
grep -r "your_topic" community-forum/

# Check STRUCTURE.md for canonical locations
grep "your_topic" docs/STRUCTURE.md
```

**Decision**:
- **Exists**: Link to canonical source (don't duplicate)
- **Doesn't exist**: Create new file (follow steps 3-7)

#### 3. Follow Naming Convention

**For primary documentation** (`/docs/`):
- `GETTING_STARTED.md` - Main topics (UPPERCASE_UNDERSCORE)
- `getting-started.md` - Subtopics (lowercase-kebab)
- `01-introduction.md` - Sequences (NN-kebab)

**For secondary documentation** (`/community-forum/`):
- `README.md` - Directory index
- `SERVICE_NAME.md` - Service overview
- `lowercase-detail.md` - Implementation details

#### 4. Create the File

```bash
# Create in correct directory
touch /home/devuser/workspace/project2/docs/[category]/[file].md

# Add header with metadata
cat > /home/devuser/workspace/project2/docs/[category]/[file].md << 'EOF'
# Document Title

**Purpose**: Brief description
**Audience**: [Developer/User/Ops/Security]
**Last Updated**: [YYYY-MM-DD]
**Owner**: [Your Name/Team]

---

## Content starts here

EOF
```

#### 5. Update Parent README

```markdown
## [New Section]

- [New Document Title](new-document-name.md) - Brief description
```

**Example**:
```markdown
## Features

- [Authentication](authentication.md) - Auth system & NIP-based auth
- [Direct Messaging](dm-implementation.md) - DM system implementation
- [New Feature](new-feature.md) - Feature description here
```

#### 6. Update STRUCTURE.md

Add to appropriate section:

```markdown
| New File | Path | Purpose | Owner | Status |
|----------|------|---------|-------|--------|
| new-document.md | `/docs/features/` | Description | Your Name | Active |
```

#### 7. Cross-Reference

Link from related documents:

**In related doc**:
```markdown
Also see:
- [New Feature](../features/new-feature.md)
- [Architecture](../architecture/feature-details.md)
```

### Complete Example: Adding Feature Documentation

**Scenario**: Adding documentation for a new "Secure Backup" feature

```bash
# 1. Create file
touch /home/devuser/workspace/project2/docs/features/secure-backup.md

# 2. Write content
cat > /home/devuser/workspace/project2/docs/features/secure-backup.md << 'EOF'
# Secure Backup Feature

**Purpose**: Document the secure backup implementation
**Audience**: Users & Developers
**Owner**: Backend Team

## Overview
Users can securely backup their data...

## User Guide
1. Navigate to Settings → Backup
2. Click "Create Backup"
3. ...

## Technical Implementation
The backup system uses...

## Security Considerations
- AES-256 encryption
- Rate limiting: 1 backup per hour
- ...

EOF

# 3. Add to parent README
# Edit /home/devuser/workspace/project2/docs/features/ (create if needed)

# 4. Update STRUCTURE.md
# Add to /docs/features/ section

# 5. Cross-reference from other docs
# Add link in /docs/architecture/ if relevant
# Add link in /docs/user/ if user-facing
```

---

## Monthly Maintenance

### Assigned by Category

| Category | Owner | Day | Checklist |
|----------|-------|-----|-----------|
| `/docs/developer/` | Lead Developer | 1st | Code style, setup, workflow |
| `/docs/security/` | Security Lead | 5th | Audit, auth, vulnerabilities |
| `/docs/user/` | Product Lead | 10th | Guides, FAQ, booking |
| `/docs/architecture/` | Tech Lead | 15th | ADRs, design, APIs |
| `/community-forum/` | Frontend Lead | 20th | Components, UI, toast |

### Monthly Checklist Template

```markdown
# Documentation Review - [Month] [Year]

**Reviewer**: [Name]
**Category**: [e.g., developer/]
**Date**: [YYYY-MM-DD]

## Status Checks

- [ ] No broken links (tested with linkchecker)
- [ ] All content is current & accurate
- [ ] No duplicate documentation
- [ ] README exists and is complete
- [ ] File names follow convention
- [ ] Owner is still correct
- [ ] Update frequency is realistic

## Issues Found

- Issue 1: [description]
- Issue 2: [description]

## Actions Taken

- Action 1: [what was done]
- Action 2: [what was done]

## Next Review Date

- [Date]
```

### Using linkchecker

```bash
# Install (if needed)
npm install -g linkchecker

# Check specific directory
linkchecker /home/devuser/workspace/project2/docs/developer/

# Check all docs
linkchecker /home/devuser/workspace/project2/docs/

# Output to file
linkchecker /home/devuser/workspace/project2/docs/ > report.txt
```

---

## Handling Common Scenarios

### Scenario 1: Moving a File

**Process**:

1. **Update all references**:
```bash
# Find all references to old path
grep -r "path/to/old/file" /home/devuser/workspace/project2/docs/
grep -r "path/to/old/file" /home/devuser/workspace/project2/community-forum/

# Replace with new path
sed -i 's|path/to/old/file|path/to/new/file|g' /path/to/files
```

2. **Create redirect** in old location:
```markdown
# [Document Title]

**This documentation has moved**: See [New Location](../new/location.md)

This file is kept for link compatibility. All new references should use the new location.
```

3. **Update parent README files**:
- Remove from old parent
- Add to new parent

4. **Update STRUCTURE.md** and **TREE_DIAGRAM.md**

### Scenario 2: Merging Multiple Files

**Process**:

1. **Copy content** to canonical location
2. **Create redirects** in old locations
3. **Update cross-references** to point to canonical
4. **Update README** files
5. **Update STRUCTURE.md**

**Example**:
```markdown
# [Topic]

## Section A
[Copied from file-a.md]

## Section B
[Copied from file-b.md]
```

**In old files**:
```markdown
# [Topic] - DEPRECATED

This documentation has been merged into [Canonical Location](../canonical/file.md).

See the new location for the complete documentation.
```

### Scenario 3: Finding Orphaned Documentation

**Process**:

```bash
# Find markdown files not linked from README
find /home/devuser/workspace/project2/docs -name "*.md" -type f |
  while read file; do
    # Check if file is mentioned in parent README
    dir=$(dirname "$file")
    parent="$dir/README.md"
    filename=$(basename "$file")

    if ! grep -q "$filename" "$parent" 2>/dev/null; then
      echo "Orphaned: $file"
    fi
  done
```

**Resolution**:
- Add to parent README if it should be there
- Move to correct parent if misplaced
- Delete if obsolete
- Update STRUCTURE.md

### Scenario 4: Duplicate Content Found

**Process**:

1. **Identify canonical location**:
   - Usually in `/docs/` (not `/community-forum/`)
   - Usually at higher level (not nested)
   - Usually updated more frequently

2. **Consolidate** to canonical:
   - Copy unique content to canonical
   - Update canonical with all information
   - Verify completeness

3. **Create redirects** in non-canonical:
   - Keep file with deprecation notice
   - Link to canonical location
   - Preserve for link compatibility

4. **Update all references**:
   - Search for links to duplicates
   - Update to point to canonical
   - Update STRUCTURE.md

### Scenario 5: Updating After File Change

**Example**: API endpoint documentation changed

**Process**:

1. **Update canonical documentation**:
   - Edit `/docs/architecture/BACKEND_SERVICES.md`
   - Update endpoint spec
   - Note change date

2. **Update mirrors** (if any):
   - Update `/docs/reference/api-reference.md` (mirror)
   - Update `/community-forum/services/relay/docs/API.md` (if relevant)

3. **Update related docs**:
   - Feature docs referencing endpoint
   - Developer guides with examples
   - User guides with screenshots

4. **Note in DOCUMENTATION_SUMMARY.md**:
```markdown
## Recent Changes

- **API Documentation**: Updated embedding service endpoints (2026-01-25)
  - Added `POST /embed/batch` endpoint
  - Updated rate limiting documentation
  - See: docs/architecture/BACKEND_SERVICES.md
```

---

## Documentation Standards

### File Template: Main Document

```markdown
# Document Title

**Purpose**: [One-line purpose]
**Audience**: [Developer/User/Ops/Security]
**Last Updated**: [YYYY-MM-DD]
**Owner**: [Name/Team]
**Update Frequency**: [Monthly/Quarterly/As-needed]

---

## Overview

[2-3 sentence overview]

## Quick Links

- [Related doc 1](path)
- [Related doc 2](path)

## Content Sections

### Section 1

[Content]

### Section 2

[Content]

## Related Documentation

- [Related topic](../other/file.md)

---

**Version**: 1.0
**Last Modified**: [YYYY-MM-DD]
**Next Review**: [YYYY-MM-DD]
```

### File Template: Category README

```markdown
# Category Name

## Overview

[Describe what this category covers]

## Quick Links

- [Topic 1](file1.md) - Description
- [Topic 2](file2.md) - Description

## Files in This Category

| File | Purpose |
|------|---------|
| `file1.md` | What it covers |
| `file2.md` | What it covers |

## Organization

[Explain file organization logic]

## Contributing

[How to add new docs to this category]

## Support

- **Owner**: [Name]
- **Contact**: [Email/Slack]
- **Review Cycle**: [Monthly/Quarterly/As-needed]

---

**Last Updated**: [YYYY-MM-DD]
**Maintained By**: [Team]
```

---

## Quarterly Audits

### Q1 2026 Audit Checklist

- [ ] **Complete link audit**: Run linkchecker on entire docs/
- [ ] **Verify ownership**: All categories have assigned owner
- [ ] **Check update dates**: No doc older than update cycle
- [ ] **Search for duplicates**: Find & consolidate duplicate content
- [ ] **Validate cross-references**: All links point to current location
- [ ] **Review orphaned docs**: Find files not in any README
- [ ] **Update STRUCTURE.md**: Reflect any changes
- [ ] **Verify MkDocs build**: Build succeeds without warnings
- [ ] **Test navigation**: All navigation paths work
- [ ] **Update TREE_DIAGRAM.md**: Reflect structure
- [ ] **Generate metrics**: Document count, categories, coverage
- [ ] **Create audit report**: Document findings & fixes

### Running Full Audit

```bash
#!/bin/bash

echo "=== Documentation Audit Report ==="
echo "Date: $(date)"
echo ""

echo "1. Link Check"
linkchecker /home/devuser/workspace/project2/docs/ > links-report.txt
echo "  Checked $(wc -l < links-report.txt) files"

echo "2. File Inventory"
find /home/devuser/workspace/project2/docs -name "*.md" -type f | wc -l
echo "  Total markdown files"

echo "3. Orphaned Files"
find /home/devuser/workspace/project2/docs -name "*.md" -type f | \
  while read f; do
    dir=$(dirname "$f")
    grep -q "$(basename "$f")" "$dir/README.md" 2>/dev/null || echo "$f"
  done

echo "4. Duplicate Content"
find /home/devuser/workspace/project2/docs -name "*.md" -type f -exec cat {} \; | \
  sort | uniq -d | head -20

echo ""
echo "=== End Report ==="
```

---

## Emergency Procedures

### If Major Documentation Issue

**Step 1**: Identify scope
```
- Single file issue?
- Category-wide issue?
- Cross-documentation problem?
```

**Step 2**: Create emergency backup
```bash
git checkout -b docs-emergency-fix
```

**Step 3**: Fix the issue
- Update canonical source
- Create redirects if needed
- Update related docs

**Step 4**: Test thoroughly
```bash
linkchecker /home/devuser/workspace/project2/docs/
```

**Step 5**: Commit and notify
```bash
git add docs/
git commit -m "Emergency fix: [description]"
```

**Step 6**: Notify stakeholders
- Email documentation team
- Update DOCUMENTATION_SUMMARY.md
- Create follow-up task for Q1 review

---

## Tools & Resources

### Recommended Tools

| Tool | Purpose | Install |
|------|---------|---------|
| linkchecker | Validate all links | `npm install -g linkchecker` |
| MkDocs | Build documentation site | `pip install mkdocs` |
| grep | Search files | Built-in |
| sed | Find & replace | Built-in |
| tree | Visualize structure | `apt install tree` |

### Configuration Files

| File | Purpose |
|------|---------|
| `.pages.yml` | MkDocs navigation config |
| `docs/README.md` | Main docs home |
| `docs/STRUCTURE.md` | Master structure reference |
| `docs/CONSOLIDATION_DECISIONS.md` | Consolidation rationale |

### Important Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Structure Map | `docs/STRUCTURE.md` | Master reference |
| Tree Diagram | `docs/TREE_DIAGRAM.md` | Visual reference |
| README Inventory | `docs/README_INVENTORY.md` | All READMEs |
| Consolidation Decisions | `docs/CONSOLIDATION_DECISIONS.md` | Decisions made |
| This Guide | `docs/MAINTENANCE_GUIDE.md` | Maintenance procedures |

---

## Contact & Support

### Documentation Team

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Lead | [TBD] | [TBD] | Full-time |
| Developer Docs | [TBD] | [TBD] | Full-time |
| Security Docs | [TBD] | [TBD] | On-demand |
| User Docs | [TBD] | [TBD] | Full-time |

### Escalation

**Issue**: Broken links
- **Owner**: DevOps / Documentation Lead
- **Response**: 24 hours

**Issue**: Outdated content
- **Owner**: Category Owner
- **Response**: Per update frequency

**Issue**: Major restructuring
- **Owner**: Tech Lead + Documentation Lead
- **Response**: Plan before implementation

---

## Document Management

**Version**: 1.0
**Created**: 2026-01-25
**Last Updated**: 2026-01-25
**Next Review**: 2026-04-25
**Owner**: Documentation Team
**Status**: Active

---

**Quick Links**:
- [STRUCTURE.md](STRUCTURE.md) - Master structure reference
- [TREE_DIAGRAM.md](TREE_DIAGRAM.md) - Visual tree
- [README_INVENTORY.md](README_INVENTORY.md) - All READMEs
- [CONSOLIDATION_DECISIONS.md](CONSOLIDATION_DECISIONS.md) - Decisions made
- [README.md](README.md) - Docs home
