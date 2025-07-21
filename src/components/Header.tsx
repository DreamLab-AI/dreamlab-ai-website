import { useState, useEffect } from "react";
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

/**
 * Renders the fixed website header.
 * Features a logo/title with dropdown menu and a contact button.
 * Changes appearance on scroll for better visibility.
 */
export const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-md py-3 shadow-md" : "bg-transparent py-5"
      }`}
    >
      <div className="container flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <span className="font-bold text-xl tracking-tight">MENU</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
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
                  <a href="https://dreamlab-ai.com" target="_blank" rel="noopener noreferrer" className="w-full">DreamLab Creative Tech</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://agenticalliance.com/" target="_blank" rel="noopener noreferrer" className="w-full">Agentic Alliance</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.narrativegoldmine.com" target="_blank" rel="noopener noreferrer" className="w-full">Narrative Goldmine</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.visionflow.com" target="_blank" rel="noopener noreferrer" className="w-full">Visionflow</a>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" asChild>
          <a href="mailto:info@dreamlab-ai.com">Contact</a>
        </Button>
      </div>
    </header>
  );
};
