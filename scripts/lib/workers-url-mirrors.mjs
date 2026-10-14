// Worker URL mirrors (operator overlay, ADR-2005 enumerated-mirror posture).
//
// `forum-config/src/workers.rs::deployed_urls` hardcodes the pod and relay
// worker URLs as Rust constants for service discovery. Those constants
// duplicate two authored values in `forum-config/dreamlab.toml`:
//
//   [pod].base_url  <-> deployed_urls::POD_WORKER
//   [relay].url     <-> deployed_urls::RELAY_WORKER
//
// checkConfigMirrors compares the wrangler-var projections of these URLs
// (POD_BASE_URL / RELAY_URL) but never the Rust constants, so a hostname
// change that updated the TOML and the wrangler vars could still leave
// workers.rs advertising a dead URL to service discovery. This module
// enumerates the pair explicitly and compares it at bench time (PR #59
// pattern: the vitest suite is the enforcement path).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToml } from "./toml-lite.mjs";

export const TOML_PATH = "forum-config/dreamlab.toml";
export const WORKERS_RS_PATH = "forum-config/src/workers.rs";

const URL_PAIRS = [
  {
    id: "pod-base-url",
    tomlSection: "pod",
    tomlKey: "base_url",
    constant: "POD_WORKER",
  },
  {
    id: "relay-url",
    tomlSection: "relay",
    tomlKey: "url",
    constant: "RELAY_WORKER",
  },
];

function rustConstValue(source, name) {
  const pattern = new RegExp(`pub\\s+const\\s+${name}:\\s*&str\\s*=\\s*"([^"]+)"`);
  const match = source.match(pattern);
  return match ? match[1] : undefined;
}

/**
 * Compare the authored TOML worker URLs with the Rust service-discovery
 * constants that duplicate them. Fail-closed on a missing site.
 */
export function checkWorkersUrlMirrors(root) {
  const errors = [];

  const tomlFile = join(root, TOML_PATH);
  if (!existsSync(tomlFile)) {
    return { ok: false, errors: [`${TOML_PATH} missing`] };
  }
  const toml = parseToml(readFileSync(tomlFile, "utf8"));

  const rsFile = join(root, WORKERS_RS_PATH);
  if (!existsSync(rsFile)) {
    return { ok: false, errors: [`${WORKERS_RS_PATH} missing`] };
  }
  const source = readFileSync(rsFile, "utf8");

  for (const pair of URL_PAIRS) {
    const where = `${TOML_PATH} [${pair.tomlSection}].${pair.tomlKey}`;
    const authored = toml?.[pair.tomlSection]?.[pair.tomlKey];
    const mirrored = rustConstValue(source, pair.constant);
    if (authored === undefined || authored === null || authored === "") {
      errors.push(`${pair.id}: ${where} has no value - it is the authored source of truth`);
    } else if (mirrored === undefined) {
      errors.push(
        `${pair.id}: ${WORKERS_RS_PATH} has no \`pub const ${pair.constant}\` for this governed datum`,
      );
    } else if (String(authored) !== mirrored) {
      errors.push(
        `${pair.id}: MIRROR DRIFT between ${where} and ${WORKERS_RS_PATH}\n` +
          `    ${where}: ${authored}\n` +
          `    ${WORKERS_RS_PATH} deployed_urls::${pair.constant}: ${mirrored}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
