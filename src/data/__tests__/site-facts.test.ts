import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_FACTS } from "../site-facts";

// index.html and public/llms.txt cannot import site-facts.ts, so they are
// hand-edited. This test stops them (and the content YAML) drifting from it.
const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf-8");
const STATIC = ["index.html", "public/llms.txt", "content/site-content.yaml"];

describe("site facts", () => {
  it.each(STATIC)("%s states the specialist count from site-facts.ts", (file) => {
    const text = read(file);
    const counts = [...text.matchAll(/\b(\d{2})\+ ?(?:deep[- ]tech )?(?:specialist|expert)/gi)].map((m) => `${m[1]}+`);
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) expect(c).toBe(SITE_FACTS.specialists);
  });

  it.each(STATIC)("%s carries no retired figure", (file) => {
    const text = read(file);
    expect(text).not.toMatch(/\b4[34]\+/);
    expect(text).not.toMatch(/5-bed(room)?\b/i);
    expect(text).not.toMatch(/\b(2-5|1-5|5 intensive) days\b/i);
  });

  it("caps residential programmes at three days", () => {
    expect(SITE_FACTS.residentialMaxDays).toBe(3);
    expect(SITE_FACTS.residentialDays).toContain("3");
  });
});
