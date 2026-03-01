#!/usr/bin/env node

/**
 * seed-forum.mjs -- Populates the DreamLab Community relay with realistic test content.
 *
 * Creates 6 user profiles, 4 channels, 15 channel messages, 5 forum threads,
 * 3 calendar events, and 10 reactions spread across the last 6 days.
 *
 * Usage: node scripts/seed-forum.mjs
 */

import { getPublicKey, finalizeEvent } from '/home/devuser/workspace/project2/community-forum/node_modules/nostr-tools/lib/esm/pure.js';
import { bytesToHex, hexToBytes } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/utils.js';
import { sha256 } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/sha256.js';
import WebSocket from '/home/devuser/workspace/project2/community-forum/node_modules/ws/wrapper.mjs';

// ── Configuration ──────────────────────────────────────────────────────
const RELAY_URL = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const ADMIN_PRIVKEY_HEX = '60da2527b79aea2e90a0fab5284870a1fc93bf751bab3088a4fe6d47e3995668';
const ADMIN_PRIVKEY = hexToBytes(ADMIN_PRIVKEY_HEX);
const ADMIN_PUBKEY = getPublicKey(ADMIN_PRIVKEY);

// Deterministic keys for test users (derived from SHA-256 of seed strings)
function deriveKey(seed) {
  return sha256(new TextEncoder().encode(seed));
}

// ── User Definitions ───────────────────────────────────────────────────
const USERS = {
  jj: {
    privkey: ADMIN_PRIVKEY,
    pubkey: ADMIN_PUBKEY,
    metadata: {
      name: 'JJ',
      display_name: "JJ O'Hare",
      about: 'DreamLab founder. AI researcher and community builder.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jj-admin',
      nip05: 'jj@dreamlab-ai.com',
    },
  },
  sarah: {
    privkey: deriveKey('dreamlab-test-sarah-chen-2026'),
    metadata: {
      name: 'sarah',
      display_name: 'Sarah Chen',
      about: 'Product designer at Figma. Passionate about AI-driven design tools.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah-chen',
      nip05: 'sarah@example.com',
    },
  },
  alex: {
    privkey: deriveKey('dreamlab-test-alex-rivera-2026'),
    metadata: {
      name: 'alex',
      display_name: 'Alex Rivera',
      about: 'Backend engineer. Building distributed systems at scale.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex-rivera',
    },
  },
  maya: {
    privkey: deriveKey('dreamlab-test-maya-patel-2026'),
    metadata: {
      name: 'maya',
      display_name: 'Maya Patel',
      about: 'ML researcher. Working on responsible AI and fairness in machine learning.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya-patel',
    },
  },
  tom: {
    privkey: deriveKey('dreamlab-test-tom-wilson-2026'),
    metadata: {
      name: 'tom',
      display_name: 'Tom Wilson',
      about: 'DevOps lead. Cloud infrastructure and automation enthusiast.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom-wilson',
    },
  },
  liwei: {
    privkey: deriveKey('dreamlab-test-li-wei-2026'),
    metadata: {
      name: 'liwei',
      display_name: 'Li Wei',
      about: 'Full-stack developer. React, Svelte, and everything in between.',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li-wei',
    },
  },
};

// Populate pubkeys (getPublicKey returns hex string in nostr-tools/pure)
for (const user of Object.values(USERS)) {
  if (!user.pubkey) {
    user.pubkey = getPublicKey(user.privkey);
  }
}

// ── Timestamp helpers ──────────────────────────────────────────────────
const NOW = Math.floor(Date.now() / 1000);

// Keep all timestamps within 6 days to avoid the relay's 7-day drift limit
function daysAgo(d, hoursOffset = 0) {
  return NOW - d * 86400 + hoursOffset * 3600;
}

// ── NIP-98 Token Generation ────────────────────────────────────────────
async function createNip98Token(privkey, url, method, body) {
  const created_at = Math.floor(Date.now() / 1000);
  const tags = [
    ['u', url],
    ['method', method],
  ];

  if (body) {
    const bodyBytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
    const hash = bytesToHex(sha256(new Uint8Array(bodyBytes)));
    tags.push(['payload', hash]);
  }

  const event = finalizeEvent({
    kind: 27235,
    created_at,
    tags,
    content: '',
  }, privkey);

  return Buffer.from(JSON.stringify(event)).toString('base64');
}

// ── Whitelist Management ───────────────────────────────────────────────
async function whitelistUser(pubkey) {
  const url = `${RELAY_HTTP}/api/whitelist/add`;
  const body = JSON.stringify({ pubkey, cohorts: ['approved'] });
  const token = await createNip98Token(ADMIN_PRIVKEY, url, 'POST', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Nostr ${token}`,
    },
    body,
  });

  const data = await res.json();
  if (data.success) {
    console.log(`  [whitelist] Added ${pubkey.slice(0, 16)}...`);
  } else {
    console.error(`  [whitelist] FAILED for ${pubkey.slice(0, 16)}...:`, data);
  }
  return data.success;
}

// ── WebSocket Publishing ───────────────────────────────────────────────
let ws;
let pendingOK = null;
const EVENT_TIMEOUT_MS = 15000;

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(RELAY_URL);
    ws.on('open', () => resolve());
    ws.on('error', (err) => reject(err));
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === 'OK' && pendingOK) {
        pendingOK(msg);
      }
    });
  });
}

function publishEvent(signedEvent) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingOK = null;
      reject(new Error(`Timeout waiting for OK on event ${signedEvent.id.slice(0, 12)}...`));
    }, EVENT_TIMEOUT_MS);

    pendingOK = (msg) => {
      clearTimeout(timer);
      pendingOK = null;
      const [, eventId, success, message] = msg;
      if (success) {
        resolve({ id: eventId, success, message });
      } else {
        reject(new Error(`Relay rejected event ${eventId.slice(0, 12)}...: ${message}`));
      }
    };

    ws.send(JSON.stringify(['EVENT', signedEvent]));
  });
}

async function publish(kind, content, tags, privkey, created_at) {
  const event = finalizeEvent({ kind, content, tags, created_at }, privkey);
  try {
    const result = await publishEvent(event);
    const kindLabel = {
      0: 'profile', 1: 'post', 7: 'reaction',
      40: 'channel', 42: 'channel-msg', 31923: 'calendar',
    }[kind] || `kind:${kind}`;
    console.log(`  [${kindLabel}] ${event.id.slice(0, 16)} (kind ${kind})`);
    return event;
  } catch (err) {
    console.error(`  [FAILED] kind ${kind}: ${err.message}`);
    return null;
  }
}

// Small delay to avoid rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Content Definitions ────────────────────────────────────────────────

function getChannelDefinitions() {
  return [
    { name: 'general', about: 'General discussion for all DreamLab community members', picture: '' },
    { name: 'ai-projects', about: 'Share and discuss your AI projects, demos, and experiments', picture: '' },
    { name: 'help-desk', about: 'Ask questions, get help from the community', picture: '' },
    { name: 'off-topic', about: 'Casual conversations, memes, and fun stuff', picture: '' },
  ];
}

function getChannelMessages(channelIds) {
  const [general, aiProjects, helpDesk, offTopic] = channelIds;
  return [
    // #general -- 5 messages
    { channel: general, user: 'jj', ts: daysAgo(5, 2),
      text: 'Welcome to the DreamLab Community! This is our new home for discussions, knowledge sharing, and collaboration. Feel free to introduce yourself!' },
    { channel: general, user: 'sarah', ts: daysAgo(5, 3),
      text: "Hey everyone! Excited to be here. I've been working on some AI-powered design tools and would love to share what I've learned." },
    { channel: general, user: 'alex', ts: daysAgo(5, 4),
      text: 'Great to see this community taking shape. Looking forward to some deep technical discussions!' },
    { channel: general, user: 'maya', ts: daysAgo(4, 1),
      text: "Hello all! I'm particularly interested in the ethical AI discussions happening in the training programme." },
    { channel: general, user: 'tom', ts: daysAgo(4, 2),
      text: 'Checking in from the DevOps side. Happy to help anyone with deployment questions.' },

    // #ai-projects -- 4 messages
    { channel: aiProjects, user: 'maya', ts: daysAgo(3, 1),
      text: 'Just published a paper on bias detection in language models. Key finding: embedding-level debiasing outperforms post-hoc filtering by 23%. Happy to discuss!' },
    { channel: aiProjects, user: 'alex', ts: daysAgo(3, 3),
      text: 'Been experimenting with RAG pipelines using Cloudflare Workers AI. The latency is surprisingly good \u2014 sub-100ms for most queries.' },
    { channel: aiProjects, user: 'liwei', ts: daysAgo(2, 2),
      text: 'Built a real-time collaborative AI canvas this weekend. Svelte + WebSocket + Stable Diffusion. Demo: [coming soon]' },
    { channel: aiProjects, user: 'sarah', ts: daysAgo(2, 5),
      text: 'Interesting approach @alex! Have you tried combining Workers AI with D1 for the vector store?' },

    // #help-desk -- 3 messages
    { channel: helpDesk, user: 'tom', ts: daysAgo(2, 1),
      text: "Quick tip: If your Cloudflare Worker is timing out, check your D1 query complexity. I've found that JOINs across >10k rows need indexing." },
    { channel: helpDesk, user: 'liwei', ts: daysAgo(1, 3),
      text: "Has anyone got WebAuthn PRF working on Firefox? I keep getting 'not supported' even though the docs say it should work." },
    { channel: helpDesk, user: 'jj', ts: daysAgo(1, 5),
      text: "Great question @liwei \u2014 PRF support varies by platform. Chrome on desktop is the most reliable. We're tracking browser support in our docs." },

    // #off-topic -- 3 messages
    { channel: offTopic, user: 'tom', ts: daysAgo(1, 1),
      text: 'Anyone else watching the new Foundation season? The AI themes are surprisingly accurate this time.' },
    { channel: offTopic, user: 'sarah', ts: daysAgo(0, -8),
      text: 'Just discovered that Claude can generate Svelte components. Mind. Blown. \ud83e\udd2f' },
    { channel: offTopic, user: 'maya', ts: daysAgo(0, -6),
      text: "Coffee recommendation thread: What's everyone drinking while coding?" },
  ];
}

function getForumPosts() {
  return [
    {
      user: 'jj', ts: daysAgo(5, 1),
      subject: 'Welcome to DreamLab Forums',
      content: 'Welcome to the DreamLab Forums, our community space for longer-form discussions, tutorials, and knowledge sharing.\n\nThis platform is built on Nostr, a decentralized protocol that gives you full ownership of your identity and content. Your passkey-derived key means you don\'t need to remember passwords or trust a central authority with your credentials.\n\nFeel free to start new threads, share your work, ask questions, or just introduce yourself. We\'re building something special here and every voice matters.',
    },
    {
      user: 'sarah', ts: daysAgo(4, 3),
      subject: 'Best Practices for AI-Powered Design Systems',
      content: 'After spending the last year integrating AI into our design workflow at Figma, I wanted to share some patterns that have worked well.\n\nFirst, treat AI as a design collaborator, not a replacement. The best results come from iterative prompting where the designer refines outputs rather than expecting perfection on the first pass. We found that providing design tokens and component constraints as context dramatically improves output quality.\n\nSecond, version your AI-generated assets the same way you version code. We use a hash-based system that links each generated asset to the prompt, model version, and seed that created it. This makes designs reproducible and auditable.',
    },
    {
      user: 'alex', ts: daysAgo(3, 2),
      subject: 'Distributed Systems Architecture Patterns for 2026',
      content: 'The landscape of distributed systems has shifted dramatically in the last two years. Edge computing is no longer optional \u2014 it\'s the default deployment target for latency-sensitive workloads.\n\nCloudflare\'s Durable Objects have matured into a legitimate coordination primitive. We\'ve been using them for distributed locks, leader election, and real-time collaboration state. The programming model is surprisingly simple: a single JavaScript class that handles WebSocket connections with transactional storage.\n\nFor data, the pattern I keep coming back to is event sourcing with CQRS. Write to a central log (Kafka, NATS, or even a simple append-only D1 table), project into read-optimized views at the edge. The write path stays consistent, the read path stays fast.',
    },
    {
      user: 'maya', ts: daysAgo(2, 4),
      subject: 'Ethics in AI: A Practical Framework for Developers',
      content: 'Most ethical AI discussions stay theoretical. Here\'s a practical framework we\'ve been using in our lab that any developer can adopt.\n\nStart with an impact assessment before writing code. Who does this system affect? What happens when it fails? Document the failure modes and their severity. This takes an hour and saves weeks of retroactive fixes.\n\nBuild in measurement from day one. If you claim your model is fair, you need metrics to prove it. We track demographic parity, equalized odds, and calibration across all protected classes. These metrics are part of our CI pipeline \u2014 a model that regresses on fairness metrics doesn\'t get deployed, period.',
    },
    {
      user: 'liwei', ts: daysAgo(1, 2),
      subject: 'SvelteKit + Nostr: Building Decentralized Apps',
      content: 'I\'ve been building the DreamLab community forum with SvelteKit and Nostr, and the developer experience is surprisingly good once you understand the paradigm.\n\nThe key insight is that Nostr events are just signed JSON. SvelteKit\'s reactive stores map perfectly to Nostr subscriptions \u2014 subscribe to a filter, pipe events into a writable store, and your UI updates automatically. We use NDK (Nostr Development Kit) which provides a clean abstraction over relay connections.\n\nThe hardest part was authentication. We went with WebAuthn PRF extension for key derivation, which means your passkey deterministically generates your Nostr identity. No seed phrases to backup, no extension to install. The tradeoff is browser support \u2014 Chrome is solid, Firefox is catching up, and Safari is... Safari.',
    },
  ];
}

function getCalendarEvents() {
  const in2days = NOW + 2 * 86400;
  const in5days = NOW + 5 * 86400;
  const in10days = NOW + 10 * 86400;

  return [
    {
      user: 'jj', ts: daysAgo(2, 0),
      d: 'weekly-standup',
      title: 'Weekly Community Standup',
      start: in2days,
      end: in2days + 3600,
      summary: 'Weekly catch-up for the DreamLab community. Share what you are working on, ask for help, and connect with fellow members.',
      location: 'Online \u2014 DreamLab Community',
    },
    {
      user: 'maya', ts: daysAgo(1, 0),
      d: 'ethics-workshop-maya',
      title: 'AI Ethics Workshop with Maya Patel',
      start: in5days,
      end: in5days + 7200,
      summary: 'Hands-on workshop covering bias detection, fairness metrics, and responsible AI deployment. Bring your models and datasets.',
      location: 'Online \u2014 DreamLab Community',
    },
    {
      user: 'jj', ts: daysAgo(0, -4),
      d: 'hackathon-workers-ai',
      title: 'Hackathon: Build with Workers AI',
      start: in10days,
      end: in10days + 28800,
      summary: 'Full-day hackathon building AI-powered applications on Cloudflare Workers. Prizes for best project, most creative use of edge computing, and best community tool.',
      location: 'Online \u2014 DreamLab Community',
    },
  ];
}

// ── Main Execution ─────────────────────────────────────────────────────
async function main() {
  console.log('=== DreamLab Forum Seed Script ===\n');
  console.log(`Relay: ${RELAY_URL}`);
  console.log(`Admin pubkey: ${ADMIN_PUBKEY}\n`);

  // Print user keys
  console.log('--- User keypairs ---');
  for (const [name, user] of Object.entries(USERS)) {
    console.log(`  ${name}: ${user.pubkey}`);
  }
  console.log();

  // Step 1: Whitelist non-admin users via NIP-98 authenticated API
  console.log('--- Step 1: Whitelist test users ---');
  const nonAdminUsers = Object.entries(USERS).filter(([name]) => name !== 'jj');
  let whitelistFailures = 0;
  for (const [name, user] of nonAdminUsers) {
    const ok = await whitelistUser(user.pubkey);
    if (!ok) {
      whitelistFailures++;
      console.error(`  Failed to whitelist ${name}`);
    }
    await delay(200); // small delay between API calls
  }
  console.log();

  // If whitelisting failed for all, fall back to admin-only mode
  const useAdminOnly = whitelistFailures === nonAdminUsers.length;
  if (useAdminOnly) {
    console.log('  WARNING: Whitelisting failed. All events will be signed by admin key.');
    console.log('  Profiles will still use individual keys (kind 0 allowed from anyone).\n');
  }

  // Step 2: Connect WebSocket
  console.log('--- Step 2: Connect to relay ---');
  try {
    await connectWebSocket();
    console.log('  Connected.\n');
  } catch (err) {
    console.error('Failed to connect to relay:', err.message);
    process.exit(1);
  }

  // Step 3: Publish user profiles (kind 0) -- allowed from any pubkey
  console.log('--- Step 3: Publish user profiles (kind 0) ---');
  for (const [name, user] of Object.entries(USERS)) {
    await publish(0, JSON.stringify(user.metadata), [], user.privkey, daysAgo(6, 0));
    await delay(150);
  }
  console.log();

  // Helper: pick signing key (user's own if whitelisted, admin otherwise)
  function signingKey(userName) {
    if (useAdminOnly) return ADMIN_PRIVKEY;
    return USERS[userName].privkey;
  }

  // Step 4: Create channels (kind 40) -- always signed by admin
  console.log('--- Step 4: Create channels (kind 40) ---');
  const channelDefs = getChannelDefinitions();
  const channelEvents = [];
  for (let i = 0; i < channelDefs.length; i++) {
    const ch = channelDefs[i];
    const event = await publish(
      40,
      JSON.stringify({ name: ch.name, about: ch.about, picture: ch.picture }),
      [],
      ADMIN_PRIVKEY,
      daysAgo(6, i + 1),
    );
    channelEvents.push(event);
    await delay(150);
  }
  const channelIds = channelEvents.map(e => e?.id).filter(Boolean);

  if (channelIds.length === 0) {
    console.error('\n  ERROR: No channels created. Cannot proceed with channel messages.');
    ws.close();
    process.exit(1);
  }
  console.log(`  Channel IDs: ${channelIds.map(id => id.slice(0, 12) + '...').join(', ')}\n`);

  // Step 5: Publish channel messages (kind 42)
  console.log('--- Step 5: Publish channel messages (kind 42) ---');
  const messages = getChannelMessages(channelIds);
  const publishedMessages = [];
  for (const msg of messages) {
    if (!msg.channel) {
      console.error(`  [SKIP] Missing channel for ${msg.user}'s message`);
      publishedMessages.push({ event: null, user: msg.user, channel: null });
      continue;
    }
    const event = await publish(
      42,
      msg.text,
      [['e', msg.channel, RELAY_URL, 'root']],
      signingKey(msg.user),
      msg.ts,
    );
    publishedMessages.push({ event, user: msg.user, channel: msg.channel });
    await delay(150);
  }
  console.log();

  // Step 6: Publish forum posts (kind 1)
  console.log('--- Step 6: Publish forum posts (kind 1) ---');
  const forumPosts = getForumPosts();
  const publishedPosts = [];
  for (const post of forumPosts) {
    const event = await publish(
      1,
      post.content,
      [['t', 'forum'], ['subject', post.subject]],
      signingKey(post.user),
      post.ts,
    );
    publishedPosts.push({ event, user: post.user });
    await delay(150);
  }
  console.log();

  // Step 7: Publish calendar events (kind 31923 -- NIP-52 date-based)
  console.log('--- Step 7: Publish calendar events (kind 31923) ---');
  const calendarEvents = getCalendarEvents();
  for (const cal of calendarEvents) {
    await publish(
      31923,
      cal.summary,
      [
        ['d', cal.d],
        ['title', cal.title],
        ['start', String(cal.start)],
        ['end', String(cal.end)],
        ['location', cal.location],
      ],
      signingKey(cal.user),
      cal.ts,
    );
    await delay(150);
  }
  console.log();

  // Step 8: Publish reactions (kind 7)
  console.log('--- Step 8: Publish reactions (kind 7) ---');
  const reactableEvents = [
    ...publishedMessages.filter(m => m.event),
    ...publishedPosts.filter(p => p.event),
  ];

  if (reactableEvents.length === 0) {
    console.log('  No reactable events available, skipping reactions.\n');
  } else {
    // Build reactions targeting specific indices with bounds checking
    const reactionDefs = [
      { reactor: 'sarah', targetIdx: 0, emoji: '\ud83d\udc4d' },
      { reactor: 'alex', targetIdx: 0, emoji: '\u2764\ufe0f' },
      { reactor: 'maya', targetIdx: 1, emoji: '\ud83d\udc4d' },
      { reactor: 'tom', targetIdx: 5, emoji: '\ud83d\udc4d' },
      { reactor: 'liwei', targetIdx: 5, emoji: '\u2764\ufe0f' },
      { reactor: 'jj', targetIdx: 7, emoji: '\ud83d\udc4d' },
      // React to forum posts (channel messages + posts)
      { reactor: 'alex', targetIdx: 15, emoji: '\ud83d\udc4d' },
      { reactor: 'maya', targetIdx: 16, emoji: '\u2764\ufe0f' },
      { reactor: 'tom', targetIdx: 17, emoji: '\ud83d\udc4d' },
      { reactor: 'sarah', targetIdx: 18, emoji: '\u2764\ufe0f' },
    ];

    for (const r of reactionDefs) {
      const idx = Math.min(r.targetIdx, reactableEvents.length - 1);
      if (idx < 0) continue;
      const targetEvent = reactableEvents[idx].event;
      await publish(
        7,
        r.emoji,
        [
          ['e', targetEvent.id],
          ['p', targetEvent.pubkey],
        ],
        signingKey(r.reactor),
        NOW - Math.floor(Math.random() * 43200), // within last 12 hours
      );
      await delay(150);
    }
    console.log();
  }

  // Summary
  const totalPublished = [
    ...Object.values(USERS),
    ...channelEvents,
    ...publishedMessages.map(m => m.event),
    ...publishedPosts.map(p => p.event),
  ].filter(Boolean).length;

  console.log('=== Seed complete ===');
  console.log(`  Published events to ${RELAY_URL}`);
  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  if (ws) ws.close();
  process.exit(1);
});
