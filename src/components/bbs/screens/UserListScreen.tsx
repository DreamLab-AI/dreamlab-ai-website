/**
 * UserListScreen — browse forum members (kind-0 profiles) with a detail pane.
 */

import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useListNav } from "@/hooks/bbs/useListNav";
import { useEscape } from "@/hooks/bbs/useEscape";
import { fetchProfiles } from "@/lib/bbs/forum";
import { npubOf } from "@/lib/bbs/identity";
import { deriveHandle, relativeTime, shortKey, truncate } from "@/lib/bbs/format";
import { useClock } from "@/hooks/bbs/useClock";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Notice, Working } from "../common";
import type { ScreenProps } from "./types";

export function UserListScreen({ onExit }: ScreenProps) {
  const { relay } = useBbsSession();
  const now = useClock(5000);
  const { data, loading, error } = useAsync(
    () => fetchProfiles(relay, 200),
    [relay]
  );
  const profiles = data ?? [];
  const { index, setIndex } = useListNav({ count: profiles.length });
  useEscape(onExit);

  const selected = profiles[index];

  return (
    <BbsFrame
      title="USER LIST"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      {loading ? (
        <Working label="Loading users" />
      ) : error ? (
        <Notice tone="warn">relay error: {error}</Notice>
      ) : profiles.length === 0 ? (
        <Notice>No profiles found on the relay.</Notice>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between text-[var(--bbs-dim)]">
            <span>{profiles.length} members known to the relay</span>
            <span className="hidden sm:inline">↑/↓ select</span>
          </div>
          <ul className="bbs-scroll max-h-[42vh] overflow-y-auto">
            {profiles.map((p, i) => {
              const npub = npubOf(p.pubkey);
              const handle = deriveHandle(p.name, npub);
              const sel = i === index;
              return (
                <li key={p.pubkey}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndex(i)}
                    className={`flex w-full items-baseline gap-3 px-1 text-left ${
                      sel ? "bbs-selected" : ""
                    }`}
                  >
                    <span
                      className={
                        sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                      }
                    >
                      {String(i + 1).padStart(3, "0")}
                    </span>
                    <span
                      className={`w-40 shrink-0 truncate font-bold ${
                        sel
                          ? "text-[var(--bbs-sel-fg)]"
                          : "text-[var(--bbs-secondary)]"
                      }`}
                    >
                      {handle}
                    </span>
                    <span
                      className={`flex-1 truncate ${
                        sel
                          ? "text-[var(--bbs-sel-fg)]"
                          : "text-[var(--bbs-fg)]"
                      }`}
                    >
                      {p.nip05 || truncate(p.about, 50) || shortKey(npub, 10, 6)}
                    </span>
                    <span
                      className={`hidden shrink-0 sm:inline ${
                        sel
                          ? "text-[var(--bbs-sel-fg)]"
                          : "text-[var(--bbs-info)]"
                      }`}
                    >
                      {relativeTime(p.updatedAt, now.getTime())}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="border-t border-[var(--bbs-border)] pt-2 text-[0.95em]">
              <div className="text-[var(--bbs-primary)]">
                {deriveHandle(selected.name, npubOf(selected.pubkey))}
                {selected.nip05 && (
                  <span className="text-[var(--bbs-ok)]">
                    {" "}
                    ✓ {selected.nip05}
                  </span>
                )}
              </div>
              <div className="break-all text-[var(--bbs-dim)]">
                {npubOf(selected.pubkey)}
              </div>
              {selected.about && (
                <p className="mt-1 text-[var(--bbs-fg)]">
                  {truncate(selected.about, 240)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </BbsFrame>
  );
}
