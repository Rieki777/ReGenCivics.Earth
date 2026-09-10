import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { ENV } from "./_core/env";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_410;

const sendEmailMock = vi.fn().mockResolvedValue({ id: "msg_test" });
vi.mock("./_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));
vi.mock("./db/newsletter", () => ({
  getNewsletterAudience: vi.fn().mockResolvedValue([
    { email: "a@example.org", name: "Ada", source: "footer", isActive: 1 },
  ]),
}));
vi.mock("./emailTracking", () => ({
  createEmailLog: vi.fn().mockResolvedValue(11),
}));

import {
  buildConfirmToken,
  verifyConfirmToken,
  issueBodyHash,
  TOKEN_TTL_MS,
  parseIssueAudience,
  previewUnsubscribeUrl,
  signedUnsubscribeUrl,
  verifyUnsubscribeToken,
  buildIssuePreview,
  scheduleIssue,
  cancelScheduledIssue,
  rescheduleIssue,
  runDueNewsletterIssues,
} from "./lib/newsletter-issue-email";
import { markdownLetterDocument } from "../shared/letterHtml";

describe("outbound confirm token", () => {
  it("round-trips a valid payload", () => {
    const payload = { issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS };
    expect(verifyConfirmToken(buildConfirmToken(payload))).toEqual(payload);
  });

  it("rejects a tampered token", () => {
    const token = buildConfirmToken({ issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS });
    const [b64, sig] = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ issueId: 8, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
    expect(verifyConfirmToken(`${tampered}.${sig}`)).toBeNull();
    expect(verifyConfirmToken(`${b64}.AAAA${sig.slice(4)}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = buildConfirmToken({ issueId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() - 1000 });
    expect(verifyConfirmToken(token)).toBeNull();
  });
});

describe("issue hash", () => {
  it("changes when the audience changes", () => {
    const a = issueBodyHash("Hi", "Body", { sources: [], activeOnly: true });
    const b = issueBodyHash("Hi", "Body", { sources: ["exit_intent"], activeOnly: true });
    expect(a).not.toBe(b);
  });
});

describe("parseIssueAudience", () => {
  it("defaults to all active sources", () => {
    expect(parseIssueAudience(null)).toEqual({ sources: [], activeOnly: true });
  });
});

describe("newsletter preview footer", () => {
  it("includes a manage-preferences footer and a hosted image", () => {
    const html = markdownLetterDocument(
      "Hello\n\n![Hero](https://assets.regencivics.earth/hero.jpg)\n\n[Join](https://regencivics.earth/apply)",
      "announcement",
      { managePreferencesUrl: `${ENV.appUrl}/email-preferences`, postalAddress: "ReGen Civics Alliance, Ashland, Oregon, USA" },
    );
    expect(html).toContain("Manage email preferences");
    expect(html).toContain("/email-preferences");
    expect(html).not.toContain(">Unsubscribe<");
    expect(html).toContain("<img");
    expect(html).toContain("Join");
  });
});

describe("signed preference url", () => {
  it("points at /email-preferences and round-trips the prefs token", async () => {
    expect(previewUnsubscribeUrl()).toMatch(/\/email-preferences/);
    const url = await signedUnsubscribeUrl("ada@example.org");
    expect(url).toMatch(/\/email-preferences\?/);
    expect(url).toContain("mute=seasonal");
    expect(url).not.toContain("/unsubscribe");
    const token = new URL(url).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(await verifyUnsubscribeToken(token!)).toBe("ada@example.org");
  });
});

describe("scheduled newsletter send (DB)", () => {
  async function cleanup() {
    const { getDb } = await import("./db");
    const { newsletterIssueRecipients, newsletterIssues } = await import("../drizzle/schema");
    const { eq, inArray } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return;
    const owned = await db.select({ id: newsletterIssues.id })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.createdBy, TEST_OWNER_ID));
    const ids = owned.map((row) => row.id);
    if (ids.length > 0) {
      await db.delete(newsletterIssueRecipients).where(inArray(newsletterIssueRecipients.issueId, ids));
    }
    await db.delete(newsletterIssues).where(eq(newsletterIssues.createdBy, TEST_OWNER_ID));
  }

  beforeAll(async () => {
    if (!skipIfNoDb) await cleanup();
  }, 60_000);
  afterAll(async () => {
    if (!skipIfNoDb) await cleanup();
  }, 60_000);

  it.skipIf(skipIfNoDb)("schedules, waits until due, sends once, then stays idempotent", { timeout: 60_000 }, async () => {
    await cleanup();
    const { getDb } = await import("./db");
    const { newsletterIssues } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    await db.insert(newsletterIssues).values({
      subject: "September letter",
      body: "Hello from the land.",
      layout: "announcement",
      audience: { sources: [], activeOnly: true },
      status: "draft",
      createdBy: TEST_OWNER_ID,
    });
    const [issue] = await db.select().from(newsletterIssues)
      .where(eq(newsletterIssues.createdBy, TEST_OWNER_ID));

    const preview = await buildIssuePreview({ issueId: issue.id, createdBy: TEST_OWNER_ID });
    const t0 = new Date("2026-09-10T16:00:00.000Z");
    const sendAt = new Date(t0.getTime() + 2 * 60_000);

    await expect(scheduleIssue({
      issueId: issue.id,
      createdBy: TEST_OWNER_ID,
      confirmToken: preview.confirmToken,
      idempotencyKey: "sched-key-too-soon",
      scheduledFor: t0.toISOString(),
      now: t0,
    })).rejects.toThrow(/one minute/);

    const key = `sched-key-${issue.id}-due`;
    const scheduled = await scheduleIssue({
      issueId: issue.id,
      createdBy: TEST_OWNER_ID,
      confirmToken: preview.confirmToken,
      idempotencyKey: key,
      scheduledFor: sendAt.toISOString(),
      now: t0,
    });
    expect(scheduled.recipientCount).toBe(1);

    sendEmailMock.mockClear();
    const early = await runDueNewsletterIssues(t0, { createdBy: TEST_OWNER_ID });
    expect(early.scanned).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    const due = await runDueNewsletterIssues(new Date(sendAt.getTime() + 1000), { createdBy: TEST_OWNER_ID });
    expect(due.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    sendEmailMock.mockClear();
    const replay = await runDueNewsletterIssues(new Date(sendAt.getTime() + 60_000), { createdBy: TEST_OWNER_ID });
    expect(replay.scanned).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    const [after] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, issue.id));
    expect(after.status).toBe("sent");
    expect(after.sentCount).toBe(1);
  });

  it.skipIf(skipIfNoDb)("cancel before due prevents the send", { timeout: 60_000 }, async () => {
    await cleanup();
    const { getDb } = await import("./db");
    const { newsletterIssues } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    await db.insert(newsletterIssues).values({
      subject: "Hold this one",
      body: "Do not send yet.",
      layout: "announcement",
      audience: { sources: [], activeOnly: true },
      status: "draft",
      createdBy: TEST_OWNER_ID,
    });
    const rows = await db.select().from(newsletterIssues)
      .where(eq(newsletterIssues.createdBy, TEST_OWNER_ID));
    const issue = rows.find((row) => row.subject === "Hold this one")!;

    const preview = await buildIssuePreview({ issueId: issue.id, createdBy: TEST_OWNER_ID });
    const t0 = new Date("2026-09-12T16:00:00.000Z");
    const sendAt = new Date(t0.getTime() + 2 * 60_000);
    await scheduleIssue({
      issueId: issue.id,
      createdBy: TEST_OWNER_ID,
      confirmToken: preview.confirmToken,
      idempotencyKey: `sched-key-${issue.id}-cancel`,
      scheduledFor: sendAt.toISOString(),
      now: t0,
    });
    await cancelScheduledIssue({ issueId: issue.id, createdBy: TEST_OWNER_ID });

    sendEmailMock.mockClear();
    const due = await runDueNewsletterIssues(new Date(sendAt.getTime() + 1000), { createdBy: TEST_OWNER_ID });
    expect(due.scanned).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    const [after] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, issue.id));
    expect(after.status).toBe("cancelled");
  });

  it.skipIf(skipIfNoDb)("reschedule moves the due time", { timeout: 60_000 }, async () => {
    await cleanup();
    const { getDb } = await import("./db");
    const { newsletterIssues } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    await db.insert(newsletterIssues).values({
      subject: "Move this one",
      body: "Later please.",
      layout: "announcement",
      audience: { sources: [], activeOnly: true },
      status: "draft",
      createdBy: TEST_OWNER_ID,
    });
    const rows = await db.select().from(newsletterIssues)
      .where(eq(newsletterIssues.createdBy, TEST_OWNER_ID));
    const issue = rows.find((row) => row.subject === "Move this one")!;

    const preview = await buildIssuePreview({ issueId: issue.id, createdBy: TEST_OWNER_ID });
    const t0 = new Date("2026-09-13T16:00:00.000Z");
    const firstAt = new Date(t0.getTime() + 2 * 60_000);
    const laterAt = new Date(t0.getTime() + 60 * 60_000);
    await scheduleIssue({
      issueId: issue.id,
      createdBy: TEST_OWNER_ID,
      confirmToken: preview.confirmToken,
      idempotencyKey: `sched-key-${issue.id}-move`,
      scheduledFor: firstAt.toISOString(),
      now: t0,
    });
    await rescheduleIssue({
      issueId: issue.id,
      createdBy: TEST_OWNER_ID,
      scheduledFor: laterAt.toISOString(),
      now: t0,
    });

    sendEmailMock.mockClear();
    const tooEarly = await runDueNewsletterIssues(new Date(firstAt.getTime() + 1000), { createdBy: TEST_OWNER_ID });
    expect(tooEarly.scanned).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    const due = await runDueNewsletterIssues(new Date(laterAt.getTime() + 1000), { createdBy: TEST_OWNER_ID });
    expect(due.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
