// KIT_REF sweep: the pin-parity check proves the ref is identical across the
// three ENUMERATED pin sites (PIN_SITES), but nothing forces a KIT_REF
// defined in any OTHER workflow (a future fourth kit-clone site) to agree
// with them. That is the same drift trap the action-pin sweep closed for
// `uses:` refs: enumerate the sites, and a site added later drifts unseen on
// the next repin. This sweep binds EVERY workflow that defines a KIT_REF to
// one identical full-length commit SHA, enumerated or not.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PIN_SITES, parseKitRef, workflowFiles } from "../lib/pin-parity.mjs";
import { REPO_ROOT, cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

/** Map of workflow file to KIT_REF value, for every workflow defining one. */
function kitRefDefiners(root) {
  const definers = new Map();
  for (const file of workflowFiles(root)) {
    const ref = parseKitRef(readFileSync(join(root, file), "utf8"));
    if (ref) definers.set(file, ref);
  }
  return definers;
}

/** Every definer — enumerated pin site or not — must carry the identical ref. */
function kitRefAgreement(root) {
  const definers = kitRefDefiners(root);
  const refs = [...new Set(definers.values())];
  const errors = [];
  if (definers.size === 0) errors.push("no workflow defines a KIT_REF at all");
  if (refs.length > 1) {
    const detail = [...definers.entries()]
      .map(([file, ref]) => `${file}=${ref.slice(0, 12)}...`)
      .join(", ");
    errors.push(`KIT_REF values disagree across workflows: ${detail}`);
  }
  const canonical = refs[0];
  if (canonical && !/^[0-9a-f]{40}$/.test(canonical)) {
    errors.push(`KIT_REF '${canonical}' is not a full 40-hex commit SHA`);
  }
  for (const site of PIN_SITES) {
    if (!definers.has(site)) errors.push(`pin site ${site} defines no KIT_REF`);
  }
  return { ok: errors.length === 0, errors, definers, canonical };
}

describe("the live repository", () => {
  const result = kitRefAgreement(REPO_ROOT);

  it("carries one identical full-SHA KIT_REF in every defining workflow", () => {
    expect(result.errors).toEqual([]);
    expect(result.canonical).toMatch(/^[0-9a-f]{40}$/);
    for (const site of PIN_SITES) {
      expect(result.definers.get(site)).toBe(result.canonical);
    }
  });
});

describe("a KIT_REF outside the enumerated pin sites cannot drift", () => {
  it("catches a fourth workflow pinning a different kit commit", () => {
    const drifted = "f".repeat(40);
    const root = makeFixtureRepo((r) => {
      // ci.yml legitimately carries no KIT_REF; planting one here simulates a
      // future clone site the PIN_SITES enumeration never learned about.
      r.edit(".github/workflows/ci.yml", (t) =>
        t.replace(
          "env:\n  CARGO_TERM_COLOR: always",
          `env:\n  KIT_REF: '${drifted}'\n  CARGO_TERM_COLOR: always`,
        ),
      );
    });
    const result = kitRefAgreement(root);
    expect(result.ok).toBe(false);
    const joined = result.errors.join("\n");
    expect(joined).toContain("KIT_REF values disagree");
    expect(joined).toContain(".github/workflows/ci.yml");
  });

  it("catches a pin site whose ref is not a full commit SHA", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/^  KIT_REF: '[0-9a-f]+'$/m, `  KIT_REF: '${"a".repeat(8)}'`),
      );
    });
    const result = kitRefAgreement(root);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("not a full 40-hex");
  });
});
