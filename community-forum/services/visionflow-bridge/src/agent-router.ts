/**
 * Agent Router
 *
 * Routes incoming DMs to the correct tier handler based on which
 * agent pubkey the message was addressed to. Handles permission
 * verification and response wrapping.
 */

import { type Event } from 'nostr-tools';
import { type AgentIdentity, type BridgeConfig, getAgentByPubkey } from './config';
import { unwrapDM, wrapDM, createDMFilter } from './dm-handler';
import { verifyTierAccess } from './permission-check';
import { handleTier1Message } from './tiers/tier1-general';
import { handleTier2Message } from './tiers/tier2-claude';
import { handleTier3Message } from './tiers/tier3-visionflow';
import { NostrClient } from './nostr-client';

/** Stats for monitoring */
export interface RouterStats {
  messagesReceived: number;
  messagesRouted: number;
  messagesRejected: number;
  responsesSent: number;
  errors: number;
  byTier: Record<number, number>;
}

export class AgentRouter {
  private client: NostrClient;
  private config: BridgeConfig;
  private stats: RouterStats = {
    messagesReceived: 0,
    messagesRouted: 0,
    messagesRejected: 0,
    responsesSent: 0,
    errors: 0,
    byTier: { 1: 0, 2: 0, 3: 0 },
  };

  constructor(client: NostrClient, config: BridgeConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Subscribe to DMs for all 3 agent pubkeys.
   * Each agent gets its own subscription filter.
   */
  subscribeAll(): void {
    for (const agent of this.config.agents) {
      const filter = createDMFilter(agent.pubkey);
      this.client.subscribe([filter], (event: Event) => {
        this.handleIncomingEvent(event, agent);
      });
      console.log(
        `[Router] Subscribed to DMs for Tier ${agent.tier} (${agent.pubkey.slice(0, 12)}...)`
      );
    }
  }

  /**
   * Handle an incoming gift-wrapped event.
   */
  private async handleIncomingEvent(
    event: Event,
    agent: AgentIdentity
  ): Promise<void> {
    this.stats.messagesReceived++;

    // Step 1: Unwrap the DM
    const dm = unwrapDM(event, agent.privkey);
    if (!dm) {
      console.warn('[Router] Failed to unwrap DM, skipping');
      return;
    }

    console.log(
      `[Router] DM from ${dm.senderPubkey.slice(0, 12)}... → Tier ${agent.tier}: "${dm.content.slice(0, 50)}..."`
    );

    // Step 2: Verify permissions
    const access = await verifyTierAccess(
      dm.senderPubkey,
      agent.tier,
      this.config.relayUrl
    );

    if (!access.allowed) {
      console.log(
        `[Router] Access denied for ${dm.senderPubkey.slice(0, 12)}... to Tier ${agent.tier}: ${access.reason}`
      );
      this.stats.messagesRejected++;

      // Send a polite denial message
      await this.sendResponse(
        agent,
        dm.senderPubkey,
        `Access denied: You don't have permission to use this agent tier. ${access.reason || ''}`
      );
      return;
    }

    // Step 3: Route to appropriate tier handler
    this.stats.messagesRouted++;
    this.stats.byTier[agent.tier]++;

    try {
      const result = await this.routeToTier(agent, dm.content, dm.senderPubkey);
      await this.sendResponse(agent, dm.senderPubkey, result.response);
    } catch (error) {
      this.stats.errors++;
      console.error(
        `[Router] Tier ${agent.tier} handler error:`,
        (error as Error).message
      );
      await this.sendResponse(
        agent,
        dm.senderPubkey,
        'Sorry, an unexpected error occurred while processing your message.'
      );
    }
  }

  /**
   * Route a message to the appropriate tier handler.
   */
  private async routeToTier(
    agent: AgentIdentity,
    content: string,
    senderPubkey: string
  ) {
    switch (agent.tier) {
      case 1:
        return handleTier1Message(content, senderPubkey, {
          visionflowApiUrl: this.config.visionflowApiUrl,
          visionflowApiToken: this.config.visionflowApiToken,
        });
      case 2:
        return handleTier2Message(content, senderPubkey, {
          visionflowApiUrl: this.config.visionflowApiUrl,
          visionflowApiToken: this.config.visionflowApiToken,
          anthropicApiKey: this.config.anthropicApiKey,
        });
      case 3:
        return handleTier3Message(content, senderPubkey, {
          visionflowApiUrl: this.config.visionflowApiUrl,
          visionflowApiToken: this.config.visionflowApiToken,
        });
      default:
        return { response: 'Unknown agent tier.' };
    }
  }

  /**
   * Send a gift-wrapped DM response back to the user.
   */
  private async sendResponse(
    agent: AgentIdentity,
    recipientPubkey: string,
    content: string
  ): Promise<void> {
    try {
      const giftWrap = wrapDM(content, recipientPubkey, agent.privkey);
      await this.client.publish(giftWrap);
      this.stats.responsesSent++;
      console.log(
        `[Router] Response sent from Tier ${agent.tier} → ${recipientPubkey.slice(0, 12)}...`
      );
    } catch (error) {
      this.stats.errors++;
      console.error('[Router] Failed to send response:', (error as Error).message);
    }
  }

  /** Get router statistics */
  getStats(): RouterStats {
    return { ...this.stats };
  }
}
