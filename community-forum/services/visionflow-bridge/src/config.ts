import dotenv from 'dotenv';
import { getPublicKey } from 'nostr-tools';

dotenv.config();

/** Agent tier levels */
export type AgentTier = 1 | 2 | 3;

/** Configuration for a single agent identity */
export interface AgentIdentity {
  tier: AgentTier;
  name: string;
  about: string;
  privkey: Uint8Array;
  pubkey: string;
}

/** Cohorts that grant access to each tier */
export const TIER_REQUIRED_COHORTS: Record<AgentTier, string[]> = {
  // Tier 1: Any authenticated/whitelisted user
  1: [],
  // Tier 2: Business users, trainers, trainees, cross-access
  2: ['business', 'trainers', 'trainees', 'minimoonoir-business', 'cross-access', 'admin'],
  // Tier 3: Admin and cross-access only (plus explicit visionflow-full cohort)
  3: ['cross-access', 'admin', 'visionflow-full'],
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function loadAgentIdentity(tier: AgentTier): AgentIdentity {
  const privkeyHex = process.env[`AGENT_TIER${tier}_PRIVKEY`];
  if (!privkeyHex) {
    throw new Error(`Missing AGENT_TIER${tier}_PRIVKEY environment variable`);
  }

  if (!/^[0-9a-f]{64}$/i.test(privkeyHex)) {
    throw new Error(`Invalid AGENT_TIER${tier}_PRIVKEY: must be 64-char hex`);
  }

  const privkey = hexToBytes(privkeyHex);
  const pubkey = getPublicKey(privkey);

  return {
    tier,
    name: process.env[`AGENT_TIER${tier}_NAME`] || `VisionFlow Tier ${tier}`,
    about: process.env[`AGENT_TIER${tier}_ABOUT`] || `VisionFlow AI agent (Tier ${tier})`,
    privkey,
    pubkey,
  };
}

export interface BridgeConfig {
  relayUrl: string;
  visionflowApiUrl: string;
  visionflowApiToken: string;
  anthropicApiKey: string;
  agents: AgentIdentity[];
  port: number;
  host: string;
  reconnectIntervalMs: number;
  healthCheckIntervalMs: number;
}

export function loadConfig(): BridgeConfig {
  const relayUrl = process.env.RELAY_URL;
  if (!relayUrl) {
    throw new Error('Missing RELAY_URL environment variable');
  }

  const agents = [
    loadAgentIdentity(1),
    loadAgentIdentity(2),
    loadAgentIdentity(3),
  ];

  // Log agent pubkeys on startup (not privkeys)
  for (const agent of agents) {
    console.log(`[Config] Tier ${agent.tier} agent pubkey: ${agent.pubkey}`);
  }

  return {
    relayUrl,
    visionflowApiUrl: process.env.VISIONFLOW_API_URL || '',
    visionflowApiToken: process.env.VISIONFLOW_API_TOKEN || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    agents,
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || '0.0.0.0',
    reconnectIntervalMs: 5000,
    healthCheckIntervalMs: 30000,
  };
}

/** Look up an agent identity by pubkey */
export function getAgentByPubkey(
  agents: AgentIdentity[],
  pubkey: string
): AgentIdentity | undefined {
  return agents.find(a => a.pubkey === pubkey);
}

/** Check if a set of cohorts grants access to a tier */
export function cohortsAllowTier(cohorts: string[], tier: AgentTier): boolean {
  // Tier 1 is open to any whitelisted user
  if (tier === 1) return true;

  const required = TIER_REQUIRED_COHORTS[tier];
  return cohorts.some(c => required.includes(c));
}
