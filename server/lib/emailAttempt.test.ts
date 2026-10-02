import { describe, expect, it } from "vitest";
import { providerAccepted, scheduledEmailNextStatus } from "./emailAttempt";
import { matchLedgerAction } from "../jobs/needsOffersMatcher";

describe("providerAccepted", () => {
  it("accepts only a non-empty Resend id", () => {
    expect(providerAccepted({ id: "msg_1" })).toBe(true);
    expect(providerAccepted({ id: null })).toBe(false);
    expect(providerAccepted({ id: "" })).toBe(false);
    expect(providerAccepted(null)).toBe(false);
    expect(providerAccepted(true as never)).toBe(false);
  });
});

describe("scheduledEmailNextStatus", () => {
  it("leaves a rate-limited row pending and treats hold or a missing id as failed", () => {
    expect(scheduledEmailNextStatus({ id: null, status: "rate_limited" })).toBe("pending");
    expect(scheduledEmailNextStatus({ id: null, status: "held" })).toBe("failed");
    expect(scheduledEmailNextStatus({ id: null, status: "provider_error" })).toBe("failed");
    expect(scheduledEmailNextStatus({ id: "msg_1", status: "sent" })).toBe("sent");
  });
});

describe("matchLedgerAction", () => {
  it("releases a pair when neither side was accepted", () => {
    expect(matchLedgerAction({ id: null }, { id: null })).toBe("release");
    expect(matchLedgerAction(null, undefined)).toBe("release");
  });

  it("keeps a pair when at least one side was accepted", () => {
    expect(matchLedgerAction({ id: "msg_a" }, { id: null })).toBe("keep");
    expect(matchLedgerAction({ id: null }, { id: "msg_b" })).toBe("keep");
  });
});
