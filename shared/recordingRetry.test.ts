import { describe, expect, it } from "vitest";
import {
  HOURLY_ATTEMPTS,
  MAX_PROCESS_ATTEMPTS,
  nextProcessRetry,
  recordingNeedsAutoRetry,
} from "./recordingRetry";

const NOW = new Date("2026-10-07T20:00:00.000Z");

describe("nextProcessRetry", () => {
  it("waits an hour for the first 48 attempts", () => {
    const first = nextProcessRetry(1, NOW);
    const lastHourly = nextProcessRetry(HOURLY_ATTEMPTS, NOW);
    expect(first?.toISOString()).toBe("2026-10-07T21:00:00.000Z");
    expect(lastHourly?.toISOString()).toBe("2026-10-07T21:00:00.000Z");
  });

  it("waits a day for the next week of attempts", () => {
    const firstDaily = nextProcessRetry(HOURLY_ATTEMPTS + 1, NOW);
    const last = nextProcessRetry(MAX_PROCESS_ATTEMPTS, NOW);
    expect(firstDaily?.toISOString()).toBe("2026-10-08T20:00:00.000Z");
    expect(last?.toISOString()).toBe("2026-10-08T20:00:00.000Z");
  });

  it("stops after the daily window", () => {
    expect(nextProcessRetry(MAX_PROCESS_ATTEMPTS + 1, NOW)).toBeNull();
  });
});

describe("recordingNeedsAutoRetry", () => {
  const base = {
    youtubeVideoId: "23cRivDtorQ",
    transcript: null,
    overview: null,
    aiSummary: null,
    processAttempts: 2,
    nextRetryAt: null as Date | null,
  };

  it("retries a saved video with no transcript and no summary", () => {
    expect(recordingNeedsAutoRetry(base, NOW)).toBe(true);
  });

  it("stops when a hand-written summary is already stored", () => {
    expect(recordingNeedsAutoRetry({ ...base, aiSummary: "We covered the incubator." }, NOW)).toBe(false);
  });

  it("waits until nextRetryAt", () => {
    expect(
      recordingNeedsAutoRetry({ ...base, nextRetryAt: new Date("2026-10-07T21:00:00.000Z") }, NOW),
    ).toBe(false);
  });

  it("stops after the attempt cap", () => {
    expect(recordingNeedsAutoRetry({ ...base, processAttempts: MAX_PROCESS_ATTEMPTS }, NOW)).toBe(false);
  });
});
