// Replay a coach-shaped DM to JunkieJarvis from a whitelisted member key over
// the primary relay (exactly what the forum client does) and listen for the
// kind-1059 reply on the primary AND the open relays. Key read from a file,
// never printed.
import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { wrapEvent, unwrapEvent } from 'nostr-tools/nip59';
const PRIMARY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const OPEN = ['wss://relay.damus.io', 'wss://relay.primal.net'];
const JARVIS = process.env.TARGET || '2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9';
const ADMIN_PUB = '11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c';
function adminSkFromEnv() {
  // Same lookup as find-admin-key.mjs: the agentbox env var whose pubkey is the admin's. Never printed.
  const envText = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
  for (const m of envText.matchAll(/^[A-Z0-9_]+=\s*"?([0-9a-f]{64})"?\s*$/gm)) {
    const cand = Uint8Array.from(Buffer.from(m[1], 'hex'));
    try { if (getPublicKey(cand) === ADMIN_PUB) return cand; } catch {}
  }
  throw new Error('admin key not found in agentbox env');
}
const sk = process.env.KEY_FROM_ADMIN_ENV === '1' ? adminSkFromEnv() : Uint8Array.from(Buffer.from(readFileSync(process.env.KEY_FILE, 'utf8').trim(), 'hex'));
const LISTEN_ONLY = process.env.LISTEN_ONLY === '1';
const me = getPublicKey(sk);
const now = () => Math.floor(Date.now() / 1000);
const PROMPT = process.env.PROMPT || `[poker-coach] You are coaching a beginner at heads-up fixed-limit Texas hold'em (practice chips, no money).
Rules: two players; blinds 1/2; bets are fixed at 2 preflop and on the flop, 4 on the turn and river; max 4 bets per street.
Hand state: street preflop. You are the small blind and dealer, stack 199. Opponent (First Mate Wren, plays tight-aggressive) stack 198, posted big blind 2. Pot 3. Your hole cards: K♠ 2♥. Board: none yet. To call costs 1. Legal actions: fold, call 1, raise to 4. Betting so far: you posted 1, opponent posted 2.
Reply in under 600 characters, starting with the exact text [coach]: recommended action, one or two sentences why, and one beginner tip.`;
const t0 = Date.now();
const log = (m) => console.log(`+${((Date.now() - t0) / 1000).toFixed(1)}s ${m}`);
let done = false;
const finish = (code) => { if (!done) { done = true; setTimeout(() => process.exit(code), 200); } };
setTimeout(() => { log('TIMEOUT — no reply'); finish(1); }, Math.max(60, Number(process.env.LISTEN_SECS || 0) + 5) * 1000);
function listen(url, authed) {
  const ws = new WebSocket(url);
  ws.onopen = () => {
    if (!authed) {
      ws.send(JSON.stringify(['REQ', 'r' + Math.random(), { kinds: [1059], '#p': [me] }]));
      if (process.env.ALSO_OPEN === '1') {
        const rumor = { kind: 14, created_at: now(), tags: [['p', JARVIS]], content: PROMPT, pubkey: me };
        const wrap = wrapEvent(rumor, sk, JARVIS);
        ws.send(JSON.stringify(['EVENT', wrap]));
        log(`published wrap ${wrap.id.slice(0, 8)} to ${url} (ALSO_OPEN)`);
      }
    }
  };
  ws.onmessage = async (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === 'AUTH' && authed) {
      const authEv = finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', url], ['challenge', d[1]]], content: '' }, sk);
      ws._authId = authEv.id;
      ws.send(JSON.stringify(['AUTH', authEv]));
      return;
    }
    if (d[0] === 'OK' && authed && d[1] === ws._authId) {
      log(`primary AUTH ${d[2] ? 'ok' : 'REJECTED ' + d[3]}`);
      if (!d[2]) return;
      setTimeout(() => {
        ws.send(JSON.stringify(['REQ', 'dm', { kinds: [1059], '#p': [me] }]));
        if (LISTEN_ONLY) { log('listen-only: not publishing'); setTimeout(() => finish(0), Number(process.env.LISTEN_SECS || 12) * 1000); return; }
        const rumor = { kind: 14, created_at: now() - Number(process.env.RUMOR_BACKDATE_SECS || 0), tags: [['p', JARVIS]], content: PROMPT, pubkey: me };
        const wrap = wrapEvent(rumor, sk, JARVIS);
        ws.send(JSON.stringify(['EVENT', wrap]));
        log(`published wrap ${wrap.id.slice(0, 8)} (rumor backdated ${process.env.RUMOR_BACKDATE_SECS || 0}s) to primary (${PROMPT.length} chars)`);
      }, 300);
    }
    if (d[0] === 'OK' && d[1] !== ws._authId) log(`${authed ? 'primary' : url} ack: ${d[2] ? 'accepted' : 'REJECTED ' + d[3]}`);
    if (d[0] === 'CLOSED' || d[0] === 'NOTICE') log(`${authed ? 'primary' : url} ${d[0]}: ${JSON.stringify(d.slice(1)).slice(0, 160)}`);
    if (d[0] === 'EOSE') log(`${authed ? 'primary' : url} EOSE`);
    if (d[0] === 'EVENT') {
      try {
        const r = unwrapEvent(d[2], sk);
        if (process.env.LOG_ALL === '1') log(`UNWRAP OK via ${url} from ${r.pubkey.slice(0, 8)} kind ${r.kind} id ${r.id ? String(r.id).slice(0, 8) : 'NONE'} (rumor ${new Date(r.created_at * 1000).toISOString().slice(11, 19)}, wrap ${new Date(d[2].created_at * 1000).toISOString().slice(5, 16)}): ${JSON.stringify(String(r.content).slice(0, 70))}`);
        if (r.pubkey === JARVIS) { log(`REPLY via ${url} (rumor ${new Date(r.created_at * 1000).toISOString().slice(11, 19)}): ${JSON.stringify(r.content.slice(0, 120))}`); setTimeout(() => finish(0), 8000); }
      } catch (e) { if (process.env.LOG_ALL === '1') log(`UNWRAP FAILED via ${url} wrap ${String(d[2] && d[2].id).slice(0, 8)} outer ${new Date((d[2] && d[2].created_at) * 1000).toISOString().slice(0, 16)}: ${e && e.message}`); }
    }
  };
  ws.onerror = (e) => log(`${url} error`);
}
listen(PRIMARY, true);
for (const u of OPEN) listen(u, false);
