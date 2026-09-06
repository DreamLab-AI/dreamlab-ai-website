// Config mirror enumeration + parity (ADR-2005).
//
// ADR-2005 accepts that `forum-config/dreamlab.toml` is projected BY HAND into
// several other files instead of being generated. The deferral is only safe if
// every mirror is (a) enumerated, and (b) compared at CI. Before 2026-09-05 the
// CI job compared exactly ONE of them - the admin pubkey set across the relay and
// search wrangler configs - leaving the client pubkey mirrors, all three
// ZONE_CONFIG copies, and the service-endpoint mirrors unchecked. A rotation that
// updated the TOML and missed a mirror shipped stale keys or zones silently.
//
// This module enumerates the mirror set explicitly (MIRRORS below) and compares
// effective values across every site. It also sweeps for mirror-BEARING keys that
// are NOT enumerated, so adding a new copy of a governed value to a wrangler file
// fails the build until it is brought under the check.
//
// The auth-worker's ADMIN_PUBKEYS is a Cloudflare secret and cannot be read from
// the repo. It is enumerated as `verifiable: false` and asserted structurally
// (the deploy gate proves it is set; set-worker-secrets.yml proves how it is
// pushed), rather than quietly omitted from the mirror set.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseToml } from "./toml-lite.mjs";
import { parseWorkflowEnv } from "./effective-endpoints.mjs";

export const TOML_PATH = "forum-config/dreamlab.toml";
export const DEPLOY_PATH = ".github/workflows/deploy.yml";
export const SECRETS_WORKFLOW = ".github/workflows/set-worker-secrets.yml";
export const WRANGLER = {
  auth: "forum-config/deploy/auth-worker.wrangler.toml",
  pod: "forum-config/deploy/pod-worker.wrangler.toml",
  preview: "forum-config/deploy/preview-worker.wrangler.toml",
  relay: "forum-config/deploy/relay-worker.wrangler.toml",
  search: "forum-config/deploy/search-worker.wrangler.toml",
};

/**
 * Keys that carry a governed (mirrored) value. Any occurrence of one of these in
 * a wrangler `[vars]` block must be covered by an enumerated mirror below.
 */
const MIRROR_BEARING_KEYS = new Set([
  "ADMIN_PUBKEYS",
  "ZONE_CONFIG",
  "POD_BASE_URL",
  "RELAY_URL",
  "JARVIS_PUBKEY",
]);

const readText = (root, rel) => {
  const path = join(root, rel);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
};

const normaliseKeyCsv = (csv) =>
  csv
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .sort();

/** Canonical, order-insensitive form of a zone model for cross-mirror equality. */
export function canonicaliseZones(zones) {
  return zones
    .map((z) => {
      const out = {};
      for (const key of Object.keys(z).sort()) {
        const v = z[key];
        // An empty cohort list and an absent one mean the same thing to every
        // consumer, so they must not read as drift.
        if (Array.isArray(v) && v.length === 0) continue;
        out[key] = v;
      }
      return out;
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** Zone objects as authored in the TOML, reduced to the projected fields. */
function tomlZones(toml) {
  return (toml.zones ?? []).map((z) => {
    const out = {};
    for (const key of [
      "id",
      "slug",
      "display_name",
      "required_cohorts",
      "write_cohorts",
      "visibility",
      "banner_image_url",
      "encrypted",
      "accent_hex",
      "section_order",
      "kanban",
    ]) {
      if (z[key] !== undefined) out[key] = z[key];
    }
    return out;
  });
}

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Compare every enumerated mirror. Returns
 * { ok, errors, mirrors: [{ id, verifiable, sites, agreed }] }.
 */
export function checkConfigMirrors(root) {
  const errors = [];
  const mirrors = [];

  const tomlText = readText(root, TOML_PATH);
  if (!tomlText) return { ok: false, errors: [`${TOML_PATH} missing`], mirrors };
  const toml = parseToml(tomlText);

  const deployText = readText(root, DEPLOY_PATH);
  if (!deployText) return { ok: false, errors: [`${DEPLOY_PATH} missing`], mirrors };
  const deployEnv = parseWorkflowEnv(deployText);

  const wrangler = {};
  for (const [name, rel] of Object.entries(WRANGLER)) {
    const text = readText(root, rel);
    if (!text) {
      errors.push(`${rel} missing`);
      continue;
    }
    wrangler[name] = { path: rel, doc: parseToml(text) };
  }

  /** Register a mirror and compare its sites. */
  const compare = (id, description, sites, { verifiable = true, eq = deepEqual } = {}) => {
    const present = sites.filter((s) => s.value !== undefined && s.value !== null);
    const missing = sites.filter((s) => s.value === undefined || s.value === null);
    for (const site of missing) {
      errors.push(`${id}: mirror site ${site.where} has no value for this governed datum`);
    }
    let agreed = true;
    if (present.length > 1) {
      const [first, ...rest] = present;
      for (const site of rest) {
        if (!eq(first.value, site.value)) {
          agreed = false;
          errors.push(
            `${id}: MIRROR DRIFT between ${first.where} and ${site.where}\n` +
              `    ${first.where}: ${JSON.stringify(first.value)}\n` +
              `    ${site.where}: ${JSON.stringify(site.value)}`,
          );
        }
      }
    }
    mirrors.push({
      id,
      description,
      verifiable,
      agreed,
      sites: sites.map((s) => s.where),
    });
  };

  // 1. Admin pubkey set - TOML, relay worker, search worker (+ the CF secret).
  const adminToml = [...(toml.admin?.static_pubkeys ?? [])].map((k) => k.toLowerCase()).sort();
  compare("admin-pubkeys", "The admin identity set every worker resolves against", [
    { where: `${TOML_PATH} [admin].static_pubkeys`, value: adminToml },
    {
      where: `${WRANGLER.relay} [vars].ADMIN_PUBKEYS`,
      value: wrangler.relay ? normaliseKeyCsv(wrangler.relay.doc.vars?.ADMIN_PUBKEYS ?? "") : null,
    },
    {
      where: `${WRANGLER.search} [vars].ADMIN_PUBKEYS`,
      value: wrangler.search ? normaliseKeyCsv(wrangler.search.doc.vars?.ADMIN_PUBKEYS ?? "") : null,
    },
  ]);

  // 1b. The auth-worker's ADMIN_PUBKEYS is a Cloudflare secret: not readable
  // here, but it IS part of the mirror set and must stay enumerated. Assert the
  // machinery that keeps it in step exists rather than pretending it is absent.
  const secretsText = readText(root, SECRETS_WORKFLOW);
  if (!secretsText) {
    errors.push(`${SECRETS_WORKFLOW} missing - the auth-worker ADMIN_PUBKEYS mirror has no push path`);
  } else if (!/ADMIN_PUBKEYS/.test(secretsText)) {
    errors.push(
      `${SECRETS_WORKFLOW} does not push ADMIN_PUBKEYS - the auth-worker mirror ` +
        `would drift from ${TOML_PATH} with no way to re-sync it`,
    );
  }
  if (wrangler.auth && wrangler.auth.doc.vars?.ADMIN_PUBKEYS !== undefined) {
    // A plaintext [vars] entry would shadow the secret and silently win.
    errors.push(
      `${WRANGLER.auth}: ADMIN_PUBKEYS is declared in [vars]; it must remain a CF ` +
        `secret or the plaintext binding conflicts with (and can mask) the secret`,
    );
  }
  mirrors.push({
    id: "admin-pubkeys-auth-secret",
    description: "auth-worker ADMIN_PUBKEYS (Cloudflare secret - not readable from the repo)",
    verifiable: false,
    agreed: null,
    sites: [`${SECRETS_WORKFLOW} (push path)`, "cloudflare:dreamlab-auth-api secret ADMIN_PUBKEYS"],
  });

  // 2. Client admin pubkey mirror - must be a member of the authored admin set.
  const viteAdmin = deployEnv.get("VITE_ADMIN_PUBKEY")?.toLowerCase();
  if (!viteAdmin) {
    errors.push(`${DEPLOY_PATH}: VITE_ADMIN_PUBKEY is not defined`);
  } else if (!adminToml.includes(viteAdmin)) {
    errors.push(
      `client-admin-pubkey: MIRROR DRIFT - ${DEPLOY_PATH} VITE_ADMIN_PUBKEY ${viteAdmin} ` +
        `is not in ${TOML_PATH} [admin].static_pubkeys`,
    );
  }
  mirrors.push({
    id: "client-admin-pubkey",
    description: "React contact-form DM recipient, mirrored from the authored admin set",
    verifiable: true,
    agreed: Boolean(viteAdmin && adminToml.includes(viteAdmin)),
    sites: [`${DEPLOY_PATH} env.VITE_ADMIN_PUBKEY`, `${TOML_PATH} [admin].static_pubkeys`],
  });

  // 3. Agent (junkiejarvis) pubkey - authored roster, React build var, BBS inject.
  const jarvisToml = (toml.agents ?? []).find((a) => a.label === "junkiejarvis")?.pubkey;
  const jarvisDeploy = deployEnv.get("VITE_JARVIS_PUBKEY");
  const bbsJarvis = deployText.match(/JARVIS_PUBKEY:"'"\$([A-Z0-9_]+)"'"/)?.[1];
  compare("agent-jarvis-pubkey", "Talk-to-AI + BBS agent identity", [
    { where: `${TOML_PATH} [[agents]] junkiejarvis`, value: jarvisToml?.toLowerCase() ?? null },
    { where: `${DEPLOY_PATH} env.VITE_JARVIS_PUBKEY`, value: jarvisDeploy?.toLowerCase() ?? null },
    {
      where: `${DEPLOY_PATH} BBS __ENV__.JARVIS_PUBKEY`,
      // The BBS injects by reference; resolve the reference to its value so the
      // comparison is of effective values, not of spellings.
      value: bbsJarvis ? (deployEnv.get(bbsJarvis)?.toLowerCase() ?? null) : null,
    },
  ]);

  // 4. Zone model - authored TOML plus all three JSON projections.
  const zoneSites = [
    { where: `${TOML_PATH} [[zones]]`, raw: tomlZones(toml) },
    { where: `${DEPLOY_PATH} env.ZONE_CONFIG_JSON`, json: deployEnv.get("ZONE_CONFIG_JSON") },
    {
      where: `${WRANGLER.relay} [vars].ZONE_CONFIG`,
      json: wrangler.relay?.doc.vars?.ZONE_CONFIG,
    },
    {
      where: `${WRANGLER.auth} [vars].ZONE_CONFIG`,
      json: wrangler.auth?.doc.vars?.ZONE_CONFIG,
    },
  ].map((site) => {
    if (site.raw) return { where: site.where, value: canonicaliseZones(site.raw) };
    if (site.json === undefined || site.json === null) return { where: site.where, value: null };
    try {
      return { where: site.where, value: canonicaliseZones(JSON.parse(site.json)) };
    } catch (err) {
      errors.push(`${site.where}: ZONE_CONFIG is not valid JSON (${err.message})`);
      return { where: site.where, value: null };
    }
  });
  compare("zone-model", "Four-zone access model projected to client + relay + auth", zoneSites);

  // 5. Service endpoints - authored TOML vs the client build variables and the
  //    worker-side base URLs that must address the same deployment.
  compare("relay-url", "Nostr relay endpoint", [
    { where: `${TOML_PATH} [relay].url`, value: toml.relay?.url ?? null },
    { where: `${DEPLOY_PATH} env.VITE_RELAY_URL`, value: deployEnv.get("VITE_RELAY_URL") ?? null },
  ]);
  compare("pod-base-url", "Solid pod API base", [
    { where: `${TOML_PATH} [pod].base_url`, value: toml.pod?.base_url ?? null },
    { where: `${DEPLOY_PATH} env.VITE_POD_API_URL`, value: deployEnv.get("VITE_POD_API_URL") ?? null },
    {
      where: `${WRANGLER.pod} [vars].POD_BASE_URL`,
      value: wrangler.pod?.doc.vars?.POD_BASE_URL ?? null,
    },
    {
      where: `${WRANGLER.auth} [vars].POD_BASE_URL`,
      value: wrangler.auth?.doc.vars?.POD_BASE_URL ?? null,
    },
  ]);

  // 6. Completeness sweep: a governed key appearing in a wrangler [vars] block
  //    that no enumerated mirror covers is an unchecked mirror.
  const covered = new Set();
  for (const m of mirrors) for (const s of m.sites) covered.add(s);
  for (const [name, entry] of Object.entries(wrangler)) {
    for (const key of Object.keys(entry.doc.vars ?? {})) {
      if (!MIRROR_BEARING_KEYS.has(key)) continue;
      const site = `${entry.path} [vars].${key}`;
      if (!covered.has(site)) {
        errors.push(
          `unenumerated mirror: ${site} carries a governed value that no mirror in ` +
            `this check covers. Add it to MIRRORS in scripts/lib/config-mirrors.mjs ` +
            `(worker '${name}') so a rotation cannot skip it.`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, mirrors };
}
