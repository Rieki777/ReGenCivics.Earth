import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_NOTIFICATION_TYPES as CLIENT_TYPES,
  legacyLink,
  resolveNotificationLink,
  typeGlyph,
} from "../client/src/lib/notificationDisplay";
import { CAMPAIGN_NOTIFICATION_TYPES as SERVER_TYPES } from "./lib/notification-email";

describe("notification display (bell + /notifications)", () => {
  it("the client's campaign types match the server's list", () => {
    expect([...CLIENT_TYPES].sort()).toEqual([...SERVER_TYPES].sort());
  });

  it("every campaign type has its own glyph", () => {
    for (const t of CLIENT_TYPES) {
      expect(typeGlyph(t), t).not.toBe("•");
    }
    // The new ones are distinct from each other.
    const fresh = [
      "new_contribution", "campaign_update", "contribution_delivered", "contribution_thanked",
      "contribution_released", "role_filled", "campaign_approved", "campaign_declined",
      "campaign_cancelled", "campaign_completed", "claim_expired", "role_reopened",
    ];
    expect(new Set(fresh.map(typeGlyph)).size).toBe(fresh.length);
  });

  it("a campaign row goes to its own project-page link", () => {
    for (const t of CLIENT_TYPES) {
      expect(resolveNotificationLink({ type: t, link: "/project/42-hill-farm#your-contributions" }))
        .toBe("/project/42-hill-farm#your-contributions");
    }
  });

  it("a campaign row never falls back to the gratitude tab", () => {
    for (const t of CLIENT_TYPES) {
      const noLink = resolveNotificationLink({ type: t, link: null });
      expect(noLink, t).not.toBeNull();
      expect(noLink, t).not.toContain("gratitude");
      expect(resolveNotificationLink({ type: t, link: "/profile" }), t).not.toContain("gratitude");
      expect(legacyLink(t), t).not.toContain("gratitude");
    }
    expect(resolveNotificationLink({ type: "contribution_thanked", link: null })).toBe("/profile?tab=contributions");
  });

  it("shows the build 3 notices (0264) with their own glyphs and fallbacks", () => {
    const glyphs: Record<string, string> = {
      offer_waiting: "⏳",
      offer_still_waiting: "⏳",
      campaign_opened: "🌱",
      campaign_final_stretch: "🌱",
      campaign_closed: "🚪",
      contributor_reply: "💬",
    };
    for (const [t, glyph] of Object.entries(glyphs)) {
      expect(CLIENT_TYPES as readonly string[], t).toContain(t);
      expect(typeGlyph(t), t).toBe(glyph);
    }
    // The contributor's note lands on their contributions; the rest on the campaigns.
    expect(legacyLink("offer_still_waiting")).toBe("/profile?tab=contributions");
    for (const t of ["offer_waiting", "campaign_opened", "campaign_final_stretch", "campaign_closed", "contributor_reply"]) {
      expect(legacyLink(t), t).toBe("/campaigns");
    }
  });

  it("keeps the old normalizations", () => {
    expect(resolveNotificationLink({ type: "gratitude", link: "/profile" })).toBe("/profile?tab=gratitude");
    expect(resolveNotificationLink({ type: "campaign_milestone", link: "/campaigns/7" })).toBe("/campaign/7");
    // A milestone with no stored link opens the campaigns, never the gift map (bundle 1, section 16.2).
    expect(resolveNotificationLink({ type: "campaign_milestone", link: null })).toBe("/campaigns");
    expect(resolveNotificationLink({ type: "system", link: "/x#bounty-3" })).toBe("/bounties/3");
    expect(resolveNotificationLink({ type: "mention", link: null })).toBeNull();
  });
});
