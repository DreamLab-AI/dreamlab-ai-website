import { describe, expect, it } from "vitest";
import { withTrailingSlash } from "../trailing-slash";

describe("withTrailingSlash", () => {
  it("adds a slash to bare internal routes", () => {
    expect(withTrailingSlash("/programmes")).toBe("/programmes/");
    expect(withTrailingSlash("/workshops/workshop-03/02_intro.md")).toBe("/workshops/workshop-03/02_intro.md");
  });
  it("keeps the query and hash after the slash", () => {
    expect(withTrailingSlash("/contact?x=1#form")).toBe("/contact/?x=1#form");
    expect(withTrailingSlash("/team#bios")).toBe("/team/#bios");
  });
  it("leaves root, slashed, file, external and relative targets alone", () => {
    for (const t of ["/", "/team/", "/images/a.webp", "https://x.test/a", "mailto:a@b.co", "team", "#top"]) {
      expect(withTrailingSlash(t)).toBe(t);
    }
  });
});
