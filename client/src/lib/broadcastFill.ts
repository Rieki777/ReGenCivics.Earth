/**
 * Harvest → Outbound Social (and assistant → Broadcast) compose handoff.
 * Storage key and event name match Broadcast Voice so either writer works.
 */
import { adminTabHref } from "@/lib/adminNav";

export { BROADCAST_FILL_EVENT } from "@shared/broadcastChannels";

export const BROADCAST_FILL_STORAGE_KEY = "broadcast_fill_pending";

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
