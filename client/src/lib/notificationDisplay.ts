/**
 * How the bell and /notifications show a spine row: its glyph, where a click
 * goes, and which filter chip it belongs to. Pure, so it is unit-tested
 * (server/notification-display.test.ts) and kept in step with the server's
 * list of campaign types in server/lib/notification-email.ts.
 */

/** Every campaign notice type on the spine. Mirrors CAMPAIGN_NOTIFICATION_TYPES on the server. */
export const CAMPAIGN_NOTIFICATION_TYPES = [
  "new_contribution",
  "contribution_accepted",
  "contribution_rejected",
  "contribution_delivered",
  "contribution_thanked",
  "contribution_released",
  "role_filled",
  "role_reopened",
  "campaign_update",
  "campaign_approved",
  "campaign_declined",
  "campaign_cancelled",
  "campaign_completed",
  "campaign_milestone",
  "claim_expired",
] as const;

export function isCampaignNotification(type: string): boolean {
  return (CAMPAIGN_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/**
 * Fallback for a row with no link (rows migrated from the legacy table).
 * Campaign rows written by the spine always carry their project-page link,
 * which wins; this only catches old rows. A campaign row never falls back
 * to the gratitude tab.
 */
export function legacyLink(type: string): string | null {
  switch (type) {
    case "contribution_accepted":
    case "contribution_rejected":
    case "contribution_delivered":
    case "contribution_thanked":
    case "contribution_released":
    case "claim_expired":
    case "claim_complete":
    case "claim_failed":
      return "/profile?tab=contributions";
    case "new_contribution":
    case "role_filled":
    case "role_reopened":
    case "campaign_update":
    case "campaign_approved":
    case "campaign_declined":
    case "campaign_cancelled":
    case "campaign_completed":
      return "/campaigns";
    case "campaign_milestone":
      return "/crowd-pooling";
    case "quest_complete":
      return "/quest";
    case "gratitude":
      return "/profile?tab=gratitude";
    default:
      return null;
  }
}

/** Destination for a notification. Older rows keep whatever link they were
 * created with, and several historical formats are wrong or dead:
 * bare "/profile" (lands on Overview instead of the relevant section),
 * "#bounty-N" anchors (no matching element ever rendered),
 * "/campaigns/N" and "/crowdpooling" (routes are /campaign/:id and
 * /crowd-pooling). Normalize them all here, at click time, so history
 * stays useful without a data migration. */
export function resolveNotificationLink(item: { type: string; link: string | null }): string | null {
  const target = item.link || legacyLink(item.type);
  if (!target) return null;
  if (item.type === "gratitude" && target === "/profile") {
    return "/profile?tab=gratitude";
  }
  if ((item.type === "claim_complete" || item.type === "claim_failed") && target === "/profile") {
    return "/profile?tab=contributions";
  }
  if (isCampaignNotification(item.type) && target === "/profile") {
    return "/profile?tab=contributions";
  }
  const bounty = target.match(/#bounty-(\d+)$/);
  if (bounty) return `/bounties/${bounty[1]}`;
  const campaign = target.match(/^\/campaigns\/(\d+)/);
  if (campaign) return `/campaign/${campaign[1]}`;
  if (target === "/crowdpooling") return "/crowd-pooling";
  return target;
}

export function typeGlyph(type: string): string {
  switch (type) {
    case "mention": return "@";
    case "forum_reply":
    case "thread_followed_activity": return "↩";
    case "gratitude": return "🙏";
    case "guide_reply":
    case "elder_reply": return "🌿";
    case "reaction_milestone": return "✨";
    case "governance_stage": return "🌀";
    case "contribution_accepted": return "✓";
    case "contribution_rejected": return "✗";
    case "campaign_milestone": return "★";
    case "quest_complete": return "⚑";
    // Campaign notices
    case "new_contribution": return "✋";
    case "campaign_update": return "📣";
    case "contribution_delivered": return "📦";
    case "contribution_thanked": return "💚";
    case "contribution_released": return "↺";
    case "role_filled": return "◉";
    case "role_reopened": return "🚪";
    case "campaign_approved": return "🌱";
    case "campaign_declined": return "✎";
    case "campaign_cancelled": return "⊘";
    case "campaign_completed": return "🌳";
    case "claim_expired": return "⌛";
    default: return "•";
  }
}
