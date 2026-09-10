/**
 * Community email preference center: token round-trip, topic filter, unsub-all.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  BLAST_TOPIC,
  subscriberAllowsTopic,
  isEmailTopicKey,
  type SubscriberTopicFlags,
} from "@shared/emailPrefs";
import { newsletterLegalFooterHtml } from "@shared/letterHtml";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_EMAIL = `prefs-center-${Date.now()}@example.org`;

function flags(over: Partial<SubscriberTopicFlags> = {}): SubscriberTopicFlags {
  return {
    isActive: 1,
    marketingPausedUntil: null,
    prefSeasonal: 1,
    prefOpenAccess: 1,
    prefSeason2: 1,
    prefEvents: 1,
    notifyRecordings: 1,
    ...over,
  };
}

describe("email preference topics (no DB)", () => {
  it("names the five community topics and the blast map", () => {
    expect(isEmailTopicKey("open_access")).toBe(true);
    expect(isEmailTopicKey("investor")).toBe(false);
    expect(BLAST_TOPIC.harvest).toBe("seasonal");
    expect(BLAST_TOPIC.outbound).toBe("seasonal");
    expect(BLAST_TOPIC.openAccess).toBe("open_access");
    expect(BLAST_TOPIC.season2).toBe("season2");
    expect(BLAST_TOPIC.events).toBe("events");
    expect(BLAST_TOPIC.recordings).toBe("recordings");
  });

  it("lets an active subscriber through when the topic is on", () => {
    expect(subscriberAllowsTopic(flags(), "seasonal")).toBe(true);
    expect(subscriberAllowsTopic(flags({ prefOpenAccess: 0 }), "open_access")).toBe(false);
    expect(subscriberAllowsTopic(flags({ notifyRecordings: 0 }), "recordings")).toBe(false);
  });

  it("excludes unsubscribed people from every community topic", () => {
    const sub = flags({ isActive: 0 });
    expect(subscriberAllowsTopic(sub, "seasonal")).toBe(false);
    expect(subscriberAllowsTopic(sub, "recordings")).toBe(false);
  });

  it("excludes a paused subscriber until the pause ends", () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 1000);
    expect(subscriberAllowsTopic(flags({ marketingPausedUntil: future }), "seasonal")).toBe(false);
    expect(subscriberAllowsTopic(flags({ marketingPausedUntil: past }), "seasonal")).toBe(true);
  });

  it("maps recordings to notifyRecordings", () => {
    expect(subscriberAllowsTopic(flags({ notifyRecordings: 0 }), "recordings")).toBe(false);
    expect(subscriberAllowsTopic(flags({ notifyRecordings: 1, prefSeasonal: 0 }), "recordings")).toBe(true);
  });
});

describe("letter prefs footer", () => {
  it("uses Manage email preferences as the only CTA", () => {
    const html = newsletterLegalFooterHtml("https://regencivics.earth/email-preferences?token=abc");
    expect(html).toContain("Manage email preferences");
    expect(html).toContain("/email-preferences?token=abc");
    expect(html).not.toMatch(/>Unsubscribe</);
  });
});

describe("prefs token round-trip", () => {
  it("signs and verifies an email, and rejects tampering", async () => {
    const { ENV } = await import("./_core/env");
    if (!ENV.cookieSecret) {
      (ENV as { cookieSecret: string }).cookieSecret = "test-email-prefs-secret-32chars!!";
    }
    const { buildPrefsToken, verifyPrefsToken, managePreferencesUrl } = await import("./lib/emailPrefs");
    const token = await buildPrefsToken("player@example.org");
    expect(await verifyPrefsToken(token)).toBe("player@example.org");
    expect(await verifyPrefsToken(token.slice(0, -4) + "xxxx")).toBeNull();
    expect(await verifyPrefsToken("not-a-token")).toBeNull();

    const url = await managePreferencesUrl("player@example.org", { mute: "open_access" });
    expect(url).toContain("/email-preferences?");
    expect(url).toContain("mute=open_access");
    expect(url).toContain("token=");
  });

  it("accepts the older Outbound unsubscribe token purpose", async () => {
    const { SignJWT } = await import("jose");
    const { ENV } = await import("./_core/env");
    if (!ENV.cookieSecret) {
      (ENV as { cookieSecret: string }).cookieSecret = "test-email-prefs-secret-32chars!!";
    }
    const { verifyPrefsToken } = await import("./lib/emailPrefs");
    const token = await new SignJWT({ email: "ada@example.org", purpose: "newsletter-unsubscribe" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("90d")
      .sign(new TextEncoder().encode(ENV.cookieSecret));
    expect(await verifyPrefsToken(token)).toBe("ada@example.org");
  });
});

describe.skipIf(skipIfNoDb)("audienceForTopic + unsub-all (DB)", () => {
  beforeAll(async () => {
    const { getDb } = await import("./db");
    const { newsletterSubscribers } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) return;
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, TEST_EMAIL));
    await db.insert(newsletterSubscribers).values({
      email: TEST_EMAIL,
      name: "Prefs Test",
      source: "other",
      isActive: 1,
      prefSeasonal: 1,
      prefOpenAccess: 1,
      prefSeason2: 1,
      prefEvents: 1,
      notifyRecordings: 0,
    });
  }, 60_000);

  afterAll(async () => {
    const { getDb } = await import("./db");
    const { newsletterSubscribers } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) return;
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, TEST_EMAIL));
  }, 60_000);

  it("filters by topic, preserves notifyRecordings off, and unsub-all drops every topic", async () => {
    const { audienceForTopic, unsubscribeAllCommunity, muteTopic, pauseCommunityMail } = await import("./lib/emailPrefs");
    const { getNewsletterSubscriberByEmail } = await import("./db/newsletter");

    const seasonal = await audienceForTopic("seasonal");
    expect(seasonal.some((r) => r.email === TEST_EMAIL)).toBe(true);

    const recordings = await audienceForTopic("recordings");
    expect(recordings.some((r) => r.email === TEST_EMAIL)).toBe(false);

    await muteTopic(TEST_EMAIL, "open_access");
    const oa = await audienceForTopic("open_access");
    expect(oa.some((r) => r.email === TEST_EMAIL)).toBe(false);
    expect((await audienceForTopic("seasonal")).some((r) => r.email === TEST_EMAIL)).toBe(true);

    await pauseCommunityMail(TEST_EMAIL, 30);
    expect((await audienceForTopic("seasonal")).some((r) => r.email === TEST_EMAIL)).toBe(false);
    await pauseCommunityMail(TEST_EMAIL, 0);
    expect((await audienceForTopic("seasonal")).some((r) => r.email === TEST_EMAIL)).toBe(true);

    await unsubscribeAllCommunity(TEST_EMAIL);
    const row = await getNewsletterSubscriberByEmail(TEST_EMAIL);
    expect(row?.isActive).toBe(0);
    expect((await audienceForTopic("seasonal")).some((r) => r.email === TEST_EMAIL)).toBe(false);
    expect((await audienceForTopic("events")).some((r) => r.email === TEST_EMAIL)).toBe(false);
  });
});
