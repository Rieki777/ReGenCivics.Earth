import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  boardKeyTagFor,
  guestLabel,
  identityKeyHash,
  isBoardKeyTag,
  parseBoardKeyTag,
} from "./boardIdentityLink";

describe("board identity link", () => {
  it("hashes an identity the same way sha256 does, and keeps 32 hex in the tag", async () => {
    const identity = "k:sabcdef0123456789";
    const full = createHash("sha256").update(identity).digest("hex");
    expect(await identityKeyHash(identity)).toBe(full);
    const tag = await boardKeyTagFor(identity);
    expect(tag).toBe(`board-key:${full.slice(0, 32)}`);
    expect(parseBoardKeyTag(tag)).toBe(full.slice(0, 32));
    expect(isBoardKeyTag(tag)).toBe(true);
    expect(isBoardKeyTag("season2-week-board")).toBe(false);
    expect(isBoardKeyTag("board-key:not-hex")).toBe(false);
    expect(parseBoardKeyTag(null)).toBeNull();
    expect(guestLabel(full)).toBe(`Guest ${full.slice(0, 6)}`);
    expect(guestLabel(full)).not.toContain("sabcdef");
  });

  it("a different identity gets a different tag", async () => {
    const a = await boardKeyTagFor("u:4");
    const b = await boardKeyTagFor("k:otherkey12345678");
    expect(a).not.toBe(b);
  });
});
