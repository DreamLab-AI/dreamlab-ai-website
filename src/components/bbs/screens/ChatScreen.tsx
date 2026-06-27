/**
 * ChatScreen — a live forum feed. Loads recent notes + channel messages, then
 * subscribes for new ones in real time. The composer posts a kind-1 note.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useEscape } from "@/hooks/bbs/useEscape";
import { useClock } from "@/hooks/bbs/useClock";
import {
  buildNote,
  eventToPost,
  fetchProfilesFor,
  fetchRecentPosts,
} from "@/lib/bbs/forum";
import { createSigner, npubOf } from "@/lib/bbs/identity";
import { KIND, type Post, type Profile } from "@/lib/bbs/types";
import { deriveHandle, relativeTime, truncate, wrap } from "@/lib/bbs/format";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Notice, Working } from "../common";
import { Composer } from "./Composer";
import type { ScreenProps } from "./types";

export function ChatScreen({ onExit, onNavigate }: ScreenProps) {
  const { relay, identity, whitelist } = useBbsSession();
  const now = useClock(10000);
  useEscape(onExit);

  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const seen = useRef<Set<string>>(new Set());

  const mergeProfiles = useCallback(
    async (pubkeys: string[]) => {
      const missing = pubkeys.filter((pk) => !profilesRef.current.has(pk));
      if (missing.length === 0) return;
      const fetched = await fetchProfilesFor(relay, missing);
      if (fetched.size === 0) return;
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const [k, v] of fetched) next.set(k, v);
        return next;
      });
    },
    [relay]
  );

  // Keep a ref of profiles so the live handler reads current state.
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRecentPosts(relay, 60).then((recent) => {
      if (cancelled) return;
      for (const p of recent) seen.current.add(p.id);
      setPosts(recent);
      setLoading(false);
      void mergeProfiles(recent.map((p) => p.pubkey));
    });
    return () => {
      cancelled = true;
    };
  }, [relay, mergeProfiles]);

  // Live subscription for new events.
  useEffect(() => {
    const since = Math.floor(Date.now() / 1000);
    const unsub = relay.subscribe(
      [{ kinds: [KIND.NOTE, KIND.CHANNEL_MESSAGE], since }],
      (event) => {
        if (seen.current.has(event.id)) return;
        seen.current.add(event.id);
        const post = eventToPost(event);
        setPosts((prev) => [post, ...prev].slice(0, 200));
        void mergeProfiles([post.pubkey]);
      }
    );
    return unsub;
  }, [relay, mergeProfiles]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const signer = createSigner(identity);
      if (!signer) return "Read-only — set up an identity in Settings.";
      try {
        const event = await signer.sign(buildNote(text));
        const result = await relay.publish(event);
        return result.ok ? null : result.message || "relay rejected the note";
      } catch (e) {
        return e instanceof Error ? e.message : "failed to publish";
      }
    },
    [identity, relay]
  );

  return (
    <BbsFrame
      title="CHAT · LIVE FEED"
      rightCaption={<BackHint label="Menu" />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="bbs-scroll min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <Working label="Tuning in" />
          ) : posts.length === 0 ? (
            <Notice>No recent activity on the relay.</Notice>
          ) : (
            <ol className="space-y-1.5">
              {posts.map((p) => {
                const handle = deriveHandle(
                  profiles.get(p.pubkey)?.name,
                  npubOf(p.pubkey)
                );
                return (
                  <li key={p.id} className="leading-snug">
                    <span className="text-[var(--bbs-info)] text-[0.85em]">
                      {relativeTime(p.createdAt, now.getTime())}
                    </span>{" "}
                    <span className="text-[var(--bbs-secondary)]">
                      &lt;{handle}&gt;
                    </span>{" "}
                    <span className="text-[var(--bbs-fg)]">
                      {truncate(wrap(p.content, 200).join(" "), 200)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <Composer
          onSend={send}
          canPost={identity.kind !== "anon"}
          whitelisted={whitelist.whitelisted}
          onConfigure={() => onNavigate("settings")}
          placeholder="Say something to the feed…  (Ctrl+Enter to send)"
          rows={2}
        />
      </div>
    </BbsFrame>
  );
}
