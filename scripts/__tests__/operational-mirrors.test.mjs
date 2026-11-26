// Tests for the operational mirror check (audit 2026-11-26 C-2..C-5).
//
// The v2 cutover (PRs #105-#107) moved the forum to -v2 workers, new D1/R2/KV
// resources and a new admin key, but seven operational surfaces outside the
// enumerated mirror set stayed on v1 and every CI gate stayed green. Each case
// below puts ONE surface back on a v1 value, or breaks one invariant, and asserts
// the check catches it.

import { afterAll, describe, expect, it } from "vitest";
import { checkOperationalMirrors } from "../lib/config-mirrors.mjs";
import { cleanupFixtureRepos, makeFixtureRepo } from "./helpers/fixture-repo.mjs";

afterAll(cleanupFixtureRepos);

const V1_RELAY = "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev";
const V2_RELAY = "wss://dreamlab-nostr-relay-v2.solitary-paper-764d.workers.dev";
const V1_ADMIN = "11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c";
const V2_ADMIN = "bfcf20d472f0fb143b23cb5be3fa0a040d42176b71f73ca272f6912b1d62a452";

const expectDrift = (root, needle) => {
  const result = checkOperationalMirrors(root);
  const joined = result.errors.join("\n");
  expect(result.ok, `expected drift containing ${needle}`).toBe(false);
  expect(joined, `errors were:\n${joined}`).toContain(needle);
};

describe("checkOperationalMirrors on the shipped tree", () => {
  it("passes", () => {
    const result = checkOperationalMirrors(makeFixtureRepo());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("C-3: inbox-watch defaults", () => {
  it("catches the relay default left on v1", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/inbox-watch/run.mjs", `"${V2_RELAY}"`, `"${V1_RELAY}"`),
    );
    expectDrift(root, "inbox-watch-relay");
  });
  it("catches the admin default left on the retired key", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/inbox-watch/run.mjs", `"${V2_ADMIN}"`, `"${V1_ADMIN}"`),
    );
    expectDrift(root, "inbox-watch-admin");
  });
  it("fails closed when the default can no longer be found", () => {
    const root = makeFixtureRepo((r) =>
      r.edit("scripts/inbox-watch/run.mjs", (t) => t.replace(/const RELAY = [^\n]+\n/, "")),
    );
    expectDrift(root, "inbox-watch-relay");
  });
});

describe("C-4: contact embed defaults", () => {
  it("catches the relay left on v1", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/contact-embed/entry.ts", `"${V2_RELAY}"`, `"${V1_RELAY}"`),
    );
    expectDrift(root, "contact-embed-relay");
  });
  it("catches the admin recipient left on the retired key", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/contact-embed/entry.ts", `"${V2_ADMIN}"`, `"${V1_ADMIN}"`),
    );
    expectDrift(root, "contact-embed-admin");
  });
});

describe("C-2: backup resource set", () => {
  it("catches a v1 D1 id", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce(
        "scripts/backup/forum-backup.sh",
        "eb33cf2f-44db-433c-9771-6db850d8b64c",
        "97c77d23-0e24-4325-ada7-1747eab4095b",
      ),
    );
    expectDrift(root, "backup-resources");
  });
  it("catches ADMIN_KV dropped from the backup", () => {
    const root = makeFixtureRepo((r) =>
      r.edit("scripts/backup/forum-backup.sh", (t) =>
        t.replace(/^\s*\[admin-kv\]="36c5f8d2157b4b3e8ef53c47c7fb68f1"\n/m, ""),
      ),
    );
    expectDrift(root, "36c5f8d2157b4b3e8ef53c47c7fb68f1");
  });
  it("catches a v1 R2 bucket", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/backup/forum-backup.sh", "R2_BUCKETS=(dreamlab-pods-v2)", "R2_BUCKETS=(dreamlab-pods)"),
    );
    expectDrift(root, "backup-resources");
  });
  it("catches a new data binding added to a worker but not to the backup", () => {
    const root = makeFixtureRepo((r) =>
      r.edit("forum-config/deploy/pod-worker.wrangler.toml", (t) =>
        t.replace(
          "[[kv_namespaces]]\nbinding = \"POD_META\"",
          "[[kv_namespaces]]\nbinding = \"NEW_STATE\"\nid = \"0123456789abcdef0123456789abcdef\"\n\n[[kv_namespaces]]\nbinding = \"POD_META\"",
        ),
      ),
    );
    expectDrift(root, "0123456789abcdef0123456789abcdef");
  });
  it("catches the crontab losing its timeout", () => {
    const root = makeFixtureRepo((r) =>
      r.replaceOnce("scripts/backup/crontab", "* * * timeout -k 60 7200 ", "* * * "),
    );
    expectDrift(root, "backup-crontab");
  });
});

describe("C-5: workflow worker targets", () => {
  it("catches a v1 worker name in set-worker-secrets.yml", () => {
    const root = makeFixtureRepo((r) =>
      r.edit(".github/workflows/set-worker-secrets.yml", (t) =>
        t.replace("AUTH_WORKER: dreamlab-auth-api-v2", "AUTH_WORKER: dreamlab-auth-api"),
      ),
    );
    expectDrift(root, "dreamlab-auth-api");
  });
  it("catches a v1 health-check target in workers-deploy.yml", () => {
    const root = makeFixtureRepo((r) =>
      r.edit(".github/workflows/workers-deploy.yml", (t) =>
        t.replace("dreamlab-pod-api-v2 ", "dreamlab-pod-api "),
      ),
    );
    expectDrift(root, "dreamlab-pod-api");
  });
  it("catches relay-worker put back in the automated deploy matrix", () => {
    const root = makeFixtureRepo((r) =>
      r.edit(".github/workflows/workers-deploy.yml", (t) =>
        t.replace(
          "          - kit_crate: nostr-bbs-preview-worker\n",
          "          - kit_crate: nostr-bbs-relay-worker\n            config: relay-worker\n            worker_name: dreamlab-nostr-relay-v2\n          - kit_crate: nostr-bbs-preview-worker\n",
        ),
      ),
    );
    expectDrift(root, "relay-worker");
  });
  it("catches the unprovisioned search worker put in the deploy matrix", () => {
    const root = makeFixtureRepo((r) =>
      r.edit(".github/workflows/workers-deploy.yml", (t) =>
        t.replace(
          "          - kit_crate: nostr-bbs-preview-worker\n",
          "          - kit_crate: nostr-bbs-search-worker\n            config: search-worker\n            worker_name: dreamlab-search-api-v2\n          - kit_crate: nostr-bbs-preview-worker\n",
        ),
      ),
    );
    expectDrift(root, "search-worker");
  });
});
