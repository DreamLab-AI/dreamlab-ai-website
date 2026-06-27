import { describe, it, expect } from "vitest";
import { rankFromCohorts, zoneUnlocked, zonesUnlocked } from "../rank";
import type { Zone } from "../types";

const zone = (id: string, required: string[]): Zone => ({
  id,
  display_name: id,
  required_cohorts: required,
  visibility: required.length ? "locked" : "public",
  encrypted: false,
});

describe("bbs/rank", () => {
  it("maps cohorts to a rank label", () => {
    expect(rankFromCohorts(["admin"], true)).toBe("SysOp");
    expect(rankFromCohorts(["business"], true)).toBe("DreamLab");
    expect(rankFromCohorts(["family"], true)).toBe("Family");
    expect(rankFromCohorts(["friends"], true)).toBe("Friend");
    expect(rankFromCohorts(["members"], true)).toBe("Member");
    expect(rankFromCohorts([], true)).toBe("Verified");
    expect(rankFromCohorts([], false)).toBe("Guest");
  });

  it("unlocks open zones for everyone", () => {
    expect(zoneUnlocked(zone("public", []), [])).toBe(true);
  });

  it("locks zones without the required cohort", () => {
    expect(zoneUnlocked(zone("family", ["family"]), [])).toBe(false);
    expect(zoneUnlocked(zone("family", ["family"]), ["family"])).toBe(true);
  });

  it("counts unlocked zones", () => {
    const zones = [
      zone("public", []),
      zone("friends", ["friends"]),
      zone("family", ["family"]),
    ];
    expect(zonesUnlocked(zones, [])).toBe(1);
    expect(zonesUnlocked(zones, ["friends"])).toBe(2);
  });
});
