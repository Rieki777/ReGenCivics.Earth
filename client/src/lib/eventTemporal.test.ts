import { describe, expect, it } from "vitest";
import {
  adminEventStatusLabel,
  deriveEventTemporalPhase,
  formatDurationSeconds,
  isEventPastForAdmin,
  isScheduleEventPast,
  partitionEventsByTemporal,
  resolveWatchUrl,
  eventHasWatchPath,
  toMs,
  truncateOneLine,
} from "./eventTemporal";

const NOW = Date.parse("2026-09-16T15:00:00.000Z");

describe("toMs", () => {
  it("parses ISO strings", () => {
    expect(toMs("2026-05-01T18:00:00.000Z")).toBe(Date.parse("2026-05-01T18:00:00.000Z"));
  });

  it("parses MySQL DATETIME as UTC", () => {
    expect(toMs("2026-05-01 18:00:00")).toBe(Date.parse("2026-05-01T18:00:00.000Z"));
    expect(toMs("2026-05-01T18:00:00")).toBe(Date.parse("2026-05-01T18:00:00.000Z"));
  });


  it("parses date-only and HH:MM MySQL-ish strings as UTC", () => {
    expect(toMs("2026-05-01")).toBe(Date.parse("2026-05-01T00:00:00.000Z"));
    expect(toMs("2026-05-01 18:00")).toBe(Date.parse("2026-05-01T18:00:00.000Z"));
  });

  it("accepts Date instances", () => {
    expect(toMs(new Date("2026-05-01T18:00:00.000Z"))).toBe(Date.parse("2026-05-01T18:00:00.000Z"));
  });

  it("accepts epoch milliseconds and seconds", () => {
    const ms = Date.parse("2026-05-01T18:00:00.000Z");
    expect(toMs(ms)).toBe(ms);
    expect(toMs(Math.floor(ms / 1000))).toBe(ms);
    expect(toMs(String(ms))).toBe(ms);
  });

  it("returns null for garbage", () => {
    expect(toMs(null)).toBeNull();
    expect(toMs("")).toBeNull();
    expect(toMs("not-a-date")).toBeNull();
    expect(toMs(Number.NaN)).toBeNull();
  });
});

describe("deriveEventTemporalPhase", () => {
  it("marks future starts as upcoming", () => {
    expect(
      deriveEventTemporalPhase(
        { startTime: "2026-09-20T18:00:00.000Z", endTime: "2026-09-20T19:00:00.000Z" },
        NOW,
      ),
    ).toBe("upcoming");
  });

  it("marks in-progress windows as live", () => {
    expect(
      deriveEventTemporalPhase(
        { startTime: "2026-09-16T14:00:00.000Z", endTime: "2026-09-16T16:00:00.000Z" },
        NOW,
      ),
    ).toBe("live");
  });

  it("marks ended events as past even when DB status is still upcoming", () => {
    expect(
      deriveEventTemporalPhase(
        {
          startTime: "2026-05-01T18:00:00.000Z",
          endTime: "2026-05-01T19:00:00.000Z",
          status: "upcoming",
        },
        NOW,
      ),
    ).toBe("past");
  });

  it("treats start-only events as past after start (no endTime)", () => {
    expect(
      deriveEventTemporalPhase(
        { startTime: "2026-09-10T18:00:00.000Z", status: "upcoming" },
        NOW,
      ),
    ).toBe("past");
  });

  it("handles MySQL datetime strings and numeric epochs as past", () => {
    expect(
      deriveEventTemporalPhase({ startTime: "2026-05-01 18:00:00", status: "upcoming" }, NOW),
    ).toBe("past");
    const ms = Date.parse("2026-05-01T18:00:00.000Z");
    expect(deriveEventTemporalPhase({ startTime: ms, status: "upcoming" }, NOW)).toBe("past");
    expect(deriveEventTemporalPhase({ start_time: ms }, NOW)).toBe("past");
  });
});

describe("adminEventStatusLabel", () => {
  it("keeps cancelled", () => {
    expect(
      adminEventStatusLabel(
        { startTime: "2026-09-20T18:00:00.000Z", status: "cancelled" },
        NOW,
      ),
    ).toBe("cancelled");
  });

  it("shows completed for past rows stuck on upcoming", () => {
    expect(
      adminEventStatusLabel(
        { startTime: "2026-09-01T18:00:00.000Z", status: "upcoming" },
        NOW,
      ),
    ).toBe("completed");
  });

  it("honours DB completed status", () => {
    expect(
      adminEventStatusLabel(
        { startTime: "2026-09-20T18:00:00.000Z", status: "completed" },
        NOW,
      ),
    ).toBe("completed");
  });
});

describe("partitionEventsByTemporal", () => {
  it("groups and sorts upcoming ascending, past descending", () => {
    const { upcoming, past } = partitionEventsByTemporal(
      [
        { id: 1, startTime: "2026-05-01T18:00:00.000Z", status: "upcoming" },
        { id: 2, startTime: "2026-09-20T18:00:00.000Z", status: "upcoming" },
        { id: 3, startTime: "2026-09-10T18:00:00.000Z", status: "upcoming" },
        { id: 4, startTime: "2026-10-01T18:00:00.000Z", status: "upcoming" },
      ],
      NOW,
    );
    expect(upcoming.map((e) => e.id)).toEqual([2, 4]);
    expect(past.map((e) => e.id)).toEqual([3, 1]);
    expect(isEventPastForAdmin(past[0], NOW)).toBe(true);
  });

  it("partitions weird startTime shapes into Past", () => {
    const { upcoming, past } = partitionEventsByTemporal(
      [
        { id: 1, startTime: "2026-05-01 18:00:00", status: "upcoming" },
        { id: 2, startTime: Date.parse("2026-05-15T12:00:00.000Z"), status: "upcoming" },
        { id: 3, start_time: "2026-10-01T18:00:00.000Z", status: "upcoming" },
      ],
      NOW,
    );
    expect(past.map((e) => e.id).sort()).toEqual([1, 2]);
    expect(upcoming.map((e) => e.id)).toEqual([3]);
  });
});


describe("isScheduleEventPast", () => {
  it("treats completed and cancelled as past even with future start", () => {
    expect(
      isScheduleEventPast(
        { startTime: "2026-10-01T18:00:00.000Z", status: "completed" },
        NOW,
      ),
    ).toBe(true);
    expect(
      isScheduleEventPast(
        { startTime: "2026-10-01T18:00:00.000Z", status: "cancelled" },
        NOW,
      ),
    ).toBe(true);
  });

  it("uses endTime when present (same as admin)", () => {
    expect(
      isScheduleEventPast(
        {
          startTime: "2026-09-16T14:00:00.000Z",
          endTime: "2026-09-16T16:00:00.000Z",
          status: "upcoming",
        },
        NOW,
      ),
    ).toBe(false); // still live at NOW=15:00Z
    expect(
      isScheduleEventPast(
        {
          startTime: "2026-09-16T12:00:00.000Z",
          endTime: "2026-09-16T14:00:00.000Z",
          status: "upcoming",
        },
        NOW,
      ),
    ).toBe(true);
  });
});

describe("resolveWatchUrl", () => {
  it("prefers editedYoutubeUrl over raw youtube and riverside", () => {
    expect(
      resolveWatchUrl({
        editedYoutubeUrl: "https://youtu.be/edited",
        youtubeUrl: "https://youtu.be/raw",
        riversideUrl: "https://riverside.fm/x",
        eventYoutubeUrl: "https://youtu.be/event",
      }),
    ).toBe("https://youtu.be/edited");
  });

  it("falls back through youtube → riverside → event", () => {
    expect(
      resolveWatchUrl({
        youtubeUrl: "https://youtu.be/raw",
        riversideUrl: "https://riverside.fm/x",
        eventYoutubeUrl: "https://youtu.be/event",
      }),
    ).toBe("https://youtu.be/raw");
    expect(
      resolveWatchUrl({
        riversideUrl: "https://riverside.fm/x",
        eventYoutubeUrl: "https://youtu.be/event",
      }),
    ).toBe("https://riverside.fm/x");
    expect(resolveWatchUrl({ eventYoutubeUrl: "https://youtu.be/event" })).toBe(
      "https://youtu.be/event",
    );
    expect(resolveWatchUrl({})).toBeNull();
  });
});

describe("truncateOneLine / formatDurationSeconds", () => {
  it("truncates with ellipsis", () => {
    expect(truncateOneLine("short")).toBe("short");
    expect(truncateOneLine("x".repeat(200), 20)?.endsWith("…")).toBe(true);
    expect(truncateOneLine("   ")).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDurationSeconds(65)).toBe("1:05");
    expect(formatDurationSeconds(3661)).toBe("1:01:01");
    expect(formatDurationSeconds(null)).toBeNull();
  });
});

describe("eventHasWatchPath", () => {
  it("is true with recordingId or youtubeUrl", () => {
    expect(eventHasWatchPath({ recordingId: 3 })).toBe(true);
    expect(eventHasWatchPath({ youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" })).toBe(true);
    expect(eventHasWatchPath({})).toBe(false);
    expect(eventHasWatchPath({ recordingId: null, youtubeUrl: "  " })).toBe(false);
  });
});
