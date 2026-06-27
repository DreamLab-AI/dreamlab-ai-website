import { describe, it, expect } from "vitest";
import { FN_KEYS, MENU_ITEMS, resolveCommand } from "../menu";

describe("bbs/menu", () => {
  it("has ten main-menu entries keyed 1..0", () => {
    expect(MENU_ITEMS).toHaveLength(10);
    expect(MENU_ITEMS.map((m) => m.key)).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    ]);
  });

  it("maps function keys to targets", () => {
    expect(FN_KEYS.find((k) => k.fkey === "F1")?.target).toBe("help");
    expect(FN_KEYS.find((k) => k.fkey === "F10")?.target).toBe("logoff");
  });

  it("resolves number commands", () => {
    expect(resolveCommand("1")).toBe("messages");
    expect(resolveCommand("0")).toBe("logoff");
  });

  it("resolves word and alias commands", () => {
    expect(resolveCommand("msgs")).toBe("messages");
    expect(resolveCommand("who")).toBe("users");
    expect(resolveCommand("feed")).toBe("chat");
    expect(resolveCommand("QUIT")).toBe("logoff");
    expect(resolveCommand(" help ")).toBe("help");
  });

  it("returns null for unknown commands", () => {
    expect(resolveCommand("frobnicate")).toBeNull();
    expect(resolveCommand("")).toBeNull();
  });
});
