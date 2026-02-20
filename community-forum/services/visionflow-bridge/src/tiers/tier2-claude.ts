/**
 * Tier 2: Claude Flow
 *
 * Full Claude Flow access with agentic tasking.
 * Session memory (per conversation with a user), but no VisionFlow memory.
 * Routes to Anthropic API via VisionFlow's Claude Flow integration.
 */

export interface TierHandlerResult {
  response: string;
  metadata?: Record<string, unknown>;
}

export interface Tier2Config {
  visionflowApiUrl: string;
  visionflowApiToken: string;
  anthropicApiKey: string;
}

/** Simple in-memory session tracker (session IDs per sender) */
const sessions = new Map<string, string>();

function getSessionId(senderPubkey: string): string {
  let sessionId = sessions.get(senderPubkey);
  if (!sessionId) {
    sessionId = `t2_${senderPubkey.slice(0, 16)}_${Date.now()}`;
    sessions.set(senderPubkey, sessionId);
  }
  return sessionId;
}

/**
 * Handle a Tier 2 message — Claude Flow with agentic tasking.
 *
 * Routes to VisionFlow's POST /api/chat with tier: 2, which invokes
 * Claude Flow. Includes session_id for conversation continuity.
 */
export async function handleTier2Message(
  content: string,
  senderPubkey: string,
  config: Tier2Config
): Promise<TierHandlerResult> {
  if (!config.visionflowApiUrl) {
    return {
      response:
        'Claude Flow agent is not yet configured. VisionFlow API URL is not set.',
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
          tier: 2,
          capabilities: ['agentic', 'reasoning', 'code-execution'],
        },
      }),
      signal: AbortSignal.timeout(120_000), // Agentic tasks can take longer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tier2] VisionFlow API error: ${response.status} ${errorText}`);
      return {
        response:
          'Sorry, the Claude Flow agent encountered an error. Please try again.',
      };
    }

    const data = (await response.json()) as {
      response: string;
      sources?: unknown[];
      actions_taken?: unknown[];
    };

    return {
      response: data.response,
      metadata: {
        sessionId,
        sources: data.sources,
        actions: data.actions_taken,
        tier: 2,
      },
    };
  } catch (error) {
    console.error('[Tier2] Request failed:', (error as Error).message);
    return {
      response:
        'Sorry, the Claude Flow agent is temporarily unavailable. Please try again later.',
    };
  }
}

/** Reset a user's session (e.g., on /reset command) */
export function resetSession(senderPubkey: string): void {
  sessions.delete(senderPubkey);
}
