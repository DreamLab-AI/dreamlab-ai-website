/**
 * VisionFlow Agent Registry
 *
 * Maps the 3 agent pubkeys to their tier metadata and required cohorts.
 * Used by the frontend to determine which agents a user can interact with
 * based on their cohort membership.
 *
 * Agent pubkeys are set at deployment time and loaded from environment/config.
 * Placeholder values below should be replaced with actual pubkeys after
 * keypair generation.
 */

/** Agent tier definition */
export interface AgentTier {
  id: string;
  pubkey: string;
  name: string;
  description: string;
  avatar: string;
  tier: 1 | 2 | 3;
  /** User must have at least one of these cohorts to see/use this agent */
  requiredCohorts: string[];
  /** Section ID in sections.yaml this agent corresponds to */
  sectionId: string;
  /** Visual indicator color */
  color: string;
}

/**
 * Agent pubkeys — replace these with actual hex pubkeys after generating
 * keypairs and deploying the bridge service.
 *
 * Generate keypairs with:
 *   node -e "const {generateSecretKey,getPublicKey}=require('nostr-tools');
 *   const sk=generateSecretKey();
 *   console.log('privkey:', Buffer.from(sk).toString('hex'));
 *   console.log('pubkey:', getPublicKey(sk))"
 */
export const AGENT_PUBKEYS = {
  tier1: '', // Set after keypair generation
  tier2: '', // Set after keypair generation
  tier3: '', // Set after keypair generation
} as const;

/** Registry of all VisionFlow agent tiers */
export const AGENT_REGISTRY: AgentTier[] = [
  {
    id: 'visionflow-general',
    pubkey: AGENT_PUBKEYS.tier1,
    name: 'VisionFlow General',
    description:
      'Quick AI assistant for general questions. No memory between conversations, no agentic tasks.',
    avatar: '/images/agents/tier1-general.webp',
    tier: 1,
    requiredCohorts: [], // Open to all authenticated users
    sectionId: 'ai-general',
    color: '#0ea5e9',
  },
  {
    id: 'visionflow-claude',
    pubkey: AGENT_PUBKEYS.tier2,
    name: 'VisionFlow Claude',
    description:
      'Agentic AI powered by Claude Flow. Can execute tasks, write code, reason through problems. Session memory within conversations.',
    avatar: '/images/agents/tier2-claude.webp',
    tier: 2,
    requiredCohorts: [
      'business',
      'trainers',
      'trainees',
      'minimoonoir-business',
      'cross-access',
      'admin',
    ],
    sectionId: 'ai-claude-flow',
    color: '#8b5cf6',
  },
  {
    id: 'visionflow-full',
    pubkey: AGENT_PUBKEYS.tier3,
    name: 'VisionFlow Intelligence',
    description:
      'Full VisionFlow AI with knowledge graph access, persistent memory, ontology agents, semantic search, and deep intelligence.',
    avatar: '/images/agents/tier3-visionflow.webp',
    tier: 3,
    requiredCohorts: ['cross-access', 'admin', 'visionflow-full'],
    sectionId: 'ai-visionflow',
    color: '#ec4899',
  },
];

/**
 * Check if a user's cohorts grant access to a given agent tier.
 */
export function canAccessAgent(
  userCohorts: string[],
  agent: AgentTier
): boolean {
  // Tier 1 is open to all authenticated users
  if (agent.requiredCohorts.length === 0) return true;

  // Admin cohort always has access
  if (userCohorts.includes('admin')) return true;

  return userCohorts.some((c) => agent.requiredCohorts.includes(c));
}

/**
 * Get all agents accessible by a user with the given cohorts.
 */
export function getAccessibleAgents(userCohorts: string[]): AgentTier[] {
  return AGENT_REGISTRY.filter((agent) => canAccessAgent(userCohorts, agent));
}

/**
 * Look up an agent by pubkey.
 */
export function getAgentByPubkey(pubkey: string): AgentTier | undefined {
  return AGENT_REGISTRY.find((a) => a.pubkey === pubkey);
}

/**
 * Check if a pubkey belongs to a VisionFlow agent (for UI display purposes).
 */
export function isAgentPubkey(pubkey: string): boolean {
  return AGENT_REGISTRY.some((a) => a.pubkey === pubkey && a.pubkey !== '');
}
