import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const SCROLL_THRESHOLD = 50;

/**
 * Renders the fixed website header that is always visible.
 * Background becomes solid after scrolling past threshold.
 */
export const Header = () => {
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setHasScrolled(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out py-3 ${
        hasScrolled
          ? "bg-background/80 backdrop-blur-xl shadow-xl shadow-purple-500/10 border-b border-purple-500/20"
          : "bg-background/60 backdrop-blur-md"
      }`}
    >
      <div className="container flex items-center justify-between px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded min-h-[48px] min-w-[48px] px-3 py-2" aria-label="Main navigation menu">
              <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110 animate-glow-pulse" aria-hidden="true"></div>
              <span className="font-bold text-lg md:text-xl tracking-tight group-hover:text-purple-400 transition-colors duration-300">MENU</span>
              <ChevronDown className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground group-hover:text-purple-400 transition-all duration-300 group-hover:rotate-180" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 md:w-48">
            <DropdownMenuItem asChild>
              <Link to="/" className="w-full">Home</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Training</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem asChild>
                  <a href="/#training-options" className="w-full">Overview</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/residential-training" className="w-full">Residential Programmes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/workshops" className="w-full">Self-Guided Workshops</Link>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem asChild>
              <Link to="/team" className="w-full">Team</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/testimonials" className="w-full">Success Stories</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/community/dreamlab/dreamlab-lobby" target="_blank" rel="noopener noreferrer" className="w-full">
                Community<span className="sr-only"> (opens DreamLab community forum in new tab)</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/contact" className="w-full">Contact</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Affiliate Partners</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem asChild>
                  <a href="https://dreamlab-ai.com" target="_blank" rel="noopener noreferrer" className="w-full">
                    DreamLab Creative Tech<span className="sr-only"> (opens in new window)</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://agenticalliance.com/" target="_blank" rel="noopener noreferrer" className="w-full">
                    Agentic Alliance<span className="sr-only"> (opens in new window)</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.narrativegoldmine.com" target="_blank" rel="noopener noreferrer" className="w-full">
                    Narrative Goldmine<span className="sr-only"> (opens in new window)</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.visionflow.com" target="_blank" rel="noopener noreferrer" className="w-full">
                    Visionflow<span className="sr-only"> (opens in new window)</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className="hover:bg-purple-500/10 hover:text-purple-400 transition-all duration-300 hover:scale-105 min-h-[48px] px-4 text-base md:text-sm hidden sm:inline-flex"
          >
            <Link to="/contact">Contact</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all duration-300 min-h-[48px] px-4 text-base md:text-sm"
          >
            <a href="/#training-options">Training</a>
          </Button>
        </div>
      </div>
    </header>
  );
};
