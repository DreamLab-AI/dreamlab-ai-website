import { describe, it, expect, afterEach } from "vitest";
import { getBbsConfig, parseZones, relayHttpUrl } from "../env";

describe("bbs/env parseZones", () => {
  it("returns the four default zones when input is missing", () => {
    const zones = parseZones(undefined);
    expect(zones).toHaveLength(4);
    expect(zones.map((z) => z.id)).toContain("public");
  });

  it("parses a JSON string of zones", () => {
    const json = JSON.stringify([
      {
        id: "public",
        display_name: "Landing",
        required_cohorts: [],
        visibility: "public",
        encrypted: false,
      },
      {
        id: "family",
        display_name: "Family",
        required_cohorts: ["family"],
        visibility: "locked",
        encrypted: true,
      },
    ]);
    const zones = parseZones(json);
    expect(zones).toHaveLength(2);
    expect(zones[1]).toMatchObject({
      id: "family",
      visibility: "locked",
      encrypted: true,
    });
  });

  it("accepts an already-parsed array", () => {
    const zones = parseZones([
      {
        id: "biz",
        display_name: "Biz",
        required_cohorts: ["business"],
        visibility: "locked",
        encrypted: false,
      },
    ]);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe("biz");
  });

  it("falls back to defaults on invalid JSON", () => {
    expect(parseZones("{not json")).toHaveLength(4);
  });

  it("drops malformed zone entries", () => {
    const zones = parseZones([
      { display_name: "no id" } as unknown as never,
      {
        id: "ok",
        display_name: "OK",
        required_cohorts: [],
        visibility: "public",
        encrypted: false,
      },
    ]);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe("ok");
  });
});

describe("bbs/env config + url helpers", () => {
  afterEach(() => {
    delete (window as unknown as { __ENV__?: unknown }).__ENV__;
  });

  it("uses live defaults with no env injection", () => {
    const config = getBbsConfig();
    expect(config.relayUrl).toMatch(/^wss:\/\//);
    expect(config.authApiUrl).toMatch(/^https:\/\//);
    expect(config.zones.length).toBeGreaterThanOrEqual(4);
  });

  it("prefers window.__ENV__ overrides", () => {
    (window as unknown as { __ENV__: Record<string, unknown> }).__ENV__ = {
      FORUM_NAME: "Test Forum",
      VITE_RELAY_URL: "wss://relay.test/",
    };
    const config = getBbsConfig();
    expect(config.forumName).toBe("Test Forum");
    expect(config.relayUrl).toBe("wss://relay.test/");
  });

  it("derives the relay https origin", () => {
    expect(relayHttpUrl("wss://relay.example.com")).toBe(
      "https://relay.example.com"
    );
    expect(relayHttpUrl("ws://localhost:1234")).toBe("http://localhost:1234");
  });
});
