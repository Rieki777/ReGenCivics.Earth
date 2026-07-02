import { describe, expect, it } from "vitest";
import {
  ANASTASIA_DISCLOSURE,
  EXCLUDED_CATEGORY_SLUGS,
  MAX_COMMENTS_PER_RUN,
  MAX_REPLIES_PER_RUN,
  composeComment,
  parseComment,
  postQueryText,
} from "./lib/anastasia-forum";
import {
  ANASTASIA_VOICE,
  FORUM_PASS_TOKEN,
  buildAnastasiaForumCommentPrompt,
  buildAnastasiaForumReplyPrompt,
} from "./lib/elder-safety";

describe("parseComment", () => {
  it("treats the PASS token as a decline, with or without trailing punctuation", () => {
    expect(parseComment("PASS")).toBeNull();
    expect(parseComment("pass")).toBeNull();
    expect(parseComment("PASS.")).toBeNull();
    expect(parseComment("  PASS \n")).toBeNull();
  });

  it("declines on empty or near-empty output", () => {
    expect(parseComment("")).toBeNull();
    expect(parseComment("   ")).toBeNull();
    expect(parseComment("ok")).toBeNull();
  });

  it("returns real comment text trimmed", () => {
    const out = parseComment("  The soil comes to know the hands that tend it.  ");
    expect(out).toBe("The soil comes to know the hands that tend it.");
  });
});

describe("composeComment", () => {
  it("appends the AI-presence disclosure", () => {
    const body = composeComment("A short word of the land.");
    expect(body.startsWith("A short word of the land.")).toBe(true);
    expect(body.includes(ANASTASIA_DISCLOSURE.trim())).toBe(true);
    expect(body).toMatch(/Vladimir Megre/);
  });
});

describe("postQueryText", () => {
  it("joins title and content and caps length", () => {
    const q = postQueryText("Title", "Body");
    expect(q).toBe("Title\n\nBody");
    expect(postQueryText("t", "x".repeat(5000)).length).toBeLessThanOrEqual(2000);
  });
});

describe("config", () => {
  it("excludes administrative categories by default and has sane caps", () => {
    expect(EXCLUDED_CATEGORY_SLUGS).toContain("historical-contribution-accounting");
    expect(MAX_COMMENTS_PER_RUN).toBeGreaterThan(0);
    expect(MAX_REPLIES_PER_RUN).toBeGreaterThan(0);
  });
});

describe("forum prompts", () => {
  const prompts = [buildAnastasiaForumCommentPrompt([]), buildAnastasiaForumReplyPrompt([])];

  it("carry the shared voice and the PASS decline mechanism", () => {
    for (const p of prompts) {
      expect(p).toContain(ANASTASIA_VOICE);
      expect(p).toContain(FORUM_PASS_TOKEN);
      expect(p.toLowerCase()).toContain("crisis");
    }
  });

  it("contain no em-dash in their static instructions (the hard writing rule)", () => {
    for (const p of prompts) {
      expect(p.includes("—")).toBe(false);
    }
  });
});
