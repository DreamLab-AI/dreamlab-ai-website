// DW-02-S1-01 (Jev option): tag a contact enquiry with a topic in the nightly
// inbox digest.
//
// Where it runs, and why there. The contact form has no server component: the
// browser gift-wraps the enquiry to the admin key and publishes it straight to
// the relay (src/pages/Contact.tsx, src/lib/nostr.ts), so a Worker never sees
// plaintext. The only operator-side code that holds decrypted enquiries is the
// nightly inbox watch (scripts/inbox-watch/run.mjs), which decrypts the monitor
// copy to build a digest. That is the seam. The vendor key lives in the job's
// environment and never in the browser bundle.
//
// What Jev may do: add ONE annotation to a digest entry (a topic tag, and a
// "needs info" marker). It never delivers, replies, writes to a CRM, changes
// the sender's own choice (`detail` stays exactly what they picked), or touches
// delivery/exit-code/state logic. With the option off, unavailable or unsure,
// the digest is byte-identical to the pre-change digest.
//
// LOCAL-ONLY, unconditionally (audit 2026-11-26 C-1): decrypted enquiry text
// is private mail, and src/pages/Privacy.tsx promises this tagging "does not
// send your enquiry to a public AI service". No env switch can widen that:
//   - the public vendor endpoint is never used;
//   - the agentbox System One proxy is never used, even with
//     AGENTBOX_SYSTEM_ONE_BACKEND_LOCAL=1, because the proxy sits on loopback
//     while its backend (which holds the vendor key) is opaque from here;
//   - an explicit <PREFIX>_ENDPOINT needs DREAMLAB_JEV_LOCAL=1 AND a literal
//     loopback or RFC 1918 host (see isLocalEndpoint); any other DNS name fails
//     closed. callSystemOne sets redirect:"error", so a local endpoint cannot
//     bounce the request elsewhere.
// No usable local endpoint => no tagging. Enquiries the sender filed as
// `privacy` (GDPR requests) are never sent to a model at all.
import { resolveJev, callSystemOne, readChoice, readNoul, jevLog } from "./jev.mjs";

export const QUESTION_SET = "dw02-enquiry-topic-v1";
export const FLAG_PREFIX = "DREAMLAB_JEV";

/** Declared enquiry type that is never sent to a model (GDPR/privacy requests). */
export const NEVER_TAGGED_TYPE = "privacy";

/** Env keys that select the agentbox System One proxy; stripped for enquiries. */
const PROXY_KEY = /^AGENTBOX_(SYSTEM_ONE|SKILL_ROUTE)_/;

/**
 * True when `endpoint` is http(s) to a literal loopback or RFC 1918 address,
 * or `localhost`. Parsed with WHATWG URL so numeric forms such as
 * `http://2130706433/` normalise to their dotted form before the check; any
 * other DNS name is rejected because it could resolve anywhere.
 * @param {string} endpoint
 */
export function isLocalEndpoint(endpoint) {
  let u;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname;
  if (h === "localhost" || h === "[::1]") return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** Resolve a local-only endpoint for enquiry text, or { ok:false, reason }. */
export function resolveLocalTopicEndpoint(env) {
  const scoped = Object.fromEntries(Object.entries(env ?? {}).filter(([k]) => !PROXY_KEY.test(k)));
  const r = resolveJev(scoped, { prefix: FLAG_PREFIX, localOnly: true });
  if (r.ok && !isLocalEndpoint(r.cfg.endpoint)) return { ok: false, reason: "no-endpoint" };
  return r;
}

/** Most enquiries tagged per run (one request each, sequential, <= 4 s each). */
export const MAX_TAGGED_PER_RUN = 10;
/** Unfitted default; annotation-only so a permissive floor is acceptable. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;
const MAX_MESSAGE_CHARS = 1500;

/** Mirrors ENQUIRY_TYPES in src/pages/Contact.tsx (a test keeps them in step). */
export const ENQUIRY_TOPICS = Object.freeze({
  residential: "A residential training programme: staying on site for an intensive programme.",
  "sme-sprint": "An SME sprint: a short, focused engagement for a small or medium business.",
  ktp: "A Knowledge Transfer Partnership (KTP) with a university or research body.",
  "lab-visit": "A visit to the lab, or a request to schedule one.",
  "venture-lab": "The Venture Lab: building or backing a new venture.",
  privacy: "A privacy or personal-data request (access, correction, deletion).",
  other: "None of the other topics, or the message is too unclear to place.",
});

export function buildTopicRequest(enquiry) {
  const message = String(enquiry.excerptFull ?? enquiry.excerpt ?? "").slice(0, MAX_MESSAGE_CHARS);
  return {
    state: {
      enquiry_message: message,
      declared_type: String(enquiry.detail ?? "").slice(0, 40),
    },
    questions: {
      topic: {
        type: "choice",
        instructions:
          "Which one topic is the visitor's `enquiry_message` mainly about? `declared_type` is what they picked in a form and may be wrong or blank; judge from the message.",
        criteria: { ...ENQUIRY_TOPICS },
      },
      missing_input: {
        type: "noul",
        instructions:
          "Is it true that `enquiry_message` leaves out a fact the team would need before replying usefully (for example dates, group size, organisation, or what outcome is wanted)?",
      },
    },
  };
}

/**
 * Tag the `enquiry` items in `fresh`. Returns a NEW array of the same length
 * and order; items that are not accepted are returned untouched (same object).
 * Never throws; on any fallback every item is returned as-is.
 *
 * @param {object[]} fresh digest items ({kind, detail, excerpt, ...})
 * @param {{env?:Record<string,string|undefined>, fetchImpl?:typeof fetch, log?:(s:string)=>void}} [opts]
 */
export async function tagEnquiries(fresh, opts = {}) {
  const { env = process.env, fetchImpl, log } = opts;
  try {
    const isPrivacy = (f) => String(f.detail ?? "").trim().toLowerCase() === NEVER_TAGGED_TYPE;
    const targets = fresh.map((f, i) => (f.kind === "enquiry" && !isPrivacy(f) ? i : -1)).filter((i) => i >= 0);
    if (targets.length === 0) return fresh.slice();
    const r = resolveLocalTopicEndpoint(env);
    if (!r.ok) {
      if (r.reason !== "flag-off") jevLog(log, QUESTION_SET, r.reason);
      return fresh.slice();
    }
    const floor = (() => {
      const n = Number(env[`${FLAG_PREFIX}_TOPIC_MIN_CONFIDENCE`]);
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_MIN_CONFIDENCE;
    })();
    const out = fresh.slice();
    const keys = Object.keys(ENQUIRY_TOPICS);
    for (const i of targets.slice(0, MAX_TAGGED_PER_RUN)) {
      const res = await callSystemOne(r.cfg, buildTopicRequest(fresh[i]), fetchImpl);
      if (!res.ok) { jevLog(log, QUESTION_SET, res.reason); continue; }
      const t = readChoice(res.answers, "topic", keys);
      const m = readNoul(res.answers, "missing_input");
      if (!t || m === null) { jevLog(log, QUESTION_SET, "malformed"); continue; }
      if (t.confidence < floor) { jevLog(log, QUESTION_SET, "low-confidence"); continue; }
      out[i] = { ...fresh[i], topic: t.key + (m >= 0.5 ? " · needs-info" : "") };
      jevLog(log, QUESTION_SET, "accepted");
    }
    return out;
  } catch {
    return fresh.slice();
  }
}
