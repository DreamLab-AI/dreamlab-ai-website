import { lazy, Suspense, useRef } from "react";
import { HyperdimensionalHeroBackground } from "@/components/HyperdimensionalHeroBackground";
import { Header } from "@/components/Header";
import { ChevronDown } from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

// Lazy-load below-fold components for better initial load performance
const TestimonialMoments = lazy(() => import("@/components/TestimonialMoments").then(m => ({ default: m.TestimonialMoments })));
const FeaturedInstructors = lazy(() => import("@/components/FeaturedInstructors").then(m => ({ default: m.FeaturedInstructors })));
const ExclusivityBanner = lazy(() => import("@/components/ExclusivityBanner").then(m => ({ default: m.ExclusivityBanner })));
const CaseStudyNarrative = lazy(() => import("@/components/CaseStudyNarrative").then(m => ({ default: m.CaseStudyNarrative })));
const EmailSignupForm = lazy(() => import("@/components/EmailSignupForm").then(m => ({ default: m.EmailSignupForm })));

// Minimal loading skeleton for below-fold content
const SectionSkeleton = () => (
  <div className="w-full py-24 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

/**
 * Represents the main index/home page of the website.
 * Features a hero section promoting the AI Agent Masterclass,
 * testimonials, instructors, and email signup.
 */
const Index = () => {
  // Set OG meta tags for home page
  useOGMeta(PAGE_OG_CONFIGS.home);

  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Hero section - AI Agent Masterclass */}
      <section
        id="main-content"
        ref={heroRef}
        className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
        aria-label="Hero section"
      >
        {/* 4D-inspired hyperdimensional background - subtle, classy, mathematically elegant */}
        <HyperdimensionalHeroBackground />

        {/* Content overlay */}
        <div className="container relative z-10 mt-16 flex flex-col items-center text-center px-4">
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up max-w-4xl leading-tight">
            Build AI agents for your business
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-foreground/85 max-w-3xl mb-8 animate-slide-up font-light tracking-wide" style={{ animationDelay: '0.1s' }}>
            One day. One working agent. Real impact.
          </p>

          {/* Primary CTA - above fold */}
          <div className="flex flex-col sm:flex-row gap-4 animate-scale-in mb-8" style={{ animationDelay: '0.2s' }}>
            <a
              href="/masterclass#content"
              className="group relative inline-flex items-center justify-center rounded-lg text-base font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105 h-14 px-10 py-3 overflow-hidden"
            >
              <span className="relative z-10">Get the AI Agent Masterclass now →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </a>
          </div>

          {/* Course options summary */}
          <div className="animate-slide-up flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>1-day workshop · up to 6 people · £1,495 pp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              <span>Residential · max 4 people · from £995/day pp</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Scroll down to next section"
            className="text-foreground/60 hover:text-purple-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded hover:scale-110"
          >
            <ChevronDown className="w-10 h-10" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Below-fold content - lazy loaded for performance */}
      <Suspense fallback={<SectionSkeleton />}>
        {/* Testimonial moments section */}
        <TestimonialMoments />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        {/* Featured instructors section */}
        <FeaturedInstructors />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        {/* Exclusivity/Waitlist section */}
        <ExclusivityBanner />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        {/* Case study narrative */}
        <CaseStudyNarrative />
      </Suspense>

      {/* Email signup section */}
      <section className="relative py-24 overflow-hidden" aria-label="Email signup">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-xl"></div>

        {/* Animated gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-shift bg-400%"></div>

        <div className="container relative z-10 flex flex-col items-center">
          <div className="bg-background/60 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 p-12 max-w-3xl w-full">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text animate-gradient-shift bg-400%">
              Join the Creative Technology Revolution
            </h2>
            <p className="text-lg text-foreground/85 text-center mb-10 max-w-2xl mx-auto leading-relaxed">
              Stay updated on our latest training programs in virtual production, AI/ML,
              spatial audio, and agentic engineering.
            </p>
            <Suspense fallback={<div className="h-12 w-full bg-muted/20 rounded animate-pulse" />}>
              <EmailSignupForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 overflow-hidden" role="contentinfo">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent"></div>

        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-purple-500/20 pt-8 gap-6">
            <p className="text-sm text-muted-foreground transition-colors hover:text-foreground/90">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-muted-foreground hover:text-pink-400 transition-all duration-300 hover:scale-110 inline-block" aria-label="Instagram (coming soon)">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-400 transition-all duration-300 hover:scale-110 inline-block">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block">
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
