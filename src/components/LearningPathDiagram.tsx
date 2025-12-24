import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  GitBranch,
  Sparkles,
  Wand2,
  Database,
  Brain,
  Users,
  Zap,
  CheckCircle,
  Rocket
} from 'lucide-react';

interface ModuleNode {
  id: string;
  day: number;
  session: 'morning' | 'afternoon';
  title: string;
  description: string;
  icon: React.ElementType;
  x: number;
  y: number;
  prerequisites?: string[];
  link?: string;
}

interface Connection {
  from: string;
  to: string;
  pathData: string;
}

const modules: ModuleNode[] = [
  // Day 1
  {
    id: 'vscode-setup',
    day: 1,
    session: 'morning',
    title: 'VS Code Setup',
    description: 'Master IDE configuration and extensions for AI development',
    icon: Code2,
    x: 100,
    y: 150,
    link: '/workshop/day1/morning'
  },
  {
    id: 'version-control',
    day: 1,
    session: 'afternoon',
    title: 'Version Control',
    description: 'Git fundamentals and collaborative workflows',
    icon: GitBranch,
    x: 100,
    y: 300,
    prerequisites: ['vscode-setup'],
    link: '/workshop/day1/afternoon'
  },
  // Day 2
  {
    id: 'ai-apis',
    day: 2,
    session: 'morning',
    title: 'AI APIs',
    description: 'Integrate Claude, GPT, and other AI services',
    icon: Sparkles,
    x: 300,
    y: 150,
    prerequisites: ['vscode-setup'],
    link: '/workshop/day2/morning'
  },
  {
    id: 'vibe-coding',
    day: 2,
    session: 'afternoon',
    title: 'Vibe Coding',
    description: 'AI-assisted development workflows and patterns',
    icon: Wand2,
    x: 300,
    y: 300,
    prerequisites: ['ai-apis', 'version-control'],
    link: '/workshop/day2/afternoon'
  },
  // Day 3
  {
    id: 'local-ai',
    day: 3,
    session: 'morning',
    title: 'Local AI',
    description: 'Run models locally with Ollama and LM Studio',
    icon: Database,
    x: 500,
    y: 150,
    prerequisites: ['ai-apis'],
    link: '/workshop/day3/morning'
  },
  {
    id: 'rag-systems',
    day: 3,
    session: 'afternoon',
    title: 'RAG Systems',
    description: 'Build retrieval-augmented generation pipelines',
    icon: Brain,
    x: 500,
    y: 300,
    prerequisites: ['local-ai', 'vibe-coding'],
    link: '/workshop/day3/afternoon'
  },
  // Day 4
  {
    id: 'specialized-agents',
    day: 4,
    session: 'morning',
    title: 'Specialized Agents',
    description: 'Create domain-specific AI agents',
    icon: Users,
    x: 700,
    y: 150,
    prerequisites: ['rag-systems'],
    link: '/workshop/day4/morning'
  },
  {
    id: 'orchestration',
    day: 4,
    session: 'afternoon',
    title: 'Orchestration',
    description: 'Multi-agent systems and coordination',
    icon: Zap,
    x: 700,
    y: 300,
    prerequisites: ['specialized-agents'],
    link: '/workshop/day4/afternoon'
  },
  // Day 5
  {
    id: 'qa-automation',
    day: 5,
    session: 'morning',
    title: 'QA Automation',
    description: 'Automated testing and quality assurance',
    icon: CheckCircle,
    x: 900,
    y: 150,
    prerequisites: ['orchestration'],
    link: '/workshop/day5/morning'
  },
  {
    id: 'publishing',
    day: 5,
    session: 'afternoon',
    title: 'Professional Output',
    description: 'Deploy and share your AI projects',
    icon: Rocket,
    x: 900,
    y: 300,
    prerequisites: ['qa-automation'],
    link: '/workshop/day5/afternoon'
  }
];

const dayColors = {
  1: 'from-purple-500/20 to-purple-600/20',
  2: 'from-blue-500/20 to-blue-600/20',
  3: 'from-cyan-500/20 to-cyan-600/20',
  4: 'from-indigo-500/20 to-indigo-600/20',
  5: 'from-violet-500/20 to-violet-600/20'
};

const dayBorders = {
  1: 'border-purple-500/30',
  2: 'border-blue-500/30',
  3: 'border-cyan-500/30',
  4: 'border-indigo-500/30',
  5: 'border-violet-500/30'
};

export const LearningPathDiagram: React.FC<{
  completedModules?: string[];
  onModuleClick?: (moduleId: string) => void;
}> = ({ completedModules = [], onModuleClick }) => {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState('0 0 1000 450');
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedConnections, setAnimatedConnections] = useState<Set<string>>(new Set());

  // Generate connection paths
  const generateConnections = (): Connection[] => {
    const connections: Connection[] = [];

    modules.forEach(module => {
      if (module.prerequisites) {
        module.prerequisites.forEach(prereqId => {
          const fromModule = modules.find(m => m.id === prereqId);
          if (fromModule) {
            // Calculate bezier curve for smooth connections
            const dx = module.x - fromModule.x;
            const dy = module.y - fromModule.y;
            const controlX1 = fromModule.x + dx * 0.5;
            const controlY1 = fromModule.y;
            const controlX2 = fromModule.x - dx * 0.5;
            const controlY2 = module.y;

            const pathData = `M ${fromModule.x + 60} ${fromModule.y}
                             C ${controlX1} ${controlY1},
                               ${controlX2} ${controlY2},
                               ${module.x - 60} ${module.y}`;

            connections.push({
              from: fromModule.id,
              to: module.id,
              pathData
            });
          }
        });
      }
    });

    return connections;
  };

  const connections = generateConnections();

  // Animate connections on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      connections.forEach((_, index) => {
        setTimeout(() => {
          setAnimatedConnections(prev => new Set([...prev, `${index}`]));
        }, index * 150);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Responsive viewBox adjustment
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewBox('0 0 1000 900'); // Vertical layout for mobile
        setScale(0.8);
      } else if (window.innerWidth < 1024) {
        setViewBox('0 0 1000 600');
        setScale(0.9);
      } else {
        setViewBox('0 0 1000 450');
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleModuleClick = (module: ModuleNode) => {
    if (onModuleClick) {
      onModuleClick(module.id);
    } else if (module.link) {
      window.location.href = module.link;
    }
  };

  const isCompleted = (moduleId: string) => completedModules.includes(moduleId);
  const isUnlocked = (module: ModuleNode) => {
    if (!module.prerequisites?.length) return true;
    return module.prerequisites.every(prereq => completedModules.includes(prereq));
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 p-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 ring-2 ring-purple-500/50" />
          <span className="text-white/70">Completed</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-white/20 ring-2 ring-white/30" />
          <span className="text-white/70">Available</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-white/5 ring-2 ring-white/10" />
          <span className="text-white/70">Locked</span>
        </div>
      </div>

      {/* SVG Diagram */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-auto w-full cursor-grab active:cursor-grabbing"
        style={{ minHeight: '400px', maxHeight: '600px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="completedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <linearGradient id="availableGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>

          {/* Glow filters */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Day groupings */}
        {[1, 2, 3, 4, 5].map(day => (
          <g key={`day-${day}`}>
            <rect
              x={(day - 1) * 200 + 20}
              y={50}
              width={160}
              height={350}
              rx="12"
              fill="url(#availableGradient)"
              fillOpacity="0.05"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            <text
              x={(day - 1) * 200 + 100}
              y={80}
              textAnchor="middle"
              className="fill-white/50 text-xs font-semibold"
            >
              DAY {day}
            </text>
          </g>
        ))}

        {/* Connection paths */}
        {connections.map((connection, index) => {
          const isAnimated = animatedConnections.has(`${index}`);
          const fromCompleted = isCompleted(connection.from);
          const toCompleted = isCompleted(connection.to);
          const isActive = fromCompleted || toCompleted;

          return (
            <g key={`connection-${index}`}>
              <path
                d={connection.pathData}
                stroke={isActive ? 'url(#completedGradient)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isActive ? '3' : '2'}
                fill="none"
                markerEnd="url(#arrowhead)"
                strokeDasharray={isAnimated ? 'none' : '1000'}
                strokeDashoffset={isAnimated ? '0' : '1000'}
                className="transition-all duration-1000"
                filter={isActive ? 'url(#glow)' : undefined}
              />
            </g>
          );
        })}

        {/* Module nodes */}
        {modules.map((module) => {
          const completed = isCompleted(module.id);
          const unlocked = isUnlocked(module);
          const hovered = hoveredModule === module.id;
          const Icon = module.icon;

          return (
            <g
              key={module.id}
              transform={`translate(${module.x}, ${module.y})`}
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => unlocked && handleModuleClick(module)}
              className={unlocked ? 'cursor-pointer' : 'cursor-not-allowed'}
              style={{ transition: 'transform 0.2s' }}
            >
              {/* Node circle */}
              <circle
                r={hovered ? '52' : '48'}
                fill={completed ? 'url(#completedGradient)' : unlocked ? 'url(#availableGradient)' : 'rgba(255,255,255,0.05)'}
                fillOpacity={completed ? '0.9' : unlocked ? '0.2' : '0.1'}
                stroke={completed ? '#a855f7' : unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={hovered ? '3' : '2'}
                filter={completed || hovered ? 'url(#glow)' : undefined}
                className="transition-all duration-200"
              />

              {/* Icon */}
              <g transform="translate(-12, -12)">
                <foreignObject width="24" height="24">
                  <Icon
                    className={`h-6 w-6 ${
                      completed ? 'text-purple-300' :
                      unlocked ? 'text-white' :
                      'text-white/30'
                    }`}
                  />
                </foreignObject>
              </g>

              {/* Completion checkmark */}
              {completed && (
                <circle r="16" fill="#10b981" cx="30" cy="-30">
                  <animate
                    attributeName="r"
                    from="0"
                    to="16"
                    dur="0.3s"
                    fill="freeze"
                  />
                </circle>
              )}
              {completed && (
                <g transform="translate(30, -30)">
                  <path
                    d="M -4 0 L -1 3 L 4 -3"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Tooltip on hover */}
              {hovered && (
                <g transform="translate(0, -80)">
                  <rect
                    x="-80"
                    y="-30"
                    width="160"
                    height="50"
                    rx="8"
                    fill="rgba(0,0,0,0.9)"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                  />
                  <text
                    y="-15"
                    textAnchor="middle"
                    className="fill-white text-xs font-semibold"
                  >
                    {module.title}
                  </text>
                  <text
                    y="0"
                    textAnchor="middle"
                    className="fill-white/70 text-[10px]"
                  >
                    {module.description.substring(0, 40)}...
                  </text>
                </g>
              )}

              {/* Module label */}
              <text
                y="70"
                textAnchor="middle"
                className={`text-xs font-medium ${
                  completed ? 'fill-purple-300' :
                  unlocked ? 'fill-white' :
                  'fill-white/30'
                }`}
              >
                {module.title}
              </text>
              <text
                y="85"
                textAnchor="middle"
                className="fill-white/50 text-[10px]"
              >
                {module.session === 'morning' ? 'Morning' : 'Afternoon'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Mobile controls */}
      <div className="flex items-center justify-between border-t border-white/10 p-4 md:hidden">
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Zoom Out
        </button>
        <button
          onClick={() => setOffset({ x: 0, y: 0 })}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Reset
        </button>
        <button
          onClick={() => setScale(s => Math.min(2, s + 0.1))}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Zoom In
        </button>
      </div>
    </div>
  );
};

export default LearningPathDiagram;
