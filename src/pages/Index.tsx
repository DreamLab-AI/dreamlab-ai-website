import { lazy, Suspense, useRef, useState } from "react";
import { HyperdimensionalHeroBackground } from "@/components/HyperdimensionalHeroBackground";
import { Header } from "@/components/Header";
import {
  ChevronDown,
  Laptop,
  Play,
  Wrench,
  FileText,
  Calendar,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Shield,
  ChevronRight,
  ArrowRight,
  Mail,
  MessageSquare,
  Users,
  FileSpreadsheet,
  Search,
  Bot
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

// Lazy-load email signup for performance
const EmailSignupForm = lazy(() => import("@/components/EmailSignupForm").then(m => ({ default: m.EmailSignupForm })));

// Loading skeleton
const SectionSkeleton = () => (
  <div className="w-full py-24 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

// Example use cases data
const useCases = [
  {
    title: "Support triage assistant",
    icon: MessageSquare,
    input: "New support tickets (or an export)",
    output: "Categorised tickets, suggested replies, and a priority queue"
  },
  {
    title: "Sales lead follow-up drafter",
    icon: Users,
    input: "New leads from a form/CRM export",
    output: "Draft follow-ups and a tidy next-step list"
  },
  {
    title: "Ops reporting helper",
    icon: FileSpreadsheet,
    input: "Weekly CSV exports",
    output: "A clean summary, anomalies to check, and a ready-to-send update"
  },
  {
    title: "Hiring screen helper",
    icon: FileText,
    input: "CVs and a role scorecard",
    output: "Structured summaries and questions for the first call"
  },
  {
    title: "Internal knowledge finder",
    icon: Search,
    input: "A folder of docs",
    output: "Answers with links back to the source files"
  }
];

// FAQ data
const faqs = [
  {
    q: "What is an AI agent, in plain English?",
    a: "A repeatable workflow that uses AI to do a task, plus a small amount of glue so it can take inputs, use tools, and produce outputs you can check."
  },
  {
    q: "Is this just 'prompting' training?",
    a: "No. Prompts matter, but the real value is learning how to turn a useful behaviour into a workflow you can run again and improve over time."
  },
  {
    q: "Do I need to be an AI expert?",
    a: "No. This is aimed at people who are practical and can follow steps. You do not need to know machine learning."
  },
  {
    q: "Do I need to be a software engineer?",
    a: "No. Being comfortable in a terminal is enough. Git helps, but we will cover what you need."
  },
  {
    q: "What operating systems do you support?",
    a: "Windows, macOS, and Linux are all fine."
  },
  {
    q: "Will it be fully autonomous?",
    a: "Sometimes. Often the sensible version is \"agent does the work, a human approves the action\". We will choose the safest approach for your workflow."
  },
  {
    q: "Can we connect it to our tools and data?",
    a: "Yes, as long as you can access them in a practical way (exports, APIs, shared folders, or similar). On day one I aim to connect to one real data source or tool."
  },
  {
    q: "Is our data safe?",
    a: "We will be careful about what is used during the day. We will talk through sensible boundaries, and you can choose how much real data to use."
  },
  {
    q: "How many people can join?",
    a: "Up to 6 people from your team for the flat fee."
  },
  {
    q: "Is the session recorded?",
    a: "Yes, you will get a recording afterwards."
  }
];

// FAQ Item component
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-purple-500/20 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-purple-400 transition-colors"
      >
        <span className="font-medium pr-4">{question}</span>
        <ChevronRight
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-5 text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

const Index = () => {
  useOGMeta(PAGE_OG_CONFIGS.home);
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero Section */}
      <section
        id="main-content"
        ref={heroRef}
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        <HyperdimensionalHeroBackground />

        <div className="container relative z-10 mt-16 flex flex-col items-center text-center px-4">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up max-w-4xl leading-tight"
            style={{
              textShadow: '0 0 40px rgba(212, 165, 116, 0.4), 0 0 80px rgba(205, 127, 50, 0.2)'
            }}
          >
            Learn how to build and manage AI agents
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-foreground/85 max-w-3xl mb-8 animate-slide-up font-light tracking-wide" style={{ animationDelay: '0.1s' }}>
            In a few hours we'll give you the tools to deploy agents that can meaningfully impact your business and give you long term advantage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in mb-8" style={{ animationDelay: '0.2s' }}>
            <a
              href="/masterclass#pricing"
              className="group relative inline-flex items-center justify-center rounded-lg text-base font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 h-14 px-8 py-3 overflow-hidden"
            >
              <span className="relative z-10">Get the AI Agent Masterclass</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </div>

          <div className="animate-slide-up flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>1-day masterclass · up to 6 people · £2,999 + VAT</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Scroll down to next section"
            className="text-foreground/60 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* John's Introduction */}
      <section className="py-20 relative overflow-hidden" aria-label="Introduction">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden shadow-2xl shadow-purple-500/30">
                <img
                  src="/data/team/04.webp"
                  alt="Dr John O'Hare"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-4xl font-bold text-white">JJ</span>';
                  }}
                />
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xl md:text-2xl text-foreground/90 leading-relaxed mb-4">
                I'm John. I build practical AI systems for a living, and I run a hands-on training day for teams who want to apply AI inside their organisation.
              </p>
              <p className="text-lg text-foreground/80 leading-relaxed mb-4">
                In this masterclass, we'll pick one workflow you can genuinely automate with AI, then build an agent you can run on demand. You'll leave with a working agent, plus templates, prompts, frameworks, and a starter repo so you can build the next one without starting from scratch.
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Dr John O'Hare</span> · Founder at DreamLab
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Walk Away With */}
      <section className="py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Outcomes">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-purple-400 font-medium mb-3">Turn AI into a repeatable advantage for your business</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Here's what you'll walk away with:
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Outcome 1 */}
            <div className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl p-8 hover:border-purple-500/40 transition-colors">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <Laptop className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">A working setup on your computer</h3>
              <p className="text-muted-foreground leading-relaxed">
                We will have set up a clean project you can keep and reuse and a git repo with a clear structure you can extend.
              </p>
            </div>

            {/* Outcome 2 */}
            <div className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl p-8 hover:border-purple-500/40 transition-colors">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6">
                <Play className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">A real agent you can run on demand</h3>
              <p className="text-muted-foreground leading-relaxed">
                You will have an agent that takes real inputs and produces useful outputs that you can run repeatedly.
              </p>
            </div>

            {/* Outcome 3 */}
            <div className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl p-8 hover:border-purple-500/40 transition-colors">
              <div className="w-14 h-14 bg-pink-500/10 rounded-xl flex items-center justify-center mb-6">
                <Wrench className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">The ability to build your own agents</h3>
              <p className="text-muted-foreground leading-relaxed">
                You'll leave with the fundamentals to repeat this again. I will include templates, checklists and prompts so you can build the next agent easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What is an AI Agent? */}
      <section className="py-20" aria-label="What is an AI agent">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Wait, what even is an 'AI agent'?
            </h2>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 md:p-10">
            <div className="flex items-start gap-6">
              <div className="hidden md:flex flex-shrink-0 w-16 h-16 bg-purple-500/20 rounded-full items-center justify-center">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-lg md:text-xl text-foreground/90 leading-relaxed mb-4">
                  In plain English, an AI agent is a small bit of autonomous software that can follow a set of steps you define, use tools (files, APIs, spreadsheets, inboxes), and produce an output you can check.
                </p>
                <p className="text-lg text-foreground/80 leading-relaxed">
                  Think of it like a junior assistant that can do the repetitive parts of your business fast, freeing you and your team to focus on the important stuff.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example Use Cases */}
      <section className="py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Use cases">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What you will learn to build
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We'll develop one small, safe, high-value automation. Here are some examples that are usually "day-one friendly":
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={index}
                  className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold">{useCase.title}</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Input:</span>
                      <span className="ml-2 text-foreground/80">{useCase.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output:</span>
                      <span className="ml-2 text-foreground/80">{useCase.output}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20" aria-label="How it works">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Light prep</h3>
              <p className="text-muted-foreground leading-relaxed">
                I'll send you a simple checklist in advance. It usually includes: installing a couple of tools and creating an account for API access to an AI model.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">The live training day</h3>
              <p className="text-muted-foreground leading-relaxed">
                Hands-on build with me, with plenty of time for questions and getting it working on your machines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-pink-500/10 rounded-xl flex items-center justify-center mb-6">
                <FolderOpen className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Recording & resources</h3>
              <p className="text-muted-foreground leading-relaxed">
                I'll send you a recording of the day and the full resource pack.
              </p>
            </div>
          </div>

          {/* What happens on the day */}
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-center mb-10">What happens on the day:</h3>
            <div className="max-w-2xl mx-auto space-y-6">
              {[
                { num: 1, title: "Kick-off & scoping", desc: "We pick the workflow and define \"success\"" },
                { num: 2, title: "Setup", desc: "Project, repo, and a working environment on each machine" },
                { num: 3, title: "Build", desc: "Start simple, then make it real" },
                { num: 4, title: "Connect", desc: "We hook into one data source/tool you can access" },
                { num: 5, title: "Make it repeatable", desc: "Run it again, document it, and agree ownership" }
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 text-white font-bold">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Target audience">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Who is the AI Agent Masterclass for?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Who it's for */}
            <div className="bg-background/50 backdrop-blur border border-green-500/30 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-6 text-green-400">Who this is for</h3>
              <p className="text-muted-foreground mb-6">This is a good fit if you are:</p>
              <ul className="space-y-4">
                {[
                  "An ops lead, RevOps lead, systems person, technical founder, or similar",
                  "Comfortable following steps in a terminal",
                  "Keen to move from \"AI experiments\" to \"AI doing work\"",
                  "Able to bring 2-6 people who will actually use the system afterwards"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Who it's not for */}
            <div className="bg-background/50 backdrop-blur border border-red-500/30 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-6 text-red-400">Who it's not for</h3>
              <p className="text-muted-foreground mb-6">This is not the right session if you:</p>
              <ul className="space-y-4">
                {[
                  "Want general ChatGPT productivity tips",
                  "Cannot use a terminal at all",
                  "Want to automate something high-risk on day one (money movement, destructive actions)",
                  "Want help doing anything illegal or morally dodgy"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / What's Included */}
      <section id="pricing" className="py-20" aria-label="Pricing">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Here's everything I've included in the Masterclass
            </h2>
            <p className="text-lg text-muted-foreground">
              You are not just paying for a day of teaching. You are paying for a result and a kit you can reuse.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8 md:p-12">
            <ul className="space-y-4 mb-10">
              {[
                { item: "Live online training day for up to 6 people", value: "£3,500" },
                { item: "Instructor-led build support throughout the day", value: "£900" },
                { item: "Workflow selection pack", value: "£450" },
                { item: "Agent spec template (inputs, outputs, boundaries, checks)", value: "£350" },
                { item: "Starter repo + project structure", value: "£750" },
                { item: "Terminal quickstart for non-developers", value: "£200" },
                { item: "Git quickstart (the minimum you need)", value: "£250" },
                { item: "Prompt patterns for agent workflows", value: "£400" },
                { item: "Evaluation checklist", value: "£450" },
                { item: "Recording of the training day", value: "£300" }
              ].map((line, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-b-0">
                  <span className="text-foreground/90">{line.item}</span>
                  <span className="text-muted-foreground text-sm ml-4">Worth: {line.value}</span>
                </li>
              ))}
            </ul>

            <div className="text-center">
              <div className="text-muted-foreground mb-2">Total worth: <span className="line-through">£7,500</span></div>
              <div className="text-4xl md:text-5xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 text-transparent bg-clip-text">£2,999</span>
                <span className="text-lg font-normal text-muted-foreground ml-2">+ VAT</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">One price for your whole team (up to 6 people)</p>

              <a
                href="mailto:info@dreamlab-ai.com?subject=AI%20Agent%20Masterclass%20Booking"
                className="inline-flex items-center justify-center rounded-lg text-lg font-semibold bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 transition-all h-14 px-10"
              >
                Book a call
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="Guarantee">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-background/50 backdrop-blur border border-green-500/30 rounded-2xl p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="hidden md:flex flex-shrink-0 w-16 h-16 bg-green-500/20 rounded-full items-center justify-center">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">My guarantee</h2>
                <p className="text-foreground/80 mb-6">I want this to feel like a safe decision for you.</p>

                <h3 className="font-semibold text-lg mb-3 text-green-400">The "working proof" guarantee</h3>
                <p className="text-foreground/90 mb-4 leading-relaxed">
                  If you complete the prep checklist and attend the day, and we do not get a working on-demand run of the agent in your environment by the end of the day, I will book an additional 90-minute follow-up session at no cost to get it over the line.
                </p>
                <p className="text-foreground/90 mb-6 leading-relaxed">
                  If we still cannot get a working proof after that follow-up, I will refund the full £2,999 fee.
                </p>

                <h4 className="font-semibold mb-2">Fair boundary (so nobody gets surprised):</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• The guarantee assumes we can access at least one workable data source/tool during the session.</li>
                  <li>• If access turns out to be blocked on the day, we will still build the workflow using a realistic example dataset.</li>
                  <li>• I'll sanity-check access on the fit call so this does not become an issue.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About John */}
      <section className="py-20" aria-label="About the instructor">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              About me
            </h2>
            <p className="text-lg text-muted-foreground">
              I'm not a "tips and tricks" trainer. I've spent decades building and running real systems.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden shadow-2xl shadow-purple-500/30">
                <img
                  src="/data/team/04.webp"
                  alt="Dr John O'Hare"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-6xl font-bold text-white">JJ</span>';
                  }}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Dr John O'Hare</h3>
              <p className="text-muted-foreground mb-2">Your instructor</p>

              <h4 className="font-semibold mt-6 mb-3">A few highlights:</h4>
              <ul className="space-y-2 text-foreground/80">
                <li>• Postdoctoral research and commercial work at MediaCityUK</li>
                <li>• AI lead for Future Fleet (machine vision for marine systems, patent pending)</li>
                <li>• Research Director at Pathway XR (virtual production and immersive systems)</li>
                <li>• Technical Director of the Octave mixed reality laboratory (17 years)</li>
                <li>• PhD work in telepresence and light field implementation</li>
                <li>• CTO (Display Engineering) at Insight Imaging</li>
              </ul>

              <p className="text-muted-foreground mt-6 italic">
                What matters for you: I'm good at making complex ideas practical, and keeping the focus on shipping something that works.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gradient-to-b from-background to-purple-950/10" aria-label="FAQ">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="bg-background/50 backdrop-blur border border-purple-500/20 rounded-2xl p-6 md:p-8">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20" aria-label="Book a call">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Book a 10-minute call
            </h2>
            <p className="text-lg text-foreground/80 mb-6 max-w-2xl mx-auto">
              If you want to see if this is right for your team, start here. You'll speak to me directly.
            </p>
            <p className="text-muted-foreground mb-8">
              10 minutes • no prep • we will check scope, access, and whether this will work for your team
            </p>

            <a
              href="mailto:info@dreamlab-ai.com?subject=AI%20Agent%20Masterclass%20-%20Fit%20Call"
              className="inline-flex items-center justify-center rounded-lg text-lg font-semibold bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 transition-all h-14 px-10"
            >
              Book the call now
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="relative py-24 overflow-hidden" aria-label="Email signup">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift bg-400%" />

        <div className="container relative z-10 flex flex-col items-center">
          <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 p-12 max-w-3xl w-full">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Stay in the loop
            </h2>
            <p className="text-lg text-foreground/85 text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              Get updates on upcoming training dates and practical AI insights.
            </p>
            <Suspense fallback={<div className="h-12 w-full bg-muted/20 rounded animate-pulse" />}>
              <EmailSignupForm />
            </Suspense>
          </div>
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
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block">
                Privacy Policy
              </a>
              <a href="/testimonials" className="text-sm text-muted-foreground hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block">
                Success Stories
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
