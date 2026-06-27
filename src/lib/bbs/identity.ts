/**
 * Identity & signing for the BBS.
 *
 * Three identity kinds:
 *   - `anon`  : read-only; cannot publish.
 *   - `local` : a secp256k1 key held in the browser (generated or imported as
 *               an nsec). Convenient for a BBS session; the key lives in
 *               localStorage, so it is appropriate for throwaway / low-value
 *               identities, not high-value custody.
 *   - `nip07` : a browser extension (window.nostr) holds the key and signs;
 *               the BBS never sees the secret.
 *
 * Publishing to the DreamLab relay additionally requires the pubkey to be
 * whitelisted (the relay enforces `restricted_writes`). The BBS surfaces the
 * relay's rejection rather than pretending otherwise.
 */

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";
import * as nip19 from "nostr-tools/nip19";
import type { EventTemplate, Identity, NostrEvent } from "./types";
import { deriveHandle } from "./format";

const STORAGE_KEY = "dreamlab.bbs.identity";

/** Minimal NIP-07 browser-extension surface. */
interface Nip07Provider {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate & { pubkey: string }): Promise<NostrEvent>;
}

declare global {
  interface Window {
    nostr?: Nip07Provider;
  }
}

/** A signer abstracts how an identity produces signed events. */
export interface Signer {
  pubkey: string;
  sign(template: EventTemplate): Promise<NostrEvent>;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, "");
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

/** True if a string is a 64-character lowercase-able hex key. */
export function isHexKey(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value.trim());
}

/** npub encode a hex pubkey (returns "" on failure). */
export function npubOf(pubkeyHex: string): string {
  try {
    return pubkeyHex ? nip19.npubEncode(pubkeyHex) : "";
  } catch {
    return "";
  }
}

/** nsec encode a hex secret key for export (returns "" on failure). */
export function nsecOf(secretHex: string): string {
  try {
    return secretHex ? nip19.nsecEncode(hexToBytes(secretHex)) : "";
  } catch {
    return "";
  }
}

/** The read-only anonymous identity. */
export function anonIdentity(): Identity {
  return { kind: "anon", pubkey: "", npub: "", handle: "guest" };
}

function identityFromSecretBytes(sk: Uint8Array): Identity {
  const pubkey = getPublicKey(sk);
  const npub = npubOf(pubkey);
  return {
    kind: "local",
    pubkey,
    npub,
    handle: deriveHandle(undefined, npub),
    secretHex: bytesToHex(sk),
  };
}

/** Generate a fresh local identity. */
export function generateLocalIdentity(): Identity {
  return identityFromSecretBytes(generateSecretKey());
}

/**
 * Import an identity from an `nsec1…` bech32 string or a 64-char hex secret.
 * Throws on invalid input.
 */
export function importSecret(input: string): Identity {
  const value = input.trim();
  if (isHexKey(value)) {
    return identityFromSecretBytes(hexToBytes(value));
  }
  const decoded = nip19.decode(value);
  if (decoded.type !== "nsec") {
    throw new Error("Not an nsec or hex secret key");
  }
  return identityFromSecretBytes(decoded.data as Uint8Array);
}

/** Whether a NIP-07 signing extension is available. */
export function hasNip07(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

/** Connect to the NIP-07 extension and adopt its identity. */
export async function connectNip07(): Promise<Identity> {
  if (!hasNip07() || !window.nostr) {
    throw new Error("No NIP-07 extension found");
  }
  const pubkey = await window.nostr.getPublicKey();
  if (!isHexKey(pubkey)) throw new Error("Extension returned an invalid pubkey");
  const npub = npubOf(pubkey);
  return {
    kind: "nip07",
    pubkey,
    npub,
    handle: deriveHandle(undefined, npub),
  };
}

/** Build a signer for an identity, or null if it cannot sign (anon). */
export function createSigner(identity: Identity): Signer | null {
  if (identity.kind === "local" && identity.secretHex) {
    const sk = hexToBytes(identity.secretHex);
    return {
      pubkey: identity.pubkey,
      async sign(template) {
        return finalizeEvent(template, sk) as NostrEvent;
      },
    };
  }
  if (identity.kind === "nip07") {
    return {
      pubkey: identity.pubkey,
      async sign(template) {
        if (!window.nostr) throw new Error("NIP-07 extension unavailable");
        return window.nostr.signEvent({ ...template, pubkey: identity.pubkey });
      },
    };
  }
  return null;
}

/** Persist the identity to localStorage (best-effort). */
export function saveIdentity(identity: Identity): void {
  try {
    if (identity.kind === "anon") {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* storage unavailable — session-only identity */
  }
}

/** Load a persisted identity, or the anon identity if none/invalid. */
export function loadIdentity(): Identity {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return anonIdentity();
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (
      (parsed.kind === "local" || parsed.kind === "nip07") &&
      isHexKey(parsed.pubkey || "")
    ) {
      return {
        kind: parsed.kind,
        pubkey: parsed.pubkey as string,
        npub: parsed.npub || npubOf(parsed.pubkey as string),
        handle: parsed.handle || deriveHandle(undefined, parsed.npub || ""),
        secretHex: parsed.kind === "local" ? parsed.secretHex : undefined,
      };
    }
  } catch {
    /* fall through to anon */
  }
  return anonIdentity();
}

/** Clear the persisted identity. */
export function clearIdentity(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
