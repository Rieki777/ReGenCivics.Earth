import { describe, expect, it } from "vitest";
import {
  ACTIVE_SEASON,
  SEASON_SCHEDULES,
  clockIn,
  clockShift,
  hourLabel,
  listJoin,
  nextSessionWeek,
  overdueOffsets,
  pacificClockChange,
  parseClosesAt,
  parseOfferedTimes,
  parseSlotTime,
  parseToggle,
  planSeasonMoves,
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
} from "./seasonSchedule";
import { SEASON2_EPISODE_DATES, catalogOpenAccessRows, sessionStartUtc } from "./sessionClock";
import { DEFAULT_SLOT_HOURS, INTEROP_CIRCLE_MINUTES, buildSlot, circleWeekKey, pacificYmd, slotStartInWeek } from "./interopCircle";

const S2 = SEASON_SCHEDULES["Season 2"];
const TUE_2PM: SeasonSlotTime = { key: "tue", hourPT: 14 };
const SAT_11AM: SeasonSlotTime = { key: "sat", hourPT: 11 };
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
    expect(seasonSettingKey("Season 2", "closes_at")).toBe("season_schedule:season-2:closes_at");
  });

  it("knows the active Season and nothing it was not given", () => {
    expect(seasonConfig(ACTIVE_SEASON)).toBe(S2);
    expect(seasonConfig("toString")).toBeNull();
    expect(seasonConfig("Season 9")).toBeNull();
  });
});

describe("Season 2's offer meets Rye's brief (2026-09-28)", () => {
  it("offers one weekend day and three weekdays, and keeps the opening time on the ballot", () => {
    const offered = S2.offered.map((o) => seasonSlot(o.key, o.hourPT));
    expect(offered.filter((o) => o.weekend)).toHaveLength(1);
    expect(offered.filter((o) => !o.weekend)).toHaveLength(3);
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

  it("closes the first round on Thursday, October 1 at 5pm Pacific", () => {
    expect(S2.closesAt.toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });
});

describe("weeks and sessions", () => {
  it("keeps a moved session inside its own Monday-to-Sunday week", () => {
    // Week 3 was published for Saturday, October 10. Tuesday of that week is October 6.
    expect(seasonSessionStart(S2, 3, TUE_2PM)!.toISOString()).toBe("2026-10-06T21:00:00.000Z");
    // Week 13's last day stays inside December 14 to 20, before the solstice.
    expect(seasonSessionStart(S2, 13, { key: "wed", hourPT: 10 })!.toISOString()).toBe("2026-12-16T18:00:00.000Z");
  });

  it("follows Pacific wall time across the November clock change", () => {
    // Week 7: Tuesday, November 3, 2pm PST is 22:00 UTC, an hour later in UTC than in October.
    expect(seasonSessionStart(S2, 7, TUE_2PM)!.toISOString()).toBe("2026-11-03T22:00:00.000Z");
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

  it("gives ties to the earlier day, unless the current time is in the tie", () => {
    expect(seasonLeader({ tue: 2, wed: 2 }, offered, "sat")).toBe("tue");
    expect(seasonLeader({ tue: 2, sat: 2 }, offered, "sat")).toBe("sat");
    expect(seasonLeader({ wed: 3, sat: 1 }, offered, "sat")).toBe("wed");
    expect(seasonLeader({}, offered, "sat")).toBeNull();
  });

  it("ignores hands for a time that is not on offer", () => {
    expect(seasonLeader({ mon: 9, thu: 1 }, offered, "sat")).toBe("thu");
  });

  it("holds the current time while the vote is open, and follows the leader once it closes", () => {
    const base = { pinned: null, leader: "wed" as const, applied: null, opening: SAT_11AM, offered };
    expect(resolveSeasonSlot({ ...base, closed: false })).toEqual(SAT_11AM);
    expect(resolveSeasonSlot({ ...base, closed: true })).toEqual({ key: "wed", hourPT: 10 });
  });

  it("stays on the applied time when the vote reopens, and when it closes with no hands", () => {
    const applied = { key: "wed" as const, hourPT: 10 };
    expect(resolveSeasonSlot({ pinned: null, leader: "thu", closed: false, applied, opening: SAT_11AM, offered })).toEqual(applied);
    expect(resolveSeasonSlot({ pinned: null, leader: null, closed: true, applied, opening: SAT_11AM, offered })).toEqual(applied);
  });

  it("lets a pin override everything, and ignores a pin for a time no longer offered", () => {
    expect(resolveSeasonSlot({ pinned: "thu", leader: "wed", closed: true, applied: null, opening: SAT_11AM, offered }))
      .toEqual({ key: "thu", hourPT: 12 });
    expect(resolveSeasonSlot({ pinned: "fri", leader: "wed", closed: true, applied: null, opening: SAT_11AM, offered }))
      .toEqual({ key: "wed", hourPT: 10 });
  });

  it("counts hands and projects, and lists each person once", () => {
    const tally = tallySeasonVotes(
      [
        { slots: "tue,sat", displayName: "Maya", projectName: "Rainbow Bridge Hawaii" },
        { slots: "tue", displayName: "Kai", projectName: "rainbow bridge hawaii" },
        { slots: "tue,wed", displayName: null, projectName: null },
        { slots: "mon", displayName: "Off the ballot", projectName: null },
        { slots: "sat", displayName: "Maya", projectName: "Rainbow Bridge Hawaii" },
      ],
      offered,
      keep,
    );
    const tue = tally.slots.find((s) => s.key === "tue")!;
    expect(tue.hands).toBe(3);
    expect(tue.projects).toBe(1);
    expect(tue.names).toEqual(["Rainbow Bridge Hawaii (Maya)", "rainbow bridge hawaii (Kai)"]);
    const sat = tally.slots.find((s) => s.key === "sat")!;
    expect(sat.hands).toBe(2);
    expect(sat.names).toEqual(["Rainbow Bridge Hawaii (Maya)"]);
    expect(tally.voters).toBe(4);
    expect(tally.slots.map((s) => s.key)).toEqual(["tue", "wed", "thu", "sat"]);
  });
});

describe("the register and the notes", () => {
  const onlyHttp = (raw: string | null | undefined) => (raw && /^https?:\/\//.test(raw) ? raw : null);

  it("lists each project once, with its link and everyone who named it", () => {
    const entries = seasonRegister(
      [
        { slots: "tue", displayName: "Maya", projectName: "Rainbow Bridge Hawaii", projectUrl: null },
        { slots: "", displayName: "Kai", projectName: "rainbow bridge hawaii", projectUrl: "https://rainbowbridge.example" },
        { slots: "wed", displayName: "Ana", projectName: null, projectUrl: "https://aquarella.example" },
        { slots: "sat", displayName: "Just a name", projectName: null, projectUrl: null },
        { slots: "thu", displayName: null, projectName: "Sneaky", projectUrl: "javascript:alert(1)" },
      ],
      keep,
      onlyHttp,
    );
    expect(entries).toEqual([
      { project: "Rainbow Bridge Hawaii", names: "Maya, Kai", url: "https://rainbowbridge.example" },
      { project: null, names: "Ana", url: "https://aquarella.example" },
      { project: "Sneaky", names: null, url: null },
    ]);
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

  it("moves every week outside the freeze window when the vote closes", () => {
    const moves = planSeasonMoves(S2, rows, TUE_2PM, S2.closesAt);
    // Week 1 is done and Week 2 (Saturday, October 3) is inside 72 hours.
    expect(moves.map((m) => m.week)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(moves[0].to.toISOString()).toBe("2026-10-06T21:00:00.000Z");
  });

  it("moves nothing when the vote keeps the opening time", () => {
    expect(planSeasonMoves(S2, rows, SAT_11AM, S2.closesAt)).toEqual([]);
  });

  it("never moves a session into the freeze window", () => {
    // Sunday, October 4: Tuesday, October 6 is two days out, so Week 3 stays on Saturday.
    const moves = planSeasonMoves(S2, rows, TUE_2PM, new Date("2026-10-04T19:00:00Z"));
    expect(moves[0].week).toBe(4);
  });

  it("leaves edited and cancelled sessions alone", () => {
    const edited = rows.map((r) =>
      r.week === 5 ? { ...r, manualOverride: true } : r.week === 6 ? { ...r, status: "cancelled" } : r,
    );
    const weeks = planSeasonMoves(S2, edited, TUE_2PM, S2.closesAt).map((m) => m.week);
    expect(weeks).not.toContain(5);
    expect(weeks).not.toContain(6);
  });

  it("marks only the reminders that would go out late with the wrong day count", () => {
    const newStart = new Date("2026-10-06T21:00:00Z");
    expect(overdueOffsets([10080, 1440, 60, 33], newStart, S2.closesAt)).toEqual([10080]);
    expect(overdueOffsets([1440, 60, 33], newStart, S2.closesAt)).toEqual([]);
  });
});

describe("stored settings", () => {
  it("falls back to the Season's times on a bad or empty setting", () => {
    expect(parseOfferedTimes("not json", S2.offered).map((s) => s.key)).toEqual(["tue", "wed", "thu", "sat"]);
    expect(parseOfferedTimes("[]", S2.offered)).toHaveLength(4);
    expect(parseOfferedTimes(null, S2.offered)).toHaveLength(4);
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

  it("round-trips offers, applied times and close dates", () => {
    const raw = serializeOfferedTimes([{ key: "thu", hourPT: 12 }, { key: "tue", hourPT: 14 }]);
    expect(parseOfferedTimes(raw, []).map((s) => s.key)).toEqual(["tue", "thu"]);
    expect(parseSlotTime(serializeSlotTime({ key: "wed", hourPT: 10 }))).toEqual({ key: "wed", hourPT: 10 });
    expect(parseSlotTime("{bad")).toBeNull();
    expect(parseClosesAt("2026-10-03T00:00:00.000Z", S2.closesAt).toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(parseClosesAt("soon", S2.closesAt)).toBe(S2.closesAt);
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
    ]);
  });

  it("says when a zone's date is not Pacific's", () => {
    expect(clockIn(new Date("2026-10-07T05:00:00Z"), "America/Sao_Paulo")).toBe("2am next day");
  });

  it("finds the clock change and the zones it moves", () => {
    const starts = [3, 4, 5, 6, 7, 8].map((w) => seasonSessionStart(S2, w, TUE_2PM)!);
    const shift = clockShift(starts);
    expect(shift?.from.toISOString()).toBe("2026-11-03T22:00:00.000Z");
    expect(shift?.zones).toEqual(["Hawaii", "Central America", "Brazil"]);
    expect(shift?.later).toBe(true);
    expect(clockShift(starts.slice(0, 3))).toBeNull();
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
