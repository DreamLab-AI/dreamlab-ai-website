import { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { HyperdimensionalHeroBackground } from "@/components/HyperdimensionalHeroBackground";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";
import {
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Zap,
  Target,
  Clock,
  Shield,
  ChevronDown,
  MessageSquare,
  FileText,
  TrendingUp,
  Lightbulb,
  Building2,
  GraduationCap,
  Workflow,
  GitBranch,
  Layers,
  Network,
  Brain,
  Cpu
} from "lucide-react";

/**
 * AI Agent Masterclass page - Product Lead Format
 * Two course options:
 * - Residential programme (max 4 people, 2-5 days) - includes full-board
 * - 1-day workshops (up to 6 people) - delivered anywhere in UK
 */
const Masterclass = () => {
  useOGMeta(PAGE_OG_CONFIGS.masterclass || PAGE_OG_CONFIGS.home);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Example agent workflows
  const agentExamples = [
    {
      icon: MessageSquare,
      title: "Support Triage Agent",
      description: "Reads incoming support tickets, categorises urgency, drafts initial responses, escalates when needed"
    },
    {
      icon: TrendingUp,
      title: "Sales Lead Follow-up",
      description: "Monitors CRM for new leads, researches company context, drafts personalised follow-up sequences"
    },
    {
      icon: FileText,
      title: "Document Processing",
      description: "Extracts data from invoices, contracts, or reports, populates systems, flags anomalies"
    },
    {
      icon: Target,
      title: "Meeting Preparation",
      description: "Gathers context from emails, past notes, and LinkedIn before important meetings"
    }
  ];

  // What you'll learn to build
  const learningOutcomes = [
    "How to spot automation opportunities in your business",
    "Design thinking for AI workflows",
    "Connecting agents to your existing tools (email, CRM, databases)",
    "Building guardrails and human oversight",
    "Deploying and maintaining agents reliably",
    "Measuring ROI on automation"
  ];

  // Who this is for
  const idealFor = [
    {
      icon: Building2,
      title: "Operations Leaders",
      description: "Looking to automate repetitive workflows"
    },
    {
      icon: Lightbulb,
      title: "Founders & Technical Co-founders",
      description: "Who want to understand what's possible"
    },
    {
      icon: GraduationCap,
      title: "Team Leads",
      description: "Building internal tooling or automation"
    }
  ];

  // Advanced agentic capabilities (for residential reveal)
  const advancedCapabilities = [
    {
      icon: Network,
      title: "Multi-Agent Orchestration",
      description: "Agents that coordinate, delegate, and work together on complex workflows"
    },
    {
      icon: GitBranch,
      title: "Swarm Intelligence",
      description: "Deploy agent fleets that self-organise around your business problems"
    },
    {
      icon: Layers,
      title: "Memory & Learning",
      description: "Agents that remember context, learn patterns, and improve over time"
    },
    {
      icon: Workflow,
      title: "Agentic Infrastructure",
      description: "The same platform we use internally—production-grade, battle-tested"
    }
  ];

  // Reveal state for progressive disclosure
  const [showAdvanced, setShowAdvanced] = useState(false);

  // FAQ items
  const faqItems = [
    {
      question: "Do I need to know how to code?",
      answer: "No. We use low-code and no-code approaches where possible. If you can navigate a spreadsheet, you'll be fine."
    },
    {
      question: "What tools do we use?",
      answer: "A mix of Claude, custom agent frameworks, and integration platforms. We'll work with whatever fits your stack."
    },
    {
      question: "Will my agent actually work after the course?",
      answer: "Yes. We build something real together, connected to your systems. You'll leave with a working agent, not just theory."
    },
    {
      question: "What's the difference between the workshop and residential?",
      answer: "The 1-day workshop gives you a working agent and the skills to build more. The residential goes deeper over multiple days: multiple agents, complex workflows, and strategic planning for your whole automation roadmap."
    },
    {
      question: "Can you come to our office?",
      answer: "Absolutely. The 1-day workshops are delivered anywhere in the UK at your location."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero Section */}
      <section
        id="main-content"
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        <HyperdimensionalHeroBackground />

        <div className="container relative z-10 mt-16 flex flex-col items-center text-center px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up max-w-4xl leading-tight">
            Build AI agents for your business
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-foreground/85 max-w-3xl mb-8 animate-slide-up font-light tracking-wide" style={{ animationDelay: '0.1s' }}>
            One day. One working agent. Real impact.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in mb-8" style={{ animationDelay: '0.2s' }}>
            <a
              href="#pricing"
              className="group relative inline-flex items-center justify-center rounded-lg text-base font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105 h-14 px-10 py-3 overflow-hidden"
            >
              <span className="relative z-10">View course options →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </div>

          <div className="animate-slide-up flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>1-day workshop · up to 6 people · £1,495 pp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>Residential · max 4 people · from £995/day pp</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={scrollToContent}
            aria-label="Scroll down to learn more"
            className="text-foreground/60 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* About John Section */}
      <section id="content" ref={contentRef} className="py-24 px-4 bg-gradient-to-b from-background to-purple-950/10">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Who's teaching this?
            </h2>
          </div>

          <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 md:p-12">
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-lg text-foreground/85 leading-relaxed mb-6">
                <strong className="text-foreground">Dr John O'Hare</strong> — PhD, 25 years leading R&D at the intersection of AI, immersive tech, and product delivery. Built the UK's first Cave Automatic Virtual Environment. Directed technical teams on projects from IMAX documentaries to autonomous marine systems. £8M+ in research grants. Now runs a network of 42 specialist consultants.
              </p>
              <p className="text-lg text-foreground/85 leading-relaxed">
                This isn't theory. It's building systems that do real work—reading emails, updating databases, making decisions, and taking action—while keeping humans in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Walk Away With */}
      <section className="py-24 px-4 bg-gradient-to-b from-purple-950/10 to-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What you'll walk away with
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-cyan-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">A working AI agent</h3>
                <p className="text-foreground/70">Built specifically for your business, solving a real problem you have today</p>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-blue-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">The skills to build more</h3>
                <p className="text-foreground/70">Understand the patterns, so you can replicate this for other workflows</p>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Confidence to deploy safely</h3>
                <p className="text-foreground/70">Know what guardrails matter and how to keep humans in control</p>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur-xl rounded-xl border border-pink-500/20 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Time back, immediately</h3>
                <p className="text-foreground/70">Most participants save 5-10 hours per week within the first month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is an AI Agent */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-blue-950/10">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            What is an AI agent?
          </h2>
          <p className="text-lg text-foreground/70 text-center mb-12 max-w-2xl mx-auto">
            Software that perceives, decides, and acts. Not a chatbot—a worker:
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {agentExamples.map((example, index) => (
              <div
                key={index}
                className="bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-blue-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <example.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">{example.title}</h3>
                <p className="text-sm text-foreground/60">{example.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-foreground/70 max-w-2xl mx-auto">
            We build something like this—for your business—in the course.
          </p>
        </div>
      </section>

      {/* What You'll Learn to Build */}
      <section className="py-24 px-4 bg-gradient-to-b from-blue-950/10 to-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What you'll learn to build
          </h2>

          <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 md:p-12">
            <ul className="space-y-4">
              {learningOutcomes.map((outcome, index) => (
                <li key={index} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-foreground/85">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-purple-950/10">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How it works
          </h2>

          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">1</div>
                <div className="w-0.5 h-full bg-cyan-500/30 mt-2" />
              </div>
              <div className="pb-8">
                <h3 className="text-xl font-semibold mb-2">Before: Quick Call</h3>
                <p className="text-foreground/70">15-minute call to understand your business and identify the best agent opportunity. We'll pick something achievable in one day that delivers real value.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</div>
                <div className="w-0.5 h-full bg-blue-500/30 mt-2" />
              </div>
              <div className="pb-8">
                <h3 className="text-xl font-semibold mb-2">Day: Build Together</h3>
                <p className="text-foreground/70">Hands-on workshop. Morning: concepts, design, and architecture. Afternoon: build, test, deploy. You'll do the work—we'll guide you through it.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">3</div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">After: Support</h3>
                <p className="text-foreground/70">Two weeks of async support to help you fine-tune and expand what you've built.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-24 px-4 bg-gradient-to-b from-purple-950/10 to-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Who this is for
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {idealFor.map((person, index) => (
              <div
                key={index}
                className="bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <person.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">{person.title}</h3>
                <p className="text-sm text-foreground/60">{person.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-foreground/70 mt-8 max-w-2xl mx-auto">
            You don't need to be technical. If you can describe what you want automated, we can build it together.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gradient-to-b from-background to-cyan-950/10">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Choose your format
          </h2>
          <p className="text-lg text-foreground/70 text-center mb-12 max-w-2xl mx-auto">
            Start with a workshop to see what's possible. Go residential to build something transformative.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 1-Day Workshop */}
            <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium">
                Start Here
              </div>

              <h3 className="text-2xl font-bold mb-2">1-Day Workshop</h3>
              <p className="text-foreground/70 mb-6">At your location, anywhere in the UK</p>

              <div className="mb-6">
                <span className="text-4xl font-bold">£1,495</span>
                <span className="text-foreground/60 ml-2">per person</span>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>Up to 6 people</span>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  <span>We come to you (UK-wide)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span>One working agent</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  <span>2 weeks async support</span>
                </li>
              </ul>

              <p className="text-sm text-foreground/60 mb-6">
                Build your first AI agent with real business impact in a single day.
              </p>

              <a
                href="https://cal.com/dreamlab/masterclass-discovery"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold text-center hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
              >
                Book a call <ArrowRight className="inline w-4 h-4 ml-2" />
              </a>
            </div>

            {/* Residential Programme */}
            <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-purple-400 text-sm font-medium">
                Advanced Platform
              </div>

              <h3 className="text-2xl font-bold mb-2">Residential Programme</h3>
              <p className="text-foreground/70 mb-6">Full-board at DreamLab HQ</p>

              <div className="mb-6">
                <span className="text-4xl font-bold">From £995</span>
                <span className="text-foreground/60 ml-2">per person/day</span>
                <p className="text-sm text-foreground/50 mt-1">Duration tailored to your objectives (2-5 days)</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Max 4 people</span>
                </li>
                <li className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span>Full-board accommodation included</span>
                </li>
                <li className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-purple-400" />
                  <span>Multi-agent orchestration</span>
                </li>
                <li className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span>Advanced agentic platform access</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  <span>4 weeks support + strategic roadmap</span>
                </li>
              </ul>

              {/* Progressive reveal button */}
              {!showAdvanced && (
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors mb-4 flex items-center gap-1"
                >
                  What makes this different? <ChevronDown className="w-4 h-4" />
                </button>
              )}

              <a
                href="https://cal.com/dreamlab/residential-discovery"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-center hover:shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                Book a call <ArrowRight className="inline w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Platform Reveal - Progressive Disclosure */}
      {showAdvanced && (
        <section className="py-24 px-4 bg-gradient-to-b from-cyan-950/10 to-purple-950/20 animate-fade-in">
          <div className="container max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full text-purple-400 text-sm font-medium mb-6">
                <Cpu className="w-4 h-4" />
                Beyond Single Agents
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The agentic platform we actually use
              </h2>
              <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                The residential isn't just "more time"—it's access to the infrastructure we've built for orchestrating agent systems at scale.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {advancedCapabilities.map((capability, index) => (
                <div
                  key={index}
                  className="bg-background/40 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                    <capability.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{capability.title}</h3>
                  <p className="text-foreground/60">{capability.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 md:p-12">
              <h3 className="text-xl font-semibold mb-4">What you get access to:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Agent swarm orchestration—multiple agents working in coordination</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Memory systems that persist context across sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Self-improving agents that learn from feedback</span>
                  </li>
                </ul>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Production deployment patterns and monitoring</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Strategic roadmap for automation across your organisation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/85">Direct access to the same tools we use daily</span>
                  </li>
                </ul>
              </div>
              <p className="text-foreground/60 mt-6 text-sm">
                This is the difference between building a chatbot and building an automation capability. The residential is for organisations ready to think bigger.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Guarantee */}
      <section className="py-24 px-4 bg-gradient-to-b from-cyan-950/10 to-background">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            The guarantee
          </h2>
          <p className="text-lg text-foreground/85 mb-4">
            If you don't leave with a working agent that saves you time, we'll refund your fee. No questions, no awkwardness.
          </p>
          <p className="text-foreground/60">
            We've never had to use this. The format works.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-purple-950/10">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Common questions
          </h2>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <details
                key={index}
                className="group bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold pr-4">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-foreground/60 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-foreground/70">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 bg-gradient-to-b from-purple-950/10 to-background">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build your first agent?
          </h2>
          <p className="text-lg text-foreground/70 mb-8">
            Book a 15-minute discovery call. We'll identify the best automation opportunity for your business and answer any questions.
          </p>

          <a
            href="https://cal.com/dreamlab/masterclass-discovery"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg text-base font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105 h-14 px-10 py-3"
          >
            Book your discovery call <ArrowRight className="ml-2 w-5 h-5" />
          </a>

          <p className="text-sm text-foreground/50 mt-4">
            No commitment. Just a conversation.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 overflow-hidden" role="contentinfo">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent" />
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-purple-500/20 pt-8 gap-6">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300">
                      Bluesky
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300">
                      LinkedIn
                    </a>
                  </li>
                </ul>
              </nav>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-all duration-300">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Masterclass;
