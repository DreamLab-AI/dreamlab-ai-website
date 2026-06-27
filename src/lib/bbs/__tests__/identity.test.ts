import { describe, it, expect } from "vitest";
import { verifyEvent } from "nostr-tools/pure";
import {
  anonIdentity,
  createSigner,
  generateLocalIdentity,
  importSecret,
  isHexKey,
  npubOf,
  nsecOf,
} from "../identity";
import { KIND } from "../types";

describe("bbs/identity", () => {
  it("hex key validation", () => {
    expect(isHexKey("a".repeat(64))).toBe(true);
    expect(isHexKey("a".repeat(63))).toBe(false);
    expect(isHexKey("xyz")).toBe(false);
  });

  it("anon identity cannot sign", () => {
    const anon = anonIdentity();
    expect(anon.kind).toBe("anon");
    expect(createSigner(anon)).toBeNull();
  });

  it("generates a valid local identity", () => {
    const id = generateLocalIdentity();
    expect(id.kind).toBe("local");
    expect(isHexKey(id.pubkey)).toBe(true);
    expect(id.npub.startsWith("npub1")).toBe(true);
    expect(id.secretHex).toBeDefined();
  });

  it("round-trips an nsec import", () => {
    const original = generateLocalIdentity();
    const nsec = nsecOf(original.secretHex as string);
    expect(nsec.startsWith("nsec1")).toBe(true);
    const reimported = importSecret(nsec);
    expect(reimported.pubkey).toBe(original.pubkey);
  });

  it("imports a 64-char hex secret", () => {
    const original = generateLocalIdentity();
    const reimported = importSecret(original.secretHex as string);
    expect(reimported.pubkey).toBe(original.pubkey);
  });

  it("rejects an npub as a secret", () => {
    const id = generateLocalIdentity();
    expect(() => importSecret(npubOf(id.pubkey))).toThrow();
  });

  it("local signer produces a verifiable event", async () => {
    const id = generateLocalIdentity();
    const signer = createSigner(id);
    expect(signer).not.toBeNull();
    const event = await signer!.sign({
      kind: KIND.NOTE,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "hello bbs",
    });
    expect(event.pubkey).toBe(id.pubkey);
    expect(verifyEvent(event)).toBe(true);
  });
});
