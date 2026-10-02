import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const already = vi.hoisted(() => ({ emails: new Set<string>() }));
vi.mock("../emailTracking", () => ({
  emailsAcceptedForInquiry: vi.fn(async () => already.emails),
}));

import { sendSeasonRollupEmails } from "./seasonRollup";

describe("sendSeasonRollupEmails", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ id: "msg_ok", status: "sent" });
    already.emails = new Set();
  });

  it("sends one letter per address", async () => {
    const result = await sendSeasonRollupEmails({
      season: "Season 2",
      emails: ["ada@example.com", "bob@example.com"],
      subject: "Season 2: Here's what we built together",
      html: "<p>wrap</p>",
    });
    expect(result).toEqual({ accepted: 2, dropped: 0 });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls[0][0].to).toEqual(["ada@example.com"]);
    expect(sendEmailMock.mock.calls[1][0].to).toEqual(["bob@example.com"]);
  });

  it("does not count a drop as sent, and stops the rest of the list", async () => {
    sendEmailMock.mockResolvedValueOnce({ id: null, status: "rate_limited" });
    const result = await sendSeasonRollupEmails({
      season: "Season 2",
      emails: ["ada@example.com", "bob@example.com"],
      subject: "Season 2 wrap",
      html: "<p>wrap</p>",
    });
    expect(result).toEqual({ accepted: 0, dropped: 2 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
