/**
 * Notification prefs for campaign notices, and the prefs merge both writers
 * use. Pure, no database.
 */
import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_NOTIFICATION_TYPES,
  DEFAULT_NOTIFICATION_PREFS,
  cadenceFor,
  digestWants,
  FAN_OUT_CAMPAIGN_TYPES,
  MISSED_IMMEDIATE_AFTER_MS,
  mergeNotificationPrefs,
  parseStoredPrefs,
  renderNotificationEmail,
  resolvePrefs,
  summarizeDigest,
} from "./lib/notification-email";
import { isPushableType, pushPrefKeyFor, pushTagFor } from "./lib/push";
import { clampText } from "./lib/forum-notify";
import { __emailRateLimitsForTests } from "./_core/email";

describe("campaignsEmail", () => {
  it("defaults to right away", () => {
    expect(DEFAULT_NOTIFICATION_PREFS.campaignsEmail).toBe("immediate");
    expect(resolvePrefs(null).campaignsEmail).toBe("immediate");
  });
  it("reads a stored value and ignores junk", () => {
    expect(resolvePrefs({ campaignsEmail: "daily" }).campaignsEmail).toBe("daily");
    expect(resolvePrefs({ campaignsEmail: "off" }).campaignsEmail).toBe("off");
    expect(resolvePrefs({ campaignsEmail: "hourly" }).campaignsEmail).toBe("immediate");
  });
  it("reads a legacy string-encoded value", () => {
    expect(resolvePrefs(JSON.stringify({ campaignsEmail: "off" })).campaignsEmail).toBe("off");
  });
});

describe("cadenceFor campaign types", () => {
  it("maps every campaign type to campaignsEmail", () => {
    const prefs = resolvePrefs({ campaignsEmail: "daily" });
    for (const t of CAMPAIGN_NOTIFICATION_TYPES) expect(cadenceFor(t, prefs), t).toBe("daily");
    const off = resolvePrefs({ campaignsEmail: "off" });
    for (const t of CAMPAIGN_NOTIFICATION_TYPES) expect(cadenceFor(t, off), t).toBe("off");
  });
  it("sends campaign updates in the daily digest when the pref is right away", () => {
    const prefs = resolvePrefs({ campaignsEmail: "immediate" });
    expect(cadenceFor("campaign_update", prefs)).toBe("daily");
    expect(cadenceFor("contribution_accepted", prefs)).toBe("immediate");
  });
  it("sends every fan-out notice (cancel, complete, role filled) by digest, never one email each at once", () => {
    const prefs = resolvePrefs({ campaignsEmail: "immediate" });
    for (const t of ["campaign_cancelled", "campaign_completed", "role_filled", "campaign_update"]) {
      expect(FAN_OUT_CAMPAIGN_TYPES).toContain(t);
      expect(cadenceFor(t, prefs), t).toBe("daily");
    }
    expect(cadenceFor("new_contribution", prefs)).toBe("immediate");
  });
  it("lets the digest carry an immediate email the cap held, once it is an hour old", () => {
    const prefs = resolvePrefs({ campaignsEmail: "immediate" });
    const now = Date.now();
    const fresh = new Date(now - 5 * 60 * 1000);
    const old = new Date(now - MISSED_IMMEDIATE_AFTER_MS - 1000);
    expect(digestWants("contribution_accepted", fresh, prefs, now)).toBe(false);
    expect(digestWants("contribution_accepted", old, prefs, now)).toBe(true);
    expect(digestWants("campaign_update", fresh, prefs, now)).toBe(true);
    expect(digestWants("contribution_accepted", old, resolvePrefs({ campaignsEmail: "off" }), now)).toBe(false);
  });
  it("leaves forum types alone", () => {
    const prefs = resolvePrefs({ campaignsEmail: "off" });
    expect(cadenceFor("mention", prefs)).toBe("immediate");
    expect(cadenceFor("system", prefs)).toBe("off");
  });
});

describe("mergeNotificationPrefs", () => {
  const stored = {
    communityUpdates: true,
    questAnnouncements: false,
    governanceUpdates: true,
    mentionsPush: false,
    campaignsPush: false,
    mentionsEmail: "daily",
  };

  it("keeps the legacy and push keys when the forum prefs are saved", () => {
    const out = mergeNotificationPrefs(stored, { campaignsEmail: "off" });
    expect(out).toMatchObject({
      communityUpdates: true,
      questAnnouncements: false,
      governanceUpdates: true,
      mentionsPush: false,
      campaignsPush: false,
      mentionsEmail: "daily",
      campaignsEmail: "off",
    });
  });

  it("keeps the email prefs when the legacy toggles are saved", () => {
    const out = mergeNotificationPrefs(stored, { communityUpdates: false, governanceUpdates: false });
    expect(out.mentionsEmail).toBe("daily");
    expect(out.communityUpdates).toBe(false);
    expect(out.governanceUpdates).toBe(false);
  });

  it("parses a string-encoded legacy value, even double-encoded", () => {
    const once = JSON.stringify({ governanceUpdates: true, repliesEmail: "off" });
    expect(mergeNotificationPrefs(once, {})).toMatchObject({ governanceUpdates: true, repliesEmail: "off" });
    expect(mergeNotificationPrefs(JSON.stringify(once), {})).toMatchObject({ governanceUpdates: true });
    expect(parseStoredPrefs("not json")).toEqual({});
    expect(parseStoredPrefs([1, 2])).toEqual({});
  });

  it("ignores undefined patch values", () => {
    expect(mergeNotificationPrefs(stored, { communityUpdates: undefined }).communityUpdates).toBe(true);
  });

  it("serializes so assemblyNotify's LIKE '%\"governanceUpdates\":true%' still matches", () => {
    const out = mergeNotificationPrefs(JSON.stringify({ questAnnouncements: true }), { governanceUpdates: true });
    // drizzle's json column writes JSON.stringify(value).
    expect(typeof out).toBe("object");
    expect(JSON.stringify(out)).toContain('"governanceUpdates":true');
  });
});

describe("campaign emails and digest", () => {
  it("labels the CTA for campaign notices", () => {
    const html = renderNotificationEmail({
      title: "Seeds &amp; Soil accepted your offer",
      excerpt: null,
      ctaUrl: "https://regencivics.earth/project/42-seeds",
      prefsUrl: "https://regencivics.earth/settings/notifications",
      ctaLabel: "Open the project page",
    });
    expect(html).toContain("Open the project page");
    expect(html).toContain("Seeds &amp; Soil");
    expect(html).not.toContain("&amp;amp;");
  });
  it("never leaves the digest heading blank for campaign rows", () => {
    const item = (type: string) => ({ id: 1, type, title: "t", link: null, createdAt: new Date() });
    expect(summarizeDigest([item("campaign_update")])).toBe("1 piece of campaign news");
    expect(summarizeDigest([item("campaign_update"), item("role_filled")])).toBe("2 pieces of campaign news");
    expect(summarizeDigest([item("system")])).toBe("1 new notice");
  });
});

describe("push for campaign notices", () => {
  it("pushes campaign types except updates, under campaignsPush", () => {
    expect(isPushableType("contribution_accepted")).toBe(true);
    expect(isPushableType("campaign_cancelled")).toBe(true);
    expect(isPushableType("campaign_update")).toBe(false);
    expect(pushPrefKeyFor("role_filled")).toBe("campaignsPush");
    expect(pushPrefKeyFor("mention")).toBe("mentionsPush");
    expect(pushPrefKeyFor("forum_reply")).toBe("repliesPush");
  });
  it("collapses by campaign", () => {
    expect(pushTagFor({ campaignId: 7, postId: null })).toBe("campaign-7");
    expect(pushTagFor({ campaignId: null, postId: 3 })).toBe("post-3");
    expect(pushTagFor({})).toBeUndefined();
  });
});

describe("clampText", () => {
  it("clamps to the column length without splitting an emoji", () => {
    const long = "🌱".repeat(300);
    const out = clampText(long, 255);
    expect(Array.from(out)).toHaveLength(255);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/[\uD800-\uDBFF]…$/);
    expect(clampText("short", 255)).toBe("short");
  });
});

describe("the email send cap", () => {
  it("keeps sign-in links on their own budget, so a burst of notices can't lock people out", () => {
    const { check, record } = __emailRateLimitsForTests;
    // Use up the shared budget (the startup guard alone allows 5; the hourly cap 50).
    record(60);
    expect(check(1, "A campaign notice").blocked).toBe(true);
    expect(check(1, "Your ReGen Civics login link", "auth").blocked).toBe(false);
    // The sign-in budget has a ceiling of its own.
    record(200, "auth");
    expect(check(1, "Your ReGen Civics login link", "auth").blocked).toBe(true);
  });
});
