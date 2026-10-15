// Nightly inbox watch for the three outreach channels (contact form, email
// signup, Talk-to-AI chat). Replaces ad-hoc "open Amethyst and look".
//
// WHY A MONITOR KEY
// The relay's kind-1059 read gate rewrites every REQ to the authenticated
// viewer's own `#p` (nostr-rust-forum relay_do/nip42.rs), so nothing short of the
// admin key can read the admin's inbox. Instead every form/chat submission is
// also gift-wrapped to a dedicated monitor pubkey (VITE_MONITOR_PUBKEY, see
// src/lib/nostr.ts publishMonitorCopy). This job holds that monitor's secret
// (.agentbox/inbox-watch/monitor.key, 0600) and can read and verify exactly
// those copies, and nothing else.
//
// WHAT IT DOES EACH RUN
//   1. Health: relay WS+AUTH, whitelist rows for admin / jarvis / monitor
//      (the reset-db hazard silently drops them), and the deployed site bundle
//      actually carrying all three pubkeys.
//   2. Probe: publishes a labelled wrap to the monitor and reads it back, which
//      proves write, AUTH-gated read and decrypt end to end without touching the
//      admin inbox or triggering an agent reply. Probes are excluded from counts.
//   3. Inbox: REQ the monitor's wraps for the last 3 days (NIP-59 randomises wrap
//      created_at up to 2 days back), verify seal signature + author binding,
//      dedupe by wrap id against the state file, and classify.
//   4. Alert: only if there are new messages or a health failure, send ONE
//      NIP-17 digest DM to the operator (read in Amethyst) over the cloud relay.
//
// Usage: node scripts/inbox-watch/run.mjs [--dry-run] [--always]
//   --dry-run  do everything except send the alert and persist state
//   --always   send the digest even when quiet and healthy
// Env: INBOX_WATCH_DIR, RELAY_URL, SITE_ORIGIN, ADMIN_PUBKEY, JARVIS_PUBKEY,
//      OPERATOR_PUBKEY (default: AGENTBOX_PUBKEY from env or agentbox/.env).
import fs from "node:fs";
import path from "node:path";
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools/pure";
import * as nip17 from "nostr-tools/nip17";
import * as nip44 from "nostr-tools/nip44";

const DRY = process.argv.includes("--dry-run");
const ALWAYS = process.argv.includes("--always");

const DIR = process.env.INBOX_WATCH_DIR || "/home/devuser/workspace/.agentbox/inbox-watch";
const RELAY = process.env.RELAY_URL || "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev";
const RELAY_HTTP = RELAY.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
const SITE = process.env.SITE_ORIGIN || "https://dreamlab-ai.com";
const ADMIN = process.env.ADMIN_PUBKEY || "11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c";
const JARVIS = process.env.JARVIS_PUBKEY || "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9";
const LOOKBACK_SEC = 3 * 86400;
const SEEN_TTL_SEC = 7 * 86400;
const PROBE_TAG = "[inbox-watch probe]";
const STATE_FILE = path.join(DIR, "state.json");
const STATUS_FILE = path.join(DIR, "last-run.json");

const now = () => Math.floor(Date.now() / 1000);
const hexToBytes = (h) => Uint8Array.from(Buffer.from(h, "hex"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[inbox-watch] ${m}`);

function readSecretHex(file) {
  const hex = fs.readFileSync(file, "utf8").trim();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error(`${file} is not a 64-char hex key`);
  return hex;
}

// Same precedence as agentbox config/hooks/nostr-live-mirror.cjs recipientPubkey(),
// so the digest lands in the inbox the session mirror already uses in Amethyst.
const RECIPIENT_KEYS = [
  "AGENTBOX_MIRROR_RECIPIENT_PUBKEY",
  "AGENTBOX_PUBKEY",
  "AGENTBOX_BRIDGE_RECIPIENT_PUBKEY",
  "AGENTBOX_ADMIN_PUBKEY",
];
function operatorPubkey() {
  if (process.env.OPERATOR_PUBKEY) return process.env.OPERATOR_PUBKEY;
  const valid = (v) => (/^[0-9a-f]{64}$/.test((v || "").trim().toLowerCase()) ? v.trim().toLowerCase() : null);
  for (const k of RECIPIENT_KEYS) if (valid(process.env[k])) return valid(process.env[k]);
  for (const f of ["/home/devuser/workspace/project/agentbox/.env", "/home/devuser/workspace/agentbox/.env"]) {
    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const k of RECIPIENT_KEYS) {
      const m = text.match(new RegExp(`^${k}=["']?([0-9a-f]{64})`, "m"));
      if (m) return m[1];
    }
  }
  return null;
}

/** Open a socket and answer the relay's NIP-42 challenge with `sk`. */
function openAuthed(url, sk) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const handlers = new Set();
    let authed = false;
    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      reject(new Error("timed out connecting / authenticating"));
    }, 12000);
    ws.onerror = () => { clearTimeout(timer); reject(new Error("relay connection error")); };
    ws.onmessage = (m) => {
      let f;
      try { f = JSON.parse(m.data); } catch { return; }
      if (!Array.isArray(f)) return;
      if (f[0] === "AUTH" && typeof f[1] === "string" && !authed) {
        authed = true;
        ws.send(JSON.stringify(["AUTH", finalizeEvent({
          kind: 22242, created_at: now(),
          tags: [["relay", url], ["challenge", f[1]]], content: "",
        }, sk)]));
        clearTimeout(timer);
        resolve({ ws, on: (h) => handlers.add(h), off: (h) => handlers.delete(h) });
      }
      for (const h of handlers) h(f);
    };
  });
}

/** Publish `event`; retry once after NIP-42 if the relay says auth-required. */
async function publish(url, event, sk) {
  const conn = await openAuthed(url, sk);
  try {
    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, message: "timeout waiting for OK" }), 10000);
      conn.on((f) => {
        if (f[0] === "OK" && f[1] === event.id) {
          clearTimeout(timer);
          resolve({ ok: Boolean(f[2]), message: typeof f[3] === "string" ? f[3] : "" });
        }
      });
      conn.ws.send(JSON.stringify(["EVENT", event]));
    });
  } finally {
    try { conn.ws.close(); } catch { /* ignore */ }
  }
}

async function fetchWraps(url, sk, pk, since) {
  const conn = await openAuthed(url, sk);
  const events = [];
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting for EOSE")), 15000);
      conn.on((f) => {
        if (f[0] === "EVENT" && f[1] === "iw") events.push(f[2]);
        else if (f[0] === "EOSE" && f[1] === "iw") { clearTimeout(timer); resolve(); }
        else if (f[0] === "CLOSED" && f[1] === "iw") { clearTimeout(timer); reject(new Error(`subscription closed: ${f[2] || ""}`)); }
      });
      conn.ws.send(JSON.stringify(["REQ", "iw", { kinds: [1059], "#p": [pk], since, limit: 500 }]));
    });
  } finally {
    try { conn.ws.close(); } catch { /* ignore */ }
  }
  return events;
}

/** NIP-59 unwrap with the trust chain nostr-tools' own unwrap skips. */
function unwrapVerified(wrap, sk) {
  const seal = JSON.parse(nip44.decrypt(wrap.content, nip44.getConversationKey(sk, wrap.pubkey)));
  if (seal.kind !== 13) throw new Error("not a seal");
  if (!verifyEvent(seal)) throw new Error("bad seal signature");
  const rumor = JSON.parse(nip44.decrypt(seal.content, nip44.getConversationKey(sk, seal.pubkey)));
  if (rumor.pubkey !== seal.pubkey) throw new Error("rumor/seal author mismatch");
  if (typeof rumor.content !== "string") throw new Error("rumor has no content");
  return rumor;
}

/** Turn a rumor into { kind, source, name, email, excerpt } for the digest. */
function classify(rumor) {
  const text = rumor.content;
  if (text.includes(PROBE_TAG)) return { kind: "probe" };
  const j = text.indexOf("{");
  if (j >= 0) {
    try {
      const p = JSON.parse(text.slice(j));
      if (p.type === "contact_enquiry" || p.type === "contact_signup") {
        return {
          kind: p.type === "contact_enquiry" ? "enquiry" : "signup",
          source: p.source || "unknown",
          name: p.name || "",
          email: p.email || "",
          detail: p.engagement_type || "",
          excerpt: String(p.message || "").replace(/\s+/g, " ").slice(0, 160),
        };
      }
    } catch {
      /* fall through to chat */
    }
  }
  if (/^X-DreamLab-Request:/m.test(text)) {
    const body = text.split(/\r?\n\r?\n/).slice(1).join(" ").replace(/\s+/g, " ");
    return { kind: "chat", source: "talk_to_ai", excerpt: body.slice(0, 160) };
  }
  return { kind: "other", source: "unknown", excerpt: text.replace(/\s+/g, " ").slice(0, 160) };
}

async function checkWhitelist(label, pk) {
  try {
    const r = await fetch(`${RELAY_HTTP}/api/check-whitelist?pubkey=${pk}`, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    return j.isWhitelisted ? null : `${label} pubkey is NOT whitelisted on the relay (reset-db hazard?)`;
  } catch (e) {
    return `whitelist check for ${label} failed: ${e.message}`;
  }
}

/** The deployed bundle must carry the relay + all three pubkeys. */
async function checkDeployedBundle(monitorPk) {
  const problems = [];
  try {
    const html = await (await fetch(`${SITE}/`, { signal: AbortSignal.timeout(15000) })).text();
    const entry = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    if (!entry) return ["deployed homepage references no index bundle"];
    const bodies = [await (await fetch(`${SITE}/${entry}`)).text()];
    const want = /(?:Contact|Index|EmailSignupForm)-[\w-]+\.js/g;
    const seen = new Set();
    for (let depth = 0; depth < 2; depth++) {
      const names = new Set(bodies.flatMap((b) => b.match(want) || []));
      for (const n of names) {
        if (seen.has(n)) continue;
        seen.add(n);
        bodies.push(await (await fetch(`${SITE}/assets/${n}`)).text());
      }
    }
    const all = bodies.join("\n");
    for (const [label, pk] of [["admin", ADMIN], ["jarvis", JARVIS], ["monitor", monitorPk]]) {
      if (!all.includes(pk)) problems.push(`deployed site bundle is missing the ${label} pubkey`);
    }
    if (!all.includes("dreamlab-nostr-relay")) problems.push("deployed site bundle is missing the relay URL");
    if (!all.includes("DreamLab website signup")) problems.push("signup form chunk not found in deployed bundle");
  } catch (e) {
    problems.push(`deployed-bundle check failed: ${e.message}`);
  }
  return problems;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const monitorSk = hexToBytes(readSecretHex(path.join(DIR, "monitor.key")));
  const monitorPk = getPublicKey(monitorSk);
  const problems = [];

  // 1. Health
  for (const [label, pk] of [["admin", ADMIN], ["jarvis", JARVIS], ["monitor", monitorPk]]) {
    const p = await checkWhitelist(label, pk);
    if (p) problems.push(p);
  }
  problems.push(...(await checkDeployedBundle(monitorPk)));

  // 2. Probe round trip (to the monitor only)
  const probeSk = generateSecretKey();
  const probeText = `${PROBE_TAG} ${new Date().toISOString()}`;
  let probeId = null;
  try {
    const wrap = nip17.wrapEvent(probeSk, { publicKey: monitorPk }, probeText, "inbox-watch probe");
    probeId = wrap.id;
    const res = await publish(RELAY, wrap, probeSk);
    if (!res.ok) problems.push(`probe publish rejected by relay: ${res.message || "no reason"}`);
  } catch (e) {
    problems.push(`probe publish failed: ${e.message}`);
  }

  // 3. Inbox
  await sleep(1500);
  let wraps = [];
  try {
    wraps = await fetchWraps(RELAY, monitorSk, monitorPk, now() - LOOKBACK_SEC);
  } catch (e) {
    problems.push(`inbox read failed: ${e.message}`);
  }
  if (probeId && !wraps.some((w) => w.id === probeId) && !problems.some((p) => p.startsWith("probe publish"))) {
    problems.push("probe was accepted but not readable back from the monitor inbox");
  }

  let state = { seen: {} };
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { /* first run */ }
  const fresh = [];
  let undecryptable = 0;
  for (const w of wraps) {
    if (state.seen[w.id]) continue;
    state.seen[w.id] = now();
    let rumor;
    try { rumor = unwrapVerified(w, monitorSk); } catch { undecryptable++; continue; }
    const c = classify(rumor);
    if (c.kind === "probe") continue;
    fresh.push({ ...c, at: rumor.created_at });
  }
  for (const [id, t] of Object.entries(state.seen)) if (now() - t > SEEN_TTL_SEC) delete state.seen[id];
  if (undecryptable) problems.push(`${undecryptable} wrap(s) in the monitor inbox failed verification`);
  fresh.sort((a, b) => a.at - b.at);

  // 4. Alert
  const counts = fresh.reduce((m, f) => ((m[f.kind] = (m[f.kind] || 0) + 1), m), {});
  const summary = {
    ran_at: new Date().toISOString(),
    new_messages: fresh.length,
    counts,
    problems,
    wraps_in_window: wraps.length,
  };

  if (fresh.length || problems.length || ALWAYS) {
    const lines = [`DreamLab inbox watch · ${new Date().toISOString().slice(0, 10)}`];
    if (fresh.length) {
      lines.push("", `${fresh.length} new: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ")}`);
      for (const f of fresh) {
        const who = [f.name, f.email].filter(Boolean).join(" <") + (f.email && f.name ? ">" : "");
        lines.push(`• [${f.kind}${f.source ? " · " + f.source : ""}] ${who || "(anonymous)"}${f.detail ? " · " + f.detail : ""}${f.excerpt ? `\n  “${f.excerpt}”` : ""}`);
      }
    } else {
      lines.push("", "No new messages.");
    }
    if (problems.length) lines.push("", "⚠ Channel health:", ...problems.map((p) => `- ${p}`));
    const body = lines.join("\n");

    const operator = operatorPubkey();
    if (DRY) {
      log("dry-run, digest not sent:\n" + body);
    } else if (!operator) {
      summary.alert = "no operator pubkey (AGENTBOX_PUBKEY) — digest not sent";
      log(summary.alert);
    } else {
      const sk = generateSecretKey();
      const wrap = nip17.wrapEvent(sk, { publicKey: operator }, body, "DreamLab inbox watch");
      const res = await publish(RELAY, wrap, sk);
      summary.alert = res.ok ? "sent" : `relay rejected digest: ${res.message}`;
      log(`digest ${summary.alert}`);
      if (!res.ok) {
        // State is deliberately NOT persisted: the operator was never told, so
        // the same messages must surface again on the next run.
        process.exitCode = 1;
        fs.writeFileSync(STATUS_FILE, JSON.stringify(summary, null, 2));
        return;
      }
    }
  } else {
    log("quiet night, all channels healthy");
  }

  if (!DRY) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), { mode: 0o600 });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(summary, null, 2));
  }
  if (problems.length) process.exitCode = 2;
  log(JSON.stringify(summary));
}

main().catch((e) => {
  console.error(`[inbox-watch] fatal: ${e.message}`);
  process.exit(1);
});
