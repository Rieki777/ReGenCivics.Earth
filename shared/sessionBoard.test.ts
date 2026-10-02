/**
 * Session boards: the shape of each week, the facilitator's actions, the
 * shared breath and the cleaners (shared/sessionBoard.ts, ADR-68).
 */
import { describe, expect, it } from "vitest";
import {
  BOARD_LIMITS,
  applyBoardAction,
  boardIdentity,
  boardStages,
  boardWelcome,
  breathAt,
  cleanBoardLine,
  cleanBoardText,
  defaultBoardState,
  hasSessionBoard,
  normalizeBoardState,
  parseReadyList,
  sessionBoardHref,
  shareTime,
  voteTarget,
} from "./sessionBoard";

describe("which weeks have a board", () => {
  it("weeks 2 to 13 do, Selection Day and anything else does not", () => {
    expect(hasSessionBoard(1)).toBe(false);
    expect(hasSessionBoard(2)).toBe(true);
    expect(hasSessionBoard(13)).toBe(true);
    expect(hasSessionBoard(14)).toBe(false);
    expect(hasSessionBoard(2.5)).toBe(false);
    expect(hasSessionBoard(Number.NaN)).toBe(false);
    expect(sessionBoardHref(2)).toBe("/season2/week/2");
  });
});

describe("the stages", () => {
  it("week 2 puts Village OS between the open season and the circle (Rye, 2026-10-01)", () => {
    const kinds = boardStages(2).map((s) => s.kind);
    expect(kinds).toEqual(["welcome", "breath", "open", "villageos", "circle", "harvest", "game", "ahead", "close"]);
  });

  it("every week's plan fills the two-hour session exactly", () => {
    for (let w = 2; w <= 13; w++) {
      expect(boardStages(w).reduce((a, s) => a + s.min, 0), `week ${w}`).toBe(120);
    }
  });

  it("every stage has a name, a short label, a line and at least one cue", () => {
    for (let w = 2; w <= 13; w++) {
      for (const s of boardStages(w)) {
        expect(s.name && s.short && s.line).toBeTruthy();
        expect(s.cues.length).toBeGreaterThan(0);
      }
    }
  });

  it("welcomes read the curriculum's title, week 2 with its own words", () => {
    expect(boardWelcome(2).title).toBe("Incubator Overview");
    expect(boardWelcome(3).title).toBe("Game & Organisation Co-Creation Part 1");
    expect(boardWelcome(3).lede.length).toBeGreaterThan(20);
  });

  it("no em-dashes in anything the room reads", () => {
    const copy = [2, 3].flatMap((w) => [
      ...boardStages(w).flatMap((s) => [s.name, s.short, s.line, ...s.cues]),
      boardWelcome(w).lede,
      ...boardWelcome(w).leaveWith,
    ]);
    for (const line of copy) expect(line).not.toContain("—");
  });
});

describe("the facilitator's actions", () => {
  const t0 = 1_800_000_000_000;
  const base = defaultBoardState(2);

  it("going past the welcome starts the session clock once", () => {
    const a = applyBoardAction(base, { type: "go", stage: 1 }, t0);
    expect(a.stage).toBe(1);
    expect(a.stageStartedAt).toBe(t0);
    expect(a.sessionStartedAt).toBe(t0);
    const b = applyBoardAction(a, { type: "go", stage: 3 }, t0 + 60_000);
    expect(b.sessionStartedAt).toBe(t0);
    expect(b.stageStartedAt).toBe(t0 + 60_000);
  });

  it("clamps the stage to the board", () => {
    expect(applyBoardAction(base, { type: "go", stage: 99 }, t0).stage).toBe(base.plan.length - 1);
    expect(applyBoardAction(base, { type: "go", stage: -4 }, t0).stage).toBe(0);
  });

  it("does not mutate the state it was given", () => {
    const copy = JSON.parse(JSON.stringify(base));
    applyBoardAction(base, { type: "plan", stage: 0, minutes: 9 }, t0);
    applyBoardAction(base, { type: "timer", op: "start" }, t0);
    expect(base).toEqual(copy);
  });

  it("the share timer starts, pauses with the time kept, and resets", () => {
    let s = applyBoardAction(base, { type: "speaker", projectId: 7 }, t0);
    s = applyBoardAction(s, { type: "timer", op: "start" }, t0);
    s = applyBoardAction(s, { type: "timer", op: "pause" }, t0 + 30_000);
    expect(s.speaker.accum).toBe(30);
    expect(shareTime(s.speaker, t0 + 99_000)).toEqual({ used: 30, left: 150 });
    s = applyBoardAction(s, { type: "timer", op: "start" }, t0 + 100_000);
    expect(shareTime(s.speaker, t0 + 110_000).used).toBe(40);
    s = applyBoardAction(s, { type: "speaker", projectId: 8 }, t0 + 120_000);
    expect(s.speaker).toMatchObject({ projectId: 8, accum: 0, startedAt: null });
  });

  it("changing the breath pattern stops the breath; running stamps it", () => {
    let s = applyBoardAction(base, { type: "breath", run: true }, t0);
    expect(s.breath.startedAt).toBe(t0);
    expect(s.sessionStartedAt).toBe(t0);
    s = applyBoardAction(s, { type: "breath", pattern: "box" }, t0 + 5_000);
    expect(s.breath).toMatchObject({ pattern: "box", startedAt: null });
  });

  it("keeps planned minutes and share length inside their bounds", () => {
    expect(applyBoardAction(base, { type: "plan", stage: 4, minutes: 0 }, t0).plan[4]).toBe(1);
    expect(applyBoardAction(base, { type: "plan", stage: 4, minutes: 999 }, t0).plan[4]).toBe(BOARD_LIMITS.maxStageMinutes);
    expect(applyBoardAction(base, { type: "shareSecs", secs: 5 }, t0).speaker.secs).toBe(BOARD_LIMITS.minShareSecs);
  });
});

describe("reading a stored state back", () => {
  it("falls back to the default for junk", () => {
    expect(normalizeBoardState("not json", 2)).toEqual(defaultBoardState(2));
    expect(normalizeBoardState(null, 3)).toEqual(defaultBoardState(3));
    expect(normalizeBoardState({ stage: "x", plan: "y", breath: 3 }, 2)).toEqual(defaultBoardState(2));
  });

  it("keeps good values and clamps bad ones", () => {
    const s = normalizeBoardState(JSON.stringify({ stage: 50, plan: [7, -3], breath: { pattern: "nope", rounds: 6 }, speaker: { projectId: 4, secs: 9999 } }), 2);
    expect(s.stage).toBe(8);
    expect(s.plan[0]).toBe(7);
    expect(s.plan[1]).toBe(1);
    expect(s.breath.pattern).toBe("settle");
    expect(s.speaker.projectId).toBe(4);
    expect(s.speaker.secs).toBe(BOARD_LIMITS.maxShareSecs);
  });
});

describe("the shared breath", () => {
  const t0 = 1_800_000_000_000;
  it("is idle until started and done after the last round", () => {
    expect(breathAt({ pattern: "settle", rounds: 2, startedAt: null }, t0)).toEqual({ idle: true });
    expect(breathAt({ pattern: "settle", rounds: 2, startedAt: t0 }, t0 + 20_000)).toEqual({ done: true });
  });
  it("walks the pattern: in for 4, out for 6", () => {
    const b = { pattern: "settle" as const, rounds: 2, startedAt: t0 };
    expect(breathAt(b, t0 + 1_000)).toMatchObject({ round: 1, kind: "in", label: "Breathe in", secondsLeft: 3 });
    expect(breathAt(b, t0 + 5_000)).toMatchObject({ round: 1, kind: "out" });
    expect(breathAt(b, t0 + 11_000)).toMatchObject({ round: 2, kind: "in" });
  });
});

describe("cleaning what people type", () => {
  it("folds a line to one line, drops hidden characters, trims to the limit", () => {
    const zw = String.fromCodePoint(0x200b);
    const rlo = String.fromCodePoint(0x202e);
    expect(cleanBoardLine(`  more ${zw}hands\n\non ${rlo}the build  `, 300)).toBe("more hands on the build");
    expect(cleanBoardLine("   ", 300)).toBeNull();
    expect(cleanBoardLine(undefined, 300)).toBeNull();
    expect(cleanBoardLine("abcdef", 3)).toBe("abc");
  });
  it("keeps line breaks in longer text, at most one blank line", () => {
    expect(cleanBoardText("one\r\n\r\n\r\n\r\ntwo", 100)).toBe("one\n\ntwo");
  });
  it("keeps only known readiness keys, once each", () => {
    expect(parseReadyList("legal,legal,bogus, land", ["legal", "land"])).toEqual(["legal", "land"]);
    expect(parseReadyList(null, ["legal"])).toEqual([]);
  });
});

describe("who wrote it", () => {
  it("a signed-in player by id, a guest by a well-formed browser key, otherwise nobody", () => {
    expect(boardIdentity(12, "sabcdef123456")).toBe("u:12");
    expect(boardIdentity(null, "sabcdef123456")).toBe("k:sabcdef123456");
    expect(boardIdentity(null, "short")).toBeNull();
    expect(boardIdentity(null, "bad key with spaces")).toBeNull();
    expect(voteTarget.item(5)).toBe("item:5");
    expect(voteTarget.week(9)).toBe("week:9");
  });
});
