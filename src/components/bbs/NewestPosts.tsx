/**
 * NewestPosts — the home-screen activity panel beneath the main menu, echoing
 * the WILDCAT "MESSAGE BASE — NEWEST POSTS" board. Shows the most recent notes
 * and channel messages from the relay with author and timestamp.
 */

import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useClock } from "@/hooks/bbs/useClock";
import { fetchProfilesFor, fetchRecentPosts } from "@/lib/bbs/forum";
import { deriveHandle, bbsTimestamp, truncate } from "@/lib/bbs/format";
import { npubOf } from "@/lib/bbs/identity";
import type { Post, Profile } from "@/lib/bbs/types";
import { BbsFrame } from "./BbsFrame";
import { Notice, Working } from "./common";

interface RecentData {
  posts: Post[];
  profiles: Map<string, Profile>;
}

export function NewestPosts() {
  const { relay } = useBbsSession();
  const now = useClock(15000);
  const { data, loading, error } = useAsync<RecentData>(async () => {
    const posts = await fetchRecentPosts(relay, 8);
    const profiles = await fetchProfilesFor(
      relay,
      posts.map((p) => p.pubkey)
    );
    return { posts, profiles };
  }, [relay]);

  const posts = data?.posts ?? [];
  const profiles = data?.profiles ?? new Map<string, Profile>();

  return (
    <BbsFrame
      title="MESSAGE BASE — NEWEST POSTS"
      rightCaption={posts.length > 0 ? "--- More in [1] ---" : undefined}
      className="mt-3"
    >
      {loading ? (
        <Working label="Fetching the boards" />
      ) : error ? (
        <Notice tone="warn">relay offline — boards unavailable</Notice>
      ) : posts.length === 0 ? (
        <Notice>No recent posts yet.</Notice>
      ) : (
        <ol className="space-y-0.5">
          {posts.map((p, i) => {
            const handle = deriveHandle(
              profiles.get(p.pubkey)?.name,
              npubOf(p.pubkey)
            );
            return (
              <li
                key={p.id}
                className="flex items-baseline gap-2 whitespace-nowrap"
              >
                <span className="text-[var(--bbs-ok)]">*</span>
                <span className="w-6 text-right text-[var(--bbs-dim)]">
                  {posts.length - i}
                </span>
                <span className="hidden w-28 shrink-0 text-[var(--bbs-info)] sm:inline">
                  {bbsTimestamp(p.createdAt)}
                </span>
                <span className="w-40 shrink-0 truncate text-[var(--bbs-secondary)]">
                  &lt;{handle}&gt;
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--bbs-fg)]">
                  {truncate(p.content, 70) || "(no text)"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </BbsFrame>
  );
}
