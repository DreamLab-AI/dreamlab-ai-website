<div align="center">

# DreamLab AI website

### Marketing, community and operator configuration on one public origin

[Website](https://www.dreamlab-ai.com/) · [Community](https://www.dreamlab-ai.com/community/) · [Start](#local-development) · [Architecture](#how-it-is-deployed) · [Status](#working-status) · [Docs](docs/README.md)

</div>

**The company website and branded deployment of the Nostr forum kit.** This repository owns DreamLab's React content, browser-side contact/chat integration and operator overlay. The community clients, relay and service implementations come from [nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum) at explicitly recorded source and library pins.

Visitors can explore services and workshops, send an enquiry, talk to a configured agent or join a community. Operators configure zones, service identities and Cloudflare resources here. Protocol changes belong upstream in the kit; changing this repository's pin selects which implementation is built.

## Local development

For the marketing site, use Node 20 or later:

```sh
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website
npm ci --include=dev
npm run dev
```

Open the Vite URL printed by the command, normally `http://localhost:5173`. This starts the React site; it does not deploy workers or build all community clients.

```sh
npm run build
npm run lint
npm test -- --run
```

The production build also generates content, prerenders routes and checks discovery output through the scripts in [`package.json`](package.json). Community/worker builds require the pinned Rust/WASM toolchain and operator resources described in [deployment](docs/deployment/README.md). Keep credentials in the configured secret stores, not source files.

## How it is deployed

```mermaid
flowchart TB
    KIT["Pinned nostr-rust-forum source and libraries"] --> CI["Build and overlay workflows"]
    CONFIG["DreamLab TOML, resource manifests and branding"] --> CI
    REACT["React marketing source"] --> CI
    CI --> PAGES["GitHub Pages: one origin"]
    PAGES --> SITE["Marketing at /"]
    PAGES --> FORUM["Leptos forum at /community/"]
    PAGES --> BBS["Retro client at /community/bbs/"]
    CI --> WORKERS["Cloudflare auth, pod, preview, relay and search workers"]
    SITE -->|"Nostr contact and agent chat"| WORKERS
    FORUM --> WORKERS
    BBS --> WORKERS
    WORKERS --> STORAGE["D1, KV, R2, Durable Objects and configured AI services"]
```

There are **three independently built frontends**, as recorded in [ADR-2003](docs/adr/ADR-2003-three-frontends-one-origin.md). The page origin and the worker runtime are separate hosting surfaces. A successful React build is not a complete community deployment.

| Source | Owns |
|---|---|
| [`src/`](src/) and [`public/`](public/) | Marketing content, routes, brand assets and browser integration |
| [`forum-config/dreamlab.toml`](forum-config/dreamlab.toml) | Operator features, zones, declared agents and ingress recipients |
| [`forum-config/deploy/`](forum-config/deploy/) | Worker bindings, resource IDs, origins and relay configuration |
| [`forum-config/Cargo.toml`](forum-config/Cargo.toml) | Library dependencies selected for the overlay |
| [Kit compatibility record](docs/architecture/kit-compatibility-record.md) | Canonical source SHA, library versions and pin history |
| [Deploy workflow](.github/workflows/deploy.yml) and [worker workflow](.github/workflows/workers-deploy.yml) | Source checkout, builds, environment projection and publication |

The inspected workflows pin kit source `631c09f…`. Library version pins are independent of client-only source changes; use the compatibility record and manifests rather than an old beta number copied into a README. Pin/mirror checks guard agreement among the declared sites, not the freshness of a live deployment.

## Community and contact flows

The current overlay defines a public **Welcome** zone and locked **Minimoonoir**, **Family** and **DreamLab** zones. Their configured cohorts, encryption and agent-key policy are in the TOML and relay binding; they replace the older public/friends/family/business labels shown in some screenshots.

Access checks belong at the relay and services. A visible locked tile is a presentation of policy, not enforcement by itself. Browser and worker projections must agree; the repository's mirror checks cover those duplicated values.

Contact, signup and agent chat use Nostr gift-wrap messages. Configured recipients and co-recipient copies determine who can read each message. The declared `website-info` identity monitors ingress with no cohorts or administrative privileges; additional recipient copies are additional holders of the message content. See [ADR-2011](docs/adr/ADR-2011-website-information-identity.md) for the identity and verification record, and [`src/lib/nostr.ts`](src/lib/nostr.ts) for browser transport.

<details>
<summary><strong>Recent operator and kit changes</strong></summary>

The history since the September README update includes:

- Nostr-based contact/signup/chat ingress, declared recipients and an inbox-watch path; delivery acknowledgement and a human response remain separate events.
- Kit updates for recipient-scoped gift-wrap reads, logout teardown, relay gates and reviewed security fixes.
- A relay `RELAY_URL` binding that scopes NIP-42 authentication to this deployment, replacing the old claim that the relay uses only a pubkey allowlist.
- Web Push enabled in the operator overlay after the kit's content-free push support; browser permission, subscription and worker configuration remain required.
- Content generation, prerender/discovery checks, route normalisation, SEO monitoring and refreshed company branding.

Consult the current configuration and compatibility history for exact flags and revisions. Source changes and an accepted nightly experiment are not proof that production has deployed them.

</details>

<details>
<summary><strong>Earlier captured screens</strong></summary>

These repository screenshots show earlier branding, zone labels and UI states. They illustrate the surfaces, not today's deployment or an independent proof of encryption, cohort enforcement or passkey behaviour.

| Marketing | Community landing |
|---|---|
| ![Earlier marketing hero with a glowing mesh and training links](docs/images/screenshots/main-site-hero.webp) | ![Earlier signed-out MiniMooNoir forum landing](docs/images/screenshots/forum-landing.webp) |

| Zone tiles | Friends chat |
|---|---|
| ![Earlier zone list with Public and Friends visible and other zones locked](docs/images/screenshots/forum-zones-friends-view.webp) | ![Earlier Friends topic with messages and a composer](docs/images/screenshots/forum-section-friends-chat.webp) |

![Earlier events list containing a titled event and untitled entries](docs/images/screenshots/forum-events-freebusy-friends.webp)

</details>

## Where it sits in VisionFlow

[VisionFlow](https://github.com/DreamLab-AI/VisionFlow) owns the cross-estate guide. This repository is the commercial site and operator deployment. [nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum) owns the community kit; [Agentbox](https://github.com/DreamLab-AI/agentbox) owns configured agent services. Knowledge tooling and [Loom](https://github.com/DreamLab-AI/loom) have separate runtimes and acceptance evidence. Hosting this site does not deploy the whole estate.

## Working status

**Source reviewed 21 October 2026 at `79635b52`.** The repository contains the React site, overlay and publication workflows. Source review confirms the newer pins, relay URL and ingress configuration. No live contact message, production deployment, push subscription or full multi-client acceptance run was performed during this README refresh.

Use [the baseline](docs/BASELINE-architecture.md), [identity/zones](docs/IDENTITY-zones.md), [security overview](docs/security/SECURITY_OVERVIEW.md), [deployment guide](docs/deployment/README.md) and [decision ledger](docs/adr/README.md) for their respective contracts. Older July maturity tables and pin values do not describe current source.

## Licence

This repository is **dual-licensed by surface**:

**1. Branded React site (proprietary).** The branded React/WASM application —
everything outside `forum-config/` and the forum surfaces — is proprietary.
Copyright 2024-2026 DreamLab AI Consulting Ltd. All rights reserved. The root
`package.json` is marked `UNLICENSED` and applies to this React site.

**2. Forum surfaces (AGPL-3.0-only).** The forum surfaces — `forum-config/`, the
deployed Cloudflare workers (auth/pod/relay/preview/search), and the Leptos forum
client — are **combined works** of the AGPL-3.0-only
[nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum) kit, whose
AGPL crates `forum-config` statically links. They are therefore licensed under
**AGPL-3.0-only**. Per **AGPL §13**, users who interact with these surfaces over
a network are entitled to the corresponding source: the canonical source offer is
the upstream kit repository (pinned at the rev recorded in
[`forum-config/Cargo.toml`](forum-config/Cargo.toml)), and the local operator
overlay source lives in [`forum-config/`](forum-config/) (see
[`forum-config/LICENSE`](forum-config/LICENSE)).


Maintained by [DreamLab AI](https://www.dreamlab-ai.com/) and [John O'Hare](https://github.com/jjohare). [MAINTAINERS.md](MAINTAINERS.md) records maintainers and upstream credit.
