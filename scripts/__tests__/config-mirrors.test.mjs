// Tests for config mirror enumeration + parity (ADR-2005).
//
// ADR-2005 defers the single-source generator, so the mirrors are hand-synced.
// The gate's job is to make a missed hand-edit fail the build. Each case below
// rotates ONE site of a mirror and asserts the drift is caught - including the
// mirrors the previous CI job never looked at (client pubkeys, the ZONE_CONFIG
// copies, service endpoints).

import { afterAll, describe, expect, it } from "vitest";
import { canonicaliseZones, checkConfigMirrors } from "../lib/config-mirrors.mjs";
import { parseToml } from "../lib/toml-lite.mjs";
import { REPO_ROOT, cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

const ROTATED = "a".repeat(64);

const expectDrift = (root, needle) => {
  const result = checkConfigMirrors(root);
  expect(result.ok).toBe(false);
  const joined = result.errors.join("\n");
  expect(joined, `errors were:\n${joined}`).toContain(needle);
  return result;
};

describe("toml-lite", () => {
  it("parses tables, arrays of tables and multi-line arrays", () => {
    const doc = parseToml(
      [
        "[admin]",
        'mode = "static"',
        "static_pubkeys = [",
        '  "aa",  # a comment',
        '  "bb",',
        "]",
        "[[zones]]",
        'id = "zone1"',
        "encrypted = false",
        "[[zones]]",
        'id = "zone2"',
        "kanban = true",
      ].join("\n"),
    );
    expect(doc.admin.static_pubkeys).toEqual(["aa", "bb"]);
    expect(doc.zones).toHaveLength(2);
    expect(doc.zones[1]).toEqual({ id: "zone2", kanban: true });
  });

  it("does not treat a # inside a string as a comment", () => {
    expect(parseToml('accent_hex = "#22c55e"').accent_hex).toBe("#22c55e");
  });

  it("throws rather than mis-parsing an unsupported value", () => {
    expect(() => parseToml("k = 2026-09-05T00:00:00Z")).toThrow(/unsupported TOML value/);
  });
});

describe("canonicaliseZones", () => {
  it("is insensitive to zone order and key order", () => {
    const a = [
      { id: "z2", slug: "b" },
      { id: "z1", slug: "a" },
    ];
    const b = [
      { slug: "a", id: "z1" },
      { slug: "b", id: "z2" },
    ];
    expect(canonicaliseZones(a)).toEqual(canonicaliseZones(b));
  });

  it("treats an empty cohort list and an absent one as equivalent", () => {
    expect(canonicaliseZones([{ id: "z", required_cohorts: [] }])).toEqual(
      canonicaliseZones([{ id: "z" }]),
    );
  });

  it("does not collapse a genuine field difference", () => {
    expect(canonicaliseZones([{ id: "z", kanban: true }])).not.toEqual(
      canonicaliseZones([{ id: "z" }]),
    );
  });
});

describe("the live repository", () => {
  const result = checkConfigMirrors(REPO_ROOT);

  it("has every enumerated mirror in sync", () => {
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("enumerates the mirrors the previous check omitted", () => {
    const ids = result.mirrors.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "admin-pubkeys",
        "admin-pubkeys-auth-secret",
        "client-admin-pubkey",
        "agent-jarvis-pubkey",
        "zone-model",
        "relay-url",
        "pod-base-url",
      ]),
    );
  });

  it("compares the zone model across all four sites", () => {
    const zones = result.mirrors.find((m) => m.id === "zone-model");
    expect(zones.sites).toHaveLength(4);
    expect(zones.agreed).toBe(true);
  });

  it("records the auth-worker admin secret as enumerated but unverifiable", () => {
    const secret = result.mirrors.find((m) => m.id === "admin-pubkeys-auth-secret");
    expect(secret.verifiable).toBe(false);
  });
});

describe("a rotation that misses a mirror is rejected", () => {
  it("catches an admin key rotated in the TOML but not the relay worker", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/dreamlab.toml",
        '"6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a"',
        `"${ROTATED}"`,
      );
    });
    expectDrift(root, "admin-pubkeys: MIRROR DRIFT");
  });

  it("catches an admin key rotated in the relay worker but not the search worker", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/relay-worker.wrangler.toml", (t) =>
        t.replace("6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a", ROTATED),
      );
    });
    expectDrift(root, "admin-pubkeys: MIRROR DRIFT");
  });

  // Previously unchecked: the client mirrors in deploy.yml.
  it("catches a client admin pubkey that is not in the authored admin set", () => {
    const root = makeFixtureRepo((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/^  VITE_ADMIN_PUBKEY: '[0-9a-f]+'$/m, `  VITE_ADMIN_PUBKEY: '${ROTATED}'`),
      );
    });
    expectDrift(root, "client-admin-pubkey: MIRROR DRIFT");
  });

  it("catches an agent pubkey rotated in the roster but not in the deploy workflow", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/dreamlab.toml",
        'pubkey        = "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9"',
        `pubkey        = "${ROTATED}"`,
      );
    });
    expectDrift(root, "agent-jarvis-pubkey: MIRROR DRIFT");
  });

  // Previously unchecked: all three ZONE_CONFIG projections.
  it("catches a zone added to the TOML but not projected to the client", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/dreamlab.toml", (t) =>
        `${t}\n[[zones]]\nid = "zone5"\nslug = "extra"\ndisplay_name = "Extra"\nvisibility = "locked"\nencrypted = false\n`,
      );
    });
    expectDrift(root, "zone-model: MIRROR DRIFT");
  });

  it("catches a zone flag present in the relay mirror but missing from the auth mirror", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/auth-worker.wrangler.toml", (t) =>
        t.replace('{"id":"zone3","kanban":true,', '{"id":"zone3",'),
      );
    });
    expectDrift(root, "zone-model: MIRROR DRIFT");
  });

  it("catches a zone visibility changed in the relay mirror only", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/relay-worker.wrangler.toml", (t) =>
        t.replace('"id":"zone2","slug":"minimoonoir"', '"id":"zone2","slug":"minimoonoir-renamed"'),
      );
    });
    expectDrift(root, "zone-model: MIRROR DRIFT");
  });

  // Previously unchecked: the service endpoint mirrors.
  it("catches a relay URL changed in the TOML but not the client build variable", () => {
    const root = makeFixtureRepo((r) => {
      r.replaceOnce(
        "forum-config/dreamlab.toml",
        'url             = "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev"',
        'url             = "wss://relay.dreamlab-ai.com"',
      );
    });
    expectDrift(root, "relay-url: MIRROR DRIFT");
  });

  it("catches a pod base URL changed in one worker only", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/pod-worker.wrangler.toml", (t) =>
        t.replace(
          'POD_BASE_URL     = "https://dreamlab-pod-api.solitary-paper-764d.workers.dev"',
          'POD_BASE_URL     = "https://pods.dreamlab-ai.com"',
        ),
      );
    });
    expectDrift(root, "pod-base-url: MIRROR DRIFT");
  });

  it("rejects an ADMIN_PUBKEYS plaintext binding that would mask the CF secret", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/auth-worker.wrangler.toml", (t) =>
        t.replace("[vars]", `[vars]\nADMIN_PUBKEYS = "${ROTATED}"`),
      );
    });
    expectDrift(root, "must remain a CF");
  });

  it("rejects a governed key added to a wrangler config without being enumerated", () => {
    const root = makeFixtureRepo((r) => {
      r.edit("forum-config/deploy/preview-worker.wrangler.toml", (t) =>
        t.replace("[vars]", '[vars]\nJARVIS_PUBKEY = "deadbeef"'),
      );
    });
    expectDrift(root, "unenumerated mirror");
  });

  it("rejects removal of the auth-worker secret push path", () => {
    const root = makeFixtureRepo((r) => r.remove(".github/workflows/set-worker-secrets.yml"));
    expectDrift(root, "has no push path");
  });
});
