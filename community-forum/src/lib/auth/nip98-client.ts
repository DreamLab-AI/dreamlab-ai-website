/**
 * NIP-98 HTTP Auth client — uses shared packages/nip98 module.
 * Retains fetchWithNip98() wrapper for the SvelteKit forum.
 */

import { createNip98Token } from '../../../packages/nip98/sign.js';

export { createNip98Token } from '../../../packages/nip98/sign.js';

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
  let bodyForToken: Uint8Array | ArrayBuffer | undefined;
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
