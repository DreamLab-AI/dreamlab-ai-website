#!/usr/bin/env node
// Dual-pin parity CLI (ADR-2004) — the SINGLE entrypoint for the pin invariant.
//
// Consumers (there are exactly two, and both call this file):
//   .github/workflows/ci.yml   job `pin-check`      → node scripts/pin-parity.mjs
//   scripts/pin-parity-check.sh (dream-cycle)       → node scripts/pin-parity.mjs
//
// Usage:
//   node scripts/pin-parity.mjs [--root DIR] [--json] [--print-resolved]
//                               [--skip-actions] [--github]
//
//   --root DIR         repository root to check (default: the repo this file is in)
//   --json             emit a machine-readable receipt on stdout
//   --print-resolved   print the RESOLVED lines for the compatibility record and exit
//   --skip-actions     check kit pins only (the action-pin sweep is a separate concern)
//   --github           additionally emit ::error:: annotations for GitHub Actions
//
// Emits PIN-PARITY-OK / PIN-DRIFT as the last line so the dream-cycle evaluator
// can grep the verdict without parsing JSON. Exits 1 on any drift.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KIT_CRATES,
  LOCKFILE_PATH,
  checkActionPins,
  checkKitPins,
  parseLockfileResolved,
} from "./lib/pin-parity.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(value("--root") ?? repoRoot);
const asJson = flag("--json");
const github = flag("--github");

if (flag("--print-resolved")) {
  const lock = parseLockfileResolved(readFileSync(`${root}/${LOCKFILE_PATH}`, "utf8"));
  for (const crate of KIT_CRATES) {
    const entry = lock.get(crate);
    if (!entry) {
      console.error(`${crate} is not resolved in ${LOCKFILE_PATH}`);
      process.exit(1);
    }
    console.log(`RESOLVED ${crate} ${entry.version} ${entry.checksum}`);
  }
  process.exit(0);
}

const kit = checkKitPins(root);
const actions = flag("--skip-actions")
  ? { ok: true, findings: [], checked: [], skipped: true }
  : checkActionPins(root);

const errors = [
  ...kit.errors,
  ...actions.findings.map(
    (f) => `${f.file}:${f.line}: action '${f.ref}' is ${f.reason}; pin to a full 40-hex commit SHA`,
  ),
];
const ok = errors.length === 0;

if (asJson) {
  console.log(
    JSON.stringify(
      {
        ok,
        root,
        kit_ref: kit.kitRef,
        kit_version: kit.version,
        crates: KIT_CRATES,
        workflows_checked: actions.checked,
        errors,
        summary: kit.summary,
        verdict: ok ? "PIN-PARITY-OK" : "PIN-DRIFT",
      },
      null,
      2,
    ),
  );
} else {
  for (const line of kit.summary) console.log(line);
  if (!actions.skipped) {
    console.log(
      `${actions.checked.length} workflow(s) swept for tag-pinned actions; ` +
        `${actions.findings.length} unpinned use(s)`,
    );
  }
  for (const err of errors) {
    console.error(github ? `::error::${err}` : `ERROR: ${err}`);
  }
}

console.log(ok ? "PIN-PARITY-OK" : "PIN-DRIFT");
process.exit(ok ? 0 : 1);
