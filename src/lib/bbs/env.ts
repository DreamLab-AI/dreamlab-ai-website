/**
 * Resolve BBS runtime configuration.
 *
 * Order of precedence:
 *   1. `window.__ENV__` (injected by deploy.yml into the forum/site shell)
 *   2. Vite `import.meta.env.VITE_*` (local dev / build-time)
 *   3. Hard-coded live defaults (so the BBS works even with no env wiring)
 *
 * Mirrors the same sources the Leptos forum client reads, keeping the two
 * clients pointed at one backend. See `forum-config/dreamlab.toml` and
 * `.github/workflows/deploy.yml`.
 */

import type { BbsConfig, Zone } from "./types";

interface WindowEnv {
  FORUM_NAME?: string;
  VITE_RELAY_URL?: string;
  VITE_AUTH_API_URL?: string;
  VITE_POD_API_URL?: string;
  VITE_SEARCH_API_URL?: string;
  BUILD_VERSION?: string;
  BUILD_HASH?: string;
  ZONE_CONFIG?: Zone[] | string;
}

declare global {
  interface Window {
    __ENV__?: WindowEnv;
  }
}

const DEFAULTS = {
  forumName: "DreamLab Community Forum",
  relayUrl: "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev",
  authApiUrl: "https://dreamlab-auth-api.solitary-paper-764d.workers.dev",
  podApiUrl: "https://dreamlab-pod-api.solitary-paper-764d.workers.dev",
  searchApiUrl: "https://dreamlab-search-api.solitary-paper-764d.workers.dev",
} as const;

/** Authored four-zone model fallback (matches dreamlab.toml `[[zones]]`). */
const DEFAULT_ZONES: Zone[] = [
  {
    id: "public",
    display_name: "Landing",
    required_cohorts: [],
    write_cohorts: ["members", "friends", "agent"],
    banner_image_url: "/images/heroes/lake-district-dawn.webp",
    visibility: "public",
    encrypted: false,
  },
  {
    id: "minimoonoir",
    display_name: "Minimoonoir",
    required_cohorts: ["friends"],
    banner_image_url: "/images/heroes/minimoonoir-hero.webp",
    visibility: "locked",
    encrypted: false,
  },
  {
    id: "family",
    display_name: "Family",
    required_cohorts: ["family"],
    banner_image_url: "/images/heroes/family-hero.webp",
    visibility: "locked",
    encrypted: true,
  },
  {
    id: "business",
    display_name: "DreamLab",
    required_cohorts: ["business"],
    banner_image_url: "/images/heroes/business-hero.webp",
    visibility: "locked",
    encrypted: false,
  },
];

/** Parse ZONE_CONFIG which may arrive as an array or a JSON string. */
export function parseZones(raw: Zone[] | string | undefined): Zone[] {
  if (!raw) return DEFAULT_ZONES;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return DEFAULT_ZONES;
    }
  }
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_ZONES;
  return value
    .filter((z): z is Record<string, unknown> => !!z && typeof z === "object")
    .map((z) => ({
      id: String(z.id ?? ""),
      display_name: String(z.display_name ?? z.id ?? "zone"),
      required_cohorts: Array.isArray(z.required_cohorts)
        ? (z.required_cohorts as string[])
        : [],
      write_cohorts: Array.isArray(z.write_cohorts)
        ? (z.write_cohorts as string[])
        : undefined,
      banner_image_url:
        typeof z.banner_image_url === "string" ? z.banner_image_url : undefined,
      visibility:
        z.visibility === "locked" || z.visibility === "hidden"
          ? z.visibility
          : "public",
      encrypted: z.encrypted === true,
    }))
    .filter((z) => z.id.length > 0);
}

function viteEnv(key: string): string | undefined {
  // import.meta.env is statically replaced by Vite; guard for test envs.
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  const value = env?.[key];
  return value && value.length > 0 ? value : undefined;
}

/** Resolve the effective BBS configuration. */
export function getBbsConfig(): BbsConfig {
  const w: WindowEnv =
    (typeof window !== "undefined" && window.__ENV__) || {};

  return {
    forumName: w.FORUM_NAME || DEFAULTS.forumName,
    relayUrl: w.VITE_RELAY_URL || viteEnv("VITE_RELAY_URL") || DEFAULTS.relayUrl,
    authApiUrl:
      w.VITE_AUTH_API_URL || viteEnv("VITE_AUTH_API_URL") || DEFAULTS.authApiUrl,
    podApiUrl:
      w.VITE_POD_API_URL || viteEnv("VITE_POD_API_URL") || DEFAULTS.podApiUrl,
    searchApiUrl:
      w.VITE_SEARCH_API_URL ||
      viteEnv("VITE_SEARCH_API_URL") ||
      DEFAULTS.searchApiUrl,
    buildVersion: w.BUILD_VERSION || "dev",
    buildHash: w.BUILD_HASH || "local",
    zones: parseZones(w.ZONE_CONFIG),
  };
}

/** Derive the relay's HTTPS origin from its wss:// URL (for NIP-11 / admin). */
export function relayHttpUrl(relayWsUrl: string): string {
  return relayWsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}
