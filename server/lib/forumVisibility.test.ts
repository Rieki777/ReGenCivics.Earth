import { describe, expect, it } from "vitest";
import { isForumHidden } from "./forumVisibility";

describe("forum soft-hide", () => {
  it("treats only an explicit hide flag as hidden", () => {
    expect(isForumHidden(false)).toBe(false);
    expect(isForumHidden(0)).toBe(false);
    expect(isForumHidden(null)).toBe(false);
    expect(isForumHidden(undefined)).toBe(false);
    expect(isForumHidden(true)).toBe(true);
    expect(isForumHidden(1)).toBe(true);
  });
});
