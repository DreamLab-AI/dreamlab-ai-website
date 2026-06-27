import { describe, it, expect } from "vitest";
import {
  areaOf,
  buildChannelMessage,
  buildNote,
  buildReaction,
  dedupeById,
  eventToPost,
  eventToProfile,
  groupChannelsByArea,
  latestByPubkey,
  parseChannel,
} from "../forum";
import { KIND, type NostrEvent } from "../types";

function ev(partial: Partial<NostrEvent>): NostrEvent {
  return {
    id: "id",
    pubkey: "pk",
    created_at: 0,
    kind: 1,
    tags: [],
    content: "",
    sig: "sig",
    ...partial,
  };
}

describe("bbs/forum mapping", () => {
  it("derives area prefixes from section slugs", () => {
    expect(areaOf("dreamlab-general")).toBe("dreamlab");
    expect(areaOf("home")).toBe("home");
    expect(areaOf("")).toBe("general");
  });

  it("parses a kind-40 channel", () => {
    const channel = parseChannel(
      ev({
        id: "chan1",
        kind: KIND.CHANNEL,
        tags: [["section", "dreamlab-intro"]],
        content: JSON.stringify({ name: "Intro", about: "say hi" }),
        created_at: 100,
      })
    );
    expect(channel).not.toBeNull();
    expect(channel).toMatchObject({
      id: "chan1",
      section: "dreamlab-intro",
      area: "dreamlab",
      name: "Intro",
      about: "say hi",
    });
  });

  it("returns null for non-channel events", () => {
    expect(parseChannel(ev({ kind: 1 }))).toBeNull();
  });

  it("maps a kind-42 message to a post with its channel", () => {
    const post = eventToPost(
      ev({
        id: "m1",
        kind: KIND.CHANNEL_MESSAGE,
        tags: [["e", "chan1", "", "root"]],
        content: "hello",
      })
    );
    expect(post.channelId).toBe("chan1");
    expect(post.kind).toBe(KIND.CHANNEL_MESSAGE);
  });

  it("falls back to first #e as channel for kind-42 without markers", () => {
    const post = eventToPost(
      ev({ kind: KIND.CHANNEL_MESSAGE, tags: [["e", "chanX"]] })
    );
    expect(post.channelId).toBe("chanX");
  });

  it("parses kind-0 profile metadata", () => {
    const profile = eventToProfile(
      ev({
        kind: KIND.PROFILE,
        pubkey: "pk1",
        content: JSON.stringify({ name: "Neo", nip05: "neo@dreamlab-ai.com" }),
        created_at: 7,
      })
    );
    expect(profile).toMatchObject({
      pubkey: "pk1",
      name: "Neo",
      nip05: "neo@dreamlab-ai.com",
      updatedAt: 7,
    });
  });

  it("keeps the newest event per pubkey", () => {
    const events = [
      ev({ id: "a", pubkey: "x", created_at: 1 }),
      ev({ id: "b", pubkey: "x", created_at: 5 }),
      ev({ id: "c", pubkey: "y", created_at: 2 }),
    ];
    const latest = latestByPubkey(events);
    expect(latest).toHaveLength(2);
    expect(latest.find((e) => e.pubkey === "x")?.id).toBe("b");
  });

  it("dedupes by id", () => {
    const out = dedupeById([ev({ id: "a" }), ev({ id: "a" }), ev({ id: "b" })]);
    expect(out.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("groups channels by area", () => {
    const channels = [
      parseChannel(
        ev({ id: "1", kind: 40, tags: [["section", "home-a"]], content: "{}" })
      )!,
      parseChannel(
        ev({ id: "2", kind: 40, tags: [["section", "home-b"]], content: "{}" })
      )!,
      parseChannel(
        ev({ id: "3", kind: 40, tags: [["section", "biz-a"]], content: "{}" })
      )!,
    ];
    const groups = groupChannelsByArea(channels);
    expect(groups.map((g) => g.area)).toEqual(["biz", "home"]);
    expect(groups.find((g) => g.area === "home")?.channels).toHaveLength(2);
  });

  it("builds event templates with correct kinds and tags", () => {
    expect(buildChannelMessage("chan1", "hi")).toMatchObject({
      kind: KIND.CHANNEL_MESSAGE,
      tags: [["e", "chan1", "", "root"]],
      content: "hi",
    });
    expect(buildNote("yo", ["code"])).toMatchObject({
      kind: KIND.NOTE,
      tags: [["t", "code"]],
    });
    expect(buildReaction("e1", "p1", "+")).toMatchObject({
      kind: KIND.REACTION,
      content: "+",
    });
  });
});
