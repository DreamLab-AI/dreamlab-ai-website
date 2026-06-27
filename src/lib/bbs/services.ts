/**
 * HTTP-side forum services (everything that is not the WebSocket relay):
 *   - Search API   (POST /search)
 *   - NIP-11 relay information document
 *   - Public whitelist check (so the BBS can tell a user if they may post)
 *
 * All calls fail soft: network/parse errors resolve to empty/neutral results
 * rather than throwing, so the terminal degrades gracefully when offline.
 */

import { relayHttpUrl } from "./env";

/** A single search hit (defensively normalised — the worker shape may vary). */
export interface SearchHit {
  id: string;
  content: string;
  pubkey: string;
  kind: number;
  createdAt: number;
  score: number;
}

/** NIP-11 relay information document (subset the BBS renders). */
export interface RelayInfo {
  name: string;
  description: string;
  software: string;
  version: string;
  supportedNips: number[];
  limitation: Record<string, unknown>;
}

/** Whether a pubkey is whitelisted to publish, and under which cohorts. */
export interface WhitelistStatus {
  whitelisted: boolean;
  cohorts: string[];
  checked: boolean;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

/** Full-text / semantic search over relay events. */
export async function search(
  searchApiUrl: string,
  query: string,
  limit = 25
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`${searchApiUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    const rows: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown[] }).results)
        ? (data as { results: unknown[] }).results
        : Array.isArray((data as { hits?: unknown[] }).hits)
          ? (data as { hits: unknown[] }).hits
          : [];
    return rows.map((row) => {
      const r = (row || {}) as Record<string, unknown>;
      return {
        id: String(r.id ?? r.event_id ?? ""),
        content: String(r.content ?? r.text ?? r.snippet ?? ""),
        pubkey: String(r.pubkey ?? r.author ?? ""),
        kind: toNumber(r.kind, 1),
        createdAt: toNumber(r.created_at ?? r.createdAt ?? r.timestamp, 0),
        score: toNumber(r.score ?? r.similarity ?? r.distance, 0),
      };
    });
  } catch {
    return [];
  }
}

/** Fetch the relay's NIP-11 information document. */
export async function fetchRelayInfo(
  relayWsUrl: string
): Promise<RelayInfo | null> {
  try {
    const res = await fetch(relayHttpUrl(relayWsUrl), {
      headers: { Accept: "application/nostr+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      name: String(data.name ?? "relay"),
      description: String(data.description ?? ""),
      software: String(data.software ?? ""),
      version: String(data.version ?? ""),
      supportedNips: Array.isArray(data.supported_nips)
        ? (data.supported_nips as number[])
        : [],
      limitation:
        (data.limitation as Record<string, unknown>) ?? ({} as Record<
          string,
          unknown
        >),
    };
  } catch {
    return null;
  }
}

/** Check whether a pubkey may publish (public endpoint, no auth). */
export async function checkWhitelist(
  relayWsUrl: string,
  pubkey: string
): Promise<WhitelistStatus> {
  const neutral: WhitelistStatus = {
    whitelisted: false,
    cohorts: [],
    checked: false,
  };
  if (!pubkey) return neutral;
  try {
    const url = `${relayHttpUrl(relayWsUrl)}/api/check-whitelist?pubkey=${pubkey}`;
    const res = await fetch(url);
    if (!res.ok) return neutral;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      whitelisted: data.whitelisted === true,
      cohorts: Array.isArray(data.cohorts) ? (data.cohorts as string[]) : [],
      checked: true,
    };
  } catch {
    return neutral;
  }
}
