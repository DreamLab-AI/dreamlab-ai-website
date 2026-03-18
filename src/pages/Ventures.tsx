import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { HyperdimensionalHeroBackground } from "@/components/HyperdimensionalHeroBackground";
import { useOGMeta } from "@/hooks/useOGMeta";
import {
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Rocket,
  Zap,
  Building2,
  Users,
  Brain,
  Target,
  Shield,
  Lightbulb,
  TrendingUp,
  Handshake,
  Clock,
  MapPin,
  Network,
  GraduationCap,
  BarChart3,
  Layers,
  Gift,
  Star,
} from "lucide-react";

/**
 * Venture Lab — Productised deep tech accelerator for startups & scaleups.
 *
 * Tiered engagement model:
 *   1. Discovery Session (free, 2 hours)
 *   2. Build Sprint (1 day, at your location or ours)
 *   3. Residency (2-5 days, Lake District facility)
 *   4. Venture Partner (ongoing fractional CTO + specialist access)
 *
 * Unlinked from main navigation — accessible only via direct URL.
 */

// Programme tiers
const tiers = [
  {
    id: "discovery",
    name: "Discovery Session",
    tagline: "Understand what's possible",
    duration: "2 hours",
    price: "Free",
    priceSub: "No commitment",
    accentColor: "text-teal-400",
    borderColor: "border-teal-500/30",
    hoverBorder: "hover:border-teal-500/50",
    accentBg: "bg-teal-500/10",
    gradient: "from-teal-600 to-emerald-500",
    badge: null,
    features: [
      "Technical assessment of your product and stack",
      "Identify 2-3 deep tech opportunities",
      "Funding landscape briefing (Innovate UK, UKRI, EIS/SEIS)",
      "Written summary with recommended next steps",
    ],
    outcome: "Clarity on where deep tech accelerates your roadmap",
    cta: "Book a Discovery Session",
    ctaLink: "/contact",
  },
  {
    id: "sprint",
    name: "Build Sprint",
    tagline: "One day. One prototype. Real validation.",
    duration: "1 day",
    price: "From £2,500",
    priceSub: "per startup, up to 4 people",
    accentColor: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    hoverBorder: "hover:border-cyan-500/50",
    accentBg: "bg-cyan-500/10",
    gradient: "from-cyan-600 to-blue-500",
    badge: "Most Popular",
    features: [
      "Pre-sprint scoping call to define the build target",
      "Full-day co-creation with 2-3 matched specialists",
      "Working prototype connected to your stack",
      "Architecture review and scaling recommendations",
      "2 weeks async follow-up support",
    ],
    outcome: "A validated proof-of-concept and the confidence to invest further",
    cta: "Book a Build Sprint",
    ctaLink: "/contact",
  },
  {
    id: "residency",
    name: "Venture Residency",
    tagline: "Immersive co-creation at our Lake District lab",
    duration: "2-5 days",
    price: "From £995",
    priceSub: "per person/day, full-board included",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    hoverBorder: "hover:border-purple-500/50",
    accentBg: "bg-purple-500/10",
    gradient: "from-purple-600 to-pink-500",
    badge: "Deepest Impact",
    features: [
      "Dedicated multi-disciplinary specialist team (3-8 people)",
      "Full residential accommodation with meals",
      "Enterprise GPU cluster, LED volume, and lab access",
      "Production-grade prototypes, not just demos",
      "Strategic roadmap and deployment architecture",
      "4 weeks post-residency support",
      "IP ownership retained by your company",
    ],
    outcome: "A production-ready prototype, strategic roadmap, and a team that knows how to build on it",
    cta: "Enquire About Residency",
    ctaLink: "/contact",
  },
  {
    id: "venture-partner",
    name: "Venture Partner",
    tagline: "Ongoing deep tech advisory and build capacity",
    duration: "Ongoing",
    price: "Bespoke",
    priceSub: "quarterly retainer",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    hoverBorder: "hover:border-amber-500/50",
    accentBg: "bg-amber-500/10",
    gradient: "from-amber-600 to-orange-500",
    badge: "For Funded Startups",
    features: [
      "Fractional CTO and specialist access on demand",
      "Monthly architecture reviews and technical advisory",
      "Priority scheduling for build sprints and residencies",
      "Investor-ready technical due diligence support",
      "Introductions to our VC and accelerator network",
      "Grant application support (Innovate UK, UKRI)",
    ],
    outcome: "A deep tech bench that scales with you, without the overhead of building it in-house",
    cta: "Discuss Partnership",
    ctaLink: "/contact",
  },
];

// Who this is for
const audiences = [
  {
    icon: Rocket,
    title: "Pre-Seed & Seed Startups",
    description: "Validating a deep tech product thesis. You need specialist expertise to build the first version properly.",
  },
  {
    icon: TrendingUp,
    title: "Series A-B Scaleups",
    description: "Growing fast and hitting technical ceilings. You need architecture, AI capabilities, or infrastructure that your team hasn't built before.",
  },
  {
    icon: Building2,
    title: "VC Portfolio Companies",
    description: "Portfolio-wide access to deep tech specialists. We partner with funds to provide structured technical support across investments.",
  },
  {
    icon: GraduationCap,
    title: "Accelerator Cohorts",
    description: "Cohort-based build sprints and demo day preparation. We integrate with your programme timeline.",
  },
];

// Deep tech capabilities
const capabilities = [
  { icon: Brain, title: "AI & Agentic Systems", description: "Multi-agent orchestration, LLM integration, RAG pipelines, autonomous workflows" },
  { icon: Network, title: "Distributed Infrastructure", description: "Zero-trust architecture, edge computing, decentralised identity, cryptographic protocols" },
  { icon: Layers, title: "XR & Spatial Computing", description: "Apple Vision Pro, Meta Quest, digital twins, virtual production, 3D reconstruction" },
  { icon: BarChart3, title: "Geospatial Intelligence", description: "Satellite imagery, drone survey, location analytics, environmental monitoring" },
  { icon: Shield, title: "Cyber & Compliance", description: "Enterprise security, SOC 2 readiness, industrial control systems, secure remote operations" },
  { icon: Lightbulb, title: "Neural Rendering & Creative Tech", description: "Gaussian splatting, NeRF, spatial audio, motion capture, real-time compositing" },
];

// VC/Accelerator partnership model
const partnerBenefits = [
  "Portfolio-wide discovery sessions at no cost",
  "Preferential rates on build sprints and residencies",
  "Quarterly deep tech briefings for your investment team",
  "Co-branded demo days at our Lake District facility",
  "Grant and funding pathway guidance for portfolio companies",
  "Technical due diligence support for prospective investments",
];

// Social proof / evidence
const evidence = [
  { stat: "44+", label: "Deep Tech Specialists" },
  { stat: "£8M+", label: "Research Heritage" },
  { stat: "30 Years", label: "R&D Experience" },
  { stat: "18", label: "Programme Tracks" },
];

// FAQ
const faqItems = [
  {
    question: "What kind of startups are the best fit?",
    answer: "Companies building products that touch AI, spatial computing, XR, geospatial data, cybersecurity, or creative technology. You don't need to be a deep tech company — you just need to be building something where deep tech can accelerate your product. We work across sectors: defence, construction, media, manufacturing, and more.",
  },
  {
    question: "We're pre-revenue. Can we still engage?",
    answer: "The Discovery Session is free and designed for exactly this stage. For funded pre-revenue startups, the Build Sprint is the most common entry point — it's low commitment and produces something you can show investors. We also help position projects for Innovate UK grants and SEIS/EIS eligibility.",
  },
  {
    question: "How do VC partnerships work?",
    answer: "We work with funds to provide structured deep tech support across their portfolio. This typically starts with a briefing for your investment team, followed by discovery sessions offered to portfolio companies. We can tailor the arrangement — some funds provide build sprint credits as part of their value-add programme.",
  },
  {
    question: "What happens after a Build Sprint?",
    answer: "You leave with a working prototype and 2 weeks of async support. Most teams then either continue building independently (using the architecture we've set up) or progress to a Venture Residency for deeper work. There's no lock-in — the IP and code are yours.",
  },
  {
    question: "Can you work remotely or do we need to come to the Lake District?",
    answer: "Build Sprints can be delivered at your location or ours. The Venture Residency is specifically designed for immersive, distraction-free work at our Lake District facility — that's where the magic happens. Discovery Sessions and Venture Partner advisory are typically remote.",
  },
  {
    question: "What does 'fractional CTO' mean in the Venture Partner tier?",
    answer: "Access to our senior technical leadership for architecture decisions, hiring strategy, technical due diligence, and investor conversations. Not a replacement for your CTO — a complement. Think of it as having a deep tech bench on call.",
  },
];

const Ventures = () => {
  useOGMeta({
    title: "Venture Lab | DreamLab Applied Innovation",
    description: "Deep tech accelerator for startups and scaleups. Access 44+ specialists, enterprise infrastructure, and 30 years of R&D heritage through structured build sprints, residencies, and ongoing partnership.",
    url: "https://dreamlab-ai.com/ventures",
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero */}
      <section
        id="main-content"
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        <HyperdimensionalHeroBackground />

        <div className="container relative z-10 mt-16 flex flex-col items-center text-center px-5 md:px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-6 animate-slide-up">
            <Rocket className="w-4 h-4" />
            For Startups & Scaleups
          </div>

          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 animate-slide-up max-w-5xl leading-tight"
            style={{ textShadow: "0 0 40px rgba(212, 165, 116, 0.4), 0 0 80px rgba(205, 127, 50, 0.2)" }}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              VENTURE LAB
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground/90 max-w-3xl mb-4 animate-slide-up font-normal tracking-wide leading-relaxed"
            style={{ animationDelay: "0.1s" }}
          >
            Deep tech expertise on demand.
          </p>
          <p
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            Access 44+ specialists, enterprise infrastructure, and 30 years of R&D heritage — without building it all yourself.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in mb-8 w-full sm:w-auto" style={{ animationDelay: "0.2s" }}>
            <a
              href="#tiers"
              className="group relative inline-flex items-center justify-center rounded-lg text-base md:text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 min-h-[56px] h-14 md:h-16 px-6 md:px-8 py-4 overflow-hidden"
            >
              <span className="relative z-10">See Programme Tiers</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
            <Link
              to="/contact"
              className="group relative inline-flex items-center justify-center rounded-lg text-base md:text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-purple-500/40 text-foreground hover:bg-purple-500/10 hover:scale-105 min-h-[56px] h-14 md:h-16 px-6 md:px-8 py-4"
            >
              <span>Book a Free Discovery Session</span>
            </Link>
          </div>

          <div className="animate-slide-up flex flex-col sm:flex-row gap-6 text-sm md:text-base text-muted-foreground" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-400 rounded-full" />
              <span>Free discovery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>1-day build sprints</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              <span>Immersive residencies</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              <span>Ongoing partnership</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 md:bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Scroll down to learn more"
            className="text-foreground/60 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110 p-3 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <ChevronDown className="w-10 h-10 md:w-12 md:h-12" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Evidence Strip */}
      <section className="py-8 md:py-10 border-y border-purple-500/15 bg-background/50 backdrop-blur" aria-label="Key statistics">
        <div className="container px-5 md:px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 lg:gap-16">
            {evidence.map((item) => (
              <div key={item.label} className="text-center px-4 py-2">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">
                  {item.stat}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem / Value Prop */}
      <section ref={contentRef} className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Value proposition">
        <div className="container max-w-4xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
              Building deep tech is hard.<br />It doesn't have to be slow.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Most startups either hire expensive specialists they can't fully utilise, or try to build everything with a generalist team and burn months on the wrong approach. Venture Lab gives you targeted access to the right expertise at the right moment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-red-500/20 p-6">
              <h3 className="font-semibold text-red-400 mb-2">Without us</h3>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>6+ months hiring a specialist</li>
                <li>Wrong architecture decisions compound</li>
                <li>Investor questions you can't answer</li>
                <li>Grant applications miss the mark</li>
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-purple-400 hidden md:block" />
              <ChevronDown className="w-8 h-8 text-purple-400 md:hidden" />
            </div>
            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-green-500/20 p-6">
              <h3 className="font-semibold text-green-400 mb-2">With Venture Lab</h3>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>Working prototype in 1-5 days</li>
                <li>Architecture validated by specialists</li>
                <li>Technical narrative for investors</li>
                <li>Innovate UK applications positioned</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Programme Tiers */}
      <section id="tiers" className="py-16 md:py-20 scroll-mt-20 mesh-bg relative overflow-hidden" aria-label="Programme tiers">
        <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-2" aria-hidden="true" />

        <div className="container max-w-6xl mx-auto px-5 md:px-4 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Four ways in. One conversation to start.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a free discovery session. Progress through structured tiers as your needs grow. No lock-in at any stage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-background/60 backdrop-blur-xl rounded-2xl border ${tier.borderColor} ${tier.hoverBorder} p-6 md:p-8 transition-all hover:shadow-xl`}
              >
                {tier.badge && (
                  <div className={`absolute top-4 right-4 px-3 py-1 ${tier.accentBg} rounded-full ${tier.accentColor} text-xs font-medium`}>
                    {tier.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tier.gradient} flex items-center justify-center`}>
                    {tier.id === "discovery" && <Target className="w-5 h-5 text-white" />}
                    {tier.id === "sprint" && <Zap className="w-5 h-5 text-white" />}
                    {tier.id === "residency" && <MapPin className="w-5 h-5 text-white" />}
                    {tier.id === "venture-partner" && <Handshake className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.tagline}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground ml-2">{tier.priceSub}</span>
                </div>

                <div className="flex items-center gap-2 mb-5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{tier.duration}</span>
                </div>

                <ul className="space-y-2.5 mb-5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 ${tier.accentColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-muted-foreground mb-5 p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="font-medium">Outcome:</span> {tier.outcome}
                </p>

                <Link
                  to={tier.ctaLink}
                  className={`block w-full py-3 px-6 rounded-lg bg-gradient-to-r ${tier.gradient} text-white font-semibold text-center hover:shadow-lg transition-all min-h-[48px]`}
                >
                  {tier.cta} <ArrowRight className="inline w-4 h-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Target audience">
        <div className="container max-w-5xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Who Venture Lab is for
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Founders, CTOs, and technical leaders building products where deep tech is the differentiator.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <div
                  key={audience.title}
                  className="bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-colors text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-2">{audience.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{audience.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Deep Tech Capabilities */}
      <section className="py-16 md:py-20" aria-label="Capabilities">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              What you get access to
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Six deep tech domains, each backed by specialists with decades of combined experience. We match the right people to your problem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="glass-card-interactive border border-purple-500/20 hover:border-purple-500/40 !rounded-xl p-5 md:p-6 transition-all"
                >
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-2">{cap.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VC & Accelerator Partnership */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-cyan-950/10" aria-label="VC partnerships">
        <div className="container max-w-5xl mx-auto px-5 md:px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6">
                <Handshake className="w-4 h-4" />
                For VCs & Accelerators
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                Portfolio-wide deep tech support
              </h2>
              <p className="text-foreground/80 leading-relaxed mb-6">
                We partner with venture capital firms and accelerator programmes to provide structured deep tech access across their portfolio. Your companies get specialist expertise. You get stronger technical outcomes and a differentiated value-add programme.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center text-amber-400 hover:text-amber-300 font-medium text-sm hover:underline gap-1"
              >
                Discuss a partnership <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-amber-500/20 p-6 md:p-8">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                Partner Benefits
              </h3>
              <ul className="space-y-3">
                {partnerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20" aria-label="Process">
        <div className="container max-w-4xl mx-auto px-5 md:px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            How it works
          </h2>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Discovery Session",
                description: "Free 2-hour call. We map your technical landscape, identify where deep tech accelerates your roadmap, and recommend the right engagement model. No pitch deck required.",
                color: "bg-teal-500",
                lineColor: "bg-teal-500/30",
              },
              {
                step: 2,
                title: "Scoping & Specialist Matching",
                description: "We define the build target, success criteria, and match specialists from our network of 44+ experts. You'll know exactly who you're working with and what you'll walk away with.",
                color: "bg-cyan-500",
                lineColor: "bg-cyan-500/30",
              },
              {
                step: 3,
                title: "Build Together",
                description: "Whether it's a 1-day sprint or a 5-day residency, we co-create alongside your team. Working prototypes from day one, not slide decks.",
                color: "bg-purple-500",
                lineColor: "bg-purple-500/30",
              },
              {
                step: 4,
                title: "Deploy & Support",
                description: "Handover of code, architecture documentation, and deployment roadmap. Post-engagement async support ensures continuity. The IP is yours.",
                color: "bg-amber-500",
                lineColor: "bg-amber-500/30",
              },
            ].map((item, index, arr) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white font-bold`}>
                    {item.step}
                  </div>
                  {index < arr.length - 1 && <div className={`w-0.5 h-full ${item.lineColor} mt-2`} />}
                </div>
                <div className="pb-8">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-foreground/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UK Innovation Funding Context */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Funding support">
        <div className="container max-w-4xl mx-auto px-5 md:px-4">
          <div className="bg-background/50 backdrop-blur border border-green-500/20 rounded-2xl p-6 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">Funding & Grant Support</h2>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-6">
              We help startups navigate the UK innovation funding landscape. Many of our engagements are partially funded through grants, and we actively support applications.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Innovate UK Smart Grants", detail: "For disruptive R&D projects with strong commercial potential" },
                { title: "Knowledge Transfer Partnerships", detail: "Up to 67% funded for SMEs — embed a graduate in your team, co-supervised by our PhDs" },
                { title: "SEIS/EIS Alignment", detail: "We help structure engagements to maintain EIS/SEIS eligibility for your investors" },
                { title: "Technology Missions Fund", detail: "Collaborative R&D aligned with UKRI priority areas including AI assurance and net zero" },
              ].map((item) => (
                <div key={item.title} className="p-4 bg-green-500/5 border border-green-500/15 rounded-lg">
                  <h4 className="font-semibold text-sm text-green-400 mb-1">{item.title}</h4>
                  <p className="text-xs text-foreground/70">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20" aria-label="Frequently asked questions">
        <div className="container max-w-3xl mx-auto px-5 md:px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
            Common questions
          </h2>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <details
                key={index}
                className="group bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden"
                open={expandedFaq === index}
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) {
                    setExpandedFaq(index);
                  } else if (expandedFaq === index) {
                    setExpandedFaq(null);
                  }
                }}
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold pr-4">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-foreground/60 transition-transform group-open:rotate-180 flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-foreground/70 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Get started">
        <div className="container max-w-4xl mx-auto px-5 md:px-4">
          <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Start with a conversation
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Book a free discovery session. We'll map your technical landscape, identify the highest-impact opportunities, and recommend the right engagement. No commitment, no pitch required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-white text-purple-700 hover:bg-white/90 hover:shadow-lg hover:scale-105 transition-all min-h-[48px] px-8 py-3"
              >
                Book a Discovery Session <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <a
                href="#tiers"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-all min-h-[48px] px-8 py-3"
              >
                Compare Tiers
              </a>
            </div>
          </div>

          {/* VC CTA */}
          <div className="text-center mt-8">
            <Link
              to="/contact"
              className="text-muted-foreground hover:text-amber-400 text-sm font-medium hover:underline inline-flex items-center gap-1 transition-colors"
            >
              VC or accelerator? Discuss a portfolio partnership <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-10 md:py-12 overflow-hidden" role="contentinfo">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent" />
        <div className="container relative z-10 px-5 md:px-4">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-purple-500/20 pt-8 gap-6">
            <p className="text-sm md:text-base text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-5 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block py-2 text-base min-h-[44px] flex items-center">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block py-2 text-base min-h-[44px] flex items-center">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
              <Link to="/privacy" className="text-sm md:text-base text-muted-foreground hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block py-2 min-h-[44px] flex items-center">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Ventures;
