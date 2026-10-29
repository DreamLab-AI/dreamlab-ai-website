#!/usr/bin/env node
// Content-generator inventory (dream-cycle `content-generators` scan surface).
//
// Called by scripts/dream-content-generators.sh, which owns the header
// explaining why this surface needed a receipt at all.
//
// Every count here is re-derived from the generator's own inputs, so content
// changes never require editing this file — only a genuine source/artefact
// divergence fails it. That divergence is reachable in practice: both artefacts
// are committed to git but rebuilt by the `prebuild` hook, so editing a source
// and committing without regenerating leaves stale JSON on main.
//
// Emits CONTENT-GENERATORS-OK / CONTENT-GENERATORS-FAIL as the last line and
// exits 1 on FAIL.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (...p) => join(root, ...p);

const failures = [];
const lines = [];
const check = (ok, label, detail) => {
  lines.push(`${ok ? "  ok  " : "  FAIL"} ${label}: ${detail}`);
  if (!ok) failures.push(label);
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

// The generators the build actually depends on, read from package.json rather
// than hard-coded, so a generator added to prebuild is inventoried immediately.
const pkg = readJson(at("package.json"));
const prebuild = pkg.scripts?.prebuild ?? "";
const declared = [...prebuild.matchAll(/scripts\/([\w.-]+\.mjs)/g)].map((m) => m[1]);

lines.push(`prebuild declares ${declared.length} generator(s): ${declared.join(", ") || "none"}`);
check(declared.length > 0, "generators declared", `${declared.length} in package.json prebuild`);
for (const g of declared) {
  check(existsSync(at("scripts", g)), `generator present`, `scripts/${g}`);
}

// Dev/build parity: `predev` restates the same generator list so `npm run
// dev` serves the artefacts `prebuild` produces. A generator added to
// prebuild but not predev (or dropped from predev) leaves the dev server
// silently serving stale generated content while every receipt stays green —
// derive predev's list the same way and require the two sets to be equal.
const predev = pkg.scripts?.predev ?? "";
const declaredDev = [...predev.matchAll(/scripts\/([\w.-]+\.mjs)/g)].map((m) => m[1]);
check(
  declaredDev.length === declared.length && declared.every((g) => declaredDev.includes(g)),
  "predev mirrors prebuild generators",
  `prebuild=[${declared.join(", ")}] predev=[${declaredDev.join(", ")}]`,
);

// --- generate-workshop-list.mjs -------------------------------------------
// One list entry and one manifest.json per non-dot directory; each manifest's
// `pages` enumerate that directory's *.md files.
const workshopsDir = at("public", "data", "workshops");
if (existsSync(workshopsDir)) {
  const sourceDirs = readdirSync(workshopsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  const listPath = at("src", "data", "workshop-list.json");
  const list = existsSync(listPath) ? readJson(listPath) : null;
  check(Array.isArray(list), "workshop-list.json readable", listPath.replace(`${root}/`, ""));

  if (Array.isArray(list)) {
    const listIds = list.map((w) => w.id).sort();
    check(
      listIds.length === sourceDirs.length,
      "workshop count",
      `${sourceDirs.length} source dirs vs ${listIds.length} list entries`,
    );
    const missing = sourceDirs.filter((d) => !listIds.includes(d));
    const extra = listIds.filter((d) => !sourceDirs.includes(d));
    check(
      missing.length === 0 && extra.length === 0,
      "workshop ids match sources",
      missing.length || extra.length
        ? `missing=[${missing.join(",")}] stale=[${extra.join(",")}]`
        : "exact",
    );
    // `path` feeds prerender's routes/aliases and check-discovery's expected
    // sitemap URLs, but both re-read the same field, so nothing re-derives it:
    // a hand-edited or half-regenerated workshop-list.json keeps green ids
    // while rotting every link built from `path`.
    const badPaths = list.filter((w) => w.path !== `/workshops/${w.id}`);
    check(
      badPaths.length === 0,
      "workshop paths match ids",
      badPaths.length
        ? badPaths.map((w) => `${w.id}->${w.path}`).join(",")
        : "all paths are /workshops/<id>",
    );
  }

  let manifests = 0;
  let pageDrift = [];
  let slugDrift = [];
  for (const id of sourceDirs) {
    const manifestPath = join(workshopsDir, id, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    manifests += 1;
    const manifest = readJson(manifestPath);
    const mdFiles = readdirSync(join(workshopsDir, id)).filter((f) => f.endsWith(".md"));
    const mdCount = mdFiles.length;
    if ((manifest.pages?.length ?? -1) !== mdCount) {
      pageDrift.push(`${id}(${manifest.pages?.length ?? "?"}!=${mdCount})`);
    }
    // Count equality is not set equality: a stale manifest that duplicates one
    // slug while dropping a renamed file keeps the count green, yet every link
    // prerender and check-discovery build from the missing slug rots silently.
    const slugs = (manifest.pages ?? []).map((p) => p.slug);
    const unlisted = mdFiles.filter((f) => !slugs.includes(f));
    const stale = slugs.filter((s) => !mdFiles.includes(s));
    if (unlisted.length || stale.length) {
      slugDrift.push(`${id}(unlisted=[${unlisted.join(",")}] stale=[${stale.join(",")}])`);
    }
  }
  check(manifests === sourceDirs.length, "manifest coverage", `${manifests}/${sourceDirs.length} dirs`);
  check(pageDrift.length === 0, "manifest pages match *.md", pageDrift.join(",") || "all aligned");
  check(slugDrift.length === 0, "manifest slugs match *.md filenames", slugDrift.join(", ") || "exact");

  // The hand-written course index is the human-facing directory of the same
  // workshops; nothing regenerates it, so a workshop added or removed without
  // editing the index leaves a served, silently stale file behind (a dead
  // link or a missing entry). Its relative directory links must be exactly
  // the source dirs.
  const indexPath = join(workshopsDir, "ai-powered-knowledge-work-index.md");
  if (existsSync(indexPath)) {
    const linked = new Set(
      readFileSync(indexPath, "utf-8")
        .split("](./")
        .slice(1)
        .map((rest) => rest.slice(0, rest.indexOf(")")))
        .filter((target) => target.endsWith("/"))
        .map((target) => target.slice(0, -1)),
    );
    const unlisted = sourceDirs.filter((d) => !linked.has(d));
    const dead = [...linked].filter((d) => !sourceDirs.includes(d));
    check(
      unlisted.length === 0 && dead.length === 0,
      "course index links match workshop dirs",
      unlisted.length || dead.length
        ? `unlisted=[${unlisted.join(",")}] dead=[${dead.join(",")}]`
        : `${sourceDirs.length} dirs, all linked`,
    );
  } else {
    check(false, "course index present", `absent: ${indexPath.replace(`${root}/`, "")}`);
  }
} else {
  check(false, "workshops source dir", `absent: ${workshopsDir.replace(`${root}/`, "")}`);
}

// --- generate-testimonials.mjs --------------------------------------------
// src/data/testimonials.json equals content/site-content.yaml
// at pages.testimonials.items.
const yamlPath = at("content", "site-content.yaml");
const testimonialsPath = at("src", "data", "testimonials.json");
if (existsSync(yamlPath) && existsSync(testimonialsPath)) {
  const src = parseYaml(readFileSync(yamlPath, "utf-8"))?.pages?.testimonials?.items ?? [];
  const generated = readJson(testimonialsPath);
  check(
    Array.isArray(generated) && generated.length === src.length,
    "testimonial count",
    `${src.length} yaml items vs ${Array.isArray(generated) ? generated.length : "not-an-array"} generated`,
  );
  check(
    JSON.stringify(generated) === JSON.stringify(src),
    "testimonials.json matches yaml",
    "byte-comparable after JSON round-trip",
  );
  check(statSync(testimonialsPath).size > 2, "testimonials.json non-empty", "generator did not fall back to []");
} else {
  check(false, "testimonial inputs", "content/site-content.yaml or src/data/testimonials.json absent");
}

console.log(lines.join("\n"));
console.log(
  failures.length === 0
    ? "CONTENT-GENERATORS-OK"
    : `CONTENT-GENERATORS-FAIL (${failures.length}): ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
