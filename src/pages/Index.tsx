import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HyperdimensionalHeroBackground } from "@/components/HyperdimensionalHeroBackground";
import { Header } from "@/components/Header";
import {
  ChevronDown,
  ArrowRight,
  Brain,
  Glasses,
  ShieldCheck,
  Palette,
  Building2,
  Users,
  Beaker,
  Handshake,
  GraduationCap,
  Play,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

const EmailSignupForm = lazy(() => import("@/components/EmailSignupForm").then(m => ({ default: m.EmailSignupForm })));

// Programme track definitions
const programmeTracks = [
  {
    id: "enterprise",
    title: "Enterprise Innovation",
    description: "In partnership with VisioningLab. Innovation programmes for organisations exploring AI and emerging technologies. Strategic briefings, hands-on immersion, and roadmaps.",
    partnerLogo: "/images/partners/visioninglab-dark.png",
    accent: "amber",
    trlRange: "5-8",
    icon: Building2,
    borderClass: "border-amber-500/30 hover:border-amber-500/50",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
  },
  {
    id: "ai-autonomous",
    title: "AI & Autonomous Systems",
    description: "From agentic orchestration to production-grade multi-model architectures. Build systems that reason, plan, and act.",
    accent: "sky",
    trlRange: "3-7",
    icon: Brain,
    borderClass: "border-sky-500/30 hover:border-sky-500/50",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-400",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
  },
  {
    id: "immersive-xr",
    title: "Immersive & XR",
    description: "LED volume workflows, spatial computing on Vision Pro, and industrial XR training systems.",
    accent: "purple",
    trlRange: "4-7",
    icon: Glasses,
    borderClass: "border-purple-500/30 hover:border-purple-500/50",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
  },
  {
    id: "cyber-trust",
    title: "Cyber & Trust Infrastructure",
    description: "Zero-trust architectures, decentralised identity, and cryptographic agent infrastructure.",
    accent: "green",
    trlRange: "3-6",
    icon: ShieldCheck,
    borderClass: "border-green-500/30 hover:border-green-500/50",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    badgeBg: "bg-green-500/20",
    badgeText: "text-green-300",
  },
  {
    id: "creative-tech",
    title: "Creative Technology",
    description: "Neural rendering, spatial audio production, and engineering visualisation.",
    accent: "pink",
    trlRange: "2-5",
    icon: Palette,
    borderClass: "border-pink-500/30 hover:border-pink-500/50",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-400",
    badgeBg: "bg-pink-500/20",
    badgeText: "text-pink-300",
  },
];

// Research video demonstrations
const researchVideos = [
  { src: "nuclear-robot.mp4", thumb: "nuclear-robot-thumb.jpg", caption: "Nuclear decommissioning planning" },
  { src: "unity-vr.mp4", thumb: "unity-vr-thumb.jpg", caption: "Multi-viewpoint VR collaboration" },
  { src: "hand-interact.mp4", thumb: "hand-interact-thumb.jpg", caption: "Natural gesture interfaces" },
  { src: "bigdata-viz.mp4", thumb: "bigdata-viz-thumb.jpg", caption: "Immersive data visualisation" },
  { src: "robot-arm.mp4", thumb: "robot-arm-thumb.jpg", caption: "Robotic control systems" },
  { src: "motorway-sim.mp4", thumb: "motorway-sim-thumb.jpg", caption: "Infrastructure simulation" },
];

// Featured team members
const featuredTeam = [
  { name: "Dr John O'Hare", domain: "AI & Immersive Systems", role: "Chief Hallucination Officer", image: "/data/team/04.webp" },
  { name: "Pete Woodbridge", domain: "Founder, DREAMLAB", role: "CTO", image: "/data/team/02.webp" },
  { name: "Steve Moyler", domain: "Creative Lead, DREAMLAB", role: "Creative Lead", image: "/data/team/03.webp" },
];

// Facility images for carousel
const facilityImages = [
  "/data/media/aerial.jpeg",
  "/data/media/fairfield-front.jpg",
  "/data/media/fairfield-back.jpeg",
  "/data/media/view.jpeg",
  "/data/media/labview2.webp",
  "/data/media/labview3.webp",
];

const Index = () => {
  useOGMeta(PAGE_OG_CONFIGS.home);
  const heroRef = useRef<HTMLDivElement>(null);
  const [facilityIndex, setFacilityIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFacilityIndex((prev) => (prev + 1) % facilityImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Section 1: Hero */}
      <section
        id="main-content"
        ref={heroRef}
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        <HyperdimensionalHeroBackground />

        <div className="container relative z-10 mt-16 flex flex-col items-center text-center px-5 md:px-4">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 animate-slide-up max-w-5xl leading-tight"
            style={{ textShadow: '0 0 40px rgba(212, 165, 116, 0.4), 0 0 80px rgba(205, 127, 50, 0.2)' }}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">DREAMLAB APPLIED INNOVATION</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground/85 max-w-3xl mb-8 animate-slide-up font-light tracking-wide leading-relaxed" style={{ animationDelay: '0.1s' }}>
             AI, XR, & Cyber Secure Distributed Systems in the Heart of the Lake District
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in mb-8 w-full sm:w-auto" style={{ animationDelay: '0.2s' }}>
            <Link
              to="/programmes"
              className="group relative inline-flex items-center justify-center rounded-lg text-base md:text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 min-h-[56px] h-14 md:h-16 px-6 md:px-8 py-4 overflow-hidden"
            >
              <span className="relative z-10">Explore Training</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              to="/co-create"
              className="group relative inline-flex items-center justify-center rounded-lg text-base md:text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-purple-500/40 text-foreground hover:bg-purple-500/10 hover:scale-105 min-h-[56px] h-14 md:h-16 px-6 md:px-8 py-4"
            >
              <span>Partner With Us</span>
            </Link>
          </div>

          <div className="animate-slide-up flex flex-col sm:flex-row gap-6 text-sm md:text-base text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>Enterprise | SME sprints | Knowledge Partnerships</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 md:bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Scroll down to next section"
            className="text-foreground/60 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110 p-3 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <ChevronDown className="w-10 h-10 md:w-12 md:h-12" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Section 2: Evidence Strip */}
      <section className="py-8 md:py-10 border-y border-purple-500/15 bg-background/50 backdrop-blur" aria-label="Key statistics">
        <div className="container px-5 md:px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 lg:gap-16">
            {[
              { stat: "£8M+", label: "Research Heritage" },
              { stat: "30 Years", label: "Deep Tech R&D" },
              { stat: "40+", label: "Specialists" },
              { stat: "Lake District", label: "Residential Facility" },
            ].map((item) => (
              <div key={item.label} className="text-center px-4 py-2">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">{item.stat}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Programme Tracks */}
      <section className="py-16 md:py-20 mesh-bg relative overflow-hidden" aria-label="Programme tracks">
        {/* Ambient orbs */}
        <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-2" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-3" aria-hidden="true" />

        <div className="container max-w-6xl mx-auto px-5 md:px-4 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-purple-400 font-medium mb-3 text-base">Five Strategic Tracks Across TRL 2-8</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Deep Tech Programme Tracks
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Intensive residential training and R&D programmes designed for teams ready to build with deep tech.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {programmeTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.id}
                  to={`/programmes#${track.id}`}
                  className={`glass-card-interactive border ${track.borderClass} !rounded-xl p-5 md:p-6 group`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 ${track.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${track.iconColor}`} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${track.badgeBg} ${track.badgeText}`}>
                      TRL {track.trlRange}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-2">{track.title}</h3>
                  {(track as any).partnerLogo && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">with</span>
                      <img src={(track as any).partnerLogo} alt="VisioningLab" className="h-4 w-auto" />
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{track.description}</p>
                  <span className={`text-sm ${track.iconColor} group-hover:underline flex items-center gap-1`}>
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4: Co-Creation Model */}
      <section className="py-16 md:py-20" aria-label="Co-creation model">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Embed in Our Lab
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Three pathways for enterprises and SMEs to access deep tech expertise, from intensive sprints to long-term knowledge transfer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="glass-card-interactive aurora-shimmer !rounded-2xl !border-cyan-500/30 hover:!border-cyan-500/50 p-6 md:p-8">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Enterprise Training + Retainer</h3>
              <p className="text-muted-foreground text-sm mb-4">1-3 days</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                Your team embeds in the lab alongside our specialists for intensive R&D sprints. Bring a real challenge, leave with a validated prototype and deployment roadmap.
              </p>
              <p className="text-xs text-muted-foreground">Outcome: Working prototype at TRL 4-6</p>
            </div>

            <div className="glass-card-interactive aurora-shimmer !rounded-2xl !border-purple-500/30 hover:!border-purple-500/50 p-6 md:p-8">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-5">
                <Beaker className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">SME Innovation Sprint</h3>
              <p className="text-muted-foreground text-sm mb-4">1-3 days</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                Structured programmes for smaller companies ready to apply deep tech. Hands-on building with expert guidance, designed to deliver immediate capability.
              </p>
              <p className="text-xs text-muted-foreground">Outcome: Deployable MVP and team upskilling</p>
            </div>

            <div className="glass-card-interactive aurora-shimmer !rounded-2xl !border-green-500/30 hover:!border-green-500/50 p-6 md:p-8">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">KTP Partnership</h3>
              <p className="text-muted-foreground text-sm mb-4">12-36 months</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                Innovate UK-funded Knowledge Transfer Partnerships embedding a graduate associate in your organisation, co-supervised by our research team.
              </p>
              <p className="text-xs text-muted-foreground">Outcome: Long-term capability transfer, grant-funded</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/co-create"
              className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all min-h-[48px] px-8 py-3"
            >
              Design Your Engagement <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5: Research Evidence — temporarily disabled
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Research evidence">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Built on 16 Years of Deep Tech Research
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              The Octave laboratory (2007-2023) produced world-first collaborative immersive systems. That research heritage now powers applied innovation for industry.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {researchVideos.map((video) => (
              <div key={video.src} className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all group">
                <div className="aspect-video relative">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster={`/data/media/${video.thumb}`}
                    preload="none"
                  >
                    <source src={`/data/media/videos/${video.src}`} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                    <div className="w-12 h-12 bg-black/50 backdrop-blur rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm text-foreground/80">{video.caption}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/research" className="text-purple-400 hover:text-purple-300 text-sm font-medium hover:underline inline-flex items-center gap-1">
              View full research lineage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
      */}

      {/* Section 6: Facility & Tech Stack */}
      <section className="py-16 md:py-20" aria-label="Facility and technology">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                The Lab: Lake District Innovation Facility
              </h2>
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
                A residential deep tech facility in the Lake District combining focused R&D environments with the clarity that comes from working away from the office. Solar-powered, enterprise-grade, and purpose-built for intensive co-creation.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: "Solar-Powered", detail: "6.3kW sustainable infrastructure" },
                  { label: "10G Network", detail: "Enterprise-grade connectivity" },
                  { label: "GPU Cluster", detail: "8x RTX for ML workloads" },
                  { label: "LED Volume", detail: "Virtual production stage" },
                  { label: "Spatial Sound", detail: "24-speaker custom system" },
                  { label: "2 Bedrooms", detail: "Full-board residential, local rooms for larger groups" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-background/50 border border-purple-500/15 rounded-lg">
                    <div className="font-semibold text-sm text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                ))}
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium text-sm hover:underline gap-1"
              >
                Schedule a lab visit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl shadow-purple-500/10">
              {facilityImages.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt="DreamLab Innovation Facility, Lake District"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    index === facilityIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Team Preview */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Team preview">
        <div className="container max-w-6xl mx-auto px-5 md:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Multi-Disciplinary Expertise
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              44+ specialists spanning AI, XR, cyber, audio, and creative technology. Every programme draws on complementary expertise for comprehensive knowledge transfer.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 md:gap-6 max-w-3xl mx-auto">
            {featuredTeam.map((member) => (
              <div key={member.name} className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl p-5 text-center hover:border-purple-500/40 transition-colors">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden mb-4 shadow-lg shadow-purple-500/20">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-xl font-bold text-white">${member.name.split(' ').map(n => n[0]).join('')}</span>`;
                    }}
                  />
                </div>
                <h3 className="font-semibold text-sm">{member.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{member.role}</p>
                <p className="text-xs text-purple-400 mt-1">{member.domain}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/team" className="text-purple-400 hover:text-purple-300 text-sm font-medium hover:underline inline-flex items-center gap-1">
              Meet the full team <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 8: Dual CTA Footer */}
      <section className="py-16 md:py-20" aria-label="Get started">
        <div className="container max-w-5xl mx-auto px-5 md:px-4">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Enterprise CTA */}
            <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 md:p-10 text-center">
              <div className="w-14 h-14 mx-auto bg-cyan-500/10 rounded-xl flex items-center justify-center mb-5">
                <Handshake className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">Enterprise</h3>
              <p className="text-foreground/80 mb-6 text-sm leading-relaxed">
                Bring your team to the lab for intensive co-creation. Schedule a visit to scope your engagement.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all min-h-[48px] px-6 py-3 w-full sm:w-auto"
              >
                Schedule a Lab Visit <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* SME CTA */}
            <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 rounded-2xl p-6 md:p-10 text-center">
              <div className="w-14 h-14 mx-auto bg-purple-500/10 rounded-xl flex items-center justify-center mb-5">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">SME</h3>
              <p className="text-foreground/80 mb-6 text-sm leading-relaxed">
                Start with our self-guided workshops or enquire about a structured innovation sprint.
              </p>
              <Link
                to="/workshops"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all min-h-[48px] px-6 py-3 w-full sm:w-auto"
              >
                Explore Workshops <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Community link */}
          <div className="text-center mt-8">
            <a
              href="/community/"
              className="text-muted-foreground hover:text-purple-400 text-sm font-medium hover:underline inline-flex items-center gap-1 transition-colors"
            >
              Or join the community conversation <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="relative py-20 overflow-hidden" aria-label="Email signup">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift bg-400%" />

        <div className="container relative z-10 flex flex-col items-center">
          <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 p-10 md:p-12 max-w-3xl w-full">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Stay in the loop
            </h2>
            <p className="text-lg text-foreground/85 text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              Lab updates, programme announcements, and applied innovation insights.
            </p>
            <Suspense fallback={<div className="h-12 w-full bg-muted/20 rounded animate-pulse" />}>
              <EmailSignupForm />
            </Suspense>
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
              <Link to="/testimonials" className="text-sm md:text-base text-muted-foreground hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block py-2 min-h-[44px] flex items-center">
                Impact Stories
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
