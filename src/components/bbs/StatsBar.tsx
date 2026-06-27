/**
 * StatsBar — the footer user-stats line (User / Level / Access / Credits),
 * mapped from the live identity, cohort rank, and whitelist status.
 */

import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { rankFromCohorts, zonesUnlocked } from "@/lib/bbs/rank";

const SIGNER_LABEL: Record<string, string> = {
  anon: "ANON",
  local: "LOCAL KEY",
  nip07: "NIP-07",
};

export function StatsBar() {
  const { identity, whitelist, config } = useBbsSession();
  const rank = rankFromCohorts(whitelist.cohorts, whitelist.whitelisted);
  const unlocked = zonesUnlocked(config.zones, whitelist.cohorts);
  const credits = whitelist.whitelisted ? "WHITELISTED" : "READ-ONLY";

  return (
    <div className="shrink-0 border-t border-[var(--bbs-border)] px-3 py-1 text-[0.92em]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-0.5">
        <span className="text-[var(--bbs-dim)]">
          User:{" "}
          <span className="text-[var(--bbs-accent)]">{identity.handle}</span>
        </span>
        <span className="text-[var(--bbs-dim)]">
          Level: <span className="text-[var(--bbs-primary)]">{rank}</span>
        </span>
        <span className="text-[var(--bbs-dim)]">
          Auth:{" "}
          <span className="text-[var(--bbs-secondary)]">
            {SIGNER_LABEL[identity.kind] ?? identity.kind}
          </span>
        </span>
        <span className="text-[var(--bbs-dim)]">
          Zones:{" "}
          <span className="text-[var(--bbs-info)]">
            {unlocked}/{config.zones.length}
          </span>
        </span>
        <span className="text-[var(--bbs-dim)]">
          Credits:{" "}
          <span
            className={
              whitelist.whitelisted
                ? "text-[var(--bbs-ok)]"
                : "text-[var(--bbs-warn)]"
            }
          >
            {credits}
          </span>
        </span>
      </div>
    </div>
  );
}
