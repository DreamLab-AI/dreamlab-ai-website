/**
 * CodeExchangeScreen — browse and share code snippets, modelled as kind-1
 * notes tagged `#code`. The composer publishes a `#code`-tagged note.
 */

import { useCallback, useState } from "react";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useListNav } from "@/hooks/bbs/useListNav";
import { useEscape } from "@/hooks/bbs/useEscape";
import { useClock } from "@/hooks/bbs/useClock";
import {
  buildNote,
  eventToPost,
  fetchProfilesFor,
} from "@/lib/bbs/forum";
import { createSigner, npubOf } from "@/lib/bbs/identity";
import { KIND, type Post, type Profile } from "@/lib/bbs/types";
import { deriveHandle, relativeTime, truncate } from "@/lib/bbs/format";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Notice, Working } from "../common";
import { Composer } from "./Composer";
import type { ScreenProps } from "./types";

interface CodeData {
  posts: Post[];
  profiles: Map<string, Profile>;
}

function firstLine(content: string): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) || "";
  return truncate(line, 60) || "(snippet)";
}

export function CodeExchangeScreen({ onExit, onNavigate }: ScreenProps) {
  const { relay, identity, whitelist } = useBbsSession();
  const now = useClock(15000);
  useEscape(onExit);
  const [copied, setCopied] = useState(false);

  const { data, loading, error, reload } = useAsync<CodeData>(async () => {
    const events = await relay.query([
      { kinds: [KIND.NOTE], "#t": ["code"], limit: 100 },
    ]);
    const posts = events.map(eventToPost);
    const profiles = await fetchProfilesFor(
      relay,
      posts.map((p) => p.pubkey)
    );
    return { posts, profiles };
  }, [relay]);

  const posts = data?.posts ?? [];
  const profiles = data?.profiles ?? new Map<string, Profile>();
  const { index, setIndex } = useListNav({ count: posts.length });
  const selected = posts[index];

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const signer = createSigner(identity);
      if (!signer) return "Read-only — set up an identity in Settings.";
      try {
        const event = await signer.sign(buildNote(text, ["code"]));
        const result = await relay.publish(event);
        if (!result.ok) return result.message || "relay rejected the snippet";
        window.setTimeout(reload, 600);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "failed to publish";
      }
    },
    [identity, relay, reload]
  );

  const copySelected = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <BbsFrame
      title="CODE EXCHANGE"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {loading ? (
          <Working label="Loading snippets" />
        ) : error ? (
          <Notice tone="warn">relay error: {error}</Notice>
        ) : posts.length === 0 ? (
          <Notice>No snippets yet — share the first one below.</Notice>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
            <ul className="bbs-scroll max-h-[40vh] overflow-y-auto sm:max-h-none">
              {posts.map((p, i) => {
                const sel = i === index;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      onMouseEnter={() => setIndex(i)}
                      className={`flex w-full items-baseline gap-2 px-1 text-left ${
                        sel ? "bbs-selected" : ""
                      }`}
                    >
                      <span
                        className={
                          sel
                            ? "text-[var(--bbs-sel-fg)]"
                            : "text-[var(--bbs-ok)]"
                        }
                      >
                        §
                      </span>
                      <span
                        className={`flex-1 truncate ${
                          sel
                            ? "text-[var(--bbs-sel-fg)]"
                            : "text-[var(--bbs-fg)]"
                        }`}
                      >
                        {firstLine(p.content)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="bbs-scroll min-h-0 overflow-auto border border-[var(--bbs-border)] p-2">
              {selected ? (
                <>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-[var(--bbs-secondary)]">
                      &lt;
                      {deriveHandle(
                        profiles.get(selected.pubkey)?.name,
                        npubOf(selected.pubkey)
                      )}
                      &gt;
                    </span>
                    <span className="flex items-center gap-2 text-[0.85em]">
                      <span className="text-[var(--bbs-info)]">
                        {relativeTime(selected.createdAt, now.getTime())}
                      </span>
                      <button
                        type="button"
                        onClick={copySelected}
                        className="text-[var(--bbs-accent)] focus:outline-none"
                      >
                        {copied ? "copied ✓" : "[copy]"}
                      </button>
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[0.92em] text-[var(--bbs-fg)]">
                    {selected.content}
                  </pre>
                </>
              ) : (
                <Notice>Select a snippet.</Notice>
              )}
            </div>
          </div>
        )}

        <Composer
          onSend={send}
          canPost={identity.kind !== "anon"}
          whitelisted={whitelist.whitelisted}
          onConfigure={() => onNavigate("settings")}
          placeholder="Paste a code snippet…  (Ctrl+Enter to share)"
          rows={3}
        />
      </div>
    </BbsFrame>
  );
}
