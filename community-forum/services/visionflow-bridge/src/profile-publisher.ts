/**
 * Profile Publisher
 *
 * Publishes kind 0 profile metadata events for each agent identity
 * so they appear as named contacts in the forum's DM interface.
 */

import { type UnsignedEvent, finalizeEvent, getPublicKey } from 'nostr-tools';
import { type AgentIdentity } from './config';
import { NostrClient } from './nostr-client';

/** NIP-01 kind 0 profile content */
interface ProfileContent {
  name: string;
  about: string;
  picture?: string;
  nip05?: string;
  lud16?: string;
  banner?: string;
}

const TIER_AVATARS: Record<number, string> = {
  1: 'https://dreamlab-ai.com/images/agents/tier1-general.webp',
  2: 'https://dreamlab-ai.com/images/agents/tier2-claude.webp',
  3: 'https://dreamlab-ai.com/images/agents/tier3-visionflow.webp',
};

/**
 * Publish kind 0 profile metadata for an agent identity.
 */
export async function publishAgentProfile(
  agent: AgentIdentity,
  client: NostrClient
): Promise<void> {
  const profileContent: ProfileContent = {
    name: agent.name,
    about: agent.about,
    picture: TIER_AVATARS[agent.tier],
  };

  const event: UnsignedEvent = {
    kind: 0,
    pubkey: getPublicKey(agent.privkey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profileContent),
  };

  const signedEvent = finalizeEvent(event, agent.privkey);

  try {
    await client.publish(signedEvent);
    console.log(
      `[Profile] Published profile for Tier ${agent.tier}: ${agent.name} (${agent.pubkey.slice(0, 12)}...)`
    );
  } catch (error) {
    console.error(
      `[Profile] Failed to publish profile for Tier ${agent.tier}:`,
      (error as Error).message
    );
  }
}

/**
 * Publish profiles for all agent identities.
 */
export async function publishAllProfiles(
  agents: AgentIdentity[],
  client: NostrClient
): Promise<void> {
  for (const agent of agents) {
    await publishAgentProfile(agent, client);
  }
}
