#!/usr/bin/env node
// Effective-endpoint validation CLI (ADR-2002 / ADR-2003).
//
// Proves that every frontend surface actually receives the endpoints it reads,
// across BOTH config dialects (Vite build variables and window.__ENV__
// injection). Run by the pre-deploy gate before anything is published, and by
// the CI workflow on every push.
//
// Usage: node scripts/check-effective-endpoints.mjs [--root DIR] [--json] [--github]

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEffectiveEndpoints } from "./lib/effective-endpoints.mjs";

const argv = process.argv.slice(2);
const value = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(value("--root") ?? repoRoot);
const github = argv.includes("--github");

const result = checkEffectiveEndpoints(root);

if (argv.includes("--json")) {
  console.log(JSON.stringify({ ...result, root }, null, 2));
} else {
  for (const [name, surface] of Object.entries(result.surfaces)) {
    const keys =
      surface.dialect === "vite-build-variables"
        ? Object.keys(surface.supplied)
        : Object.keys(surface.resolved);
    console.log(`${name.padEnd(6)} [${surface.dialect}] ${keys.length} effective key(s)`);
    if (surface.reads) {
      console.log(`       reads: ${surface.reads.join(", ") || "(none)"}`);
    }
  }
  for (const err of result.errors) {
    console.error(github ? `::error::${err}` : `ERROR: ${err}`);
  }
}

console.log(result.ok ? "ENDPOINTS-OK" : "ENDPOINTS-INVALID");
process.exit(result.ok ? 0 : 1);
