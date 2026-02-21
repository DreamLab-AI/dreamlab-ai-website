/**
 * NIP-98: HTTP Auth
 *
 * Implements HTTP authentication using Schnorr signatures over secp256k1.
 * Authorization header format: "Nostr <base64-encoded-event>"
 * Also supports "Basic <base64(nostr:token)>" for compatibility.
 *
 * The event must be kind 27235 with:
 *   - 'u' tag: URL being accessed
 *   - 'method' tag: HTTP method (or '*' for wildcard)
 *   - 'payload' tag (optional): SHA-256 hash of request body
 */

import crypto from 'crypto';
import { schnorr } from '@noble/curves/secp256k1';
import type { Request } from 'express';

const HTTP_AUTH_KIND = 27235;
const TIMESTAMP_TOLERANCE = 60; // seconds
const MAX_NOSTR_EVENT_SIZE = 64 * 1024;

interface Nip98Event {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Nostr ')) {
    return authHeader.slice(6).trim();
  }

  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      if (decoded.startsWith('nostr:')) {
        return decoded.slice(6);
      }
    } catch {
      return null;
    }
  }

  return null;
}

function decodeEvent(token: string): Nip98Event | null {
  try {
    if (token.length > MAX_NOSTR_EVENT_SIZE) return null;
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (decoded.length > MAX_NOSTR_EVENT_SIZE) return null;
    return JSON.parse(decoded) as Nip98Event;
  } catch {
    return null;
  }
}

function getTagValue(event: Nip98Event, tagName: string): string | null {
  if (!Array.isArray(event.tags)) return null;
  const tag = event.tags.find(t => Array.isArray(t) && t[0] === tagName);
  return tag ? tag[1] : null;
}

async function verifySignature(event: Nip98Event): Promise<boolean> {
  try {
    const msgHash = hexToBytes(event.id!);
    const sig = hexToBytes(event.sig);
    const pubkey = hexToBytes(event.pubkey);
    return schnorr.verify(sig, msgHash, pubkey);
  } catch {
    return false;
  }
}

/**
 * Verify NIP-98 Authorization header on an Express request.
 * Returns `{ pubkey }` on success, or `null` if authentication fails or is absent.
 */
export async function verifyNip98(req: Request): Promise<{ pubkey: string } | null> {
  const rawAuth = req.headers.authorization;
  const token = extractToken(rawAuth);
  if (!token) return null;

  const event = decodeEvent(token);
  if (!event) return null;

  // Kind must be 27235
  if (event.kind !== HTTP_AUTH_KIND) return null;

  // Timestamp within ±60 s
  const now = Math.floor(Date.now() / 1000);
  if (!event.created_at || Math.abs(now - event.created_at) > TIMESTAMP_TOLERANCE) return null;

  // Pubkey shape
  if (!event.pubkey || typeof event.pubkey !== 'string' || event.pubkey.length !== 64) return null;

  // Reconstruct full request URL
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] as string || req.headers.host || '';
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  // URL tag must match (exact match, or trailing slash normalization only)
  const eventUrl = getTagValue(event, 'u');
  if (!eventUrl) return null;

  const normalizedEvent = eventUrl.replace(/\/$/, '');
  const normalizedFull = fullUrl.replace(/\/$/, '');

  if (normalizedEvent !== normalizedFull) return null;

  // Method tag must match (or be wildcard)
  const eventMethod = getTagValue(event, 'method');
  if (eventMethod && eventMethod !== '*' && eventMethod.toUpperCase() !== req.method.toUpperCase()) {
    return null;
  }

  // Reject if event.id is missing or empty
  if (!event.id) return null;

  // Recompute event ID per NIP-01 canonical form and verify it matches
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const computedId = crypto.createHash('sha256').update(serialized).digest('hex');
  if (computedId.toLowerCase() !== event.id.toLowerCase()) return null;

  // Optional payload hash check — use raw body bytes, not JSON.stringify
  const payloadTag = getTagValue(event, 'payload');
  if (payloadTag) {
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) return null;
    const expectedHash = crypto.createHash('sha256').update(rawBody as unknown as Uint8Array).digest('hex');
    if (payloadTag.toLowerCase() !== expectedHash.toLowerCase()) return null;
  }

  // Verify Schnorr signature
  const valid = await verifySignature(event);
  if (!valid) return null;

  return { pubkey: event.pubkey };
}
