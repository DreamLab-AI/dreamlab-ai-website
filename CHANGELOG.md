# Changelog

All notable changes to the DreamLab AI website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Security Audit Sprint] - 2026-05-11

DreamLab ecosystem-wide security audit. 10 fixes applied to
dreamlab-ai-website covering P0 critical, P1 high, P2 medium, and P3
housekeeping findings.

### Security

- **P0-15**: GDPR consent now requires explicit checkbox interaction in
  ExclusivityBanner.tsx; previously the banner accepted implicit consent
  via page scroll or navigation, which does not meet GDPR Article 7
  requirements for unambiguous consent
- **P0-16**: Supabase client null guards added on all call sites in
  supabase.ts and 3 consuming files, preventing runtime crashes when
  Supabase environment variables are missing and gracefully degrading
  instead of throwing unhandled exceptions
- **P0-17**: Production URL fallback replaced with requireEnv() in
  forum-api.ts; the previous fallback silently pointed to a hardcoded
  production URL when the environment variable was unset, which could
  route staging/dev traffic to production

### Fixed

- **P1-30**: strictNullChecks enabled in tsconfig.json with all 5
  affected files updated to handle null cases explicitly, eliminating
  an entire class of null-reference runtime errors
- **P2-11**: Mermaid diagram rendering hardened with strict mode and
  DOMPurify sanitisation in WorkshopPage.tsx, preventing XSS through
  crafted diagram definitions in user-contributed workshop content

### Added

- **P1-29**: GDPR data erasure pipeline implemented in gdpr-erasure.ts
  with supporting UI in Privacy.tsx, allowing users to request and
  execute complete deletion of their personal data
- **P1-31**: Token buy/withdraw confirmation dialog added in
  PaymentDashboard.tsx, requiring explicit user confirmation before
  executing irreversible financial transactions
- **P2-12**: AgentJobsDashboard component added in
  AgentJobsDashboard.tsx with supporting API integration in
  forum-api.ts, providing visibility into agent job status and costs

### Removed

- **P3-06**: Dead components Work.tsx and ResearchPaper.tsx removed;
  both were unreachable from the router and had no active references
- **P3-07**: Unused Three.js dependencies removed from package.json
  (@react-three/fiber, @react-three/drei, three), reducing the
  production bundle by approximately 850KB
