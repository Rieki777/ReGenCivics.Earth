/**
 * Unit tests for the deterministic pieces of the notification spine:
 * mention parsing (the edge cases that bite: emails, code blocks, dedupe,
 * caps), excerpts, deep links, and email preference resolution.
 *
 * The fan-out itself is guarded by DB unique keys (notifications.dedupeKey,
 * forum_mentions source+user) created in migration 0163; insert idempotency
 * is enforced by the database, not by logic these tests could cover.
 */
import { describe, it, expect } from "vitest";
import {
  parseUserMentions,
  excerpt,
  forumLink,
  MENTION_CAP,
  REACTION_MILESTONES,
} from "./lib/forum-notify";
import {
  resolvePrefs,
  cadenceFor,
  summarizeDigest,
  DEFAULT_NOTIFICATION_PREFS,
  renderNotificationEmail,
  type DigestItem,
} from "./lib/notification-email";

describe("parseUserMentions", () => {
  it("finds a simple mention", () => {
    expect(parseUserMentions("hey @maya what do you think?")).toEqual(["maya"]);
  });

  it("finds a mention at the start of the string", () => {
    expect(parseUserMentions("@maya hello")).toEqual(["maya"]);
  });

  it("does not match email addresses", () => {
    expect(parseUserMentions("write to user@host.com please")).toEqual([]);
    expect(parseUserMentions("rieki.cordon@gmail.com")).toEqual([]);
  });

  it("does not match inside fenced code blocks", () => {
    const content = "look:\n```\n@maya inside code\n```\nno mention";
    expect(parseUserMentions(content)).toEqual([]);
  });

  it("does not match inside inline code", () => {
    expect(parseUserMentions("use `@maya` as the syntax")).toEqual([]);
  });

  it("still matches outside code when code also contains one", () => {
    const content = "real ping @sol\n```\n@maya fake\n```";
    expect(parseUserMentions(content)).toEqual(["sol"]);
  });

  it("dedupes the same handle mentioned twice", () => {
    expect(parseUserMentions("@maya and again @maya")).toEqual(["maya"]);
  });

  it("lowercases handles (matches case-insensitively)", () => {
    expect(parseUserMentions("hi @Maya-Rivers")).toEqual(["maya-rivers"]);
  });

  it("requires at least 3 chars", () => {
    expect(parseUserMentions("hi @ab")).toEqual([]);
    expect(parseUserMentions("hi @abc")).toEqual(["abc"]);
  });

  it("handles punctuation before the @", () => {
    expect(parseUserMentions("(@maya) [@sol] \"@rio\"")).toEqual(["maya", "sol", "rio"]);
  });

  it("drops trailing hyphens rather than including them", () => {
    expect(parseUserMentions("ping @my-handle- ok")).toEqual(["my-handle"]);
  });

  it("returns handles in first-seen order", () => {
    expect(parseUserMentions("@zed then @arlo then @zed")).toEqual(["zed", "arlo"]);
  });

  it("returns empty for empty / no-mention content", () => {
    expect(parseUserMentions("")).toEqual([]);
    expect(parseUserMentions("no mentions here")).toEqual([]);
  });

  it("parses 11+ mentions (the cap is applied at resolution, first 10 win)", () => {
    const handles = Array.from({ length: 12 }, (_, i) => `@user-${i + 10}`).join(" ");
    const parsed = parseUserMentions(handles);
    expect(parsed).toHaveLength(12);
    expect(MENTION_CAP).toBe(10);
  });
});

describe("excerpt", () => {
  it("passes short content through", () => {
    expect(excerpt("hello world")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(excerpt("hello\n\n  world")).toBe("hello world");
  });

  it("truncates long content to 140 chars with an ellipsis", () => {
    const long = "x".repeat(300);
    const out = excerpt(long);
    expect(out.length).toBe(140);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("forumLink", () => {
  it("builds a post link", () => {
    expect(forumLink(42)).toBe("/community/post/42");
  });
  it("builds a comment deep link", () => {
    expect(forumLink(42, 881)).toBe("/community/post/42#reply-881");
  });
});

describe("reaction milestones", () => {
  it("keeps the deterministic thresholds", () => {
    expect(REACTION_MILESTONES).toEqual([1, 5, 10, 25]);
  });
});

describe("resolvePrefs", () => {
  it("returns defaults for null / junk input", () => {
    expect(resolvePrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(resolvePrefs("garbage")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(resolvePrefs(42)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("merges valid partial prefs over defaults", () => {
    const out = resolvePrefs({ mentionsEmail: "daily" });
    expect(out.mentionsEmail).toBe("daily");
    expect(out.repliesEmail).toBe(DEFAULT_NOTIFICATION_PREFS.repliesEmail);
  });

  it("rejects invalid enum values", () => {
    const out = resolvePrefs({ mentionsEmail: "sometimes", gratitudeEmail: "immediate" });
    expect(out.mentionsEmail).toBe(DEFAULT_NOTIFICATION_PREFS.mentionsEmail);
    expect(out.gratitudeEmail).toBe(DEFAULT_NOTIFICATION_PREFS.gratitudeEmail);
  });

  it("preserves legacy keys without breaking (ignores unknown keys)", () => {
    const out = resolvePrefs({ communityUpdates: true, forumInApp: false });
    expect(out.forumInApp).toBe(false);
  });
});

describe("cadenceFor", () => {
  const prefs = resolvePrefs({ mentionsEmail: "immediate", repliesEmail: "daily", gratitudeEmail: "off" });

  it("maps types to their pref channel", () => {
    expect(cadenceFor("mention", prefs)).toBe("immediate");
    expect(cadenceFor("forum_reply", prefs)).toBe("daily");
    expect(cadenceFor("guide_reply", prefs)).toBe("daily");
    expect(cadenceFor("gratitude", prefs)).toBe("off");
  });

  it("keeps noisy types in-app only", () => {
    expect(cadenceFor("thread_followed_activity", prefs)).toBe("off");
    expect(cadenceFor("reaction_milestone", prefs)).toBe("off");
    expect(cadenceFor("system", prefs)).toBe("off");
  });
});

describe("summarizeDigest", () => {
  const item = (type: string): DigestItem => ({
    id: 1, type, title: "t", link: null, createdAt: new Date(),
  });

  it("summarizes mixed items", () => {
    const items = [item("mention"), item("mention"), item("forum_reply"), item("gratitude")];
    expect(summarizeDigest(items)).toBe("2 mentions, 1 reply, 1 gratitude");
  });

  it("counts guide replies as replies", () => {
    expect(summarizeDigest([item("guide_reply"), item("forum_reply")])).toBe("2 replies");
  });

  it("handles a single category", () => {
    expect(summarizeDigest([item("mention")])).toBe("1 mention");
  });
});

describe("renderNotificationEmail", () => {
  it("escapes HTML in the title and excerpt", () => {
    const html = renderNotificationEmail({
      title: '<script>alert(1)</script> mentioned you',
      excerpt: 'look <img onerror="x">',
      ctaUrl: "https://regencivics.earth/community/post/1",
      prefsUrl: "https://regencivics.earth/settings/notifications",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes the deep link CTA and prefs link", () => {
    const html = renderNotificationEmail({
      title: "Maya mentioned you",
      excerpt: null,
      ctaUrl: "https://regencivics.earth/community/post/9#reply-12",
      prefsUrl: "https://regencivics.earth/settings/notifications",
    });
    expect(html).toContain("/community/post/9#reply-12");
    expect(html).toContain("/settings/notifications");
    expect(html).toContain("Open the conversation");
  });
});
