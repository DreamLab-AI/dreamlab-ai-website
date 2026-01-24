import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

interface WorkItem {
  id: string;
  title: string;
  client: string;
  year: string;
  description: string;
  imageUrl: string;
}

const Work = () => {
  // Set OG meta tags for work page
  useOGMeta(PAGE_OG_CONFIGS.work);

  const [previousWorks, setPreviousWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkData = async () => {
      try {
        const response = await fetch("/data/showcase/manifest.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch work data: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data.projects)) {
          setPreviousWorks(data.projects);
        }
      } catch (e) {
        console.error("Error loading work data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadWorkData();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Work header */}
      <section className="pt-24 pb-8 bg-secondary/20">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Previous Work</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Explore our portfolio of innovative projects and collaborations.
          </p>
        </div>
      </section>

      {/* Work showcase */}
      <section className="py-12">
        <div className="container">
          {loading ? (
            <div className="text-center py-12">Loading projects...</div>
          ) : previousWorks.length === 0 ? (
            <div className="text-center py-12">No projects found.</div>
          ) : (
            <div className="space-y-16">
              {previousWorks.map((work) => (
                <div
                  key={work.id}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                >
                  <div className={`rounded-lg overflow-hidden ${work.id.endsWith('2') || work.id.endsWith('4') ? 'md:order-2' : ''}`}>
                    <img
                      src={work.imageUrl}
                      alt={work.title}
                      className="w-full h-auto"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{work.title}</h2>
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <span>{work.client}</span>
                      <span className="mx-2">•</span>
                      <span>{work.year}</span>
                    </div>
                    <p className="text-base">{work.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
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

export default Work;