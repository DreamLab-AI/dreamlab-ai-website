import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { TeamMember } from "@/components/TeamMember";
import { parseTeamMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface TeamMemberData {
  id: string;
  imageSrc: string;
  headline: string;
  fullDetails: string;
}

const Team = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamMembers = async () => {
      setLoading(true);
      try {
        const manifestResponse = await fetch('/data/team/manifest.json');
        if (!manifestResponse.ok) {
          throw new Error('Failed to load team manifest');
        }
        const manifest = await manifestResponse.json();
        const memberIds = manifest.members || [];

        const memberPromises = memberIds.map((id: string) =>
          (async () => {
            try {
              const [markdownResponse, imageResponse] = await Promise.all([
                fetch(`/data/team/${id}.md`),
                fetch(`/data/team/${id}.png`),
              ]);

              if (!markdownResponse.ok || !imageResponse.ok) {
                return null;
              }

              const markdownText = await markdownResponse.text();
              const { headline, fullDetails } = parseTeamMarkdown(markdownText);

              return {
                id,
                imageSrc: `/data/team/${id}.png`,
                headline,
                fullDetails,
              };
            } catch (error) {
              return null;
            }
          })()
        );

        const loadedMembers = await Promise.all(memberPromises);
        const validMembers = loadedMembers.filter(Boolean) as TeamMemberData[];
        validMembers.sort((a, b) => parseInt(a.id) - parseInt(b.id));

        setTeamMembers(validMembers);
      } catch (error) {
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id)
        ? prev.filter(memberId => memberId !== id)
        : [...prev, id]
    );
  }, []);

  const handleEnquire = () => {
    if (selectedMembers.length === 0) return;

    // Get names of selected team members
    const selectedNames = selectedMembers
      .map(id => {
        const member = teamMembers.find(m => m.id === id);
        return member ? member.headline : "";
      })
      .filter(Boolean)
      .join(", ");

    // Redirect to contact page with pre-selected team members
    window.location.href = `/contact?team=${encodeURIComponent(selectedNames)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Team header */}
      <section id="main-content" className="pt-24 pb-8 bg-secondary/20">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Our Team</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Meet our talented professionals. Click on a team member's photo to select
            them for your project.
          </p>

          {/* Selection controls */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">
              {selectedMembers.length} team member{selectedMembers.length !== 1 ? 's' : ''} selected
            </span>

            <Button
              onClick={handleEnquire}
              disabled={selectedMembers.length === 0}
              size="sm"
              className="gap-1"
              aria-label={`Enquire about availability for ${selectedMembers.length} selected team member${selectedMembers.length !== 1 ? 's' : ''}`}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Enquire About Availability
            </Button>
          </div>
        </div>
      </section>

      {/* Team grid */}
      <section className="py-12" aria-label="Team members">
        <div className="container">
          {loading ? (
            <div className="text-center py-12" role="status" aria-live="polite">Loading team members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12">No team members found.</div>
          ) : (
            <div className="text-center">
              <div className="inline-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 text-left" role="list">
                {teamMembers.map(member => (
                  <TeamMember
                    key={member.id}
                    id={member.id}
                    imageSrc={member.imageSrc}
                    headline={member.headline}
                    fullDetails={member.fullDetails}
                    isSelected={selectedMembers.includes(member.id)}
                    onToggleSelect={() => handleToggleSelect(member.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background" role="contentinfo">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-muted pt-8">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram (coming soon)">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
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

export default Team;
