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
  }

  let manifests = 0;
  let pageDrift = [];
  for (const id of sourceDirs) {
    const manifestPath = join(workshopsDir, id, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    manifests += 1;
    const manifest = readJson(manifestPath);
    const mdCount = readdirSync(join(workshopsDir, id)).filter((f) => f.endsWith(".md")).length;
    if ((manifest.pages?.length ?? -1) !== mdCount) {
      pageDrift.push(`${id}(${manifest.pages?.length ?? "?"}!=${mdCount})`);
    }
  }
  check(manifests === sourceDirs.length, "manifest coverage", `${manifests}/${sourceDirs.length} dirs`);
  check(pageDrift.length === 0, "manifest pages match *.md", pageDrift.join(",") || "all aligned");
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
