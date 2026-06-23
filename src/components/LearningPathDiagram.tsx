import React, { useState, useEffect } from 'react';

interface LearningPathDiagramProps {
  completedPhaseIds: string[];
  onPhaseClick?: (phaseId: string) => void;
}

interface PhaseNode {
  id: string;
  number: number;
  title: string;
  desktop: { x: number; y: number };
  mobile: { x: number; y: number };
}

const PHASE_NODES: PhaseNode[] = [
  { id: 'foundations',       number: 1, title: 'Foundations',     desktop: { x: 150, y: 110 }, mobile: { x: 200, y: 80 } },
  { id: 'visual-docs',      number: 2, title: 'Visual Docs',    desktop: { x: 500, y: 110 }, mobile: { x: 200, y: 220 } },
  { id: 'ai-apis',          number: 3, title: 'AI APIs',        desktop: { x: 850, y: 110 }, mobile: { x: 200, y: 360 } },
  { id: 'claude-code',      number: 4, title: 'Claude Code',    desktop: { x: 850, y: 290 }, mobile: { x: 200, y: 500 } },
  { id: 'local-ai-rag',     number: 5, title: 'Local AI & RAG', desktop: { x: 500, y: 290 }, mobile: { x: 200, y: 640 } },
  { id: 'docker',           number: 6, title: 'Docker',         desktop: { x: 150, y: 290 }, mobile: { x: 200, y: 780 } },
  { id: 'agents',           number: 7, title: 'AI Agents',      desktop: { x: 150, y: 470 }, mobile: { x: 200, y: 920 } },
  { id: 'coding-ecosystem', number: 8, title: 'Ecosystem',      desktop: { x: 500, y: 470 }, mobile: { x: 200, y: 1060 } },
  { id: 'qa-publishing',    number: 9, title: 'QA & Deploy',    desktop: { x: 850, y: 470 }, mobile: { x: 200, y: 1200 } },
];

const DESKTOP_CONNECTIONS = [
  { from: 0, to: 1, path: 'M 195 110 C 300 85, 400 85, 455 110' },
  { from: 1, to: 2, path: 'M 545 110 C 650 85, 750 85, 805 110' },
  { from: 2, to: 3, path: 'M 850 155 C 875 200, 875 245, 850 245' },
  { from: 3, to: 4, path: 'M 805 290 C 700 265, 600 265, 545 290' },
  { from: 4, to: 5, path: 'M 455 290 C 350 265, 250 265, 195 290' },
  { from: 5, to: 6, path: 'M 150 335 C 125 380, 125 425, 150 425' },
  { from: 6, to: 7, path: 'M 195 470 C 300 445, 400 445, 455 470' },
  { from: 7, to: 8, path: 'M 545 470 C 650 445, 750 445, 805 470' },
];

const MOBILE_CONNECTIONS = PHASE_NODES.slice(0, -1).map((_, i) => ({
  from: i,
  to: i + 1,
  path: `M 200 ${125 + i * 140} L 200 ${175 + i * 140}`,
}));

const NODE_R = 42;

export const LearningPathDiagram: React.FC<LearningPathDiagramProps> = ({
  completedPhaseIds = [],
  onPhaseClick,
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [animatedConnections, setAnimatedConnections] = useState<Set<number>>(new Set());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const conns = isMobile ? MOBILE_CONNECTIONS : DESKTOP_CONNECTIONS;
    const timer = setTimeout(() => {
      conns.forEach((_, i) => {
        setTimeout(() => {
          setAnimatedConnections(prev => new Set([...prev, i]));
        }, i * 120);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const connections = isMobile ? MOBILE_CONNECTIONS : DESKTOP_CONNECTIONS;
  const viewBox = isMobile ? '0 0 400 1340' : '0 0 1000 580';
  const isComplete = (id: string) => completedPhaseIds.includes(id);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 p-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 ring-2 ring-purple-500/50" />
          <span className="text-white/70">Completed</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-white/20 ring-2 ring-white/30" />
          <span className="text-white/70">Available</span>
        </div>
      </div>

      <svg
        viewBox={viewBox}
        className="h-auto w-full"
        style={{ minHeight: isMobile ? '600px' : '400px', maxHeight: isMobile ? '800px' : '550px' }}
      >
        <defs>
          <linearGradient id="lpd-completed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="lpd-available" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <marker id="lpd-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>
          <filter id="lpd-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {connections.map((conn, i) => {
          const animated = animatedConnections.has(i);
          const fromDone = isComplete(PHASE_NODES[conn.from].id);
          const toDone = isComplete(PHASE_NODES[conn.to].id);
          const active = fromDone || toDone;
          return (
            <path
              key={`conn-${i}`}
              d={conn.path}
              stroke={active ? 'url(#lpd-completed)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={active ? 3 : 2}
              fill="none"
              markerEnd="url(#lpd-arrow)"
              strokeDasharray={animated ? 'none' : '1000'}
              strokeDashoffset={animated ? '0' : '1000'}
              className="transition-all duration-700"
              filter={active ? 'url(#lpd-glow)' : undefined}
            />
          );
        })}

        {PHASE_NODES.map((node) => {
          const pos = isMobile ? node.mobile : node.desktop;
          const completed = isComplete(node.id);
          const hovered = hoveredPhase === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={() => setHoveredPhase(node.id)}
              onMouseLeave={() => setHoveredPhase(null)}
              onClick={() => onPhaseClick?.(node.id)}
              className="cursor-pointer"
            >
              <circle
                r={hovered ? NODE_R + 4 : NODE_R}
                fill={completed ? 'url(#lpd-completed)' : 'url(#lpd-available)'}
                fillOpacity={completed ? 0.9 : 0.2}
                stroke={completed ? '#a855f7' : 'rgba(255,255,255,0.3)'}
                strokeWidth={hovered ? 3 : 2}
                filter={completed || hovered ? 'url(#lpd-glow)' : undefined}
                className="transition-all duration-200"
              />

              <text
                y="6"
                textAnchor="middle"
                className={`text-2xl font-black select-none ${completed ? 'fill-white' : 'fill-white/80'}`}
                style={{ pointerEvents: 'none' }}
              >
                {node.number}
              </text>

              {completed && (
                <>
                  <circle r="12" fill="#10b981" cx="28" cy="-28" />
                  <g transform="translate(28, -28)">
                    <path d="M -3 0 L -1 2 L 3 -2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </>
              )}

              {hovered && (
                <g transform="translate(0, -68)">
                  <rect x="-70" y="-18" width="140" height="30" rx="6" fill="rgba(0,0,0,0.9)" stroke="rgba(255,255,255,0.2)" />
                  <text y="0" textAnchor="middle" className="fill-white text-xs font-semibold" style={{ pointerEvents: 'none' }}>
                    Phase {node.number}: {node.title}
                  </text>
                </g>
              )}

              <text
                y={NODE_R + 18}
                textAnchor="middle"
                className={`text-xs font-medium select-none ${completed ? 'fill-purple-300' : 'fill-white/70'}`}
                style={{ pointerEvents: 'none' }}
              >
                {node.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default LearningPathDiagram;
