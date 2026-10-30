// Bench-enforced parity between the authored branding source of truth
// (forum-config/dreamlab.toml [branding]) and the programmatic overlay
// (forum-config/src/branding.rs dreamlab_branding()).
//
// Third leg of the branding mirror: PR #73 (2026-10-22) binds branding.rs to
// deploy.yml's BBS_* window.__ENV__ values, but nothing compares branding.rs
// with the authored TOML it claims to mirror - branding.rs's own unit test
// asserts hardcoded literals, so a dreamlab.toml-only edit ships silently.
// Lesson of 2026-10-09 (PR #58): a mirror no REQUIRED evaluator compares is
// not enforced; this file promotes [branding] parity into bench.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { TOML_PATH } from "../lib/config-mirrors.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANDING_RS = join("forum-config", "src", "branding.rs");

// tagline is authored in [branding] but has no site in the kit's Branding
// schema (kit HANDOFF, 2026-10-14), so it is deliberately compared nowhere.
const KEYS = ["theme", "node_name", "location", "banner_url", "logo_url", "welcome_copy"];

/** Slice one [section] out of a TOML document; any later [ or [[ header ends it. */
function tomlSection(text, name) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `[${name}]`);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && /^\s*\[/.test(l));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

/** Line-ending backslash: a backslash plus all following whitespace is removed. */
const unescapeContinuations = (raw) => raw.replace(/\\\s+/g, "");

/** Read the authored [branding] table from a repo root. */
function readTomlBranding(root) {
  const text = readFileSync(join(root, TOML_PATH), "utf8");
  const section = tomlSection(text, "branding");
  if (section === null) throw new Error(`${TOML_PATH} has no [branding] section`);
  const simple = new Map();
  for (const line of section.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/);
    if (m) simple.set(m[1], m[2]);
  }
  const multi = section.match(/welcome_copy\s*=\s*"""([\s\S]*?)"""/);
  return {
    theme: simple.get("theme"),
    node_name: simple.get("node_name"),
    location: simple.get("location"),
    banner_url: simple.get("banner_url") ?? "",
    logo_url: simple.get("logo_url"),
    welcome_copy: multi === null ? undefined : unescapeContinuations(multi[1]).replace(/^\n/, ""),
  };
}

/** Read dreamlab_branding()'s literal values out of branding.rs (None becomes ""). */
function readRsBranding(root) {
  const text = readFileSync(join(root, BRANDING_RS), "utf8");
  const start = text.indexOf("pub fn dreamlab_branding");
  if (start === -1) throw new Error(`${BRANDING_RS} has no dreamlab_branding()`);
  const end = text.indexOf("pub fn dreamlab_zone_names");
  const body = text.slice(start, end === -1 ? undefined : end);
  const some = (key) => body.match(new RegExp(`${key}:\\s*Some\\(\\s*"([^"]*)"`))?.[1] ?? null;
  return {
    theme: some("theme"),
    node_name: some("node_name"),
    location: some("location"),
    banner_url: /banner_url:\s*None/.test(body) ? "" : some("banner_url"),
    logo_url: some("logo_url"),
    welcome_copy: some("welcome_copy") === null ? null : unescapeContinuations(some("welcome_copy")),
  };
}

/** Compare the two sites; one error line per drifted key. */
function compareBranding(root) {
  const toml = readTomlBranding(root);
  const rs = readRsBranding(root);
  const errors = [];
  for (const key of KEYS) {
    if (toml[key] !== rs[key]) {
      errors.push(
        `toml-branding: MIRROR DRIFT - ${TOML_PATH} [branding].${key} is ${JSON.stringify(toml[key])} ` +
          `but ${BRANDING_RS} dreamlab_branding() carries ${JSON.stringify(rs[key])}`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Temp-tree fixture: the checked-in pair, each side optionally edited alone. */
function writeFixture({ tomlEdits = (t) => t, rsEdits = (t) => t } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "toml-branding-mirrors-"));
  mkdirSync(join(dir, dirname(TOML_PATH)), { recursive: true });
  mkdirSync(join(dir, dirname(BRANDING_RS)), { recursive: true });
  writeFileSync(join(dir, TOML_PATH), tomlEdits(readFileSync(join(ROOT, TOML_PATH), "utf8")));
  writeFileSync(join(dir, BRANDING_RS), rsEdits(readFileSync(join(ROOT, BRANDING_RS), "utf8")));
  return dir;
}

describe("toml-branding-mirrors", () => {
  it("reports zero drift on the checked-in operator config", () => {
    const result = compareBranding(ROOT);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("normalises TOML and Rust line continuations to the same welcome copy", () => {
    const expected =
      "Welcome to the DreamLab AI Community Forum — a private space for trainers, builders, and the curious.";
    expect(readTomlBranding(ROOT).welcome_copy).toBe(expected);
    expect(readRsBranding(ROOT).welcome_copy).toBe(expected);
  });

  it("flags a dreamlab.toml node_name edit that branding.rs missed", () => {
    const dir = writeFixture({ tomlEdits: (t) => t.replace("MINIMOONOIR", "DREAMLAB BBS") });
    try {
      const errors = compareBranding(dir).errors.join("\n");
      expect(errors).toMatch(/toml-branding: MIRROR DRIFT - .*node_name/);
      expect(errors).toContain("DREAMLAB BBS");
      expect(errors).toContain("MINIMOONOIR");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags a branding.rs location edit that dreamlab.toml missed", () => {
    const dir = writeFixture({
      rsEdits: (t) =>
        t.replace('location: Some("Lake District, UK".into())', 'location: Some("Cumbria, UK".into())'),
    });
    try {
      const errors = compareBranding(dir).errors.join("\n");
      expect(errors).toMatch(/toml-branding: MIRROR DRIFT - .*location/);
      expect(errors).toContain("Cumbria, UK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags banner_url set on the overlay side while the TOML authors empty", () => {
    const dir = writeFixture({
      rsEdits: (t) => t.replace("banner_url: None,", 'banner_url: Some("/banner.txt".into()),'),
    });
    try {
      const errors = compareBranding(dir).errors.join("\n");
      expect(errors).toMatch(/toml-branding: MIRROR DRIFT - .*banner_url/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
