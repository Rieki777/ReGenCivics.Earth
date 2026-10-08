import { describe, expect, it, vi } from "vitest";
import {
  RECORDING_MAIL_TOO_OLD_LOG,
  applyRecordingMailEffect,
  recordingIsRecentEnough,
  recordingMailEffect,
  recordingTitleNeedsReview,
} from "./recordingMailGuard";

const NOW = new Date("2026-10-08T16:41:00.000Z");
const RECENT = new Date("2026-10-07T16:00:00.000Z");
const OLD = new Date("2024-03-29T15:00:00.000Z");

function effect(overrides: Partial<Parameters<typeof recordingMailEffect>[0]> = {}) {
  return recordingMailEffect({
    title: "Intro: ReGen Civics QUESTS & GAMES",
    sessionDate: RECENT,
    createdAt: RECENT,
    now: NOW,
    batchesThisRun: 0,
    batchesLast24h: 0,
    automatic: true,
    ...overrides,
  });
}

describe("recording title guard", () => {
  it("holds missing, short, and numeric titles", () => {
    expect(recordingTitleNeedsReview(null)).toBe(true);
    expect(recordingTitleNeedsReview("")).toBe(true);
    expect(recordingTitleNeedsReview("3")).toBe(true);
    expect(recordingTitleNeedsReview("54")).toBe(true);
    expect(recordingTitleNeedsReview("Recording ready: 4")).toBe(true);
    expect(recordingTitleNeedsReview("Recording ready: 54")).toBe(true);
    expect(recordingTitleNeedsReview("Intro: ReGen Civics QUESTS & GAMES")).toBe(false);
    expect(recordingTitleNeedsReview("S2E2")).toBe(false);
  });
});

describe("recording age guard", () => {
  it("requires both the session date and the ingest time inside 3 days", () => {
    expect(recordingIsRecentEnough({ sessionDate: RECENT, createdAt: RECENT, now: NOW })).toBe(true);
    expect(recordingIsRecentEnough({ sessionDate: null, createdAt: RECENT, now: NOW })).toBe(true);
    expect(recordingIsRecentEnough({ sessionDate: OLD, createdAt: RECENT, now: NOW })).toBe(false);
    expect(recordingIsRecentEnough({ sessionDate: RECENT, createdAt: OLD, now: NOW })).toBe(false);
    expect(recordingIsRecentEnough({ sessionDate: RECENT, createdAt: null, now: NOW })).toBe(false);
  });
});

describe("recording mail effect", () => {
  it("sends a new recording with a real title under the cap", () => {
    expect(effect().type).toBe("send");
  });

  it("skips an old row before the title check", () => {
    const decision = effect({ title: "54", sessionDate: OLD, createdAt: OLD });
    expect(decision).toEqual({ type: "skip_old", log: "skipped: too old" });
  });

  it("holds a new numeric title for review", () => {
    expect(effect({ title: "7" })).toEqual({
      type: "needs_review",
      reason: "title",
      lastError: "needs review: title",
    });
  });

  it("holds the second batch in one run and the third in a day", () => {
    expect(effect({ batchesThisRun: 1 }).type).toBe("needs_review");
    expect(effect({ batchesLast24h: 2 })).toMatchObject({ reason: "cap" });
    expect(effect({ batchesThisRun: 0, batchesLast24h: 1 }).type).toBe("send");
  });

  it("lets an admin send an old recording and still blocks a bad title", () => {
    expect(effect({ automatic: false, sessionDate: OLD, createdAt: OLD }).type).toBe("send");
    expect(effect({ automatic: false, title: "54", batchesThisRun: 1 }).type).toBe("needs_review");
  });
});

describe("old recording backfill", () => {
  const rows = [
    { id: 5, title: "Community call 2023", sessionDate: new Date("2023-06-01"), createdAt: new Date("2023-06-01") },
    { id: 7, title: "7", sessionDate: new Date("2024-01-04"), createdAt: new Date("2024-01-04") },
    { id: 8, title: "Recording ready: 4", sessionDate: new Date("2024-08-12"), createdAt: new Date("2024-08-12") },
    { id: 12, title: "54", sessionDate: new Date("2025-03-29"), createdAt: new Date("2025-03-29") },
    { id: 40, title: "Season notes", sessionDate: new Date("2025-11-02"), createdAt: new Date("2025-11-02") },
  ];

  it("sends zero letters and marks each row skipped: too old", async () => {
    const send = vi.fn(async () => ({ accepted: 8, dropped: 0 }));
    const logs: string[] = [];
    for (const row of rows) {
      const decision = recordingMailEffect({
        title: row.title,
        sessionDate: row.sessionDate,
        createdAt: row.createdAt,
        now: NOW,
        batchesThisRun: 0,
        batchesLast24h: 0,
        automatic: true,
      });
      await applyRecordingMailEffect(decision, {
        send,
        markTooOld: async () => {
          logs.push(RECORDING_MAIL_TOO_OLD_LOG);
        },
        holdForReview: async () => {
          throw new Error("old rows are silenced, not held");
        },
        claim: async () => {
          throw new Error("old rows are not claimed for send");
        },
        noteBatch: () => {
          throw new Error("old rows do not take a batch");
        },
      });
    }
    expect(send).not.toHaveBeenCalled();
    expect(send.mock.calls).toHaveLength(0);
    expect(logs).toEqual(rows.map(() => "skipped: too old"));
  });

  it("does not send when the atomic claim updates 0 rows", async () => {
    const send = vi.fn(async () => ({ accepted: 1, dropped: 0 }));
    const result = await applyRecordingMailEffect(effect(), {
      send,
      markTooOld: async () => {},
      holdForReview: async () => {},
      claim: async () => false,
      noteBatch: () => {},
    });
    expect(result.held).toBe("claimed");
    expect(result.sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("claims before send, and a failed claim is the only thing that blocks a second try", async () => {
    const order: string[] = [];
    const result = await applyRecordingMailEffect(effect(), {
      send: async () => {
        order.push("send");
        return { accepted: 1, dropped: 0 };
      },
      markTooOld: async () => {},
      holdForReview: async () => {},
      claim: async () => {
        order.push("claim");
        return true;
      },
      noteBatch: () => {
        order.push("note");
      },
    });
    expect(order).toEqual(["claim", "note", "send"]);
    expect(result.sent).toBe(true);
  });
});
