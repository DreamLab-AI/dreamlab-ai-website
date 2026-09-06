// Tests for the shared pin-parity gate (ADR-2004).
//
// The central claim under test is that a DELIBERATELY INCONSISTENT PIN is
// rejected. Each drift case corrupts one fact in a copy of the live repository
// and asserts the gate fails with a message naming that fact - so a regression
// that weakens the check shows up as a test that stops failing.

import { afterAll, describe, expect, it } from "vitest";
import {
  checkActionPins,
  checkKitPins,
  findTagPinnedUses,
  parseKitRef,
  parseLockfileResolved,
  parseManifestRequirements,
  parseRecord,
} from "../lib/pin-parity.mjs";
import { REPO_ROOT, cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

/** Assert the gate failed, and that some error mentions `needle`. */
const expectDrift = (result, needle) => {
  expect(result.ok).toBe(false);
  const joined = result.errors.join("\n");
  expect(joined, `errors were:\n${joined}`).toContain(needle);
};

describe("parsers", () => {
  it("reads KIT_REF from a workflow", () => {
    expect(parseKitRef("env:\n  KIT_REF: 'abc123'\n")).toBe("abc123");
    expect(parseKitRef("env:\n  OTHER: 'x'\n")).toBeNull();
    expect(parseKitRef(null)).toBeNull();
  });

  it("reads exact and floating crate requirements verbatim", () => {
    const reqs = parseManifestRequirements(
      ['nostr-bbs-core = "=1.0.0-beta.9"', 'nostr-bbs-mesh = "1.0.0-beta.9"'].join("\n"),
    );
    expect(reqs.get("nostr-bbs-core")).toBe("=1.0.0-beta.9");
    expect(reqs.get("nostr-bbs-mesh")).toBe("1.0.0-beta.9");
  });

  it("reads resolved version, checksum and source per package block", () => {
    const lock = parseLockfileResolved(`
[[package]]
name = "nostr-bbs-core"
version = "1.0.0-beta.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "${"a".repeat(64)}"
dependencies = [
 "nostr-bbs-mesh",
]
`);
    expect(lock.get("nostr-bbs-core")).toEqual({
      version: "1.0.0-beta.9",
      checksum: "a".repeat(64),
      source: "registry+https://github.com/rust-lang/crates.io-index",
    });
    // A crate named only inside another package's `dependencies` list must not
    // be mistaken for a resolved package of its own.
    expect(lock.has("nostr-bbs-mesh")).toBe(false);
  });

  it("reads the record's canonical fields and RESOLVED lines", () => {
    const rec = parseRecord(
      `CANONICAL_KIT_SHA=deadbeef\nCANONICAL_KIT_VERSION=1.0.0\nRESOLVED nostr-bbs-core 1.0.0 ${"b".repeat(64)}\n`,
    );
    expect(rec.sha).toBe("deadbeef");
    expect(rec.version).toBe("1.0.0");
    expect(rec.resolved.get("nostr-bbs-core")).toEqual({
      version: "1.0.0",
      checksum: "b".repeat(64),
    });
  });
});

describe("kit pin parity against the live repository", () => {
  it("passes as shipped", () => {
    const result = checkKitPins(REPO_ROOT);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.kitRef).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("deliberately inconsistent pins are rejected", () => {
  it("rejects a KIT_REF that differs between workflows", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/rust-ci.yml", (t) =>
        t.replace(/KIT_REF: '[0-9a-f]+'/, `KIT_REF: '${"0".repeat(40)}'`),
      );
    });
    expectDrift(checkKitPins(root), "KIT_REF differs across pin sites");
  });

  it("rejects a KIT_REF that no longer matches the compatibility record", () => {
    const root = makeFixtureRepo((r) => {
      for (const wf of ["deploy", "workers-deploy", "rust-ci"]) {
        r.edit(`.github/workflows/${wf}.yml`, (t) =>
          t.replace(/KIT_REF: '[0-9a-f]+'/, `KIT_REF: '${"1".repeat(40)}'`),
        );
      }
    });
    expectDrift(checkKitPins(root), "CANONICAL_KIT_SHA");
  });

  // The defect ADR-2004's closeout names: a requirement RANGE rather than an
  // exact pin. This is what the pre-2026-09-05 check accepted.
  it("rejects a floating requirement range in place of an exact pin", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/Cargo.toml",
        'nostr-bbs-core = "=1.0.0-beta.9"',
        'nostr-bbs-core = "1.0.0-beta.9"',
      );
    });
    const result = checkKitPins(root);
    expectDrift(result, "is a floating requirement range");
    expect(result.errors.join("\n")).toContain("nostr-bbs-core");
  });

  it("rejects a caret requirement", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/Cargo.toml",
        'nostr-bbs-mesh = "=1.0.0-beta.9"',
        'nostr-bbs-mesh = "^1.0.0-beta.9"',
      );
    });
    expectDrift(checkKitPins(root), "floating requirement range");
  });

  // The other half of that defect: parity never inspected the lockfile, so the
  // manifest could claim one version while the build resolved another.
  it("rejects a manifest pin that disagrees with the resolved lockfile version", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/Cargo.toml",
        'nostr-bbs-core = "=1.0.0-beta.9"',
        'nostr-bbs-core = "=1.0.0-beta.8"',
      );
    });
    expectDrift(checkKitPins(root), "manifest pins =1.0.0-beta.8 but");
  });

  it("rejects a lockfile checksum that does not match the recorded receipt", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/Cargo.lock", (t) =>
        t.replace(
          "e082e46e9e29875485589b9a018f9643e23dfcc73c2f87edf63207a5f326fb70",
          "f".repeat(64),
        ),
      );
    });
    expectDrift(checkKitPins(root), "record checksum");
  });

  it("rejects a resolved version that disagrees with CANONICAL_KIT_VERSION", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("docs/architecture/kit-compatibility-record.md", (t) =>
        t.replace("CANONICAL_KIT_VERSION=1.0.0-beta.9", "CANONICAL_KIT_VERSION=1.0.0-beta.8"),
      );
    });
    expectDrift(checkKitPins(root), "CANONICAL_KIT_VERSION is 1.0.0-beta.8");
  });

  it("rejects a crate swapped from the registry to a git source", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/Cargo.lock", (t) =>
        t.replace(
          `name = "nostr-bbs-mesh"\nversion = "1.0.0-beta.9"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d3d3beab1d89bc6c54ac71408c683413fb572fce4d0a187c1dbd79a6eef7d8f8"`,
          `name = "nostr-bbs-mesh"\nversion = "1.0.0-beta.9"\nsource = "git+https://example.invalid/kit#0123456789abcdef"`,
        ),
      );
    });
    expectDrift(checkKitPins(root), "cannot be pin-verified");
  });

  it("rejects a record missing a RESOLVED line for a consumed crate", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("docs/architecture/kit-compatibility-record.md", (t) =>
        t.replace(/^RESOLVED nostr-bbs-rate-limit .*$/m, ""),
      );
    });
    expectDrift(checkKitPins(root), "no RESOLVED line for nostr-bbs-rate-limit");
  });

  it("rejects a missing compatibility record outright", () => {
    const root = makeFixtureRepo((r) => r.remove("docs/architecture/kit-compatibility-record.md"));
    expectDrift(checkKitPins(root), "compatibility record missing");
  });
});

describe("action SHA pinning", () => {
  it("finds no tag-pinned action in the live repository", () => {
    const result = checkActionPins(REPO_ROOT);
    expect(result.findings).toEqual([]);
    expect(result.checked.length).toBeGreaterThan(0);
  });

  it("flags a mutable tag but accepts a full 40-hex SHA", () => {
    const yaml = [
      "jobs:",
      "  a:",
      "    steps:",
      "      - uses: actions/checkout@v4",
      `      - uses: actions/cache@${"a".repeat(40)} # v4.3.0`,
      "      - uses: ./.github/workflows/local.yml",
      "      - uses: actions/setup-node@main",
    ].join("\n");
    const findings = findTagPinnedUses(yaml, "x.yml");
    expect(findings.map((f) => f.ref)).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@main",
    ]);
    // A local reusable workflow has no SHA to pin and must not be flagged.
    expect(findings.some((f) => f.ref.startsWith("./"))).toBe(false);
  });

  it("flags a `uses:` with no version reference at all", () => {
    const findings = findTagPinnedUses("      - uses: actions/checkout\n", "x.yml");
    expect(findings[0].reason).toBe("no version reference at all");
  });

  it("rejects a workflow that reintroduces a tag pin", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/ci.yml", (t) =>
        t.replace(
          /actions\/checkout@[0-9a-f]{40} # v4\.4\.0/,
          "actions/checkout@v4",
        ),
      );
    });
    const result = checkActionPins(root);
    expect(result.ok).toBe(false);
    expect(result.findings[0].ref).toBe("actions/checkout@v4");
    expect(result.findings[0].reason).toContain("mutable ref 'v4'");
  });
});
