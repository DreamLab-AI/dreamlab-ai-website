/**
 * Edge-compatible NIP-98 verification for Cloudflare Workers.
 * Uses nostr-tools for core validation + DreamLab hardening.
 */

import { verifyEvent } from 'nostr-tools';

const HTTP_AUTH_KIND = 27235;
const TIMESTAMP_TOLERANCE = 60;
const MAX_EVENT_SIZE = 64 * 1024;

interface Nip98Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface VerifyOptions {
  url: string;
  method: string;
  rawBody?: ArrayBuffer;
  maxSize?: number;
}

function getTag(event: Nip98Event, name: string): string | null {
  const tag = event.tags?.find(t => t[0] === name);
  return tag?.[1] ?? null;
}

export async function verifyNip98(
  authHeader: string,
  opts: VerifyOptions,
): Promise<{ pubkey: string } | null> {
  if (!authHeader.startsWith('Nostr ')) return null;

  const token = authHeader.slice(6).trim();
  if (token.length > (opts.maxSize ?? MAX_EVENT_SIZE)) return null;

  let event: Nip98Event;
  try {
    const json = atob(token);
    if (json.length > MAX_EVENT_SIZE) return null;
    event = JSON.parse(json);
  } catch {
    return null;
  }

  if (event.kind !== HTTP_AUTH_KIND) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!event.created_at || Math.abs(now - event.created_at) > TIMESTAMP_TOLERANCE) return null;

  if (!event.pubkey || event.pubkey.length !== 64) return null;

  const eventUrl = getTag(event, 'u');
  if (!eventUrl) return null;
  if (eventUrl.replace(/\/$/, '') !== opts.url.replace(/\/$/, '')) return null;

  const eventMethod = getTag(event, 'method');
  if (!eventMethod || eventMethod.toUpperCase() !== opts.method.toUpperCase()) return null;

  // Verify event integrity via nostr-tools
  if (!verifyEvent(event as Parameters<typeof verifyEvent>[0])) return null;

  // Payload hash check — enforce hash presence when body exists
  const payloadTag = getTag(event, 'payload');
  if (opts.rawBody && opts.rawBody.byteLength > 0) {
    if (!payloadTag) return null; // Body present but no payload tag → reject
    const hashBuffer = await crypto.subtle.digest('SHA-256', opts.rawBody);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (payloadTag.toLowerCase() !== hashHex.toLowerCase()) return null;
  }

  return { pubkey: event.pubkey };
}
