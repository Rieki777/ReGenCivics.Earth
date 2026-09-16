import { describe, expect, it } from "vitest";
import {
  adminEventStatusLabel,
  deriveEventTemporalPhase,
  isEventPastForAdmin,
  partitionEventsByTemporal,
} from "./eventTemporal";

const NOW = Date.parse("2026-09-16T15:00:00.000Z");

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
});
