// [nip05] -> auth-worker [vars] mirror (ADR-2005 hand-synced mirror set).
//
// dreamlab.toml [nip05] is the authored source of truth for NIP-05
// resolution; the auth-worker reads its projection from the
// NIP05_RESOLVER_MODE and POD_BASE_URL [vars] in
// forum-config/deploy/auth-worker.wrangler.toml (per the [nip05] header
// comment, live as of NRF 1fe95fd / ADR-086 s9). Neither key is enumerated
// in scripts/lib/config-mirrors.mjs - NIP05_RESOLVER_MODE is absent from
// MIRROR_BEARING_KEYS, so the unenumerated-key sweep cannot see it either -
// so an edit that updated the TOML and missed the wrangler var would ship
// silently. This test binds the two files together at bench time.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "vitest";

import { parseToml } from "../lib/toml-lite.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const toml = parseToml(readFileSync(join(root, "forum-config/dreamlab.toml"), "utf8"));
const authWranglerPath = join(root, "forum-config/deploy/auth-worker.wrangler.toml");
const auth = parseToml(readFileSync(authWranglerPath, "utf8"));

test("[nip05].resolver_mode mirrors auth-worker NIP05_RESOLVER_MODE", () => {
  // "federated" is live (NRF 1fe95fd); pinning the authored mode makes a
  // coordinated flip of both sites a visible, deliberate change.
  expect(toml.nip05?.resolver_mode).toBe("federated");
  expect(auth.vars?.NIP05_RESOLVER_MODE).toBe(toml.nip05?.resolver_mode);
});

test("[nip05].pod_base_url mirrors auth-worker POD_BASE_URL", () => {
  expect(toml.nip05?.pod_base_url).toBeDefined();
  expect(auth.vars?.POD_BASE_URL).toBe(toml.nip05?.pod_base_url);
});
