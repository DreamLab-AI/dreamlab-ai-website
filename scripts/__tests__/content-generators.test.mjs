// Bench-visible smoke test for the content-generator inventory.
//
// The inventory (scripts/lib/content-generators.mjs) runs as the advisory
// `content-generators` dream evaluator, but no vitest suite executed it, so
// a red inventory could sit on main behind a green bench. Spawn the script
// and require its terminal OK line, so the content invariants are enforced
// by the REQUIRED bench evaluator too.
import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "..", "lib", "content-generators.mjs");

test("content-generators inventory passes on the committed tree", () => {
  const stdout = execFileSync(process.execPath, [script], { encoding: "utf-8" });
  expect(stdout.trimEnd().endsWith("CONTENT-GENERATORS-OK")).toBe(true);
});
