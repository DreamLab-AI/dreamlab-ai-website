// deploy ⊆ ci path-subset guard.
//
// deploy.yml ships to GitHub Pages; ci.yml is the quality gate. If deploy.yml
// can be triggered by a path that ci.yml does not also trigger on, a commit can
// reach production with no ci-pass verdict (the index.html / lockfile / scripts
// gaps fixed in the past were exactly this). This test parses both workflows and
// asserts that every path filter on a deploy trigger is covered by the matching
// ci trigger. Pure static analysis of the live files; no network.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { REPO_ROOT } from "./helpers/fixture-repo.mjs";

const load = (name) =>
  parseYaml(readFileSync(join(REPO_ROOT, ".github/workflows", name), "utf8"));

/** Triggers that fire on repository content changes (dispatch/schedule are manual or path-less). */
const PATH_TRIGGERS = ["push", "pull_request", "pull_request_target"];

/** Normalise a workflow's `on:` block into { trigger: config }. */
export const triggers = (wf) => {
  const on = wf.on ?? wf[true]; // YAML 1.1 parsers may read bare `on` as boolean true
  if (typeof on === "string") return { [on]: {} };
  if (Array.isArray(on)) return Object.fromEntries(on.map((t) => [t, {}]));
  return Object.fromEntries(Object.entries(on ?? {}).map(([k, v]) => [k, v ?? {}]));
};

/** Compile a GitHub Actions path glob to a RegExp (`**` crosses `/`, `*` and `?` do not). */
export const globToRegExp = (glob) => {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
};

/**
 * Is every file `deployGlob` can match also matched by some ci glob?
 * Conservative: identical globs, or a ci glob that matches the deploy glob text
 * itself (so `scripts/**` covers `scripts/foo/**`, `.github/workflows/**` covers
 * `.github/workflows/deploy.yml`). A false negative fails loudly, never silently passes.
 */
export const covered = (deployGlob, ciGlobs) =>
  ciGlobs.some((c) => c === deployGlob || globToRegExp(c).test(deployGlob));

/** Violations: human-readable strings, empty when deploy ⊆ ci. */
export const subsetViolations = (deployWf, ciWf) => {
  const d = triggers(deployWf);
  const c = triggers(ciWf);
  const out = [];
  for (const t of PATH_TRIGGERS) {
    if (!(t in d)) continue;
    const dp = d[t].paths ?? [];
    if (d[t]["paths-ignore"]) {
      out.push(`deploy ${t}: uses paths-ignore (matches everything but the list); not provably ⊆ ci — use an explicit paths list`);
      continue;
    }
    if (dp.length === 0) {
      out.push(`deploy ${t}: has no paths filter, so it fires on every change`);
      continue;
    }
    if (!(t in c)) {
      out.push(`deploy ${t}: ci.yml has no ${t} trigger`);
      continue;
    }
    if (c[t]["paths-ignore"]) {
      out.push(`ci ${t}: uses paths-ignore; not provably ⊇ deploy`);
      continue;
    }
    const cp = c[t].paths ?? null; // null = unfiltered = covers everything
    if (cp === null) continue;
    for (const p of dp) if (!covered(p, cp)) out.push(`deploy ${t} path '${p}' is not covered by any ci ${t} path`);
  }
  return out;
};

describe("deploy.yml path filters are a subset of ci.yml's", () => {
  it("the live workflows satisfy deploy ⊆ ci", () => {
    expect(subsetViolations(load("deploy.yml"), load("ci.yml"))).toEqual([]);
  });

  it("deploy.yml actually declares a push paths filter (the guard is not vacuous)", () => {
    expect(triggers(load("deploy.yml")).push.paths.length).toBeGreaterThan(0);
  });

  it("flags a deploy path that ci does not cover", () => {
    const deploy = { on: { push: { paths: ["src/**", "extra/**"] } } };
    const ci = { on: { push: { paths: ["src/**"] } } };
    expect(subsetViolations(deploy, ci)).toEqual([
      "deploy push path 'extra/**' is not covered by any ci push path",
    ]);
  });

  it("flags an unfiltered or paths-ignore deploy trigger", () => {
    const ci = { on: { push: { paths: ["src/**"] } } };
    expect(subsetViolations({ on: { push: {} } }, ci)).toHaveLength(1);
    expect(subsetViolations({ on: { push: { "paths-ignore": ["docs/**"] } } }, ci)).toHaveLength(1);
  });

  it("accepts a ci glob that subsumes a narrower deploy glob", () => {
    const deploy = { on: { push: { paths: [".github/workflows/deploy.yml", "scripts/lib/**"] } } };
    const ci = { on: { push: { paths: [".github/workflows/**", "scripts/**"] } } };
    expect(subsetViolations(deploy, ci)).toEqual([]);
  });
});
