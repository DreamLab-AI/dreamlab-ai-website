/**
 * SystemInfoScreen — deployment + connection facts, plus full-text search over
 * indexed relay events (Search API). The search box doubles as the forum's
 * global search surface.
 */

import { useState } from "react";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useEscape } from "@/hooks/bbs/useEscape";
import { fetchRelayInfo, search, type SearchHit } from "@/lib/bbs/services";
import { shortKey, truncate } from "@/lib/bbs/format";
import { BbsFrame } from "../BbsFrame";
import { BackHint } from "../common";
import type { ScreenProps } from "./types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[var(--bbs-dim)]">{label}</span>
      <span className="break-all text-[var(--bbs-fg)]">{value}</span>
    </>
  );
}

export function SystemInfoScreen({ onExit }: ScreenProps) {
  const { config, identity, whitelist, status, authed } = useBbsSession();
  useEscape(onExit);
  const { data: info } = useAsync(
    () => fetchRelayInfo(config.relayUrl),
    [config.relayUrl]
  );

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const results = await search(config.searchApiUrl, query, 25);
    setHits(results);
    setSearching(false);
  };

  return (
    <BbsFrame
      title="SYSTEM INFO"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="bbs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
        <section>
          <div className="text-[var(--bbs-primary)]">═══ BUILD ═══</div>
          <div className="mt-1 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-0.5">
            <Row label="Forum" value={config.forumName} />
            <Row
              label="Version"
              value={`${config.buildVersion} (${config.buildHash})`}
            />
            <Row label="Client" value="Claude Code BBS — DreamLab overlay" />
            <Row
              label="Connection"
              value={`${status}${authed ? " · authed" : " · anon"}`}
            />
          </div>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ SERVICES ═══</div>
          <div className="mt-1 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-0.5">
            <Row label="Relay" value={config.relayUrl} />
            <Row label="Auth API" value={config.authApiUrl} />
            <Row label="Pod API" value={config.podApiUrl} />
            <Row label="Search API" value={config.searchApiUrl} />
            {info && (
              <Row
                label="Limits"
                value={`subs ${String(
                  info.limitation.max_subscriptions ?? "?"
                )} · filters ${String(
                  info.limitation.max_filters ?? "?"
                )} · msg ${String(info.limitation.max_message_length ?? "?")}B`}
              />
            )}
          </div>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ IDENTITY ═══</div>
          <div className="mt-1 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-0.5">
            <Row label="Handle" value={identity.handle} />
            <Row label="Signer" value={identity.kind} />
            <Row label="npub" value={identity.npub || "— (anonymous)"} />
            <Row
              label="Whitelist"
              value={
                !whitelist.checked
                  ? "unknown"
                  : whitelist.whitelisted
                    ? `yes · ${whitelist.cohorts.join(", ") || "no cohorts"}`
                    : "no — read only"
              }
            />
          </div>
        </section>

        <section>
          <div className="text-[var(--bbs-primary)]">═══ SEARCH ═══</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[var(--bbs-accent)]">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                } else if (e.key === "Escape") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              spellCheck={false}
              placeholder="search the forum… (Enter)"
              className="min-w-0 flex-1 border border-[var(--bbs-border)] bg-black/40 px-2 py-1 text-[var(--bbs-fg)] placeholder:text-[var(--bbs-dim)]/60 focus:border-[var(--bbs-accent)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              className="border border-[var(--bbs-border)] px-3 py-1 text-[var(--bbs-accent)] hover:bg-[var(--bbs-sel-bg)] hover:text-[var(--bbs-sel-fg)] focus:outline-none"
            >
              GO
            </button>
          </div>
          <div className="mt-2">
            {searching ? (
              <p className="text-[var(--bbs-info)]">
                searching<span className="bbs-cursor align-middle" />
              </p>
            ) : hits === null ? (
              <p className="text-[var(--bbs-dim)]">
                Semantic search over indexed relay events.
              </p>
            ) : hits.length === 0 ? (
              <p className="text-[var(--bbs-dim)]">No matches.</p>
            ) : (
              <ol className="space-y-1">
                {hits.map((h, i) => (
                  <li key={h.id || i} className="leading-snug">
                    <span className="text-[var(--bbs-secondary)]">
                      {h.pubkey ? shortKey(h.pubkey, 8, 4) : "?"}
                    </span>{" "}
                    <span className="text-[var(--bbs-fg)]">
                      {truncate(h.content, 120)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </BbsFrame>
  );
}
