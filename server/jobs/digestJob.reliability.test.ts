import { beforeEach, describe, expect, it, vi } from "vitest";

const startupLeft = vi.hoisted(() => ({ ms: 0 }));
const sendEmailMock = vi.hoisted(() => vi.fn());
const saveDigest = vi.hoisted(() => vi.fn().mockResolvedValue(1));
const getLatestDigest = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const emailsAcceptedSince = vi.hoisted(() => vi.fn().mockResolvedValue(new Set<string>()));
const getRecentForumPostsForDigest = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const invokeLLM = vi.hoisted(() => vi.fn());

vi.mock("../db", () => ({
  getLatestDigest: (...args: unknown[]) => getLatestDigest(...args),
  saveDigest: (...args: unknown[]) => saveDigest(...args),
  getRecentForumPostsForDigest: (...args: unknown[]) => getRecentForumPostsForDigest(...args),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  getAppBaseUrl: () => "https://regencivics.earth",
  msUntilStartupEmailGuardEnds: () => startupLeft.ms,
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLM(...args),
}));

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

import { DIGEST_ARCHIVE_NOTE, DIGEST_PARTIAL_RETRY_MS, digestFollowUpDelayMs, runDigestJob } from "./digestJob";

describe("weekly digest does not mark a week done on a drop", () => {
  beforeEach(() => {
    startupLeft.ms = 0;
    sendEmailMock.mockReset();
    saveDigest.mockClear();
    getLatestDigest.mockResolvedValue(null);
    getRecentForumPostsForDigest.mockResolvedValue([]);
    invokeLLM.mockClear();
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

  it("archives a fixed note and does not call a model when the forum is active", async () => {
    getRecentForumPostsForDigest.mockResolvedValue([
      { id: 1, title: "Soil", content: "We mulched the beds.", replyCount: 4, viewCount: 10 },
      { id: 2, title: "Water", content: "The swale held.", replyCount: 2, viewCount: 8 },
      { id: 3, title: "Seed", content: "The nursery is full.", replyCount: 6, viewCount: 12 },
    ]);
    sendEmailMock.mockResolvedValue({ id: "re_test", status: "sent" });
    const result = await runDigestJob();
    expect(result.status).toBe("sent");
    expect(invokeLLM).not.toHaveBeenCalled();
    expect(saveDigest).toHaveBeenCalledWith(
      expect.objectContaining({ contentMd: DIGEST_ARCHIVE_NOTE }),
    );
    const html = String(sendEmailMock.mock.calls[0]?.[0]?.html ?? "");
    expect(html).toContain("Soil");
    expect(html).not.toContain("community curator");
  });
});
