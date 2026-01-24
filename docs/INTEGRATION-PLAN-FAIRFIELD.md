# Fairfield Integration Plan for DreamLab Website

**Status**: AWAITING SIGN-OFF
**Date**: 2026-01-24
**Branch**: feature/browser-automation-integration

---

## Executive Summary

Integrate the Fairfield Nostr BBS platform into the DreamLab AI website, adding "Bookings" and "Chat" navigation items that link directly to the DreamLab business zone, bypassing the Minimoonoir and Family zones from the UI perspective while keeping all features enabled.

---

## Current State Analysis

### DreamLab Website (React/Vite)
- **Framework**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Deployment**: GitHub Pages (static)
- **Navigation**: Header.tsx with dropdown menu
- **Current menu items**: Home, Team, Residential Training, Workshops, Work, Testimonials, System Design, Contact

### Fairfield Platform (SvelteKit)
- **Framework**: SvelteKit 5 + TailwindCSS + DaisyUI
- **Protocol**: Nostr (NDK) - decentralized messaging
- **Deployment**: GitHub Pages (frontend) + GCP Cloud Run (backend services)
- **3 Zones configured**:
  1. **Family** (`fairfield-family`) - Private family zone
  2. **Minimoonoir** (`minimoonoir`) - Friends & visitors zone (default landing)
  3. **DreamLab** (`dreamlab`) - Business training zone (TARGET for integration)

### DreamLab Zone Sections
| Section | ID | Purpose | Booking Capable |
|---------|-----|---------|-----------------|
| DreamLab Lobby | `dreamlab-lobby` | Welcome area | No |
| Training Rooms | `dreamlab-training` | Active training sessions | Yes (calendar) |
| Projects | `dreamlab-projects` | Collaborative work | No |
| Facility Booking | `dreamlab-bookings` | Book rooms/equipment | Yes (calendar) |

---

## Integration Architecture

### Option A: Separate Deployments with Deep Links (RECOMMENDED)

```
dreamlab-ai.com (React)          fairfield.dreamlab-ai.com (SvelteKit)
┌─────────────────────┐          ┌─────────────────────────────────┐
│  Header.tsx         │          │  Nostr BBS Platform             │
│  ├─ Bookings ───────┼──────────┼─► /dreamlab/dreamlab-bookings   │
│  └─ Chat ───────────┼──────────┼─► /dreamlab/dreamlab-lobby      │
│                     │          │                                 │
│  Main Website       │          │  DreamLab Zone (default)        │
│  (marketing pages)  │          │  Family/Minimoonoir (hidden UI) │
└─────────────────────┘          └─────────────────────────────────┘
```

**Rationale**:
- Keeps codebases separate (React vs SvelteKit) - no framework conflicts
- Fairfield already has production deployment on GitHub Pages
- Minimal changes required - just add links and configure default zone

### Option B: Iframe Embedding (NOT RECOMMENDED)

Would embed fairfield as iframe within React shell. Not recommended due to:
- Nostr WebSocket connections may fail in iframe context
- PWA features (offline, service worker) compromised
- Authentication flow complications
- Poor UX for deep linking and navigation

### Option C: Port to React (NOT RECOMMENDED)

Would rewrite fairfield components in React. Not recommended due to:
- 50+ SvelteKit components would need porting
- Nostr NDK integration is Svelte-optimized
- Significant development effort for marginal benefit
- Would break existing fairfield deployment

---

## Implementation Plan

### Phase 1: Deployment Configuration (GitHub Actions)

**1.1 Move fairfield workflows to root `.github/workflows/`**

```
.github/workflows/
├── deploy-website.yml       (existing dreamlab site)
├── fairfield-pages.yml      (renamed from deploy-pages.yml)
├── fairfield-embedding.yml  (renamed from deploy-embedding-api.yml)
├── fairfield-image.yml      (renamed from deploy-image-api.yml)
├── fairfield-relay.yml      (renamed from deploy-nostr-relay-gcp.yml)
├── fairfield-embeddings.yml (renamed from generate-embeddings.yml)
└── fairfield-docs.yml       (merged docs workflows)
```

**1.2 Update workflow paths to build from `fairfield/` subdirectory**

Each workflow will be updated:
```yaml
# Example: fairfield-pages.yml
defaults:
  run:
    working-directory: fairfield

on:
  push:
    paths:
      - 'fairfield/**'
      - '.github/workflows/fairfield-*.yml'
```

**1.3 Configure subdomain deployment**

Option A (GitHub Pages): Deploy to `fairfield.dreamlab-ai.com` via CNAME
Option B (Same domain): Deploy to `dreamlab-ai.com/community/` path

### Phase 2: Default Zone Configuration

**2.1 Update `fairfield/config/sections.yaml`**

Change default path from minimoonoir to dreamlab:
```yaml
app:
  name: 'Fairfield'
  version: '2.0.0'
  defaultPath: '/dreamlab/dreamlab-lobby'  # Changed from /minimoonoir/minimoonoir-welcome
```

**2.2 Add DreamLab-specific landing route**

Create `fairfield/src/routes/+page.svelte` redirect:
```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/dreamlab/dreamlab-lobby');
  });
</script>
```

**2.3 Hide zone selector for non-cross-access users**

The existing cohort system already handles this - users in `business` or `trainees` cohorts cannot see `family` or `minimoonoir` zones.

### Phase 3: Navigation Integration

**3.1 Update `src/components/Header.tsx`**

Add new menu items after Workshops:
```tsx
<DropdownMenuSeparator />
<DropdownMenuItem asChild>
  <a href="https://fairfield.dreamlab-ai.com/dreamlab/dreamlab-bookings"
     target="_blank" rel="noopener noreferrer" className="w-full">
    Bookings<span className="sr-only"> (opens DreamLab booking system)</span>
  </a>
</DropdownMenuItem>
<DropdownMenuItem asChild>
  <a href="https://fairfield.dreamlab-ai.com/dreamlab/dreamlab-lobby"
     target="_blank" rel="noopener noreferrer" className="w-full">
    Community Chat<span className="sr-only"> (opens DreamLab forum)</span>
  </a>
</DropdownMenuItem>
<DropdownMenuSeparator />
```

**3.2 Deep link targets**

| Menu Item | Target URL | Zone Section |
|-----------|------------|--------------|
| Bookings | `/dreamlab/dreamlab-bookings` | Facility Booking (calendar) |
| Community Chat | `/dreamlab/dreamlab-lobby` | DreamLab Lobby (forum) |

### Phase 4: Authentication Flow

**4.1 Nostr Identity**

Fairfield uses Nostr keypairs for authentication. Options:
- **Keep separate**: Users create Nostr identity in fairfield (RECOMMENDED)
- **Share via NIP-07**: Users with browser extension can use same identity

**4.2 Business cohort auto-assignment**

For users coming from dreamlab website, add them to `business` cohort by default:
```yaml
# In sections.yaml - already configured:
cohorts:
  - id: 'business'
    name: 'Business Partners'
    description: 'DreamLab business collaborators and trainees'
```

### Phase 5: Zone Isolation (Bypass Logic)

**5.1 What stays hidden**

Users in the `business` cohort will NOT see:
- Family zone (`fairfield-family`) - hidden via `hiddenFromCohorts: ['business-only']`
- Minimoonoir zone (hidden unless they also have `minimoonoir` cohort)

**5.2 What stays enabled**

All zone features remain functional for users with appropriate cohorts:
- Family members can still access family zone
- Minimoonoir guests can still access their zone
- Cross-access users (owners) see everything

**5.3 No code changes required**

The existing `access.visibleToCohorts` and `access.hiddenFromCohorts` configuration in `sections.yaml` already handles zone isolation. Users in `business-only` cohort only see DreamLab zone.

---

## File Changes Summary

### Files to Move (fairfield/.github → .github)
```
fairfield/.github/workflows/deploy-pages.yml      → .github/workflows/fairfield-pages.yml
fairfield/.github/workflows/deploy-embedding-api.yml  → .github/workflows/fairfield-embedding.yml
fairfield/.github/workflows/deploy-image-api.yml      → .github/workflows/fairfield-image.yml
fairfield/.github/workflows/deploy-nostr-relay-gcp.yml → .github/workflows/fairfield-relay.yml
fairfield/.github/workflows/generate-embeddings.yml   → .github/workflows/fairfield-embeddings.yml
fairfield/.github/workflows/docs-update.yml           → .github/workflows/fairfield-docs.yml
fairfield/.github/workflows/docs-validation.yml       → (merge into fairfield-docs.yml)
```

### Files to Edit
```
src/components/Header.tsx           - Add Bookings and Chat menu items
fairfield/config/sections.yaml      - Change defaultPath to dreamlab zone
fairfield/src/routes/+page.svelte   - Add redirect to dreamlab zone
```

### Files to Delete
```
fairfield/.github/                  - After moving workflows
```

---

## Deployment Strategy

### Pre-deployment Checklist
- [ ] Backup current fairfield deployment
- [ ] Test dreamlab zone access with business cohort
- [ ] Verify all workflows build correctly from fairfield/ subdirectory
- [ ] Configure DNS for fairfield.dreamlab-ai.com (if subdomain approach)

### Deployment Order
1. Update sections.yaml with new defaultPath
2. Move and update GitHub workflows
3. Update Header.tsx with new menu items
4. Deploy fairfield (verify zone default works)
5. Deploy dreamlab main site (verify links work)

### Rollback Plan
- Keep fairfield/.github backup for 7 days
- sections.yaml change is single-line revert
- Header.tsx change is isolated menu items

---

## Testing Requirements

### Functional Tests
1. **Deep link navigation**: Click Bookings → lands on dreamlab-bookings section
2. **Deep link navigation**: Click Chat → lands on dreamlab-lobby section
3. **Zone isolation**: Business cohort user cannot see family/minimoonoir zones
4. **Calendar access**: Booking calendar displays correctly in dreamlab-bookings
5. **Forum access**: Forum posts visible in dreamlab-lobby

### Integration Tests
1. **GitHub Actions**: fairfield-pages.yml builds from fairfield/ subdirectory
2. **Backend services**: Nostr relay, embedding API, image API still functional
3. **Authentication**: New users can create Nostr identity and access dreamlab zone

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Workflow path errors | Build failure | Test in feature branch first |
| Zone config breaks existing users | High | Cohort system unchanged, only default path changes |
| Deep links break on SvelteKit routing | Medium | Test all deep link targets |
| Nostr relay connection issues | High | Relay is independent service, unchanged |

---

## Questions for Sign-off

1. **Subdomain vs Path**: Deploy to `fairfield.dreamlab-ai.com` or `dreamlab-ai.com/community/`?
2. **Menu naming**: "Bookings" and "Community Chat" or different labels?
3. **Opens in**: New tab (recommended) or same tab?
4. **User onboarding**: Add a "How to get started" page for new users?

---

## Approval

- [ ] Approve Phase 1: Deployment Configuration
- [ ] Approve Phase 2: Default Zone Configuration
- [ ] Approve Phase 3: Navigation Integration
- [ ] Approve Phase 4: Authentication Flow
- [ ] Approve Phase 5: Zone Isolation

**Sign-off**: ___________________ Date: ___________
