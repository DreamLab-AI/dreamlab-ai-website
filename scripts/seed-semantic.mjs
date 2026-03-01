#!/usr/bin/env node

/**
 * seed-semantic.mjs -- Adds 60+ semantically diverse messages for search testing.
 * Run AFTER seed-forum.mjs has created channels and whitelisted users.
 *
 * Usage: node scripts/seed-semantic.mjs
 */

import { getPublicKey, finalizeEvent } from '/home/devuser/workspace/project2/community-forum/node_modules/nostr-tools/lib/esm/pure.js';
import { bytesToHex, hexToBytes } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/utils.js';
import { sha256 } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/sha256.js';
import WebSocket from '/home/devuser/workspace/project2/community-forum/node_modules/ws/wrapper.mjs';

const RELAY_URL = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const ADMIN_PRIVKEY_HEX = '60da2527b79aea2e90a0fab5284870a1fc93bf751bab3088a4fe6d47e3995668';
const ADMIN_PRIVKEY = hexToBytes(ADMIN_PRIVKEY_HEX);
const ADMIN_PUBKEY = getPublicKey(ADMIN_PRIVKEY);

function deriveKey(seed) {
  return sha256(new TextEncoder().encode(seed));
}

const USERS = {
  jj:    { privkey: ADMIN_PRIVKEY, pubkey: ADMIN_PUBKEY },
  sarah: { privkey: deriveKey('dreamlab-test-sarah-chen-2026') },
  alex:  { privkey: deriveKey('dreamlab-test-alex-rivera-2026') },
  maya:  { privkey: deriveKey('dreamlab-test-maya-patel-2026') },
  tom:   { privkey: deriveKey('dreamlab-test-tom-wilson-2026') },
  liwei: { privkey: deriveKey('dreamlab-test-li-wei-2026') },
};
for (const user of Object.values(USERS)) {
  if (!user.pubkey) user.pubkey = getPublicKey(user.privkey);
}

const NOW = Math.floor(Date.now() / 1000);
function hoursAgo(h) { return NOW - h * 3600; }

let ws, pendingOK = null;

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(RELAY_URL);
    ws.on('open', () => resolve());
    ws.on('error', (err) => reject(err));
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === 'OK' && pendingOK) pendingOK(msg);
    });
  });
}

function publishEvent(signedEvent) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingOK = null;
      reject(new Error(`Timeout: ${signedEvent.id.slice(0, 12)}...`));
    }, 15000);
    pendingOK = (msg) => {
      clearTimeout(timer);
      pendingOK = null;
      const [, eventId, success, message] = msg;
      if (success) resolve({ id: eventId });
      else reject(new Error(`Rejected: ${message}`));
    };
    ws.send(JSON.stringify(['EVENT', signedEvent]));
  });
}

async function publish(kind, content, tags, privkey, created_at) {
  const event = finalizeEvent({ kind, content, tags, created_at }, privkey);
  try {
    await publishEvent(event);
    console.log(`  [ok] ${event.id.slice(0, 12)} kind:${kind}`);
    return event;
  } catch (err) {
    console.error(`  [FAIL] kind:${kind} ${err.message}`);
    return null;
  }
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// First fetch existing channels so we can post into them
async function fetchChannelIds() {
  return new Promise((resolve, reject) => {
    const ids = [];
    const subId = 'fetch-channels';
    const timer = setTimeout(() => {
      resolve(ids);
    }, 5000);

    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === 'EVENT' && msg[1] === subId) {
        ids.push(msg[2].id);
      }
      if (msg[0] === 'EOSE' && msg[1] === subId) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(ids);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify(['REQ', subId, { kinds: [40], limit: 20 }]));
  });
}

// 60+ semantically diverse messages covering many topics
function getSemanticMessages(channelIds) {
  const [ch1, ch2, ch3, ch4] = channelIds;
  // Fall back to first channel if we don't have enough
  const c = (i) => channelIds[i] || channelIds[0] || 'unknown';

  return [
    // Machine Learning & Neural Networks
    { ch: c(1), u: 'maya', t: hoursAgo(47), text: 'Transformer architectures are hitting a plateau in parameter efficiency. The next breakthrough will likely come from mixture-of-experts models that activate only relevant subnetworks per token.' },
    { ch: c(1), u: 'alex', t: hoursAgo(46), text: 'Has anyone benchmarked the new Mamba architecture against standard transformers? The linear-time sequence modeling is promising for long-context applications.' },
    { ch: c(1), u: 'maya', t: hoursAgo(45), text: 'We tested Mamba on our genomics dataset — 200K token sequences. It outperformed GPT-4-turbo on accuracy while using 60% less compute. The state-space model approach really shines on structured data.' },
    { ch: c(1), u: 'liwei', t: hoursAgo(44), text: 'Fine-tuning tip: LoRA adapters with rank 16 give 95% of full fine-tuning performance on most NLP tasks. Save yourself the GPU hours.' },
    { ch: c(1), u: 'sarah', t: hoursAgo(43), text: 'Just read a fascinating paper on multimodal learning where they jointly train vision and language towers with a shared attention mechanism. The cross-modal transfer learning results are incredible.' },

    // Cloud Infrastructure & DevOps
    { ch: c(2), u: 'tom', t: hoursAgo(42), text: 'Migrating from Kubernetes to Cloudflare Workers for our API layer saved us $4,200/month. The cold start time went from 2.3s to 12ms. Edge computing is the real deal.' },
    { ch: c(2), u: 'alex', t: hoursAgo(41), text: 'Docker compose v2 tip: use depends_on with healthcheck conditions instead of sleep hacks. Much more reliable for service orchestration.' },
    { ch: c(2), u: 'tom', t: hoursAgo(40), text: 'If you are running PostgreSQL on RDS, switch to Aurora Serverless v2. We cut our database costs by 70% and got automatic scaling without the maintenance overhead.' },
    { ch: c(2), u: 'jj', t: hoursAgo(39), text: 'Infrastructure as code is non-negotiable in 2026. Terraform for cloud resources, Pulumi for anything that needs real programming logic, and Ansible for configuration management.' },
    { ch: c(2), u: 'tom', t: hoursAgo(38), text: 'Zero-downtime deployments with blue-green on Cloudflare Workers: just use gradual rollouts with traffic splitting. Set canary to 5%, monitor for 10 minutes, then promote.' },

    // Web Development & Frontend
    { ch: c(0), u: 'liwei', t: hoursAgo(37), text: 'SvelteKit 3.0 just dropped with native RSC support. The compilation step now generates both server and client components from the same .svelte file. Game changer for SEO.' },
    { ch: c(0), u: 'sarah', t: hoursAgo(36), text: 'Tailwind CSS v4 switched to a Rust-based engine. Build times went from 3.2s to 180ms on our design system with 2,000+ utility classes. The JIT compiler is blazing fast.' },
    { ch: c(0), u: 'liwei', t: hoursAgo(35), text: 'React Server Components are finally stable in Next.js 15. The mental model takes adjustment but the performance wins are undeniable — 40% smaller client bundles on our marketing site.' },
    { ch: c(0), u: 'sarah', t: hoursAgo(34), text: 'Accessibility audit checklist: (1) keyboard navigation, (2) screen reader testing with NVDA and VoiceOver, (3) color contrast ratios (WCAG AA minimum), (4) focus indicators, (5) ARIA labels on interactive elements.' },
    { ch: c(0), u: 'alex', t: hoursAgo(33), text: 'WebAssembly is becoming the universal runtime. We compile our physics engine in Rust, our image processing in C++, and our business logic in Go — all running in the browser through WASM.' },

    // Cryptography & Security
    { ch: c(2), u: 'jj', t: hoursAgo(32), text: 'WebAuthn PRF extension is the most underrated browser API. Deterministic key derivation from hardware authenticators means users never need to manage seed phrases or passwords.' },
    { ch: c(2), u: 'alex', t: hoursAgo(31), text: 'Security reminder: always use HKDF for key derivation, never raw hash functions. HKDF provides proper domain separation and extract-then-expand ensures uniform key material.' },
    { ch: c(2), u: 'tom', t: hoursAgo(30), text: 'SSL certificate automation with Cloudflare: enable automatic HTTPS, set minimum TLS to 1.2, enable HSTS with preload, and use Origin CA certificates for backend services.' },
    { ch: c(2), u: 'maya', t: hoursAgo(29), text: 'Post-quantum cryptography is shipping in browsers. Chrome 120+ supports ML-KEM (Kyber) for TLS key exchange. Start planning your migration from pure ECDH.' },
    { ch: c(2), u: 'jj', t: hoursAgo(28), text: 'Nostr protocol security model: every event is Schnorr-signed with the author private key. Verification is stateless — any client can independently verify authenticity without trusting the relay.' },

    // Database & Data Engineering
    { ch: c(1), u: 'alex', t: hoursAgo(27), text: 'Cloudflare D1 now supports RETURNING clauses and JSON functions. Combined with Durable Objects for coordination, it is a legitimate database for most web applications.' },
    { ch: c(1), u: 'tom', t: hoursAgo(26), text: 'Vector database comparison: pgvector for PostgreSQL integration, Qdrant for high-performance standalone, and RuVector for embedded edge deployment. Choose based on your deployment model.' },
    { ch: c(1), u: 'maya', t: hoursAgo(25), text: 'HNSW indexing tip: set ef_construction to 200 and M to 16 for billion-scale vector search. The recall at 99% is worth the extra memory — about 1.2GB per million 384-dim vectors.' },
    { ch: c(1), u: 'alex', t: hoursAgo(24), text: 'Event sourcing with CQRS pattern: write events to an append-only log, project into materialized views for reads. We use this for our trading platform — 50K events/sec with <5ms write latency.' },
    { ch: c(1), u: 'liwei', t: hoursAgo(23), text: 'SQLite is having a renaissance. With WAL mode, it handles 100K reads/sec and 10K writes/sec on a single machine. Perfect for Cloudflare D1 and embedded applications.' },

    // AI Ethics & Responsible Development
    { ch: c(0), u: 'maya', t: hoursAgo(22), text: 'Bias detection in language models requires intersectional analysis. Testing for gender bias alone misses compounded effects when race, age, and socioeconomic factors intersect.' },
    { ch: c(0), u: 'jj', t: hoursAgo(21), text: 'Responsible AI deployment checklist: model cards documenting training data and limitations, automated fairness metrics in CI, human-in-the-loop for high-stakes decisions, and incident response plans.' },
    { ch: c(0), u: 'maya', t: hoursAgo(20), text: 'The EU AI Act requires risk assessments for high-risk AI systems starting August 2026. If you deploy medical, financial, or hiring AI, you need documented compliance now.' },
    { ch: c(0), u: 'sarah', t: hoursAgo(19), text: 'Design for AI transparency: show confidence scores, explain why a recommendation was made, and always provide a way to override automated decisions. Trust is earned through explainability.' },
    { ch: c(0), u: 'alex', t: hoursAgo(18), text: 'Differential privacy is more practical than people think. Adding calibrated noise to training data protects individual records while preserving aggregate patterns. The utility loss is typically under 3%.' },

    // Nostr Protocol & Decentralization
    { ch: c(0), u: 'liwei', t: hoursAgo(17), text: 'NIP-28 public channels are essentially decentralized group chats. Kind 40 creates the room, kind 42 posts messages. All signed by the author — no server can forge your identity.' },
    { ch: c(0), u: 'jj', t: hoursAgo(16), text: 'The beauty of Nostr: your identity is a keypair. Move between clients, relays, and platforms without losing your social graph. No lock-in, no deplatforming risk.' },
    { ch: c(2), u: 'liwei', t: hoursAgo(15), text: 'NIP-42 relay authentication flow: relay sends AUTH challenge, client signs kind 22242 event with challenge and relay URL tags, relay verifies and grants write access.' },
    { ch: c(2), u: 'jj', t: hoursAgo(14), text: 'NIP-98 HTTP auth replaces API keys with signed events. Every request carries a kind 27235 event proving the caller owns the pubkey. Stateless verification on any server.' },
    { ch: c(0), u: 'alex', t: hoursAgo(13), text: 'Nostr relay scaling: use Durable Objects for WebSocket state, D1 for event storage, and KV for caching. A single Cloudflare Worker handles thousands of concurrent connections.' },

    // Project Management & Collaboration
    { ch: c(0), u: 'sarah', t: hoursAgo(12), text: 'Remote team productivity tip: async-first communication. Write detailed specs, use threads for discussions, and reserve video calls for brainstorming and social bonding.' },
    { ch: c(3), u: 'tom', t: hoursAgo(11), text: 'Code review best practices: keep PRs under 400 lines, include screenshots for UI changes, write descriptive commit messages, and use conventional commits for automated changelogs.' },
    { ch: c(3), u: 'sarah', t: hoursAgo(10), text: 'Design system tip: maintain a single source of truth for tokens (colors, spacing, typography). We use Style Dictionary to generate platform-specific outputs from JSON tokens.' },
    { ch: c(3), u: 'alex', t: hoursAgo(9), text: 'Monorepo vs polyrepo: use a monorepo when teams share code frequently and release together. Use polyrepo when services are truly independent with different release cycles.' },
    { ch: c(3), u: 'liwei', t: hoursAgo(8), text: 'Testing pyramid: 70% unit tests, 20% integration tests, 10% e2e tests. Unit tests are fast and reliable. E2e tests catch real bugs but are slow and flaky. Balance accordingly.' },

    // Community & Learning
    { ch: c(0), u: 'jj', t: hoursAgo(7), text: 'DreamLab training programme update: next cohort starts March 15th. Topics include AI agent development, distributed systems design, and cloud-native architecture. Applications open now.' },
    { ch: c(0), u: 'maya', t: hoursAgo(6), text: 'Learning resource: the Stanford CS229 machine learning course is free on YouTube. Pair it with fast.ai practical deep learning for a solid ML foundation.' },
    { ch: c(3), u: 'tom', t: hoursAgo(5), text: 'Pair programming works best in 25-minute Pomodoro sessions. The navigator switches every cycle. We have seen 30% fewer bugs and significantly better knowledge transfer.' },
    { ch: c(0), u: 'sarah', t: hoursAgo(4), text: 'Design thinking workshop recap: we ideated 15 features, prioritized by user impact vs implementation effort, and selected 3 for the next sprint. The 2x2 matrix never fails.' },
    { ch: c(0), u: 'liwei', t: hoursAgo(3), text: 'TypeScript 5.6 type inference is remarkable. It correctly infers discriminated unions, template literal types, and conditional mapped types without explicit annotations. Write less, get more safety.' },

    // Performance & Optimization
    { ch: c(1), u: 'alex', t: hoursAgo(2.5), text: 'Web performance budget: First Contentful Paint under 1.5s, Largest Contentful Paint under 2.5s, Cumulative Layout Shift under 0.1. Measure with Lighthouse and set CI gates.' },
    { ch: c(1), u: 'liwei', t: hoursAgo(2), text: 'Image optimization pipeline: convert to WebP/AVIF, generate srcset for responsive images, lazy-load below-the-fold, and use blur-up placeholders. Saves 60-80% bandwidth.' },
    { ch: c(1), u: 'tom', t: hoursAgo(1.5), text: 'Caching strategy for APIs: Cache-Control for static assets (1 year), stale-while-revalidate for dynamic data, and ETag for conditional requests. Use Cloudflare CDN for global distribution.' },
    { ch: c(0), u: 'sarah', t: hoursAgo(1), text: 'Core Web Vitals improvement: we replaced our carousel with a static hero, deferred third-party scripts, and preloaded the LCP image. Performance score went from 62 to 94.' },
    { ch: c(0), u: 'maya', t: hoursAgo(0.5), text: 'Just published benchmarks comparing PyTorch, JAX, and MLX for model inference on Apple Silicon. MLX wins on M3 Max by 2.3x over PyTorch MPS. The unified memory architecture makes a huge difference.' },

    // Additional diverse topics
    { ch: c(3), u: 'jj', t: hoursAgo(48), text: 'Reminder: the community calendar shows all upcoming events. Check the training rooms section for workshop schedules and booking availability.' },
    { ch: c(3), u: 'maya', t: hoursAgo(36), text: 'Book recommendation: Weapons of Math Destruction by Cathy ONeil. Essential reading for anyone building systems that affect peoples lives. Short, accessible, and deeply important.' },
    { ch: c(3), u: 'tom', t: hoursAgo(24), text: 'Weekend project idea: build a personal knowledge graph using Nostr events. Store notes as kind 30023 long-form content, link them with e-tags, and search with vector embeddings.' },
    { ch: c(3), u: 'alex', t: hoursAgo(12), text: 'GraphQL vs REST vs tRPC: use GraphQL for complex nested data, REST for simple CRUD, and tRPC for TypeScript full-stack apps. Stop debating — pick the right tool for the job.' },
    { ch: c(3), u: 'liwei', t: hoursAgo(6), text: 'CSS container queries are finally well-supported. Components can now adapt to their container width instead of the viewport. This is the biggest CSS feature since flexbox.' },
    { ch: c(0), u: 'tom', t: hoursAgo(3), text: 'GitHub Actions tip: use matrix strategies for parallel testing across Node versions and OS platforms. Combine with caching for 3x faster CI runs.' },
    { ch: c(1), u: 'jj', t: hoursAgo(2), text: 'Semantic search implementation: embed text with a sentence transformer, store vectors in HNSW index, query with cosine similarity. Top-k results with 0.7 threshold gives good precision-recall balance.' },
    { ch: c(1), u: 'sarah', t: hoursAgo(1), text: 'The future of search is hybrid: combine keyword matching (BM25) with semantic vectors for the best results. Neither alone covers all query types. Reciprocal rank fusion works well for merging.' },
  ];
}

async function main() {
  console.log('=== DreamLab Semantic Search Seed ===\n');
  console.log(`Relay: ${RELAY_URL}`);
  console.log(`Admin: ${ADMIN_PUBKEY.slice(0, 16)}...\n`);

  console.log('--- Connecting ---');
  await connectWebSocket();
  console.log('  Connected.\n');

  console.log('--- Fetching existing channels ---');
  const channelIds = await fetchChannelIds();
  console.log(`  Found ${channelIds.length} channels: ${channelIds.map(id => id.slice(0, 8) + '...').join(', ')}\n`);

  if (channelIds.length === 0) {
    console.error('No channels found. Run seed-forum.mjs first.');
    ws.close();
    process.exit(1);
  }

  console.log('--- Publishing semantic messages ---');
  const messages = getSemanticMessages(channelIds);
  let ok = 0, fail = 0;
  for (const msg of messages) {
    const event = await publish(
      42,
      msg.text,
      [['e', msg.ch, RELAY_URL, 'root']],
      USERS[msg.u].privkey,
      msg.t,
    );
    if (event) ok++; else fail++;
    await delay(120);
  }

  console.log(`\n=== Done: ${ok} published, ${fail} failed ===`);
  ws.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  if (ws) ws.close();
  process.exit(1);
});
