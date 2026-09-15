import { describe, expect, it } from "vitest";
import {
  audienceModeHelp,
  canEnableAutoReminders,
  customAudienceIsSelected,
  defaultAudienceMode,
  defaultOffsetsForEvent,
  dueOffsets,
  isDuplicateKeyError,
  mergeRecipients,
  offsetSubject,
  parseAudienceConfig,
  parseOffsetMinutes,
  AUTO_REMINDER_SWEEP_MINUTES,
  CALL_START_OFFSET_MINUTES,
  DEFAULT_AUTO_REMINDER_OFFSETS,
} from "@shared/eventAutoReminders";

describe("defaultAudienceMode", () => {
  it("maps Season 2 episodes to approved land projects", () => {
    expect(defaultAudienceMode({ type: "episode", season: "Season 2" })).toBe("season2_approved");
    expect(defaultAudienceMode({ type: "episode", season: null })).toBe("season2_approved");
    expect(defaultAudienceMode({ type: "special", season: "Season 2" })).toBe("season2_approved");
  });

  it("maps open sessions, including Open Access, to the broad list", () => {
    expect(defaultAudienceMode({ type: "open", season: "Open" })).toBe("open_access");
    expect(defaultAudienceMode({ type: "open" })).toBe("open_access");
  });

  it("forces custom selection on special events with no Season 2 stamp", () => {
    expect(defaultAudienceMode({ type: "special", season: null })).toBe("custom");
    expect(defaultAudienceMode({ type: "special", season: "Investor call" })).toBe("custom");
  });
});

describe("defaultOffsetsForEvent", () => {
  it("turns the 33-minute ping on for Open Access and Season 2, and leaves custom events on the older drumbeat", () => {
    expect(defaultOffsetsForEvent({ type: "open" })).toEqual([...DEFAULT_AUTO_REMINDER_OFFSETS, CALL_START_OFFSET_MINUTES]);
    expect(defaultOffsetsForEvent({ type: "episode", season: "Season 2" })).toEqual([
      ...DEFAULT_AUTO_REMINDER_OFFSETS,
      CALL_START_OFFSET_MINUTES,
    ]);
    expect(defaultOffsetsForEvent({ type: "special", season: null })).toEqual([...DEFAULT_AUTO_REMINDER_OFFSETS]);
    expect(defaultOffsetsForEvent({ type: "special", season: null })).not.toContain(CALL_START_OFFSET_MINUTES);
  });

  it("keeps a sweep short enough that T-33 cannot slip past the call", () => {
    expect(AUTO_REMINDER_SWEEP_MINUTES).toBeLessThanOrEqual(5);
    expect(AUTO_REMINDER_SWEEP_MINUTES * 2).toBeLessThan(CALL_START_OFFSET_MINUTES);
  });
});

describe("canEnableAutoReminders", () => {
  it("allows S2 and OA without a custom config", () => {
    expect(canEnableAutoReminders("season2_approved", {})).toBe(true);
    expect(canEnableAutoReminders("open_access", undefined)).toBe(true);
  });

  it("blocks custom mode until at least one source is picked", () => {
    expect(canEnableAutoReminders("custom", {})).toBe(false);
    expect(canEnableAutoReminders("custom", { includeInvestors: false })).toBe(false);
    expect(canEnableAutoReminders("custom", { includeInvestors: true })).toBe(true);
    expect(canEnableAutoReminders("custom", { includeLoi: true })).toBe(true);
    expect(canEnableAutoReminders("custom", { includeEventSignups: true })).toBe(true);
    expect(canEnableAutoReminders("custom", { newsletterSources: ["investor_form"] })).toBe(true);
    expect(canEnableAutoReminders("custom", { applicationStatuses: ["approved"] })).toBe(true);
  });
});

describe("customAudienceIsSelected", () => {
  it("treats empty arrays as not selected", () => {
    expect(customAudienceIsSelected({ newsletterSources: [], applicationStatuses: [] })).toBe(false);
  });
});

describe("parseOffsetMinutes", () => {
  it("keeps only the allowed offsets and drops junk", () => {
    expect(parseOffsetMinutes([10080, 60, 12, "1440", 10080])).toEqual([10080, 1440, 60]);
    expect(parseOffsetMinutes('["10080",60]')).toEqual([10080, 60]);
    expect(parseOffsetMinutes([10080, CALL_START_OFFSET_MINUTES, 12])).toEqual([10080, CALL_START_OFFSET_MINUTES]);
    expect(parseOffsetMinutes("not-json")).toEqual([]);
    expect(parseOffsetMinutes(null)).toEqual([]);
  });
});

describe("parseAudienceConfig", () => {
  it("keeps known sources and statuses and drops the rest", () => {
    const parsed = parseAudienceConfig({
      newsletterSources: ["homepage", "not-a-source", "investor_form"],
      applicationStatuses: ["approved", "draft", "active"],
      includeInvestors: true,
      includeLoi: "yes",
      includeEventSignups: false,
    });
    expect(parsed.newsletterSources).toEqual(["homepage", "investor_form"]);
    expect(parsed.applicationStatuses).toEqual(["approved", "active"]);
    expect(parsed.includeInvestors).toBe(true);
    expect(parsed.includeLoi).toBe(false);
    expect(parsed.includeEventSignups).toBe(false);
  });
});

describe("dueOffsets", () => {
  const start = new Date("2026-09-20T18:00:00Z");

  it("returns nothing before the first offset is due", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-10T18:00:00Z"),
      offsetsMinutes: DEFAULT_AUTO_REMINDER_OFFSETS,
      alreadySent: [],
    })).toEqual([]);
  });

  it("fires the 7d offset once that window opens, not the later ones", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-13T18:00:00Z"),
      offsetsMinutes: DEFAULT_AUTO_REMINDER_OFFSETS,
      alreadySent: [],
    })).toEqual([7 * 24 * 60]);
  });

  it("skips offsets already claimed and still fires later ones", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-19T18:00:00Z"),
      offsetsMinutes: DEFAULT_AUTO_REMINDER_OFFSETS,
      alreadySent: [7 * 24 * 60],
    })).toEqual([24 * 60]);
  });

  it("does not send after the event has started", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-20T18:00:01Z"),
      offsetsMinutes: DEFAULT_AUTO_REMINDER_OFFSETS,
      alreadySent: [],
    })).toEqual([]);
  });

  it("catches up a newly enabled 7d reminder that is already inside the window", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-19T12:00:00Z"),
      offsetsMinutes: [7 * 24 * 60, 60],
      alreadySent: [],
    })).toEqual([7 * 24 * 60]);
  });

  it("fires the 33-minute offset at T-33 and not a minute earlier", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-20T17:26:00Z"),
      offsetsMinutes: [CALL_START_OFFSET_MINUTES],
      alreadySent: [],
    })).toEqual([]);
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-20T17:27:00Z"),
      offsetsMinutes: [CALL_START_OFFSET_MINUTES],
      alreadySent: [],
    })).toEqual([CALL_START_OFFSET_MINUTES]);
  });

  it("still sends a 33-minute reminder that became overdue inside the pre-start window", () => {
    expect(dueOffsets({
      startTime: start,
      now: new Date("2026-09-20T17:40:00Z"),
      offsetsMinutes: [CALL_START_OFFSET_MINUTES, 60],
      alreadySent: [60],
    })).toEqual([CALL_START_OFFSET_MINUTES]);
  });
});

describe("mergeRecipients", () => {
  it("lowercases, trims, drops invalid, and keeps the first name", () => {
    const merged = mergeRecipients([
      [{ email: " Ada@Farm.example ", name: "Ada" }, { email: "bad", name: "X" }],
      [{ email: "ada@farm.example", name: "Other" }, { email: "bo@land.example", name: null }],
    ]);
    expect(merged).toEqual([
      { email: "ada@farm.example", name: "Ada" },
      { email: "bo@land.example", name: "bo" },
    ]);
  });
});

describe("offsetSubject", () => {
  it("names the remaining time in the subject", () => {
    expect(offsetSubject("Selection Day", 24 * 60)).toBe("Reminder: Selection Day is tomorrow");
    expect(offsetSubject("Selection Day", 60)).toBe("Starting soon: Selection Day");
    expect(offsetSubject("Selection Day", CALL_START_OFFSET_MINUTES)).toBe("Starting in 33 minutes: Selection Day");
  });
});

describe("isDuplicateKeyError", () => {
  it("recognizes MySQL duplicate-key codes used for the send ledger", () => {
    expect(isDuplicateKeyError({ code: "ER_DUP_ENTRY" })).toBe(true);
    expect(isDuplicateKeyError({ code: "OTHER" })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });
});

describe("audienceModeHelp", () => {
  it("states the S2 and OA resolutions in admin copy", () => {
    expect(audienceModeHelp("season2_approved")).toMatch(/approved or active/i);
    expect(audienceModeHelp("open_access")).toMatch(/newsletter/i);
  });
});
