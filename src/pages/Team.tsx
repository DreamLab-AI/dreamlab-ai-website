import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { TeamMember } from "@/components/TeamMember";
import { parseTeamMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Send, Check } from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";
import { useIsMobileSync } from "@/hooks/use-mobile";
import { MobileActionBar, BarPrimary } from "@/components/MobileActionBar";

interface TeamMemberData {
  id: string;
  imageSrc: string;
  headline: string;
  fullDetails: string;
}

/** The bios store a single headline string; split it into a name and an optional
 *  role on the first comma or dash so the mobile card can show both without
 *  inventing data. */
function splitHeadline(headline: string): { name: string; role: string } {
  const sep = headline.match(/\s[—–-]\s|,\s/);
  if (sep && sep.index !== undefined) {
    return {
      name: headline.slice(0, sep.index).trim(),
      role: headline.slice(sep.index + sep[0].length).trim(),
    };
  }
  return { name: headline, role: "" };
}

interface TeamViewProps {
  teamMembers: TeamMemberData[];
  loading: boolean;
  selectedMembers: string[];
  onToggle: (id: string) => void;
  onEnquire: () => void;
}

/* ============================================================
   MOBILE TEAM (≤767px) — SCREENS.md §08
   ============================================================ */

const MobileTeamCard = ({
  member,
  isSelected,
  onToggle,
}: {
  member: TeamMemberData;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  const { name, role } = splitHeadline(member.headline);
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`Select ${name}`}
      onClick={onToggle}
      className={`relative block text-left overflow-hidden rounded-[14px] transition-colors ${
        isSelected
          ? "border-2 border-dlm-bright"
          : "border border-white/10 bg-white/[0.03]"
      }`}
    >
      {isSelected && (
        <span className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-dlm-bright">
          <Check className="w-3.5 h-3.5 text-dlm-ink" aria-hidden="true" />
        </span>
      )}
      <img
        src={member.imageSrc}
        alt={`Portrait of ${name}`}
        loading="lazy"
        decoding="async"
        className="w-full h-[120px] object-cover"
      />
      <div className="pt-3 px-3 pb-3.5">
        <div className="text-[15px] font-semibold text-[#FAFAFA] leading-tight">{name}</div>
        {role && <div className="text-[13px] text-white/50 mt-0.5 leading-snug">{role}</div>}
      </div>
    </button>
  );
};

const TeamMobile = ({ teamMembers, loading, selectedMembers, onToggle, onEnquire }: TeamViewProps) => {
  const count = selectedMembers.length;
  return (
    <>
      <section id="main-content" className="pt-11 px-6 pb-6" aria-label="Team intro">
        <h1 className="text-m-h1s text-[#FAFAFA] [text-wrap:pretty]">44+ specialists, one lab.</h1>
        <p className="text-m-body text-white/[0.62] mt-3">
          Emmy nominees, PhD researchers and BAFTA-recognised talent. Tap anyone you'd want on your
          project.
        </p>
      </section>

      <section className="px-5 pb-safe-bar" aria-label="Team members">
        {loading ? (
          <div className="text-center py-12 text-white/60" role="status" aria-live="polite">
            Loading team members…
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-12 text-white/60">No team members found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3" role="list">
            {teamMembers.map((member) => (
              <MobileTeamCard
                key={member.id}
                member={member}
                isSelected={selectedMembers.includes(member.id)}
                onToggle={() => onToggle(member.id)}
              />
            ))}
          </div>
        )}
      </section>

      <MobileActionBar>
        <span className="flex-1 text-[14px] text-white/60" aria-live="polite">
          {count} specialist{count !== 1 ? "s" : ""} selected
        </span>
        <BarPrimary label="Enquire" onClick={onEnquire} disabled={count === 0} fill={false} />
      </MobileActionBar>
    </>
  );
};

/* ============================================================
   DESKTOP TEAM (md and up) — unchanged from the shipped site
   ============================================================ */

const TeamDesktop = ({ teamMembers, loading, selectedMembers, onToggle, onEnquire }: TeamViewProps) => (
  <>
    {/* Team header */}
    <section id="main-content" className="pt-24 pb-8 bg-secondary/20">
      <div className="container">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Our Team</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mb-4">
          43+ specialists including Emmy nominees, PhD researchers, and BAFTA-recognised talent.
          Click on a team member to select them for your project.
        </p>

        {/* Selection controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">
            {selectedMembers.length} team member{selectedMembers.length !== 1 ? 's' : ''} selected
          </span>

          <Button
            onClick={onEnquire}
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
      <div className="container px-4">
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
                  onToggleSelect={() => onToggle(member.id)}
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
                  <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
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
  </>
);

const Team = () => {
  // Set OG meta tags for team page
  useOGMeta(PAGE_OG_CONFIGS.team);

  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobileSync();

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
              const markdownResponse = await fetch(`/data/team/${id}.md`);

              if (!markdownResponse.ok) {
                return null;
              }

              const markdownText = await markdownResponse.text();
              const { headline, fullDetails } = parseTeamMarkdown(markdownText);

              // Prefer WebP with PNG fallback for older browsers
              const webpResponse = await fetch(`/images/team/${id}.webp`, { method: 'HEAD' });
              const imageSrc = webpResponse.ok
                ? `/images/team/${id}.webp`
                : `/images/team/${id}.png`;

              return {
                id,
                imageSrc,
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

  const viewProps: TeamViewProps = {
    teamMembers,
    loading,
    selectedMembers,
    onToggle: handleToggleSelect,
    onEnquire: handleEnquire,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-14 md:pt-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />
      {isMobile ? <TeamMobile {...viewProps} /> : <TeamDesktop {...viewProps} />}
    </div>
  );
};

export default Team;
