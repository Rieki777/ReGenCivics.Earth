/**
 * Pure helpers for GET /join — durable site hook that redirects into the
 * current meeting room (shared studio, or a per-event stored URL).
 *
 * Reminder emails and calendar invites never carry raw Riverside/Zoom/Holos
 * URLs; they link here so the platform can change in one place.
 */

import { RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

/** Positive integer event id from `?e=`, or null if missing/invalid. */
export function parseJoinEventId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Accept only absolute http(s) URLs. Rejects javascript:, data:, relative
 * paths, and malformed strings — prevents open redirects via stored fields.
 */
export function safeExternalHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return trimmed;
}

export type JoinRedirectEventFields = {
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
};

/**
 * Resolve where GET /join should 302.
 *
 * - No event (plain /join, bad id, or missing row) → shared studio fallback.
 * - Event found → riversideRoomUrl, else zoomUrl (same priority as EventDetail),
 *   each validated as http(s); else fallback.
 */
export function resolveJoinRedirectTarget(
  event: JoinRedirectEventFields | null,
  fallback: string = RIVERSIDE_ROOM_URL,
): string {
  if (!event) return fallback;
  return (
    safeExternalHttpUrl(event.riversideRoomUrl) ??
    safeExternalHttpUrl(event.zoomUrl) ??
    fallback
  );
}
