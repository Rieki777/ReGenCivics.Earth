import { beforeEach, describe, expect, it, vi } from "vitest";

const resendSend = vi.hoisted(() => vi.fn());
const writeEmailAttempt = vi.hoisted(() => vi.fn().mockResolvedValue([11]));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => resendSend(...args) },
  })),
}));

vi.mock("./emailTracking", () => ({
  writeEmailAttempt: (...args: unknown[]) => writeEmailAttempt(...args),
  signTrackedUrl: (url: string) => url,
}));

import { __emailRateLimitsForTests, sendEmail } from "./_core/email";

describe("sendEmail records drops and does not burn the cap", () => {
  beforeEach(() => {
    __emailRateLimitsForTests.reset();
    __emailRateLimitsForTests.setStartupWindow(false);
    writeEmailAttempt.mockClear();
    resendSend.mockReset();
    resendSend.mockResolvedValue({ data: { id: "msg_ok" }, error: null });
    delete process.env.EMAIL_HOLD;
  });

  it("writes a blocked row when the startup cap drops the send", async () => {
    __emailRateLimitsForTests.setStartupWindow(true);
    __emailRateLimitsForTests.record(5);
    const before = __emailRateLimitsForTests.counts();

    const result = await sendEmail({
      to: "dropped@example.com",
      subject: "Should not send",
      html: "<p>no</p>",
      template: "probe",
    });

    expect(result).toMatchObject({ id: null, status: "rate_limited" });
    expect(resendSend).not.toHaveBeenCalled();
    expect(writeEmailAttempt).toHaveBeenCalledWith(expect.objectContaining({
      status: "blocked",
      template: "probe",
    }));
    expect(__emailRateLimitsForTests.counts()).toEqual(before);
  });

  it("does not count a provider error against the hour", async () => {
    resendSend.mockResolvedValueOnce({ data: null, error: { message: "rejected" } });
    const result = await sendEmail({
      to: "dropped@example.com",
      subject: "Provider said no",
      html: "<p>no</p>",
      template: "probe",
    });
    expect(result).toMatchObject({ id: null, status: "provider_error" });
    const statuses = writeEmailAttempt.mock.calls.map((call) => (call[0] as { status: string }).status);
    expect(statuses).toEqual(["queued", "failed"]);
    expect(__emailRateLimitsForTests.counts().hour).toBe(0);
  });

  it("counts the hour only after Resend accepts", async () => {
    const result = await sendEmail({
      to: "ok@example.com",
      subject: "Hello",
      html: "<p>yes</p>",
    });
    expect(result.id).toBe("msg_ok");
    expect(result.status).toBe("sent");
    expect(__emailRateLimitsForTests.counts().hour).toBe(1);
  });

  it("records a hold and does not call Resend", async () => {
    process.env.EMAIL_HOLD = "true";
    const result = await sendEmail({
      to: "held@example.com",
      subject: "Held",
      html: "<p>hold</p>",
    });
    expect(result).toMatchObject({ id: null, status: "held" });
    expect(resendSend).not.toHaveBeenCalled();
    expect(writeEmailAttempt).toHaveBeenCalledWith(expect.objectContaining({ status: "held" }));
  });
});
