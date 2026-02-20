/**
 * Tier 3: Full VisionFlow Intelligence
 *
 * Complete access to VisionFlow's knowledge graph, memory, ontology agents,
 * semantic search, community detection, pathfinding, and RAGFlow.
 * Persistent memory tied to the user's pubkey in Neo4j.
 */

export interface TierHandlerResult {
  response: string;
  metadata?: Record<string, unknown>;
}

export interface Tier3Config {
  visionflowApiUrl: string;
  visionflowApiToken: string;
}

/** Session tracking with persistent memory reference */
const sessions = new Map<string, string>();

function getSessionId(senderPubkey: string): string {
  let sessionId = sessions.get(senderPubkey);
  if (!sessionId) {
    sessionId = `t3_${senderPubkey.slice(0, 16)}_${Date.now()}`;
    sessions.set(senderPubkey, sessionId);
  }
  return sessionId;
}

/**
 * Handle a Tier 3 message — full VisionFlow intelligence.
 *
 * Routes to VisionFlow's POST /api/chat with tier: 3, which has access to:
 * - Knowledge graph (Neo4j) read/write
 * - Ontology agent (discover, read, traverse, propose)
 * - Semantic pathfinding and community detection
 * - RAGFlow chat with document retrieval
 * - Persistent conversation memory in Neo4j
 */
export async function handleTier3Message(
  content: string,
  senderPubkey: string,
  config: Tier3Config
): Promise<TierHandlerResult> {
  if (!config.visionflowApiUrl) {
    return {
      response:
        'VisionFlow Intelligence is not yet configured. API URL is not set.',
    };
  }

  const sessionId = getSessionId(senderPubkey);

  try {
    const response = await fetch(`${config.visionflowApiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.visionflowApiToken
          ? { Authorization: `Bearer ${config.visionflowApiToken}` }
          : {}),
      },
      body: JSON.stringify({
        message: content,
        session_id: sessionId,
        agent_context: {
          pubkey: senderPubkey,
          tier: 3,
          capabilities: [
            'agentic',
            'reasoning',
            'code-execution',
            'knowledge-graph',
            'memory',
            'ontology',
            'semantic-search',
            'pathfinding',
            'community-detection',
            'ragflow',
            'proposals',
          ],
        },
      }),
      signal: AbortSignal.timeout(180_000), // Full intelligence queries can be complex
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tier3] VisionFlow API error: ${response.status} ${errorText}`);
      return {
        response:
          'Sorry, VisionFlow Intelligence encountered an error. Please try again.',
      };
    }

    const data = (await response.json()) as {
      response: string;
      sources?: unknown[];
      graph_context?: unknown;
      actions_taken?: unknown[];
      memory_updated?: boolean;
    };

    return {
      response: data.response,
      metadata: {
        sessionId,
        sources: data.sources,
        graphContext: data.graph_context,
        actions: data.actions_taken,
        memoryUpdated: data.memory_updated,
        tier: 3,
      },
    };
  } catch (error) {
    console.error('[Tier3] Request failed:', (error as Error).message);
    return {
      response:
        'Sorry, VisionFlow Intelligence is temporarily unavailable. Please try again later.',
    };
  }
}

/** Reset a user's session */
export function resetSession(senderPubkey: string): void {
  sessions.delete(senderPubkey);
}
