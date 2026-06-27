/**
 * Shared types for the BBS (ASCII terminal) interface — a retro
 * bulletin-board-style parallel client for the DreamLab Nostr forum.
 *
 * The BBS speaks the same NIP-01 relay protocol as the Leptos forum at
 * `/community/`; these types model the wire events and the higher-level
 * forum concepts (zones, channels, posts, profiles) the screens render.
 */

/** A signed Nostr event as it travels over the relay wire (NIP-01). */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** An unsigned event template handed to a signer. */
export interface EventTemplate {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

/** Nostr event kinds the BBS reads or writes. */
export const KIND = {
  PROFILE: 0,
  NOTE: 1,
  REACTION: 7,
  CHANNEL: 40,
  CHANNEL_META: 41,
  CHANNEL_MESSAGE: 42,
  AUTH: 22242,
  NIP98: 27235,
} as const;

/** Subscription filter (NIP-01). */
export interface RelayFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  /** Tag filters, e.g. `{ '#e': [channelId] }`. */
  [tag: `#${string}`]: string[] | undefined;
}

/** A forum zone as projected from `window.__ENV__.ZONE_CONFIG`. */
export interface Zone {
  id: string;
  display_name: string;
  required_cohorts: string[];
  write_cohorts?: string[];
  banner_image_url?: string;
  visibility: "public" | "locked" | "hidden";
  encrypted: boolean;
}

/** A kind-40 channel ("section") parsed into a friendly record. */
export interface Channel {
  /** The kind-40 event id (used as `#e` reference for messages). */
  id: string;
  /** The `section` tag slug, e.g. `dreamlab-general`. */
  section: string;
  /** Area prefix derived from the section slug, e.g. `dreamlab`. */
  area: string;
  name: string;
  about: string;
  picture: string;
  createdAt: number;
  creator: string;
}

/** A message or post rendered in a thread / feed. */
export interface Post {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  kind: number;
  /** Parent channel id (kind-42) if any. */
  channelId?: string;
  /** Parent event id this is a reply to, if any. */
  replyTo?: string;
}

/** A kind-0 profile rendered in the user list. */
export interface Profile {
  pubkey: string;
  name: string;
  about: string;
  picture: string;
  nip05: string;
  updatedAt: number;
}

/** Runtime configuration resolved from window.__ENV__ / Vite env / defaults. */
export interface BbsConfig {
  forumName: string;
  relayUrl: string;
  authApiUrl: string;
  podApiUrl: string;
  searchApiUrl: string;
  buildVersion: string;
  buildHash: string;
  zones: Zone[];
}

/** Connection lifecycle states for the relay socket. */
export type RelayStatus =
  | "idle"
  | "connecting"
  | "online"
  | "authenticating"
  | "error"
  | "closed";

/** How the active identity can sign events. */
export type SignerKind = "anon" | "local" | "nip07";

/** The active BBS identity. `anon` users can read but not publish. */
export interface Identity {
  kind: SignerKind;
  /** Hex public key, or empty for a brand-new anon session. */
  pubkey: string;
  /** npub bech32 form for display. */
  npub: string;
  /** Display handle (from profile or derived from npub). */
  handle: string;
  /**
   * Hex secret key for `local` identities. Never set for `nip07` (the
   * extension holds the key) or `anon`.
   */
  secretHex?: string;
}

/** Top-level BBS screens, mirroring the WILDCAT main menu. */
export type ScreenId =
  | "menu"
  | "messages"
  | "files"
  | "nodes"
  | "users"
  | "chat"
  | "doors"
  | "code"
  | "sysinfo"
  | "settings"
  | "help";

/** Available terminal color themes. */
export type ThemeId = "amber" | "green" | "purple" | "sky";
