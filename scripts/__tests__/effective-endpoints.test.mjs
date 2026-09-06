// Tests for effective-endpoint validation (ADR-2002 / ADR-2003).
//
// The gate must catch a surface that reads a variable it is never given, in
// EITHER dialect: Vite build variables (React, baked at build time) and
// window.__ENV__ injection (forum and BBS, read at runtime). Each case removes
// or corrupts one supply and asserts the failure names the affected surface.

import { afterAll, describe, expect, it } from "vitest";
import {
  checkEffectiveEndpoints,
  collectViteReads,
  parseEnvInjection,
  parseStepEnv,
  parseWorkflowEnv,
  resolveInjectedValue,
} from "../lib/effective-endpoints.mjs";
import { REPO_ROOT, cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

const fixture = (mutate) =>
  makeFixtureRepo((r) => {
    r.copySrc(); // the React read-set is derived from real source
    mutate?.(r);
  });

const expectFailure = (result, needle) => {
  expect(result.ok).toBe(false);
  const joined = result.errors.join("\n");
  expect(joined, `errors were:\n${joined}`).toContain(needle);
};

describe("parsers", () => {
  it("reads a quoted workflow env value without swallowing a trailing comment", () => {
    const env = parseWorkflowEnv(
      ["env:", "  A: 'value'  # a trailing note", "  B: plain", "jobs:"].join("\n"),
    );
    expect(env.get("A")).toBe("value");
    expect(env.get("B")).toBe("plain");
  });

  it("stops at the end of the env block", () => {
    const env = parseWorkflowEnv(["env:", "  A: '1'", "jobs:", "  x:", "    B: '2'"].join("\n"));
    expect(env.has("A")).toBe(true);
    expect(env.has("B")).toBe(false);
  });

  it("reads a step's own env mapping", () => {
    const step = parseStepEnv(
      ["      - name: Build it", "        run: npm run build", "        env:", "          X: 'y'"].join(
        "\n",
      ),
      "Build it",
    );
    expect(step.get("X")).toBe("'y'");
  });

  it("resolves shell interpolation against the workflow env", () => {
    const env = new Map([["VITE_RELAY_URL", "wss://relay.example"]]);
    expect(resolveInjectedValue(`"'"$VITE_RELAY_URL"'"`, env).value).toBe("wss://relay.example");
    expect(resolveInjectedValue(`"'"$MISSING"'"`, env).refs).toEqual(["MISSING"]);
  });

  it("splits an injection payload without breaking on JSON commas", () => {
    const { entries } = parseEnvInjection(
      `          ENV_SCRIPT='<script>window.__ENV__={A:"1",Z:[{"a":1,"b":2}],B:"2"};</script>'`,
      "ENV_SCRIPT=",
    );
    expect([...entries.keys()]).toEqual(["A", "Z", "B"]);
    expect(entries.get("Z")).toBe('[{"a":1,"b":2}]');
  });

  it("collects the VITE_* names the React source actually reads", () => {
    const reads = collectViteReads(REPO_ROOT);
    expect([...reads.keys()]).toContain("VITE_JARVIS_PUBKEY");
    expect([...reads.get("VITE_JARVIS_PUBKEY")]).toContain("src/components/AIChatFab.tsx");
  });
});

describe("the live deploy workflow", () => {
  const result = checkEffectiveEndpoints(REPO_ROOT);

  it("validates as shipped", () => {
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("supplies every VITE_* variable the React bundle reads", () => {
    const { supplied, reads } = result.surfaces.react;
    for (const key of reads) expect(Object.keys(supplied)).toContain(key);
  });

  it("resolves both __ENV__ dialects to real endpoints", () => {
    // The forum reads VITE_*-named keys; the BBS reads un-prefixed ones. A
    // rename on either side breaks only that surface, which is why both are
    // asserted explicitly.
    expect(result.surfaces.forum.resolved.VITE_RELAY_URL).toMatch(/^wss:\/\//);
    expect(result.surfaces.bbs.resolved.RELAY_URL).toMatch(/^wss:\/\//);
    expect(result.surfaces.bbs.resolved.POD_API).toMatch(/^https:\/\//);
    expect(result.surfaces.bbs.resolved.JARVIS_PUBKEY).toMatch(/^[0-9a-f]{64}$/);
  });

  it("treats build-time shell locals as defined", () => {
    // BUILD_HASH/BUILD_VERSION are assigned in the injecting run block, not in
    // the workflow env; flagging them would be a false positive.
    expect(result.surfaces.forum.resolved.BUILD_HASH).toContain("runtime:");
  });
});

describe("broken endpoint configuration is rejected", () => {
  it("rejects a VITE_* variable the React build step never supplies", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t
          .replace(/^\s*VITE_JARVIS_PUBKEY: \$\{\{ env\.VITE_JARVIS_PUBKEY \}\}\n/m, "")
          .replace(/^  VITE_JARVIS_PUBKEY: '[0-9a-f]+'.*\n/m, ""),
      );
    });
    expectFailure(
      checkEffectiveEndpoints(root),
      "React reads import.meta.env.VITE_JARVIS_PUBKEY",
    );
  });

  it("rejects a relay URL that is not an absolute wss:// endpoint", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(
          /^  VITE_RELAY_URL: '[^']+'$/m,
          "  VITE_RELAY_URL: 'dreamlab-nostr-relay.workers.dev'",
        ),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "is not an absolute wss:// URL");
  });

  it("rejects an API base that is not an absolute https:// endpoint", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/^  VITE_POD_API_URL: '[^']+'$/m, "  VITE_POD_API_URL: '/api/pods'"),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "is not an absolute https:// URL");
  });

  it("rejects a malformed agent pubkey reaching the BBS", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/^  VITE_JARVIS_PUBKEY: '[0-9a-f]+'/m, "  VITE_JARVIS_PUBKEY: 'not-a-pubkey'"),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "is not a 64-hex x-only pubkey");
  });

  it("rejects an __ENV__ key interpolating an undefined variable", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace('RELAY_URL:"\'"$VITE_RELAY_URL"\'"', 'RELAY_URL:"\'"$VITE_RELAY_URL_TYPO"\'"'),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "$VITE_RELAY_URL_TYPO");
  });

  it("rejects a BBS injection missing a required key", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/SEARCH_API:"'"\$VITE_SEARCH_API_URL"'",/, ""),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "bbs __ENV__ is missing required key SEARCH_API");
  });

  it("rejects a ZONE_CONFIG that is not valid JSON", () => {
    const root = fixture((r) => {
      r.edit(".github/workflows/deploy.yml", (t) =>
        t.replace(/^  ZONE_CONFIG_JSON: '\[/m, "  ZONE_CONFIG_JSON: '[{,"),
      );
    });
    expectFailure(checkEffectiveEndpoints(root), "ZONE_CONFIG is not valid JSON");
  });
});
