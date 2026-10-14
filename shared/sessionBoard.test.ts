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
  followingAfterStageChoice,
  keepsFollowingRoom,
  sessionClosedAt,
  sessionElapsedMs,
  sessionMinutes,
  shareTime,
  voteTarget,
} from "./sessionBoard";
import { OFFER_FORBIDDEN_WORDS, VILLAGE_OS_OFFER } from "./villageOsOffer";
import {
  CHECKIN_COPY,
  CLOSE_COPY_WEEK3,
  ITEM_KINDS,
  NEEDS_COPY,
  NOTE_ITEM_KINDS,
  OPTION_KEY_RE,
  PROMPT_COPY,
  PROMPT_KEY_RE,
  STAGE_KINDS,
  STAGE_RENDERERS,
  TELL_US_COPY,
  WEEK3_DECK,
  anonymousKeys,
  askBlock,
  canAskFrom,
  fillCopy,
  foldProjectName,
  isPlaceholderSlideId,
  isPromptRef,
  maxTextFor,
  parseAskBlock,
  parseTileRef,
  promptHomes,
  promptsForWeek,
  resolvedPrompts,
  slideHref,
  stageSlides,
  tileRef,
  type BoardPrompt,
} from "./sessionBoard";
import { episodeByWeek } from "./season2Curriculum";

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
      // Week 3 is its own design at 120 minutes (WEEK3_BOARD_SPEC_V1 section 2); the rest stay 121.
      expect(sum, `week ${w} default`).toBe(w === 3 ? 120 : 121);
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
    expect(boardWelcome(3).leaveWith[0]).toBe("Your project's human needs, with three seeds planted at its heart");
    expect(boardWelcome(4).leaveWith[0]).toBe("Where the projects at the table are this week");
    const leave = [2, 3, 13].flatMap((w) => boardWelcome(w).leaveWith).join(" ");
    expect(leave).not.toMatch(/every project at the table/i);
    expect(leave).not.toMatch(/where every project is/i);
  });

  it("no em-dashes in anything the room reads", () => {
    const copy = [2, 3, 4].flatMap((w) => [
      ...boardStages(w).flatMap((s) => [s.name, s.short, s.line, ...s.cues]),
      boardWelcome(w).lede,
      ...boardWelcome(w).leaveWith,
    ]);
    for (const line of copy) {
      expect(line).not.toContain(String.fromCodePoint(0x2014));
      expect(line).not.toContain(String.fromCodePoint(0x2013));
    }
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

describe("following the room", () => {
  it("stays on the stage someone picked once the session has ended", () => {
    expect(keepsFollowingRoom({
      boardLoaded: true,
      sessionEnded: true,
      facilitator: false,
      following: true,
    })).toBe(false);
    expect(followingAfterStageChoice({
      boardLoaded: false,
      sessionEnded: false,
      facilitator: false,
      chosen: 0,
      liveStage: 0,
    })).toBe(false);
  });

  it("follows a live room, and a facilitator, until the clock ends", () => {
    expect(keepsFollowingRoom({
      boardLoaded: true,
      sessionEnded: false,
      facilitator: false,
      following: true,
    })).toBe(true);
    expect(followingAfterStageChoice({
      boardLoaded: true,
      sessionEnded: false,
      facilitator: false,
      chosen: 10,
      liveStage: 10,
    })).toBe(true);
    expect(followingAfterStageChoice({
      boardLoaded: true,
      sessionEnded: false,
      facilitator: true,
      chosen: 2,
      liveStage: 10,
    })).toBe(true);
    expect(followingAfterStageChoice({
      boardLoaded: true,
      sessionEnded: true,
      facilitator: true,
      chosen: 2,
      liveStage: 10,
    })).toBe(false);
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

/* ------------------------------------------------------------ week 3 */

const isDef = (p: BoardPrompt | { ref: string }): p is BoardPrompt => !isPromptRef(p);

/** Every string a participant reads on Week 3's board, from config and the shared copy. */
function week3Copy(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const s of boardStages(3)) {
    out.push(s.name, s.short, s.line);
    if (s.lede) out.push(s.lede);
    if (s.quote) out.push(s.quote);
    for (const n of s.notes ?? []) out.push(n);
    for (const p of s.prompts ?? []) {
      if (isDef(p)) {
        out.push(p.title);
        for (const t of [p.hint, p.placeholder, p.followup, p.full, p.link?.label]) if (t) out.push(t);
        for (const o of p.options ?? []) for (const t of [o.label, o.small, o.tip]) if (t) out.push(t);
        for (const w of p.words ?? []) out.push(w);
      } else {
        for (const t of [p.title, p.hint, p.placeholder]) if (t) out.push(t);
      }
    }
  }
  const w = boardWelcome(3);
  out.push(w.title, w.lede, ...w.leaveWith);
  walk(CHECKIN_COPY);
  walk(PROMPT_COPY);
  walk(NEEDS_COPY);
  walk(TELL_US_COPY);
  walk(CLOSE_COPY_WEEK3);
  return out;
}

describe("week 3: What your project is for (Rye, 2026-10-13)", () => {
  const stages = boardStages(3);

  it("runs the 18 stages of the run of show, 120 minutes, Village OS last", () => {
    expect(stages.map((s) => s.name)).toEqual([
      "Welcome", "Tap your project", "Drop in", "What you came for", "Why this matters now", "What it's all for",
      "What your project is for", "How deep, how wide", "Living ways", "Who meets each need", "Who decides",
      "Circles and players", "From the centre out", "Your project in one breath", "Your questions, and next week",
      "Tell us", "Close", VILLAGE_OS_OFFER.board.title,
    ]);
    expect(stages.map((s) => s.kind)).toEqual([
      "welcome", "checkin", "breath", "prompt", "prompt", "prompt", "needs", "needs", "prompt", "needs", "prompt",
      "prompt", "prompt", "needs", "prompt", "prompt", "close", "getvillageos",
    ]);
    expect(stages.map((s) => s.min)).toEqual([3, 5, 5, 4, 4, 9, 12, 11, 10, 12, 7, 8, 5, 8, 9, 4, 3, 1]);
    expect(sessionMinutes(defaultBoardState(3).plan, stages)).toBe(120);
    expect(stages.filter((s) => s.kind === "needs").map((s) => s.step)).toEqual(["pick", "depth", "meet", "room"]);
  });

  it("week 2's stages, order and minutes do not change", () => {
    expect(boardStages(2).map((s) => s.min)).toEqual([5, 8, 10, 10, 8, 42, 12, 15, 7, 3, 1]);
    expect(promptsForWeek(2).size).toBe(0);
    for (const s of boardStages(2)) {
      expect(s.prompts, s.name).toBeUndefined();
      expect(s.slides, s.name).toBeUndefined();
    }
  });

  it("stays inside the facilitator's stage cap (index 20) on every week", () => {
    for (let w = 2; w <= 13; w++) expect(boardStages(w).length, `week ${w}`).toBeLessThanOrEqual(21);
  });

  it("every kind any week uses has a component named for it", () => {
    for (const k of STAGE_KINDS) expect(STAGE_RENDERERS[k], k).toMatch(/^[A-Z]\w+$/);
    expect(new Set(Object.values(STAGE_RENDERERS)).size).toBe(STAGE_KINDS.length);
    for (let w = 2; w <= 13; w++) for (const s of boardStages(w)) expect(STAGE_KINDS).toContain(s.kind);
  });

  it("the welcome says this is Part 1 of 2, big picture first", () => {
    const w = boardWelcome(3);
    expect(w.title).toBe("Game & Organisation Co-Creation Part 1");
    expect(w.lede).toBe(
      "This is Part 1 of 2. Today we start with the big picture: the end goal, the human needs your project is here to meet. Next week we get practical and design your Game in Village OS, built from your answers today.",
    );
    expect(w.leaveWith).toHaveLength(4);
  });

  it("tap your project says where answers go, and how a guest keeps them", () => {
    const checkin = stages[1];
    expect(checkin.kind).toBe("checkin");
    expect(checkin.lede).toBe(CHECKIN_COPY.lede);
    expect(CHECKIN_COPY.saved).toBe(
      "Signed in, every answer you give is saved to your profile under Submissions, week by week. Joined as a guest? Sign in any time from this browser and your answers come with you. We read everyone's answers to shape how we build Village OS.",
    );
    expect(CHECKIN_COPY.signIn).toBe("Sign in to save these to your profile");
    expect(fillCopy(CHECKIN_COPY.picked, { name: "Toa Hermitage" })).toBe("You're with Toa Hermitage.");
  });

  it("the close says the board stays open", () => {
    const close = stages.find((s) => s.kind === "close")!;
    expect(close.lede).toContain("The board stays open. Come back any time to finish a stage.");
    expect(CLOSE_COPY_WEEK3.stats).toEqual(["Projects checked in", "Human needs named", "Seeds planted", "Questions asked"]);
    // No cue tells the facilitator to close a board: every board stays open.
    for (let w = 2; w <= 13; w++) {
      for (const s of boardStages(w)) for (const c of s.cues) expect(c, c).not.toMatch(/close (the|week \d+'s) board/i);
    }
  });

  it("prompt keys are defined once, short, lowercase, and every ref points at one defined earlier", () => {
    const seen = new Map<string, number>();
    stages.forEach((s, i) => {
      for (const p of s.prompts ?? []) {
        if (isDef(p)) {
          expect(seen.has(p.key), `key ${p.key} defined twice`).toBe(false);
          expect(p.key, p.key).toMatch(PROMPT_KEY_RE);
          expect(p.key.length).toBeLessThanOrEqual(16);
          seen.set(p.key, i);
        } else {
          expect(seen.has(p.ref), `ref ${p.ref}`).toBe(true);
          expect(seen.get(p.ref)!, `ref ${p.ref} comes after its definition`).toBeLessThan(i);
        }
      }
    });
    expect(promptsForWeek(3).size).toBe(seen.size);
    expect(promptHomes(3).get("purpose")).toBe(5);
    expect(promptHomes(3).get("g-significance")).toBe(7);
    // The per-need keys: ten each of today, goal, who it's for, and who meets it.
    for (const prefix of ["n-", "g-", "b-", "m-"]) {
      expect([...seen.keys()].filter((k) => k.startsWith(prefix)), prefix).toHaveLength(10);
    }
  });

  it("every prompt's shape holds: picks have unique options, maxes fit, the private card stays private", () => {
    for (const p of promptsForWeek(3).values()) {
      const max = p.max ?? 1;
      expect(max, p.key).toBeGreaterThanOrEqual(1);
      if (p.mode === "pick") {
        expect(p.options?.length, p.key).toBeGreaterThan(0);
        const keys = p.options!.map((o) => o.key);
        expect(new Set(keys).size, p.key).toBe(keys.length);
        for (const k of keys) expect(k, `${p.key}: ${k}`).toMatch(OPTION_KEY_RE);
        expect(max, p.key).toBeLessThanOrEqual(keys.length);
        for (const o of p.options!) expect(o.label.trim(), p.key).toBeTruthy();
      } else {
        expect(p.options, p.key).toBeUndefined();
      }
      if (p.mode === "note") expect(max, p.key).toBeLessThanOrEqual(5);
      if (p.anonymous) {
        expect(p.scope, p.key).toBe("room");
        expect(p.mode, p.key).toBe("pick");
      }
    }
    expect([...anonymousKeys(3)].sort()).toEqual(["mate", "pulse-a", "pulse-b", "useful"]);
    const priv = [...promptsForWeek(3).values()].filter((p) => p.mode === "private");
    expect(priv.map((p) => p.key)).toEqual(["feel"]);
    expect(priv[0].hint).toBe("This stays on your screen. We never save it or send it to our server.");
    expect(priv[0].words?.length).toBe(16);
    expect(promptsForWeek(3).get("top")?.max).toBe(3);
    expect(promptsForWeek(3).get("top")?.full).toBe("Three seeds each. Take one back to move it.");
  });

  it("a ref takes its definition with the stage's own words over it", () => {
    const room = resolvedPrompts(3, 13);
    expect(room).toHaveLength(1);
    expect(room[0]).toMatchObject({ key: "purpose", mode: "note", max: 1, isRef: true, title: "Polish your first line. All this is for ___" });
    expect(room[0].placeholder).toBe(promptsForWeek(3).get("purpose")?.placeholder);
    expect(resolvedPrompts(3, 14)[0]).toMatchObject({ key: "ask", mode: "ask", isRef: true });
    expect(resolvedPrompts(2, 5)).toEqual([]);
  });

  it("slides use the clean deck's numbers, and every one is in the deck's table", () => {
    const pages = WEEK3_DECK.pages;
    const numbers = Object.keys(pages).map(Number);
    expect(numbers).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
    const ids = Object.values(pages);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of stages) for (const ref of s.slides ?? []) expect(pages[ref.n], `${s.name} slide ${ref.n}`).toBeTruthy();
    const on = (name: string) => stages.find((s) => s.name === name)!.slides!.filter((r) => !r.also && !r.deeper).map((r) => r.n);
    expect(on("Welcome")).toEqual([1]);
    expect(on("Tap your project")).toEqual([2]);
    expect(on("Why this matters now")).toEqual([3]);
    expect(on("What it's all for")).toEqual([4, 5]);
    expect(on("What your project is for")).toEqual([6]);
    expect(on("How deep, how wide")).toEqual([7, 8, 13]);
    expect(on("Living ways")).toEqual([9, 11, 14, 15, 16]);
    // 18 is the land chart; 19 is its legal-structure build step (Rye kept it, legal box removed).
    expect(on("Who meets each need")).toEqual([17, 18, 19, 21, 26]);
    expect(on("Who decides")).toEqual([23, 24]);
    expect(on("Circles and players")).toEqual([25, 27, 28, 31]);
    expect(on("From the centre out")).toEqual([29, 32, 33]);
    expect(on("Your project in one breath")).toEqual([34]);
    expect(on("Your questions, and next week")).toEqual([35]);
    // The clean copy has every slide: no placeholder is left.
    for (const id of ids) expect(isPlaceholderSlideId(id), id).toBe(false);
  });

  it("a slide links into the deck by page id, and a placeholder slide shows its number with no link", () => {
    expect(isPlaceholderSlideId("NEW1")).toBe(true);
    expect(isPlaceholderSlideId("g22bfe7ee262_0_0")).toBe(false);
    expect(slideHref(3, 1)).toBe(`https://docs.google.com/presentation/d/${WEEK3_DECK.fileId}/edit#slide=id.${WEEK3_DECK.pages[1]}`);
    expect(slideHref(3, 4)).toBe(`https://docs.google.com/presentation/d/${WEEK3_DECK.fileId}/edit#slide=id.g22bfe7ee262_0_0`);
    expect(WEEK3_DECK.fileId).toBe("1JzjmHh1CuaK__jF6Uc8W1F1UFwXgbV657AxLEqftPh0");
    expect(slideHref(3, 99)).toBeNull();
    expect(slideHref(2, 1)).toBeNull();
    const living = stageSlides(3, stages[8]);
    expect(living.filter((s) => s.also).map((s) => s.n)).toEqual([10, 12]);
    expect(stageSlides(3, stages[9]).find((s) => s.deeper)?.n).toBe(20);
  });

  it("answers and questions are kinds of row; only notes go through addItem", () => {
    expect(ITEM_KINDS).toContain("ask");
    expect(ITEM_KINDS).toContain("answer");
    expect(NOTE_ITEM_KINDS).not.toContain("answer");
    expect(maxTextFor("ask")).toBe(BOARD_LIMITS.note);
    expect(maxTextFor("answer")).toBe(BOARD_LIMITS.note);
    expect(askBlock(3)).toBe("s3");
    expect(parseAskBlock("s13")).toBe(13);
    expect(parseAskBlock("aim")).toBeNull();
    expect(voteTarget.checkin(1234567890)).toBe("checkin:1234567890");
    expect(voteTarget.checkin(1234567890).length).toBeLessThanOrEqual(32);
  });

  it("a question for the wall comes only from a prompt or needs stage, so Week 2 never takes one", () => {
    const askable = stages.map((_, i) => i).filter((i) => canAskFrom(3, i));
    expect(askable).toEqual(stages.map((s, i) => (s.kind === "prompt" || s.kind === "needs" ? i : -1)).filter((i) => i >= 0));
    expect(askable).toContain(3);
    expect(canAskFrom(3, 0)).toBe(false);
    expect(canAskFrom(3, 99)).toBe(false);
    for (let i = 0; i < boardStages(2).length; i++) expect(canAskFrom(2, i), `week 2 stage ${i}`).toBe(false);
  });

  it("tell us names the next session's week, with words for when the schedule names none", () => {
    expect(fillCopy(TELL_US_COPY.topic, { week: 4 })).toBe("What do you want to dig into in Week 4?");
    expect(fillCopy(TELL_US_COPY.sent, { week: 4 })).toBe("Thank you. It's filed for Week 4.");
    expect(TELL_US_COPY.topicNext).not.toContain("{");
    expect(TELL_US_COPY.sentNext).not.toContain("{");
    expect(NEEDS_COPY.noSeeds).not.toMatch(/last stage/);
  });

  it("a check-in tile names its card, application or earlier card in one opaque string", () => {
    for (const t of [
      { from: "board" as const, cardId: 12 },
      { from: "application" as const, applicationId: 57 },
      { from: "earlier" as const, week: 2, cardId: 8 },
    ]) expect(parseTileRef(tileRef(t))).toEqual(t);
    expect(parseTileRef("x1")).toBeNull();
    expect(parseTileRef("p")).toBeNull();
    expect(parseTileRef("w2p")).toBeNull();
    expect(foldProjectName("  Toa   HERMITAGE ")).toBe("toa hermitage");
    expect(foldProjectName("Templeofroots.com")).toBe("templeofroots com");
    expect(foldProjectName("Café Tierra")).toBe(foldProjectName("cafe tierra"));
  });

  it("week 4's curriculum line says it happens in Village OS", () => {
    expect(episodeByWeek(4)?.description).toBe(
      "Putting the structure into practice in Village OS. Standing up your organisation, writing your first agreements, and deciding who decides what.",
    );
  });

  it("the copy follows the writing rules: no dashes, no banned words, no contrast framing", () => {
    const copy = week3Copy();
    expect(copy.length).toBeGreaterThan(150);
    for (const line of copy) {
      expect(line, line).not.toContain(String.fromCodePoint(0x2014));
      expect(line, line).not.toContain(String.fromCodePoint(0x2013));
      expect(line, line).not.toMatch(/\b(delve|journey|unlock|unleash|empower|seamless|tapestry|foster|leverage|nurture|robust|vibrant|crucial|embark|utilize|comprehensive|straightforward|genuinely|honestly)\b/i);
      expect(line, line).not.toMatch(/\bnot (just |only )?[\w' ]+, but\b|\bisn't about\b/i);
    }
  });

  it("says human needs, since plain needs means crowdpool asks on this site", () => {
    // The plural noun always carries "human". The singular is a verb or the stage name Rye chose,
    // and "Vitality & Survival Needs" is slide 5's own heading, as Village OS keeps it.
    for (const line of week3Copy()) {
      const bare = line.match(/(?<!human |Survival )\bneeds\b/gi) ?? [];
      expect(bare, line).toEqual([]);
    }
  });

  it("puts no money, returns or legal-structure claims on the board", () => {
    for (const line of week3Copy()) {
      // "Market: prices and trade" and "Money or tokens vote" are the deck's own options, so
      // prices and money as words are fine; amounts, returns and ownership claims are not.
      expect(line, line).not.toMatch(/\$\d|\binvest|\bprofit|\bdividend|\byield\b|\breturns?\b|\bequity\b|\bownership\b|\bPMA\b|\bLLC\b/i);
    }
  });
});
