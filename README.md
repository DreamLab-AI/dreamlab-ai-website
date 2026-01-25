<div align="center">

# DreamLab AI

### Transform Your Organisation with Advanced AI Training

[![Live Site](https://img.shields.io/badge/Live-dreamlab--ai.com-00D4AA?style=for-the-badge&logo=vercel&logoColor=white)](https://dreamlab-ai.com)
[![Community](https://img.shields.io/badge/Community-Nostr_Forum-9B59B6?style=for-the-badge&logo=mastodon&logoColor=white)](https://dreamlab-ai.com/community)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

**Premium AI training and consulting for operations leaders, founders, and technical teams.**

[Explore Training Programs](#-training-programs) · [View Documentation](docs/README.md) · [Join Community](https://dreamlab-ai.com/community)

---

<img src="public/images/hero-preview.png" alt="DreamLab AI Platform" width="800"/>

</div>

## The Challenge

Organisations struggle to implement AI effectively. Generic courses teach theory without practical application. Internal teams lack the expertise to build production-ready AI systems. The gap between AI potential and real-world deployment continues to widen.

## Our Solution

DreamLab AI bridges this gap through **intensive, hands-on training programs** where participants build working AI systems alongside world-class practitioners. No slides. No lectures. Pure implementation.

---

## 🎓 Training Programs

<table>
<tr>
<td width="33%" valign="top">

### 🏰 Residential Masterclass
**2 Days · Up to 4 Participants**

Immersive deep-dive into multi-agent AI systems at a luxury countryside estate. Leave with a production-ready AI implementation tailored to your business.

**Includes:**
- Luxury accommodation & meals
- 1:1 expert pairing
- Custom AI system build
- 90-day follow-up support

</td>
<td width="33%" valign="top">

### 🏢 Corporate Workshop
**1 Day · Up to 6 Participants**

We come to you. Your team builds a working AI agent on-site, using your actual business data and workflows.

**Includes:**
- On-site delivery
- Hands-on implementation
- Team capability building
- Deployment assistance

</td>
<td width="33%" valign="top">

### 🎯 Bespoke Consulting
**Custom Duration · Flexible**

Strategic AI advisory and implementation support for complex enterprise requirements.

**Includes:**
- AI strategy development
- Architecture design
- Implementation oversight
- Technology selection

</td>
</tr>
</table>

<div align="center">

[**Book Your Training →**](https://dreamlab-ai.com/contact)

</div>

---

## 🛠 Technology Stack

<table>
<tr><td colspan="2"><strong>Frontend</strong></td></tr>
<tr>
<td><img src="https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black" alt="React"/></td>
<td>Concurrent rendering, Suspense, automatic batching</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/></td>
<td>End-to-end type safety, enhanced developer experience</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/Vite-5.4.21-646CFF?logo=vite&logoColor=white" alt="Vite"/></td>
<td>Sub-second HMR, optimised production builds</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/Tailwind-3.4.11-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind"/></td>
<td>Utility-first styling with shadcn/ui components</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/Three.js-0.156-000000?logo=threedotjs&logoColor=white" alt="Three.js"/></td>
<td>WebGL visualisations with React Three Fiber</td>
</tr>
<tr><td colspan="2"><strong>Backend & Services</strong></td></tr>
<tr>
<td><img src="https://img.shields.io/badge/Supabase-2.49.4-3FCF8E?logo=supabase&logoColor=white" alt="Supabase"/></td>
<td>Authentication, PostgreSQL database, file storage</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/Nostr-NDK_2.13-9B59B6?logo=nostr&logoColor=white" alt="Nostr"/></td>
<td>Decentralised community forum with E2E encryption</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/TanStack_Query-5.56-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query"/></td>
<td>Intelligent data fetching, caching, synchronisation</td>
</tr>
<tr><td colspan="2"><strong>Infrastructure</strong></td></tr>
<tr>
<td><img src="https://img.shields.io/badge/GitHub_Pages-222222?logo=github&logoColor=white" alt="GitHub Pages"/></td>
<td>Static site hosting with automatic deployments</td>
</tr>
<tr>
<td><img src="https://img.shields.io/badge/Cloud_Run-4285F4?logo=googlecloud&logoColor=white" alt="Cloud Run"/></td>
<td>Nostr relay, embedding API, image processing</td>
</tr>
</table>

---

## 📁 Project Structure

```
dreamlab-ai-website/
├── src/
│   ├── components/          # 70+ React components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── Hero.tsx         # 3D animated hero section
│   │   ├── Navigation.tsx   # Responsive navigation
│   │   └── ...
│   ├── pages/               # 13 route pages
│   │   ├── Index.tsx        # Landing page
│   │   ├── Masterclass.tsx  # Residential training
│   │   ├── Team.tsx         # 44+ expert profiles
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities & Supabase client
│   └── types/               # TypeScript definitions
│
├── community-forum/         # Nostr-powered forum (SvelteKit)
│   ├── src/                 # Forum application
│   ├── services/            # Microservices
│   │   ├── nostr-relay/     # WebSocket relay server
│   │   ├── embedding-api/   # Semantic search vectors
│   │   └── image-api/       # Image processing
│   └── tests/               # E2E & performance tests
│
├── public/
│   └── data/
│       ├── team/            # 44 expert profiles (markdown)
│       ├── workshops/       # Workshop content
│       └── showcase/        # Portfolio projects
│
├── docs/                    # Comprehensive documentation
│   ├── architecture/        # System design
│   ├── api/                 # API references
│   ├── developer/           # Developer guides
│   ├── deployment/          # Operations guides
│   ├── security/            # Security documentation
│   └── user/                # End-user guides
│
└── wasm-voronoi/            # Rust WASM background effects
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0

### Development

```bash
# Clone repository
git clone git@github.com:DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — changes hot-reload instantly.

### Production Build

```bash
# Build optimised bundle
npm run build

# Preview production build
npm run preview
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Create optimised production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint code quality checks |

---

## 🌐 Nostr Community Forum

Our community runs on the **Nostr protocol** — a censorship-resistant, decentralised social network.

### Why Nostr?

- **No email required** — authenticate with cryptographic keys
- **You own your identity** — portable across any Nostr client
- **End-to-end encryption** — private messages stay private
- **No central authority** — distributed across independent relays

### Supported NIPs

| NIP | Feature |
|-----|---------|
| NIP-01 | Basic protocol & event signing |
| NIP-07 | Browser extension authentication (Alby, nos2x) |
| NIP-17/59 | Encrypted direct messages with gift wrapping |
| NIP-28 | Public chat channels |
| NIP-44 | XChaCha20-Poly1305 encryption |
| NIP-52 | Calendar events for workshops |

<div align="center">

[**Join the Community →**](https://dreamlab-ai.com/community)

</div>

---

## 📖 Documentation

<table>
<tr>
<td width="25%" align="center">
<a href="docs/architecture/SYSTEM_OVERVIEW.md">
<strong>🏗 Architecture</strong><br/>
<sub>System design & patterns</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/api/NOSTR_RELAY.md">
<strong>🔌 API Reference</strong><br/>
<sub>Nostr, Embedding, Supabase</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/developer/GETTING_STARTED.md">
<strong>💻 Developer Guide</strong><br/>
<sub>Setup, workflow, testing</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/deployment/GITHUB_PAGES.md">
<strong>🚢 Deployment</strong><br/>
<sub>CI/CD, Cloud Run, monitoring</sub>
</a>
</td>
</tr>
<tr>
<td width="25%" align="center">
<a href="docs/security/SECURITY_OVERVIEW.md">
<strong>🔐 Security</strong><br/>
<sub>Auth, encryption, compliance</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/user/INDEX.md">
<strong>📚 User Guide</strong><br/>
<sub>Website & forum usage</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/STRUCTURE.md">
<strong>🗺 Docs Map</strong><br/>
<sub>Complete structure reference</sub>
</a>
</td>
<td width="25%" align="center">
<a href="docs/CONTRIBUTING.md">
<strong>🤝 Contributing</strong><br/>
<sub>Code standards & workflow</sub>
</a>
</td>
</tr>
</table>

---

## 📊 Performance

<table>
<tr>
<td align="center"><strong>98</strong><br/><sub>Performance</sub></td>
<td align="center"><strong>100</strong><br/><sub>Accessibility</sub></td>
<td align="center"><strong>100</strong><br/><sub>Best Practices</sub></td>
<td align="center"><strong>100</strong><br/><sub>SEO</sub></td>
</tr>
</table>

**Optimisations:**
- Route-based code splitting with React.lazy
- Image optimisation (WebP, lazy loading, srcset)
- TanStack Query intelligent caching
- Three.js performance budgets
- Rust WASM for compute-intensive effects

---

## 🔒 Security

| Layer | Implementation |
|-------|----------------|
| **Authentication** | Supabase Auth + NIP-07 browser extensions |
| **Encryption** | NIP-44 (XChaCha20-Poly1305), TLS 1.3 |
| **Data Protection** | Row-level security, GDPR compliance |
| **Input Validation** | Zod schemas, DOMPurify sanitisation |
| **Key Management** | Hardware keys via browser extensions |

See [Security Documentation](docs/security/SECURITY_OVERVIEW.md) for full details.

---

## 🗺 Roadmap

- [x] Main website with React 18
- [x] Nostr community forum
- [x] Encrypted direct messaging
- [x] Calendar events (NIP-52)
- [x] Semantic search with vector embeddings
- [ ] Mobile PWA with offline support
- [ ] AI-powered workshop recommendations
- [ ] Multi-language support

---

## 🤝 Contributing

We welcome contributions from the community. Please read our [Contributing Guide](docs/CONTRIBUTING.md) before submitting pull requests.

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

---

## 📄 Licence

**Proprietary Software**

Copyright © 2024-2026 DreamLab AI Consulting Ltd. All rights reserved.

This software is proprietary and confidential. Unauthorised copying, distribution, modification, or use is strictly prohibited without explicit written permission from DreamLab AI Consulting Ltd.

---

<div align="center">

## 📬 Contact

[**dreamlab-ai.com**](https://dreamlab-ai.com) · [**Contact Us**](https://dreamlab-ai.com/contact) · [**Community Forum**](https://dreamlab-ai.com/community)

---

**Built with precision by DreamLab AI**

*Empowering the next generation of AI leaders*

<sub>React · TypeScript · Vite · Tailwind · Three.js · Supabase · Nostr</sub>

</div>
