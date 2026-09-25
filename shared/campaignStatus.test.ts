/**
 * SECURITY: campaigns.updateStatus used to let an owner set any status. These
 * tests pin the transition tables the server now enforces.
 */
import { describe, expect, it } from "vitest";
import { CAMPAIGN_STATUSES, canTransition, cancellableFrom } from "./campaignStatus";

describe("steward transitions", () => {
  it("can never reach active, completed, funded or rejected from any status", () => {
    for (const from of CAMPAIGN_STATUSES) {
      for (const to of ["active", "completed", "funded", "rejected"]) {
        expect(canTransition(from, to, "steward"), `${from} -> ${to}`).toBe(false);
      }
    }
  });
  it("can send a draft for review and cancel an unfinished or live campaign", () => {
    expect(canTransition("draft", "pending_review", "steward")).toBe(true);
    expect(canTransition("draft", "cancelled", "steward")).toBe(true);
    expect(canTransition("pending_review", "cancelled", "steward")).toBe(true);
    expect(canTransition("active", "cancelled", "steward")).toBe(true);
    expect(canTransition("rejected", "cancelled", "steward")).toBe(false);
    expect(cancellableFrom("steward").sort()).toEqual(["active", "draft", "pending_review"]);
  });
});

describe("admin transitions", () => {
  it("publishes, rejects and completes", () => {
    expect(canTransition("pending_review", "active", "admin")).toBe(true);
    expect(canTransition("pending_review", "rejected", "admin")).toBe(true);
    expect(canTransition("active", "completed", "admin")).toBe(true);
    expect(canTransition("rejected", "cancelled", "admin")).toBe(true);
  });
  it("cannot publish a draft that skipped review", () => {
    expect(canTransition("draft", "active", "admin")).toBe(false);
  });
});

describe("terminal statuses", () => {
  it("cancelled and completed go nowhere, for anyone", () => {
    for (const role of ["admin", "steward"] as const) {
      for (const to of CAMPAIGN_STATUSES) {
        expect(canTransition("cancelled", to, role)).toBe(false);
        expect(canTransition("completed", to, role)).toBe(false);
      }
    }
  });
  it("a status is never a transition to itself, and unknown statuses are refused", () => {
    for (const s of CAMPAIGN_STATUSES) expect(canTransition(s, s, "admin")).toBe(false);
    expect(canTransition("draft", "published", "admin")).toBe(false);
    expect(canTransition("nope", "active", "admin")).toBe(false);
  });
});
