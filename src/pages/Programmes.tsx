import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Brain,
  Globe,
  Glasses,
  ShieldCheck,
  Palette,
  Building2,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
  Layers,
  Factory,
  Clapperboard,
  Shield,
  Landmark,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";

// ──────────────────────────────────────────────────────────────
// Flat programme catalogue — single source of truth
// ──────────────────────────────────────────────────────────────

interface Programme {
  id: string;
  title: string;
  duration: string;
  format: string;
  description: string;
  instructors: string;
  outcomes: string[];
  trl: string;
  categories: string[];      // outcome categories this appears in
  sectors: string[];          // sector lenses
  partnership?: { name: string; logo: string };
}

const programmes: Programme[] = [
  // ── Enterprise Innovation ──
  {
    id: "enterprise-residency",
    title: "Enterprise Innovation Residency",
    duration: "1-3 Days",
    format: "Residential, bespoke",
    description: "Tailored executive experience combining strategic AI briefings, hands-on technology demonstrations, innovation facilitation, team building, and strategic roadmap development. Every engagement is scoped to your industry and challenge.",
    instructors: "Dr Jessica Symons (VisioningLab), Dr John O'Hare, Dr Andy Bennett, plus domain specialists",
    outcomes: ["Innovation strategy document", "Technology adoption roadmap", "Proof-of-concept prototypes"],
    trl: "5-8",
    categories: ["scale-innovation", "operationalise-ai"],
    sectors: ["construction", "defence", "manufacturing"],
    partnership: { name: "VisioningLab", logo: "/images/partners/visioninglab-dark.png" },
  },
  {
    id: "enterprise-intro",
    title: "Introduction to Enterprise Innovation using AI",
    duration: "1 Day",
    format: "Open or private, up to 12",
    description: "Tailored 'hack' day for individuals and teams to explore the potential for using AI in their organisations. Combines AI strategy exploration, hands-on demonstrations, innovation facilitation, and roadmap development.",
    instructors: "Dr Jessica Symons (VisioningLab), Dr John O'Hare, plus domain specialists",
    outcomes: ["Insight into AI potential for your organisation", "AI adoption roadmap", "Proof-of-concept prototypes"],
    trl: "5-8",
    categories: ["scale-innovation"],
    sectors: ["construction", "defence", "manufacturing", "media"],
    partnership: { name: "VisioningLab", logo: "/images/partners/visioninglab-dark.png" },
  },
  // ── Geospatial & Space Data ──
  {
    id: "geo-earth-observation",
    title: "Geospatial AI & Earth Observation",
    duration: "1-3 Days",
    format: "Residential, up to 8",
    description: "Satellite imagery analysis with deep learning, multi-spectral classification, change detection, and geospatial feature extraction. Integrating Sentinel, Landsat, and commercial EO data with AI pipelines for environmental monitoring, agriculture, and infrastructure assessment.",
    instructors: "Dr Andy Bennett (PhD Geology), Dr John O'Hare, plus domain specialists",
    outcomes: ["EO data processing pipeline", "Geospatial AI classification model", "Change detection workflow"],
    trl: "3-7",
    categories: ["data-decisions", "operationalise-ai"],
    sectors: ["construction", "defence", "manufacturing"],
  },
  {
    id: "geo-digital-twins",
    title: "Space Data Analytics & Digital Twins",
    duration: "1-3 Days",
    format: "Residential, up to 8",
    description: "Building digital twin environments from satellite, drone survey, LiDAR, and Gaussian splatting capture data. Real-time geospatial dashboards, predictive environmental modelling, and cloud-native geospatial stacks.",
    instructors: "Dr Andy Bennett (PhD Geology), Dr John O'Hare, Pete Woodbridge",
    outcomes: ["Geospatial digital twin prototype", "Predictive environmental model", "Cloud-native GIS deployment"],
    trl: "3-7",
    categories: ["data-decisions", "immersive-experiences"],
    sectors: ["construction", "defence", "manufacturing"],
  },
  {
    id: "drone-gaussian",
    title: "Drone Survey & Gaussian Capture",
    duration: "1-3 Days",
    format: "Residential, up to 8",
    description: "End-to-end drone survey operations for terrain mapping, environmental monitoring, and site inspection. Combines photogrammetry, LiDAR processing, and Gaussian splatting to produce photo-realistic 3D reconstructions from aerial capture data. Covers CAA regulations, flight planning, and data processing pipelines.",
    instructors: "Dr Andy Bennett (PhD Geology), Dr John O'Hare, Will Sheridan, Zack Lewis",
    outcomes: ["Drone survey capture workflow", "Gaussian splat terrain reconstruction", "Photogrammetry processing pipeline"],
    trl: "3-7",
    categories: ["data-decisions", "immersive-experiences", "creative-production"],
    sectors: ["construction", "defence", "manufacturing"],
  },
  {
    id: "location-intelligence",
    title: "Location Intelligence for Enterprise",
    duration: "1 Day",
    format: "Open or private, up to 12",
    description: "Practical introduction to geospatial AI for business decision-making. Spatial data strategy, location analytics, supply chain optimisation, site selection, and environmental risk assessment using accessible tools and open data.",
    instructors: "Dr Andy Bennett (PhD Geology), Dr John O'Hare, plus domain specialists",
    outcomes: ["Location intelligence strategy", "Spatial analytics proof-of-concept", "Open data integration roadmap"],
    trl: "3-7",
    categories: ["data-decisions", "scale-innovation"],
    sectors: ["construction", "manufacturing"],
  },
  // ── AI & Autonomous Systems ──
  {
    id: "ai-commander",
    title: "AI Commander Week",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Agentic architecture, multi-agent orchestration, LLM integration, production deployment, and human-AI collaboration interfaces.",
    instructors: "Pete Woodbridge (CTO), Dr John O'Hare (CHO), Jing Li, Kriss Dunk",
    outcomes: ["Working multi-agent system", "Production deployment pipeline", "Strategic AI roadmap"],
    trl: "3-7",
    categories: ["operationalise-ai"],
    sectors: ["defence", "manufacturing"],
  },
  {
    id: "visionflow",
    title: "VisionFlow Power User",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Self-sovereign knowledge management with autonomous AI agent teams. GraphRAG construction, 3D data visualisation, and on-premise deployment.",
    instructors: "Pete Woodbridge (CTO), Kriss Dunk, Jing Li",
    outcomes: ["Deployed knowledge management system", "GraphRAG pipeline", "Self-sovereign data architecture"],
    trl: "3-7",
    categories: ["operationalise-ai", "secure-infrastructure"],
    sectors: ["defence", "manufacturing"],
  },
  {
    id: "neural-content",
    title: "Neural Content Creation",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Gaussian splatting capture, NeRF implementation, photogrammetry pipelines, and real-time neural rendering for production assets.",
    instructors: "Will Sheridan, Zack Lewis, James Berry",
    outcomes: ["Neural rendering pipeline", "Production-ready 3D assets", "Capture methodology"],
    trl: "3-7",
    categories: ["immersive-experiences", "creative-production", "data-decisions"],
    sectors: ["media", "construction"],
  },
  // ── Immersive & XR ──
  {
    id: "virtual-production",
    title: "Virtual Production Master",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "LED volume operations, Unreal Engine for real-time production, motion control, camera tracking, real-time compositing, and colour science.",
    instructors: "Pete Woodbridge, Roger McKinley, Thadeous Letitia, Bradley Harris (Emmy-nom)",
    outcomes: ["End-to-end VP workflow", "ICVFX pipeline", "Production-ready skills"],
    trl: "4-7",
    categories: ["immersive-experiences", "creative-production"],
    sectors: ["media"],
  },
  {
    id: "xr-intensive",
    title: "XR Innovation Intensive",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Apple Vision Pro and Meta Quest development, industrial XR training systems, mixed reality interface design, and healthcare/engineering applications.",
    instructors: "Dr Arpana Sherpa (PhD), Christian Frost, Dr David Tully, Lewis Hackett",
    outcomes: ["XR application prototype", "Cross-platform deployment", "Industrial training system"],
    trl: "4-7",
    categories: ["immersive-experiences", "scale-innovation"],
    sectors: ["manufacturing", "defence", "media"],
  },
  {
    id: "digital-human",
    title: "Digital Human & MoCap",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Motion capture system operation, performance capture and retargeting, MetaHuman creation, and real-time character animation.",
    instructors: "Bradley Harris (Emmy-nom), Garth Williams, Christian Frost",
    outcomes: ["MoCap pipeline", "Digital human assets", "Real-time animation setup"],
    trl: "4-7",
    categories: ["immersive-experiences", "creative-production"],
    sectors: ["media"],
  },
  // ── Cyber & Trust ──
  {
    id: "cyber-infra",
    title: "Cyber Infrastructure",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Enterprise network architecture, zero-trust security implementation, cloud and hybrid infrastructure, industrial control system security.",
    instructors: "Ste Moyler (CCO), David Sherpa, Pete Woodbridge",
    outcomes: ["Security architecture blueprint", "Zero-trust implementation", "Incident response playbook"],
    trl: "3-6",
    categories: ["secure-infrastructure"],
    sectors: ["defence", "manufacturing"],
  },
  {
    id: "decentralised-agents",
    title: "Decentralised Agent Infrastructure",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Bitcoin and Lightning for agent payments, RGB protocol, Nostr-based decentralised identity, private contract negotiation, and agent-first architecture.",
    instructors: "Pete Woodbridge, Kriss Dunk, Jing Li",
    outcomes: ["Decentralised agent system", "Sovereign identity implementation", "Cryptographic payment rails"],
    trl: "3-6",
    categories: ["secure-infrastructure", "operationalise-ai"],
    sectors: ["defence"],
  },
  // ── Creative Technology ──
  {
    id: "creative-fundamentals",
    title: "Creative Technology Fundamentals",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Development environment setup, Git workflows, AI-assisted development with Claude and Copilot, project structure, and deployment. Designed for career changers and newcomers.",
    instructors: "Pete Woodbridge, Dr Arpana Sherpa, Marcus Sherpa",
    outcomes: ["Full development environment", "Portfolio project", "AI-assisted workflow"],
    trl: "2-5",
    categories: ["creative-production"],
    sectors: ["media"],
  },
  {
    id: "spatial-audio",
    title: "Spatial Audio Production",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "Dolby Atmos mixing and mastering, binaural audio for VR/AR, spatial audio engine implementation, field recording for immersive media.",
    instructors: "Bernard Steer (Dolby Atmos), Noelle Nurdin, Dr Sean Hill",
    outcomes: ["Atmos mix deliverable", "Binaural audio pipeline", "Spatial audio engine"],
    trl: "2-5",
    categories: ["creative-production", "immersive-experiences"],
    sectors: ["media"],
  },
  {
    id: "engineering-viz",
    title: "Engineering Visualisation",
    duration: "1-3 Days",
    format: "Residential, up to 4",
    description: "CAE/CFD data import and optimisation, real-time scientific visualisation in Unreal Engine, interactive simulation interfaces.",
    instructors: "Marco Ghilardi (PhD Nuclear), Dr Sean Hill, Daniel Maktabi",
    outcomes: ["Interactive engineering viz", "Data pipeline", "Nuclear sector application"],
    trl: "2-5",
    categories: ["creative-production", "data-decisions"],
    sectors: ["manufacturing", "defence"],
  },
];

// ──────────────────────────────────────────────────────────────
// Outcome categories — the primary navigation
// ──────────────────────────────────────────────────────────────

const outcomeCategories = [
  {
    id: "scale-innovation",
    title: "Scale Innovation Organisation-Wide",
    value: "Build internal capability to drive sustained innovation across your teams.",
    icon: Rocket,
    gradient: "from-amber-600 to-orange-400",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    accentBg: "bg-amber-500/10",
    alsoSee: ["operationalise-ai", "data-decisions"],
  },
  {
    id: "operationalise-ai",
    title: "Operationalise AI Workflows",
    value: "Move beyond pilots — deploy autonomous systems that power real operations.",
    icon: Brain,
    gradient: "from-sky-600 to-cyan-400",
    accentColor: "text-sky-400",
    borderColor: "border-sky-500/30",
    accentBg: "bg-sky-500/10",
    alsoSee: ["scale-innovation", "secure-infrastructure"],
  },
  {
    id: "data-decisions",
    title: "Unlock Data-Driven Decisions",
    value: "Transform spatial, earth observation, and location data into competitive intelligence.",
    icon: Globe,
    gradient: "from-teal-600 to-emerald-400",
    accentColor: "text-teal-400",
    borderColor: "border-teal-500/30",
    accentBg: "bg-teal-500/10",
    alsoSee: ["operationalise-ai", "immersive-experiences"],
  },
  {
    id: "immersive-experiences",
    title: "Create Immersive Experiences",
    value: "Build XR, virtual production, and digital twin capabilities that captivate.",
    icon: Glasses,
    gradient: "from-purple-600 to-violet-400",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    accentBg: "bg-purple-500/10",
    alsoSee: ["creative-production", "data-decisions"],
  },
  {
    id: "secure-infrastructure",
    title: "Secure Infrastructure & Trust",
    value: "Build cyber-resilient, zero-trust foundations that scale with confidence.",
    icon: ShieldCheck,
    gradient: "from-green-600 to-emerald-400",
    accentColor: "text-green-400",
    borderColor: "border-green-500/30",
    accentBg: "bg-green-500/10",
    alsoSee: ["operationalise-ai", "scale-innovation"],
  },
  {
    id: "creative-production",
    title: "Modernise Creative Production",
    value: "Future-proof creative workflows with spatial audio, neural rendering, and emerging tech.",
    icon: Palette,
    gradient: "from-pink-600 to-rose-400",
    accentColor: "text-pink-400",
    borderColor: "border-pink-500/30",
    accentBg: "bg-pink-500/10",
    alsoSee: ["immersive-experiences", "operationalise-ai"],
  },
];

// ──────────────────────────────────────────────────────────────
// Sector lenses
// ──────────────────────────────────────────────────────────────

const sectors = [
  { id: "all", label: "All Outcomes", icon: Layers },
  { id: "construction", label: "Construction & Built Environment", icon: Building2 },
  { id: "defence", label: "Defence & Government", icon: Shield },
  { id: "media", label: "Media & Entertainment", icon: Clapperboard },
  { id: "manufacturing", label: "Manufacturing & Operations", icon: Factory },
];

// ──────────────────────────────────────────────────────────────
// TRL bar component
// ──────────────────────────────────────────────────────────────

const TRLBadge = ({ range }: { range: string }) => {
  const [low, high] = range.split("-").map(Number);
  let label = "Emerging";
  let cls = "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (low >= 5) { label = "Deployment-Ready"; cls = "bg-amber-500/20 text-amber-300 border-amber-500/30"; }
  else if (low >= 4) { label = "Maturing"; cls = "bg-sky-500/20 text-sky-300 border-sky-500/30"; }
  else if (high >= 6) { label = "Developing"; cls = "bg-teal-500/20 text-teal-300 border-teal-500/30"; }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      TRL {low}-{high} · {label}
    </span>
  );
};

// ──────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────

const Programmes = () => {
  useOGMeta({
    title: "Programmes | DreamLab Applied Innovation Lab",
    description: "Outcome-based residential programmes spanning enterprise innovation, AI deployment, geospatial intelligence, immersive experiences, cyber infrastructure, and creative production. TRL 2-8, Lake District facility.",
    url: "https://dreamlab-ai.com/programmes",
  });

  const { hash } = useLocation();
  const [activeSector, setActiveSector] = useState("all");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Scroll to hash on load
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      setExpandedCategory(id);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [hash]);

  // Filter programmes by sector
  const filteredProgrammes = useMemo(() => {
    if (activeSector === "all") return programmes;
    return programmes.filter(p => p.sectors.includes(activeSector));
  }, [activeSector]);

  // Get programmes for a category
  const programmesForCategory = (categoryId: string) =>
    filteredProgrammes.filter(p => p.categories.includes(categoryId));

  // Count all visible programmes (deduplicated)
  const visibleCount = filteredProgrammes.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-teal-400 inline-block text-transparent bg-clip-text px-4">
              Outcomes, Not Courses
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 max-w-3xl mx-auto px-4">
              Choose your destination — we handle the journey. {visibleCount} residential programmes delivered by 44+ specialists at our Lake District facility, each mapped to Innovate UK Technology Readiness Levels.
            </p>
            <p className="text-sm text-muted-foreground/60 mb-8">
              Programmes span multiple outcomes. Pick the lens that fits your challenge.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <Button size="lg" asChild className="min-h-[44px]">
                <Link to="/contact">Start a Conversation</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[44px]">
                <Link to="/co-create">Design a Custom Engagement</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sector Lenses — sticky filter bar */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="container px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {sectors.map((s) => {
              const Icon = s.icon;
              const isActive = activeSector === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveSector(s.id); setExpandedCategory(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Outcome Categories */}
      <section className="py-12 md:py-16" aria-label="Programme outcomes">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {outcomeCategories.map((cat) => {
              const Icon = cat.icon;
              const catProgrammes = programmesForCategory(cat.id);
              const isExpanded = expandedCategory === cat.id;
              if (catProgrammes.length === 0) return null;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setExpandedCategory(isExpanded ? null : cat.id);
                    if (!isExpanded) {
                      setTimeout(() => {
                        const el = document.getElementById(cat.id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }
                  }}
                  className={`group relative text-left bg-white/5 backdrop-blur border rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 ${
                    isExpanded ? `${cat.borderColor} border-opacity-100 bg-white/10` : "border-white/10 hover:border-purple-500/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${cat.accentBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${cat.accentColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-semibold mb-1 group-hover:${cat.accentColor} transition-colors`}>
                        {cat.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{cat.value}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/60">{catProgrammes.length} programme{catProgrammes.length !== 1 ? "s" : ""}</span>
                        <ArrowRight className={`w-4 h-4 ${cat.accentColor} transition-transform ${isExpanded ? "rotate-90" : "group-hover:translate-x-1"}`} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expanded Category Detail */}
          {outcomeCategories.map((cat) => {
            const catProgrammes = programmesForCategory(cat.id);
            if (expandedCategory !== cat.id || catProgrammes.length === 0) return null;
            const Icon = cat.icon;

            return (
              <section
                key={cat.id}
                id={cat.id}
                className="mb-16 scroll-mt-32"
                aria-label={cat.title}
              >
                {/* Category header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">{cat.title}</h2>
                    <p className="text-muted-foreground">{cat.value}</p>
                  </div>
                </div>

                {/* Programme cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catProgrammes.map((prog) => {
                    const otherCategories = prog.categories.filter(c => c !== cat.id);
                    return (
                      <div
                        key={prog.id}
                        className={`relative bg-white/5 backdrop-blur border ${cat.borderColor} rounded-xl p-6 hover:bg-white/10 transition-all`}
                      >
                        {/* TRL badge */}
                        <div className="absolute top-4 right-4">
                          <TRLBadge range={prog.trl} />
                        </div>

                        <h3 className="text-lg font-bold mb-1 pr-24">{prog.title}</h3>

                        {/* Partnership badge */}
                        {prog.partnership && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">with</span>
                            <img src={prog.partnership.logo} alt={prog.partnership.name} className="h-4 w-auto" />
                          </div>
                        )}

                        {/* Duration + format */}
                        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {prog.duration}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {prog.format}</span>
                        </div>

                        <p className="text-foreground/80 text-sm leading-relaxed mb-4">{prog.description}</p>

                        {/* Outcomes */}
                        <div className="mb-4">
                          <ul className="space-y-1.5">
                            {prog.outcomes.map((outcome) => (
                              <li key={outcome} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className={`w-4 h-4 ${cat.accentColor} flex-shrink-0 mt-0.5`} />
                                <span className="text-foreground/80">{outcome}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Instructors */}
                        <p className="text-xs text-muted-foreground mb-3">
                          <span className="font-medium">Instructors:</span> {prog.instructors}
                        </p>

                        {/* Multi-category indicator */}
                        {otherCategories.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                            <Layers className="w-3 h-3" />
                            <span>Also in: {otherCategories.map(cId => {
                              const other = outcomeCategories.find(o => o.id === cId);
                              return other?.title.split(" ").slice(0, 2).join(" ");
                            }).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* "You might also need" cross-links */}
                <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border border-purple-500/10">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Complete your journey</p>
                  <div className="flex flex-wrap gap-3">
                    {cat.alsoSee.map((linkedId) => {
                      const linked = outcomeCategories.find(o => o.id === linkedId);
                      if (!linked) return null;
                      const LinkedIcon = linked.icon;
                      const linkedCount = programmesForCategory(linkedId).length;
                      if (linkedCount === 0) return null;
                      return (
                        <button
                          key={linkedId}
                          onClick={() => {
                            setExpandedCategory(linkedId);
                            setTimeout(() => {
                              const el = document.getElementById(linkedId);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 50);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${linked.borderColor} bg-background/50 hover:bg-white/10 transition-all text-sm`}
                        >
                          <LinkedIcon className={`w-4 h-4 ${linked.accentColor}`} />
                          <span>{linked.title}</span>
                          <Badge variant="outline" className="text-xs ml-1">{linkedCount}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category CTA */}
                <div className="mt-6 text-center">
                  <Link
                    to="/contact"
                    className={`inline-flex items-center text-sm font-medium ${cat.accentColor} hover:underline gap-1`}
                  >
                    Enquire about {cat.title.toLowerCase()} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            );
          })}

          {/* Empty state when sector filters everything */}
          {expandedCategory && programmesForCategory(expandedCategory).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No programmes match this combination. <button onClick={() => setActiveSector("all")} className="text-purple-400 hover:underline">Show all sectors</button></p>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 border-t border-purple-500/10" aria-label="How it works">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose your outcome", desc: "Pick the business result you need. Programmes span multiple outcomes, so start wherever feels right." },
              { step: "02", title: "Select programmes", desc: "Mix and match across categories. We will recommend combinations that fit your team size, timeline, and challenge." },
              { step: "03", title: "Residential delivery", desc: "1-3 days at our Lake District facility. Your team works alongside our specialists in a focused, distraction-free environment." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 inline-block text-transparent bg-clip-text mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-Guided Workshops Banner */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-background to-purple-950/10" aria-label="Self-guided workshops">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Looking for Self-Guided Learning?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our self-paced workshop catalogue covers AI-powered knowledge work across 14 modules. An accessible entry point for individuals and small teams.
          </p>
          <Button size="lg" variant="outline" asChild className="min-h-[44px]">
            <Link to="/workshops">
              Browse Workshops <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Not sure where to start?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Every engagement starts with a conversation. We will scope the right combination of outcomes, programmes, and team composition for your challenge.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/contact">Start a Conversation</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" asChild>
                <Link to="/co-create">View Engagement Models</Link>
              </Button>
            </div>
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

export default Programmes;
