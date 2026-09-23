/**
 * Persist live-session runbook owners / handoffs in site_settings.
 * No migration — JSON bag keyed by event id.
 */
import { getSiteSetting, setSiteSetting } from "../db";
import {
  LIVE_SESSION_RUNBOOK_SETTING_KEY,
  applyLiveSessionRunbookPatch,
  parseLiveSessionRunbookBag,
  serializeLiveSessionRunbookBag,
  type LiveSessionRoleAssignment,
  type LiveSessionRoleId,
  type LiveSessionRunbookBag,
  type LiveSessionRunbookMeta,
} from "../../shared/liveSessionRunbook";

export async function loadLiveSessionRunbookBag(): Promise<LiveSessionRunbookBag> {
  const raw = await getSiteSetting(LIVE_SESSION_RUNBOOK_SETTING_KEY);
  return parseLiveSessionRunbookBag(raw);
}

export async function saveLiveSessionRunbookBag(bag: LiveSessionRunbookBag): Promise<void> {
  await setSiteSetting(LIVE_SESSION_RUNBOOK_SETTING_KEY, serializeLiveSessionRunbookBag(bag));
}

export async function getLiveSessionRunbookMeta(
  eventId: number,
): Promise<LiveSessionRunbookMeta | null> {
  const bag = await loadLiveSessionRunbookBag();
  return bag[String(eventId)] ?? null;
}

export async function patchLiveSessionRunbook(
  eventId: number,
  rolePatches: Partial<Record<LiveSessionRoleId, Partial<LiveSessionRoleAssignment>>>,
): Promise<LiveSessionRunbookMeta | null> {
  const bag = await loadLiveSessionRunbookBag();
  const next = applyLiveSessionRunbookPatch(bag, eventId, rolePatches);
  await saveLiveSessionRunbookBag(next);
  return next[String(eventId)] ?? null;
}
