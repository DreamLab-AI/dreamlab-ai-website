// Tests for the kit-pin-guard shell entrypoint (.github/workflows/kit-pin-guard.yml).
//
// The guard is a THIN WRAPPER over scripts/pin-parity.mjs. Two things are worth
// testing about a wrapper, and both are regressions this file exists to prevent:
//
//   1. Its CONTRACT with the workflow: print a verdict token, and always exit 0
//      (kit-pin-guard.yml greps the token and owns the failure decision, so a
//      non-zero exit here would fail the step before the token is ever read).
//   2. That it stays a wrapper. Until 2026-09-06 it was a shell transcription of
//      the invariant, and the copy rotted: when forum-config/Cargo.toml moved to
//      exact `=` pins it read the requirement as `=1.0.0-beta.9`, compared that
//      against the record's `1.0.0-beta.9`, and reported PIN-DRIFT-RECORD-VER on
//      a correctly-pinned tree. It also never opened Cargo.lock and never swept
//      the workflows for tag-pinned actions, so it passed things the real gate
//      rejects. The drift cases below are exactly those blind spots.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { REPO_ROOT, cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

const GUARD = join(REPO_ROOT, "scripts/dream-kit-pin-guard.sh");

/** Run the guard, optionally against a fixture tree via its `--root` passthrough. */
const runGuard = (root) => {
  const result = spawnSync("bash", root ? [GUARD, "--root", root] : [GUARD], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
};

/**
 * Assert the guard reported drift — and, critically, that it did so while still
 * exiting 0, because the workflow reads the token rather than the exit code.
 */
const expectDriftVerdict = (result, needle) => {
  expect(result.status, `guard must always exit 0; output was:\n${result.output}`).toBe(0);
  expect(result.stdout).toContain("PIN-DRIFT");
  expect(result.output, `output was:\n${result.output}`).toContain(needle);
};

describe("verdict contract", () => {
  it("reports PIN-PARITY-OK and exits 0 for the live repository", () => {
    const result = runGuard();
    expect(result.status, `output was:\n${result.output}`).toBe(0);
    expect(result.stdout).toContain("PIN-PARITY-OK");
    expect(result.stdout).not.toContain("PIN-DRIFT");
  });

  // The 2026-09-06 regression itself: the shipped manifest pins are exact (`=`),
  // the record states the bare version, and a correct guard must read those two
  // as agreeing. The old transcription reported PIN-DRIFT-RECORD-VER here.
  it("accepts an exact `=` pin against a bare CANONICAL_KIT_VERSION", () => {
    const manifest = readFileSync(join(REPO_ROOT, "forum-config/Cargo.toml"), "utf8");
    const record = readFileSync(
      join(REPO_ROOT, "docs/architecture/kit-compatibility-record.md"),
      "utf8",
    );
    // Guard the premise: if the repo ever stops pinning exactly, this test is
    // no longer exercising the sigil mismatch and should be revisited.
    expect(manifest).toMatch(/nostr-bbs-core = "=\d/);
    expect(record).toMatch(/^CANONICAL_KIT_VERSION=\d/m);

    const result = runGuard(makeFixtureRepo());
    expect(result.stdout, `output was:\n${result.output}`).toContain("PIN-PARITY-OK");
  });
});

describe("drift is reported through the wrapper", () => {
  it("reports drift when KIT_REF differs between workflows", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/rust-ci.yml", (t) =>
        t.replace(/KIT_REF: '[0-9a-f]+'/, `KIT_REF: '${"0".repeat(40)}'`),
      );
    });
    expectDriftVerdict(runGuard(root), "KIT_REF differs across pin sites");
  });

  it("reports drift when the record's canonical version disagrees", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("docs/architecture/kit-compatibility-record.md", (t) =>
        t.replace("CANONICAL_KIT_VERSION=1.0.0-beta.9", "CANONICAL_KIT_VERSION=1.0.0-beta.8"),
      );
    });
    expectDriftVerdict(runGuard(root), "CANONICAL_KIT_VERSION is 1.0.0-beta.8");
  });

  // Blind spot 1 of the old transcription: it compared requirement strings, so a
  // floating range that resolved to anything at all looked identical to a pin.
  it("reports drift for a floating requirement range", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/Cargo.toml",
        'nostr-bbs-core = "=1.0.0-beta.9"',
        'nostr-bbs-core = "1.0.0-beta.9"',
      );
    });
    expectDriftVerdict(runGuard(root), "is a floating requirement range");
  });

  // Blind spot 2: it never opened the lockfile, so the bytes actually built were
  // outside the invariant entirely.
  it("reports drift for a lockfile checksum that fails the recorded receipt", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/Cargo.lock", (t) =>
        t.replace(
          "e082e46e9e29875485589b9a018f9643e23dfcc73c2f87edf63207a5f326fb70",
          "f".repeat(64),
        ),
      );
    });
    expectDriftVerdict(runGuard(root), "record checksum");
  });

  // Blind spot 3: the guard's own workflow reintroduced a mutable tag pin and
  // the transcription had nothing to say about it.
  it("reports drift for a tag-pinned action", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/kit-pin-guard.yml", (t) =>
        t.replace(/actions\/checkout@[0-9a-f]{40} # v4\.4\.0/, "actions/checkout@v4"),
      );
    });
    expectDriftVerdict(runGuard(root), "mutable ref 'v4'");
  });
});

describe("the guard stays a wrapper", () => {
  const guardSource = readFileSync(GUARD, "utf8");
  const body = guardSource
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");

  it("delegates to the shared gate", () => {
    expect(body).toContain("node scripts/pin-parity.mjs");
  });

  // Any of these appearing outside a comment means the invariant has been
  // transcribed into shell a second time — the defect this file documents.
  it("contains no transcribed check logic", () => {
    for (const marker of ["CANONICAL_KIT_SHA", "CANONICAL_KIT_VERSION", "KIT_REF", "nostr-bbs-"]) {
      expect(body, `guard body re-implements the check via ${marker}`).not.toContain(marker);
    }
  });

  // The nightly dream evaluator ran its own inlined copy of the same shell, with
  // the same sigil bug; it must call the shared entrypoint instead. The annexe
  // ssh dispatch strips nested double quotes, so the command must be quote-free.
  it("is the same check the nightly dream evaluator runs", () => {
    const config = JSON.parse(readFileSync(join(REPO_ROOT, "dream.config.json"), "utf8"));
    const entrypoint = config.evaluatorEntrypoints["pin-parity"];
    expect(entrypoint).toContain("scripts/pin-parity-check.sh");
    expect(entrypoint).not.toContain('"');
    expect(entrypoint).not.toContain("CANONICAL_KIT");
  });
});
