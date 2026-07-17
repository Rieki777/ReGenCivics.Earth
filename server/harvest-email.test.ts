/**
 * Tests for the Harvest Phase 4 self-driving layer + hardened email send:
 *  - confirm token binds to the exact body hash; tamper/expiry rejected
 *  - unedited (raw) draft cannot be previewed or sent
 *  - caps (10-minute gap, 3/day) enforced from the audit table
 *  - idempotency: a double-click is a no-op
 *  - auto-draft backpressure pauses on a full ready feed
 *  - resurfacing honors Snooze and Not this
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { ENV } from "./_core/env";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_304;

const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock("./_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));
const subscribersMock = vi.fn().mockResolvedValue([
  { email: "a@example.org" }, { email: "b@example.org" }, { email: "c@example.org" },
]);
vi.mock("./db/newsletter", () => ({
  getActiveNewsletterSubscribers: () => subscribersMock(),
}));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "t", created: 0, model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: "A grounded draft about seeds and the food forest." }, finish_reason: "stop" }],
  }),
  isLLMConfigured: () => true,
}));

import {
  bodyHash, buildConfirmToken, verifyConfirmToken, splitSubject,
  buildSendPreview, confirmAndSend, TOKEN_TTL_MS,
} from "./lib/harvest-email";

describe("confirm token", () => {
  it("round-trips a valid payload", () => {
    const payload = { itemId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS };
    expect(verifyConfirmToken(buildConfirmToken(payload))).toEqual(payload);
  });
  it("rejects a tampered token", () => {
    const token = buildConfirmToken({ itemId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS });
    const [b64, sig] = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ itemId: 8, hash: "a".repeat(64), recipients: 3, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
    expect(verifyConfirmToken(`${tampered}.${sig}`)).toBeNull();
    expect(verifyConfirmToken(`${b64}.AAAA${sig.slice(4)}`)).toBeNull();
  });
  it("rejects an expired token", () => {
    const token = buildConfirmToken({ itemId: 7, hash: "a".repeat(64), recipients: 3, exp: Date.now() - 1000 });
    expect(verifyConfirmToken(token)).toBeNull();
  });
});

describe("splitSubject", () => {
  it("takes the first line as subject, strips markdown heading", () => {
    const { subject, text } = splitSubject("# Big news from the land\n\nThe body starts here.");
    expect(subject).toBe("Big news from the land");
    expect(text).toBe("The body starts here.");
  });
});

describe("send gates (no DB needed)", () => {
  it("refuses a raw (unedited) draft", async () => {
    await expect(buildSendPreview({ id: 1, channel: "newsletter", status: "ready", body: "hello" }))
      .rejects.toThrow(/edited-and-saved/);
  });
  it("refuses a non-newsletter channel", async () => {
    await expect(buildSendPreview({ id: 1, channel: "linkedin", status: "edited", body: "hello" }))
      .rejects.toThrow(/newsletter/);
  });
  it("preview binds the token to the current text", async () => {
    const preview = await buildSendPreview({ id: 5, channel: "newsletter", status: "edited", body: "Subject line\n\nBody text." });
    expect(preview.recipientCount).toBe(3);
    const payload = verifyConfirmToken(preview.confirmToken)!;
    const { subject, text } = splitSubject("Subject line\n\nBody text.");
    expect(payload.hash).toBe(bodyHash(subject, text));
    expect(payload.itemId).toBe(5);
  });
});

describe("confirmed send (DB)", () => {
  // Leftover audit rows from an interrupted earlier run would trip the send
  // caps (they are the caps' whole point), so clean before AND after.
  async function cleanup() {
    const { getDb } = await import("./db");
    const { harvestEmailSends, harvestIdeas, creationItems } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      await db.delete(harvestEmailSends).where(eq(harvestEmailSends.ownerId, TEST_OWNER_ID));
      await db.delete(creationItems).where(eq(creationItems.ownerId, TEST_OWNER_ID));
      await db.delete(harvestIdeas).where(eq(harvestIdeas.ownerId, TEST_OWNER_ID));
    }
  }
  beforeAll(async () => {
    if (!skipIfNoDb) await cleanup();
  }, 60_000);
  afterAll(async () => {
    if (!skipIfNoDb) await cleanup();
  }, 60_000);

  it.skipIf(skipIfNoDb)("hash mismatch, idempotency, and caps all hold", { timeout: 60_000 }, async () => {
    const { getDb } = await import("./db");
    const { creationItems } = await import("../drizzle/schema");
    const { and, eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    await db.insert(creationItems).values({
      ownerId: TEST_OWNER_ID, captureId: "email-test-idea", channel: "newsletter",
      aiBody: "AI draft", body: "Announcement\n\nWe planted the first forest.", status: "edited", ripeness: 0.8,
    });
    const [item] = await db.select().from(creationItems)
      .where(and(eq(creationItems.ownerId, TEST_OWNER_ID), eq(creationItems.captureId, "email-test-idea")));

    const preview = await buildSendPreview({ id: item.id, channel: item.channel, status: item.status, body: item.body });

    // A body change after preview is rejected (the injection gate).
    await expect(confirmAndSend({
      ownerId: TEST_OWNER_ID,
      item: { id: item.id, channel: "newsletter", status: "edited", body: "Announcement\n\nDIFFERENT text now.", aiBody: item.aiBody },
      confirmToken: preview.confirmToken,
      idempotencyKey: crypto.randomUUID(),
    })).rejects.toThrow(/changed since the preview/);

    // The real send goes out to the mocked list.
    sendEmailMock.mockClear();
    const key = crypto.randomUUID();
    const sent = await confirmAndSend({
      ownerId: TEST_OWNER_ID,
      item: { id: item.id, channel: "newsletter", status: "edited", body: item.body, aiBody: item.aiBody },
      confirmToken: preview.confirmToken,
      idempotencyKey: key,
    });
    expect(sent.recipientCount).toBe(3);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // Double-click with the same idempotency key: no-op, nothing re-sent.
    sendEmailMock.mockClear();
    const replay = await confirmAndSend({
      ownerId: TEST_OWNER_ID,
      item: { id: item.id, channel: "newsletter", status: "edited", body: item.body, aiBody: item.aiBody },
      confirmToken: preview.confirmToken,
      idempotencyKey: key,
    });
    expect(replay.duplicate).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();

    // A fresh key inside the 10-minute window hits the gap cap.
    // (Reset the item to edited: the successful send flipped it to shipped.)
    await db.update(creationItems).set({ status: "edited" }).where(eq(creationItems.id, item.id));
    await expect(confirmAndSend({
      ownerId: TEST_OWNER_ID,
      item: { id: item.id, channel: "newsletter", status: "edited", body: item.body, aiBody: item.aiBody },
      confirmToken: preview.confirmToken,
      idempotencyKey: crypto.randomUUID(),
    })).rejects.toThrow(/ten minutes/);
  });
});

describe("self-driving worker (DB)", () => {
  let prevOwner: number;
  beforeAll(() => {
    prevOwner = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
  });
  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    if (skipIfNoDb) return;
    const { getDb } = await import("./db");
    const { harvestIdeas, creationItems } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      await db.delete(creationItems).where(eq(creationItems.ownerId, TEST_OWNER_ID));
      await db.delete(harvestIdeas).where(eq(harvestIdeas.ownerId, TEST_OWNER_ID));
    }
  }, 60_000);

  it.skipIf(skipIfNoDb)("backpressure pauses auto-drafting; resurfacing skips snoozed/suppressed", { timeout: 120_000 }, async () => {
    const { getDb } = await import("./db");
    const { harvestIdeas, creationItems } = await import("../drizzle/schema");
    const { and, eq } = await import("drizzle-orm");
    const { runGeneration, READY_BACKPRESSURE_LIMIT } = await import("./lib/harvest");
    const db = (await getDb())!;

    // Fill the ready feed past the limit.
    for (let n = 0; n < READY_BACKPRESSURE_LIMIT; n++) {
      await db.insert(creationItems).values({
        ownerId: TEST_OWNER_ID, captureId: `bp-${n}`, channel: "linkedin",
        aiBody: "x", body: "x", status: "ready", ripeness: 0.7,
      });
    }
    // A ripe transition that WOULD draft without backpressure...
    await db.insert(harvestIdeas).values({
      ownerId: TEST_OWNER_ID, ideaRef: "bp-idea", title: "Backpressure test idea",
      summary: "s", themes: ["food-systems", "regen-economy"], ripeness: 0.9, status: "ripe",
    });
    // ...an old snoozed idea and an old suppressed idea sharing its themes...
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.insert(harvestIdeas).values([
      { ownerId: TEST_OWNER_ID, ideaRef: "old-snoozed", title: "Old snoozed", summary: "s", themes: ["food-systems", "regen-economy"], ripeness: 0.5, status: "snoozed", snoozedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: past },
      { ownerId: TEST_OWNER_ID, ideaRef: "old-suppressed", title: "Old suppressed", summary: "s", themes: ["food-systems", "regen-economy"], ripeness: 0.5, status: "suppressed", createdAt: past },
      { ownerId: TEST_OWNER_ID, ideaRef: "old-ripe", title: "Old ripe cousin", summary: "s", themes: ["food-systems", "regen-economy"], ripeness: 0.4, status: "ripe", createdAt: past },
    ]);

    const stats = await runGeneration();
    expect(stats.backpressure).toBe(true);
    expect(stats.drafted).toBe(0);

    // Resurfacing touched only the ripe cousin, never the snoozed/suppressed.
    const rows = await db.select().from(harvestIdeas).where(eq(harvestIdeas.ownerId, TEST_OWNER_ID));
    const byRef = new Map(rows.map((r) => [r.ideaRef, r]));
    expect(byRef.get("old-ripe")!.whyNow ?? "").toContain("Resurfaced");
    expect(byRef.get("old-snoozed")!.whyNow ?? "").not.toContain("Resurfaced");
    expect(byRef.get("old-suppressed")!.whyNow ?? "").not.toContain("Resurfaced");
    expect(byRef.get("old-snoozed")!.status).toBe("snoozed");
    expect(byRef.get("old-suppressed")!.status).toBe("suppressed");

    // Clearing the feed releases the backpressure and the transition drafts.
    await db.delete(creationItems).where(and(eq(creationItems.ownerId, TEST_OWNER_ID), eq(creationItems.channel, "linkedin")));
    const stats2 = await runGeneration();
    expect(stats2.backpressure).toBe(false);
    expect(stats2.drafted).toBeGreaterThanOrEqual(1);
  });
});
