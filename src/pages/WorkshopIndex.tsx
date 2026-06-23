import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { LearningPathDiagram } from '@/components/LearningPathDiagram';
import { useOGMeta } from '@/hooks/useOGMeta';
import { useWorkshopProgress } from '@/hooks/useWorkshopProgress';
import { PAGE_OG_CONFIGS } from '@/lib/og-meta';
import {
  BookOpen, Code, Terminal, Users, FileText, Clock, CheckCircle2,
  PlayCircle, ChevronDown, Zap, Target, ArrowRight,
  Sparkles, Database, Box, Layers, Rocket, Check, RotateCcw,
} from 'lucide-react';

interface WorkshopModule {
  id: string;
  name: string;
  path: string;
  description: string;
  estimatedHours: number;
}

interface CurriculumPhase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  category: 'foundation' | 'ai-ml' | 'engineering';
  icon: React.ComponentType<{ className?: string }>;
  workshops: WorkshopModule[];
}

const PHASES: CurriculumPhase[] = [
  {
    id: 'foundations',
    number: 1,
    title: 'Foundations',
    subtitle: 'Tools, Environment & First Steps',
    description: 'Set up your AI development environment with VS Code, Git, GitHub, and essential extensions. Three complementary workshops cover infrastructure basics, IDE configuration, and a comprehensive VS Code reference.',
    difficulty: 'Beginner',
    estimatedHours: 8,
    category: 'foundation',
    icon: Code,
    workshops: [
      { id: 'workshop-00-infra', name: 'Infrastructure Setup', path: '/workshops/workshop-00-infra', description: 'Git, GitHub, VS Code, and Claude Code basics', estimatedHours: 2 },
      { id: 'workshop-01-morning-vscode-setup', name: 'VS Code as AI Command Centre', path: '/workshops/workshop-01-morning-vscode-setup', description: 'Configure VS Code with AI extensions and tools', estimatedHours: 3 },
      { id: 'vscode-learning-pathway', name: 'VS Code Learning Pathway', path: '/workshops/vscode-learning-pathway', description: 'Complete VS Code mastery reference', estimatedHours: 3 },
    ],
  },
  {
    id: 'visual-docs',
    number: 2,
    title: 'Visual Documentation & Version Control',
    subtitle: 'Diagrams, Git Mastery & Professional Workflows',
    description: 'Master Mermaid diagrams for flowcharts, Gantt charts, and sequence diagrams. Deepen your Git skills with visual tools, branching strategies, and collaborative workflows.',
    difficulty: 'Beginner',
    estimatedHours: 3,
    category: 'foundation',
    icon: FileText,
    workshops: [
      { id: 'workshop-01-afternoon-visual-version-control', name: 'Visual Tools & Version Control', path: '/workshops/workshop-01-afternoon-visual-version-control', description: 'Mermaid diagrams, Git visual tools, and GitHub workflows', estimatedHours: 3 },
    ],
  },
  {
    id: 'ai-apis',
    number: 3,
    title: 'AI APIs & Vibe Coding',
    subtitle: 'Connect, Create & Converse with AI',
    description: 'Connect directly to AI APIs from Anthropic, OpenAI, and Google. Then master conversational programming — building applications through natural language dialogue with AI.',
    difficulty: 'Intermediate',
    estimatedHours: 6,
    category: 'ai-ml',
    icon: Sparkles,
    workshops: [
      { id: 'workshop-02-morning-ai-api-access', name: 'Direct AI API Access', path: '/workshops/workshop-02-morning-ai-api-access', description: 'Connect to OpenAI, Anthropic, and Gemini APIs', estimatedHours: 3 },
      { id: 'workshop-02-afternoon-vibe-coding', name: 'Vibe Coding Mastery', path: '/workshops/workshop-02-afternoon-vibe-coding', description: 'Build applications through conversational AI programming', estimatedHours: 3 },
    ],
  },
  {
    id: 'claude-code',
    number: 4,
    title: 'Claude Code Mastery',
    subtitle: "Anthropic’s Agentic Coding Tool",
    description: 'Master Claude Code CLI from installation through CLAUDE.md project configuration, MCP server integration, hooks, subagents, and workflow orchestration.',
    difficulty: 'Intermediate',
    estimatedHours: 6,
    category: 'engineering',
    icon: Terminal,
    workshops: [
      { id: 'workshop-08-claude-code', name: 'Claude Code Mastery', path: '/workshops/workshop-08-claude-code', description: "Full mastery of Anthropic’s agentic coding tool", estimatedHours: 6 },
    ],
  },
  {
    id: 'local-ai-rag',
    number: 5,
    title: 'Local AI & RAG Systems',
    subtitle: 'Private Models & Knowledge Pipelines',
    description: 'Run AI models locally with Ollama for complete data privacy. Then build retrieval-augmented generation systems that make AI an expert on your own documents.',
    difficulty: 'Intermediate',
    estimatedHours: 6,
    category: 'ai-ml',
    icon: Database,
    workshops: [
      { id: 'workshop-03-morning-local-ai', name: 'Local AI Models', path: '/workshops/workshop-03-morning-local-ai', description: 'Run AI models locally with Ollama and LM Studio', estimatedHours: 3 },
      { id: 'workshop-03-afternoon-rag-system', name: 'RAG System Implementation', path: '/workshops/workshop-03-afternoon-rag-system', description: 'Build retrieval-augmented generation for knowledge work', estimatedHours: 3 },
    ],
  },
  {
    id: 'docker',
    number: 6,
    title: 'Docker & Containers',
    subtitle: 'Reproducible, Portable Environments',
    description: 'Master Docker fundamentals and containerisation. Use VS Code Dev Containers for reproducible environments and remote Docker for GPU-accelerated development.',
    difficulty: 'Intermediate',
    estimatedHours: 6,
    category: 'engineering',
    icon: Box,
    workshops: [
      { id: 'workshop-07-docker-containers', name: 'Docker & Containers', path: '/workshops/workshop-07-docker-containers', description: 'Docker, Dev Containers, and remote development', estimatedHours: 6 },
    ],
  },
  {
    id: 'agents',
    number: 7,
    title: 'AI Agents & Orchestration',
    subtitle: 'Specialised Agents & Multi-Agent Systems',
    description: 'Create specialised AI agents using the ReAct pattern. Then coordinate multi-agent workflows with cost controls, safety measures, and approval chains.',
    difficulty: 'Advanced',
    estimatedHours: 6,
    category: 'ai-ml',
    icon: Users,
    workshops: [
      { id: 'workshop-04-morning-ai-agents', name: 'Specialised AI Agents', path: '/workshops/workshop-04-morning-ai-agents', description: 'Create domain-specific agents with the ReAct pattern', estimatedHours: 3 },
      { id: 'workshop-04-afternoon-orchestration', name: 'Agent Orchestration & Safety', path: '/workshops/workshop-04-afternoon-orchestration', description: 'Coordinate agents with cost controls and safety measures', estimatedHours: 3 },
    ],
  },
  {
    id: 'coding-ecosystem',
    number: 8,
    title: 'AI Coding Ecosystem',
    subtitle: 'Tools, Security & Professional Practice',
    description: 'Survey the full AI coding landscape — Claude Code, Codex CLI, GitHub Copilot, Cursor, Windsurf. Understand security implications, ethical considerations, and professional practice.',
    difficulty: 'Advanced',
    estimatedHours: 4,
    category: 'engineering',
    icon: Layers,
    workshops: [
      { id: 'workshop-06-codex', name: 'AI Coding Ecosystem', path: '/workshops/workshop-06-codex', description: 'Claude Code, Codex CLI, Copilot, Cursor, security, and ethics', estimatedHours: 4 },
    ],
  },
  {
    id: 'qa-publishing',
    number: 9,
    title: 'QA, Publishing & Capstone',
    subtitle: 'Ship Confidently, Deliver Professionally',
    description: 'Build automated testing pipelines with AI-powered quality engineering tools including Agentic QE Fleet. Then master professional publishing workflows for deployment and documentation.',
    difficulty: 'Intermediate',
    estimatedHours: 6,
    category: 'engineering',
    icon: Rocket,
    workshops: [
      { id: 'workshop-05-morning-qa-automation', name: 'QA & Automation', path: '/workshops/workshop-05-morning-qa-automation', description: 'Automated testing, CI/CD, and AI-powered quality engineering', estimatedHours: 3 },
      { id: 'workshop-05-afternoon-publishing', name: 'Professional Output Suite', path: '/workshops/workshop-05-afternoon-publishing', description: 'Publish and deploy your AI-enhanced work professionally', estimatedHours: 3 },
    ],
  },
];

const ALL_WORKSHOP_IDS = PHASES.flatMap(p => p.workshops.map(w => w.id));
const TOTAL_HOURS = PHASES.reduce((sum, p) => sum + p.estimatedHours, 0);
const CIRCUMFERENCE = 2 * Math.PI * 16;

const CATEGORY_STYLES: Record<string, {
  gradient: string; border: string; accent: string; ring: string;
  numberBg: string; checkActive: string;
}> = {
  foundation: {
    gradient: 'from-blue-500/5 to-cyan-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    accent: 'text-blue-400',
    ring: 'text-blue-500',
    numberBg: 'from-blue-500 to-cyan-500',
    checkActive: 'bg-blue-500 text-white',
  },
  'ai-ml': {
    gradient: 'from-purple-500/5 to-violet-500/5',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    accent: 'text-purple-400',
    ring: 'text-purple-500',
    numberBg: 'from-purple-500 to-violet-500',
    checkActive: 'bg-purple-500 text-white',
  },
  engineering: {
    gradient: 'from-amber-500/5 to-orange-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    accent: 'text-amber-400',
    ring: 'text-amber-500',
    numberBg: 'from-amber-500 to-orange-500',
    checkActive: 'bg-amber-500 text-white',
  },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const WorkshopIndex = () => {
  useOGMeta(PAGE_OG_CONFIGS.workshops);
  const { isCompleted, toggleComplete, phaseProgress, reset, completedWorkshops } = useWorkshopProgress();

  const overallDone = completedWorkshops.length;
  const overallTotal = ALL_WORKSHOP_IDS.length;
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

  const completedPhaseIds = PHASES
    .filter(p => p.workshops.every(w => completedWorkshops.includes(w.id)))
    .map(p => p.id);

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative min-h-[90vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 -right-20 w-[32rem] h-[32rem] bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container relative z-10 pt-24 pb-12">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-8 animate-slide-up backdrop-blur-sm">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">9-Phase Unified Curriculum</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-up bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text animate-gradient-shift bg-400%" style={{ animationDelay: '0.1s' }}>
              AI-Powered Knowledge Work
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground/90 mb-12 max-w-3xl animate-slide-up font-light" style={{ animationDelay: '0.2s' }}>
              Master AI tools across 9 structured phases &mdash; from first setup to production deployment
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              {[
                { Icon: Target, label: '9 Phases', sub: 'Structured Path' },
                { Icon: BookOpen, label: '15 Workshops', sub: 'Hands-On Content' },
                { Icon: Clock, label: `${TOTAL_HOURS}+ Hours`, sub: 'Self-Paced' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                  <stat.Icon className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <div className="text-2xl font-bold text-foreground">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <Link
                to={PHASES[0].workshops[0].path}
                className="group relative inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 h-12 px-8 py-3 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Start Phase 1
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <button
                onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 border-2 border-purple-500/50 bg-background/50 backdrop-blur-sm hover:bg-purple-500/10 hover:border-purple-400 hover:scale-105 h-12 px-8 py-3"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  View Curriculum
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => document.getElementById('learning-path')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-muted-foreground/70 hover:text-purple-400 transition-all duration-300 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" />
          </button>
        </div>
      </section>

      {/* Overall Progress */}
      {overallDone > 0 && (
        <section className="relative py-6 border-b border-purple-500/10">
          <div className="container">
            <div className="flex items-center gap-4 max-w-4xl mx-auto">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Overall Progress: {overallDone}/{overallTotal} workshops
                  </span>
                  <span className="text-sm font-bold text-purple-400">{overallPct}%</span>
                </div>
                <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                title="Reset all progress"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Learning Path Diagram */}
      <section id="learning-path" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/15 to-pink-900/10" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Your Learning Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              9 phases from foundations to production. Click any phase to begin.
            </p>
          </div>
          <LearningPathDiagram
            completedPhaseIds={completedPhaseIds}
            onPhaseClick={(phaseId) => {
              const phase = PHASES.find(p => p.id === phaseId);
              if (phase?.workshops[0]?.path) {
                window.location.href = phase.workshops[0].path;
              }
            }}
          />
        </div>
      </section>

      {/* Curriculum */}
      <section id="curriculum" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent" />
        <div className="container relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Complete Curriculum
          </h2>

          <div className="space-y-8 max-w-5xl mx-auto">
            {PHASES.map(phase => {
              const styles = CATEGORY_STYLES[phase.category];
              const progress = phaseProgress(phase.workshops.map(w => w.id));
              const PhaseIcon = phase.icon;

              return (
                <div
                  key={phase.id}
                  className={`group relative bg-background/40 backdrop-blur-xl border rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 bg-gradient-to-br ${styles.gradient} ${styles.border}`}
                >
                  {/* Phase Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${styles.numberBg} text-white font-bold text-lg shadow-lg shrink-0`}>
                      {phase.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg md:text-xl font-bold text-foreground">{phase.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${DIFFICULTY_STYLES[phase.difficulty]}`}>
                          {phase.difficulty}
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${styles.accent}`}>{phase.subtitle}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                      <Clock className="w-4 h-4" />
                      <span>{phase.estimatedHours}h</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{phase.description}</p>

                  {/* Workshop List */}
                  <div className="space-y-2 mb-6">
                    {phase.workshops.map(workshop => {
                      const done = isCompleted(workshop.id);
                      return (
                        <div key={workshop.id} className="flex items-center gap-3 py-1">
                          <button
                            onClick={() => toggleComplete(workshop.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                              done
                                ? styles.checkActive
                                : 'border-2 border-muted-foreground/30 hover:border-purple-400'
                            }`}
                            aria-label={done ? `Mark ${workshop.name} incomplete` : `Mark ${workshop.name} complete`}
                          >
                            {done && <Check className="w-4 h-4" />}
                          </button>
                          <Link
                            to={workshop.path}
                            className={`flex-1 text-sm font-medium transition-colors ${
                              done
                                ? 'text-muted-foreground line-through decoration-1'
                                : 'text-foreground hover:text-purple-400'
                            }`}
                          >
                            {workshop.name}
                          </Link>
                          <span className="text-xs text-muted-foreground shrink-0">{workshop.estimatedHours}h</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Footer */}
                  <div className="pt-5 border-t border-current/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10">
                          <svg className="transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
                            <circle
                              cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5"
                              strokeDasharray={CIRCUMFERENCE}
                              strokeDashoffset={CIRCUMFERENCE * (1 - progress.pct / 100)}
                              strokeLinecap="round"
                              className={`${styles.ring} transition-all duration-500`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                            {progress.pct}%
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {progress.done}/{progress.total} complete
                        </span>
                      </div>
                      <Link
                        to={phase.workshops[0].path}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium ${styles.accent} hover:underline`}
                      >
                        {progress.done === 0 ? 'Start' : progress.pct === 100 ? 'Review' : 'Continue'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="container relative z-10">
          <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-purple-900/40 border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 animate-gradient-shift bg-400%" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white text-transparent bg-clip-text">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-lg text-muted-foreground/90 mb-10">
                Our residential training programme delivers this entire curriculum with expert guidance
                over 5 intensive days. Or work through it at your own pace online.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/programmes"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-purple-900 font-semibold hover:shadow-xl hover:shadow-white/20 hover:scale-105 transition-all duration-300"
                >
                  <span>View Training Programmes</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-300"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-purple-500/10">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:info@dreamlab-ai.com" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default WorkshopIndex;
