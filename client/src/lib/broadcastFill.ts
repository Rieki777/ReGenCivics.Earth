/**
 * Harvest → Outbound Social (and assistant → Broadcast) compose handoff.
 *
 * The key and event name match PR #91 (Broadcast Voice) so a pending fill
 * written here is picked up by that panel, and the other way around.
 */
import { adminTabHref } from "@/lib/adminNav";

export const BROADCAST_FILL_STORAGE_KEY = "broadcast_fill_pending";
export const BROADCAST_FILL_EVENT = "admin-broadcast-fill";

export function outboundSocialHref(): string {
  return adminTabHref("outbound", { surface: "social" });
}

export function queueBroadcastFill(text: string): void {
  try {
    sessionStorage.setItem(BROADCAST_FILL_STORAGE_KEY, text);
  } catch {
    /* private mode */
  }
}

export function consumeBroadcastFill(): string | null {
  try {
    const pending = sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY);
    if (!pending) return null;
    sessionStorage.removeItem(BROADCAST_FILL_STORAGE_KEY);
    return pending;
  } catch {
    return null;
  }
}

export function clearBroadcastFill(): void {
  try {
    sessionStorage.removeItem(BROADCAST_FILL_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
