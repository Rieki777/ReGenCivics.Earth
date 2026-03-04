/**
 * Notification helper that respects admin notification preferences.
 * Wraps notifyOwner and checks the notificationPreferences table before sending.
 */
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

/**
 * Notification type keys that map to the notificationPreferences table columns.
 */
export type NotificationTypeKey =
  | "applicationSubmissions"
  | "investorInquiries"
  | "allianceRequests"
  | "workWithRegens"
  | "roleRequests"
  | "loiSubmissions"
  | "campaignContributions"
  | "newsletterSignups";

/**
 * Send a notification if the given type is enabled in admin preferences.
 * Returns true if the notification was sent, false if it was skipped or failed.
 */
export async function notifyIfEnabled(
  type: NotificationTypeKey,
  payload: { title: string; content: string }
): Promise<boolean> {
  try {
    const enabled = await db.isNotificationEnabled(type);
    if (!enabled) {
      console.log(`[Notification] Skipped (disabled): ${type} - ${payload.title}`);
      return false;
    }
    return await notifyOwner(payload);
  } catch (error) {
    console.warn(`[Notification] Error checking preferences for ${type}:`, error);
    // Fall back to sending the notification if we can't check preferences
    try {
      return await notifyOwner(payload);
    } catch (fallbackError) {
      console.warn(`[Notification] Fallback also failed:`, fallbackError);
      return false;
    }
  }
}

/**
 * Map general inquiry pathType to the appropriate notification preference key.
 */
export function getNotificationTypeForPath(pathType: string): NotificationTypeKey {
  switch (pathType) {
    case "alliance":
      return "allianceRequests";
    case "create_with_regens":
      return "workWithRegens";
    case "role":
      return "roleRequests";
    case "land_partner":
    case "live":
    case "finance":
    case "learn":
    case "something_else":
    default:
      // These all fall under general connect form submissions
      // We'll use the most relevant one or default to applicationSubmissions for land_partner
      if (pathType === "land_partner") return "applicationSubmissions";
      if (pathType === "finance") return "investorInquiries";
      // For live, learn, something_else - use allianceRequests as a catch-all
      return "allianceRequests";
  }
}
