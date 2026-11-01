// DW-06-S1-01 (Jev option): content and feature-claim evidence checker.
//
// A build/CI-time ADVISORY. The deterministic claims register
// (docs/claims-register.json) stays authoritative: its classification is what
// is reported as the verdict. Jev can only (a) suggest a status for a claim the
// register does not cover, or (b) flag a disagreement for a human to look at.
// It never edits copy, never publishes, never fails the build, and its output is
// never deployment evidence.
//
// Data class: public marketing copy and public feature descriptions, so the
// consumer is not local-only (full endpoint resolution order, DREAMLAB_JEV=1).
import { resolveJev, callSystemOne, readChoice, readNoul, jevLog } from "./jev.mjs";

export const QUESTION_SET = "dw06-claim-evidence-v1";
export const FLAG_PREFIX = "DREAMLAB_JEV";
export const STATUSES = Object.freeze({
  supported_here: "This overlay repository itself authors or configures the feature, as shown by the feature notes.",
  upstream_only: "The feature exists only in the upstream kit or another repository; this overlay does not implement it.",
  planned: "The feature is designed or announced but not shipped.",
  stale: "The claim describes something that used to be true but the feature notes show it has changed or been replaced.",
  unsupported: "The feature notes give no support for the claim, or contradict it.",
});
export const MAX_CLAIMS_PER_RUN = 25;
/** Unfitted: a Jev disagreement is only surfaced above this Choice confidence. */
export const DEFAULT_MIN_CONFIDENCE = 0.6;

/** List-item claims from markdown, outside code fences, links flattened. */
export function extractClaims(markdown, file = "") {
  const claims = [];
  let fenced = false;
  String(markdown).split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/);
    if (!m) return;
    const text = m[1]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.split(" ").length >= 5) claims.push({ file, line: i + 1, text });
  });
  return claims;
}

/** First register entry whose `match` appears in the claim wins. */
export function classifyDeterministic(claim, register) {
  const hay = claim.text.toLowerCase();
  for (const c of register?.claims ?? []) {
    if (c?.match && hay.includes(String(c.match).toLowerCase()) && c.status in STATUSES) {
      return { status: c.status, evidence: c.evidence ?? "" };
    }
  }
  return { status: "unclassified", evidence: "" };
}

export function buildClaimRequest(claim, register) {
  return {
    state: {
      claim: claim.text,
      feature_notes: (register?.features ?? []).slice(0, 40).map((f) => ({
        id: String(f.id ?? ""),
        owner: String(f.owner ?? ""),
        summary: String(f.summary ?? "").slice(0, 300),
      })),
    },
    questions: {
      status: {
        type: "choice",
        instructions:
          "Using only `feature_notes`, what is the status of the public `claim` for this overlay repository?",
        criteria: { ...STATUSES },
      },
      evidence_sufficient: {
        type: "noul",
        instructions:
          "Is it true that `feature_notes` contain enough information to judge `claim` either way?",
      },
    },
  };
}

/**
 * Check claims. Deterministic results are always returned unchanged; Jev
 * output goes only into `advisory`.
 * @returns {Promise<{results:object[], advisory:object[], jev:string}>}
 */
export async function checkClaims(claims, register, opts = {}) {
  const { env = process.env, fetchImpl, log } = opts;
  const results = claims.map((c) => ({ ...c, ...classifyDeterministic(c, register) }));
  const advisory = [];
  let jev = "flag-off";
  try {
    const r = resolveJev(env, { prefix: FLAG_PREFIX, localOnly: false });
    // Jev may only judge a claim against operator-authored evidence. With no
    // feature notes it would be ungrounded model opinion, so do not ask.
    if (r.ok && !(register?.features?.length > 0)) {
      jevLog(log, QUESTION_SET, "no-evidence");
      return { results, advisory, jev: "no-evidence" };
    }
    if (!r.ok) {
      jev = r.reason;
      if (r.reason !== "flag-off") jevLog(log, QUESTION_SET, r.reason);
      return { results, advisory, jev };
    }
    const n = Number(env[`${FLAG_PREFIX}_CLAIM_MIN_CONFIDENCE`]);
    const floor = Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_MIN_CONFIDENCE;
    const keys = Object.keys(STATUSES);
    jev = "on";
    for (const res of results.slice(0, MAX_CLAIMS_PER_RUN)) {
      const out = await callSystemOne(r.cfg, buildClaimRequest(res, register), fetchImpl);
      if (!out.ok) { jevLog(log, QUESTION_SET, out.reason); jev = out.reason; continue; }
      const s = readChoice(out.answers, "status", keys);
      const e = readNoul(out.answers, "evidence_sufficient");
      if (!s || e === null) { jevLog(log, QUESTION_SET, "malformed"); jev = "malformed"; continue; }
      if (s.confidence < floor || e < 0.5) { jevLog(log, QUESTION_SET, "low-confidence"); continue; }
      const disagrees = res.status !== "unclassified" && res.status !== s.key;
      if (res.status === "unclassified" || disagrees) {
        advisory.push({
          file: res.file, line: res.line, claim: res.text,
          register: res.status, jev: s.key, confidence: Number(s.confidence.toFixed(2)),
          evidenceSufficient: Number(e.toFixed(2)),
          kind: disagrees ? "disagreement" : "suggestion",
        });
      }
    }
  } catch {
    jev = "error";
  }
  return { results, advisory, jev };
}

/** Plain-text report. The verdict lines come from the register only. */
export function formatReport({ results, advisory, jev }) {
  const by = results.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
  const lines = [
    `claims: ${results.length} checked · ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(", ") || "none"}`,
    ...results
      .filter((r) => r.status === "stale" || r.status === "unsupported")
      .map((r) => `  ${r.status.toUpperCase()}  ${r.file}:${r.line}  ${r.text.slice(0, 100)}`),
  ];
  if (jev !== "flag-off") {
    lines.push(`jev (advisory only, never a verdict; ${jev}): ${advisory.length} note(s)`);
    for (const a of advisory) {
      lines.push(`  ${a.kind}  ${a.file}:${a.line}  register=${a.register} jev=${a.jev} (conf ${a.confidence})  ${a.claim.slice(0, 80)}`);
    }
  }
  return lines.join("\n");
}
