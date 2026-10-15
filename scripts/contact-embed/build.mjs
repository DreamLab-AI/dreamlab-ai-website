// Bundle scripts/contact-embed/entry.ts into one self-contained ES module and
// vendor it into the sibling static sites. Run: node scripts/contact-embed/build.mjs
// The output carries a header naming the source commit so a stale vendored copy
// is attributable. Targets are the repos' static js directories.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const commit = execSync("git rev-parse --short HEAD", { cwd: repo }).toString().trim();
const TARGETS = [
  "/home/devuser/workspace/VisionFlow/website/static/js/nostr-contact.js",
  "/home/devuser/workspace/visionGraph/static/contact/nostr-contact.js",
];

const result = await build({
  entryPoints: [path.join(here, "entry.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  write: false,
  legalComments: "none",
});
const banner = `/* DreamLab Nostr contact embed — vendored build of dreamlab-ai-website src/lib/nostr.ts @ ${commit}.\n   Regenerate with: node scripts/contact-embed/build.mjs (in DreamLab-AI/dreamlab-ai-website). Do not hand-edit. */\n`;
const code = banner + result.outputFiles[0].text;
for (const t of TARGETS) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, code);
  console.log(`wrote ${t} (${(code.length / 1024).toFixed(1)} KiB)`);
}
