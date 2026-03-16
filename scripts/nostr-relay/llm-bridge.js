#!/usr/bin/env node
/**
 * Nostr-LLM Bridge: connects to local + production Nostr relays,
 * routes messages to llama.cpp (Nemotron 120B), posts responses
 * back as Nostr events.
 *
 * Usage: node scripts/nostr-relay/llm-bridge.js [options]
 *   --local-relay    ws://localhost:7777
 *   --prod-relay     wss://relay.example.com
 *   --llm-url        http://192.168.2.48:8080
 *   --bot-nsec       hex-private-key
 *   --channel-id     hex-channel-id
 *   --mention-only   (only respond when mentioned)
 */

import WebSocket from 'ws';
import { randomBytes } from 'crypto';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import http from 'http';

// --- Config ---
function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const LOCAL_RELAY = getArg('local-relay', 'ws://localhost:7777');
const PROD_RELAY = getArg(
  'prod-relay',
  'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev'
);
const LLM_URL = getArg('llm-url', 'http://192.168.2.48:8080');
const LLM_MODEL = getArg(
  'llm-model',
  'NVIDIA-Nemotron-3-Super-120B-A12B-UD-IQ4_XS-00001-of-00003.gguf'
);
const CHANNEL_ID = getArg('channel-id', '');
const MENTION_ONLY = process.argv.includes('--mention-only');
const MAX_TOKENS = parseInt(getArg('max-tokens', '512'), 10);
const SYSTEM_PROMPT = getArg(
  'system-prompt',
  'You are DreamBot, an AI assistant in the DreamLab community forum. Be helpful, concise, and friendly. Respond in 1-3 paragraphs max.'
);

// Generate or load bot keypair
let botSecretKey;
const providedKey = getArg('bot-nsec', '');
if (providedKey) {
  botSecretKey = Uint8Array.from(Buffer.from(providedKey, 'hex'));
} else {
  botSecretKey = generateSecretKey();
  console.log(`[BOT] Generated ephemeral keypair (use --bot-nsec to persist)`);
  console.log(`[BOT] Secret key (save this): ${Buffer.from(botSecretKey).toString('hex')}`);
}

const botPubkey = getPublicKey(botSecretKey);
console.log(`[BOT] pubkey: ${botPubkey}`);

const processedEvents = new Set();
const MAX_PROCESSED = 5000;

// --- Text processing ---
function stripThinkTags(text) {
  // Remove <think>...</think> blocks (standard format)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  // Handle models that omit opening <think> but include </think>
  if (cleaned.includes('</think>')) {
    cleaned = cleaned.split('</think>').pop();
  }
  // Handle content that starts with reasoning and ends at </think> (no opening tag)
  if (text.includes('</think>') && !text.includes('<think>')) {
    cleaned = text.split('</think>').pop();
  }
  return cleaned.trim();
}

// --- Nostr helpers ---
function createSignedEvent(kind, content, tags = []) {
  const eventTemplate = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };
  return finalizeEvent(eventTemplate, botSecretKey);
}

// --- LLM ---
async function queryLLM(userMessage, context = []) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  for (const ctx of context.slice(-5)) {
    messages.push({ role: 'user', content: ctx });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const res = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        top_p: 0.9,
        stop: ['<|end_of_text|>', '<|eot_id|>'],
      }),
    });

    if (!res.ok) {
      console.error(`[LLM] HTTP ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content?.trim();
    if (reply) {
      reply = stripThinkTags(reply);
      const tokens = data.usage;
      console.log(
        `[LLM] ${tokens?.prompt_tokens}p + ${tokens?.completion_tokens}c tokens, ${(data.timings?.predicted_per_second || 0).toFixed(1)} tok/s`
      );
    }
    return reply || null;
  } catch (err) {
    console.error(`[LLM] Error: ${err.message}`);
    return null;
  }
}

// --- Relay connection ---
function connectRelay(url, label, onEvent) {
  let ws;
  let reconnectTimer;
  const subId = `bridge-${randomBytes(4).toString('hex')}`;

  function connect() {
    console.log(`[${label}] Connecting to ${url}...`);
    ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`[${label}] Connected`);

      const filters = [];
      if (CHANNEL_ID) {
        filters.push({ kinds: [42], '#e': [CHANNEL_ID], limit: 20 });
      } else {
        filters.push({ kinds: [1, 42], limit: 20 });
      }

      filters.push({ '#p': [botPubkey], limit: 10 });

      ws.send(JSON.stringify(['REQ', subId, ...filters]));
      console.log(`[${label}] Subscribed with ${filters.length} filters`);
    });

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg[0] === 'EVENT' && msg[2]) {
        onEvent(msg[2], label);
      } else if (msg[0] === 'EOSE') {
        console.log(`[${label}] EOSE for ${msg[1]}`);
      } else if (msg[0] === 'NOTICE') {
        console.log(`[${label}] NOTICE: ${msg[1]}`);
      } else if (msg[0] === 'OK') {
        const status = msg[2] ? 'accepted' : 'rejected';
        console.log(`[${label}] Event ${msg[1]?.slice(0, 8)}.. ${status}: ${msg[3] || ''}`);
      }
    });

    ws.on('close', () => {
      console.log(`[${label}] Disconnected, reconnecting in 5s...`);
      reconnectTimer = setTimeout(connect, 5000);
    });

    ws.on('error', (err) => {
      console.error(`[${label}] Error: ${err.message}`);
    });
  }

  connect();

  return {
    send: (msg) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    close: () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

// --- Message processing ---
const recentMessages = [];

async function handleIncomingEvent(event, source) {
  if (event.pubkey === botPubkey) return;
  if (processedEvents.has(event.id)) return;
  processedEvents.add(event.id);

  if (processedEvents.size > MAX_PROCESSED) {
    const arr = [...processedEvents];
    arr.slice(0, arr.length - MAX_PROCESSED).forEach((id) => processedEvents.delete(id));
  }

  const isMention = event.tags.some((t) => t[0] === 'p' && t[1] === botPubkey);
  const isChannelMsg = event.kind === 42;
  const isDM = event.kind === 4;

  console.log(
    `[MSG] kind=${event.kind} from=${event.pubkey.slice(0, 8)}.. mention=${isMention} src=${source} "${event.content.slice(0, 80)}"`
  );

  let shouldRespond = false;
  if (isDM || isMention) {
    shouldRespond = true;
  } else if (!MENTION_ONLY && isChannelMsg && CHANNEL_ID) {
    shouldRespond = true;
  }

  if (!shouldRespond) return;

  recentMessages.push(event.content);
  if (recentMessages.length > 20) recentMessages.shift();

  console.log(`[BOT] Querying LLM for event ${event.id.slice(0, 8)}..`);
  const reply = await queryLLM(event.content, recentMessages.slice(-5));
  if (!reply) {
    console.error(`[BOT] LLM returned no response`);
    return;
  }

  console.log(`[BOT] Response: "${reply.slice(0, 120)}..."`);

  let replyEvent;
  if (isChannelMsg) {
    const channelTag = event.tags.find((t) => t[0] === 'e' && t[3] === 'root');
    const channelId = channelTag?.[1] || CHANNEL_ID;
    replyEvent = createSignedEvent(42, reply, [
      ['e', channelId, '', 'root'],
      ['e', event.id, '', 'reply'],
      ['p', event.pubkey],
    ]);
  } else {
    replyEvent = createSignedEvent(1, reply, [
      ['e', event.id, '', 'reply'],
      ['p', event.pubkey],
    ]);
  }

  const eventMsg = ['EVENT', replyEvent];
  localRelay?.send(eventMsg);
  prodRelay?.send(eventMsg);

  console.log(`[BOT] Published reply ${replyEvent.id.slice(0, 8)}.. to both relays`);
}

// --- Main ---
let localRelay, prodRelay;

console.log(`\n[BRIDGE] DreamLab Nostr-LLM Bridge`);
console.log(`[BRIDGE] Local relay:  ${LOCAL_RELAY}`);
console.log(`[BRIDGE] Prod relay:   ${PROD_RELAY}`);
console.log(`[BRIDGE] LLM endpoint: ${LLM_URL}`);
console.log(`[BRIDGE] LLM model:    ${LLM_MODEL}`);
console.log(`[BRIDGE] Channel:      ${CHANNEL_ID || '(all channels)'}`);
console.log(`[BRIDGE] Mention only: ${MENTION_ONLY}`);
console.log(`[BRIDGE] Bot pubkey:   ${botPubkey}\n`);

localRelay = connectRelay(LOCAL_RELAY, 'LOCAL', handleIncomingEvent);
prodRelay = connectRelay(PROD_RELAY, 'PROD', handleIncomingEvent);

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        botPubkey,
        processedEvents: processedEvents.size,
        recentMessages: recentMessages.length,
        llmUrl: LLM_URL,
        localRelay: LOCAL_RELAY,
        prodRelay: PROD_RELAY,
      })
    );
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

healthServer.listen(7778, '0.0.0.0', () => {
  console.log(`[HEALTH] Bridge health at http://0.0.0.0:7778/health`);
});

process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Shutting down...');
  localRelay?.close();
  prodRelay?.close();
  healthServer.close();
  process.exit(0);
});
