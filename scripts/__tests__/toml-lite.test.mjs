// The lite TOML reader behind the config-mirror checks: the shapes
// forum-config/dreamlab.toml actually uses, including the [poker].citizens
// inline table keyed by chain ids (quoted keys with ':' and '-').
import { describe, expect, it } from "vitest";
import { parseToml } from "../lib/toml-lite.mjs";

describe("toml-lite", () => {
  it("reads an inline table with quoted keys", () => {
    const d = parseToml(
      `[poker]\ncitizens = { "sidestr:dreamlab" = "aa", "sidestr:dreamlab-txbt4" = "bb" }\n`,
    );
    expect(d.poker.citizens).toEqual({ "sidestr:dreamlab": "aa", "sidestr:dreamlab-txbt4": "bb" });
  });

  it("reads bare and nested inline tables with mixed scalars", () => {
    const d = parseToml(`x = { a = 1, b = true, c = "s,t", d = { e = 2.5 } }\n`);
    expect(d.x).toEqual({ a: 1, b: true, c: "s,t", d: { e: 2.5 } });
  });

  it("keeps a quoted key as one segment but splits a bare dotted key", () => {
    const d = parseToml(`"a.b" = 1\nc.d = 2\n`);
    expect(d).toEqual({ "a.b": 1, c: { d: 2 } });
  });

  it("rejects an unterminated inline table", () => {
    expect(() => parseToml(`x = { a = 1\n`)).toThrow(/unterminated inline table/);
  });
});
