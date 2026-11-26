import { describe, expect, it, vi } from "vitest";
import { isChunkLoadError, loadWithReload, reloadOnceForStaleChunk } from "../lazy-reload";

const memoryStore = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe("isChunkLoadError", () => {
  it("recognises the browsers' failed dynamic import messages", () => {
    for (const msg of [
      "Failed to fetch dynamically imported module: https://dreamlab-ai.com/assets/Programmes-BiewsFED.js",
      "error loading dynamically imported module: https://x/assets/a.js",
      "Importing a module script failed.",
      "Unable to preload CSS for /assets/Team-abc.css",
    ]) {
      expect(isChunkLoadError(new TypeError(msg))).toBe(true);
    }
  });

  it("does not treat ordinary errors as stale chunks", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError("nope")).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("reloadOnceForStaleChunk", () => {
  it("reloads the first time and not again straight after", () => {
    const store = memoryStore();
    const reload = vi.fn();
    expect(reloadOnceForStaleChunk({ store, reload, now: () => 1_000 })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    // The reloaded page fails again (the chunk is really gone): no loop.
    expect(reloadOnceForStaleChunk({ store, reload, now: () => 5_000 })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("allows another reload for a later deploy", () => {
    const store = memoryStore();
    const reload = vi.fn();
    reloadOnceForStaleChunk({ store, reload, now: () => 1_000 });
    expect(reloadOnceForStaleChunk({ store, reload, now: () => 1_000 + 61_000 })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when the attempt cannot be recorded", () => {
    const store = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const reload = vi.fn();
    expect(reloadOnceForStaleChunk({ store, reload, now: () => 1 })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("loadWithReload", () => {
  it("passes a successful import through", async () => {
    const mod = { default: () => null };
    await expect(loadWithReload(async () => mod, () => true)).resolves.toBe(mod);
  });

  it("reloads on a stale chunk and never settles while the page reloads", async () => {
    const onStale = vi.fn(() => true);
    const p = loadWithReload(async () => {
      throw new TypeError("Failed to fetch dynamically imported module: /assets/a.js");
    }, onStale);
    const settled = await Promise.race([
      p.then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise((r) => setTimeout(() => r("pending"), 20)),
    ]);
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(settled).toBe("pending");
  });

  it("rethrows when a reload was already tried, so the error page shows", async () => {
    const err = new TypeError("Failed to fetch dynamically imported module: /assets/a.js");
    await expect(
      loadWithReload(
        async () => {
          throw err;
        },
        () => false,
      ),
    ).rejects.toBe(err);
  });

  it("rethrows other errors without reloading", async () => {
    const onStale = vi.fn(() => true);
    const err = new Error("boom");
    await expect(
      loadWithReload(async () => {
        throw err;
      }, onStale),
    ).rejects.toBe(err);
    expect(onStale).not.toHaveBeenCalled();
  });
});
