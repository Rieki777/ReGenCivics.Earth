import { describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("./_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("./lib/emailPrefs", () => ({
  audienceForTopic: vi.fn().mockResolvedValue([
    { email: "a@example.org", name: "A" },
    { email: "b@example.org", name: "B" },
  ]),
  managePreferencesUrl: async (email: string) => `https://example.test/email-preferences?token=t&e=${encodeURIComponent(email)}`,
  previewManagePreferencesUrl: () => "https://example.test/email-preferences?mute=seasonal",
}));

const updates: Array<Record<string, unknown>> = [];

function builder(finalValue: unknown) {
  const b: Record<string, unknown> = {};
  const next = () => b;
  b.from = next;
  b.where = next;
  b.orderBy = next;
  b.limit = next;
  b.values = async () => undefined;
  b.set = (vals: Record<string, unknown>) => {
    updates.push(vals);
    return b;
  };
  b.then = (resolve: (value: unknown) => unknown, reject?: (err: unknown) => unknown) =>
    Promise.resolve(finalValue).then(resolve, reject);
  return b;
}

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => builder([]),
    insert: () => builder(undefined),
    update: () => builder(undefined),
  }),
}));

import { buildSendPreview, confirmAndSend } from "./lib/harvest-email";

describe("harvest send does not ship when Resend returns no id", () => {
  it("marks the audit row failed and does not count the drop as sent", async () => {
    updates.length = 0;
    sendEmailMock.mockResolvedValue({ id: null, status: "rate_limited" });
    const preview = await buildSendPreview({
      id: 5,
      channel: "newsletter",
      status: "edited",
      body: "Announcement\n\nWe planted the first forest.",
    });
    await expect(confirmAndSend({
      ownerId: 1,
      item: {
        id: 5,
        channel: "newsletter",
        status: "edited",
        body: "Announcement\n\nWe planted the first forest.",
        aiBody: "AI draft",
      },
      confirmToken: preview.confirmToken,
      idempotencyKey: "harvest-drop-key",
    })).rejects.toThrow(/Send failed after 0 of 2/);
    expect(updates.some((row) => row.status === "failed" && row.recipientCount === 0)).toBe(true);
    expect(updates.some((row) => row.status === "shipped")).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
