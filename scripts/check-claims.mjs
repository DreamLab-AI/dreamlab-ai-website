#!/usr/bin/env node
// Advisory content/feature-claim check (DW-06-S1-01). Always exits 0: it is not
// a gate and must never fail a build. Runs after the deterministic postbuild checks.
//
//   node scripts/check-claims.mjs [--json] [--register docs/claims-register.json] [file.md ...]
//
// Default input is README.md. The register (optional) is the authoritative,
// deterministic classification; see scripts/lib/claims.mjs. Set DREAMLAB_JEV=1
// (plus an endpoint, see docs) to add advisory Jev notes. Off by default.
import fs from "node:fs";
import { extractClaims, checkClaims, formatReport } from "./lib/claims.mjs";

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const ri = argv.indexOf("--register");
  const registerPath = ri >= 0 ? argv[ri + 1] : "docs/claims-register.json";
  const files = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--register");
  if (files.length === 0) files.push("README.md");

  let register = { features: [], claims: [] };
  try { register = JSON.parse(fs.readFileSync(registerPath, "utf8")); }
  catch { console.log(`[claims] no readable register at ${registerPath}; every claim is unclassified`); }

  const claims = files.flatMap((f) => {
    try { return extractClaims(fs.readFileSync(f, "utf8"), f); }
    catch { console.log(`[claims] cannot read ${f}`); return []; }
  });
  const report = await checkClaims(claims, register);
  console.log(json ? JSON.stringify(report, null, 2) : formatReport(report));
}

main().catch((e) => console.log(`[claims] advisory check failed (ignored): ${e.message}`)).finally(() => { process.exitCode = 0; });
