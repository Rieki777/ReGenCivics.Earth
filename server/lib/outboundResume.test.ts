import { describe, expect, it } from "vitest";
import { OUTBOUND_RESUME_LEASE_MS, resumeRecipientAction, sendingLeaseOpen } from "./outboundResume";

describe("outbound resume", () => {
  it("does not send an address that already went out", () => {
    expect(resumeRecipientAction("sent")).toBe("already_sent");
    expect(resumeRecipientAction("skipped_unsub")).toBe("skip");
    expect(resumeRecipientAction("pending")).toBe("send");
    expect(resumeRecipientAction("failed")).toBe("send");
  });

  it("waits out the lease before a second worker may resume a sending letter", () => {
    const updatedAt = new Date("2026-10-02T12:00:00.000Z");
    const tooSoon = new Date(updatedAt.getTime() + OUTBOUND_RESUME_LEASE_MS - 1);
    const ready = new Date(updatedAt.getTime() + OUTBOUND_RESUME_LEASE_MS);
    expect(sendingLeaseOpen(updatedAt, tooSoon)).toBe(false);
    expect(sendingLeaseOpen(updatedAt, ready)).toBe(true);
  });
});
