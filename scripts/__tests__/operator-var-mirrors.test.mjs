// Bench-enforced parity for the operator var mirrors that checkConfigMirrors
// does not enumerate (checkOperatorVarMirrors in scripts/lib/config-mirrors.mjs).
// Lesson of 2026-10-09 (PR #58): a mirror no REQUIRED evaluator compares is not
// enforced - this file promotes [webauthn] and [mesh] parity into bench.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOML_PATH, WRANGLER, checkOperatorVarMirrors } from "../lib/config-mirrors.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Minimal operator tree carrying the sections checkOperatorVarMirrors reads. */
const writeFixture = ({ relayVars }) => {
  const dir = mkdtempSync(join(tmpdir(), "operator-var-mirrors-"));
  mkdirSync(join(dir, "forum-config", "deploy"), { recursive: true });
  writeFileSync(
    join(dir, TOML_PATH),
    [
      "[webauthn]",
      'rp_id = "example.com"',
      'expected_origin = "https://example.com"',
      "",
      "[mesh]",
      'mode = "standalone"',
      "peer_relays = []",
      "allowed_remote_dids = []",
      "",
    ].join("\n"),
  );
  const varsBlock = (vars) =>
    ["[vars]", ...Object.entries(vars).map(([k, v]) => `${k} = ${JSON.stringify(v)}`), ""].join("\n");
  writeFileSync(
    join(dir, WRANGLER.auth),
    varsBlock({ RP_ID: "example.com", EXPECTED_ORIGIN: "https://example.com" }),
  );
  writeFileSync(join(dir, WRANGLER.relay), varsBlock(relayVars));
  return dir;
};

describe("checkOperatorVarMirrors", () => {
  it("reports zero drift on the checked-in operator config", () => {
    const result = checkOperatorVarMirrors(ROOT);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("flags a relay MESH_MODE that drifted from [mesh].mode", () => {
    const dir = writeFixture({
      relayVars: {
        MESH_MODE: "federated",
        MESH_PEER_RELAYS: "",
        MESH_ALLOWED_REMOTE_DIDS: "",
      },
    });
    try {
      const errors = checkOperatorVarMirrors(dir).errors.join("\n");
      expect(errors).toMatch(/mesh-mode: MIRROR DRIFT/);
      expect(errors).toContain("standalone");
      expect(errors).toContain("federated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags a governed var the authored TOML projects but the worker omits", () => {
    const dir = writeFixture({
      relayVars: { MESH_PEER_RELAYS: "", MESH_ALLOWED_REMOTE_DIDS: "" },
    });
    try {
      const errors = checkOperatorVarMirrors(dir).errors.join("\n");
      expect(errors).toMatch(/mesh-mode: .*MESH_MODE has no value for this governed datum/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts a fixture tree where every site agrees, empty lists included", () => {
    const dir = writeFixture({
      relayVars: {
        MESH_MODE: "standalone",
        MESH_PEER_RELAYS: "",
        MESH_ALLOWED_REMOTE_DIDS: "",
      },
    });
    try {
      expect(checkOperatorVarMirrors(dir).errors).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
