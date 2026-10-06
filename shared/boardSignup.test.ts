import { describe, expect, it } from "vitest";
import { BOARD_OFFERS, CLOSE_BOARD_CONFIRM, TOGETHER_COPY, boardStages, closedBoardBanner } from "./sessionBoard";
import {
  boardOfferInterest,
  boardSignupSource,
  boardSignupTags,
  followUpNotes,
  interestFromRole,
  isBoardHandRole,
  isBoardSignupSource,
  parseBoardSignupSource,
} from "./boardSignup";

describe("board sign-up source tag", () => {
  it("builds and parses a week tag", () => {
    expect(boardSignupSource(2)).toBe("season2-week-board:week-2");
    expect(boardSignupSource(13)).toBe("season2-week-board:week-13");
    expect(parseBoardSignupSource("season2-week-board:week-2")).toEqual({ week: 2 });
    expect(parseBoardSignupSource("  season2-week-board:week-7  ")).toEqual({ week: 7 });
    expect(parseBoardSignupSource("season2-week-board:week-1")).toBeNull();
    expect(parseBoardSignupSource("season2-week-board:week-14")).toBeNull();
    expect(parseBoardSignupSource("a friend")).toBeNull();
    expect(parseBoardSignupSource(null)).toBeNull();
    expect(isBoardSignupSource("season2-week-board:week-2")).toBe(true);
    expect(isBoardSignupSource("season2-week-board")).toBe(true);
    expect(isBoardSignupSource("something_else")).toBe(false);
  });

  it("maps the build hand to a builder, and coach to a coach", () => {
    expect(boardOfferInterest("coach")).toMatchObject({
      roleInterest: "coach",
      label: "Coach",
      tag: "coach",
    });
    expect(JSON.parse(boardOfferInterest("coach").roleArchetypes)).toEqual(["Coach"]);
    expect(boardOfferInterest("build")).toMatchObject({
      roleInterest: "builder",
      label: "Builder",
      tag: "builder",
    });
    expect(JSON.parse(boardOfferInterest("build").roleArchetypes)).toEqual(["Builder"]);
    expect(boardSignupTags(2, "build")).toEqual(["season2-week-board", "week-2", "builder"]);
    expect(boardSignupTags(2, "coach")).toEqual(["season2-week-board", "week-2", "coach"]);
    expect(interestFromRole("builder")).toBe("Builder");
    expect(interestFromRole("coach")).toBe("Coach");
    expect(interestFromRole("guide")).toBeNull();
    expect(BOARD_OFFERS.map((o) => o.key)).toEqual(["coach", "build"]);
  });

  it("the raise-a-hand hint never mentions the chat or Riverside", () => {
    const hint = TOGETHER_COPY.hands.hint;
    expect(hint.toLowerCase()).not.toContain("chat");
    expect(hint.toLowerCase()).not.toContain("riverside");
    expect(hint).not.toContain("\u2014");
    const cues = boardStages(2).find((s) => s.kind === "together")?.cues ?? [];
    expect(cues.join(" ")).toContain("The form takes names and emails");
    for (const line of cues) {
      expect(line.toLowerCase()).not.toContain("chat");
      expect(line.toLowerCase()).not.toContain("riverside");
      expect(line).not.toContain("\u2014");
    }
  });

  it("the closed-board and follow-up lines stay plain", () => {
    const lines = [
      closedBoardBanner(2),
      CLOSE_BOARD_CONFIRM,
      followUpNotes(2, "arrive"),
      "Want us to follow up?",
      "Thanks, Ada. We'll write to ada@example.com.",
    ];
    for (const line of lines) {
      expect(line.toLowerCase()).not.toContain("riverside");
      expect(line.toLowerCase()).not.toContain("chat");
      expect(line.toLowerCase()).not.toContain("everything is free");
      expect(line).not.toContain("\u2014");
    }
    expect(followUpNotes(2, "arrive")).toBe("Left on the week 2 board after: an arrival word");
    expect(isBoardHandRole("coach")).toBe(true);
    expect(isBoardHandRole("builder")).toBe(true);
    expect(isBoardHandRole("follow-up")).toBe(false);
  });
});
