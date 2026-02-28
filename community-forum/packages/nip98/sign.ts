import { getToken } from 'nostr-tools/nip98';
import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export function createSigner(privkey: Uint8Array) {
  return (event: EventTemplate) => finalizeEvent(event, privkey);
}

export async function hashRawBody(body: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
  return bytesToHex(sha256(bytes));
}

export async function createNip98Token(
  privkey: Uint8Array,
  url: string,
  method: string,
  body?: Uint8Array | ArrayBuffer,
): Promise<string> {
  const payload = body ? await hashRawBody(body) : undefined;
  return getToken(url, method, createSigner(privkey), true, payload);
}
