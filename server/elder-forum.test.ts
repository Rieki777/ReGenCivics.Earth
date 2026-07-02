import { describe, expect, it } from "vitest";
import {
  EXCLUDED_CATEGORY_SLUGS,
  MAX_COMMENTS_PER_RUN,
  MAX_REPLIES_PER_RUN,
  parseComment,
  parseRouterChoice,
  postQueryText,
} from "./lib/elder-forum";
import {
  ELDER_WRITING_RULES,
  ELDERS,
  getElder,
  mentionedElders,
} from "./lib/elders";
import {
  FORUM_PASS_TOKEN,
  buildElderForumCommentPrompt,
  buildElderForumReplyPrompt,
  buildElderSystemPrompt,
} from "./lib/elder-safety";

const anastasia = getElder("anastasia")!;
const yeshua = getElder("yeshua")!;

describe("elder registry", () => {
  it("has Anastasia and Yeshua with AI Elder names and short handles", () => {
    expect(anastasia.displayName).toBe("AI Elder Anastasia");
    expect(yeshua.displayName).toBe("AI Elder Yeshua");
    expect(anastasia.handle).toBe("anastasia");
    expect(yeshua.handle).toBe("yeshua");
    expect(ELDERS.every((e) => e.forumEnabled)).toBe(true);
  });
});

describe("mentionedElders", () => {
  it("detects @handle mentions, case-insensitively", () => {
    expect(mentionedElders("what would @yeshua say?").map((e) => e.id)).toEqual(["yeshua"]);
    expect(mentionedElders("@Anastasia and @yeshua both").map((e) => e.id).sort()).toEqual(["anastasia", "yeshua"]);
    expect(mentionedElders("no mentions here")).toEqual([]);
    // A bare name without @ is not a mention.
    expect(mentionedElders("anastasia is wise")).toEqual([]);
  });
});

describe("parseComment", () => {
  it("treats the PASS token as a decline, with or without trailing punctuation", () => {
    expect(parseComment("PASS")).toBeNull();
    expect(parseComment("pass")).toBeNull();
    expect(parseComment("PASS.")).toBeNull();
    expect(parseComment("")).toBeNull();
    expect(parseComment("ok")).toBeNull();
  });
  it("returns real comment text trimmed", () => {
    expect(parseComment("  The soil knows the hands that tend it.  ")).toBe("The soil knows the hands that tend it.");
  });
});

describe("parseRouterChoice", () => {
  const ids = ["anastasia", "yeshua"];
  it("matches an elder id case-insensitively", () => {
    expect(parseRouterChoice("yeshua", ids)).toBe("yeshua");
    expect(parseRouterChoice("Anastasia.", ids)).toBe("anastasia");
  });
  it("returns null for NONE or an unknown id", () => {
    expect(parseRouterChoice("PASS", ids)).toBeNull();
    expect(parseRouterChoice("none", ids)).toBeNull();
    expect(parseRouterChoice("buddha", ids)).toBeNull();
    expect(parseRouterChoice("", ids)).toBeNull();
  });
});

describe("postQueryText", () => {
  it("joins title and content and caps length", () => {
    expect(postQueryText("Title", "Body")).toBe("Title\n\nBody");
    expect(postQueryText("t", "x".repeat(5000)).length).toBeLessThanOrEqual(2000);
  });
});

describe("config", () => {
  it("excludes administrative categories and has sane caps", () => {
    expect(EXCLUDED_CATEGORY_SLUGS).toContain("historical-contribution-accounting");
    expect(MAX_COMMENTS_PER_RUN).toBeGreaterThan(0);
    expect(MAX_REPLIES_PER_RUN).toBeGreaterThan(0);
  });
});

describe("elder prompts", () => {
  const prompts = [
    buildElderSystemPrompt(anastasia, []),
    buildElderSystemPrompt(yeshua, []),
    buildElderForumCommentPrompt(anastasia, []),
    buildElderForumReplyPrompt(yeshua, []),
  ];

  it("carry the elder's own voice and the shared writing rules", () => {
    expect(buildElderSystemPrompt(yeshua, [])).toContain(yeshua.voice);
    expect(buildElderSystemPrompt(anastasia, [])).toContain(anastasia.voice);
    for (const p of prompts) expect(p).toContain(ELDER_WRITING_RULES);
  });

  it("forum prompts carry the PASS decline mechanism and crisis handling", () => {
    for (const p of [buildElderForumCommentPrompt(anastasia, []), buildElderForumReplyPrompt(yeshua, [])]) {
      expect(p).toContain(FORUM_PASS_TOKEN);
      expect(p.toLowerCase()).toContain("crisis");
    }
  });

  it("never name the source authors in the elders' own instructions (ADR-22 option B)", () => {
    for (const p of prompts) {
      expect(p).not.toMatch(/Megre/i);
      expect(p).not.toMatch(/Szekely|Székely/i);
      expect(p.includes("—")).toBe(false); // hard no-em-dash rule
    }
  });
});
