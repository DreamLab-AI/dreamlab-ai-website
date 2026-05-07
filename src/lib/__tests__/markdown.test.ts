import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DOMPurify from "dompurify";
import { parseTeamMarkdown, getDataPath, fetchMarkdown } from "../markdown";

// ---------------------------------------------------------------------------
// parseTeamMarkdown / getDataPath / fetchMarkdown — exercised directly.
// ---------------------------------------------------------------------------
describe("markdown :: parseTeamMarkdown", () => {
  it("extracts headline (line after the H1) and full details section", () => {
    const md = [
      "# Dr Jane Doe",
      "",
      "Principal Researcher, AI Safety",
      "",
      "Some intro text.",
      "",
      "## Full Details",
      "",
      "Jane has 20 years of experience in alignment research.",
    ].join("\n");

    const { headline, fullDetails } = parseTeamMarkdown(md);
    expect(headline).toBe("Principal Researcher, AI Safety");
    expect(fullDetails).toContain("20 years of experience");
  });

  it("returns empty strings when the markdown is missing the expected sections", () => {
    const { headline, fullDetails } = parseTeamMarkdown("just plain text, no heading");
    expect(headline).toBe("");
    expect(fullDetails).toBe("");
  });
});

describe("markdown :: getDataPath", () => {
  // Whether vitest reports PROD=true depends on the runner mode. We assert
  // the documented contract on both sides without coupling to the runner.
  const isProd = (import.meta as ImportMeta).env?.PROD === true;

  it("maps /src/data/ to /data/ only in production builds", () => {
    if (isProd) {
      expect(getDataPath("/src/data/team/foo.md")).toBe("/data/team/foo.md");
    } else {
      expect(getDataPath("/src/data/team/foo.md")).toBe("/src/data/team/foo.md");
    }
  });

  it("does not transform paths that are already under /data/", () => {
    expect(getDataPath("/data/team/foo.md")).toBe("/data/team/foo.md");
  });
});

describe("markdown :: fetchMarkdown", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the response text on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve("# Hello\n\nWorld"),
    }) as unknown as typeof fetch;

    const out = await fetchMarkdown("/data/team/x.md");
    expect(out).toBe("# Hello\n\nWorld");
  });

  it("returns empty string and logs on fetch failure", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const out = await fetchMarkdown("/data/team/x.md");
    expect(out).toBe("");
    expect(errSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DOMPurify sanitisation — guards the configuration used inside
// WorkshopPage.tsx for rendered Mermaid SVG output. These tests pin the
// security contract: scripts/handlers stripped, SVG profile preserved.
// ---------------------------------------------------------------------------
describe("DOMPurify sanitisation contract", () => {
  beforeEach(() => {
    // jsdom provides window/document — DOMPurify auto-detects it. No setup
    // needed beyond the vitest jsdom environment.
  });

  it("strips <script> tags from arbitrary HTML", () => {
    const dirty = '<p>safe</p><script>alert("xss")</script>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).toContain("<p>safe</p>");
    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean).not.toContain("alert(");
  });

  it("strips inline event handlers like onclick", () => {
    const dirty = '<a href="#" onclick="steal()">click</a>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean.toLowerCase()).not.toContain("onclick");
    expect(clean).not.toContain("steal()");
    expect(clean).toContain("click");
  });

  it("strips javascript: URLs", () => {
    const dirty = '<a href="javascript:steal()">click</a>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean.toLowerCase()).not.toContain("javascript:");
  });

  it("preserves benign SVG markup under the SVG profile (Mermaid render path)", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
      '<rect width="10" height="10" fill="#000"/>' +
      "</svg>";

    // This mirrors WorkshopPage.tsx: USE_PROFILES { svg: true, svgFilters: true }
    const clean = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });

    expect(clean).toContain("<svg");
    expect(clean).toContain("<rect");
    expect(clean).toContain('fill="#000"');
  });

  it("strips <script> from inside SVG even with the SVG profile enabled", () => {
    const dirtySvg =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<script>alert("xss")</script>' +
      '<rect width="10" height="10"/>' +
      "</svg>";

    const clean = DOMPurify.sanitize(dirtySvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });

    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean).not.toContain("alert(");
    expect(clean).toContain("<rect");
  });

  it("renders benign markdown-derived HTML through unchanged for plain text", () => {
    const dirty = "<p>Hello <strong>world</strong></p>";
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).toBe("<p>Hello <strong>world</strong></p>");
  });
});
