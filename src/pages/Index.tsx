import { TorusKnot } from "@/components/TorusKnot";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { Header } from "@/components/Header";
import skillsData from "@/data/skills.json";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Represents the main index/home page of the website.
 * Features a hero section with the BuckyBall visualization,
 * an email signup form, and a standard footer.
 */
const Index = () => {
  // Load skills from JSON file
  const skills = skillsData.skills;
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero section with buckyball */}
      <section
        id="main-content"
        ref={heroRef}
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* TorusKnot container with parallax */}
        <div
          className="absolute inset-0 z-0"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        >
          <TorusKnot skills={skills} />
        </div>

        {/* Content overlay */}
        <div className="container relative z-10 mt-16 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-7xl font-bold mb-6 animate-slide-up bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 inline-block text-transparent bg-clip-text animate-gradient-shift bg-400% max-w-4xl drop-shadow-2xl">
            DREAMLAB AI
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground/90 max-w-2xl mb-10 animate-slide-up font-light tracking-wide" style={{ animationDelay: '0.1s' }}>
            Deep learning with no distractions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <a href="/residential-training" className="group relative inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 h-12 px-8 py-3 overflow-hidden">
              <span className="relative z-10">Explore Training Programs</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <a href="/team" className="group relative inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-purple-500/50 bg-background/50 backdrop-blur-sm hover:bg-purple-500/10 hover:border-purple-400 hover:scale-105 h-12 px-8 py-3">
              <span className="relative z-10">Meet Our Team</span>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Scroll down to next section"
            className="text-muted-foreground/70 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Email signup section */}
      <section className="relative py-24 overflow-hidden" aria-label="Email signup">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-xl"></div>

        {/* Animated gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift bg-400%"></div>

        <div className="container relative z-10 flex flex-col items-center">
          <div className="bg-background/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 p-12 max-w-3xl w-full">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text animate-gradient-shift bg-400%">
              Join the Creative Technology Revolution
            </h2>
            <p className="text-lg text-muted-foreground/90 text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              Stay updated on our latest training programs in virtual production, AI/ML,
              spatial audio, and agentic engineering.
            </p>
            <EmailSignupForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 overflow-hidden" role="contentinfo">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent"></div>

        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-purple-500/20 pt-8 gap-6">
            <p className="text-sm text-muted-foreground/80 transition-colors hover:text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/80 hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-muted-foreground/80 hover:text-pink-400 transition-all duration-300 hover:scale-110 inline-block" aria-label="Instagram (coming soon)">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/80 hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
              <a href="/privacy" className="text-sm text-muted-foreground/80 hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
