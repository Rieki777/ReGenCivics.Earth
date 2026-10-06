/**
 * Session boards: the shape of each week, the facilitator's actions, the
 * shared breath and the cleaners (shared/sessionBoard.ts, ADR-68).
 */
import { describe, expect, it } from "vitest";
import {
  BOARD_LIMITS,
  BOARD_OFFERS,
  BOARD_OFFER_KEYS,
  TOGETHER_COPY,
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
  sessionBoardShareUrl,
  sessionClosedAt,
  sessionElapsedMs,
  sessionMinutes,
  shareTime,
  voteTarget,
} from "./sessionBoard";
import { OFFER_FORBIDDEN_WORDS, VILLAGE_OS_OFFER } from "./villageOsOffer";

describe("which weeks have a board", () => {
  it("weeks 2 to 13 do, Selection Day and anything else does not", () => {
    expect(hasSessionBoard(1)).toBe(false);
    expect(hasSessionBoard(2)).toBe(true);
    expect(hasSessionBoard(13)).toBe(true);
    expect(hasSessionBoard(14)).toBe(false);
    expect(hasSessionBoard(2.5)).toBe(false);
    expect(hasSessionBoard(Number.NaN)).toBe(false);
    expect(sessionBoardHref(2)).toBe("/season2/week/2");
    expect(sessionBoardShareUrl(2)).toBe("https://regencivics.earth/season2/week/2");
    expect(sessionBoardShareUrl(7)).toBe("https://regencivics.earth/season2/week/7");
  });
});

describe("the stages", () => {
  it("week 2 puts Village OS, then A Game we build together, between the open season and the circle (Rye, 2026-10-01 and 10-05)", () => {
    const kinds = boardStages(2).map((s) => s.kind);
    expect(kinds).toEqual(["welcome", "breath", "open", "villageos", "together", "circle", "harvest", "game", "ahead", "close", "getvillageos"]);
    expect(boardStages(2).find((s) => s.kind === "together")?.name).toBe(TOGETHER_COPY.title);
  });

  it("only week 2 has the together stage, so only its board takes hands to coach or build", () => {
    for (let w = 3; w <= 13; w++) expect(boardStages(w).some((s) => s.kind === "together"), `week ${w}`).toBe(false);
    expect(BOARD_OFFER_KEYS).toEqual(["coach", "build"]);
    expect(voteTarget.offer("coach")).toBe("offer:coach");
    // Fits the votes table's target column (VARCHAR(32)).
    for (const k of BOARD_OFFER_KEYS) expect(voteTarget.offer(k).length).toBeLessThanOrEqual(32);
  });

  it("the together stage's words follow the writing rules", () => {
    const words: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") words.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(TOGETHER_COPY);
    walk(BOARD_OFFERS);
    expect(words.length).toBeGreaterThan(10);
    for (const line of words) {
      expect(line).not.toContain("—");
      expect(line).not.toMatch(/\b(journey|foster|unlock|nurture|empower|leverage|seamless|delve|robust)\b/i);
    }
  });

  it("total equals the sum of every stage's minutes", () => {
    for (let w = 2; w <= 13; w++) {
      const stages = boardStages(w);
      const mins = stages.map((s) => s.min);
      const sum = mins.reduce((a, m) => a + m, 0);
      expect(sum, `week ${w} default`).toBe(121);
      expect(sessionMinutes(mins, stages), `week ${w}`).toBe(sum);
      expect(sessionMinutes(defaultBoardState(w).plan, stages), `week ${w} board`).toBe(sum);
      expect(stages.filter((s) => s.kind === "getvillageos"), `week ${w}`).toHaveLength(1);
    }
  });

  it("counts Get your Village OS, and a stage added after it", () => {
    const stages = boardStages(2);
    const live = [5, 8, 10, 10, 5, 42, 12, 15, 7, 3, 6];
    expect(sessionMinutes(live, stages)).toBe(123);
    const extra = { ...stages[stages.length - 1], name: "One more page", min: 4 };
    const withExtra = [...stages, extra];
    expect(sessionMinutes([...live, extra.min], withExtra)).toBe(127);
  });

  it("the last stage of every week is Get your Village OS, one minute, after the close (ADR-69)", () => {
    for (let w = 2; w <= 13; w++) {
      const stages = boardStages(w);
      const last = stages[stages.length - 1];
      expect(last.kind, `week ${w}`).toBe("getvillageos");
      expect(last.min, `week ${w}`).toBe(1);
      expect(last.name).toBe(VILLAGE_OS_OFFER.board.title);
      expect(stages[stages.length - 2].kind, `week ${w}`).toBe("close");
    }
  });

  it("the Village OS page says nothing about money, since the board is public and recorded", () => {
    const words = [
      ...boardStages(2).filter((s) => s.kind === "getvillageos").flatMap((s) => [s.name, s.short, s.line, ...s.cues]),
      ...Object.values(VILLAGE_OS_OFFER.board),
    ];
    for (const line of words) {
      expect(line).not.toMatch(/\$|\bgift|\bdonat|\bpay|\bmoney|\bmember/i);
      for (const re of OFFER_FORBIDDEN_WORDS) expect(line).not.toMatch(re);
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
    expect(boardWelcome(2).leaveWith).toContain("Some projects at the table, and where each one is");
    expect(boardWelcome(3).leaveWith[0]).toBe("Where the projects at the table are this week");
    const leave = [2, 3, 13].flatMap((w) => boardWelcome(w).leaveWith).join(" ");
    expect(leave).not.toMatch(/every project at the table/i);
    expect(leave).not.toMatch(/where every project is/i);
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

  it("ends when the presenter ends it, or when the planned length passes, and the clock stops there", () => {
    const started = applyBoardAction(base, { type: "startSession" }, t0);
    const planned = sessionMinutes(started.plan, boardStages(2)) * 60_000;
    expect(sessionClosedAt(started, planned, t0 + 60_000)).toBeNull();
    expect(sessionElapsedMs(started, planned, t0 + planned + 90_000)).toBe(planned);
    expect(sessionClosedAt(started, planned, t0 + planned)).toBe(t0 + planned);
    const ended = applyBoardAction(started, { type: "endSession" }, t0 + 1_000);
    expect(ended.endedAt).toBe(t0 + 1_000);
    expect(sessionClosedAt(ended, planned, t0 + 50_000)).toBe(t0 + 1_000);
    expect(sessionElapsedMs(ended, planned, t0 + 50_000)).toBe(1_000);
    const restarted = applyBoardAction(ended, { type: "restartClocks" }, t0 + 80_000);
    expect(restarted.sessionStartedAt).toBeNull();
    expect(restarted.endedAt).toBeNull();
    expect(sessionClosedAt(restarted, planned, t0 + 90_000)).toBeNull();
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
    expect(s.stage).toBe(boardStages(2).length - 1);
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
