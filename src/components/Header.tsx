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

const SCROLL_THRESHOLD = 100;

/**
 * Renders the fixed website header with reveal-on-scroll behavior.
 * Nav is transparent and hidden initially, reveals with slide-down
 * animation after scrolling past threshold.
 */
export const Header = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;

    // Reveal nav after scrolling past threshold
    if (currentScrollY > SCROLL_THRESHOLD) {
      setIsRevealed(true);
      // Hide on scroll down, show on scroll up (after initial reveal)
      if (currentScrollY > lastScrollY && currentScrollY > SCROLL_THRESHOLD + 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    } else {
      setIsRevealed(false);
      setIsVisible(true);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <header
      role="banner"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isRevealed
          ? `bg-background/80 backdrop-blur-xl py-3 shadow-xl shadow-purple-500/10 border-b border-purple-500/20 ${
              isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            }`
          : "bg-transparent py-5 opacity-0 pointer-events-none"
      }`}
      style={{
        transform: isRevealed && isVisible ? "translateY(0)" : isRevealed ? "translateY(-100%)" : "translateY(-20px)",
      }}
    >
      <div className="container flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded" aria-label="Main navigation menu">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110 animate-glow-pulse" aria-hidden="true"></div>
              <span className="font-bold text-xl tracking-tight group-hover:text-purple-400 transition-colors duration-300">MENU</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-all duration-300 group-hover:rotate-180" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/" className="w-full">Home</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/team" className="w-full">Team</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/residential-training" className="w-full">Residential Training</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/workshops" className="w-full">Workshops</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/work" className="w-full">Previous Work</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/testimonials" className="w-full">Success Stories</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/system-design" className="w-full">System Design</Link>
            </DropdownMenuItem>
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

        <Button
          variant="ghost"
          asChild
          className="hover:bg-purple-500/10 hover:text-purple-400 transition-all duration-300 hover:scale-105"
        >
          <a href="mailto:info@dreamlab-ai.com">Contact</a>
        </Button>
      </div>
    </header>
  );
};
