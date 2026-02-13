/**
 * Permission checker — verifies sender cohorts against tier requirements
 * by querying the relay's /api/check-whitelist endpoint.
 */

import { cohortsAllowTier, TIER_REQUIRED_COHORTS, type AgentTier } from './config';

export interface WhitelistCheckResult {
  isWhitelisted: boolean;
  isAdmin: boolean;
  cohorts: string[];
  verifiedAt: number;
  source: string;
}

/** Simple in-memory cache to avoid hammering the relay API */
const cache = new Map<string, { result: WhitelistCheckResult; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Check a pubkey's whitelist status and cohorts via the relay HTTP API.
 */
export async function checkWhitelist(
  pubkey: string,
  relayUrl: string
): Promise<WhitelistCheckResult> {
  // Check cache first
  const cached = cache.get(pubkey);
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  // Convert WSS URL to HTTPS for the HTTP API
  const httpUrl = relayUrl
    .replace('wss://', 'https://')
    .replace('ws://', 'http://');

  const url = `${httpUrl}/api/check-whitelist?pubkey=${pubkey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Whitelist check failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as WhitelistCheckResult;

  // Cache the result
  cache.set(pubkey, { result, expiry: Date.now() + CACHE_TTL_MS });

  return result;
}

/**
 * Verify that a sender pubkey has permission to access a given agent tier.
 *
 * @returns Object with allowed flag and the sender's cohorts
 */
export async function verifyTierAccess(
  senderPubkey: string,
  tier: AgentTier,
  relayUrl: string
): Promise<{ allowed: boolean; cohorts: string[]; reason?: string }> {
  try {
    const whitelist = await checkWhitelist(senderPubkey, relayUrl);

    if (!whitelist.isWhitelisted) {
      return { allowed: false, cohorts: [], reason: 'Not whitelisted on relay' };
    }

    // Admins can access all tiers
    if (whitelist.isAdmin) {
      return { allowed: true, cohorts: whitelist.cohorts };
    }

    const allowed = cohortsAllowTier(whitelist.cohorts, tier);

    if (!allowed) {
      return {
        allowed: false,
        cohorts: whitelist.cohorts,
        reason: `Tier ${tier} requires cohorts: ${JSON.stringify(
          TIER_REQUIRED_COHORTS[tier]
        )}, user has: ${JSON.stringify(whitelist.cohorts)}`,
      };
    }

    return { allowed: true, cohorts: whitelist.cohorts };
  } catch (error) {
    console.error('[Permission] Whitelist check error:', (error as Error).message);
    // Fail closed — deny access on error
    return { allowed: false, cohorts: [], reason: 'Permission check failed' };
  }
}

/** Clear the permission cache (for testing or admin actions) */
export function clearPermissionCache(): void {
  cache.clear();
}
