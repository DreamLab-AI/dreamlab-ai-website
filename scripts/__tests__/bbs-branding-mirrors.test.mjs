// BBS branding mirror guard (operator-overlay: branding + deploy-config).
//
// `forum-config/src/branding.rs` (the overlay the forum client reads via
// build-time slots and the workers serve at /api/config/branding) and the
// BBS_* env block in `.github/workflows/deploy.yml` (projected into
// window.__ENV__ for the retro ASCII client at /community/bbs/) are both
// hand-synced projections of forum-config/dreamlab.toml [branding]; the
// single-source generator is deferred (ADR-037), so a one-sided edit ships
// two disagreeing brandings. Nothing bound the pair before; these tests do.
// The TOML third leg waits on dreamlab.toml being supplied to a night (the
// 2026-10-18 attempt was vetoed on a jsdom URL crash, not on parity; this
// file uses the fileURLToPath pattern the passing mirror tests use).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const brandingRs = readFileSync(join(REPO_ROOT, "forum-config/src/branding.rs"), "utf8");
const deployYml = readFileSync(join(REPO_ROOT, ".github/workflows/deploy.yml"), "utf8");

/** Captured value of the single branding.rs `field: Some("...".into())`. */
function overlayValue(field, re) {
  const m = brandingRs.match(re);
  if (!m) {
    throw new Error(`branding.rs: ${field} overlay value not found (extractor or overlay drifted)`);
  }
  return m[1];
}

/** Captured value of one quoted `BBS_*` entry in deploy.yml's env block. */
function bbsEnv(name, re) {
  const m = deployYml.match(re);
  if (!m) {
    throw new Error(`deploy.yml: env ${name} not found (workflow or extractor drifted)`);
  }
  return m[1];
}

const overlay = {
  theme: overlayValue("theme", /theme:\s*Some\("([^"\\]*)"\.into\(\)\)/),
  logoUrl: overlayValue("logo_url", /logo_url:\s*Some\("([^"\\]*)"\.into\(\)\)/),
  nodeName: overlayValue("node_name", /node_name:\s*Some\("([^"\\]*)"\.into\(\)\)/),
  location: overlayValue("location", /location:\s*Some\("([^"\\]*)"\.into\(\)\)/),
};

const bbs = {
  theme: bbsEnv("BBS_THEME", /^[ \t]*BBS_THEME:[ \t]*'([^']*)'/m),
  nodeName: bbsEnv("BBS_NODE_NAME", /^[ \t]*BBS_NODE_NAME:[ \t]*'([^']*)'/m),
  location: bbsEnv("BBS_LOCATION", /^[ \t]*BBS_LOCATION:[ \t]*'([^']*)'/m),
  bannerUrl: bbsEnv("BBS_BANNER_URL", /^[ \t]*BBS_BANNER_URL:[ \t]*'([^']*)'/m),
  logoUrl: bbsEnv("BBS_LOGO_URL", /^[ \t]*BBS_LOGO_URL:[ \t]*'([^']*)'/m),
};

describe("deploy.yml BBS_* branding mirrors branding.rs", () => {
  it("BBS_THEME equals the overlay theme", () => {
    expect(bbs.theme).toBe(overlay.theme);
  });

  it("BBS_NODE_NAME equals the overlay node_name", () => {
    expect(bbs.nodeName).toBe(overlay.nodeName);
  });

  it("BBS_LOCATION equals the overlay location", () => {
    expect(bbs.location).toBe(overlay.location);
  });

  it("BBS_BANNER_URL is empty exactly while banner_url is None", () => {
    // The overlay has `banner_url: None`; the BBS client treats '' as no
    // banner. If the overlay ever becomes Some(...), this seam needs a real
    // value here - fail loudly rather than diverge silently.
    expect(/^\s*banner_url:\s*None,/m.test(brandingRs)).toBe(true);
    expect(bbs.bannerUrl).toBe("");
  });

  it("BBS_LOGO_URL is the site-absolute form of the overlay logo_url", () => {
    // branding.rs serves the root-relative path; deploy.yml absolutises it
    // against the Pages origin (cname: dreamlab-ai.com, set lower in this
    // same workflow file).
    expect(bbs.logoUrl).toBe(`https://dreamlab-ai.com${overlay.logoUrl}`);
  });
});
