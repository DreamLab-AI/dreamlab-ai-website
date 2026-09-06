// Build a throwaway repository tree for the CI gate tests.
//
// The gates read real files at real paths, so testing them means giving them a
// real (tiny) repository. Each fixture starts as a copy of the LIVE repo's
// governed files, so a test that deliberately corrupts one pin is proving the
// check catches drift *against the actual shipped configuration* rather than
// against a hand-written mock that could quietly diverge from it.

import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Files a gate fixture needs, relative to the repo root. */
const FIXTURE_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/workers-deploy.yml",
  ".github/workflows/rust-ci.yml",
  ".github/workflows/test-and-lint.yml",
  ".github/workflows/docs-update.yml",
  ".github/workflows/kit-pin-guard.yml",
  ".github/workflows/set-worker-secrets.yml",
  "forum-config/Cargo.toml",
  "forum-config/Cargo.lock",
  "forum-config/dreamlab.toml",
  "forum-config/deploy/auth-worker.wrangler.toml",
  "forum-config/deploy/pod-worker.wrangler.toml",
  "forum-config/deploy/preview-worker.wrangler.toml",
  "forum-config/deploy/relay-worker.wrangler.toml",
  "forum-config/deploy/search-worker.wrangler.toml",
  "docs/architecture/kit-compatibility-record.md",
];

const created = [];

/**
 * Copy the governed files into a temporary root and return its path.
 * `mutate` receives a small editor API for corrupting the copy.
 */
export function makeFixtureRepo(mutate) {
  const root = mkdtempSync(join(tmpdir(), "pin-fixture-"));
  created.push(root);
  for (const rel of FIXTURE_FILES) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(REPO_ROOT, rel), dest);
  }
  // The React source tree is only needed by the endpoint gate; copy it lazily
  // via `api.copySrc()` so pin/mirror fixtures stay cheap.
  const api = {
    root,
    read: (rel) => readFileSync(join(root, rel), "utf8"),
    write: (rel, text) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    },
    edit: (rel, fn) => api.write(rel, fn(api.read(rel))),
    /** Replace exactly once, asserting the target existed. */
    replaceOnce: (rel, find, replaceWith) => {
      const text = api.read(rel);
      if (!text.includes(find)) {
        throw new Error(`fixture ${rel} does not contain ${JSON.stringify(find)}`);
      }
      api.write(rel, text.replace(find, replaceWith));
    },
    copySrc: () => {
      cpSync(join(REPO_ROOT, "src"), join(root, "src"), { recursive: true });
    },
    remove: (rel) => rmSync(join(root, rel), { force: true }),
  };
  mutate?.(api);
  return root;
}

/** Remove every fixture tree created during the run. */
export function cleanupFixtureRepos() {
  while (created.length) {
    rmSync(created.pop(), { recursive: true, force: true });
  }
}
