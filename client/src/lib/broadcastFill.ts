/**
 * Harvest → Outbound Social (and assistant → Broadcast) compose handoff.
 * Storage key and event name match Broadcast Voice so either writer works.
 * Same pattern as Outbound Write: sessionStorage + CustomEvent so same-tab
 * navigations and late-mount panels always pick up the fill.
 */
import { adminTabHref } from "@/lib/adminNav";
import { BROADCAST_FILL_EVENT } from "@shared/broadcastChannels";

export { BROADCAST_FILL_EVENT };

export const BROADCAST_FILL_STORAGE_KEY = "broadcast_fill_pending";

export function outboundSocialHref(): string {
  return adminTabHref("outbound", { surface: "social" });
}

export function outboundWriteHref(): string {
  return adminTabHref("outbound", { surface: "write" });
}

/**
 * Queue the complete source body; the Social composer owns per-network limits.
 * Dispatches BROADCAST_FILL_EVENT with `{ text }` so an already-mounted panel
 * applies the fill without waiting for remount. Empty/whitespace is refused.
 */
export function queueBroadcastFill(text: string): boolean {
  if (!text.trim()) return false;
  try {
    sessionStorage.setItem(BROADCAST_FILL_STORAGE_KEY, text);
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BROADCAST_FILL_EVENT, { detail: { text } }));
  }
  return true;
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
