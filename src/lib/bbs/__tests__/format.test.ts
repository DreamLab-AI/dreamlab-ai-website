import { describe, it, expect } from "vitest";
import {
  bbsTimestamp,
  deriveHandle,
  fit,
  relativeTime,
  shortKey,
  truncate,
  wrap,
} from "../format";

describe("bbs/format", () => {
  it("formats a unix timestamp as a Mon DD HH:MM line", () => {
    // 2026-05-23T23:31:00Z — assert structure, not locale-shifted exact value.
    const out = bbsTimestamp(Date.UTC(2026, 4, 23, 23, 31) / 1000);
    expect(out).toMatch(/^May \d{2} \d{2}:\d{2}$/);
  });

  it("produces human relative times", () => {
    const now = 1_000_000_000_000;
    const nowSec = Math.floor(now / 1000);
    expect(relativeTime(nowSec, now)).toBe("just now");
    expect(relativeTime(nowSec - 120, now)).toBe("2m ago");
    expect(relativeTime(nowSec - 7200, now)).toBe("2h ago");
    expect(relativeTime(nowSec - 2 * 86400, now)).toBe("2d ago");
  });

  it("shortens keys", () => {
    expect(shortKey("abcdefghijklmnop")).toBe("abcdef…mnop");
    expect(shortKey("short")).toBe("short");
    expect(shortKey("")).toBe("");
  });

  it("truncates and collapses whitespace", () => {
    expect(truncate("hello   world", 100)).toBe("hello world");
    expect(truncate("hello world", 5)).toBe("hell…");
  });

  it("wraps text to a column width", () => {
    const lines = wrap("the quick brown fox jumps", 10);
    expect(lines.every((l) => l.length <= 10)).toBe(true);
    expect(lines.join(" ")).toContain("quick");
  });

  it("hard-breaks overlong words when wrapping", () => {
    const lines = wrap("abcdefghijklmnop", 5);
    expect(lines[0]).toHaveLength(5);
  });

  it("fits to an exact width", () => {
    expect(fit("ab", 5)).toBe("ab   ");
    expect(fit("abcdef", 3)).toBe("abc");
  });

  it("derives a handle from name or npub", () => {
    expect(deriveHandle("Alice", "npub1xxx")).toBe("Alice");
    expect(deriveHandle("", "npub1abcdefgh")).toBe(shortKey("npub1abcdefgh", 8, 4));
    expect(deriveHandle(undefined, "")).toBe("guest");
  });
});
