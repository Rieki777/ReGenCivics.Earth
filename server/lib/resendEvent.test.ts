import { describe, expect, it, vi } from "vitest";
import { dispatchResendEvent, providerEventAction } from "./resendEvent";

describe("providerEventAction", () => {
  it("gives a complaint its own status and keeps failed and suppressed", () => {
    expect(providerEventAction("email.complained", { complaint: { feedback_type: "abuse" } })).toEqual({
      kind: "status",
      status: "complained",
      reason: "abuse",
    });
    expect(providerEventAction("email.failed", { reason: "mailbox full" }).kind).toBe("status");
    expect(providerEventAction("email.suppressed", {})).toMatchObject({ kind: "status", status: "failed" });
    expect(providerEventAction("email.delivery_delayed", {})).toEqual({ kind: "note" });
  });
});

describe("dispatchResendEvent", () => {
  it("does not stamp a letter when the Resend id is unknown", async () => {
    const apply = vi.fn();
    const result = await dispatchResendEvent({
      eventType: "email.bounced",
      resendEmailId: "re_unknown",
      data: { bounce: { message: "no such mailbox" }, to: ["ada@example.com"] } as never,
      claim: async () => "new",
      release: async () => {},
      findLogId: async () => null,
      apply,
    });
    expect(result).toBe("unmatched");
    expect(apply).not.toHaveBeenCalled();
  });

  it("applies a complaint only to the matched id", async () => {
    const apply = vi.fn();
    const result = await dispatchResendEvent({
      eventType: "email.complained",
      resendEmailId: "re_1",
      data: { complaint: { feedback_type: "spam" } },
      claim: async () => "new",
      release: async () => {},
      findLogId: async (id) => (id === "re_1" ? 42 : null),
      apply,
    });
    expect(result).toBe("applied");
    expect(apply).toHaveBeenCalledWith(42, { kind: "status", status: "complained", reason: "spam" });
  });

  it("does not apply a duplicate svix delivery", async () => {
    const apply = vi.fn();
    const result = await dispatchResendEvent({
      eventType: "email.delivered",
      resendEmailId: "re_1",
      claim: async () => "duplicate",
      release: async () => {},
      findLogId: async () => 42,
      apply,
    });
    expect(result).toBe("duplicate");
    expect(apply).not.toHaveBeenCalled();
  });

  it("releases the claim when apply fails so Resend can retry", async () => {
    const release = vi.fn();
    await expect(dispatchResendEvent({
      eventType: "email.bounced",
      resendEmailId: "re_1",
      data: { bounce: { message: "nope" } },
      claim: async () => "new",
      release,
      findLogId: async () => 7,
      apply: async () => { throw new Error("db down"); },
    })).rejects.toThrow(/db down/);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
