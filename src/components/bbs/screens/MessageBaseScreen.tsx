/**
 * MessageBaseScreen — the core forum reader/writer. Three drill-down levels:
 *   areas (section prefixes) → channels → thread (messages + compose box).
 * Reads kind-40 channels and kind-42 messages from the relay; composing
 * publishes a signed kind-42 (subject to relay whitelist enforcement).
 */

import { useCallback, useState } from "react";
import { useBbsSession } from "@/hooks/bbs/useBbsSession";
import { useAsync } from "@/hooks/bbs/useAsync";
import { useListNav } from "@/hooks/bbs/useListNav";
import { useEscape } from "@/hooks/bbs/useEscape";
import { useClock } from "@/hooks/bbs/useClock";
import {
  buildChannelMessage,
  fetchChannelMessages,
  fetchChannels,
  fetchProfilesFor,
  groupChannelsByArea,
} from "@/lib/bbs/forum";
import { createSigner } from "@/lib/bbs/identity";
import { deriveHandle, relativeTime, truncate, wrap } from "@/lib/bbs/format";
import { npubOf } from "@/lib/bbs/identity";
import type { Channel, Post, Profile } from "@/lib/bbs/types";
import { BbsFrame } from "../BbsFrame";
import { BackHint, Notice, Working } from "../common";
import { Composer } from "./Composer";
import type { ScreenProps } from "./types";

type View = "areas" | "channels" | "thread";

export function MessageBaseScreen({ onExit, onNavigate }: ScreenProps) {
  const { relay } = useBbsSession();
  const [view, setView] = useState<View>("areas");
  const [area, setArea] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);

  const channelsState = useAsync(() => fetchChannels(relay), [relay]);
  const grouped = groupChannelsByArea(channelsState.data ?? []);
  const areaChannels = area
    ? grouped.find((g) => g.area === area)?.channels ?? []
    : [];

  const back = useCallback(() => {
    if (view === "thread") {
      setView("channels");
      setChannel(null);
    } else if (view === "channels") {
      setView("areas");
      setArea(null);
    } else {
      onExit();
    }
  }, [view, onExit]);
  useEscape(back);

  const areaNav = useListNav({
    count: grouped.length,
    enabled: view === "areas",
    onSelect: (i) => {
      setArea(grouped[i].area);
      setView("channels");
    },
  });
  const channelNav = useListNav({
    count: areaChannels.length,
    enabled: view === "channels",
    onSelect: (i) => {
      setChannel(areaChannels[i]);
      setView("thread");
    },
  });

  const title =
    view === "thread" && channel
      ? `MSG · ${channel.name}`
      : view === "channels" && area
        ? `MSG · ${area}`
        : "MESSAGE BASE";

  return (
    <BbsFrame
      title={title}
      rightCaption={<BackHint label={view === "areas" ? "Menu" : "Back"} />}
      className="bbs-screen-enter flex min-h-0 flex-1 flex-col"
    >
      {channelsState.loading && view !== "thread" ? (
        <Working label="Loading boards" />
      ) : channelsState.error ? (
        <Notice tone="warn">relay error: {channelsState.error}</Notice>
      ) : view === "areas" ? (
        <AreaList
          groups={grouped}
          index={areaNav.index}
          setIndex={areaNav.setIndex}
          onOpen={(a) => {
            setArea(a);
            setView("channels");
          }}
        />
      ) : view === "channels" ? (
        <ChannelList
          channels={areaChannels}
          index={channelNav.index}
          setIndex={channelNav.setIndex}
          onOpen={(c) => {
            setChannel(c);
            setView("thread");
          }}
        />
      ) : channel ? (
        <Thread channel={channel} onNavigate={onNavigate} />
      ) : null}
    </BbsFrame>
  );
}

/* ------------------------------- area list ------------------------------- */

function AreaList({
  groups,
  index,
  setIndex,
  onOpen,
}: {
  groups: { area: string; channels: Channel[] }[];
  index: number;
  setIndex: (i: number) => void;
  onOpen: (area: string) => void;
}) {
  if (groups.length === 0) {
    return <Notice>No boards found on the relay yet.</Notice>;
  }
  return (
    <ul className="bbs-scroll min-h-0 flex-1 overflow-y-auto">
      {groups.map((g, i) => {
        const sel = i === index;
        return (
          <li key={g.area}>
            <button
              type="button"
              onClick={() => onOpen(g.area)}
              onMouseEnter={() => setIndex(i)}
              className={`flex w-full items-baseline gap-3 px-1 text-left ${
                sel ? "bbs-selected" : ""
              }`}
            >
              <span
                className={
                  sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-ok)]"
                }
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`w-44 shrink-0 font-bold uppercase ${
                  sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-primary)]"
                }`}
              >
                {g.area}
              </span>
              <span
                className={
                  sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                }
              >
                {g.channels.length} board{g.channels.length === 1 ? "" : "s"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ channel list ----------------------------- */

function ChannelList({
  channels,
  index,
  setIndex,
  onOpen,
}: {
  channels: Channel[];
  index: number;
  setIndex: (i: number) => void;
  onOpen: (c: Channel) => void;
}) {
  if (channels.length === 0) {
    return <Notice>No boards in this area.</Notice>;
  }
  return (
    <ul className="bbs-scroll min-h-0 flex-1 overflow-y-auto">
      {channels.map((c, i) => {
        const sel = i === index;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              onMouseEnter={() => setIndex(i)}
              className={`flex w-full flex-col px-1 text-left ${
                sel ? "bbs-selected" : ""
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span
                  className={
                    sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-ok)]"
                  }
                >
                  ►
                </span>
                <span
                  className={`font-bold ${
                    sel
                      ? "text-[var(--bbs-sel-fg)]"
                      : "text-[var(--bbs-secondary)]"
                  }`}
                >
                  {c.name}
                </span>
                <span
                  className={
                    sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                  }
                >
                  #{c.section}
                </span>
              </span>
              {c.about && (
                <span
                  className={`pl-5 ${
                    sel ? "text-[var(--bbs-sel-fg)]" : "text-[var(--bbs-dim)]"
                  }`}
                >
                  {truncate(c.about, 80)}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------- thread --------------------------------- */

interface ThreadData {
  messages: Post[];
  profiles: Map<string, Profile>;
}

function Thread({
  channel,
  onNavigate,
}: {
  channel: Channel;
  onNavigate: ScreenProps["onNavigate"];
}) {
  const { relay, identity, whitelist } = useBbsSession();
  const now = useClock(10000);

  const { data, loading, error, reload } = useAsync<ThreadData>(async () => {
    const messages = await fetchChannelMessages(relay, channel.id, 200);
    const profiles = await fetchProfilesFor(
      relay,
      messages.map((m) => m.pubkey)
    );
    return { messages, profiles };
  }, [relay, channel.id]);

  const messages = data?.messages ?? [];
  const profiles = data?.profiles ?? new Map<string, Profile>();

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const signer = createSigner(identity);
      if (!signer) {
        return "Read-only — set up an identity in Settings to post.";
      }
      try {
        const event = await signer.sign(buildChannelMessage(channel.id, text));
        const result = await relay.publish(event);
        if (!result.ok) {
          return result.message || "relay rejected the message";
        }
        window.setTimeout(reload, 600);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "failed to publish";
      }
    },
    [identity, channel.id, relay, reload]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {channel.about && (
        <p className="text-[var(--bbs-dim)]">{truncate(channel.about, 120)}</p>
      )}
      <div className="bbs-scroll min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <Working label="Loading messages" />
        ) : error ? (
          <Notice tone="warn">relay error: {error}</Notice>
        ) : messages.length === 0 ? (
          <Notice>No messages yet — be the first to post.</Notice>
        ) : (
          <ol className="space-y-2">
            {messages.map((m) => {
              const profile = profiles.get(m.pubkey);
              const handle = deriveHandle(profile?.name, npubOf(m.pubkey));
              return (
                <li key={m.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[var(--bbs-secondary)]">
                      &lt;{handle}&gt;
                    </span>
                    <span className="text-[var(--bbs-info)] text-[0.85em]">
                      {relativeTime(m.createdAt, now.getTime())}
                    </span>
                  </div>
                  <div className="pl-2 text-[var(--bbs-fg)]">
                    {wrap(m.content, 96).map((line, idx) => (
                      <div key={idx}>{line || " "}</div>
                    ))}
                  </div>
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
        placeholder={`Message #${channel.section}…  (Ctrl+Enter to send)`}
      />
    </div>
  );
}
