import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  Download,
  Fingerprint,
  GitBranch,
  Globe,
  Handshake,
  KeyRound,
  MessagesSquare,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

/**
 * VisionFlow Ecosystem — the software substrate overview.
 *
 * This content moved off the landing page (Index) so the front page can
 * focus on residential training. The #sovereign-identity anchor is linked
 * from the Index outcome cards, so keep the id stable.
 */

// The five substrates, each anchored to its public repository.
const substrates = [
  {
    id: "visionclaw",
    name: "VisionClaw",
    tagline: "Federated knowledge reasoning",
    icon: Brain,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    borderClass: "border-cyan-500/30 hover:border-cyan-500/50",
    description:
      "The reasoning core. OWL 2 EL ontologies are evaluated across 92 CUDA kernels, and the semantics drive the physics: subClassOf creates attraction, disjointWith creates repulsion. The result is a live, multi-user semantic graph you can walk through, not a static diagram.",
    repo: "https://github.com/DreamLab-AI/VisionFlow",
    repoLabel: "DreamLab-AI/VisionFlow",
  },
  {
    id: "agentbox",
    name: "Agentbox",
    tagline: "Sovereign agent runtime",
    icon: Bot,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    borderClass: "border-purple-500/30 hover:border-purple-500/50",
    description:
      "The agent habitat. Agents bootstrap with their own secp256k1 keypairs and operate a reproducible Nix runtime with 90+ skills and 180+ tools. Their working data lives in Solid pods they own — when an agent leaves, its memory and identity leave with it.",
    repo: "https://github.com/DreamLab-AI/VisionFlow",
    repoLabel: "DreamLab-AI/VisionFlow",
  },
  {
    id: "solid-pod-rs",
    name: "solid-pod-rs",
    tagline: "Sovereign data pods",
    icon: Database,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/50",
    description:
      "The data layer. A Rust implementation of the Solid pod specification with Web Access Control (WAC), so every person and every agent holds their own data under their own keys. Pods are git-versioned: history, rollback, and portability are properties of the storage itself.",
    repo: "https://github.com/DreamLab-AI/solid-pod-rs",
    repoLabel: "DreamLab-AI/solid-pod-rs",
  },
  {
    id: "nostr-rust-forum",
    name: "nostr-rust-forum",
    tagline: "Community substrate",
    icon: MessagesSquare,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    borderClass: "border-violet-500/30 hover:border-violet-500/50",
    description:
      "The human coordination layer. A Leptos WASM forum backed by five Rust Cloudflare Workers — auth, pod, relay, search, and link preview — with zoned governance enforced server-side at the relay. It also ships a retro ASCII BBS client for the terminally nostalgic.",
    repo: "https://github.com/DreamLab-AI/nostr-rust-forum",
    repoLabel: "DreamLab-AI/nostr-rust-forum",
    liveUrl: "/community/",
    liveLabel: "Live at /community/",
  },
  {
    id: "dreamlab-edge",
    name: "DreamLab Edge",
    tagline: "Branded edge deployment",
    icon: Globe,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    borderClass: "border-amber-500/30 hover:border-amber-500/50",
    description:
      "The deployment you are reading now. A thin operator overlay pins the upstream kit at an exact commit and supplies DreamLab branding, zones, and Cloudflare resource bindings. Static site on GitHub Pages, workers at the edge — the whole stack rebuilds from two repositories.",
    repo: "https://github.com/DreamLab-AI/dreamlab-ai-website",
    repoLabel: "DreamLab-AI/dreamlab-ai-website",
  },
];

// Architectural principles carried over (and expanded) from the old
// landing-page section.
const principles = [
  {
    icon: Fingerprint,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    title: "Cryptographic identity at the protocol layer",
    body: (
      <>
        Every actor — human or agent — is identified by a secp256k1{" "}
        <code className="text-xs px-1 py-0.5 rounded bg-background/70 border border-cyan-500/20">
          did:nostr
        </code>
        . Identity is verified at the relay, at the HTTP layer, and embedded in
        provenance records. There is no shared session store to compromise and
        no central account database to leak.
      </>
    ),
  },
  {
    icon: Brain,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    title: "Formal reasoning with GPU physics",
    body: (
      <>
        OWL 2 EL reasoning runs across 92 CUDA kernels.{" "}
        <code className="text-xs px-1 py-0.5 rounded bg-background/70 border border-cyan-500/20">
          subClassOf
        </code>{" "}
        creates attraction,{" "}
        <code className="text-xs px-1 py-0.5 rounded bg-background/70 border border-cyan-500/20">
          disjointWith
        </code>{" "}
        creates repulsion — so the shape of the knowledge graph is a direct,
        inspectable consequence of the logic it encodes.
      </>
    ),
  },
  {
    icon: Bot,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    title: "Sovereign agent autonomy",
    body: (
      <>
        Agents bootstrap with their own keypairs and a reproducible Nix
        runtime: 90+ skills, 180+ tools. Their data is owned in Solid pods, not
        in a platform database — agents take everything with them when they
        leave.
      </>
    ),
  },
  {
    icon: Handshake,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    title: "Human-in-the-loop governance",
    body: (
      <>
        The Judgment Broker surfaces agent decisions for human approval. Each
        decision is an immutable Nostr event carrying a{" "}
        <code className="text-xs px-1 py-0.5 rounded bg-background/70 border border-cyan-500/20">
          prior_decision_id
        </code>{" "}
        chain, so any outcome can be traced back to first principles.
      </>
    ),
  },
];

// The four sovereign-identity capabilities referenced by the landing-page
// outcome card ("4 capabilities").
const identityCapabilities = [
  {
    icon: Fingerprint,
    title: "Federated NIP-05 verification",
    body: "Human-readable identity handles verified against the domain you actually control, not an account in someone else's database.",
  },
  {
    icon: KeyRound,
    title: "Pod-provisioned signup keys",
    body: "New members receive keys provisioned through their own pod, so credential custody starts sovereign instead of being migrated later.",
  },
  {
    icon: Download,
    title: "Full data portability",
    body: "Posts, profile, and history are exportable artefacts of your pod. Leaving the platform is a copy operation, not a support ticket.",
  },
  {
    icon: GitBranch,
    title: "Git-versioned pods",
    body: "Pod contents carry full version history — rollback, audit, and diff are storage-level guarantees rather than application features.",
  },
];

const Ecosystem = () => {
  useOGMeta(PAGE_OG_CONFIGS.ecosystem);
  const { hash } = useLocation();

  // Scroll to hash on load (same pattern as Programmes) so cross-route
  // links like /ecosystem#sovereign-identity land on the right section.
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero */}
      <section id="main-content" className="pt-32 pb-12 md:pt-40 md:pb-16" aria-label="Ecosystem overview">
        <div className="container max-w-4xl mx-auto px-5 md:px-4 text-center">
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-4 font-semibold">
            VisionFlow Ecosystem
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Coordination engineering for federated human–AI intelligence
            </span>
          </h1>
          <p className="text-base md:text-lg text-foreground/80 leading-relaxed max-w-3xl mx-auto">
            VisionFlow is the open software stack behind our training and our
            community: a five-substrate architecture where autonomous agents
            and human judgment mesh through shared cryptographic identity,
            formal reasoning, and immutable governance. Agents own their data;
            humans shape their autonomy. It is also the stack our residential
            programmes teach — attendees train on the same systems that run
            this site.
          </p>
        </div>
      </section>

      {/* Architecture: principles + diagram */}
      <section
        className="py-12 md:py-16 bg-gradient-to-b from-background via-cyan-950/10 to-background"
        aria-labelledby="architecture-heading"
      >
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-12 items-start">
            <div>
              <h2 id="architecture-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                One identity spine, four guarantees
              </h2>
              <ul className="space-y-6">
                {principles.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.title} className="flex gap-4">
                      <div className={`w-10 h-10 ${p.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${p.iconColor}`} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base mb-1">{p.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Five substrates diagram */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-background/60 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 md:p-8 shadow-xl shadow-cyan-500/5">
                <h3 className="text-sm font-semibold text-cyan-300 mb-8 text-center uppercase tracking-wider">
                  Five substrates, one identity
                </h3>
                <svg
                  viewBox="0 0 480 480"
                  className="w-full h-auto"
                  role="img"
                  aria-labelledby="substrates-diagram-title"
                >
                  <title id="substrates-diagram-title">VisionFlow five-substrate architecture with DID:Nostr identity spine</title>

                  {/* Defs for subtle glow effects */}
                  <defs>
                    <filter id="glow-pink">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Connection lines (refined) */}
                  <line x1="240" y1="140" x2="240" y2="50" stroke="rgb(233,69,96)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                  <line x1="310" y1="145" x2="370" y2="75" stroke="rgb(233,69,96)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                  <line x1="310" y1="295" x2="370" y2="365" stroke="rgb(233,69,96)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                  <line x1="170" y1="295" x2="110" y2="365" stroke="rgb(233,69,96)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
                  <line x1="170" y1="145" x2="110" y2="75" stroke="rgb(233,69,96)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />

                  {/* Center circle: DID:Nostr - larger and more prominent */}
                  <circle cx="240" cy="220" r="70" fill="rgba(233,69,96,0.15)" stroke="rgb(233,69,96)" strokeWidth="3" filter="url(#glow-pink)" />
                  <text x="240" y="210" textAnchor="middle" fill="rgb(244,63,94)" fontWeight="900" fontSize="18" fontFamily="system-ui, sans-serif">DID:Nostr</text>
                  <text x="240" y="235" textAnchor="middle" fill="rgb(200,100,120)" fontSize="12" fontFamily="system-ui, sans-serif">secp256k1</text>

                  {/* VisionClaw (top) - larger and refined */}
                  <rect x="140" y="15" width="200" height="85" rx="14" fill="rgba(0,212,255,0.1)" stroke="rgb(0,212,255)" strokeWidth="2.5" />
                  <text x="240" y="45" textAnchor="middle" fill="rgb(34,211,238)" fontWeight="800" fontSize="15" fontFamily="system-ui, sans-serif">VisionClaw</text>
                  <text x="240" y="68" textAnchor="middle" fill="rgb(120,200,220)" fontSize="12" fontFamily="system-ui, sans-serif">OWL 2 EL + GPU</text>

                  {/* Agentbox (top-right) */}
                  <rect x="345" y="40" width="120" height="85" rx="14" fill="rgba(139,92,246,0.1)" stroke="rgb(139,92,246)" strokeWidth="2.5" />
                  <text x="405" y="70" textAnchor="middle" fill="rgb(196,181,253)" fontWeight="800" fontSize="15" fontFamily="system-ui, sans-serif">Agentbox</text>
                  <text x="405" y="93" textAnchor="middle" fill="rgb(170,150,200)" fontSize="12" fontFamily="system-ui, sans-serif">90+ Skills</text>

                  {/* DreamLab Edge (bottom-right) */}
                  <rect x="345" y="375" width="120" height="85" rx="14" fill="rgba(245,158,11,0.1)" stroke="rgb(245,158,11)" strokeWidth="2.5" />
                  <text x="405" y="405" textAnchor="middle" fill="rgb(253,224,71)" fontWeight="800" fontSize="15" fontFamily="system-ui, sans-serif">DreamLab</text>
                  <text x="405" y="428" textAnchor="middle" fill="rgb(220,190,100)" fontSize="12" fontFamily="system-ui, sans-serif">Edge</text>

                  {/* nostr-rust-forum (bottom-left) */}
                  <rect x="15" y="375" width="120" height="85" rx="14" fill="rgba(168,85,247,0.1)" stroke="rgb(168,85,247)" strokeWidth="2.5" />
                  <text x="75" y="400" textAnchor="middle" fill="rgb(216,180,254)" fontWeight="800" fontSize="14" fontFamily="system-ui, sans-serif">nostr-rust</text>
                  <text x="75" y="420" textAnchor="middle" fill="rgb(200,170,220)" fontSize="12" fontFamily="system-ui, sans-serif">forum</text>

                  {/* solid-pod-rs (top-left) */}
                  <rect x="15" y="40" width="120" height="85" rx="14" fill="rgba(16,185,129,0.1)" stroke="rgb(16,185,129)" strokeWidth="2.5" />
                  <text x="75" y="68" textAnchor="middle" fill="rgb(52,211,153)" fontWeight="800" fontSize="15" fontFamily="system-ui, sans-serif">solid-pod-rs</text>
                  <text x="75" y="91" textAnchor="middle" fill="rgb(100,180,150)" fontSize="12" fontFamily="system-ui, sans-serif">WAC</text>

                  {/* Bottom label */}
                  <text x="240" y="470" textAnchor="middle" fill="rgb(120,130,150)" fontSize="12" fontStyle="italic" fontFamily="system-ui, sans-serif" fontWeight="500">
                    Nostr relay mesh
                  </text>
                </svg>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Identity flows through all five. Coordination via Nostr relay mesh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The five substrates in detail */}
      <section className="py-12 md:py-16" aria-labelledby="substrates-heading">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-10 md:mb-14">
            <h2 id="substrates-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              The five substrates
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Each layer is an independent open-source project. Together they
              form one federated system with a single cryptographic identity
              spine.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {substrates.map((s) => {
              const Icon = s.icon;
              return (
                <article
                  key={s.id}
                  className={`glass-card-interactive border ${s.borderClass} !rounded-xl p-5 md:p-6 ${
                    s.id === "dreamlab-edge" ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 ${s.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.iconColor}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.tagline}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.description}</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <a
                      href={s.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm ${s.iconColor} hover:underline inline-flex items-center gap-1`}
                    >
                      <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                      {s.repoLabel}
                      <span className="sr-only"> (opens in new window)</span>
                    </a>
                    {s.liveUrl && (
                      <a
                        href={s.liveUrl}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                      >
                        {s.liveLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sovereign identity — anchor target for the landing-page card */}
      <section
        id="sovereign-identity"
        className="py-12 md:py-16 bg-gradient-to-b from-background to-indigo-950/10 scroll-mt-24"
        aria-labelledby="sovereign-identity-heading"
      >
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-10 md:mb-14">
            <h2 id="sovereign-identity-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Sovereign identity in practice
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Your forum identity lives on your own pod, not in our database.
              Four capabilities make that concrete.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
            {identityCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="bg-background/50 backdrop-blur border border-indigo-500/20 rounded-xl p-5 md:p-6 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20" aria-label="Get involved">
        <div className="container max-w-4xl mx-auto px-5 md:px-4">
          <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Build on it, or learn to run it
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              The whole stack is open source, and our residential programmes
              train teams on exactly these systems — agentics, sovereign
              identity, and federated coordination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/DreamLab-AI/VisionFlow"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-white text-purple-700 hover:bg-white/90 hover:scale-105 transition-all min-h-[48px] px-6 py-3"
              >
                Explore VisionFlow on GitHub <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </a>
              <Link
                to="/programmes"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all min-h-[48px] px-6 py-3"
              >
                See the Training Programmes
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="/community/"
              className="text-muted-foreground hover:text-purple-400 text-sm font-medium hover:underline inline-flex items-center gap-1 transition-colors"
            >
              Or join the community conversation <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t" role="contentinfo">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Impact Stories</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Ecosystem;
