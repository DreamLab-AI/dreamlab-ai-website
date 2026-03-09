import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Glasses,
  ShieldCheck,
  Palette,
  Building2,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";

const tracks = [
  {
    id: "ai-autonomous",
    title: "AI & Autonomous Systems",
    description: "Master agentic engineering from protocol level to production. Build multi-agent orchestration systems, deploy autonomous workflows, and develop AI solutions that reason, plan, and act at enterprise scale.",
    accent: "sky",
    trlRange: "3-7",
    icon: Brain,
    heroImage: "/images/heroes/ai-commander-week.webp",
    borderColor: "border-sky-500/30",
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10",
    trlBarFrom: "from-sky-600",
    trlBarTo: "to-sky-400",
    programmes: [
      {
        title: "AI Commander Week",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "Agentic architecture, multi-agent orchestration, LLM integration, production deployment, and human-AI collaboration interfaces.",
        instructors: "Pete Woodbridge (CTO), Dr John O'Hare (CHO), Jing Li, Kriss Dunk",
        outcomes: ["Working multi-agent system", "Production deployment pipeline", "Strategic AI roadmap"],
      },
      {
        title: "VisionFlow Power User",
        duration: "4 Days",
        format: "Residential, up to 4",
        description: "Self-sovereign knowledge management with autonomous AI agent teams. GraphRAG construction, 3D data visualisation, and on-premise deployment.",
        instructors: "Pete Woodbridge (CTO), Kriss Dunk, Jing Li",
        outcomes: ["Deployed knowledge management system", "GraphRAG pipeline", "Self-sovereign data architecture"],
      },
      {
        title: "Neural Content Creation",
        duration: "3 Days",
        format: "Residential, up to 4",
        description: "Gaussian splatting capture, NeRF implementation, photogrammetry pipelines, and real-time neural rendering for production assets.",
        instructors: "Will Sheridan, Zack Lewis, James Berry",
        outcomes: ["Neural rendering pipeline", "Production-ready 3D assets", "Capture methodology"],
      },
    ],
  },
  {
    id: "immersive-xr",
    title: "Immersive & XR",
    description: "Complete LED volume workflow mastery, spatial computing for Apple Vision Pro and Meta Quest, and industrial XR training systems. Learn from Emmy-nominated professionals with credits spanning Star Wars to Formula 1.",
    accent: "purple",
    trlRange: "4-7",
    icon: Glasses,
    heroImage: "/images/heroes/virtual-production-master.webp",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    trlBarFrom: "from-purple-600",
    trlBarTo: "to-purple-400",
    programmes: [
      {
        title: "Virtual Production Master",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "LED volume operations, Unreal Engine for real-time production, motion control, camera tracking, real-time compositing, and colour science.",
        instructors: "Pete Woodbridge, Roger McKinley, Thadeous Letitia, Bradley Harris (Emmy-nom)",
        outcomes: ["End-to-end VP workflow", "ICVFX pipeline", "Production-ready skills"],
      },
      {
        title: "XR Innovation Intensive",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "Apple Vision Pro and Meta Quest development, industrial XR training systems, mixed reality interface design, and healthcare/engineering applications.",
        instructors: "Dr Arpana Sherpa (PhD), Christian Frost, Dr David Tully, Lewis Hackett",
        outcomes: ["XR application prototype", "Cross-platform deployment", "Industrial training system"],
      },
      {
        title: "Digital Human & MoCap",
        duration: "3 Days",
        format: "Residential, up to 4",
        description: "Motion capture system operation, performance capture and retargeting, MetaHuman creation, and real-time character animation.",
        instructors: "Bradley Harris (Emmy-nom), Garth Williams, Christian Frost",
        outcomes: ["MoCap pipeline", "Digital human assets", "Real-time animation setup"],
      },
    ],
  },
  {
    id: "cyber-trust",
    title: "Cyber & Trust Infrastructure",
    description: "Industrial-grade network architecture, zero-trust security, and decentralised agent infrastructure using Bitcoin, Lightning, and RGB protocols. Aligned with the SPRITE+ Security, Privacy, Identity and Trust network.",
    accent: "green",
    trlRange: "3-6",
    icon: ShieldCheck,
    heroImage: "/images/heroes/cyber-infrastructure.webp",
    borderColor: "border-green-500/30",
    accentColor: "text-green-400",
    accentBg: "bg-green-500/10",
    trlBarFrom: "from-green-600",
    trlBarTo: "to-green-400",
    programmes: [
      {
        title: "Cyber Infrastructure",
        duration: "3 Days",
        format: "Residential, up to 4",
        description: "Enterprise network architecture, zero-trust security implementation, cloud and hybrid infrastructure, industrial control system security.",
        instructors: "Ste Moyler (CCO), David Sherpa, Pete Woodbridge",
        outcomes: ["Security architecture blueprint", "Zero-trust implementation", "Incident response playbook"],
      },
      {
        title: "Decentralised Agent Infrastructure",
        duration: "4 Days",
        format: "Residential, up to 4",
        description: "Bitcoin and Lightning for agent payments, RGB protocol, Nostr-based decentralised identity, private contract negotiation, and agent-first architecture.",
        instructors: "Pete Woodbridge, Kriss Dunk, Jing Li",
        outcomes: ["Decentralised agent system", "Sovereign identity implementation", "Cryptographic payment rails"],
      },
    ],
  },
  {
    id: "creative-tech",
    title: "Creative Technology",
    description: "From spatial audio production and Dolby Atmos mastering to engineering data visualisation and creative technology fundamentals. Where artistic practice meets applied research methodology.",
    accent: "pink",
    trlRange: "2-5",
    icon: Palette,
    heroImage: "/images/heroes/creative-technology-fundamentals.webp",
    borderColor: "border-pink-500/30",
    accentColor: "text-pink-400",
    accentBg: "bg-pink-500/10",
    trlBarFrom: "from-pink-600",
    trlBarTo: "to-pink-400",
    programmes: [
      {
        title: "Creative Technology Fundamentals",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "Development environment setup, Git workflows, AI-assisted development with Claude and Copilot, project structure, and deployment. Designed for career changers and newcomers.",
        instructors: "Pete Woodbridge, Dr Arpana Sherpa, Marcus Sherpa",
        outcomes: ["Full development environment", "Portfolio project", "AI-assisted workflow"],
      },
      {
        title: "Spatial Audio Production",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "Dolby Atmos mixing and mastering, binaural audio for VR/AR, spatial audio engine implementation, field recording for immersive media.",
        instructors: "Bernard Steer (Dolby Atmos), Noelle Nurdin, Dr Sean Hill",
        outcomes: ["Atmos mix deliverable", "Binaural audio pipeline", "Spatial audio engine"],
      },
      {
        title: "Engineering Visualisation",
        duration: "5 Days",
        format: "Residential, up to 4",
        description: "CAE/CFD data import and optimisation, real-time scientific visualisation in Unreal Engine, interactive simulation interfaces.",
        instructors: "Marco Ghilardi (PhD Nuclear), Dr Sean Hill, Daniel Maktabi",
        outcomes: ["Interactive engineering viz", "Data pipeline", "Nuclear sector application"],
      },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise Innovation",
    description: "Bespoke embedded R&D experiences for C-suite and senior leadership teams. Strategic AI briefings, hands-on technology demonstrations, innovation workshop facilitation, and roadmap development. Designed for organisations ready to adopt Responsible Innovation practices aligned with the AREA framework.",
    accent: "amber",
    trlRange: "5-8",
    icon: Building2,
    heroImage: "/images/heroes/corporate-immersive.webp",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    trlBarFrom: "from-amber-600",
    trlBarTo: "to-amber-400",
    programmes: [
      {
        title: "Enterprise Innovation Residency",
        duration: "3-5 Days",
        format: "Residential, bespoke",
        description: "Tailored executive experience combining strategic AI briefings, hands-on technology demonstrations, innovation facilitation, team building, and strategic roadmap development. Every engagement is scoped to your industry and challenge.",
        instructors: "Pete Woodbridge, Dr John O'Hare, Stephen Moyler, plus domain specialists",
        outcomes: ["Innovation strategy document", "Technology adoption roadmap", "Proof-of-concept prototypes"],
      },
    ],
  },
];

// TRL bar component
const TRLBar = ({ range, fromClass, toClass }: { range: string; fromClass: string; toClass: string }) => {
  const [low, high] = range.split("-").map(Number);
  const leftPct = ((low - 1) / 9) * 100;
  const widthPct = ((high - low + 1) / 9) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>TRL 1</span>
        <span>TRL 9</span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full relative overflow-hidden">
        <div
          className={`absolute h-full rounded-full bg-gradient-to-r ${fromClass} ${toClass}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Active range: TRL {range}
      </div>
    </div>
  );
};

const Programmes = () => {
  useOGMeta({
    title: "Programme Tracks | DreamLab Applied Innovation Lab",
    description: "Five strategic deep tech programme tracks spanning AI, XR, cyber, creative technology, and enterprise innovation. TRL 2-8, residential delivery at our Lake District facility.",
    url: "https://dreamlab-ai.com/programmes",
  });

  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-purple-950/20" />
        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 text-sm" variant="secondary">Five Strategic Tracks</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 inline-block text-transparent bg-clip-text px-4">
              Programme Tracks
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto px-4">
              Intensive residential programmes delivered by our 44+ specialist collective at the Lake District facility. Each track maps to Innovate UK Technology Readiness Levels for clear progression from applied research through to commercial deployment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <Button size="lg" asChild className="min-h-[44px]">
                <Link to="/contact">Enquire About a Programme</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[44px]">
                <Link to="/co-create">Design a Custom Engagement</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Track Sections */}
      {tracks.map((track) => {
        const Icon = track.icon;
        return (
          <section
            key={track.id}
            id={track.id}
            className="py-16 md:py-20 border-t border-purple-500/10"
            aria-label={`${track.title} programme track`}
          >
            <div className="container max-w-6xl mx-auto px-4">
              {/* Track Header */}
              <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${track.accentBg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${track.accentColor}`} />
                    </div>
                    <Badge variant="outline" className={track.borderColor}>TRL {track.trlRange}</Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{track.title}</h2>
                  <p className="text-foreground/80 leading-relaxed mb-6">{track.description}</p>
                  <TRLBar range={track.trlRange} fromClass={track.trlBarFrom} toClass={track.trlBarTo} />
                </div>
                <div className="aspect-video rounded-xl overflow-hidden shadow-xl">
                  <img
                    src={track.heroImage}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/heroes/dreamlab-hero.webp";
                    }}
                  />
                </div>
              </div>

              {/* Programme Modules */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {track.programmes.map((prog) => (
                  <div
                    key={prog.title}
                    className={`bg-background/50 backdrop-blur border ${track.borderColor} rounded-xl p-6 hover:shadow-lg transition-all`}
                  >
                    <h3 className="text-lg font-bold mb-2">{prog.title}</h3>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {prog.duration}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {prog.format}</span>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed mb-4">{prog.description}</p>
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Outcomes:</p>
                      <ul className="space-y-1.5">
                        {prog.outcomes.map((outcome) => (
                          <li key={outcome} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className={`w-4 h-4 ${track.accentColor} flex-shrink-0 mt-0.5`} />
                            <span className="text-foreground/80">{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Instructors:</span> {prog.instructors}
                    </p>
                  </div>
                ))}
              </div>

              {/* Track CTA */}
              <div className="mt-8 text-center">
                <Link
                  to="/contact"
                  className={`inline-flex items-center text-sm font-medium ${track.accentColor} hover:underline gap-1`}
                >
                  Enquire about {track.title} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        );
      })}

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
              Not sure which track fits?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Every engagement starts with a conversation. We will scope the right combination of tracks, duration, and team composition for your challenge.
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
