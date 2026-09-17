import { describe, expect, it } from "vitest";
import {
  STUCK_IN_REVIEW_MS,
  STUCK_UNASSIGNED_MS,
  countCallTaskBoard,
  filterCallTaskBoardRows,
  isCallTaskOverdue,
  isCallTaskStuck,
  isCallTaskUnassigned,
} from "./callTaskBoard";

const now = Date.parse("2026-09-16T12:00:00.000Z");

describe("callTaskBoard filters", () => {
  const rows = [
    {
      sourceType: "call_task",
      workStatus: "open",
      ownerUserId: 1,
      expiresAt: new Date(now + 86400000).toISOString(),
      createdAt: new Date(now - 1000).toISOString(),
    },
    {
      sourceType: "call_task",
      workStatus: "open",
      ownerUserId: null,
      expiresAt: new Date(now - 1000).toISOString(),
      createdAt: new Date(now - STUCK_UNASSIGNED_MS - 1000).toISOString(),
    },
    {
      sourceType: "call_task",
      workStatus: "completed",
      ownerUserId: 2,
      expiresAt: null,
      createdAt: new Date(now - 86400000).toISOString(),
    },
    {
      sourceType: "contribution",
      workStatus: "open",
      ownerUserId: null,
    },
  ];

  it("classifies overdue + unassigned", () => {
    expect(isCallTaskOverdue(rows[1], now)).toBe(true);
    expect(isCallTaskUnassigned(rows[1])).toBe(true);
    expect(isCallTaskUnassigned(rows[0])).toBe(false);
  });

  it("filters open / overdue / unassigned / done", () => {
    expect(filterCallTaskBoardRows(rows, "open", now)).toHaveLength(2);
    expect(filterCallTaskBoardRows(rows, "overdue", now)).toHaveLength(1);
    expect(filterCallTaskBoardRows(rows, "unassigned", now)).toHaveLength(1);
    expect(filterCallTaskBoardRows(rows, "done", now)).toHaveLength(1);
  });

  it("counts stuck (overdue or stale unassigned)", () => {
    expect(isCallTaskStuck(rows[1], now)).toBe(true);
    expect(isCallTaskStuck(rows[0], now)).toBe(false);
    const counts = countCallTaskBoard(rows, now);
    expect(counts.stuck).toBeGreaterThanOrEqual(1);
    expect(counts.open).toBe(2);
    expect(counts.done).toBe(1);
  });

  it("flags stale in_review as stuck", () => {
    const staleReview = {
      sourceType: "call_task",
      workStatus: "in_review",
      ownerUserId: 3,
      updatedAt: new Date(now - STUCK_IN_REVIEW_MS - 1).toISOString(),
    };
    expect(isCallTaskStuck(staleReview, now)).toBe(true);
  });
});
