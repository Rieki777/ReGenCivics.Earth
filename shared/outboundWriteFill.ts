/**
 * Admin AI compose-action bus for Outbound Write.
 * Mirrors Broadcast's sessionStorage + CustomEvent fill (PR #91).
 * Chat never sends mail. This only drops subject/body/layout into the composer.
 */
import { isLetterLayout, type LetterLayout } from "./letterLayout";

export const OUTBOUND_WRITE_FILL_EVENT = "admin-outbound-write-fill";
export const OUTBOUND_WRITE_FILL_KEY = "outbound_write_fill_pending";

export type OutboundWriteFill = {
  subject?: string;
  body?: string;
  layout?: LetterLayout;
};

export function isOutboundWriteSurface(tab?: string, surface?: string): boolean {
  return tab === "outbound" && surface === "write";
}

/** True when an Admin AI compose action should fill Outbound Write. */
export function isOutboundWriteComposeAction(action: {
  type?: string;
  tab?: string;
  surface?: string;
  to?: string;
}): boolean {
  if (action.type !== "compose") return false;
  if (action.tab === "write") return true;
  if (action.tab !== "outbound") return false;
  return !action.surface || action.surface === "write";
}

export function serializeOutboundWriteFill(fill: OutboundWriteFill): string | null {
  const subject = typeof fill.subject === "string" ? fill.subject : "";
  const body = typeof fill.body === "string" ? fill.body : "";
  const layout = isLetterLayout(fill.layout) ? fill.layout : undefined;
  if (!subject.trim() && !body.trim() && !layout) return null;
  return JSON.stringify({
    ...(subject ? { subject } : {}),
    ...(body ? { body } : {}),
    ...(layout ? { layout } : {}),
  });
}

export function parseOutboundWriteFill(raw: string | null | undefined): OutboundWriteFill | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const subject = typeof parsed.subject === "string" ? parsed.subject : undefined;
    const body = typeof parsed.body === "string" ? parsed.body : undefined;
    const layout = isLetterLayout(parsed.layout) ? parsed.layout : undefined;
    if (!subject?.trim() && !body?.trim() && !layout) return null;
    return { subject, body, layout };
  } catch {
    // Plain text from an older or partial fill: treat as body.
    return { body: raw };
  }
}

export function queueOutboundWriteFill(fill: OutboundWriteFill): boolean {
  const payload = serializeOutboundWriteFill(fill);
  if (!payload) return false;
  try {
    sessionStorage.setItem(OUTBOUND_WRITE_FILL_KEY, payload);
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OUTBOUND_WRITE_FILL_EVENT, { detail: fill }));
  }
  return true;
}

export function consumeOutboundWriteFill(): OutboundWriteFill | null {
  try {
    const raw = sessionStorage.getItem(OUTBOUND_WRITE_FILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OUTBOUND_WRITE_FILL_KEY);
    return parseOutboundWriteFill(raw);
  } catch {
    return null;
  }
}

export function clearOutboundWriteFill(): void {
  try {
    sessionStorage.removeItem(OUTBOUND_WRITE_FILL_KEY);
  } catch {
    /* private mode */
  }
}
