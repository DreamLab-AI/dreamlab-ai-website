// Browser acceptance probe for the three-frontend origin (ADR-2003 closeout).
//
// Drives the Chrome on the browsercontainer sidecar over raw CDP. For each
// surface it performs a DIRECT load (not an in-app navigation), waits for the
// app to actually render, runs a surface-specific probe in page context,
// collects console errors, and writes a screenshot.
//
// Everything it asserts is observed, not assumed: a surface that fails to boot
// produces a probe result saying so rather than a passing row.

import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const CDP_HOST = process.env.CDP_HOST ?? "172.20.0.6:9223";
const BASE = process.env.BASE_URL ?? "http://agentbox:8181";
const OUT_DIR = process.env.OUT_DIR ?? ".";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A CDP session against one target, with request/response correlation. */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
        }
        return;
      }
      this.events.push(msg);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, 45000);
    });
  }

  /** Console errors and page exceptions seen since the last clear. */
  consoleErrors() {
    const out = [];
    for (const e of this.events) {
      if (e.method === "Runtime.exceptionThrown") {
        out.push({
          kind: "exception",
          text:
            e.params.exceptionDetails?.exception?.description ??
            e.params.exceptionDetails?.text ??
            "unknown exception",
        });
      }
      if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
        out.push({
          kind: "console.error",
          text: e.params.args.map((a) => a.value ?? a.description ?? a.type).join(" "),
        });
      }
      if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
        out.push({ kind: `log.${e.params.entry.source}`, text: e.params.entry.text });
      }
    }
    return out;
  }

  clearEvents() {
    this.events.length = 0;
  }
}

async function openTarget(url) {
  const res = await fetch(`http://${CDP_HOST}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  const session = new Session(ws);
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Log.enable");
  return { session, targetId: target.id, ws };
}

async function closeTarget(targetId, ws) {
  try {
    ws.close();
  } catch {
    /* already gone */
  }
  await fetch(`http://${CDP_HOST}/json/close/${targetId}`).catch(() => {});
}

/** Evaluate an expression in page context and return its JSON value. */
async function evaluate(session, expression) {
  const r = await session.send("Runtime.evaluate", {
    expression: `(async () => JSON.stringify(await (async () => { ${expression} })()))()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    return { __error: r.exceptionDetails.exception?.description ?? "evaluation failed" };
  }
  return JSON.parse(r.result.value);
}

async function screenshot(session, name) {
  const { data } = await session.send("Page.captureScreenshot", { format: "png" });
  const path = `${OUT_DIR}/screenshots/${name}.png`;
  writeFileSync(path, Buffer.from(data, "base64"));
  return `screenshots/${name}.png`;
}

/**
 * Run one check: direct-load a URL, settle, probe, screenshot.
 * `initScript` runs before any page script (used to simulate a severed relay).
 */
async function check({ name, url, probe, settleMs = 3500, initScript }) {
  const { session, targetId, ws } = await openTarget("about:blank");
  try {
    if (initScript) {
      await session.send("Page.addScriptToEvaluateOnNewDocument", { source: initScript });
    }
    session.clearEvents();
    const started = Date.now();
    await session.send("Page.navigate", { url });
    await sleep(settleMs);
    const result = await evaluate(session, probe);
    const shot = await screenshot(session, name);
    return {
      name,
      url,
      load_ms: Date.now() - started,
      probe: result,
      console_errors: session.consoleErrors(),
      screenshot: shot,
    };
  } finally {
    await closeTarget(targetId, ws);
  }
}

// ── Probes ──────────────────────────────────────────────────────────────────

const REACT_PROBE = `
  return {
    title: document.title,
    h1: document.querySelector('h1')?.innerText?.slice(0,80) ?? null,
    root_mounted: (document.getElementById('root')?.children?.length ?? 0) > 0,
    body_text_len: document.body.innerText.length,
    talk_to_ai_fab: !!document.querySelector('[aria-label="Talk to AI"]'),
    path: location.pathname
  };
`;

const FORUM_PROBE = `
  const env = window.__ENV__ || {};
  return {
    title: document.title,
    wasm_booted: document.body.innerText.length > 0 && !document.body.innerText.includes('Loading...'),
    body_text_len: document.body.innerText.length,
    env_keys: Object.keys(env).sort(),
    relay: env.VITE_RELAY_URL ?? null,
    auth_api: env.VITE_AUTH_API_URL ?? null,
    zone_count: Array.isArray(env.ZONE_CONFIG) ? env.ZONE_CONFIG.length
              : (typeof env.ZONE_CONFIG === 'string' ? JSON.parse(env.ZONE_CONFIG).length : 0),
    zone_slugs: (Array.isArray(env.ZONE_CONFIG) ? env.ZONE_CONFIG
              : JSON.parse(env.ZONE_CONFIG || '[]')).map(z => z.slug),
    sw_registered: window.__SW_REGISTERED__ || []
  };
`;

const BBS_PROBE = `
  const env = window.__ENV__ || {};
  return {
    title: document.title,
    wasm_booted: document.body.innerText.length > 0,
    body_text_len: document.body.innerText.length,
    env_keys: Object.keys(env).sort(),
    node_name: env.NODE_NAME ?? null,
    theme: env.THEME ?? null,
    relay: env.RELAY_URL ?? null,
    pod_api: env.POD_API ?? null,
    jarvis: env.JARVIS_PUBKEY ?? null,
    zone_count: (Array.isArray(env.ZONE_CONFIG) ? env.ZONE_CONFIG
              : JSON.parse(env.ZONE_CONFIG || '[]')).length,
    sw_registered: window.__SW_REGISTERED__ || [],
    screen_text: document.body.innerText.split('\\n').map(s=>s.trim()).filter(Boolean).slice(0,12)
  };
`;

// The rig serves plain HTTP from a non-localhost origin, so Chrome withholds
// navigator.serviceWorker (a secure-context API). Both Leptos clients call
// serviceWorker.register during boot and abort on the resulting TypeError. That
// is an artefact of the harness, not of the build - the real origin is HTTPS -
// so we stub the API to let the client boot and be observed. The stub records
// what would have been registered so the receipt still evidences the call.
const SW_STUB = `
  if (!navigator.serviceWorker) {
    window.__SW_REGISTERED__ = [];
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: (url, opts) => {
          window.__SW_REGISTERED__.push(String(url));
          return Promise.resolve({ scope: (opts && opts.scope) || '/', update: () => Promise.resolve() });
        },
        addEventListener: () => {},
        ready: new Promise(() => {}),
        controller: null
      }
    });
  }
`;

// Severs every WebSocket so the Talk-to-AI widget takes its disconnected path.
// This is deliberate: the built bundle carries the PRODUCTION relay URL and
// agent pubkey, and the acceptance check must not send a real DM to the live
// agent. Blocking the socket exercises the failure branch without any traffic.
const BLOCK_WS = `
  window.__WS_BLOCKED__ = [];
  window.WebSocket = class {
    constructor(url) {
      window.__WS_BLOCKED__.push(String(url));
      throw new Error('WebSocket blocked by acceptance probe');
    }
  };
`;

const CHAT_PROBE = `
  const click = (sel) => { const el = document.querySelector(sel); if (el) el.click(); return !!el; };
  const opened = click('[aria-label="Talk to AI"]');
  await new Promise(r => setTimeout(r, 400));
  const input = document.querySelector('input[placeholder="Type a message..."]');
  if (!input) return { opened, panel: false };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Are you there?');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  click('[aria-label="Send message"]');
  await new Promise(r => setTimeout(r, 2500));
  const panel = document.querySelector('[role="dialog"][aria-label="AI Chat"]');
  return {
    opened,
    panel: !!panel,
    blocked_sockets: window.__WS_BLOCKED__ || [],
    transcript: panel ? panel.innerText.split('\\n').map(s => s.trim()).filter(Boolean) : [],
    input_reenabled: !document.querySelector('input[placeholder="Type a message..."]')?.disabled
  };
`;

// ── Run ─────────────────────────────────────────────────────────────────────

const checks = [
  { name: "01-react-root", url: `${BASE}/`, probe: REACT_PROBE, settleMs: 6000 },
  { name: "02-react-programmes-deeplink", url: `${BASE}/programmes`, probe: REACT_PROBE },
  { name: "03-react-contact-deeplink", url: `${BASE}/contact`, probe: REACT_PROBE },
  { name: "04-forum-community", url: `${BASE}/community/`, probe: FORUM_PROBE, settleMs: 9000, initScript: SW_STUB },
  { name: "05-forum-deeplink-login", url: `${BASE}/community/login`, probe: FORUM_PROBE, settleMs: 9000, initScript: SW_STUB },
  { name: "06-bbs", url: `${BASE}/community/bbs/`, probe: BBS_PROBE, settleMs: 9000, initScript: SW_STUB },
  {
    name: "07-talk-to-ai-disconnected",
    url: `${BASE}/`,
    probe: CHAT_PROBE,
    settleMs: 4000,
    initScript: BLOCK_WS,
  },
];

const results = [];
for (const c of checks) {
  process.stderr.write(`checking ${c.name} ... `);
  try {
    const r = await check(c);
    results.push(r);
    process.stderr.write(`ok (${r.console_errors.length} console error(s))\n`);
  } catch (err) {
    results.push({ name: c.name, url: c.url, error: String(err) });
    process.stderr.write(`FAILED: ${err}\n`);
  }
}

console.log(JSON.stringify(results, null, 2));
