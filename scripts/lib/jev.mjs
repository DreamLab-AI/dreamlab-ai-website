// Jev option: a small, dependency-free System One adapter (TypeSafe typed
// decisions: Choice / Score / Noul over POST /v1/systemone).
//
// Used by build/CI-time and operator-side scripts only. It is never bundled
// into the browser: the vendor key must not reach a visitor's machine.
//
// Contract (guides/jev-option-contract.md in the Jev research corpus):
//   - off unless the consumer's flag is "1";
//   - endpoint order: explicit config -> agentbox loopback proxy (no auth
//     header) -> api.typesafe.ai with $TYPESAFE_API_KEY -> unavailable;
//   - a LOCAL-ONLY consumer refuses the proxy unless
//     AGENTBOX_SYSTEM_ONE_BACKEND_LOCAL=1, refuses an explicit endpoint unless
//     <PREFIX>_LOCAL=1, and never uses the public vendor endpoint;
//   - every failure returns { ok:false, reason } and never throws:
//     flag-off | no-endpoint | timeout | http-<code> | malformed | low-confidence.
//
// `env` and `fetchImpl` are injected so tests never touch process.env or the net.

export const DEFAULT_DEADLINE_MS = 4000;
export const VENDOR_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

const val = (env, k) => {
  const v = env?.[k];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

/**
 * Resolve the endpoint for a consumer.
 * @param {Record<string,string|undefined>} env
 * @param {{prefix:string, localOnly:boolean}} opts prefix e.g. "DREAMLAB_JEV"
 * @returns {{ok:true, cfg:{endpoint:string, model:string, bearer?:string, timeoutMs:number}} | {ok:false, reason:string}}
 */
export function resolveJev(env, { prefix, localOnly }) {
  if (val(env, prefix) !== "1") return { ok: false, reason: "flag-off" };
  const ms = Number(val(env, `${prefix}_TIMEOUT_MS`));
  const timeoutMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, DEFAULT_DEADLINE_MS) : DEFAULT_DEADLINE_MS;

  const explicit = val(env, `${prefix}_ENDPOINT`);
  if (explicit) {
    if (localOnly && val(env, `${prefix}_LOCAL`) !== "1") return { ok: false, reason: "no-endpoint" };
    const keyEnv = val(env, `${prefix}_KEY_ENV`);
    return {
      ok: true,
      cfg: {
        endpoint: explicit,
        model: val(env, `${prefix}_MODEL`) ?? "jev-latest",
        bearer: keyEnv ? val(env, keyEnv) : undefined,
        timeoutMs,
      },
    };
  }
  if (val(env, "AGENTBOX_SYSTEM_ONE_PROXY") === "1") {
    const endpoint = val(env, "AGENTBOX_SYSTEM_ONE_ENDPOINT") ?? val(env, "AGENTBOX_SKILL_ROUTE_API");
    const model = val(env, "AGENTBOX_SYSTEM_ONE_MODEL") ?? val(env, "AGENTBOX_SKILL_ROUTE_MODEL");
    if (endpoint && model && (!localOnly || val(env, "AGENTBOX_SYSTEM_ONE_BACKEND_LOCAL") === "1")) {
      return { ok: true, cfg: { endpoint, model, timeoutMs } }; // proxy holds the key
    }
  }
  const key = val(env, "TYPESAFE_API_KEY");
  if (!localOnly && key) {
    return { ok: true, cfg: { endpoint: VENDOR_ENDPOINT, model: "jev-latest", bearer: key, timeoutMs } };
  }
  return { ok: false, reason: "no-endpoint" };
}

/**
 * POST one request. Never throws. 0 retries; hard deadline via AbortController.
 * @returns {Promise<{ok:true, answers:Record<string,any>} | {ok:false, reason:string}>}
 */
export async function callSystemOne(cfg, request, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") return { ok: false, reason: "no-endpoint" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    const headers = { "Content-Type": "application/json" };
    if (cfg.bearer) headers.Authorization = `Bearer ${cfg.bearer}`;
    const res = await fetchImpl(cfg.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: cfg.model, ...request }),
      signal: ctl.signal,
      redirect: "error",
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    let body;
    try { body = await res.json(); } catch { return { ok: false, reason: "malformed" }; }
    const answers = body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || Object.keys(answers).length === 0) {
      return { ok: false, reason: "malformed" };
    }
    return { ok: true, answers };
  } catch {
    return { ok: false, reason: "timeout" }; // abort, DNS, reset, redirect refusal: all transport failures
  } finally {
    clearTimeout(timer);
  }
}

const unit = (x) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1 ? x : null);

/** Choice answer -> {key, confidence} or null. Key must be in `allowed`. */
export function readChoice(answers, id, allowed) {
  const a = answers?.[id];
  if (!a || (a.type !== undefined && a.type !== "choice") || typeof a.choice !== "string" || !allowed.includes(a.choice)) return null;
  let confidence = unit(a.confidence);
  if (confidence === null) {
    const p = unit(a.probabilities?.[a.choice]);
    const n = allowed.length;
    if (p === null || n < 2) return null;
    confidence = Math.min(1, Math.max(0, (p - 1 / n) / (1 - 1 / n)));
  }
  return { key: a.choice, confidence };
}

/** Noul answer -> probability of yes, or null. */
export function readNoul(answers, id) {
  const a = answers?.[id];
  return a && (a.type === undefined || a.type === "noul") ? unit(a.noul) : null;
}

/** One log line, reason only, never request content. */
export function jevLog(log, questionSet, reason) {
  (log ?? console.log)(`[jev] ${questionSet} ${reason}`);
}
