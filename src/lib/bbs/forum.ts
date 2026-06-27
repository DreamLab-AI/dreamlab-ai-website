/**
 * Higher-level forum operations built on the relay client.
 *
 * Maps raw Nostr events to the BBS domain model:
 *   - kind 40 → Channel   ("section" channels, NIP-28)
 *   - kind 42 → Post      (channel message, references its channel via #e)
 *   - kind  1 → Post      (text note / feed item)
 *   - kind  0 → Profile   (replaceable metadata)
 *
 * Channel→zone mapping is enforced server-side (admin-only to read), so the
 * BBS groups channels client-side by their `section` slug prefix ("area"),
 * which is the richest grouping readable without admin rights.
 */

import type {
  Channel,
  EventTemplate,
  NostrEvent,
  Post,
  Profile,
} from "./types";
import { KIND } from "./types";
import type { RelayClient } from "./relay";

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function tagValue(tags: string[][], name: string): string | undefined {
  const found = tags.find((t) => t[0] === name);
  return found ? found[1] : undefined;
}

/** The area prefix derived from a section slug (`dreamlab-general` → `dreamlab`). */
export function areaOf(section: string): string {
  if (!section) return "general";
  const idx = section.indexOf("-");
  return idx === -1 ? section : section.slice(0, idx);
}

/** Parse a kind-40 channel event into a Channel, or null if malformed. */
export function parseChannel(ev: NostrEvent): Channel | null {
  if (ev.kind !== KIND.CHANNEL) return null;
  const section = tagValue(ev.tags, "section") || "";
  let name = "";
  let about = "";
  let picture = "";
  try {
    const meta = JSON.parse(ev.content) as {
      name?: string;
      about?: string;
      picture?: string;
    };
    name = meta.name || "";
    about = meta.about || "";
    picture = meta.picture || "";
  } catch {
    /* non-JSON content — leave fields empty */
  }
  return {
    id: ev.id,
    section,
    area: areaOf(section),
    name: name || section || ev.id.slice(0, 8),
    about,
    picture,
    createdAt: ev.created_at,
    creator: ev.pubkey,
  };
}

/** Map a kind-1 / kind-42 event to a Post. */
export function eventToPost(ev: NostrEvent): Post {
  const eTags = ev.tags.filter((t) => t[0] === "e");
  let channelId: string | undefined;
  let replyTo: string | undefined;
  for (const t of eTags) {
    const marker = t[3];
    if (marker === "root") channelId = t[1];
    else if (marker === "reply") replyTo = t[1];
  }
  // Fallback: first #e is the channel/root for kind-42 channel messages.
  if (!channelId && ev.kind === KIND.CHANNEL_MESSAGE && eTags[0]) {
    channelId = eTags[0][1];
  }
  if (!replyTo && eTags.length > 0 && !channelId) {
    replyTo = eTags[0][1];
  }
  return {
    id: ev.id,
    pubkey: ev.pubkey,
    content: ev.content,
    createdAt: ev.created_at,
    kind: ev.kind,
    channelId,
    replyTo,
  };
}

/** Map a kind-0 event to a Profile. */
export function eventToProfile(ev: NostrEvent): Profile {
  let name = "";
  let about = "";
  let picture = "";
  let nip05 = "";
  try {
    const meta = JSON.parse(ev.content) as Record<string, unknown>;
    name = String(meta.name || meta.display_name || meta.displayName || "");
    about = String(meta.about || "");
    picture = String(meta.picture || "");
    nip05 = String(meta.nip05 || "");
  } catch {
    /* ignore malformed metadata */
  }
  return { pubkey: ev.pubkey, name, about, picture, nip05, updatedAt: ev.created_at };
}

/** Keep only the newest event per pubkey (for replaceable kinds like 0). */
export function latestByPubkey(events: NostrEvent[]): NostrEvent[] {
  const byKey = new Map<string, NostrEvent>();
  for (const ev of events) {
    const prev = byKey.get(ev.pubkey);
    if (!prev || ev.created_at > prev.created_at) byKey.set(ev.pubkey, ev);
  }
  return [...byKey.values()];
}

/** Deduplicate events by id, preserving order. */
export function dedupeById(events: NostrEvent[]): NostrEvent[] {
  const seen = new Set<string>();
  const out: NostrEvent[] = [];
  for (const ev of events) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    out.push(ev);
  }
  return out;
}

/** Group channels by area prefix, sorted by area then name. */
export function groupChannelsByArea(
  channels: Channel[]
): { area: string; channels: Channel[] }[] {
  const map = new Map<string, Channel[]>();
  for (const c of channels) {
    const list = map.get(c.area) || [];
    list.push(c);
    map.set(c.area, list);
  }
  return [...map.entries()]
    .map(([area, list]) => ({
      area,
      channels: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.area.localeCompare(b.area));
}

/* --------------------------------- reads --------------------------------- */

/** Fetch all channels (kind-40 sections). */
export async function fetchChannels(relay: RelayClient): Promise<Channel[]> {
  const events = await relay.query([{ kinds: [KIND.CHANNEL], limit: 300 }]);
  return events
    .map(parseChannel)
    .filter((c): c is Channel => c !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Fetch messages in a channel (kind-42 referencing the channel via #e). */
export async function fetchChannelMessages(
  relay: RelayClient,
  channelId: string,
  limit = 200
): Promise<Post[]> {
  const events = await relay.query([
    { kinds: [KIND.CHANNEL_MESSAGE], "#e": [channelId], limit },
  ]);
  return dedupeById(events)
    .map(eventToPost)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Fetch a recent feed of notes + channel messages (newest first). */
export async function fetchRecentPosts(
  relay: RelayClient,
  limit = 40
): Promise<Post[]> {
  const events = await relay.query([
    { kinds: [KIND.NOTE, KIND.CHANNEL_MESSAGE], limit },
  ]);
  return dedupeById(events)
    .map(eventToPost)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/** Fetch recent profiles (kind-0), newest metadata per author. */
export async function fetchProfiles(
  relay: RelayClient,
  limit = 100
): Promise<Profile[]> {
  const events = await relay.query([{ kinds: [KIND.PROFILE], limit }]);
  return latestByPubkey(events)
    .map(eventToProfile)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Fetch profiles for a specific set of pubkeys. */
export async function fetchProfilesFor(
  relay: RelayClient,
  pubkeys: string[]
): Promise<Map<string, Profile>> {
  const unique = [...new Set(pubkeys)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const events = await relay.query([
    { kinds: [KIND.PROFILE], authors: unique, limit: unique.length * 2 },
  ]);
  const map = new Map<string, Profile>();
  for (const ev of latestByPubkey(events)) {
    map.set(ev.pubkey, eventToProfile(ev));
  }
  return map;
}

/* -------------------------------- builders -------------------------------- */

/** Build a kind-42 channel message template. */
export function buildChannelMessage(
  channelId: string,
  text: string
): EventTemplate {
  return {
    kind: KIND.CHANNEL_MESSAGE,
    created_at: nowSec(),
    tags: [["e", channelId, "", "root"]],
    content: text,
  };
}

/** Build a kind-1 text note template (optionally hashtag-tagged). */
export function buildNote(text: string, hashtags: string[] = []): EventTemplate {
  return {
    kind: KIND.NOTE,
    created_at: nowSec(),
    tags: hashtags.map((t) => ["t", t]),
    content: text,
  };
}

/** Build a kind-7 reaction to a target event. */
export function buildReaction(
  targetId: string,
  targetPubkey: string,
  symbol = "+"
): EventTemplate {
  return {
    kind: KIND.REACTION,
    created_at: nowSec(),
    tags: [
      ["e", targetId],
      ["p", targetPubkey],
    ],
    content: symbol,
  };
}
