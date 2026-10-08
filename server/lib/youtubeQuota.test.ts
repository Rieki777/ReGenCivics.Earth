import { afterEach, describe, expect, it } from "vitest";
import {
  YOUTUBE_CAPTION_DOWNLOADS_PER_RUN,
  YOUTUBE_QUOTA_STOP_ERROR,
  beginYoutubeQuotaRun,
  isYoutubeQuotaExceeded,
  nextMidnightPacific,
  noteYoutubeQuotaExceeded,
  resetYoutubeQuotaForTests,
  takeCaptionDownloadSlot,
  youtubeDataApiBlocked,
} from "./youtubeQuota";

afterEach(() => {
  resetYoutubeQuotaForTests();
});

describe("youtube quota", () => {
  it("stops Data API calls until the next midnight Pacific", () => {
    const now = new Date("2026-10-08T16:41:00.000Z");
    expect(nextMidnightPacific(now).toISOString()).toBe("2026-10-09T07:00:00.000Z");
    expect(isYoutubeQuotaExceeded(403, '{"error":{"errors":[{"reason":"quotaExceeded"}]}}')).toBe(true);
    expect(isYoutubeQuotaExceeded(403, "forbidden")).toBe(false);
    expect(isYoutubeQuotaExceeded(400, "quotaExceeded")).toBe(false);

    noteYoutubeQuotaExceeded(now);
    expect(youtubeDataApiBlocked(now.getTime())).toBe(YOUTUBE_QUOTA_STOP_ERROR);
    expect(youtubeDataApiBlocked(new Date("2026-10-09T06:59:00.000Z").getTime())).toBe(YOUTUBE_QUOTA_STOP_ERROR);
    beginYoutubeQuotaRun();
    expect(youtubeDataApiBlocked(new Date("2026-10-09T06:59:00.000Z").getTime())).toBe(YOUTUBE_QUOTA_STOP_ERROR);
    expect(youtubeDataApiBlocked(new Date("2026-10-09T07:00:00.000Z").getTime())).toBeNull();
  });

  it("allows two caption downloads per run and then stops", () => {
    beginYoutubeQuotaRun();
    expect(takeCaptionDownloadSlot()).toBe(true);
    expect(takeCaptionDownloadSlot()).toBe(true);
    expect(takeCaptionDownloadSlot()).toBe(false);
    expect(YOUTUBE_CAPTION_DOWNLOADS_PER_RUN).toBe(2);
    beginYoutubeQuotaRun();
    expect(takeCaptionDownloadSlot()).toBe(true);
  });
});
