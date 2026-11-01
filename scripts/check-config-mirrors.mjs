#!/usr/bin/env node
// Config mirror enumeration + parity CLI (ADR-2005).
//
// ADR-2005 defers the single-source generator and accepts hand-synced mirrors.
// That is only tenable while every mirror is enumerated and compared, which is
// what this does: it walks the authored TOML, the deploy workflow's client
// mirrors, and all five wrangler configs, and fails on any divergence - plus on
// any governed key that appears in a wrangler [vars] block without being
// covered by an enumerated mirror.
//
// Usage: node scripts/check-config-mirrors.mjs [--root DIR] [--json] [--github]

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkConfigMirrors, checkOperatorVarMirrors } from "./lib/config-mirrors.mjs";

const argv = process.argv.slice(2);
const value = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(value("--root") ?? repoRoot);
const github = argv.includes("--github");

// Both checks gate: the operator var mirrors (webauthn, mesh, poker) were
// bench-tested but never run here, so CI did not enforce them (ER-23).
const enumerated = checkConfigMirrors(root);
const operator = checkOperatorVarMirrors(root);
const result = {
  ...enumerated,
  ok: enumerated.ok && operator.ok,
  errors: [...enumerated.errors, ...operator.errors],
  operator,
};

if (argv.includes("--json")) {
  console.log(JSON.stringify({ ...result, root }, null, 2));
} else {
  for (const m of result.mirrors) {
    const state = m.verifiable ? (m.agreed ? "in sync" : "DRIFT") : "not machine-verifiable";
    console.log(`${m.id.padEnd(28)} ${String(m.sites.length).padStart(2)} site(s)  ${state}`);
    for (const site of m.sites) console.log(`    - ${site}`);
  }
  console.log(`${"operator-var-mirrors".padEnd(28)}     ${operator.ok ? "in sync" : "DRIFT"}`);
  for (const err of result.errors) {
    console.error(github ? `::error::${err.replace(/\n/g, "%0A")}` : `ERROR: ${err}`);
  }
}

console.log(result.ok ? "MIRRORS-OK" : "MIRROR-DRIFT");
process.exit(result.ok ? 0 : 1);
