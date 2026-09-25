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

  it("keeps the old normalizations", () => {
    expect(resolveNotificationLink({ type: "gratitude", link: "/profile" })).toBe("/profile?tab=gratitude");
    expect(resolveNotificationLink({ type: "campaign_milestone", link: "/campaigns/7" })).toBe("/campaign/7");
    expect(resolveNotificationLink({ type: "system", link: "/x#bounty-3" })).toBe("/bounties/3");
    expect(resolveNotificationLink({ type: "mention", link: null })).toBeNull();
  });
});
