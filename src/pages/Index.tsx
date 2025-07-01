import { TorusKnot } from "@/components/TorusKnot";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { Header } from "@/components/Header";
import skillsData from "@/data/skills.json";
import { ChevronDown } from "lucide-react";

/**
 * Represents the main index/home page of the website.
 * Features a hero section with the BuckyBall visualization,
 * an email signup form, and a standard footer.
 */
const Index = () => {
  // Load skills from JSON file
  const skills = skillsData.skills;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Header />

      {/* Hero section with buckyball */}
      <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center">
        {/* TorusKnot container */}
        <div className="absolute inset-0 z-0">
          <TorusKnot skills={skills} />
        </div>

        {/* Content overlay */}
        <div className="container relative z-10 mt-16 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in bg-gradient-to-r from-blue-400 via-purple-500 to-blue-500 inline-block text-transparent bg-clip-text animate-text-shimmer bg-300% max-w-3xl">
            DREAMLAB AI CONSULTING
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 animate-fade-in">
            Bespoke AI, Training & Consulting
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="w-10 h-10 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} />
        </div>
      </section>

      {/* Email signup section */}
      <section className="relative py-20 bg-secondary/50">
        <div className="container flex flex-col items-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">
            Join Our Network
          </h2>
          <EmailSignupForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-muted pt-8">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="flex space-x-6">
                <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Bluesky
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Instagram
                </a>
                <a href="https://www.linkedin.com/company/dreamlabinstitute/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  LinkedIn
                </a>
              </div>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
