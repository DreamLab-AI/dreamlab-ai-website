import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';

/** Create a NIP-98 kind:27235 Authorization token for an HTTP request */
export async function createNip98Token(
  privkey: Uint8Array,
  url: string,
  method: string,
  body?: string | Uint8Array | ArrayBuffer,
): Promise<string> {
  const pubkey = getPublicKey(privkey);
  const created_at = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ['u', url],
    ['method', method.toUpperCase()],
  ];

  if (body !== undefined) {
    let bytes: Uint8Array;
    if (typeof body === 'string') {
      bytes = new TextEncoder().encode(body);
    } else if (body instanceof ArrayBuffer) {
      bytes = new Uint8Array(body);
    } else {
      bytes = body;
    }
    const hash = bytesToHex(sha256(bytes));
    tags.push(['payload', hash]);
  }

  const event: Nip98Event = {
    pubkey,
    created_at,
    kind: 27235,
    tags,
    content: '',
  };

  const id = computeEventId(event);
  const sig = bytesToHex(schnorr.sign(hexToBytes(id), privkey));

  const signedEvent = { ...event, id, sig };
  return btoa(JSON.stringify(signedEvent));
}

/** Fetch with NIP-98 Authorization header */
export async function fetchWithNip98(
  url: string,
  options: RequestInit = {},
  privkey: Uint8Array,
): Promise<Response> {
  const method = options.method ?? 'GET';

  // Compute body payload for the NIP-98 token only for hashable body types.
  // ReadableStream and FormData cannot be consumed without side-effects, so
  // we skip the `payload` tag for those types.
  let bodyForToken: string | Uint8Array | ArrayBuffer | undefined;
  const rawBody = options.body;
  if (rawBody === undefined || rawBody === null) {
    bodyForToken = undefined;
  } else if (typeof rawBody === 'string') {
    bodyForToken = new TextEncoder().encode(rawBody);
  } else if (rawBody instanceof ArrayBuffer) {
    bodyForToken = rawBody;
  } else if (rawBody instanceof Uint8Array) {
    bodyForToken = rawBody;
  } else {
    // FormData, URLSearchParams, Blob, ReadableStream — skip payload hash
    bodyForToken = undefined;
  }

  const token = await createNip98Token(privkey, url, method, bodyForToken);
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Nostr ${token}`,
    },
  });
}

// ── Internals ────────────────────────────────────────────────────────────────

interface Nip98Event {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

function computeEventId(event: Nip98Event): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}
