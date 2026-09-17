import { describe, expect, it } from "vitest";
import {
  buildDuplicateInvestorEmails,
  countInvestorTriage,
  filterInvestorsForTriage,
  isInvestorNeedsAction,
  isInvestorOverdue,
  isInvestorPendingReview,
} from "./investorTriage";

const base = { fullName: "Ada", email: "ada@example.com", createdAt: new Date().toISOString() };

describe("investor triage vocabulary", () => {
  it("treats new and pending as pending review; archived is not", () => {
    expect(isInvestorPendingReview({ ...base, status: "new" })).toBe(true);
    expect(isInvestorPendingReview({ ...base, status: "pending" })).toBe(true);
    expect(isInvestorPendingReview({ ...base, status: "archived" })).toBe(false);
    expect(isInvestorNeedsAction({ ...base, status: "archived" })).toBe(false);
  });

  it("counts pending review excluding archived (same rule Overview + Investors share)", () => {
    const rows = [
      { ...base, id: 1, status: "new" },
      { ...base, id: 2, status: "pending", email: "b@example.com" },
      { ...base, id: 3, status: "archived", email: "c@example.com" },
      { ...base, id: 4, status: "contacted", email: "d@example.com" },
    ];
    const counts = countInvestorTriage(rows);
    expect(counts.pendingReview).toBe(2);
    expect(counts.archived).toBe(1);
    expect(counts.total).toBe(4);
  });

  it("defaults needs_action to pending non-archived only", () => {
    const rows = [
      { ...base, id: 1, status: "new" },
      { ...base, id: 2, status: "archived", email: "x@example.com" },
      { ...base, id: 3, status: "contacted", email: "y@example.com" },
    ];
    expect(filterInvestorsForTriage(rows, { filter: "needs_action" }).map((r) => r.id)).toEqual([1]);
  });

  it("groups duplicate emails and counts duplicate rows", () => {
    const rows = [
      { ...base, id: 1, status: "new", email: "dup@example.com", fullName: "A" },
      { ...base, id: 2, status: "contacted", email: "dup@example.com", fullName: "B" },
      { ...base, id: 3, status: "new", email: "solo@example.com", fullName: "C" },
    ];
    const dupes = buildDuplicateInvestorEmails(rows);
    expect(dupes.has("dup@example.com")).toBe(true);
    expect(dupes.has("solo@example.com")).toBe(false);
    const filtered = filterInvestorsForTriage(rows, { filter: "duplicates", duplicateEmails: dupes });
    expect(filtered.map((r) => r.id)).toEqual([1, 2]);
    expect(countInvestorTriage(rows).duplicateRows).toBe(2);
  });

  it("marks pending >48h as overdue; archived and contacted are never overdue", () => {
    const now = Date.parse("2026-09-16T17:00:00Z");
    const old = new Date(now - 50 * 3_600_000).toISOString();
    const recent = new Date(now - 10 * 3_600_000).toISOString();
    expect(isInvestorOverdue({ ...base, status: "new", createdAt: old }, now)).toBe(true);
    expect(isInvestorOverdue({ ...base, status: "new", createdAt: recent }, now)).toBe(false);
    expect(isInvestorOverdue({ ...base, status: "archived", createdAt: old }, now)).toBe(false);
    expect(isInvestorOverdue({ ...base, status: "contacted", createdAt: old }, now)).toBe(false);
    const rows = [
      { ...base, id: 1, status: "new", createdAt: old },
      { ...base, id: 2, status: "new", email: "r@example.com", createdAt: recent },
    ];
    expect(filterInvestorsForTriage(rows, { filter: "overdue" }).map((r) => r.id)).toEqual([1]);
  });

  it("filters due_reminders by parsed note ids, independent of status", () => {
    const rows = [
      { ...base, id: 1, status: "contacted" },
      { ...base, id: 2, status: "new", email: "b@example.com" },
      { ...base, id: 3, status: "archived", email: "c@example.com" },
    ];
    const dueReminderIds = new Set([1, 3]);
    expect(
      filterInvestorsForTriage(rows, { filter: "due_reminders", dueReminderIds }).map((r) => r.id),
    ).toEqual([1, 3]);
    expect(filterInvestorsForTriage(rows, { filter: "due_reminders" }).map((r) => r.id)).toEqual([]);
  });
});
