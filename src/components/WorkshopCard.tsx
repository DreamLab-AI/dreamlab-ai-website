import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkshopCardProps {
  id: string;
  title: string;
  description: string;
  moduleNumber: string;
  icon: React.ReactNode;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  category: string;
  progress?: number;
  isCompleted?: boolean;
  href: string;
  delay?: number;
}

const difficultyConfig = {
  beginner: {
    label: 'Beginner',
    color: 'text-green-500 bg-green-500/10 border-green-500/20',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  },
  advanced: {
    label: 'Advanced',
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
};

export function WorkshopCard({
  id,
  title,
  description,
  moduleNumber,
  icon,
  difficulty,
  duration,
  category,
  progress = 0,
  isCompleted = false,
  href,
  delay = 0,
}: WorkshopCardProps) {
  const difficultyStyle = difficultyConfig[difficulty];
  const progressPercent = Math.min(100, Math.max(0, progress));

  const getButtonText = () => {
    if (isCompleted) return 'Review Module';
    if (progressPercent > 0) return 'Continue';
    return 'Start Module';
  };

  return (
    <Link
      to={href}
      className={cn(
        "group relative block h-full",
        "animate-slide-up opacity-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
      aria-label={`${title} - ${difficultyStyle.label} - ${progressPercent}% complete`}
    >
      {/* Card Container */}
      <div
        className={cn(
          "relative h-full flex flex-col",
          "bg-background/40 backdrop-blur-xl",
          "border border-border/50",
          "rounded-2xl overflow-hidden",
          "transition-all duration-300 ease-out",
          "group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-purple-500/20",
          "group-hover:border-purple-500/50",
          isCompleted && "border-green-500/50 bg-green-500/5"
        )}
      >
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-blue-500/0 to-purple-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />

        {/* Header Section */}
        <div className="relative p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            {/* Icon with Module Number */}
            <div className="relative">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br from-purple-500/20 to-blue-500/20",
                "border border-purple-500/30",
                "transition-transform duration-300",
                "group-hover:scale-110 group-hover:rotate-3"
              )}>
                <div className="text-purple-400 group-hover:animate-bounce">
                  {icon}
                </div>
              </div>
              <div className={cn(
                "absolute -top-2 -right-2",
                "px-2 py-0.5 rounded-full text-xs font-bold",
                "bg-purple-500 text-white",
                "shadow-lg shadow-purple-500/50"
              )}>
                {moduleNumber}
              </div>
            </div>

            {/* Completion Badge */}
            {isCompleted && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full",
                "bg-green-500/20 border border-green-500/30",
                "text-green-500 text-xs font-semibold"
              )}>
                <Check className="w-3 h-3" />
                <span>Completed</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-purple-400 transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Difficulty */}
            <span className={cn(
              "px-2 py-1 rounded-md text-xs font-medium border",
              difficultyStyle.color
            )}>
              {difficultyStyle.label}
            </span>

            {/* Duration */}
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground border border-border/30">
              {duration}
            </span>

            {/* Category */}
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {category}
            </span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 pb-4 mt-auto">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Progress
              </span>
              <span className="text-xs font-bold text-foreground">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isCompleted ? "bg-green-500" : "bg-gradient-to-r from-purple-500 to-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Module progress: ${progressPercent}%`}
              />
            </div>
          </div>

          {/* CTA Button */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl",
            "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
            "border border-purple-500/20",
            "transition-all duration-300",
            "group-hover:from-purple-500/20 group-hover:to-blue-500/20",
            "group-hover:border-purple-500/40"
          )}>
            <span className="text-sm font-semibold text-foreground">
              {getButtonText()}
            </span>
            <ArrowRight className={cn(
              "w-4 h-4 text-purple-400",
              "transition-transform duration-300",
              "group-hover:translate-x-1"
            )} />
          </div>
        </div>

        {/* Glow Effect */}
        <div className={cn(
          "absolute -inset-px rounded-2xl opacity-0",
          "bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-purple-500/20",
          "group-hover:opacity-100 transition-opacity duration-300",
          "pointer-events-none blur-xl -z-10"
        )} />
      </div>

      {/* Screen Reader Announcements */}
      <span className="sr-only">
        {title}, {difficultyStyle.label} level, {duration}, {category}.
        {isCompleted ? 'Completed' : `${progressPercent}% complete`}
      </span>
    </Link>
  );
}

export default WorkshopCard;
