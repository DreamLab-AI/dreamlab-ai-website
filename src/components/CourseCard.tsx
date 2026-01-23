import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Star,
} from 'lucide-react';

// Category configuration with colors and gradients
const categoryConfig: Record<string, {
  gradient: string;
  badge: string;
  glow: string;
  icon: string;
}> = {
  'AI/ML': {
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    glow: 'shadow-violet-500/30',
    icon: 'text-violet-400',
  },
  'Creative Tech': {
    gradient: 'from-pink-600 via-rose-600 to-red-600',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    glow: 'shadow-pink-500/30',
    icon: 'text-pink-400',
  },
  'XR/VR': {
    gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    glow: 'shadow-cyan-500/30',
    icon: 'text-cyan-400',
  },
  'Audio': {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-emerald-500/30',
    icon: 'text-emerald-400',
  },
  'Engineering': {
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    glow: 'shadow-amber-500/30',
    icon: 'text-amber-400',
  },
  'Emerging Tech': {
    gradient: 'from-fuchsia-600 via-purple-600 to-violet-600',
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    glow: 'shadow-fuchsia-500/30',
    icon: 'text-fuchsia-400',
  },
  'Web3 Tech': {
    gradient: 'from-orange-600 via-amber-600 to-yellow-600',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    glow: 'shadow-orange-500/30',
    icon: 'text-orange-400',
  },
  'Enterprise': {
    gradient: 'from-slate-600 via-zinc-600 to-neutral-600',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    glow: 'shadow-slate-500/30',
    icon: 'text-slate-400',
  },
  'Foundation': {
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    glow: 'shadow-blue-500/30',
    icon: 'text-blue-400',
  },
};

// Instructor parsing and avatar generation
interface Instructor {
  name: string;
  title?: string;
  initials: string;
}

function parseInstructors(instructorString: string): Instructor[] {
  return instructorString.split(',').map((name) => {
    const trimmed = name.trim();
    const match = trimmed.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    const fullName = match?.[1]?.trim() || trimmed;
    const title = match?.[2]?.trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : nameParts[0]?.substring(0, 2) || 'XX';
    return { name: fullName, title, initials: initials.toUpperCase() };
  });
}

// Hero images mapped by category
// Course-specific AI-generated hero images (FLUX2 via ComfyUI, converted to WebP)
const courseHeroImages: Record<string, string> = {
  'ai-commander-week': '/images/heroes/ai-commander-week.webp',
  'virtual-production-master': '/images/heroes/virtual-production-master.webp',
  'xr-innovation-intensive': '/images/heroes/xr-innovation-intensive.webp',
  'digital-human-mocap': '/images/heroes/digital-human-mocap.webp',
  'spatial-audio-production': '/images/heroes/spatial-audio-production.webp',
  'engineering-visualisation': '/images/heroes/engineering-visualisation.webp',
  'neural-content-creation': '/images/heroes/neural-content-creation.webp',
  'cyber-infrastructure': '/images/heroes/cyber-infrastructure.webp',
  'decentralised-agents': '/images/heroes/decentralised-agents.webp',
  'creative-technology-fundamentals': '/images/heroes/creative-technology-fundamentals.webp',
  'corporate-immersive': '/images/heroes/corporate-immersive.webp',
  'visionflow-power-user': '/images/heroes/visionflow-power-user.webp',
};

// Fallback category images (WebP for modern browsers)
const categoryImages: Record<string, string> = {
  'AI/ML': '/data/media/labview2.webp',
  'Creative Tech': '/data/media/labview3.webp',
  'XR/VR': '/data/media/bedroom.jpeg',
  'Audio': '/data/media/wine.webp',
  'Engineering': '/data/media/view.jpeg',
  'Emerging Tech': '/data/media/view2.jpeg',
  'Web3 Tech': '/data/media/view3.webp',
  'Enterprise': '/data/media/fairfield-front.jpg',
  'Foundation': '/data/media/aerial.jpeg',
};

export interface CourseCardProps {
  id: string;
  title: string;
  duration: string;
  pricePerPerson: string;
  teamPrice: string;
  teamSaving: string;
  capacity: string;
  category: string;
  description: string;
  modules: string[];
  instructors: string;
  featured?: boolean;
  partnership?: string;
  index?: number;
}

export function CourseCard({
  id,
  title,
  duration,
  pricePerPerson,
  teamPrice,
  teamSaving,
  capacity,
  category,
  description,
  modules,
  instructors,
  featured = false,
  partnership,
  index = 0,
}: CourseCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);

  const config = categoryConfig[category] || categoryConfig['Foundation'];
  const parsedInstructors = parseInstructors(instructors);
  // Use course-specific hero image if available, fall back to category image
  const heroImage = courseHeroImages[id] || categoryImages[category] || '/data/media/aerial.jpeg';

  // Calculate animation delay based on index
  const animationDelay = `${index * 100}ms`;

  return (
    <div
      className={cn(
        "group relative h-full",
        "opacity-0 animate-slide-up",
        "perspective-1000"
      )}
      style={{
        animationDelay,
        animationFillMode: 'forwards',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Card Container with 3D transform */}
      <div
        className={cn(
          "relative h-full flex flex-col",
          "bg-card/80 backdrop-blur-xl",
          "border border-border/50 rounded-2xl overflow-hidden",
          "transition-all duration-500 ease-out",
          "transform-gpu",
          isHovered && "scale-[1.02] -translate-y-2",
          isHovered && `shadow-2xl ${config.glow}`,
          featured && "border-primary/50 ring-1 ring-primary/20"
        )}
        style={{
          transform: isHovered
            ? 'perspective(1000px) rotateX(2deg) rotateY(-1deg) translateY(-8px)'
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        }}
      >
        {/* Featured Badge with Glow Effect */}
        {featured && (
          <div className="absolute top-4 right-4 z-20">
            <div className={cn(
              "relative px-3 py-1.5 rounded-full",
              "bg-gradient-to-r from-amber-500/90 to-orange-500/90",
              "text-white text-xs font-bold uppercase tracking-wider",
              "shadow-lg shadow-amber-500/50",
              "animate-glow-pulse"
            )}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 blur-md opacity-50 animate-pulse" />
              <div className="relative flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>Featured</span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Image Section with Gradient Overlay */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={heroImage}
            alt={`${title} training environment`}
            className={cn(
              "w-full h-full object-cover",
              "transition-transform duration-700 ease-out",
              isHovered && "scale-110"
            )}
          />
          {/* Gradient Overlay */}
          <div className={cn(
            "absolute inset-0",
            `bg-gradient-to-t ${config.gradient} opacity-60`,
            "mix-blend-multiply"
          )} />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

          {/* Category Badge positioned on image */}
          <div className="absolute top-4 left-4">
            <span className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold",
              "border backdrop-blur-sm",
              config.badge
            )}>
              {category}
            </span>
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              "bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium"
            )}>
              <Clock className="w-3 h-3" />
              <span>{duration}</span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              "bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium"
            )}>
              <Users className="w-3 h-3" />
              <span>{capacity}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-1 p-5">
          {/* Title */}
          <h3 className={cn(
            "text-xl font-bold text-foreground mb-2",
            "transition-colors duration-300",
            isHovered && "text-primary"
          )}>
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {description}
          </p>

          {/* Pricing Section */}
          <div className={cn(
            "p-4 rounded-xl mb-4",
            "bg-gradient-to-br from-secondary/80 to-secondary/40",
            "border border-border/30"
          )}>
            {/* Per Person Price */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Per person</span>
              <span className="text-lg font-bold text-foreground">{pricePerPerson}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 my-2" />

            {/* Team Price with Savings */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Team of 4</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full mt-1 w-fit",
                  "bg-green-500/20 text-green-400 border border-green-500/30"
                )}>
                  {teamSaving}
                </span>
              </div>
              <span className={cn(
                "text-xl font-bold",
                "bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent"
              )}>
                {teamPrice}
              </span>
            </div>

            {/* Included Note */}
            <p className="text-[10px] text-muted-foreground/70 text-center mt-3 italic">
              Includes full-board accommodation & meals
            </p>
          </div>

          {/* Instructor Avatars with Tooltips */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className={cn("w-4 h-4", config.icon)} />
              <span className="text-xs text-muted-foreground mr-1">Instructors:</span>
              <div className="flex -space-x-2">
                {parsedInstructors.slice(0, 4).map((instructor, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          "text-xs font-bold text-white cursor-pointer",
                          "border-2 border-card",
                          "transition-all duration-300 hover:scale-110 hover:z-10",
                          `bg-gradient-to-br ${config.gradient}`
                        )}
                        style={{ zIndex: parsedInstructors.length - idx }}
                      >
                        {instructor.initials}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-sm font-semibold">{instructor.name}</div>
                      {instructor.title && (
                        <div className="text-xs text-muted-foreground">{instructor.title}</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {parsedInstructors.length > 4 && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "text-xs font-bold bg-muted text-muted-foreground",
                    "border-2 border-card"
                  )}>
                    +{parsedInstructors.length - 4}
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>

          {/* Module Accordion */}
          <Accordion
            type="single"
            collapsible
            value={isModulesOpen ? "modules" : ""}
            onValueChange={(val) => setIsModulesOpen(val === "modules")}
            className="mb-4"
          >
            <AccordionItem value="modules" className="border-border/30">
              <AccordionTrigger className={cn(
                "text-sm font-medium py-3 hover:no-underline",
                "transition-colors",
                isModulesOpen && "text-primary"
              )}>
                <span className="flex items-center gap-2">
                  <Sparkles className={cn("w-4 h-4", config.icon)} />
                  View {modules.length} Modules
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pt-2">
                  {modules.map((module, idx) => (
                    <li
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 text-sm text-muted-foreground",
                        "opacity-0 animate-stagger-fade"
                      )}
                      style={{
                        animationDelay: `${idx * 50}ms`,
                        animationFillMode: 'forwards',
                      }}
                    >
                      <CheckCircle2 className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        config.icon
                      )} />
                      <span>{module}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Partnership Note */}
          {partnership && (
            <p className="text-[10px] text-muted-foreground/60 italic mb-4 px-2">
              {partnership}
            </p>
          )}

          {/* Spacer to push CTA to bottom */}
          <div className="flex-1" />

          {/* CTA Button with Micro-interactions */}
          <Button
            className={cn(
              "w-full group/btn relative overflow-hidden",
              "transition-all duration-300",
              featured
                ? `bg-gradient-to-r ${config.gradient} hover:shadow-lg ${config.glow}`
                : "bg-secondary hover:bg-secondary/80"
            )}
            variant={featured ? "default" : "secondary"}
            onClick={() => navigate('/contact')}
          >
            {/* Button Shine Effect */}
            <div className={cn(
              "absolute inset-0 translate-x-[-100%]",
              "bg-gradient-to-r from-transparent via-white/20 to-transparent",
              "group-hover/btn:translate-x-[100%] transition-transform duration-700"
            )} />

            <span className="relative flex items-center justify-center gap-2">
              <span>Book This Programme</span>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform duration-300",
                "group-hover/btn:translate-x-1"
              )} />
            </span>
          </Button>
        </div>

        {/* Hover Glow Effect */}
        <div className={cn(
          "absolute -inset-px rounded-2xl pointer-events-none",
          "opacity-0 transition-opacity duration-500",
          isHovered && "opacity-100",
          `bg-gradient-to-br ${config.gradient}`
        )} style={{ filter: 'blur(20px)', zIndex: -1 }} />
      </div>
    </div>
  );
}

export default CourseCard;
