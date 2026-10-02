import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("./_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import { deliverOwnerAlert, ownerAlertHtml } from "./_core/notification";

describe("deliverOwnerAlert", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    process.env.OWNER_EMAIL = "owner@example.test";
  });

  it("sends through sendEmail and escapes the title", async () => {
    sendEmailMock.mockResolvedValue({ id: "msg_owner", status: "sent" });
    const ok = await deliverOwnerAlert({ title: "<script>", content: "Hello" });
    expect(ok).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const params = sendEmailMock.mock.calls[0]![0];
    expect(params.to).toEqual(["owner@example.test"]);
    expect(params.template).toBe("owner_notification");
    expect(params.skipBrandedWrap).toBe(true);
    expect(params.html).toContain("&lt;script&gt;");
    expect(params.html).not.toContain("<script>");
  });

  it("returns false when the send is held or rate limited", async () => {
    sendEmailMock.mockResolvedValue({ id: null, status: "held" });
    expect(await deliverOwnerAlert({ title: "Hi", content: "There" })).toBe(false);
  });

  it("does not call Resend when OWNER_EMAIL is missing", async () => {
    delete process.env.OWNER_EMAIL;
    expect(await deliverOwnerAlert({ title: "Hi", content: "There" })).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("ownerAlertHtml", () => {
  it("escapes markup in the body", () => {
    expect(ownerAlertHtml("Title", "a < b")).toContain("a &lt; b");
  });
});
