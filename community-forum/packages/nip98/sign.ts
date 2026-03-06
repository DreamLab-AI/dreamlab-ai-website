import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Create a NIP-98 HTTP Auth token.
 *
 * We construct the kind:27235 event directly instead of using nostr-tools'
 * getToken() because its hashPayload() wraps the value in JSON.stringify()
 * before hashing, producing SHA-256('"hash"') instead of the plain
 * SHA-256(body) that servers expect per the NIP-98 spec.
 */
export async function createNip98Token(
  privkey: Uint8Array,
  url: string,
  method: string,
  body?: Uint8Array | ArrayBuffer,
): Promise<string> {
  const event: EventTemplate = {
    kind: 27235,
    tags: [
      ['u', url],
      ['method', method],
    ],
    created_at: Math.floor(Date.now() / 1000),
    content: '',
  };

  if (body) {
    const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
    event.tags.push(['payload', bytesToHex(sha256(bytes))]);
  }

  const signed = finalizeEvent(event, privkey);
  return btoa(JSON.stringify(signed));
}
