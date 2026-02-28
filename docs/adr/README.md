---
title: "Architecture Decision Records"
description: "Index of architecture decision records documenting key technical decisions for DreamLab AI"
category: reference
tags: [architecture, adr, reference, developer, decisions]
difficulty: intermediate
last-updated: 2026-02-28
---

# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the DreamLab AI platform.

## ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](001-nostr-protocol-foundation.md) | Nostr Protocol as Foundation | Accepted | 2024-01 |
| [ADR-002](002-three-tier-hierarchy.md) | Three-Tier Hierarchy | Accepted | 2024-01 |
| [ADR-003](003-gcp-cloud-run-infrastructure.md) | GCP Cloud Run Infrastructure | Superseded by ADR-010 | 2024-02 |
| [ADR-004](004-zone-based-access-control.md) | Zone-Based Access Control | Accepted | 2024-02 |
| [ADR-005](005-nip-44-encryption-mandate.md) | NIP-44 Encryption Mandate | Accepted | 2024-03 |
| [ADR-006](006-client-side-wasm-search.md) | Client-Side WASM Search | Accepted | 2024-03 |
| [ADR-007](007-sveltekit-ndk-frontend.md) | SvelteKit + NDK Frontend | Accepted | 2024-01 |
| [ADR-008](008-postgresql-relay-storage.md) | PostgreSQL Relay Storage | Accepted | 2024-02 |
| [ADR-009](009-user-registration-flow.md) | User Registration Flow | Accepted | 2026-01 |
| [ADR-010](010-return-to-cloudflare.md) | Return to Cloudflare Platform | Accepted (supersedes ADR-003) | 2026-02 |

## ADR Template

Use [000-template.md](000-template.md) when creating new ADRs.

## Status Definitions

- **Proposed** -- under discussion
- **Accepted** -- decision made and implemented
- **Superseded** -- replaced by a newer ADR (see superseding ADR for rationale)
- **Rejected** -- considered but not adopted

## Core Stack

- **Protocol**: Nostr (NIPs 01, 17, 25, 28, 42, 44, 52, 59, 98)
- **Frontend**: React 18.3 (main site) + SvelteKit 2.49 (community forum)
- **Auth**: WebAuthn PRF + NIP-98 HTTP auth
- **Backend**: GCP Cloud Run (relay, embedding-api) + Cloudflare Workers (auth-api, pod-api, image-api, link-preview-api)
- **Database**: PostgreSQL (relay), D1/SQLite (auth), R2 (pod/image storage), KV (sessions, ACLs)
- **Hosting**: Cloudflare Pages (static site + forum)
