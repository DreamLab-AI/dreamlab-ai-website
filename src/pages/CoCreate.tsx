import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  Beaker,
  GraduationCap,
  Search,
  Target,
  Hammer,
  ClipboardCheck,
  Rocket,
  MapPin,
  Wifi,
  Sun,
  Monitor,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";

const processSteps = [
  { icon: Search, title: "Discovery", description: "We map your challenge, assess technology readiness, and identify the right combination of expertise. No commitment required." },
  { icon: Target, title: "Scope", description: "Define deliverables, team composition, timeline, and success criteria. We identify funding opportunities including Innovate UK grants and KTP schemes." },
  { icon: Hammer, title: "Build", description: "Your team embeds in the lab alongside our specialists. Hands-on co-creation with daily standups and working prototypes from day one." },
  { icon: ClipboardCheck, title: "Validate", description: "Test against real data, real users, and real constraints. We apply the AREA Responsible Innovation framework to anticipate downstream impacts." },
  { icon: Rocket, title: "Deploy", description: "Handover of validated prototype, documentation, and deployment roadmap. Post-engagement support ensures continuity." },
];

const facilityImages = [
  "/data/media/aerial.jpeg",
  "/data/media/fairfield-front.jpg",
  "/data/media/labview2.webp",
  "/data/media/labview3.webp",
  "/data/media/view.jpeg",
  "/data/media/view3.webp",
];

const CoCreate = () => {
  useOGMeta({
    title: "Co-Create With Us | DreamLab Applied Innovation Lab",
    description: "Embed your team in our Lake District innovation lab. Enterprise residencies, SME innovation sprints, and Innovate UK KTP partnerships for deep tech co-creation.",
    url: "https://dreamlab-ai.com/co-create",
  });

  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setImgIndex((p) => (p + 1) % facilityImages.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-purple-950/20" />
        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 text-sm" variant="secondary">Applied Innovation Lab</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 inline-block text-transparent bg-clip-text px-4">
              Co-Create With Us
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto px-4">
              Bring your toughest challenge to our Lake District lab. Your team works alongside 44+ deep tech specialists in an environment designed for focused, intensive co-creation. We do not just advise. We build with you.
            </p>
            <Button size="lg" asChild className="min-h-[44px]">
              <Link to="/contact">Book a Discovery Call <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Three Engagement Paths */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Engagement models">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Three Ways to Engage</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you are a multinational scoping an innovation programme or an SME with a specific technical challenge, there is a pathway that fits.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Enterprise Residency */}
            <div className="bg-background/50 backdrop-blur border border-cyan-500/30 rounded-2xl p-6 md:p-8 hover:border-cyan-500/50 transition-colors relative">
              <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 text-xs font-medium">Enterprise</div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-1">Enterprise Residency</h3>
              <p className="text-muted-foreground text-sm mb-4">1-3 days, bespoke</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-5">
                Your team embeds in the lab for intensive R&D sprints. We assign a dedicated multi-disciplinary team from our specialist collective, matched to your domain and challenge.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  "Dedicated specialist team (3-8 people)",
                  "Full residential accommodation",
                  "Enterprise GPU and infrastructure access",
                  "IP ownership retained by your organisation",
                  "Post-residency support (4-8 weeks)",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Typical outcome: Validated prototype at TRL 4-6 with deployment roadmap</p>
              <Link
                to="/contact"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold text-center hover:shadow-lg hover:shadow-cyan-500/30 transition-all min-h-[48px]"
              >
                Enquire <ArrowRight className="inline w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* SME Innovation Sprint */}
            <div className="bg-background/50 backdrop-blur border border-purple-500/30 rounded-2xl p-6 md:p-8 hover:border-purple-500/50 transition-colors relative">
              <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500/20 rounded-full text-purple-400 text-xs font-medium">SME</div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-5">
                <Beaker className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-1">SME Innovation Sprint</h3>
              <p className="text-muted-foreground text-sm mb-4">1-3 days, structured</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-5">
                Structured programmes for smaller companies ready to apply deep tech. You arrive with a challenge and leave with a working solution and the skills to maintain it.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  "Up to 4 people from your team",
                  "Matched to a programme track",
                  "Full accommodation and meals",
                  "Starter repo, templates, and recording",
                  "2 weeks async follow-up support",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Typical outcome: Deployable MVP and team upskilling</p>
              <Link
                to="/programmes"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-center hover:shadow-lg hover:shadow-purple-500/30 transition-all min-h-[48px]"
              >
                View Programmes <ArrowRight className="inline w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* KTP Partnership */}
            <div className="bg-background/50 backdrop-blur border border-green-500/30 rounded-2xl p-6 md:p-8 hover:border-green-500/50 transition-colors relative">
              <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/20 rounded-full text-green-400 text-xs font-medium">Grant-Funded</div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-1">KTP Partnership</h3>
              <p className="text-muted-foreground text-sm mb-4">12-36 months, Innovate UK funded</p>
              <p className="text-foreground/80 text-sm leading-relaxed mb-5">
                Knowledge Transfer Partnerships place a graduate associate in your organisation, co-supervised by our research team. Innovate UK funds up to 67% of the cost for SMEs, making this the most cost-effective route to long-term capability transfer.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  "Up to 67% grant funded (SMEs)",
                  "Dedicated KTP associate in your team",
                  "Academic supervision from our PhDs",
                  "Structured knowledge transfer plan",
                  "Proven Innovate UK application support",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Typical outcome: Embedded capability, new products/processes, academic publications</p>
              <Link
                to="/contact"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold text-center hover:shadow-lg hover:shadow-green-500/30 transition-all min-h-[48px]"
              >
                Discuss KTP Options <ArrowRight className="inline w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Lab Environment */}
      <section className="py-16 md:py-20" aria-label="Lab environment">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">The Lab Environment</h2>
              <p className="text-foreground/80 leading-relaxed mb-6">
                Our Lake District facility is purpose-built for intensive co-creation. Teams work in a residential setting with enterprise-grade infrastructure, surrounded by the natural environment that research consistently links to creative problem-solving and sustained focus.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: Sun, label: "Solar-Powered", detail: "6.3kW sustainable energy" },
                  { icon: Wifi, label: "10G Network", detail: "Enterprise connectivity" },
                  { icon: Monitor, label: "GPU Cluster", detail: "8x RTX compute" },
                  { icon: Users, label: "Residential", detail: "5-bed, full-board" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-background/50 border border-purple-500/15 rounded-lg">
                      <Icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Additional capabilities: LED volume stage, Dolby Atmos studio, motion capture suite, dedicated training rooms, and social spaces for informal knowledge exchange.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span>Lake District, Cumbria, UK. 2.5 hours from Manchester, 3.5 hours from London by train.</span>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative aspect-video rounded-xl overflow-hidden shadow-2xl shadow-purple-500/10">
              {facilityImages.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt="DreamLab Innovation Facility"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    index === imgIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Engagement process">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Every engagement follows a structured process from discovery through deployment, with clear milestones and deliverables at each stage.
            </p>
          </div>

          <div className="space-y-6">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Funding & Innovation Context */}
      <section className="py-16 md:py-20" aria-label="UK innovation context">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-background/50 backdrop-blur border border-green-500/20 rounded-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">UK Innovation Funding</h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              We actively support grant applications and help position your engagement within the UK innovation ecosystem. Our programmes target the TRL 4-7 sweet spot where Innovate UK funding has the greatest impact.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { title: "Knowledge Transfer Partnerships", detail: "12-36 month embedded graduate associates, up to 67% funded for SMEs" },
                { title: "Technology Missions Fund", detail: "Collaborative R&D aligned with UKRI priority areas including AI assurance and net zero" },
                { title: "AI Assurance Innovation Fund", detail: "Spring 2026 call for trustworthy AI, responsible innovation, and AI safety tooling" },
                { title: "Digital Catapult Programmes", detail: "We partner with Digital Catapult as the natural Catapult for our creative and immersive tech work" },
              ].map((item) => (
                <div key={item.title} className="p-4 bg-green-500/5 border border-green-500/15 rounded-lg">
                  <h4 className="font-semibold text-sm text-green-400 mb-1">{item.title}</h4>
                  <p className="text-xs text-foreground/70">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              We have experience with Innovate UK applications and can advise on framing your project within the Technology Missions Fund language and the AREA Responsible Innovation framework.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Contact">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Start With a Conversation
            </h2>
            <p className="text-foreground/80 mb-6 max-w-2xl mx-auto">
              Book a 30-minute discovery call. We will map your challenge, identify the right engagement model, and explore funding options. No commitment, no pitch deck required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="min-h-[48px]">
                <Link to="/contact">Book a Discovery Call <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[48px]">
                <Link to="/programmes">Browse Programme Tracks</Link>
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

export default CoCreate;
