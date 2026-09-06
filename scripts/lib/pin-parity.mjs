// Shared pin-parity logic (ADR-2004).
//
// SINGLE SOURCE for the dual-pin invariant. Both consumers import from here:
//   - the GitHub guard   .github/workflows/ci.yml  (job `pin-check`)
//   - the local check    scripts/pin-parity-check.sh (dream-cycle evaluator)
// There is deliberately no second copy of this logic anywhere in the repo; the
// two-independent-implementations posture is exactly what let the requirement
// strings drift away from the resolved lockfile without CI noticing.
//
// What the invariant now covers (superset of the pre-2026-09-05 behaviour):
//   1. KIT_REF is byte-identical across deploy / workers-deploy / rust-ci.
//   2. KIT_REF equals CANONICAL_KIT_SHA in the compatibility record.
//   3. Every kit crate in forum-config/Cargo.toml is pinned EXACTLY (`=x.y.z`),
//      not by a floating requirement range.
//   4. The EXACT RESOLVED version in forum-config/Cargo.lock equals both the
//      manifest pin and CANONICAL_KIT_VERSION.
//   5. The registry CHECKSUM of every resolved kit crate equals the checksum
//      recorded in the compatibility record.
//   6. The crate set is identical across manifest, lockfile and record — a crate
//      added to one and forgotten in another is drift, not a silent pass.
//
// Every function here is pure over an explicit `root`, so the tests drive it
// against fixture trees rather than mutating the live repo.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Workflows that must all carry the identical KIT_REF. */
export const PIN_SITES = [
  ".github/workflows/deploy.yml",
  ".github/workflows/workers-deploy.yml",
  ".github/workflows/rust-ci.yml",
];

/** The upstream kit crates consumed from crates.io by the operator overlay. */
export const KIT_CRATES = [
  "nostr-bbs-core",
  "nostr-bbs-config",
  "nostr-bbs-mesh",
  "nostr-bbs-rate-limit",
];

export const MANIFEST_PATH = "forum-config/Cargo.toml";
export const LOCKFILE_PATH = "forum-config/Cargo.lock";
export const RECORD_PATH = "docs/architecture/kit-compatibility-record.md";

const read = (root, rel) => {
  const path = join(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
};

/**
 * Extract the `KIT_REF: '<sha>'` value from a workflow file.
 * Returns null when the file or the key is absent.
 */
export function parseKitRef(text) {
  if (!text) return null;
  const m = text.match(/^\s*KIT_REF:\s*'([0-9a-f]+)'\s*$/m);
  return m ? m[1] : null;
}

/**
 * Parse the kit crate requirement strings from forum-config/Cargo.toml.
 * Returns a Map<crate, requirement> — the raw requirement, uninterpreted, so
 * the caller can reject a non-exact form rather than silently accepting it.
 */
export function parseManifestRequirements(text) {
  const out = new Map();
  if (!text) return out;
  for (const crate of KIT_CRATES) {
    const re = new RegExp(`^\\s*${crate}\\s*=\\s*"([^"]+)"\\s*$`, "m");
    const m = text.match(re);
    if (m) out.set(crate, m[1]);
  }
  return out;
}

/**
 * Parse the EXACT resolved version + registry checksum of each kit crate from
 * forum-config/Cargo.lock. This is the fact the old check never looked at: a
 * requirement range says what is *allowed*, the lockfile says what is *built*.
 */
export function parseLockfileResolved(text) {
  const out = new Map();
  if (!text) return out;
  // Cargo.lock is a sequence of [[package]] tables. Split on the table header
  // and read the fields of each block rather than regexing across the file,
  // so a `dependencies` list naming another crate cannot be misread as a package.
  const blocks = text.split(/^\[\[package\]\]\s*$/m).slice(1);
  for (const block of blocks) {
    const name = block.match(/^\s*name\s*=\s*"([^"]+)"\s*$/m)?.[1];
    if (!name || !KIT_CRATES.includes(name)) continue;
    const version = block.match(/^\s*version\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    const checksum = block.match(/^\s*checksum\s*=\s*"([0-9a-f]{64})"\s*$/m)?.[1] ?? null;
    const source = block.match(/^\s*source\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
    out.set(name, { version, checksum, source });
  }
  return out;
}

/**
 * Parse the machine-readable fields of the compatibility record:
 *   CANONICAL_KIT_SHA / CANONICAL_KIT_VERSION, and the per-crate
 *   `RESOLVED <crate> <version> <sha256>` lines under pin-check:resolved-packages.
 */
export function parseRecord(text) {
  const out = { sha: null, version: null, resolved: new Map() };
  if (!text) return out;
  out.sha = text.match(/^CANONICAL_KIT_SHA=([0-9a-f]+)\s*$/m)?.[1] ?? null;
  out.version = text.match(/^CANONICAL_KIT_VERSION=(.+?)\s*$/m)?.[1] ?? null;
  const re = /^RESOLVED\s+(\S+)\s+(\S+)\s+([0-9a-f]{64})\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.resolved.set(m[1], { version: m[2], checksum: m[3] });
  }
  return out;
}

/**
 * Run the full dual-pin invariant against a repository root.
 * Returns { ok, errors: string[], summary: string[] } — never throws for a
 * drift condition, so callers can render every problem at once.
 */
export function checkKitPins(root) {
  const errors = [];
  const summary = [];

  // ── 1/2. KIT_REF lockstep across the three workflows ───────────────────────
  const refs = new Map();
  for (const site of PIN_SITES) {
    const text = read(root, site);
    if (text === null) {
      errors.push(`pin site missing: ${site}`);
      continue;
    }
    const ref = parseKitRef(text);
    if (!ref) errors.push(`no KIT_REF found in ${site}`);
    refs.set(site, ref);
  }
  const distinct = new Set([...refs.values()].filter(Boolean));
  if (distinct.size > 1) {
    errors.push(
      `KIT_REF differs across pin sites: ` +
        [...refs].map(([s, r]) => `${s}=${r ?? "<missing>"}`).join(" "),
    );
  }
  const kitRef = distinct.size === 1 ? [...distinct][0] : null;
  if (kitRef) summary.push(`KIT_REF ${kitRef} identical across ${PIN_SITES.length} pin sites`);

  // ── Record ────────────────────────────────────────────────────────────────
  const recordText = read(root, RECORD_PATH);
  if (recordText === null) errors.push(`compatibility record missing: ${RECORD_PATH}`);
  const record = parseRecord(recordText);
  if (recordText !== null) {
    if (!record.sha) errors.push(`no CANONICAL_KIT_SHA in ${RECORD_PATH}`);
    if (!record.version) errors.push(`no CANONICAL_KIT_VERSION in ${RECORD_PATH}`);
    if (kitRef && record.sha && record.sha !== kitRef) {
      errors.push(`record CANONICAL_KIT_SHA ${record.sha} != KIT_REF ${kitRef}`);
    }
  }

  // ── 3. Manifest pins must be EXACT, not a floating requirement range ───────
  const manifestText = read(root, MANIFEST_PATH);
  if (manifestText === null) errors.push(`manifest missing: ${MANIFEST_PATH}`);
  const reqs = parseManifestRequirements(manifestText);
  for (const crate of KIT_CRATES) {
    if (!reqs.has(crate)) errors.push(`${MANIFEST_PATH}: no requirement for ${crate}`);
  }
  const exactPins = new Map();
  for (const [crate, req] of reqs) {
    if (!req.startsWith("=")) {
      errors.push(
        `${MANIFEST_PATH}: ${crate} = "${req}" is a floating requirement range; ` +
          `the kit pin must be exact (=${req.replace(/^[\^~><= ]+/, "")})`,
      );
      continue;
    }
    exactPins.set(crate, req.slice(1).trim());
  }
  const pinVersions = new Set(exactPins.values());
  if (pinVersions.size > 1) {
    errors.push(
      `${MANIFEST_PATH}: kit crate pins disagree: ` +
        [...exactPins].map(([c, v]) => `${c}=${v}`).join(" "),
    );
  }

  // ── 4/5/6. Lockfile is the authority on what is actually built ─────────────
  const lockText = read(root, LOCKFILE_PATH);
  if (lockText === null) errors.push(`lockfile missing: ${LOCKFILE_PATH}`);
  const resolved = parseLockfileResolved(lockText);

  for (const crate of KIT_CRATES) {
    const lock = resolved.get(crate);
    if (!lock) {
      errors.push(`${LOCKFILE_PATH}: ${crate} is not resolved in the lockfile`);
      continue;
    }
    if (!lock.version) {
      errors.push(`${LOCKFILE_PATH}: ${crate} has no resolved version`);
      continue;
    }
    if (!lock.checksum) {
      // A registry crate always carries a checksum; its absence means the crate
      // was swapped to a path/git source, which the exact-version pin cannot see.
      errors.push(
        `${LOCKFILE_PATH}: ${crate} has no registry checksum ` +
          `(source=${lock.source ?? "<none>"}) — a non-registry source cannot be pin-verified`,
      );
    }
    const pin = exactPins.get(crate);
    if (pin && pin !== lock.version) {
      errors.push(
        `${crate}: manifest pins =${pin} but ${LOCKFILE_PATH} resolves ${lock.version}`,
      );
    }
    if (record.version && lock.version !== record.version) {
      errors.push(
        `${crate}: lockfile resolves ${lock.version} but CANONICAL_KIT_VERSION is ${record.version}`,
      );
    }
    const rec = record.resolved.get(crate);
    if (!rec) {
      errors.push(
        `${RECORD_PATH}: no RESOLVED line for ${crate} — every resolved kit crate must be recorded`,
      );
      continue;
    }
    if (rec.version !== lock.version) {
      errors.push(
        `${crate}: record RESOLVED version ${rec.version} != lockfile ${lock.version}`,
      );
    }
    if (lock.checksum && rec.checksum !== lock.checksum) {
      errors.push(
        `${crate}: record checksum ${rec.checksum} != lockfile checksum ${lock.checksum}`,
      );
    }
  }
  // A record line for a crate no longer consumed is stale drift in the other
  // direction — the record must describe exactly the crate set that is built.
  for (const crate of record.resolved.keys()) {
    if (!KIT_CRATES.includes(crate)) {
      errors.push(`${RECORD_PATH}: RESOLVED line for unknown crate ${crate}`);
    }
  }

  if (errors.length === 0) {
    summary.push(
      `${KIT_CRATES.length} kit crates pinned exactly at ${record.version} ` +
        `with registry checksums matching the compatibility record`,
    );
  }
  return { ok: errors.length === 0, errors, summary, kitRef, version: record.version };
}

// ── Action pinning (ADR-2002/2003 supply-chain invariant) ────────────────────

/** Actions referenced by a local path (`./.github/...`) are not SHA-pinnable. */
const isLocalUses = (ref) => ref.startsWith("./") || ref.startsWith("docker://");

/**
 * Find every `uses:` in a workflow that is NOT pinned to a full 40-hex commit
 * SHA. A mutable tag (`@v4`) can be re-pointed by the action's owner at any
 * time, so a privileged job would execute code the repo never reviewed.
 */
export function findTagPinnedUses(text, file) {
  const findings = [];
  if (!text) return findings;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(?:-\s+)?uses:\s*(\S+)/);
    if (!m) return;
    const ref = m[1].replace(/^["']|["']$/g, "");
    if (isLocalUses(ref)) return;
    const at = ref.lastIndexOf("@");
    if (at === -1) {
      findings.push({ file, line: i + 1, ref, reason: "no version reference at all" });
      return;
    }
    const version = ref.slice(at + 1);
    if (!/^[0-9a-f]{40}$/.test(version)) {
      findings.push({ file, line: i + 1, ref, reason: `pinned to mutable ref '${version}'` });
    }
  });
  return findings;
}

/** All workflow files under .github/workflows in `root`. */
export function workflowFiles(root) {
  const dir = join(root, ".github/workflows");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort()
    .map((f) => `.github/workflows/${f}`);
}

/**
 * Check every workflow in the repo for tag-pinned action uses.
 * Returns { ok, findings, checked }.
 */
export function checkActionPins(root) {
  const files = workflowFiles(root);
  const findings = [];
  for (const file of files) {
    findings.push(...findTagPinnedUses(read(root, file), file));
  }
  return { ok: findings.length === 0, findings, checked: files };
}
