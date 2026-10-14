import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkWorkersUrlMirrors } from "../lib/workers-url-mirrors.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TOML_FIXTURE = `[pod]
base_url = "https://dreamlab-pod-api.example.workers.dev"

[relay]
url = "wss://dreamlab-nostr-relay.example.workers.dev"
`;

const WORKERS_RS_FIXTURE = `pub mod deployed_urls {
    pub const POD_WORKER: &str = "https://dreamlab-pod-api.example.workers.dev";
    pub const RELAY_WORKER: &str = "wss://dreamlab-nostr-relay.example.workers.dev";
}
`;

function makeFixture(files) {
  const root = mkdtempSync(join(tmpdir(), "workers-url-mirrors-"));
  for (const [rel, contents] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
  return root;
}

describe("checkWorkersUrlMirrors", () => {
  it("real repo: workers.rs URL constants agree with dreamlab.toml", () => {
    const result = checkWorkersUrlMirrors(REPO_ROOT);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("flags drift between the authored TOML URL and the Rust constant", () => {
    const root = makeFixture({
      "forum-config/dreamlab.toml": TOML_FIXTURE,
      "forum-config/src/workers.rs": WORKERS_RS_FIXTURE.replace(
        "https://dreamlab-pod-api.example.workers.dev",
        "https://stale-pod.example.workers.dev",
      ),
    });
    try {
      const result = checkWorkersUrlMirrors(root);
      expect(result.ok).toBe(false);
      const drift = result.errors.filter((e) => e.includes("MIRROR DRIFT"));
      expect(drift).toHaveLength(1);
      expect(drift[0]).toContain("pod-base-url");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when a mirror site is missing", () => {
    const root = makeFixture({ "forum-config/dreamlab.toml": TOML_FIXTURE });
    try {
      const result = checkWorkersUrlMirrors(root);
      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(["forum-config/src/workers.rs missing"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
