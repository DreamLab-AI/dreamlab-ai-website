/**
 * Tier 1: General Chat (z ai)
 *
 * Routes to VisionFlow's z ai conversational user — cheap general chat
 * with no memory and no agentic tasking. Stateless request/response.
 */

export interface TierHandlerResult {
  response: string;
  metadata?: Record<string, unknown>;
}

export interface Tier1Config {
  visionflowApiUrl: string;
  visionflowApiToken: string;
}

/**
 * Handle a Tier 1 message — stateless general chat via VisionFlow's z ai.
 *
 * When VisionFlow exposes POST /api/chat, this calls it with tier: 1.
 * Until then, falls back to a simple echo/unavailable response.
 */
export async function handleTier1Message(
  content: string,
  senderPubkey: string,
  config: Tier1Config
): Promise<TierHandlerResult> {
  if (!config.visionflowApiUrl) {
    return {
      response: 'General chat is not yet configured. VisionFlow API URL is not set.',
    };
  }

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
        agent_context: {
          pubkey: senderPubkey,
          tier: 1,
        },
        // No session_id — stateless
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tier1] VisionFlow API error: ${response.status} ${errorText}`);
      return {
        response: 'Sorry, I encountered an error processing your message. Please try again.',
      };
    }

    const data = (await response.json()) as {
      response: string;
      sources?: unknown[];
      graph_context?: unknown;
    };

    return {
      response: data.response,
      metadata: {
        sources: data.sources,
        tier: 1,
      },
    };
  } catch (error) {
    console.error('[Tier1] Request failed:', (error as Error).message);
    return {
      response: 'Sorry, the general chat service is temporarily unavailable.',
    };
  }
}
