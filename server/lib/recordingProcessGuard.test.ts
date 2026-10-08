import { describe, expect, it, vi } from "vitest";
import { isRecordingQuotaStop, recordRecordingCrash } from "./recordingProcessGuard";

describe("per-recording pipeline failures", () => {
  it("counts one row's transcript save failure and still runs the next row", async () => {
    const markFailure = vi.fn(async () => {});
    const seen: number[] = [];
    const rows = [
      { id: 39, attempts: 0 },
      { id: 40, attempts: 1 },
    ];
    for (const row of rows) {
      seen.push(row.id);
      try {
        if (row.id === 39) throw new Error("Data too long for column 'transcript' at row 39");
      } catch (error) {
        await recordRecordingCrash({
          recordingId: row.id,
          attempts: row.attempts,
          error,
          markFailure,
        });
      }
    }
    expect(seen).toEqual([39, 40]);
    expect(markFailure).toHaveBeenCalledTimes(1);
    expect(markFailure).toHaveBeenCalledWith(39, 0, expect.stringContaining("transcript"));
  });

  it("does not count a YouTube quotaExceeded response as an attempt", async () => {
    const markFailure = vi.fn(async () => {});
    const error = "owner captions HTTP 403 {\"error\":{\"errors\":[{\"reason\":\"quotaExceeded\"}]}}";
    expect(isRecordingQuotaStop(error)).toBe(true);
    const logged: string[] = [];
    const result = await recordRecordingCrash({
      recordingId: 39,
      attempts: 4,
      error: new Error(error),
      markFailure,
      log: (line) => logged.push(line),
    });
    expect(markFailure).not.toHaveBeenCalled();
    expect(result).toContain("quotaExceeded");
    expect(logged[0]).toContain("attempt not counted");
  });
});
