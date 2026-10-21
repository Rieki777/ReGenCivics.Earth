import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { isDeadlock, withDeadlockRetry } from "./deadlock-retry";

/** A driver error as mysql2 throws it. */
function driverError(code: string, errno: number) {
  return Object.assign(new Error(`${code} from the server`), { code, errno });
}

/**
 * The error campaigns.updateDraft threw in CI run 38711957492: tRPC's error,
 * wrapping drizzle's "Failed query", wrapping the driver's ER_LOCK_DEADLOCK.
 */
function asCiSawIt(driver: Error) {
  const failedQuery = new Error("Failed query: update `campaign_items` set ...", { cause: driver });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: failedQuery.message, cause: failedQuery });
}

const deadlock = () => asCiSawIt(driverError("ER_LOCK_DEADLOCK", 1213));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("isDeadlock", () => {
  it("knows a deadlock rollback however deeply it is wrapped", () => {
    expect(isDeadlock(driverError("ER_LOCK_DEADLOCK", 1213))).toBe(true);
    expect(isDeadlock(new Error("Failed query", { cause: driverError("ER_LOCK_DEADLOCK", 1213) }))).toBe(true);
    expect(isDeadlock(deadlock())).toBe(true);
    // MariaDB's snapshot isolation rolls back the same way.
    expect(isDeadlock(asCiSawIt(driverError("ER_CHECKREAD", 1020)))).toBe(true);
  });

  it("leaves every other error alone", () => {
    expect(isDeadlock(asCiSawIt(driverError("ER_LOCK_WAIT_TIMEOUT", 1205)))).toBe(false);
    expect(isDeadlock(asCiSawIt(driverError("ER_DUP_ENTRY", 1062)))).toBe(false);
    expect(isDeadlock(new TRPCError({ code: "CONFLICT", message: "Someone just changed this campaign." }))).toBe(false);
    expect(isDeadlock(new Error("plain"))).toBe(false);
    for (const nothing of [null, undefined, "ER_LOCK_DEADLOCK", 1213]) expect(isDeadlock(nothing)).toBe(false);
  });
});

describe("withDeadlockRetry", () => {
  it("runs the transaction again after a deadlock and returns what the next run returns", async () => {
    const run = vi.fn().mockRejectedValueOnce(deadlock()).mockResolvedValueOnce("saved");
    await expect(withDeadlockRetry("test", run, { pauseMs: 0 })).resolves.toBe("saved");
    expect(run).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain("test: rolled back to end a deadlock, running it again (2 of 3)");
  });

  it("stops after three runs and throws the last deadlock", async () => {
    const last = deadlock();
    const run = vi.fn().mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(last);
    await expect(withDeadlockRetry("test", run, { pauseMs: 0 })).rejects.toBe(last);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("never runs again for any other error", async () => {
    for (const error of [
      new TRPCError({ code: "CONFLICT", message: "Someone just changed this campaign. Refresh and try again." }),
      new TRPCError({ code: "BAD_REQUEST", message: "A need isn't part of this campaign." }),
      asCiSawIt(driverError("ER_LOCK_WAIT_TIMEOUT", 1205)),
    ]) {
      const run = vi.fn().mockRejectedValue(error);
      await expect(withDeadlockRetry("test", run, { pauseMs: 0 })).rejects.toBe(error);
      expect(run).toHaveBeenCalledTimes(1);
    }
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("pauses longer before each run after the first", async () => {
    vi.useFakeTimers();
    // The random part at its smallest: 100ms, then 200ms.
    vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const run = vi.fn().mockRejectedValueOnce(deadlock()).mockRejectedValueOnce(deadlock()).mockResolvedValueOnce("saved");
      const result = withDeadlockRetry("test", run, { pauseMs: 100 });
      await vi.advanceTimersByTimeAsync(99);
      expect(run).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(run).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(199);
      expect(run).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(run).toHaveBeenCalledTimes(3);
      await expect(result).resolves.toBe("saved");
    } finally {
      vi.useRealTimers();
    }
  });
});
