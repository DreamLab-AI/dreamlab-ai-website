// Everything that stops the nightly job from leaking or being steered.
//
// - redactHeaders: only a short allowlist of response headers ever reaches the
//   report or the model prompt. Header values are site-controlled text.
// - scrubSecrets: the live values of every secret-looking environment variable,
//   plus well-known token shapes, are replaced before anything is written to a
//   report, a ledger row or a PR body. 64-hex strings are deliberately NOT
//   scrubbed: Nostr pubkeys are public and appear legitimately on the site.
// - clip: caps anything the site controls before it enters the prompt.

const HEADER_ALLOWLIST = new Set(['content-type', 'x-robots-tag', 'cache-control', 'last-modified', 'content-language', 'link', 'vary', 'content-encoding']);

export function redactHeaders(headers) {
  const out = {};
  const entries = typeof headers?.entries === 'function' ? [...headers.entries()] : Object.entries(headers ?? {});
  for (const [k, v] of entries) {
    const key = String(k).toLowerCase();
    if (HEADER_ALLOWLIST.has(key)) out[key] = clip(String(v), 200);
  }
  return out;
}

const SECRET_ENV = /KEY|TOKEN|SECRET|PASS|PRIVKEY|NSEC|CREDENTIAL|AUTH/i;
// Public keys are public: VITE_ADMIN_PUBKEY appears legitimately in reports.
const PUBLIC_ENV = /PUB(LIC)?_?KEY|PUBLIC|_URL$|_BASE_URL$/i;
const TOKEN_SHAPES = [
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /nsec1[02-9ac-hj-np-z]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g,
];

export function secretValues(env = process.env) {
  const out = [];
  for (const [k, v] of Object.entries(env)) {
    if (!SECRET_ENV.test(k) || PUBLIC_ENV.test(k) || typeof v !== 'string') continue;
    const value = v.trim();
    if (value.length >= 8) out.push(value);
  }
  return out.sort((a, b) => b.length - a.length);
}

export function scrubSecrets(text, env = process.env) {
  let out = String(text ?? '');
  for (const value of secretValues(env)) out = out.split(value).join('[REDACTED]');
  for (const re of TOKEN_SHAPES) out = out.replace(re, '[REDACTED]');
  return out;
}

export function clip(text, max) {
  const s = String(text ?? '');
  return s.length <= max ? s : `${s.slice(0, max)}…[+${s.length - max}]`;
}
