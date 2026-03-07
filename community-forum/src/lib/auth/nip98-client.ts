/**
 * NIP-98 HTTP Auth client — uses shared packages/nip98 module.
 * Retains fetchWithNip98() wrapper for the SvelteKit forum.
 *
 * Supports two signing paths:
 *   1. Raw private key (passkey / local-key users) — via createNip98Token()
 *   2. NIP-07 browser extension — via window.nostr.signEvent()
 *
 * When privkey is omitted, auto-falls back to NIP-07 if available.
 */

import { createNip98Token } from '../../../packages/nip98/sign.js';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export { createNip98Token } from '../../../packages/nip98/sign.js';

/**
 * Create a NIP-98 token using the NIP-07 browser extension signer.
 * Requires window.nostr.signEvent() and window.nostr.getPublicKey().
 */
async function createNip98TokenWithNip07(
  url: string,
  method: string,
  body?: Uint8Array | ArrayBuffer,
): Promise<string> {
  if (typeof window === 'undefined' || !window.nostr?.signEvent || !window.nostr?.getPublicKey) {
    throw new Error('NIP-07 extension not available for NIP-98 signing');
  }

  const pubkey = await window.nostr.getPublicKey();

  const tags: string[][] = [
    ['u', url],
    ['method', method],
  ];

  if (body) {
    const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
    tags.push(['payload', bytesToHex(sha256(bytes))]);
  }

  const unsigned = {
    kind: 27235,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    pubkey,
  };

  const signed = await window.nostr.signEvent(unsigned);
  return btoa(JSON.stringify(signed));
}

/** Compute body bytes for the NIP-98 payload hash tag. */
function extractBodyForToken(rawBody: BodyInit | null | undefined): Uint8Array | ArrayBuffer | undefined {
  if (rawBody === undefined || rawBody === null) {
    return undefined;
  } else if (typeof rawBody === 'string') {
    return new TextEncoder().encode(rawBody);
  } else if (rawBody instanceof ArrayBuffer) {
    return rawBody;
  } else if (rawBody instanceof Uint8Array) {
    return rawBody;
  }
  // FormData, URLSearchParams, Blob, ReadableStream — skip payload hash
  return undefined;
}

/**
 * Fetch with NIP-98 Authorization header.
 *
 * If `privkey` is provided, signs with the raw key (fastest path).
 * Otherwise falls back to the NIP-07 browser extension.
 */
export async function fetchWithNip98(
  url: string,
  options: RequestInit = {},
  privkey?: Uint8Array,
): Promise<Response> {
  const method = options.method ?? 'GET';
  const bodyForToken = extractBodyForToken(options.body);

  let token: string;
  if (privkey) {
    token = await createNip98Token(privkey, url, method, bodyForToken);
  } else {
    token = await createNip98TokenWithNip07(url, method, bodyForToken);
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Nostr ${token}`,
    },
  });
}
