/**
 * VisionFlow Agent Bridge — Main Server
 *
 * Connects to the Nostr relay and routes DMs addressed to the 3 agent
 * pubkeys through tiered AI backends:
 *
 *   Tier 1 (visionflow-general)  → z ai cheap chat, no memory
 *   Tier 2 (visionflow-claude)   → Claude Flow, agentic, session memory
 *   Tier 3 (visionflow-full)     → Full VisionFlow intelligence + memory
 *
 * Permission gating is enforced via the relay's cohort whitelist system.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { loadConfig } from './config';
import { NostrClient } from './nostr-client';
import { AgentRouter } from './agent-router';
import { publishAllProfiles } from './profile-publisher';

async function main(): Promise<void> {
  console.log('[Bridge] VisionFlow Agent Bridge starting...');

  // Load configuration (validates env vars)
  const config = loadConfig();

  // Create Nostr client
  const client = new NostrClient(config.relayUrl, config.reconnectIntervalMs);

  // Create agent router
  const router = new AgentRouter(client, config);

  // Connect to relay
  console.log(`[Bridge] Connecting to relay: ${config.relayUrl}`);
  try {
    await client.connect();
  } catch (error) {
    console.error('[Bridge] Initial connection failed:', (error as Error).message);
    console.log('[Bridge] Will retry via reconnect logic...');
    // The NostrClient has built-in reconnect, so we continue
  }

  // Publish agent profiles (kind 0 metadata)
  if (client.isConnected()) {
    console.log('[Bridge] Publishing agent profiles...');
    await publishAllProfiles(config.agents, client);
  }

  // Subscribe to DMs for all 3 agents
  router.subscribeAll();

  // Start health check HTTP server
  const healthServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // CORS and security headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (url.pathname === '/health' || url.pathname === '/') {
        const stats = router.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'healthy',
            service: 'visionflow-bridge',
            version: '1.0.0',
            connected: client.isConnected(),
            relay: config.relayUrl,
            agents: config.agents.map((a) => ({
              tier: a.tier,
              name: a.name,
              pubkey: a.pubkey,
            })),
            stats,
            uptime: process.uptime(),
          })
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  );

  healthServer.listen(config.port, config.host, () => {
    console.log(
      `[Bridge] Health server listening on ${config.host}:${config.port}`
    );
  });

  console.log('[Bridge] VisionFlow Agent Bridge ready');
  console.log(`[Bridge] Tier 1 (General): ${config.agents[0].pubkey}`);
  console.log(`[Bridge] Tier 2 (Claude):  ${config.agents[1].pubkey}`);
  console.log(`[Bridge] Tier 3 (Full):    ${config.agents[2].pubkey}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Bridge] Shutting down...');
    client.disconnect();
    healthServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('[Bridge] Fatal error:', error);
  process.exit(1);
});
