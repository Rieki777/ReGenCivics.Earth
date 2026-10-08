import { describe, expect, it } from "vitest";
import {
  CAPTION_RETRY_DELAYS_MS,
  MAX_PROCESS_ATTEMPTS,
  FALSE_NOT_ENDED_ERROR,
  captionRetryDespiteWatch,
  compareRetryQueue,
  effectiveRetryAttempts,
  nextProcessRetry,
  recordingNeedsAutoRetry,
} from "./recordingRetry";

const NOW = new Date("2026-10-07T20:00:00.000Z");

describe("nextProcessRetry", () => {
  it("waits 15 minutes, 1 hour, 6 hours, then 24 hours", () => {
    expect(nextProcessRetry(1, NOW)?.toISOString()).toBe("2026-10-07T20:15:00.000Z");
    expect(nextProcessRetry(2, NOW)?.toISOString()).toBe("2026-10-07T21:00:00.000Z");
    expect(nextProcessRetry(3, NOW)?.toISOString()).toBe("2026-10-08T02:00:00.000Z");
    expect(nextProcessRetry(4, NOW)?.toISOString()).toBe("2026-10-08T20:00:00.000Z");
    expect(CAPTION_RETRY_DELAYS_MS).toHaveLength(4);
  });

  it("stops after the last try", () => {
    expect(nextProcessRetry(MAX_PROCESS_ATTEMPTS, NOW)).toBeNull();
    expect(MAX_PROCESS_ATTEMPTS).toBe(5);
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

  it("queues a saved recording that has never been retried", () => {
    expect(recordingNeedsAutoRetry({ ...base, processAttempts: 0, nextRetryAt: null }, NOW)).toBe(true);
  });

  it("stops when a hand-written summary is already stored", () => {
    expect(recordingNeedsAutoRetry({ ...base, aiSummary: "We covered the incubator." }, NOW)).toBe(false);
  });

  it("waits until nextRetryAt", () => {
    expect(
      recordingNeedsAutoRetry({ ...base, nextRetryAt: new Date("2026-10-07T21:00:00.000Z") }, NOW),
    ).toBe(false);
  });

  it("does not wait when the last miss was a finished livestream marked none", () => {
    expect(
      recordingNeedsAutoRetry(
        {
          ...base,
          processAttempts: 2,
          nextRetryAt: new Date("2026-10-08T09:02:00.000Z"),
          lastError: FALSE_NOT_ENDED_ERROR,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("stops after the attempt cap", () => {
    expect(recordingNeedsAutoRetry({ ...base, processAttempts: MAX_PROCESS_ATTEMPTS }, NOW)).toBe(false);
  });
});

describe("caption retry queue", () => {
  it("fetches captions when the watch page is a bot wall or already ended", () => {
    expect(captionRetryDespiteWatch({ status: "unknown" })).toBe("fetch");
    expect(captionRetryDespiteWatch({ status: "ok", liveBroadcastContent: "none" })).toBe("fetch");
    expect(captionRetryDespiteWatch({ status: "ok", liveBroadcastContent: "live" })).toBe("wait");
    expect(captionRetryDespiteWatch({ status: "ok", liveBroadcastContent: "upcoming" })).toBe("wait");
  });

  it("puts never-tried newest recordings ahead of older misses", () => {
    const rows = [
      { id: 3, processAttempts: 0 },
      { id: 56, processAttempts: 0 },
      { id: 57, processAttempts: 0 },
      { id: 40, processAttempts: 2 },
    ];
    expect(rows.sort(compareRetryQueue).map((row) => row.id)).toEqual([57, 56, 3, 40]);
  });

  it("puts the edited cut and the false not-ended livestream in the next pair", () => {
    const rows = [
      { id: 40, processAttempts: 0, lastError: null },
      { id: 56, processAttempts: 2, lastError: FALSE_NOT_ENDED_ERROR },
      { id: 57, processAttempts: 0, lastError: null },
      { id: 3, processAttempts: 2, lastError: FALSE_NOT_ENDED_ERROR },
    ];
    const queued = rows
      .map((row) => ({ ...row, processAttempts: effectiveRetryAttempts(row) }))
      .sort(compareRetryQueue)
      .slice(0, 2)
      .map((row) => row.id);
    expect(queued).toEqual([57, 56]);
  });
});
