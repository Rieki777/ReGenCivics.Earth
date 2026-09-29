import { describe, expect, it } from "vitest";
import {
  ACTIVE_SEASON,
  SEASON_LEAD_SETTLE_HOURS,
  SEASON_SCHEDULES,
  clockBlip,
  clockIn,
  clockShift,
  cleanNoteText,
  hourLabel,
  listJoin,
  nextSessionWeek,
  overdueOffsets,
  pacificClockChange,
  parseInstant,
  parseLeaderRecord,
  parseOfferedTimes,
  parseSlotTime,
  parseToggle,
  planSeasonMoves,
  publicSeasonTally,
  resolveSeasonSlot,
  seasonConfig,
  seasonLeader,
  seasonRegister,
  seasonSessionStart,
  seasonSessionsOn,
  seasonSettingKey,
  seasonSlot,
  serializeOfferedTimes,
  serializeSlotTime,
  tallySeasonVotes,
  zoneTimes,
  type SeasonRowLike,
  type SeasonSlotTime,
  type SeasonVoteRow,
} from "./seasonSchedule";
import { SEASON2_EPISODE_DATES, catalogOpenAccessRows, sessionStartUtc } from "./sessionClock";
import { DEFAULT_SLOT_HOURS, INTEROP_CIRCLE_MINUTES, buildSlot, circleWeekKey, pacificYmd, slotStartInWeek } from "./interopCircle";

const S2 = SEASON_SCHEDULES["Season 2"];
const TUE_2PM: SeasonSlotTime = { key: "tue", hourPT: 14 };
const SAT_11AM: SeasonSlotTime = { key: "sat", hourPT: 11 };
const HOUR = 3_600_000;
const keep = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

function hourIn(d: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(d));
}

describe("slots and labels", () => {
  it("derives every label from the weekday and hour", () => {
    expect(seasonSlot("wed", 10).label).toBe("Wednesdays at 10am Pacific");
    expect(seasonSlot("tue", 14).hour).toBe("2pm");
    expect(seasonSlot("sat", 11).weekend).toBe(true);
    expect(seasonSlot("thu", 12).weekend).toBe(false);
    expect(hourLabel(12)).toBe("12pm");
    expect(hourLabel(0)).toBe("12am");
    expect(seasonSlot("mon", 99).hourPT).toBe(23);
  });

  it("names settings per Season", () => {
    expect(seasonSettingKey("Season 2", "offered")).toBe("season_schedule:season-2:offered");
    expect(seasonSettingKey("Season 2", "follows_from")).toBe("season_schedule:season-2:follows_from");
  });

  it("knows the active Season and nothing it was not given", () => {
    expect(seasonConfig(ACTIVE_SEASON)).toBe(S2);
    expect(seasonConfig("toString")).toBeNull();
    expect(seasonConfig("Season 9")).toBeNull();
  });
});

describe("Season 2's offer meets Rye's brief (2026-09-28)", () => {
  it("offers one weekend day and four weekdays, and keeps the opening time on the ballot", () => {
    const offered = S2.offered.map((o) => seasonSlot(o.key, o.hourPT));
    expect(offered.filter((o) => o.weekend)).toHaveLength(1);
    expect(offered.filter((o) => !o.weekend)).toHaveLength(4);
    expect(offered.some((o) => o.key === S2.opening.key && o.hourPT === S2.opening.hourPT)).toBe(true);
  });

  it("starts no earlier than 7am in Hawaii and ends by 9pm in Brazil, before and after the clock change", () => {
    for (const slot of S2.offered) {
      for (let week = 2; week <= S2.weeks.length; week++) {
        const start = seasonSessionStart(S2, week, slot)!;
        const end = new Date(start.getTime() + S2.minutes * 60_000);
        expect(hourIn(start, "Pacific/Honolulu"), `${slot.key} week ${week} Hawaii`).toBeGreaterThanOrEqual(7);
        expect(hourIn(end, "America/Sao_Paulo"), `${slot.key} week ${week} Brazil end`).toBeLessThanOrEqual(21);
      }
    }
  });

  it("offers weekday times that start in the early evening in Central Europe every week", () => {
    // "One more time that also works for them": the projects in Italy and Spain.
    // Early evening means a 6pm to 8pm start; Thursday at noon Pacific is 9pm there.
    const europe = S2.offered.filter((slot) => {
      if (slot.key === "sat" || slot.key === "sun") return false;
      for (let week = 2; week <= S2.weeks.length; week++) {
        const h = hourIn(seasonSessionStart(S2, week, slot)!, "Europe/Rome");
        if (h < 18 || h > 20) return false;
      }
      return true;
    });
    expect(europe.map((s) => s.key)).toEqual(["wed", "fri"]);
  });

  it("never overlaps an Open Access session", () => {
    const open = catalogOpenAccessRows();
    for (const slot of S2.offered) {
      for (let week = 2; week <= S2.weeks.length; week++) {
        const start = seasonSessionStart(S2, week, slot)!.getTime();
        const end = start + S2.minutes * 60_000;
        for (const oa of open) {
          const overlaps = start < oa.endTime.getTime() && oa.startTime.getTime() < end;
          expect(overlaps, `${slot.key} week ${week} vs Open Access ${oa.date}`).toBe(false);
        }
      }
    }
  });

  it("never overlaps a slot the Circle offers by default", () => {
    for (const slot of S2.offered) {
      for (let week = 2; week <= S2.weeks.length; week++) {
        const start = seasonSessionStart(S2, week, slot)!;
        const end = start.getTime() + S2.minutes * 60_000;
        for (const c of DEFAULT_SLOT_HOURS) {
          const circle = slotStartInWeek(buildSlot(c.key, c.hourPT), circleWeekKey(start)).getTime();
          const circleEnd = circle + INTEROP_CIRCLE_MINUTES * 60_000;
          expect(start.getTime() < circleEnd && circle < end, `${slot.key} week ${week} vs Circle ${c.key}`).toBe(false);
        }
      }
    }
  });

  it("decides the next session and the weekly time on Thursday, October 1 at 5pm Pacific", () => {
    expect(S2.followsFrom.toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });

  it("stays anonymous until seven projects have voted", () => {
    expect(S2.revealNamesAt).toBe(7);
  });

  it("keeps sessions off Thanksgiving and Christmas, at the same time that week", () => {
    // Week 9's window is Saturday, November 21 to Friday, November 27.
    // Thursday wins: Thanksgiving becomes Monday, November 23 at 12pm PST.
    expect(seasonSessionStart(S2, 9, { key: "thu", hourPT: 12 })!.toISOString()).toBe("2026-11-23T20:00:00.000Z");
    // Friday wins: the day after becomes Monday too, at 10am PST.
    expect(seasonSessionStart(S2, 9, { key: "fri", hourPT: 10 })!.toISOString()).toBe("2026-11-23T18:00:00.000Z");
    // Week 13's window runs to Friday, December 25: Christmas Eve and Day become Monday, December 21.
    expect(seasonSessionStart(S2, 13, { key: "thu", hourPT: 12 })!.toISOString()).toBe("2026-12-21T20:00:00.000Z");
    expect(seasonSessionStart(S2, 13, { key: "fri", hourPT: 10 })!.toISOString()).toBe("2026-12-21T18:00:00.000Z");
    // Every other day stays where it was.
    expect(seasonSessionStart(S2, 9, SAT_11AM)!.toISOString()).toBe("2026-11-21T19:00:00.000Z");
    expect(seasonSessionStart(S2, 10, { key: "thu", hourPT: 12 })!.toISOString()).toBe("2026-12-03T20:00:00.000Z");
    expect(seasonSessionStart(S2, 13, { key: "wed", hourPT: 10 })!.toISOString()).toBe("2026-12-23T18:00:00.000Z");
    expect(S2.rescheduleNote).toMatch(/Thanksgiving/);
    expect(S2.rescheduleNote).toMatch(/Christmas/);
  });
});

describe("weeks and sessions", () => {
  it("meets on the chosen day on or after each week's Saturday: this Saturday, or beyond", () => {
    // Week 2 was published for Saturday, October 3. If Saturday wins, it stays there.
    expect(seasonSessionStart(S2, 2, SAT_11AM)!.toISOString()).toBe("2026-10-03T18:00:00.000Z");
    // Any other day starts the week after: Tuesday, October 6 at 2pm PDT.
    expect(seasonSessionStart(S2, 2, TUE_2PM)!.toISOString()).toBe("2026-10-06T21:00:00.000Z");
    expect(seasonSessionStart(S2, 2, { key: "fri", hourPT: 10 })!.toISOString()).toBe("2026-10-09T17:00:00.000Z");
    // And every week after keeps the rhythm.
    expect(seasonSessionStart(S2, 3, TUE_2PM)!.toISOString()).toBe("2026-10-13T21:00:00.000Z");
  });

  it("follows Pacific wall time across the November clock change", () => {
    // Week 7 (Saturday, November 7): Tuesday, November 10, 2pm PST is 22:00 UTC.
    expect(seasonSessionStart(S2, 7, TUE_2PM)!.toISOString()).toBe("2026-11-10T22:00:00.000Z");
  });

  it("puts every week on the opening time exactly where the old fixed clock did", () => {
    const sessions = seasonSessionsOn(S2, S2.opening);
    expect(sessions).toHaveLength(SEASON2_EPISODE_DATES.length);
    sessions.forEach((s, i) => {
      expect(s.start.toISOString()).toBe(sessionStartUtc(SEASON2_EPISODE_DATES[i]).toISOString());
      expect(s.end.getTime() - s.start.getTime()).toBe(2 * 3_600_000);
    });
  });

  it("returns null past the last week", () => {
    expect(seasonSessionStart(S2, 14, TUE_2PM)).toBeNull();
    expect(seasonSessionStart(S2, 0, TUE_2PM)).toBeNull();
  });
});

describe("the vote", () => {
  const offered = S2.offered;
  const followsFromMs = S2.followsFrom.getTime();
  const now = followsFromMs + 48 * HOUR;
  const base = {
    pinned: null,
    leader: "wed" as const,
    leaderSince: now - 30 * HOUR,
    following: true,
    followsFromMs,
    applied: null,
    opening: SAT_11AM,
    offered,
    nowMs: now,
  };

  it("gives ties to the earlier day, unless the current time is in the tie", () => {
    expect(seasonLeader({ tue: 2, wed: 2 }, offered, "sat")).toBe("tue");
    expect(seasonLeader({ tue: 2, sat: 2 }, offered, "sat")).toBe("sat");
    expect(seasonLeader({ wed: 3, sat: 1 }, offered, "sat")).toBe("wed");
    expect(seasonLeader({}, offered, "sat")).toBeNull();
  });

  it("ignores hands for a time that is not on offer", () => {
    expect(seasonLeader({ mon: 9, thu: 1 }, offered, "sat")).toBe("thu");
  });

  it("holds the current time until the vote decides", () => {
    expect(resolveSeasonSlot({ ...base, following: false })).toEqual(SAT_11AM);
    expect(resolveSeasonSlot(base)).toEqual({ key: "wed", hourPT: 10 });
  });

  it("lets the time that leads at the deadline win at once, however new its lead", () => {
    const atDeadline = { ...base, nowMs: followsFromMs + 60_000, leaderSince: followsFromMs - HOUR };
    expect(resolveSeasonSlot(atDeadline)).toEqual({ key: "wed", hourPT: 10 });
  });

  it("follows a new leader only once it has held the lead for a day, like the Circle", () => {
    const applied = { key: "wed" as const, hourPT: 10 };
    const fresh = { ...base, applied, leader: "thu" as const, leaderSince: now - (SEASON_LEAD_SETTLE_HOURS - 1) * HOUR };
    expect(resolveSeasonSlot(fresh)).toEqual(applied);
    expect(resolveSeasonSlot({ ...fresh, leaderSince: now - SEASON_LEAD_SETTLE_HOURS * HOUR })).toEqual({ key: "thu", hourPT: 12 });
    // No record of when it took the lead yet: not settled.
    expect(resolveSeasonSlot({ ...fresh, leaderSince: null })).toEqual(applied);
  });

  it("stays put with no hands, and takes a new hour on the same day at once", () => {
    const applied = { key: "wed" as const, hourPT: 9 };
    expect(resolveSeasonSlot({ ...base, leader: null, applied })).toEqual(applied);
    expect(resolveSeasonSlot({ ...base, applied, leaderSince: now })).toEqual({ key: "wed", hourPT: 10 });
  });

  it("lets a pin override everything, and ignores a pin for a time no longer offered", () => {
    expect(resolveSeasonSlot({ ...base, pinned: "thu", following: false })).toEqual({ key: "thu", hourPT: 12 });
    expect(resolveSeasonSlot({ ...base, pinned: "mon" })).toEqual({ key: "wed", hourPT: 10 });
  });

  it("reads the stored leader record, and nothing it cannot trust", () => {
    expect(parseLeaderRecord('{"slot":"thu","since":1790629133026}')).toEqual({ slot: "thu", since: 1790629133026 });
    expect(parseLeaderRecord('{"slot":"xyz","since":1}')).toBeNull();
    expect(parseLeaderRecord("{bad")).toBeNull();
    expect(parseLeaderRecord(null)).toBeNull();
  });

  it("counts each project once, gives each time its share of projects, and lists each person once", () => {
    const tally = tallySeasonVotes(
      [
        { slots: "tue,sat", displayName: "Maya", projectName: "Rainbow Bridge Hawaii" },
        { slots: "tue", displayName: "Kai", projectName: "rainbow  bridge hawaii" },
        { slots: "tue,wed", displayName: null, projectName: null },
        { slots: "mon", displayName: "Off the ballot", projectName: null },
        { slots: "sat", displayName: "Maya", projectName: "Rainbow Bridge Hawaii" },
      ],
      offered,
      keep,
    );
    // Two voting projects: Rainbow Bridge Hawaii (three people) and one hand with no project.
    expect(tally.projects).toBe(2);
    expect(tally.voters).toBe(4);
    const tue = tally.slots.find((s) => s.key === "tue")!;
    expect(tue).toMatchObject({ hands: 3, projects: 2, share: 100 });
    expect(tue.names).toEqual(["Rainbow Bridge Hawaii (Maya)", "rainbow  bridge hawaii (Kai)"]);
    expect(tally.slots.find((s) => s.key === "sat")).toMatchObject({ hands: 2, projects: 1, share: 50 });
    expect(tally.slots.find((s) => s.key === "wed")).toMatchObject({ hands: 1, projects: 1, share: 50 });
    expect(tally.slots.find((s) => s.key === "thu")).toMatchObject({ hands: 0, projects: 0, share: 0 });
    // The leader is decided by projects, so a big team cannot outvote two small ones.
    expect(tally.counts).toMatchObject({ tue: 2, wed: 1, sat: 1 });
    expect(tally.slots.map((s) => s.key)).toEqual(["tue", "wed", "thu", "fri", "sat"]);
  });

  it("lets two projects beat one project's many hands", () => {
    const tally = tallySeasonVotes(
      [
        { slots: "wed", displayName: "A", projectName: "Big Team" },
        { slots: "wed", displayName: "B", projectName: "Big Team" },
        { slots: "wed", displayName: "C", projectName: "Big Team" },
        { slots: "fri", displayName: null, projectName: "Aquarella" },
        { slots: "fri", displayName: null, projectName: "Terra Vallalta" },
      ],
      offered,
      keep,
    );
    expect(seasonLeader(tally.counts, offered, "sat")).toBe("fri");
  });

  it("shows the public only shares until seven projects have voted, then who picked each time", () => {
    const rows: SeasonVoteRow[] = ["A", "B", "C", "D", "E", "F"].map((p) => ({ slots: "wed,sat", displayName: `Person ${p}`, projectName: `Project ${p}` }));
    rows.push({ slots: "wed", displayName: "Second person", projectName: "project a" });
    const early = publicSeasonTally(tallySeasonVotes(rows, offered, keep), 7);
    expect(early.revealed).toBe(false);
    expect(early.anyVotes).toBe(true);
    // No counts and no names reach the page: only each time's share.
    for (const slot of early.slots) {
      expect(Object.keys(slot).sort()).toEqual(["key", "names", "share"]);
      expect(slot.names).toEqual([]);
    }
    expect(early.slots.find((s) => s.key === "wed")!.share).toBe(100);

    rows.push({ slots: "sat", displayName: null, projectName: "Project G" });
    const seven = publicSeasonTally(tallySeasonVotes(rows, offered, keep), 7);
    expect(seven.revealed).toBe(true);
    expect(seven.slots.find((s) => s.key === "sat")!.names).toContain("Project G");
    expect(seven.slots.find((s) => s.key === "sat")!.share).toBe(100);
    expect(seven.slots.find((s) => s.key === "wed")!.share).toBe(86);

    const none = publicSeasonTally(tallySeasonVotes([], offered, keep), 7);
    expect(none).toMatchObject({ anyVotes: false, revealed: false });
  });
});

describe("the register and the notes", () => {
  const onlyHttp = (raw: string | null | undefined) => (raw && /^https?:\/\//.test(raw) ? raw : null);

  it("lists only projects that shared a link, so it never shows who voted", () => {
    const entries = seasonRegister(
      [
        { slots: "tue", displayName: "Maya", projectName: "Rainbow Bridge Hawaii", projectUrl: null },
        { slots: "", displayName: "Kai", projectName: "rainbow bridge hawaii", projectUrl: "https://rainbowbridge.example" },
        { slots: "wed", displayName: "Ana", projectName: null, projectUrl: "https://aquarella.example" },
        { slots: "sat", displayName: "Only voted", projectName: "Quiet Project", projectUrl: null },
        { slots: "thu", displayName: null, projectName: "Sneaky", projectUrl: "javascript:alert(1)" },
      ],
      keep,
      onlyHttp,
    );
    expect(entries).toEqual([
      { project: "rainbow bridge hawaii", names: "Kai", url: "https://rainbowbridge.example" },
      { project: null, names: "Ana", url: "https://aquarella.example" },
    ]);
  });

  it("keeps a note's line breaks and strips what could disguise it on a public page", () => {
    const rlo = String.fromCodePoint(0x202e);
    const zwsp = String.fromCodePoint(0x200b);
    const nul = String.fromCodePoint(0);
    expect(cleanNoteText(`  How we${rlo} share${zwsp} land${nul}\r\n\r\n\r\n\r\nand water  `, 100)).toBe("How we share land\n\nand water");
    expect(cleanNoteText("tab\tstays", 100)).toBe("tab\tstays");
    expect(cleanNoteText("   ", 100)).toBeNull();
    expect(cleanNoteText("abcdef", 3)).toBe("abc");
  });

  it("files notes against the next session that has not started", () => {
    const rows = [
      { week: 1, start: new Date("2026-09-26T18:00:00Z"), status: "completed" },
      { week: 2, start: new Date("2026-10-03T18:00:00Z"), status: "upcoming" },
      { week: 3, start: new Date("2026-10-06T21:00:00Z"), status: "upcoming" },
      { week: 4, start: new Date("2026-10-13T21:00:00Z"), status: "cancelled" },
    ];
    expect(nextSessionWeek(rows, new Date("2026-09-28T12:00:00Z"))).toBe(2);
    // During Week 2 itself, a note is for the session after it.
    expect(nextSessionWeek(rows, new Date("2026-10-03T19:00:00Z"))).toBe(3);
    expect(nextSessionWeek(rows, new Date("2026-12-31T00:00:00Z"))).toBeNull();
  });
});

describe("moving the Season", () => {
  const rows: SeasonRowLike[] = S2.weeks.map((ymd, i) => ({
    id: 100 + i,
    week: i + 1,
    start: sessionStartUtc(ymd),
    status: i === 0 ? "completed" : "upcoming",
    manualOverride: false,
  }));

  it("moves the next session too at the first decision, since it was always up to the vote", () => {
    // No freeze at the first decision: Week 2 leaves Saturday, October 3 for Tuesday, October 6.
    const moves = planSeasonMoves(S2, rows, TUE_2PM, S2.followsFrom, 0);
    expect(moves.map((m) => m.week)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(moves[0].to.toISOString()).toBe("2026-10-06T21:00:00.000Z");
  });

  it("holds sessions inside 72 hours on any later move", () => {
    // Week 1 is done and Week 2 (Saturday, October 3) is inside 72 hours.
    const moves = planSeasonMoves(S2, rows, TUE_2PM, S2.followsFrom);
    expect(moves.map((m) => m.week)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it("moves nothing when the vote keeps the opening time", () => {
    expect(planSeasonMoves(S2, rows, SAT_11AM, S2.followsFrom, 0)).toEqual([]);
  });

  it("never moves a session into the freeze window, or one already started", () => {
    // Saturday, October 10 at 5am PDT: Week 3 starts in six hours, so it stays; Week 4 is the first to move.
    const moves = planSeasonMoves(S2, rows, TUE_2PM, new Date("2026-10-10T12:00:00Z"));
    expect(moves[0].week).toBe(4);
    // Even with no freeze, a session that has started is not moved.
    const started = planSeasonMoves(S2, rows, TUE_2PM, new Date("2026-10-03T18:30:00Z"), 0);
    expect(started.map((m) => m.week)).not.toContain(2);
  });

  it("leaves edited and cancelled sessions alone", () => {
    const edited = rows.map((r) =>
      r.week === 5 ? { ...r, manualOverride: true } : r.week === 6 ? { ...r, status: "cancelled" } : r,
    );
    const weeks = planSeasonMoves(S2, edited, TUE_2PM, S2.followsFrom).map((m) => m.week);
    expect(weeks).not.toContain(5);
    expect(weeks).not.toContain(6);
  });

  it("marks only the reminders that would go out late with the wrong day count", () => {
    const newStart = new Date("2026-10-06T21:00:00Z");
    expect(overdueOffsets([10080, 1440, 60, 33], newStart, S2.followsFrom)).toEqual([10080]);
    expect(overdueOffsets([1440, 60, 33], newStart, S2.followsFrom)).toEqual([]);
  });
});

describe("stored settings", () => {
  it("falls back to the Season's times on a bad or empty setting", () => {
    expect(parseOfferedTimes("not json", S2.offered).map((s) => s.key)).toEqual(["tue", "wed", "thu", "fri", "sat"]);
    expect(parseOfferedTimes("[]", S2.offered)).toHaveLength(5);
    expect(parseOfferedTimes(null, S2.offered)).toHaveLength(5);
  });

  it("reads a stored offer in week order and drops rows it cannot trust", () => {
    const raw = JSON.stringify([{ key: "sat", hourPT: 9 }, { key: "mon", hourPT: 13 }, { key: "xyz", hourPT: 1 }, { key: "fri", hourPT: 40 }]);
    expect(parseOfferedTimes(raw, S2.offered).map((s) => `${s.key}@${s.hourPT}`)).toEqual(["mon@13", "sat@9"]);
  });

  it("reads the Selection Day video switch, and falls back to the Season's default", () => {
    expect(parseToggle("on", false)).toBe(true);
    expect(parseToggle("off", true)).toBe(false);
    expect(parseToggle(null, true)).toBe(true);
    expect(parseToggle("maybe", false)).toBe(false);
    expect(S2.selectionVideos).toBe(true);
  });

  it("round-trips offers, applied times and the start date", () => {
    const raw = serializeOfferedTimes([{ key: "thu", hourPT: 12 }, { key: "tue", hourPT: 14 }]);
    expect(parseOfferedTimes(raw, []).map((s) => s.key)).toEqual(["tue", "thu"]);
    expect(parseSlotTime(serializeSlotTime({ key: "wed", hourPT: 10 }))).toEqual({ key: "wed", hourPT: 10 });
    expect(parseSlotTime("{bad")).toBeNull();
    expect(parseInstant("2026-10-03T00:00:00.000Z", S2.followsFrom).toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(parseInstant("soon", S2.followsFrom)).toBe(S2.followsFrom);
  });
});

describe("time zones", () => {
  it("prints one session across the cohort's zones", () => {
    const tuesday = new Date("2026-10-06T21:00:00Z");
    expect(zoneTimes(tuesday)).toEqual([
      { label: "Hawaii", time: "11am" },
      { label: "Pacific", time: "2pm" },
      { label: "Central America", time: "3pm" },
      { label: "US Central", time: "4pm" },
      { label: "Brazil", time: "6pm" },
      { label: "Central Europe", time: "11pm" },
    ]);
  });

  it("says when a zone's date is not Pacific's", () => {
    expect(clockIn(new Date("2026-10-07T05:00:00Z"), "America/Sao_Paulo")).toBe("2am next day");
  });

  it("finds the lasting clock change and the zones it moves", () => {
    const starts = [3, 4, 5, 6, 7, 8].map((w) => seasonSessionStart(S2, w, TUE_2PM)!);
    const shift = clockShift(starts);
    expect(shift?.from.toISOString()).toBe("2026-11-03T22:00:00.000Z");
    // Europe wobbles for a week and lands back where it started, so it is not a lasting shift.
    expect(shift?.zones).toEqual(["Hawaii", "Central America", "Brazil"]);
    expect(shift?.later).toBe(true);
    // October 13 and 20, before either change: nothing moves.
    expect(clockShift(starts.slice(0, 2))).toBeNull();
  });

  it("finds the week Europe is an hour off, while its clocks have changed and the US's have not", () => {
    const starts = [3, 4, 5, 6, 7, 8].map((w) => seasonSessionStart(S2, w, { key: "fri", hourPT: 10 })!);
    const blip = clockBlip(starts);
    expect(blip && pacificYmd(blip.weekOf)).toBe("2026-10-26");
    expect(blip?.zones).toEqual(["Central Europe"]);
    expect(blip?.earlier).toBe(true);
    expect(clockBlip(starts.slice(0, 3))).toBeNull();
  });

  it("names the day US clocks change inside a run of sessions", () => {
    const change = pacificClockChange(new Date("2026-10-06T21:00:00Z"), new Date("2026-11-03T22:00:00Z"));
    expect(change && pacificYmd(change)).toBe("2026-11-01");
    expect(pacificClockChange(new Date("2026-10-06T21:00:00Z"), new Date("2026-10-27T21:00:00Z"))).toBeNull();
  });

  it("joins a list the way a sentence does", () => {
    expect(listJoin(["Hawaii", "Central America", "Brazil"])).toBe("Hawaii, Central America and Brazil");
    expect(listJoin(["Hawaii"])).toBe("Hawaii");
  });
});
