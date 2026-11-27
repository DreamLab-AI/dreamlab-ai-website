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
  "ENCRYPTION_ENABLED",
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
      "agent_keys",
      "history_from_epoch",
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
    },    ...(wrangler.pod?.doc.vars?.ADMIN_PUBKEYS !== undefined ? [{ where: `${WRANGLER.pod} [vars].ADMIN_PUBKEYS`, value: normaliseKeyCsv(wrangler.pod.doc.vars.ADMIN_PUBKEYS) }] : []),
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
    sites: [`${SECRETS_WORKFLOW} (push path)`, "cloudflare:dreamlab-auth-api-v2 secret ADMIN_PUBKEYS"],
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
    ...(wrangler.pod?.doc.vars?.ZONE_CONFIG !== undefined ? [{ where: `${WRANGLER.pod} [vars].ZONE_CONFIG`, json: wrangler.pod.doc.vars.ZONE_CONFIG }] : []),
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

  // 4b. Zone E2EE master gate (ADR-2016) - authored bool vs the relay var and the
  //     client __ENV__ string. Only the exact string "true" enables it anywhere.
  const gateToml = toml.encryption?.enabled;
  compare("encryption-enabled", "Zone end-to-end encryption master gate", [
    {
      where: `${TOML_PATH} [encryption].enabled`,
      value: typeof gateToml === "boolean" ? String(gateToml) : null,
    },
    {
      where: `${DEPLOY_PATH} env.ENCRYPTION_ENABLED`,
      value: deployEnv.get("ENCRYPTION_ENABLED") ?? null,
    },
    {
      where: `${WRANGLER.relay} [vars].ENCRYPTION_ENABLED`,
      value: wrangler.relay?.doc.vars?.ENCRYPTION_ENABLED ?? null,
    },
  ]);
  for (const [label, needle] of [
    // Found by the shell variable each script is assigned to, not by key order:
    // since kit ADR-2036 the BBS carries the forum's keys too.
    ["forum", "ENV_SCRIPT='<script>window.__ENV__={"],
    ["BBS", "BBS_ENV='<script>window.__ENV__={"],
  ]) {
    const line = deployText.split("\n").find((l) => l.includes(needle));
    if (!line || !line.includes('ENCRYPTION_ENABLED:"\'"$ENCRYPTION_ENABLED"\'"')) {
      errors.push(
        `encryption-enabled: ${DEPLOY_PATH} ${label} __ENV__ does not project ENCRYPTION_ENABLED`,
      );
    }
  }

  // 5. Service endpoints - authored TOML vs the client build variables and the
  //    worker-side base URLs that must address the same deployment.
  compare("relay-url", "Nostr relay endpoint", [
    { where: `${TOML_PATH} [relay].url`, value: toml.relay?.url ?? null },
    { where: `${DEPLOY_PATH} env.VITE_RELAY_URL`, value: deployEnv.get("VITE_RELAY_URL") ?? null },
    // The relay's own URL, which NIP-42 binds signed AUTH events to. Blank
    // disables that check (the kit default), so it must track the endpoint.
    {
      where: `${WRANGLER.relay} [vars].RELAY_URL`,
      value: wrangler.relay?.doc.vars?.RELAY_URL ?? null,
    },
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

/**
 * Operator var mirrors not enumerated by `checkConfigMirrors` (ADR-2005 gap):
 * dreamlab.toml sections hand-projected into wrangler `[vars]` that the mirror
 * set skipped when it was written: [webauthn] into the auth-worker and [mesh]
 * into the relay-worker.
 *
 *   [webauthn].rp_id            <-> auth-worker  [vars].RP_ID
 *   [webauthn].expected_origin  <-> auth-worker  [vars].EXPECTED_ORIGIN
 *   [mesh].mode                 <-> relay-worker [vars].MESH_MODE
 *   [mesh].peer_relays          <-> relay-worker [vars].MESH_PEER_RELAYS
 *   [mesh].allowed_remote_dids  <-> relay-worker [vars].MESH_ALLOWED_REMOTE_DIDS
 *
 * Each datum has two hand-maintained sites; before this check, editing one
 * without the other shipped silently - e.g. populating [mesh].peer_relays
 * (post-Sprint-v12) while the relay var stayed empty, or an rp_id rename that
 * missed the auth worker and broke WebAuthn origin checks in production.
 *
 *   [mesh].federated_kinds      <-> relay-worker [vars].MESH_FEDERATED_KINDS
 *   [features].poker            <-> deploy.yml   env POKER ('on' when true)
 *   [poker]                     <-> deploy.yml   env POKER_CONFIG_JSON
 *
 * Deliberately NOT folded into `checkConfigMirrors` itself: that would
 * re-baseline its fixtures in config-mirrors.test.mjs and extend the
 * MIRROR_BEARING_KEYS sweep in the same stroke. The CLI runs both, so CI gates
 * on both (estate register ER-23). toml-lite reads the integer array and the
 * `citizens` inline table faithfully, so federated_kinds and [poker] are now
 * compared. Still not compared: [nip05] (its dreamlab.toml section is still
 * elided from source views).
 *
 * The federated-kinds and poker comparisons apply when either side carries the
 * datum, so a tree without them (a minimal fixture) is not an error, but a
 * datum on one side only is.
 */
export function checkOperatorVarMirrors(root) {
  const errors = [];

  const tomlText = readText(root, TOML_PATH);
  if (!tomlText) return { ok: false, errors: [`${TOML_PATH} missing`] };
  const toml = parseToml(tomlText);

  const varsFor = (worker) => {
    const text = readText(root, WRANGLER[worker]);
    if (!text) {
      errors.push(`${WRANGLER[worker]} missing`);
      return {};
    }
    return parseToml(text).vars ?? {};
  };
  const authVars = varsFor("auth");
  const relayVars = varsFor("relay");

  const asString = (v) => (v === undefined || v === null ? null : String(v).trim());
  const asCsv = (v) => {
    if (v === undefined || v === null) return null;
    const parts = Array.isArray(v) ? v.map(String) : String(v).split(",");
    return parts.map((s) => s.trim()).filter(Boolean).sort().join(",");
  };

  const compareVar = (
    id,
    authored,
    projected,
    whereAuthored,
    whereProjected,
    normalise = asString,
  ) => {
    const a = normalise(authored);
    const p = normalise(projected);
    if (a === null) {
      errors.push(`${id}: ${whereAuthored} has no value - it is the authored source of truth`);
    } else if (p === null) {
      errors.push(`${id}: ${whereProjected} has no value for this governed datum`);
    } else if (a !== p) {
      errors.push(
        `${id}: MIRROR DRIFT between ${whereAuthored} and ${whereProjected}\n` +
          `    ${whereAuthored}: ${a}\n` +
          `    ${whereProjected}: ${p}`,
      );
    }
  };

  compareVar(
    "webauthn-rp-id",
    toml.webauthn?.rp_id,
    authVars.RP_ID,
    `${TOML_PATH} [webauthn].rp_id`,
    `${WRANGLER.auth} [vars].RP_ID`,
  );
  compareVar(
    "webauthn-expected-origin",
    toml.webauthn?.expected_origin,
    authVars.EXPECTED_ORIGIN,
    `${TOML_PATH} [webauthn].expected_origin`,
    `${WRANGLER.auth} [vars].EXPECTED_ORIGIN`,
  );
  compareVar(
    "mesh-mode",
    toml.mesh?.mode,
    relayVars.MESH_MODE,
    `${TOML_PATH} [mesh].mode`,
    `${WRANGLER.relay} [vars].MESH_MODE`,
  );
  compareVar(
    "mesh-peer-relays",
    toml.mesh?.peer_relays,
    relayVars.MESH_PEER_RELAYS,
    `${TOML_PATH} [mesh].peer_relays`,
    `${WRANGLER.relay} [vars].MESH_PEER_RELAYS`,
    asCsv,
  );
  compareVar(
    "mesh-allowed-remote-dids",
    toml.mesh?.allowed_remote_dids,
    relayVars.MESH_ALLOWED_REMOTE_DIDS,
    `${TOML_PATH} [mesh].allowed_remote_dids`,
    `${WRANGLER.relay} [vars].MESH_ALLOWED_REMOTE_DIDS`,
    asCsv,
  );

  // [mesh].federated_kinds is a set of integers; the relay var is its CSV.
  if (toml.mesh?.federated_kinds !== undefined || relayVars.MESH_FEDERATED_KINDS !== undefined) {
    compareVar(
      "mesh-federated-kinds",
      toml.mesh?.federated_kinds,
      relayVars.MESH_FEDERATED_KINDS,
      `${TOML_PATH} [mesh].federated_kinds`,
      `${WRANGLER.relay} [vars].MESH_FEDERATED_KINDS`,
      (v) => {
        const csv = asCsv(v);
        return csv === null ? null : csv.split(",").map(Number).sort((a, b) => a - b).join(",");
      },
    );
  }

  // [preview].allowed_hosts is the link-preview worker's egress allow-list; the
  // worker var is its CSV. Each entry must be a bare public hostname: the worker
  // matches an entry and its subdomains, so a scheme, path, port, wildcard or a
  // single label would either never match or match far too much.
  const previewHosts = toml.preview?.allowed_hosts;
  const previewText = readText(root, WRANGLER.preview);
  const previewVars = previewText ? (parseToml(previewText).vars ?? {}) : {};
  if (previewHosts !== undefined || previewVars.PREVIEW_ALLOWED_HOSTS !== undefined) {
    compareVar(
      "preview-allowed-hosts",
      previewHosts,
      previewVars.PREVIEW_ALLOWED_HOSTS,
      `${TOML_PATH} [preview].allowed_hosts`,
      `${WRANGLER.preview} [vars].PREVIEW_ALLOWED_HOSTS`,
      asCsv,
    );
    const hostShape = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    for (const host of Array.isArray(previewHosts) ? previewHosts : []) {
      if (!hostShape.test(String(host)) || /\.\d+$/.test(String(host))) {
        errors.push(
          `preview-allowed-hosts: ${TOML_PATH} [preview].allowed_hosts entry "${host}" is not a bare ` +
            `lower-case hostname (no scheme, path, port, wildcard or IP address)`,
        );
      }
    }
  }

  // [poker] is projected by hand into deploy.yml as POKER_CONFIG_JSON, and
  // [features].poker into POKER. Compared as canonical JSON (keys sorted).
  const deployText = readText(root, DEPLOY_PATH);
  const deployEnv = deployText ? parseWorkflowEnv(deployText) : new Map();
  const canonical = (v) => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
    }
    return v;
  };
  if (toml.poker !== undefined || deployEnv.has("POKER_CONFIG_JSON")) {
    let projected = null;
    const raw = deployEnv.get("POKER_CONFIG_JSON");
    if (raw !== undefined) {
      try {
        projected = JSON.stringify(canonical(JSON.parse(raw)));
      } catch (e) {
        errors.push(`poker-config: ${DEPLOY_PATH} env POKER_CONFIG_JSON is not valid JSON: ${e.message}`);
      }
    }
    compareVar(
      "poker-config",
      toml.poker === undefined ? undefined : JSON.stringify(canonical(toml.poker)),
      raw === undefined ? undefined : projected,
      `${TOML_PATH} [poker]`,
      `${DEPLOY_PATH} env POKER_CONFIG_JSON`,
    );
  }
  if (toml.features?.poker !== undefined || deployEnv.has("POKER")) {
    compareVar(
      "poker-feature",
      toml.features?.poker === undefined ? undefined : toml.features.poker ? "on" : "off",
      deployEnv.has("POKER") ? (deployEnv.get("POKER") === "on" ? "on" : "off") : undefined,
      `${TOML_PATH} [features].poker`,
      `${DEPLOY_PATH} env POKER`,
    );
  }

  return { ok: errors.length === 0, errors };
}

/** Operational surfaces outside the wrangler/deploy mirror set (audit 2026-11-26). */
export const OPERATIONAL = {
  inboxWatch: "scripts/inbox-watch/run.mjs",
  contactEmbed: "scripts/contact-embed/entry.ts",
  backup: "scripts/backup/forum-backup.sh",
  backupCrontab: "scripts/backup/crontab",
  workersDeploy: ".github/workflows/workers-deploy.yml",
};

const KV_ID = /^[0-9a-f]{32}$/;
const D1_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Deployed by the operator by hand (relay-worker.wrangler.toml header); never by CI. */
const MANUAL_ONLY_CONFIGS = new Set(["relay-worker"]);
/** Workers whose data the nightly backup must hold. Preview carries only RATE_LIMIT. */
const DATA_WORKERS = ["auth", "pod", "relay", "search"];
/** Bindings that hold no state worth restoring. */
const EPHEMERAL_BINDINGS = new Set(["RATE_LIMIT"]);
/** Worker base names; a reference without the -v2 suffix is a dead v1 worker. */
const WORKER_REF = /\bdreamlab-(?:auth-api|pod-api|link-preview|nostr-relay|search-api)(?:-v2)?\b/g;

/**
 * A worker is provisioned when every KV/D1 binding id in its manifest is well
 * formed. The v2 search worker carries a placeholder KV id (nothing exists for it
 * on Cloudflare), so it is unprovisioned: excluded from the backup set and
 * forbidden from the automated deploy matrix until the operator provisions it.
 */
function bindingsOf(doc) {
  const kv = (doc.kv_namespaces ?? []).map((b) => ({ binding: b.binding, id: b.id }));
  const d1 = (doc.d1_databases ?? []).map((b) => ({ name: b.database_name, id: b.database_id }));
  const r2 = (doc.r2_buckets ?? []).map((b) => b.bucket_name);
  const provisioned = kv.every((b) => KV_ID.test(b.id ?? "")) && d1.every((b) => D1_ID.test(b.id ?? ""));
  return { kv, d1, r2, provisioned };
}

/** `declare -A NAME=( [k]="v" ... )` from a bash script, as a Map. */
function bashAssoc(text, name) {
  const block = text.match(new RegExp(`declare -A ${name}=\\(([\\s\\S]*?)\\n\\)`));
  if (!block) return null;
  return new Map([...block[1].matchAll(/\[([^\]]+)\]="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

/**
 * Operational mirrors the v2 cutover proved were unchecked (audit 2026-11-26
 * C-2..C-5): every gate stayed green while these still named v1 resources.
 *
 *   inbox-watch / contact-embed relay default  <-> dreamlab.toml [relay].url
 *   inbox-watch / contact-embed admin default  <-> deploy.yml VITE_ADMIN_PUBKEY (in [admin].static_pubkeys)
 *   inbox-watch jarvis default                 <-> dreamlab.toml [[agents]] junkiejarvis
 *   forum-backup.sh D1/R2/KV set               <-> every D1/R2/KV binding of the provisioned data workers
 *   backup crontab                             bounded by timeout
 *   workflows                                  no v1 worker name; deploy matrix excludes manual-only
 *                                              and unprovisioned workers
 */
export function checkOperationalMirrors(root) {
  const errors = [];
  const toml = parseToml(readText(root, TOML_PATH) ?? "");
  const deployEnv = parseWorkflowEnv(readText(root, DEPLOY_PATH) ?? "");
  const relayUrl = toml.relay?.url;
  const adminSet = (toml.admin?.static_pubkeys ?? []).map((k) => k.toLowerCase());
  const clientAdmin = deployEnv.get("VITE_ADMIN_PUBKEY")?.toLowerCase();
  const jarvis = (toml.agents ?? []).find((a) => a.label === "junkiejarvis")?.pubkey?.toLowerCase();

  const expectEq = (id, where, got, want, wantWhere) => {
    if (got === undefined || got === null) {
      errors.push(`${id}: could not find the value in ${where} (fail closed: update this check if it moved)`);
    } else if (got.toLowerCase() !== String(want).toLowerCase()) {
      errors.push(`${id}: MIRROR DRIFT - ${where} has ${got}, ${wantWhere} has ${want}`);
    }
  };
  const expectAdmin = (id, where, got) => {
    expectEq(id, where, got, clientAdmin, `${DEPLOY_PATH} env.VITE_ADMIN_PUBKEY`);
    if (got && !adminSet.includes(got.toLowerCase())) {
      errors.push(`${id}: ${where} admin ${got} is not in ${TOML_PATH} [admin].static_pubkeys`);
    }
  };

  // C-3 inbox-watch defaults (the crontab sets no env overrides).
  const iw = readText(root, OPERATIONAL.inboxWatch);
  if (!iw) errors.push(`${OPERATIONAL.inboxWatch} missing`);
  else {
    const def = (env) => iw.match(new RegExp(`process\\.env\\.${env} \\|\\| "([^"]+)"`))?.[1];
    expectEq("inbox-watch-relay", `${OPERATIONAL.inboxWatch} RELAY default`, def("RELAY_URL"), relayUrl, `${TOML_PATH} [relay].url`);
    expectAdmin("inbox-watch-admin", `${OPERATIONAL.inboxWatch} ADMIN default`, def("ADMIN_PUBKEY"));
    expectEq("inbox-watch-jarvis", `${OPERATIONAL.inboxWatch} JARVIS default`, def("JARVIS_PUBKEY"), jarvis, `${TOML_PATH} [[agents]] junkiejarvis`);
  }

  // C-4 contact embed constants (vendored into the sibling static sites).
  const ce = readText(root, OPERATIONAL.contactEmbed);
  if (!ce) errors.push(`${OPERATIONAL.contactEmbed} missing`);
  else {
    const c = (name) => ce.match(new RegExp(`^const ${name} = "([^"]+)";`, "m"))?.[1];
    expectEq("contact-embed-relay", `${OPERATIONAL.contactEmbed} RELAY_URL`, c("RELAY_URL"), relayUrl, `${TOML_PATH} [relay].url`);
    expectAdmin("contact-embed-admin", `${OPERATIONAL.contactEmbed} ADMIN_PUBKEY`, c("ADMIN_PUBKEY"));
    expectEq(
      "contact-embed-monitor",
      `${OPERATIONAL.contactEmbed} MONITOR_PUBKEY`,
      c("MONITOR_PUBKEY"),
      deployEnv.get("VITE_MONITOR_PUBKEY"),
      `${DEPLOY_PATH} env.VITE_MONITOR_PUBKEY`,
    );
  }

  // Manifests: provisioned state per worker config.
  const manifests = {};
  for (const name of Object.keys(WRANGLER)) {
    const text = readText(root, WRANGLER[name]);
    if (!text) {
      errors.push(`${WRANGLER[name]} missing`);
      continue;
    }
    const doc = parseToml(text);
    manifests[name] = { ...bindingsOf(doc), workerName: doc.name };
  }

  // C-2 backup resource set == bindings of the provisioned data workers.
  const bk = readText(root, OPERATIONAL.backup);
  if (!bk) errors.push(`${OPERATIONAL.backup} missing`);
  else {
    const wantD1 = new Map();
    const wantR2 = new Set();
    const wantKv = new Set();
    for (const name of DATA_WORKERS) {
      const m = manifests[name];
      if (!m || !m.provisioned) continue;
      for (const d of m.d1) wantD1.set(d.name, d.id);
      for (const b of m.r2) wantR2.add(b);
      for (const k of m.kv) if (!EPHEMERAL_BINDINGS.has(k.binding)) wantKv.add(k.id);
    }
    const d1 = bashAssoc(bk, "D1");
    const kv = bashAssoc(bk, "KV");
    const r2 = bk.match(/^R2_BUCKETS=\(([^)]*)\)/m)?.[1].trim().split(/\s+/).filter(Boolean);
    if (!d1 || !kv || !r2) {
      errors.push(`backup-resources: could not parse D1 / R2_BUCKETS / KV in ${OPERATIONAL.backup}`);
    } else {
      const fmt = (map) => JSON.stringify([...map].sort());
      const wantD1s = fmt(wantD1);
      if (fmt(d1) !== wantD1s) {
        errors.push(`backup-resources: D1 set drift - ${OPERATIONAL.backup} has ${fmt(d1)}, provisioned workers bind ${wantD1s}`);
      }
      const haveR2 = JSON.stringify([...new Set(r2)].sort());
      const wantR2s = JSON.stringify([...wantR2].sort());
      if (haveR2 !== wantR2s) {
        errors.push(`backup-resources: R2 set drift - ${OPERATIONAL.backup} has ${haveR2}, provisioned workers bind ${wantR2s}`);
      }
      const haveKv = new Set(kv.values());
      for (const id of wantKv) {
        if (!haveKv.has(id)) errors.push(`backup-resources: KV namespace ${id} is bound by a provisioned worker but not backed up`);
      }
      for (const id of haveKv) {
        if (!wantKv.has(id)) errors.push(`backup-resources: KV namespace ${id} in ${OPERATIONAL.backup} is bound by no provisioned worker (dead resource?)`);
      }
    }
  }

  // H-11 the backup cron is time-bounded.
  const cron = readText(root, OPERATIONAL.backupCrontab);
  if (!cron) errors.push(`${OPERATIONAL.backupCrontab} missing`);
  else {
    const line = cron.split("\n").find((l) => l.includes("forum-backup.sh") && !l.trim().startsWith("#"));
    if (!line || !/\btimeout\b/.test(line)) {
      errors.push(`backup-crontab: ${OPERATIONAL.backupCrontab} runs forum-backup.sh without a timeout bound`);
    }
  }

  // C-5 workflow worker targets.
  const workerNames = new Set(Object.values(manifests).map((m) => m.workerName));
  for (const rel of [SECRETS_WORKFLOW, OPERATIONAL.workersDeploy]) {
    const text = readText(root, rel);
    if (!text) {
      errors.push(`${rel} missing`);
      continue;
    }
    for (const ref of new Set(text.match(WORKER_REF) ?? [])) {
      if (!workerNames.has(ref)) {
        errors.push(`workflow-workers: ${rel} names ${ref}, which is not the name of any forum-config/deploy worker (dead v1 worker?)`);
      }
    }
  }
  const wd = readText(root, OPERATIONAL.workersDeploy);
  if (wd) {
    const entries = [...wd.matchAll(/^\s*config:\s*([a-z-]+)\s*\n\s*worker_name:\s*(\S+)/gm)];
    if (entries.length === 0) errors.push(`workflow-workers: no deploy matrix entries found in ${OPERATIONAL.workersDeploy}`);
    for (const [, config, workerName] of entries) {
      const key = config.replace(/-worker$/, "");
      const m = manifests[key];
      if (MANUAL_ONLY_CONFIGS.has(config)) {
        errors.push(`workflow-workers: ${config} is operator-deployed by hand and must not be in the ${OPERATIONAL.workersDeploy} matrix`);
      } else if (!m) {
        errors.push(`workflow-workers: matrix config ${config} has no manifest`);
      } else if (!m.provisioned) {
        errors.push(`workflow-workers: ${config} is not provisioned (placeholder binding id) and must not be in the deploy matrix`);
      } else if (m.workerName !== workerName) {
        errors.push(`workflow-workers: matrix worker_name ${workerName} != ${WRANGLER[key]} name ${m.workerName}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
