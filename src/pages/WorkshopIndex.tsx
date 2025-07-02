import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, BookOpen, Code, Terminal, Cpu, Users, FileText } from 'lucide-react';

interface Workshop {
  id: string;
  name: string;
  path: string;
  moduleNumber?: string;
  description?: string;
  icon?: React.ReactNode;
}

interface WorkshopDay {
  day: number;
  title: string;
  morning?: Workshop;
  afternoon?: Workshop;
}

const WorkshopIndex = () => {
  const [openDays, setOpenDays] = useState<number[]>([]);

  // Workshop days structure
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
        icon: <Code className="w-5 h-5" />
      },
      afternoon: {
        id: "workshop-01-afternoon-visual-version-control",
        name: "Visual Tools & Version Control",
        path: "/workshops/workshop-01-afternoon-visual-version-control",
        moduleNumber: "06",
        description: "Master Git and GitHub with visual tools and AI assistance",
        icon: <FileText className="w-5 h-5" />
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
        icon: <Terminal className="w-5 h-5" />
      },
      afternoon: {
        id: "workshop-02-afternoon-vibe-coding",
        name: "Vibe Coding Mastery",
        path: "/workshops/workshop-02-afternoon-vibe-coding",
        moduleNumber: "08",
        description: "Master AI-assisted coding with pair programming techniques",
        icon: <Code className="w-5 h-5" />
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
        icon: <Cpu className="w-5 h-5" />
      },
      afternoon: {
        id: "workshop-03-afternoon-rag-system",
        name: "RAG System Implementation",
        path: "/workshops/workshop-03-afternoon-rag-system",
        moduleNumber: "10",
        description: "Build Retrieval-Augmented Generation systems for knowledge work",
        icon: <BookOpen className="w-5 h-5" />
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
        icon: <Users className="w-5 h-5" />
      },
      afternoon: {
        id: "workshop-04-afternoon-orchestration",
        name: "Agent Orchestration & Safety",
        path: "/workshops/workshop-04-afternoon-orchestration",
        moduleNumber: "12",
        description: "Coordinate multiple AI agents and implement safety measures",
        icon: <Users className="w-5 h-5" />
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
        icon: <Terminal className="w-5 h-5" />
      },
      afternoon: {
        id: "workshop-05-afternoon-publishing",
        name: "Professional Output Suite",
        path: "/workshops/workshop-05-afternoon-publishing",
        moduleNumber: "14",
        description: "Publish and distribute your AI-enhanced work professionally",
        icon: <FileText className="w-5 h-5" />
      }
    }
  ];

  // Special workshops
  const specialWorkshops: Workshop[] = [
    {
      id: "workshop-00-infra",
      name: "Infrastructure Setup",
      path: "/workshops/workshop-00-infra",
      description: "Essential setup for Git, VS Code, and AI tools",
      icon: <Terminal className="w-5 h-5" />
    },
    {
      id: "workshop-06-codex",
      name: "Claude Code CLI & Codex",
      path: "/workshops/workshop-06-codex",
      description: "Master Claude Code CLI and advanced AI coding tools",
      icon: <Code className="w-5 h-5" />
    },
    {
      id: "vscode-learning-pathway",
      name: "VS Code Learning Pathway",
      path: "/workshops/vscode-learning-pathway",
      description: "Complete learning path for VS Code mastery",
      icon: <BookOpen className="w-5 h-5" />
    }
  ];

  const toggleDay = (day: number) => {
    setOpenDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const WorkshopCard = ({ workshop }: { workshop: Workshop }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {workshop.icon}
          <span>
            {workshop.moduleNumber && `Module ${workshop.moduleNumber}: `}
            {workshop.name}
          </span>
        </CardTitle>
        {workshop.description && (
          <CardDescription>{workshop.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Link to={workshop.path}>
          <Button variant="outline" className="w-full">
            View Workshop
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Header />
      <main className="container pt-24 pb-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">AI-Powered Knowledge Work Workshops</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Comprehensive training program covering AI integration, automation, and modern development workflows. 
            Each day builds upon previous knowledge to create a complete AI-enhanced skillset.
          </p>
        </div>

        {/* 5-Day Program */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">5-Day Training Program</h2>
          <div className="space-y-4">
            {workshopDays.map((day) => (
              <Collapsible 
                key={day.day} 
                open={openDays.includes(day.day)}
                onOpenChange={() => toggleDay(day.day)}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between text-left p-6 h-auto"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">Day {day.day}: {day.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {day.morning && day.afternoon && 
                          `Morning: ${day.morning.name} | Afternoon: ${day.afternoon.name}`
                        }
                      </p>
                    </div>
                    {openDays.includes(day.day) ? (
                      <ChevronDown className="h-5 w-5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {day.morning && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Morning Session</h4>
                        <WorkshopCard workshop={day.morning} />
                      </div>
                    )}
                    {day.afternoon && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Afternoon Session</h4>
                        <WorkshopCard workshop={day.afternoon} />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </section>

        {/* Special Workshops */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Additional Workshops</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {specialWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

export default WorkshopIndex;