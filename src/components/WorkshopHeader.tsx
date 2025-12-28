import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Clock,
  BarChart3,
  Cpu,
  Code,
  Palette,
  Headphones,
  Settings,
  Layers,
  ChevronRight,
} from 'lucide-react';

export type WorkshopCategory =
  | 'ai-ml'
  | 'creative-tech'
  | 'xr-vr'
  | 'audio'
  | 'engineering'
  | 'foundation';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface WorkshopHeaderProps {
  title: string;
  workshopId: string;
  category?: WorkshopCategory;
  currentChapter?: number;
  totalChapters?: number;
  currentChapterTitle?: string;
  moduleCount?: number;
  estimatedTime?: string;
  difficulty?: DifficultyLevel;
  description?: string;
}

interface CategoryConfig {
  gradient: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  icon: React.ReactNode;
  label: string;
  accentColor: string;
  textGradient: string;
}

const categoryConfigs: Record<WorkshopCategory, CategoryConfig> = {
  'ai-ml': {
    gradient: 'from-blue-600 via-purple-600 to-violet-600',
    gradientFrom: 'from-blue-500/30',
    gradientVia: 'via-purple-500/30',
    gradientTo: 'to-violet-500/30',
    icon: <Cpu className="w-5 h-5" />,
    label: 'AI / Machine Learning',
    accentColor: 'text-purple-400',
    textGradient: 'from-blue-400 via-purple-400 to-violet-400',
  },
  'creative-tech': {
    gradient: 'from-pink-600 via-rose-500 to-orange-500',
    gradientFrom: 'from-pink-500/30',
    gradientVia: 'via-rose-500/30',
    gradientTo: 'to-orange-500/30',
    icon: <Palette className="w-5 h-5" />,
    label: 'Creative Technology',
    accentColor: 'text-pink-400',
    textGradient: 'from-pink-400 via-rose-400 to-orange-400',
  },
  'xr-vr': {
    gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    gradientFrom: 'from-cyan-500/30',
    gradientVia: 'via-teal-500/30',
    gradientTo: 'to-emerald-500/30',
    icon: <Layers className="w-5 h-5" />,
    label: 'XR / Virtual Reality',
    accentColor: 'text-teal-400',
    textGradient: 'from-cyan-400 via-teal-400 to-emerald-400',
  },
  audio: {
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    gradientFrom: 'from-green-500/30',
    gradientVia: 'via-emerald-500/30',
    gradientTo: 'to-teal-500/30',
    icon: <Headphones className="w-5 h-5" />,
    label: 'Audio Engineering',
    accentColor: 'text-emerald-400',
    textGradient: 'from-green-400 via-emerald-400 to-teal-400',
  },
  engineering: {
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    gradientFrom: 'from-amber-500/30',
    gradientVia: 'via-orange-500/30',
    gradientTo: 'to-red-500/30',
    icon: <Settings className="w-5 h-5" />,
    label: 'Software Engineering',
    accentColor: 'text-orange-400',
    textGradient: 'from-amber-400 via-orange-400 to-red-400',
  },
  foundation: {
    gradient: 'from-slate-500 via-zinc-500 to-neutral-500',
    gradientFrom: 'from-slate-500/30',
    gradientVia: 'via-zinc-500/30',
    gradientTo: 'to-neutral-500/30',
    icon: <BookOpen className="w-5 h-5" />,
    label: 'Foundations',
    accentColor: 'text-slate-400',
    textGradient: 'from-slate-400 via-zinc-400 to-neutral-400',
  },
};

const difficultyConfig: Record<DifficultyLevel, { color: string; bgColor: string; borderColor: string }> = {
  Beginner: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  Intermediate: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  Advanced: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  Expert: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

function detectCategoryFromWorkshopId(workshopId: string): WorkshopCategory {
  const lowerCaseId = workshopId.toLowerCase();

  if (
    lowerCaseId.includes('ai') ||
    lowerCaseId.includes('ml') ||
    lowerCaseId.includes('agent') ||
    lowerCaseId.includes('rag') ||
    lowerCaseId.includes('llm') ||
    lowerCaseId.includes('neural') ||
    lowerCaseId.includes('model')
  ) {
    return 'ai-ml';
  }

  if (
    lowerCaseId.includes('creative') ||
    lowerCaseId.includes('design') ||
    lowerCaseId.includes('art') ||
    lowerCaseId.includes('visual')
  ) {
    return 'creative-tech';
  }

  if (
    lowerCaseId.includes('xr') ||
    lowerCaseId.includes('vr') ||
    lowerCaseId.includes('ar') ||
    lowerCaseId.includes('metaverse') ||
    lowerCaseId.includes('3d')
  ) {
    return 'xr-vr';
  }

  if (
    lowerCaseId.includes('audio') ||
    lowerCaseId.includes('sound') ||
    lowerCaseId.includes('music') ||
    lowerCaseId.includes('podcast')
  ) {
    return 'audio';
  }

  if (
    lowerCaseId.includes('code') ||
    lowerCaseId.includes('codex') ||
    lowerCaseId.includes('vscode') ||
    lowerCaseId.includes('api') ||
    lowerCaseId.includes('git') ||
    lowerCaseId.includes('dev') ||
    lowerCaseId.includes('engineer') ||
    lowerCaseId.includes('qa') ||
    lowerCaseId.includes('automation') ||
    lowerCaseId.includes('orchestration')
  ) {
    return 'engineering';
  }

  if (
    lowerCaseId.includes('intro') ||
    lowerCaseId.includes('basic') ||
    lowerCaseId.includes('foundation') ||
    lowerCaseId.includes('setup') ||
    lowerCaseId.includes('infra') ||
    lowerCaseId.includes('pathway')
  ) {
    return 'foundation';
  }

  return 'ai-ml';
}

export const WorkshopHeader = ({
  title,
  workshopId,
  category,
  currentChapter = 1,
  totalChapters = 1,
  currentChapterTitle,
  moduleCount,
  estimatedTime,
  difficulty,
  description,
}: WorkshopHeaderProps) => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const resolvedCategory = useMemo(
    () => category || detectCategoryFromWorkshopId(workshopId),
    [category, workshopId]
  );

  const config = categoryConfigs[resolvedCategory];
  const difficultyStyle = difficulty ? difficultyConfig[difficulty] : null;

  const progressPercentage = useMemo(
    () => Math.round((currentChapter / totalChapters) * 100),
    [currentChapter, totalChapters]
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const parallaxOffset = Math.min(scrollY * 0.3, 100);
  const opacityFade = Math.max(1 - scrollY / 400, 0.3);

  return (
    <header
      ref={headerRef}
      className="relative overflow-hidden"
      style={{ minHeight: '320px' }}
    >
      {/* Gradient Background with Parallax */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br',
          config.gradientFrom,
          config.gradientVia,
          config.gradientTo
        )}
        style={{
          transform: `translateY(${parallaxOffset}px)`,
          opacity: opacityFade,
        }}
      >
        {/* Animated gradient orbs */}
        <div
          className={cn(
            'absolute top-0 -left-20 w-96 h-96 rounded-full blur-3xl opacity-40 animate-float',
            `bg-gradient-to-br ${config.gradient}`
          )}
        />
        <div
          className={cn(
            'absolute bottom-0 -right-20 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30 animate-float',
            `bg-gradient-to-br ${config.gradient}`
          )}
          style={{ animationDelay: '1s' }}
        />
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 animate-float',
            `bg-gradient-to-br ${config.gradient}`
          )}
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Grid overlay pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: `translateY(${parallaxOffset * 0.5}px)`,
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 container pt-24 pb-8">
        {/* Breadcrumb Navigation */}
        <div
          className={cn(
            'mb-6 transition-all duration-500 transform',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <Breadcrumb>
            <BreadcrumbList className="text-white/70">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4 text-white/50" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/workshops" className="hover:text-white transition-colors">
                    Workshops
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4 text-white/50" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-medium">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Category Badge */}
        <div
          className={cn(
            'mb-4 transition-all duration-500 delay-100 transform',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full',
              'bg-white/10 backdrop-blur-md border border-white/20'
            )}
          >
            <span className={config.accentColor}>{config.icon}</span>
            <span className="text-sm font-medium text-white/90">{config.label}</span>
          </div>
        </div>

        {/* Animated Workshop Title */}
        <h1
          className={cn(
            'text-4xl md:text-5xl lg:text-6xl font-bold mb-4',
            'transition-all duration-700 delay-200 transform',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          )}
        >
          <span
            className={cn(
              'bg-gradient-to-r bg-clip-text text-transparent animate-gradient-shift bg-400%',
              config.textGradient
            )}
          >
            {title}
          </span>
        </h1>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-lg text-white/80 max-w-3xl mb-6',
              'transition-all duration-700 delay-300 transform',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            {description}
          </p>
        )}

        {/* Badges Row */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-3 mb-6',
            'transition-all duration-700 delay-400 transform',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          {/* Module Count Badge */}
          {moduleCount !== undefined && (
            <Badge
              variant="outline"
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              {moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}
            </Badge>
          )}

          {/* Estimated Time Badge */}
          {estimatedTime && (
            <Badge
              variant="outline"
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {estimatedTime}
            </Badge>
          )}

          {/* Difficulty Badge */}
          {difficulty && difficultyStyle && (
            <Badge
              variant="outline"
              className={cn(
                difficultyStyle.bgColor,
                difficultyStyle.borderColor,
                difficultyStyle.color,
                'backdrop-blur-sm'
              )}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              {difficulty}
            </Badge>
          )}
        </div>

        {/* Progress Indicator */}
        {totalChapters > 1 && (
          <div
            className={cn(
              'max-w-md',
              'transition-all duration-700 delay-500 transform',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="flex items-center justify-between text-sm text-white/70 mb-2">
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                {currentChapterTitle ? (
                  <span>
                    Chapter {currentChapter}: {currentChapterTitle}
                  </span>
                ) : (
                  <span>
                    Chapter {currentChapter} of {totalChapters}
                  </span>
                )}
              </span>
              <span className="font-medium text-white">{progressPercentage}%</span>
            </div>
            <div className="relative">
              <Progress
                value={progressPercentage}
                className="h-2 bg-white/20"
              />
              {/* Glow effect on progress bar */}
              <div
                className={cn(
                  'absolute top-0 left-0 h-2 rounded-full blur-sm',
                  `bg-gradient-to-r ${config.gradient}`
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {/* Chapter markers */}
            <div className="relative mt-1 h-1">
              {Array.from({ length: totalChapters }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'absolute w-1.5 h-1.5 rounded-full -top-0.5 transform -translate-x-1/2 transition-all duration-300',
                    index < currentChapter
                      ? 'bg-white scale-100'
                      : 'bg-white/30 scale-75'
                  )}
                  style={{
                    left: `${((index + 1) / totalChapters) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </header>
  );
};

export default WorkshopHeader;
