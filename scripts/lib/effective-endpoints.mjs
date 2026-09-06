// Effective-endpoint validation (ADR-2002 / ADR-2003).
//
// The origin ships THREE frontends built by different toolchains that receive
// their backend endpoints through TWO different dialects:
//
//   React  (/)                -> Vite build variables, read as import.meta.env.VITE_*
//                               and therefore FROZEN INTO THE BUNDLE at build time.
//   Forum  (/community/)      -> window.__ENV__ injected into index.html at deploy
//                               time, read at runtime, using VITE_* key names.
//   BBS    (/community/bbs/)  -> window.__ENV__ with DIFFERENT key names
//                               (RELAY_URL / POD_API / PREVIEW_API / SEARCH_API).
//
// Nothing previously checked that a variable a surface reads is actually supplied
// to that surface. A rename or a missed `env:` entry in the React build step is
// invisible until the deployed surface silently loses an endpoint - exactly the
// failure ADR-2002 records for the unprovisioned branded domains.
//
// This module derives the EFFECTIVE value each surface would receive from
// deploy.yml and checks it against what the source actually reads.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const DEPLOY_WORKFLOW = ".github/workflows/deploy.yml";

/** Endpoint keys whose value must be an absolute wss:// URL. */
const WSS_KEYS = new Set(["VITE_RELAY_URL", "RELAY_URL"]);
/** Endpoint keys whose value must be an absolute https:// URL. */
const HTTPS_KEYS = new Set([
  "VITE_AUTH_API_URL",
  "VITE_POD_API_URL",
  "VITE_SEARCH_API_URL",
  "VITE_LINK_PREVIEW_API_URL",
  "POD_API",
  "PREVIEW_API",
  "SEARCH_API",
]);
/** Keys whose value must be a 64-char lowercase hex x-only pubkey. */
const PUBKEY_KEYS = new Set(["VITE_ADMIN_PUBKEY", "VITE_JARVIS_PUBKEY", "JARVIS_PUBKEY"]);

/** Keys each runtime-injected surface MUST receive, or that surface is severed. */
export const REQUIRED_FORUM_ENV = [
  "VITE_RELAY_URL",
  "VITE_AUTH_API_URL",
  "VITE_POD_API_URL",
  "VITE_SEARCH_API_URL",
  "VITE_LINK_PREVIEW_API_URL",
  "ZONE_CONFIG",
];
export const REQUIRED_BBS_ENV = [
  "RELAY_URL",
  "POD_API",
  "PREVIEW_API",
  "SEARCH_API",
  "JARVIS_PUBKEY",
  "ZONE_CONFIG",
];

/**
 * Parse the workflow-level `env:` block of deploy.yml into a Map.
 * Deliberately a focused scanner rather than a YAML dependency: the block is a
 * flat `KEY: 'value'` mapping and the values contain JSON with braces and
 * colons that a naive generic parse would mangle.
 */
export function parseWorkflowEnv(text) {
  const env = new Map();
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^env:\s*$/.test(l));
  if (start === -1) return env;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line) && line.trim() !== "") break; // dedent ends the block
    const m = line.match(/^ {2}([A-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let raw = m[2].trim();
    if (raw.startsWith("'")) {
      // Single-quoted scalar: take up to the closing quote, so a trailing
      // `# comment` after the value is not swallowed into it.
      const end = raw.indexOf("'", 1);
      raw = end === -1 ? raw.slice(1) : raw.slice(1, end);
    } else if (raw.startsWith('"')) {
      const end = raw.indexOf('"', 1);
      raw = end === -1 ? raw.slice(1) : raw.slice(1, end);
    } else {
      raw = raw.replace(/\s+#.*$/, "").trim();
    }
    env.set(m[1], raw);
  }
  return env;
}

/**
 * Extract the `env:` mapping attached to a named workflow step - i.e. the
 * variables that step's process actually receives. For the React build step
 * this is the definitive list of Vite build variables baked into the bundle.
 */
export function parseStepEnv(text, stepName) {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.includes(`- name: ${stepName}`));
  if (idx === -1) return null;
  const out = new Map();
  let inEnv = false;
  let envIndent = 0;
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*- name: /.test(line)) break; // next step
    const envMatch = line.match(/^(\s*)env:\s*$/);
    if (envMatch) {
      inEnv = true;
      envIndent = envMatch[1].length;
      continue;
    }
    if (!inEnv) continue;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const kv = line.match(/^(\s*)([A-Z0-9_]+):\s*(.*)$/);
    if (!kv || kv[1].length <= envIndent) break;
    out.set(kv[2], kv[3].trim());
  }
  return out;
}

/**
 * Extract a `window.__ENV__={...}` injection payload from the workflow and
 * return its raw key -> value-expression entries.
 */
export function parseEnvInjection(text, marker) {
  const lines = text.split("\n");
  const lineNo = lines.findIndex((l) => l.includes(marker) && l.includes("window.__ENV__="));
  if (lineNo === -1) return null;
  const line = lines[lineNo];
  const body = line.slice(line.indexOf("window.__ENV__=") + "window.__ENV__=".length);
  const open = body.indexOf("{");
  const close = body.lastIndexOf("}");
  if (open === -1 || close === -1) return null;
  const inner = body.slice(open + 1, close);

  const entries = new Map();
  // Split on commas that are not inside a JSON array/object or a quoted string.
  let depth = 0;
  let inStr = false;
  let current = "";
  const parts = [];
  for (const ch of inner) {
    if (ch === '"') inStr = !inStr;
    if (!inStr && (ch === "[" || ch === "{")) depth++;
    if (!inStr && (ch === "]" || ch === "}")) depth--;
    if (!inStr && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    entries.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  }
  return { entries, locals: collectShellLocals(lines, lineNo) };
}

/**
 * Shell variables assigned inside the same `run:` block as the injection.
 * `BUILD_HASH="${GITHUB_SHA:0:7}"` is a perfectly valid source for an injected
 * value even though it never appears in the workflow `env:` map, so treating
 * every non-env reference as undefined would be a false positive. We walk back
 * to the start of the enclosing run block and collect its assignments.
 */
export function collectShellLocals(lines, lineNo) {
  const locals = new Set();
  let start = lineNo;
  while (start > 0 && !/^\s*(-\s+name:|run:\s*\|)/.test(lines[start])) start--;
  for (let i = start; i <= lineNo; i++) {
    const m = lines[i].match(/^\s*([A-Z][A-Z0-9_]*)=/);
    if (m) locals.add(m[1]);
  }
  return locals;
}

/** Marker used for an interpolation the workflow env cannot resolve. */
export const UNDEF_MARKER = "<<UNDEF:";

/**
 * Resolve one injected value to what the browser would actually see.
 * Returns { value, refs } - refs are the shell variables it interpolates, so a
 * reference to an undefined workflow variable is a reportable defect rather
 * than an empty string nobody notices.
 */
export function resolveInjectedValue(raw, workflowEnv) {
  const refs = [];
  const varRe = /\$\{?([A-Z0-9_]+)\}?/g;
  let m;
  while ((m = varRe.exec(raw)) !== null) refs.push(m[1]);

  const sub = (name) =>
    workflowEnv.has(name) ? workflowEnv.get(name) : `${UNDEF_MARKER}${name}>>`;

  // The injection is single-quoted shell with '"$VAR"' escapes; peel the
  // quoting layers, then substitute any bare $VAR that remains.
  let v = raw
    .replace(/'"\$\{?([A-Z0-9_]+)\}?"'/g, (_, name) => sub(name))
    .replace(/'\$\{?([A-Z0-9_]+)\}?'/g, (_, name) => sub(name))
    .replace(/\$\{?([A-Z0-9_]+)\}?/g, (_, name) => sub(name))
    .trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
  return { value: v, refs: [...new Set(refs)] };
}

/** Every `import.meta.env.VITE_*` name the React source actually reads. */
export function collectViteReads(root, srcDir = "src") {
  const found = new Map();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry)) continue;
      const text = readFileSync(path, "utf8");
      const re = /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const rel = path.slice(root.length + 1);
        if (!found.has(m[1])) found.set(m[1], new Set());
        found.get(m[1]).add(rel);
      }
    }
  };
  walk(join(root, srcDir));
  return found;
}

/** Shape checks for an endpoint value, by key name. */
function validateValue(key, value, where, errors) {
  if (value.includes(UNDEF_MARKER)) {
    const name = value.match(/<<UNDEF:([A-Z0-9_]+)>>/)?.[1];
    errors.push(`${where}: ${key} interpolates $${name}, which is not defined in the workflow env`);
    return;
  }
  if (WSS_KEYS.has(key)) {
    if (!/^wss:\/\/[^\s/]+/.test(value)) {
      errors.push(`${where}: ${key}='${value}' is not an absolute wss:// URL`);
    }
    return;
  }
  if (HTTPS_KEYS.has(key)) {
    if (!/^https:\/\/[^\s/]+/.test(value)) {
      errors.push(`${where}: ${key}='${value}' is not an absolute https:// URL`);
    }
    return;
  }
  if (PUBKEY_KEYS.has(key)) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      errors.push(`${where}: ${key}='${value}' is not a 64-hex x-only pubkey`);
    }
  }
}

/**
 * Validate every surface's effective endpoint configuration.
 * Returns { ok, errors, surfaces } with a per-surface receipt of the resolved
 * values, so the deploy gate can publish what it actually verified.
 */
export function checkEffectiveEndpoints(root) {
  const errors = [];
  const surfaces = {};
  const path = join(root, DEPLOY_WORKFLOW);
  if (!existsSync(path)) {
    return { ok: false, errors: [`${DEPLOY_WORKFLOW} missing`], surfaces };
  }
  const text = readFileSync(path, "utf8");
  const env = parseWorkflowEnv(text);
  if (env.size === 0) errors.push(`${DEPLOY_WORKFLOW}: workflow-level env block not found`);

  // React: Vite build variables baked into the bundle.
  const stepEnv = parseStepEnv(text, "Build React main site");
  if (!stepEnv) {
    errors.push(`${DEPLOY_WORKFLOW}: 'Build React main site' step not found`);
  } else {
    const reads = collectViteReads(root);
    const effective = new Map();
    for (const [key, raw] of stepEnv) {
      // `${{ env.X }}` resolves to the workflow env; `${{ secrets.X }}` is an
      // operator value CI cannot see, recorded as such rather than validated.
      const envRef = raw.match(/\$\{\{\s*env\.([A-Z0-9_]+)\s*\}\}/);
      const secretRef = raw.match(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/);
      if (envRef) {
        if (!env.has(envRef[1])) {
          errors.push(
            `${DEPLOY_WORKFLOW}: React build step maps ${key} to env.${envRef[1]}, ` +
              `which the workflow env does not define`,
          );
          continue;
        }
        effective.set(key, { value: env.get(envRef[1]), source: `env.${envRef[1]}` });
      } else if (secretRef) {
        effective.set(key, { value: null, source: `secrets.${secretRef[1]}` });
      } else {
        effective.set(key, { value: raw.replace(/^['"]|['"]$/g, ""), source: "literal" });
      }
    }
    for (const [key, entry] of effective) {
      if (entry.value !== null) {
        validateValue(key, entry.value, `${DEPLOY_WORKFLOW} React build step`, errors);
      }
    }
    // The load-bearing check: a variable the React bundle reads but the build
    // step never receives is baked as `undefined` and the feature dies silently.
    for (const [key, files] of reads) {
      if (!effective.has(key) && !env.has(key)) {
        errors.push(
          `React reads import.meta.env.${key} (${[...files].sort().join(", ")}) but the ` +
            `'Build React main site' step never supplies it - it bakes as undefined`,
        );
      }
    }
    surfaces.react = {
      dialect: "vite-build-variables",
      supplied: Object.fromEntries(
        [...effective].map(([k, v]) => [k, v.value ?? `<${v.source}>`]),
      ),
      reads: [...reads.keys()].sort(),
    };
  }

  // Forum + BBS: window.__ENV__ runtime injection.
  const injections = [
    { name: "forum", marker: "ENV_SCRIPT=", required: REQUIRED_FORUM_ENV },
    { name: "bbs", marker: "BBS_ENV=", required: REQUIRED_BBS_ENV },
  ];
  for (const { name, marker, required } of injections) {
    const injection = parseEnvInjection(text, marker);
    if (!injection) {
      errors.push(`${DEPLOY_WORKFLOW}: window.__ENV__ injection for the ${name} surface not found`);
      continue;
    }
    const { entries, locals } = injection;
    const resolved = {};
    for (const [key, raw] of entries) {
      const { value, refs } = resolveInjectedValue(raw, env);
      // A reference is satisfied by the workflow env OR by a shell variable
      // assigned earlier in the same run block (BUILD_HASH, BUILD_VERSION).
      const unresolved = refs.filter((ref) => !env.has(ref) && !locals.has(ref));
      for (const ref of unresolved) {
        errors.push(
          `${DEPLOY_WORKFLOW}: ${name} __ENV__.${key} interpolates $${ref}, which is ` +
            `neither in the workflow env nor assigned in the injecting run block`,
        );
      }
      // Values that only fail because of an already-reported unresolved
      // reference are not re-reported as a shape violation.
      if (unresolved.length === 0 && !value.includes(UNDEF_MARKER)) {
        validateValue(key, value, `${DEPLOY_WORKFLOW} ${name} __ENV__`, errors);
      }
      resolved[key] = value.includes(UNDEF_MARKER) && unresolved.length === 0
        ? `<runtime:${refs.filter((r) => locals.has(r)).join(",")}>`
        : value;
    }
    for (const key of required) {
      if (!(key in resolved)) {
        errors.push(`${DEPLOY_WORKFLOW}: ${name} __ENV__ is missing required key ${key}`);
      }
    }
    if (resolved.ZONE_CONFIG !== undefined) {
      try {
        const zones = JSON.parse(resolved.ZONE_CONFIG);
        if (!Array.isArray(zones) || zones.length === 0) {
          errors.push(`${DEPLOY_WORKFLOW}: ${name} __ENV__.ZONE_CONFIG is not a non-empty array`);
        }
      } catch (err) {
        errors.push(
          `${DEPLOY_WORKFLOW}: ${name} __ENV__.ZONE_CONFIG is not valid JSON (${err.message})`,
        );
      }
    }
    surfaces[name] = { dialect: "window.__ENV__", resolved };
  }

  return { ok: errors.length === 0, errors, surfaces };
}
