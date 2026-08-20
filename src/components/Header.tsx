import { useState, useEffect, useCallback, useRef } from "react";
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
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const SCROLL_THRESHOLD = 50;

const LINKEDIN_URL = "https://www.linkedin.com/company/dreamlab-ai-consulting";
const BLUESKY_URL = "https://bsky.app/profile/thedreamlab.bsky.social";

/**
 * Wordmark used on the mobile nav bar and in the menu overlay. A 9px cyan dot
 * plus DREAMLAB — replaces the shipped "MENU" label that sat where the brand
 * belongs. Links home.
 */
const Wordmark = ({ onClick }: { onClick?: () => void }) => (
  <Link
    to="/"
    onClick={onClick}
    aria-label="DreamLab home"
    className="flex items-center gap-2"
  >
    <span className="w-[9px] h-[9px] rounded-full bg-dlm-bright shrink-0" aria-hidden="true" />
    <span className="text-[14px] font-semibold tracking-[0.14em] text-[#FAFAFA]">DREAMLAB</span>
  </Link>
);

type MenuLink = {
  label: string;
  to: string;
  /** external destinations (the /community/ SPA, social) render as <a> */
  external?: boolean;
  /** right-aligned count, e.g. "38 ideas" */
  count?: string;
  /** cyan mono treatment for the count, e.g. Community forum "SIGN IN" */
  action?: boolean;
};

const LAB_LINKS: MenuLink[] = [
  { label: "Programmes", to: "/programmes", count: "38 ideas" },
  { label: "Co-create", to: "/co-create", count: "3 routes" },
  { label: "Research", to: "/research" },
  { label: "Software ecosystem", to: "/ecosystem" },
  { label: "Self-guided workshops", to: "/workshops", count: "15 free" },
];

const PEOPLE_LINKS: MenuLink[] = [
  { label: "Team", to: "/team", count: "44+" },
  { label: "Impact stories", to: "/testimonials" },
  { label: "Community forum", to: "/community/", external: true, count: "SIGN IN", action: true },
];

const MenuRow = ({ link, onNavigate }: { link: MenuLink; onNavigate: () => void }) => {
  const inner = (
    <>
      <span className="text-[19px] text-[#FAFAFA]">{link.label}</span>
      {link.count && (
        <span
          className={
            link.action
              ? "text-[11px] font-mono tracking-[0.14em] text-dlm-bright uppercase"
              : "text-[13px] text-white/40"
          }
        >
          {link.count}
        </span>
      )}
    </>
  );
  const cls =
    "flex items-center justify-between min-h-[56px] border-t border-dlm-hairline first:border-t-0";
  return link.external ? (
    <a href={link.to} onClick={onNavigate} className={cls}>
      {inner}
    </a>
  ) : (
    <Link to={link.to} onClick={onNavigate} className={cls}>
      {inner}
    </Link>
  );
};

/** Full-screen, flat, opaque menu overlay. Replaces the shipped DropdownMenu on
 *  mobile. Radix Dialog provides focus trap, Escape-to-close, aria-modal and
 *  body-scroll lock; we own the chrome. */
const MobileMenu = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const close = () => onOpenChange(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed inset-0 z-[60] bg-dlm-base text-[#FAFAFA] overflow-y-auto flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          aria-label="Site menu"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navigate to any DreamLab destination.
          </Dialog.Description>

          {/* Overlay's own nav bar, mirroring the 56px root bar */}
          <div className="flex items-center justify-between h-14 px-6 shrink-0">
            <Wordmark onClick={close} />
            <Dialog.Close
              aria-label="Close menu"
              className="w-11 h-11 -mr-2 flex items-center justify-center text-[#FAFAFA]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          <nav className="flex-1 px-6 pb-8">
            <p className="text-m-meta uppercase text-white/40 mt-6 mb-2">The lab</p>
            {LAB_LINKS.map((l) => (
              <MenuRow key={l.to} link={l} onNavigate={close} />
            ))}

            <p className="text-m-meta uppercase text-white/40 mt-6 mb-2">The people</p>
            {PEOPLE_LINKS.map((l) => (
              <MenuRow key={l.to} link={l} onNavigate={close} />
            ))}

            {/* Footer block */}
            <div className="mt-10">
              <Link
                to="/contact"
                onClick={close}
                className="flex items-center justify-center h-[50px] rounded-[10px] bg-dlm-action text-dlm-ink text-[16px] font-semibold active:bg-[#0891B2] transition-colors"
              >
                Schedule a lab visit
              </Link>
              <div className="flex items-center justify-center gap-5 mt-6 text-[14px] text-white/50">
                <Link to="/contact" onClick={close}>Contact</Link>
                <a href={LINKEDIN_URL} target="_blank" rel="noreferrer noopener">LinkedIn</a>
                <a href={BLUESKY_URL} target="_blank" rel="noreferrer noopener">Bluesky</a>
                <Link to="/privacy" onClick={close}>Privacy</Link>
              </div>
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * Renders the fixed website header that is always visible.
 * - Below md: a 56px bar (wordmark left, hamburger right) opening a full-screen
 *   flat menu overlay. Constant 92%-opacity scrim, no scroll-threshold swap.
 * - md and up: the shipped desktop header, unchanged.
 */
export const Header = () => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // rAF-coalesced so the scrollY read happens in the frame callback (after
  // any pending style writes), never forcing a synchronous layout mid-scroll.
  const scrollRafId = useRef(0);
  const handleScroll = useCallback(() => {
    if (scrollRafId.current) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = 0;
      setHasScrolled(window.scrollY > SCROLL_THRESHOLD);
    });
  }, []);

  // Close the overlay whenever the route changes (covers link taps and back/forward).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Publish the rendered header height so sticky sub-headers can offset by it.
  // The header has no fixed height (56px on mobile, 73px from md), so a
  // hard-coded top-16 would leave sticky bars partly hidden behind it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // No eager publish() call: ResizeObserver always delivers an initial
    // notification on observe(), and its callback runs after layout, so
    // reading offsetHeight there never forces a synchronous reflow (the
    // mount-time read was the main forced-reflow cost in this component).
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
      document.documentElement.style.setProperty("--header-height", `${height}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
    };
  }, [handleScroll]);

  return (
    <header ref={headerRef} role="banner" className="fixed top-0 left-0 right-0 z-50">
      {/* Mobile bar — below md. Constant scrim; no scroll swap. */}
      <div className="md:hidden flex items-center justify-between h-14 px-6 bg-[rgba(14,14,17,0.92)] backdrop-blur-[14px] border-b border-dlm-hairline">
        <Wordmark />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="w-11 h-11 -mr-2 flex flex-col items-end justify-center gap-[5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-dlm-bright rounded"
        >
          <span className="block w-5 h-[1.5px] bg-[#FAFAFA] rounded-full" aria-hidden="true" />
          <span className="block w-5 h-[1.5px] bg-[#FAFAFA] rounded-full" aria-hidden="true" />
        </button>
      </div>

      {/* Desktop bar — md and up. Unchanged from the shipped header. */}
      <div
        className={`hidden md:block transition-all duration-300 ease-out py-3 ${
          hasScrolled
            ? "bg-background/80 backdrop-blur-xl shadow-xl shadow-purple-500/10 border-b border-purple-500/20"
            : "bg-background/60 backdrop-blur-md"
        }`}
      >
        <div className="container flex items-center justify-between px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 md:gap-3 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded min-h-[48px] min-w-[48px] px-3 py-2" aria-label="Main navigation menu">
                <div className="w-10 h-10 md:w-8 md:h-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 group-hover:shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110 animate-glow-pulse" aria-hidden="true"></div>
                <span className="font-bold text-lg md:text-xl tracking-tight group-hover:text-purple-400 transition-colors duration-300">MENU</span>
                <ChevronDown className="h-5 w-5 md:h-4 md:w-4 shrink-0 text-muted-foreground group-hover:text-purple-400 transition-all duration-300 group-hover:rotate-180" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 md:w-48">
              <DropdownMenuItem asChild>
                <Link to="/" className="w-full">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>Lab</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem asChild>
                    <Link to="/programmes" className="w-full">Programmes</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/co-create" className="w-full">Co-Create</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/research" className="w-full">Research</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/ecosystem" className="w-full">Software Ecosystem</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/workshops" className="w-full">Self-Guided Workshops</Link>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem asChild>
                <Link to="/team" className="w-full">Team</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/testimonials" className="w-full">Impact Stories</Link>
              </DropdownMenuItem>
              {/* Direct link — the forum is the community surface; the old
                  one-item Community submenu just added a hover step. */}
              <DropdownMenuItem asChild>
                <a href="/community/" className="w-full">Community</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/contact" className="w-full">Contact</Link>
              </DropdownMenuItem>
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
              <Link to="/co-create">Partner With Us</Link>
            </Button>
          </div>
        </div>
      </div>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
};
