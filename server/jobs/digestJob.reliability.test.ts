import { beforeEach, describe, expect, it, vi } from "vitest";

const startupLeft = vi.hoisted(() => ({ ms: 0 }));
const sendEmailMock = vi.hoisted(() => vi.fn());
const saveDigest = vi.hoisted(() => vi.fn().mockResolvedValue(1));
const getLatestDigest = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const emailsAcceptedSince = vi.hoisted(() => vi.fn().mockResolvedValue(new Set<string>()));

vi.mock("../db", () => ({
  getLatestDigest: (...args: unknown[]) => getLatestDigest(...args),
  saveDigest: (...args: unknown[]) => saveDigest(...args),
  getRecentForumPostsForDigest: vi.fn().mockResolvedValue([]),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  getAppBaseUrl: () => "https://regencivics.earth",
  msUntilStartupEmailGuardEnds: () => startupLeft.ms,
}));

vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

vi.mock("../lib/emailPrefs", () => ({
  audienceForTopic: vi.fn().mockResolvedValue([
    { email: "ada@example.com", name: "Ada" },
    { email: "bob@example.com", name: "Bob" },
  ]),
  managePreferencesUrl: vi.fn().mockResolvedValue("https://regencivics.earth/email-preferences?token=t"),
}));

vi.mock("../emailTracking", () => ({
  emailsAcceptedSince: (...args: unknown[]) => emailsAcceptedSince(...args),
}));

vi.mock("./stewardDigestJob", () => ({
  sendStewardWeeklyDigest: vi.fn(),
}));

import { DIGEST_PARTIAL_RETRY_MS, digestFollowUpDelayMs, runDigestJob } from "./digestJob";

describe("weekly digest does not mark a week done on a drop", () => {
  beforeEach(() => {
    startupLeft.ms = 0;
    sendEmailMock.mockReset();
    saveDigest.mockClear();
    getLatestDigest.mockResolvedValue(null);
    emailsAcceptedSince.mockResolvedValue(new Set());
  });

  it("skips while the startup guard is up and does not save the week", async () => {
    startupLeft.ms = 30_000;
    const result = await runDigestJob();
    expect(result.status).toBe("skipped_startup");
    if (result.status === "skipped_startup") {
      expect(digestFollowUpDelayMs(result)).toBe(31_000);
    }
    expect(saveDigest).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not save the week when a send is rate limited", async () => {
    sendEmailMock.mockResolvedValue({ id: null, status: "rate_limited" });
    const result = await runDigestJob();
    expect(result).toEqual({ status: "partial", reason: "rate_limited" });
    expect(digestFollowUpDelayMs(result)).toBe(DIGEST_PARTIAL_RETRY_MS);
    expect(saveDigest).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("saves the week without resending addresses already accepted", async () => {
    emailsAcceptedSince.mockResolvedValue(new Set(["ada@example.com", "bob@example.com"]));
    const result = await runDigestJob();
    expect(result.status).toBe("sent");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(saveDigest).toHaveBeenCalledTimes(1);
  });
});
