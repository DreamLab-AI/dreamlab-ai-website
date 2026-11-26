// Bench-enforced parity for the operator var mirrors that checkConfigMirrors
// does not enumerate (checkOperatorVarMirrors in scripts/lib/config-mirrors.mjs).
// Lesson of 2026-10-09 (PR #58): a mirror no REQUIRED evaluator compares is not
// enforced - this file promotes [webauthn] and [mesh] parity into bench.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require_text = (p) => readFileSync(p, "utf8");
import { DEPLOY_PATH, TOML_PATH, WRANGLER, checkOperatorVarMirrors } from "../lib/config-mirrors.mjs";
import { parseToml } from "../lib/toml-lite.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Minimal operator tree carrying the sections checkOperatorVarMirrors reads. */
const writeFixture = ({ relayVars, extraToml = [], deployEnv = null, previewVars = null }) => {
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
      ...extraToml,
    ].join("\n"),
  );
  if (deployEnv) {
    mkdirSync(join(dir, dirname(DEPLOY_PATH)), { recursive: true });
    writeFileSync(
      join(dir, DEPLOY_PATH),
      ["env:", ...Object.entries(deployEnv).map(([k, v]) => `  ${k}: '${v}'`), "jobs: {}", ""].join("\n"),
    );
  }
  const varsBlock = (vars) =>
    ["[vars]", ...Object.entries(vars).map(([k, v]) => `${k} = ${JSON.stringify(v)}`), ""].join("\n");
  writeFileSync(
    join(dir, WRANGLER.auth),
    varsBlock({ RP_ID: "example.com", EXPECTED_ORIGIN: "https://example.com" }),
  );
  writeFileSync(join(dir, WRANGLER.relay), varsBlock(relayVars));
  if (previewVars) writeFileSync(join(dir, WRANGLER.preview), varsBlock(previewVars));
  return dir;
};

describe("checkOperatorVarMirrors", () => {
  it("reports zero drift on the checked-in operator config", () => {
    const result = checkOperatorVarMirrors(ROOT);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  const quietRelay = { MESH_MODE: "standalone", MESH_PEER_RELAYS: "", MESH_ALLOWED_REMOTE_DIDS: "" };
  const previewErrors = (hosts, previewVars) => {
    const dir = writeFixture({
      relayVars: quietRelay,
      extraToml: hosts === null ? [] : ["[preview]", `allowed_hosts = ${JSON.stringify(hosts)}`],
      previewVars,
    });
    try {
      return checkOperatorVarMirrors(dir).errors.join("\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("the checked-in preview worker has a non-empty allow-list", () => {
    const vars = parseToml(readFileSync(join(ROOT, WRANGLER.preview), "utf8")).vars ?? {};
    expect(String(vars.PREVIEW_ALLOWED_HOSTS ?? "").trim()).not.toBe("");
  });

  it("accepts a preview allow-list that matches the worker var in any order", () => {
    expect(
      previewErrors(["youtube.com", "bbc.co.uk"], { PREVIEW_ALLOWED_HOSTS: "bbc.co.uk, youtube.com" }),
    ).toBe("");
  });

  it("flags a preview allow-list that drifted from the worker var", () => {
    const errors = previewErrors(["youtube.com", "bbc.co.uk"], { PREVIEW_ALLOWED_HOSTS: "youtube.com" });
    expect(errors).toMatch(/preview-allowed-hosts: MIRROR DRIFT/);
    expect(errors).toContain("bbc.co.uk");
  });

  it("flags a preview allow-list present on one side only", () => {
    expect(previewErrors(["youtube.com"], { ALLOWED_ORIGIN: "https://example.com" })).toMatch(
      /preview-allowed-hosts: .* has no value/,
    );
    expect(previewErrors(null, { PREVIEW_ALLOWED_HOSTS: "youtube.com" })).toMatch(
      /preview-allowed-hosts: .* has no value/,
    );
  });

  it("refuses preview entries that are not bare hostnames", () => {
    for (const bad of ["https://github.com", "github.com/x", "*.github.com", "GitHub.com", "com", "10.0.0.1", "a.com:443"]) {
      expect(previewErrors([bad], { PREVIEW_ALLOWED_HOSTS: bad })).toMatch(/not a bare\s+lower-case hostname/);
    }
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

  const AGREED_RELAY = { MESH_MODE: "standalone", MESH_PEER_RELAYS: "", MESH_ALLOWED_REMOTE_DIDS: "" };
  const POKER_TOML = [
    "[features]",
    "poker = true",
    "",
    "[poker]",
    "stakes_bb = [2, 10]",
    'bot_profile = "tag"',
    'citizens = { "sidestr:a" = "aa", "sidestr:b" = "bb" }',
    "",
  ];
  const POKER_JSON = '{"bot_profile":"tag","citizens":{"sidestr:b":"bb","sidestr:a":"aa"},"stakes_bb":[2,10]}';
  const withDir = (opts, fn) => {
    const dir = writeFixture(opts);
    try {
      return fn(checkOperatorVarMirrors(dir).errors.join("\n"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("flags a relay MESH_FEDERATED_KINDS with no authored [mesh].federated_kinds", () => {
    withDir(
      { relayVars: { ...AGREED_RELAY, MESH_FEDERATED_KINDS: "1059,1,31400" } },
      (errors) => expect(errors).toMatch(/mesh-federated-kinds: .*\[mesh\]\.federated_kinds has no value/),
    );
  });

  it("flags a federated kind present on one side only", () => {
    const dir = writeFixture({ relayVars: { ...AGREED_RELAY, MESH_FEDERATED_KINDS: "1,1059,31400" } });
    try {
      // Rewrite [mesh] with a different kind set.
      const path = join(dir, TOML_PATH);
      const text = require_text(path).replace("allowed_remote_dids = []", "allowed_remote_dids = []\nfederated_kinds = [1, 1059]");
      writeFileSync(path, text);
      const errors = checkOperatorVarMirrors(dir).errors.join("\n");
      expect(errors).toMatch(/mesh-federated-kinds: MIRROR DRIFT/);
      writeFileSync(path, text.replace("federated_kinds = [1, 1059]", "federated_kinds = [31400, 1, 1059]"));
      expect(checkOperatorVarMirrors(dir).errors).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts [poker] mirrored into POKER_CONFIG_JSON in any key order", () => {
    withDir(
      { relayVars: AGREED_RELAY, extraToml: POKER_TOML, deployEnv: { POKER: "on", POKER_CONFIG_JSON: POKER_JSON } },
      (errors) => expect(errors).toBe(""),
    );
  });

  it("flags a poker value changed on one side", () => {
    withDir(
      {
        relayVars: AGREED_RELAY,
        extraToml: POKER_TOML,
        deployEnv: { POKER: "on", POKER_CONFIG_JSON: POKER_JSON.replace('"bb"', '"cc"') },
      },
      (errors) => expect(errors).toMatch(/poker-config: MIRROR DRIFT/),
    );
  });

  it("flags POKER off while [features].poker is on, and a missing projection", () => {
    withDir(
      { relayVars: AGREED_RELAY, extraToml: POKER_TOML, deployEnv: { POKER: "off" } },
      (errors) => {
        expect(errors).toMatch(/poker-feature: MIRROR DRIFT/);
        expect(errors).toMatch(/poker-config: .*POKER_CONFIG_JSON has no value/);
      },
    );
  });
});
