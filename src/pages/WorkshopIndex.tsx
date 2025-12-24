import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { LearningPathDiagram } from '@/components/LearningPathDiagram';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Code,
  Terminal,
  Cpu,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  PlayCircle,
  ChevronDown,
  TrendingUp,
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';

interface Workshop {
  id: string;
  name: string;
  path: string;
  moduleNumber?: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface WorkshopDay {
  day: number;
  title: string;
  morning?: Workshop;
  afternoon?: Workshop;
}

const WorkshopIndex = () => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const workshopDays: WorkshopDay[] = [
    {
      day: 1,
      title: "Development Environment & Version Control",
      morning: {
        id: "workshop-01-morning-vscode-setup",
        name: "VS Code as AI Command Centre",
        path: "/workshops/workshop-01-morning-vscode-setup",
        moduleNumber: "05",
        description: "Set up VS Code with AI extensions and tools for enhanced productivity",
        icon: <Code className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Beginner"
      },
      afternoon: {
        id: "workshop-01-afternoon-visual-version-control",
        name: "Visual Tools & Version Control",
        path: "/workshops/workshop-01-afternoon-visual-version-control",
        moduleNumber: "06",
        description: "Master Git and GitHub with visual tools and AI assistance",
        icon: <FileText className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Beginner"
      }
    },
    {
      day: 2,
      title: "AI Integration & Workflow",
      morning: {
        id: "workshop-02-morning-ai-api-access",
        name: "Direct AI API Access",
        path: "/workshops/workshop-02-morning-ai-api-access",
        moduleNumber: "07",
        description: "Connect to OpenAI, Anthropic, and other AI APIs directly",
        icon: <Terminal className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Intermediate"
      },
      afternoon: {
        id: "workshop-02-afternoon-vibe-coding",
        name: "Vibe Coding Mastery",
        path: "/workshops/workshop-02-afternoon-vibe-coding",
        moduleNumber: "08",
        description: "Master AI-assisted coding with pair programming techniques",
        icon: <Code className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Intermediate"
      }
    },
    {
      day: 3,
      title: "Local AI & Knowledge Systems",
      morning: {
        id: "workshop-03-morning-local-ai",
        name: "Local AI Models",
        path: "/workshops/workshop-03-morning-local-ai",
        moduleNumber: "09",
        description: "Run AI models locally with Ollama and other tools",
        icon: <Cpu className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Intermediate"
      },
      afternoon: {
        id: "workshop-03-afternoon-rag-system",
        name: "RAG System Implementation",
        path: "/workshops/workshop-03-afternoon-rag-system",
        moduleNumber: "10",
        description: "Build Retrieval-Augmented Generation systems for knowledge work",
        icon: <BookOpen className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Advanced"
      }
    },
    {
      day: 4,
      title: "AI Agents & Orchestration",
      morning: {
        id: "workshop-04-morning-ai-agents",
        name: "Specialized AI Agents",
        path: "/workshops/workshop-04-morning-ai-agents",
        moduleNumber: "11",
        description: "Create and deploy specialized AI agents for various tasks",
        icon: <Users className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Advanced"
      },
      afternoon: {
        id: "workshop-04-afternoon-orchestration",
        name: "Agent Orchestration & Safety",
        path: "/workshops/workshop-04-afternoon-orchestration",
        moduleNumber: "12",
        description: "Coordinate multiple AI agents and implement safety measures",
        icon: <Users className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Advanced"
      }
    },
    {
      day: 5,
      title: "Quality Assurance & Publishing",
      morning: {
        id: "workshop-05-morning-qa-automation",
        name: "Quality Assurance & Automation",
        path: "/workshops/workshop-05-morning-qa-automation",
        moduleNumber: "13",
        description: "Automate testing and quality checks with AI assistance",
        icon: <Terminal className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Intermediate"
      },
      afternoon: {
        id: "workshop-05-afternoon-publishing",
        name: "Professional Output Suite",
        path: "/workshops/workshop-05-afternoon-publishing",
        moduleNumber: "14",
        description: "Publish and distribute your AI-enhanced work professionally",
        icon: <FileText className="w-5 h-5" />,
        duration: "3 hours",
        difficulty: "Intermediate"
      }
    }
  ];

  const specialWorkshops: Workshop[] = [
    {
      id: "workshop-00-infra",
      name: "Infrastructure Setup",
      path: "/workshops/workshop-00-infra",
      description: "Essential setup for Git, VS Code, and AI tools",
      icon: <Terminal className="w-5 h-5" />,
      duration: "2 hours",
      difficulty: "Beginner"
    },
    {
      id: "workshop-06-codex",
      name: "Claude Code CLI & Codex",
      path: "/workshops/workshop-06-codex",
      description: "Master Claude Code CLI and advanced AI coding tools",
      icon: <Code className="w-5 h-5" />,
      duration: "4 hours",
      difficulty: "Advanced"
    },
    {
      id: "vscode-learning-pathway",
      name: "VS Code Learning Pathway",
      path: "/workshops/vscode-learning-pathway",
      description: "Complete learning path for VS Code mastery",
      icon: <BookOpen className="w-5 h-5" />,
      duration: "6 hours",
      difficulty: "Beginner"
    }
  ];

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden flex items-center justify-center">
        {/* Animated gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 -right-20 w-[32rem] h-[32rem] bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="container relative z-10 pt-24 pb-12">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-8 animate-slide-up backdrop-blur-sm">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Transform Your Workflow</span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-up bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text animate-gradient-shift bg-400%" style={{ animationDelay: '0.1s' }}>
              AI-Powered Knowledge Work
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground/90 mb-12 max-w-3xl animate-slide-up font-light" style={{ animationDelay: '0.2s' }}>
              Transform from AI consumer to AI commander in 5 days
            </p>

            {/* Stats Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                <Clock className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">5 Days</div>
                  <div className="text-xs text-muted-foreground">Intensive Training</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">14 Modules</div>
                  <div className="text-xs text-muted-foreground">Comprehensive Content</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                <Target className="w-5 h-5 text-pink-400" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">Hands-On</div>
                  <div className="text-xs text-muted-foreground">Real Projects</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 h-12 px-8 py-3 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Start Learning
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-2 border-purple-500/50 bg-background/50 backdrop-blur-sm hover:bg-purple-500/10 hover:border-purple-400 hover:scale-105 h-12 px-8 py-3"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  View Curriculum
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-muted-foreground/70 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" />
          </button>
        </div>
      </section>

      {/* Interactive Learning Path Diagram */}
      <section id="learning-diagram" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/15 to-pink-900/10"></div>

        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Interactive Learning Path
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Click on any module to begin. Prerequisites unlock as you progress through the curriculum.
            </p>
          </div>

          <LearningPathDiagram
            completedModules={[]}
            onModuleClick={(moduleId) => {
              const module = workshopDays.flatMap(d => [d.morning, d.afternoon]).find(m => m?.id.includes(moduleId));
              if (module?.path) {
                window.location.href = module.path;
              }
            }}
          />
        </div>
      </section>

      {/* Visual Learning Path Timeline */}
      <section id="timeline" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10"></div>

        <div className="container relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            5-Day Timeline
          </h2>

          {/* Timeline */}
          <div className="relative max-w-6xl mx-auto">
            {/* Connection Line */}
            <div className="absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/40 to-pink-500/20 hidden md:block"></div>

            {/* Timeline Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4">
              {workshopDays.map((day) => (
                <div
                  key={day.day}
                  className="relative"
                  onMouseEnter={() => setHoveredDay(day.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Day Node */}
                  <div className="flex flex-col items-center mb-4">
                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl transition-all duration-300 ${
                      hoveredDay === day.day
                        ? 'border-purple-500 bg-purple-500 text-white shadow-lg shadow-purple-500/50 scale-110'
                        : 'border-purple-500/30 bg-background text-purple-400'
                    }`}>
                      Day {day.day}
                    </div>
                    <div className="w-1 h-8 bg-gradient-to-b from-purple-500/50 to-transparent"></div>
                  </div>

                  {/* Day Info */}
                  <div className={`bg-background/60 backdrop-blur-xl border rounded-xl p-4 transition-all duration-300 ${
                    hoveredDay === day.day
                      ? 'border-purple-500/50 shadow-xl shadow-purple-500/20 scale-105'
                      : 'border-purple-500/20'
                  }`}>
                    <h3 className="font-semibold text-sm mb-3 text-center">{day.title}</h3>
                    <div className="space-y-2 text-xs">
                      {day.morning && (
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-1 text-blue-400 mb-1">
                            {day.morning.icon}
                            <span className="font-medium">AM</span>
                          </div>
                          <div className="text-muted-foreground">{day.morning.name}</div>
                        </div>
                      )}
                      {day.afternoon && (
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-1 text-purple-400 mb-1">
                            {day.afternoon.icon}
                            <span className="font-medium">PM</span>
                          </div>
                          <div className="text-muted-foreground">{day.afternoon.name}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modern Card Grid - Curriculum */}
      <section id="curriculum" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent"></div>

        <div className="container relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Complete Curriculum
          </h2>

          <div className="space-y-12 max-w-7xl mx-auto">
            {workshopDays.map((day) => (
              <div
                key={day.day}
                className="group relative bg-background/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
              >
                {/* Day Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg shadow-lg">
                    {day.day}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Day {day.day}</h3>
                    <p className="text-muted-foreground">{day.title}</p>
                  </div>
                </div>

                {/* Sessions Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Morning Session */}
                  {day.morning && (
                    <Link to={day.morning.path} className="block group/card">
                      <div className="h-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-blue-400">
                            {day.morning.icon}
                            <span className="font-semibold">Morning Session</span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Module {day.morning.moduleNumber}
                          </span>
                        </div>

                        <h4 className="text-lg font-semibold mb-2 group-hover/card:text-blue-400 transition-colors">
                          {day.morning.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          {day.morning.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs">
                          <div className={`px-2 py-1 rounded-md border ${getDifficultyColor(day.morning.difficulty)}`}>
                            {day.morning.difficulty}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {day.morning.duration}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-blue-500/20">
                          <Button variant="outline" size="sm" className="w-full border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start Module
                          </Button>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Afternoon Session */}
                  {day.afternoon && (
                    <Link to={day.afternoon.path} className="block group/card">
                      <div className="h-full bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-purple-400">
                            {day.afternoon.icon}
                            <span className="font-semibold">Afternoon Session</span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Module {day.afternoon.moduleNumber}
                          </span>
                        </div>

                        <h4 className="text-lg font-semibold mb-2 group-hover/card:text-purple-400 transition-colors">
                          {day.afternoon.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          {day.afternoon.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs">
                          <div className={`px-2 py-1 rounded-md border ${getDifficultyColor(day.afternoon.difficulty)}`}>
                            {day.afternoon.difficulty}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {day.afternoon.duration}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-purple-500/20">
                          <Button variant="outline" size="sm" className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start Module
                          </Button>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                {/* Progress Indicator (Visual Only) */}
                <div className="mt-6 pt-6 border-t border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12">
                        <svg className="transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeDashoffset="100" className="text-purple-500" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">0%</div>
                      </div>
                      <span className="text-sm text-muted-foreground">Not Started</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Workshops */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10"></div>

        <div className="container relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Additional Resources
          </h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {specialWorkshops.map((workshop) => (
              <Link key={workshop.id} to={workshop.path} className="block group">
                <div className="h-full bg-background/40 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    {workshop.icon}
                  </div>

                  <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-400 transition-colors">
                    {workshop.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {workshop.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs">
                    {workshop.difficulty && (
                      <div className={`px-2 py-1 rounded-md border ${getDifficultyColor(workshop.difficulty)}`}>
                        {workshop.difficulty}
                      </div>
                    )}
                    {workshop.duration && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {workshop.duration}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-500/20">
                    <Button variant="outline" size="sm" className="w-full border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Explore
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="container relative z-10">
          <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-purple-900/40 border border-purple-500/20">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 animate-gradient-shift bg-400%"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-white text-transparent bg-clip-text">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-lg text-muted-foreground/90 mb-10">
                Join our immersive residential training program and master AI-powered knowledge work
                in just 5 days. Limited spots available.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/residential-training"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-purple-900 font-semibold hover:shadow-xl hover:shadow-white/20 hover:scale-105 transition-all duration-300"
                >
                  <span>View Training Details</span>
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
              © {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
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
