/**
 * NIP-17/NIP-59 Gift-Wrapped Direct Messages (server-side)
 *
 * Mirrors the client-side dm.ts but uses nostr-tools directly
 * without SvelteKit dependencies.
 *
 * Flow:
 *   Receive: kind 1059 (gift wrap) → decrypt → kind 13 (seal) → decrypt → kind 14 (rumor)
 *   Send:    kind 14 (rumor) → encrypt as seal → encrypt as gift wrap → publish kind 1059
 */

import {
  type Event,
  type UnsignedEvent,
  nip44,
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from 'nostr-tools';

const KIND_SEALED_RUMOR = 14;
const KIND_GIFT_WRAP = 1059;
const KIND_SEAL = 13;
const TWO_DAYS_SECONDS = 2 * 24 * 60 * 60;

/** Result of unwrapping a received DM */
export interface UnwrappedDM {
  content: string;
  senderPubkey: string;
  timestamp: number;
  /** The agent pubkey this DM was addressed to (from the gift wrap 'p' tag) */
  recipientPubkey: string;
}

/**
 * Unwrap a gift-wrapped DM received by one of the agent identities.
 *
 * @param giftWrapEvent - The kind 1059 event from the relay
 * @param recipientPrivkey - The agent's private key (to decrypt)
 * @returns Unwrapped DM content, or null if decryption fails
 */
export function unwrapDM(
  giftWrapEvent: Event,
  recipientPrivkey: Uint8Array
): UnwrappedDM | null {
  try {
    if (giftWrapEvent.kind !== KIND_GIFT_WRAP) {
      return null;
    }

    // Extract intended recipient from gift wrap 'p' tag
    const pTag = giftWrapEvent.tags.find(t => t[0] === 'p');
    const recipientPubkey = pTag ? pTag[1] : '';

    // Step 1: Decrypt gift wrap → seal
    const wrapConversationKey = nip44.v2.utils.getConversationKey(
      recipientPrivkey,
      giftWrapEvent.pubkey // Random pubkey used for wrapping
    );

    const sealJson = nip44.v2.decrypt(giftWrapEvent.content, wrapConversationKey);
    const seal = JSON.parse(sealJson) as Event;

    if (seal.kind !== KIND_SEAL) {
      return null;
    }

    // Step 2: Decrypt seal → rumor
    const sealConversationKey = nip44.v2.utils.getConversationKey(
      recipientPrivkey,
      seal.pubkey // Real sender's pubkey
    );

    const rumorJson = nip44.v2.decrypt(seal.content, sealConversationKey);
    const rumor = JSON.parse(rumorJson) as UnsignedEvent;

    if (rumor.kind !== KIND_SEALED_RUMOR) {
      return null;
    }

    return {
      content: rumor.content,
      senderPubkey: rumor.pubkey,
      timestamp: rumor.created_at,
      recipientPubkey,
    };
  } catch (error) {
    console.error('[DM] Failed to unwrap DM:', (error as Error).message);
    return null;
  }
}

/**
 * Create and sign a gift-wrapped DM to send back to a user.
 *
 * @param content - The response message text
 * @param recipientPubkey - The user's pubkey (to encrypt for)
 * @param senderPrivkey - The agent's private key (to sign as)
 * @returns Signed gift wrap event ready to publish
 */
export function wrapDM(
  content: string,
  recipientPubkey: string,
  senderPrivkey: Uint8Array
): Event {
  const senderPubkey = getPublicKey(senderPrivkey);
  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Step 1: Create the rumor (unsigned inner event - kind 14)
  const rumor: UnsignedEvent = {
    kind: KIND_SEALED_RUMOR,
    pubkey: senderPubkey,
    created_at: currentTimestamp,
    tags: [['p', recipientPubkey]],
    content,
  };

  // Step 2: Encrypt rumor as seal (kind 13)
  const senderRecipientKey = nip44.v2.utils.getConversationKey(
    senderPrivkey,
    recipientPubkey
  );

  const sealContent = nip44.v2.encrypt(JSON.stringify(rumor), senderRecipientKey);

  const seal: UnsignedEvent = {
    kind: KIND_SEAL,
    pubkey: senderPubkey,
    created_at: currentTimestamp,
    tags: [],
    content: sealContent,
  };

  const signedSeal = finalizeEvent(seal, senderPrivkey);

  // Step 3: Generate random keypair for gift wrap
  const randomPrivkey = generateSecretKey();
  const randomPubkey = getPublicKey(randomPrivkey);

  // Step 4: Fuzz timestamp by +/- 2 days
  const fuzzOffset = Math.floor(Math.random() * (2 * TWO_DAYS_SECONDS)) - TWO_DAYS_SECONDS;
  const fuzzedTimestamp = currentTimestamp + fuzzOffset;

  // Step 5: Encrypt seal for recipient using random key
  const randomRecipientKey = nip44.v2.utils.getConversationKey(
    randomPrivkey,
    recipientPubkey
  );

  const giftWrapContent = nip44.v2.encrypt(
    JSON.stringify(signedSeal),
    randomRecipientKey
  );

  // Step 6: Create and sign the gift wrap (kind 1059)
  const giftWrap: UnsignedEvent = {
    kind: KIND_GIFT_WRAP,
    pubkey: randomPubkey,
    created_at: fuzzedTimestamp,
    tags: [['p', recipientPubkey]],
    content: giftWrapContent,
  };

  return finalizeEvent(giftWrap, randomPrivkey);
}

/**
 * Create a subscription filter for receiving DMs addressed to a pubkey.
 */
export function createDMFilter(agentPubkey: string): Record<string, unknown> {
  return {
    kinds: [KIND_GIFT_WRAP],
    '#p': [agentPubkey],
  };
}
