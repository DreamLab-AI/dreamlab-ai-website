import { verifyEvent } from 'nostr-tools';
import type { VerifyOptions, VerifyResult, Nip98Event } from './types.js';

const HTTP_AUTH_KIND = 27235;
const TIMESTAMP_TOLERANCE = 60;
const MAX_EVENT_SIZE = 64 * 1024;

function extractToken(authHeader: string, allowBasicNostr: boolean): string | null {
  if (authHeader.startsWith('Nostr ')) {
    return authHeader.slice(6).trim();
  }
  if (allowBasicNostr && authHeader.startsWith('Basic ')) {
    try {
      const decoded = typeof Buffer !== 'undefined'
        ? Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
        : atob(authHeader.slice(6));
      if (decoded.startsWith('nostr:')) return decoded.slice(6);
    } catch { /* ignore */ }
  }
  return null;
}

function decodeEvent(token: string): Nip98Event | null {
  try {
    if (token.length > MAX_EVENT_SIZE) return null;
    const json = typeof Buffer !== 'undefined'
      ? Buffer.from(token, 'base64').toString('utf8')
      : atob(token);
    if (json.length > MAX_EVENT_SIZE) return null;
    return JSON.parse(json) as Nip98Event;
  } catch {
    return null;
  }
}

function getTag(event: Nip98Event, name: string): string | null {
  const tag = event.tags?.find(t => Array.isArray(t) && t[0] === name);
  return tag ? tag[1] ?? null : null;
}

export async function verifyNip98(
  authHeader: string,
  opts: VerifyOptions,
): Promise<VerifyResult | null> {
  const maxSize = opts.maxSize ?? MAX_EVENT_SIZE;
  if (authHeader.length > maxSize) return null;

  const token = extractToken(authHeader, opts.allowBasicNostr ?? false);
  if (!token) return null;

  const event = decodeEvent(token);
  if (!event) return null;

  // Kind 27235
  if (event.kind !== HTTP_AUTH_KIND) return null;

  // Timestamp ±60s
  const now = Math.floor(Date.now() / 1000);
  if (!event.created_at || Math.abs(now - event.created_at) > TIMESTAMP_TOLERANCE) return null;

  // Pubkey shape
  if (!event.pubkey || event.pubkey.length !== 64) return null;

  // URL tag
  const eventUrl = getTag(event, 'u');
  if (!eventUrl) return null;

  const normalizedEvent = eventUrl.replace(/\/$/, '');
  const normalizedOpts = opts.url.replace(/\/$/, '');

  let urlMatch = normalizedEvent === normalizedOpts;
  if (!urlMatch && opts.allowUrlPrefix) {
    urlMatch = normalizedOpts.startsWith(normalizedEvent + '/');
  }
  if (!urlMatch) return null;

  // Method tag
  const eventMethod = getTag(event, 'method');
  if (!eventMethod) return null;
  if (eventMethod !== '*' || !opts.allowMethodWildcard) {
    if (eventMethod.toUpperCase() !== opts.method.toUpperCase()) {
      if (!(opts.allowMethodWildcard && eventMethod === '*')) return null;
    }
  }

  // Verify event integrity (id + sig) via nostr-tools
  if (!verifyEvent(event as any)) return null;

  // Payload hash check against raw body bytes
  const payloadTag = getTag(event, 'payload');
  if (payloadTag && opts.rawBody) {
    const bytes = opts.rawBody instanceof ArrayBuffer
      ? new Uint8Array(opts.rawBody)
      : new Uint8Array(opts.rawBody);
    // Use Web Crypto for cross-platform compat (Node 18+, Workers, browsers)
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (payloadTag.toLowerCase() !== hashHex.toLowerCase()) return null;
  }

  return { pubkey: event.pubkey, didNostr: `did:nostr:${event.pubkey.toLowerCase()}` };
}

export function hasNostrAuth(authHeader: string | undefined): boolean {
  if (!authHeader) return false;
  if (authHeader.startsWith('Nostr ')) return true;
  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = typeof Buffer !== 'undefined'
        ? Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
        : atob(authHeader.slice(6));
      return decoded.startsWith('nostr:');
    } catch { return false; }
  }
  return false;
}
