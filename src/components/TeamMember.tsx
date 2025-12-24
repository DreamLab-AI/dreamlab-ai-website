import { useState, memo, useMemo } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TeamMemberProps {
  id: string;
  imageSrc: string;
  headline: string;
  fullDetails: string;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const TeamMember = memo(({
  id,
  imageSrc,
  headline,
  fullDetails,
  isSelected,
  onToggleSelect
}: TeamMemberProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const paragraphs = useMemo(() =>
    fullDetails.split('\n\n').filter(p => p.trim() !== ''),
    [fullDetails]
  );

  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-purple-500/20 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02] hover:border-purple-500/40"
      onClick={(e) => {
        // Only toggle selection when clicking on the image
        if (e.target === e.currentTarget.querySelector('img')) {
          onToggleSelect();
        }
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 shadow-lg shadow-purple-500/50 animate-scale-in">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Team member image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imageSrc}
          alt={`Portrait of ${headline}`}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-500 ${isSelected ? 'opacity-90 scale-105' : 'opacity-100 group-hover:scale-110'} cursor-pointer`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Team member headline */}
      <div className="p-5">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">{headline}</h3>
        
        {/* Expandable details */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="mt-3 flex items-center text-sm text-muted-foreground/80 hover:text-purple-400 transition-all duration-300 group/btn focus:outline-none focus:ring-2 focus:ring-ring rounded"
              onClick={(e) => e.stopPropagation()}
              aria-expanded={popoverOpen}
              aria-label={`${popoverOpen ? 'Hide' : 'Show'} details for ${headline}`}
            >
              <span className="font-medium">Details</span>
              {popoverOpen ? (
                <ChevronUp className="ml-1.5 h-4 w-4 group-hover/btn:translate-y-[-2px] transition-transform" aria-hidden="true" />
              ) : (
                <ChevronDown className="ml-1.5 h-4 w-4 group-hover/btn:translate-y-[2px] transition-transform" aria-hidden="true" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 max-h-80 overflow-y-auto p-5 bg-background/95 backdrop-blur-xl border-purple-500/30 shadow-xl shadow-purple-500/10 rounded-xl"
            onInteractOutside={() => setPopoverOpen(false)}
          >
            <div className="space-y-3 text-sm text-muted-foreground/90 leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>{paragraph}</p>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}); 