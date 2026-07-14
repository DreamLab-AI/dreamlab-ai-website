// Live E2E for the front-page AI chat's FULL round trip (ADR-042 amendment).
//
// Mirrors exactly what the browser does: mint a throwaway session key, publish
// a gift-wrapped question to junkiejarvis on the primary (whitelist-gated)
// relay, then listen for the kind-1059 reply on the primary AND the open reply
// relays. The reply can only ever arrive via the open relays — the primary's
// admission gate rejects wraps addressed to the non-whitelisted session key —
// so this probe fails if the open-relay listen path regresses.
//
// The throwaway key is generated in-memory and never printed or persisted.
//
// Usage: node scripts/seed/test-website-chat-roundtrip.mjs
//   RELAY_URL / REPLY_RELAYS / JARVIS_PUBKEY env vars override the defaults.
import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools/pure";
import * as nip17 from "nostr-tools/nip17";
import * as nip59 from "nostr-tools/nip59";

const RELAY =
  process.env.RELAY_URL || "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev";
const REPLY_RELAYS = (process.env.REPLY_RELAYS || "wss://relay.damus.io,wss://relay.primal.net")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const JARVIS =
  process.env.JARVIS_PUBKEY || "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9";
const QUESTION =
  process.env.QUESTION || "What residential AI training does DreamLab offer? (round-trip probe)";
const TIMEOUT_MS = 75000; // 30s browser budget + margin for open-relay propagation

const sk = generateSecretKey();
const me = getPublicKey(sk);
const now = () => Math.floor(Date.now() / 1000);
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

console.log(`session pubkey (throwaway): ${me.slice(0, 8)}…${me.slice(-4)}`);
console.log(`primary: ${RELAY}`);
console.log(`reply relays: ${REPLY_RELAYS.join(", ")}`);

let done = false;
const finish = (code, msg) => {
  if (done) return;
  done = true;
  console.log(msg);
  process.exit(code);
};

setTimeout(
  () => finish(1, `TIMEOUT after ${TIMEOUT_MS / 1000}s — no reply reached any listener`),
  TIMEOUT_MS,
);

const seen = new Set();
function handleWrap(event, source) {
  if (seen.has(event.id)) return;
  seen.add(event.id);
  let rumor;
  try {
    rumor = nip59.unwrapEvent(event, sk);
  } catch {
    return; // not for us
  }
  if (rumor.pubkey === me) return; // self-authored echo
  console.log(`\nREPLY RECEIVED (+${elapsed()}) via ${source}`);
  console.log(`  from: ${rumor.pubkey.slice(0, 8)}… (jarvis: ${rumor.pubkey === JARVIS})`);
  console.log(`  content: ${JSON.stringify(rumor.content.slice(0, 400))}`);
  finish(0, `\nROUND TRIP OK in ${elapsed()}`);
}

const inboxFilter = { kinds: [1059], "#p": [me] };

// Listener on the primary relay: AUTH-gated 1059 reads, so answer the
// challenge before subscribing (same ordering as the browser's DmSession).
function listenPrimary() {
  const ws = new WebSocket(RELAY);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === "AUTH") {
      ws.send(
        JSON.stringify([
          "AUTH",
          finalizeEvent(
            { kind: 22242, created_at: now(), tags: [["relay", RELAY], ["challenge", d[1]]], content: "" },
            sk,
          ),
        ]),
      );
      ws.send(JSON.stringify(["REQ", "inbox", inboxFilter]));
      // Subscribed on the primary — now publish the question on this socket.
      const wrap = nip17.wrapEvent(sk, { publicKey: JARVIS }, QUESTION);
      ws.send(JSON.stringify(["EVENT", wrap]));
      console.log(`question published (+${elapsed()}): ${wrap.id.slice(0, 8)}…`);
    } else if (d[0] === "OK") {
      console.log(`primary ack (+${elapsed()}): ${d[2] ? "accepted" : `REJECTED ${d[3] || ""}`}`);
      if (!d[2]) finish(1, "Primary relay rejected the question — check the jarvis whitelist.");
    } else if (d[0] === "EVENT" && d[1] === "inbox") {
      handleWrap(d[2], RELAY);
    }
  };
  ws.onerror = () => console.log(`primary socket error (+${elapsed()})`);
}

// Listeners on the open relays: no AUTH needed, subscribe on open. Kind 1059
// is stored, so even a listener that races the reply replays it as history.
function listenOpen(url) {
  const ws = new WebSocket(url);
  ws.onopen = () => ws.send(JSON.stringify(["REQ", "inbox", inboxFilter]));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === "EVENT" && d[1] === "inbox") handleWrap(d[2], url);
  };
  ws.onerror = () => console.log(`listener error on ${url} (+${elapsed()}) — continuing`);
}

for (const url of REPLY_RELAYS) listenOpen(url);
listenPrimary();
