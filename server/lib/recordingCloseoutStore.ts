/**
 * Persist recording closeout ownership / due / workflow status in site_settings.
 * No migration — JSON bag keyed by recording id.
 */
import { getSiteSetting, setSiteSetting } from "../db";
import {
  RECORDING_CLOSEOUT_SETTING_KEY,
  applyCloseoutMetaPatch,
  parseCloseoutMetaBag,
  serializeCloseoutMetaBag,
  type RecordingCloseoutMeta,
  type RecordingCloseoutMetaBag,
} from "../../shared/recordingCloseout";

export async function loadCloseoutMetaBag(): Promise<RecordingCloseoutMetaBag> {
  const raw = await getSiteSetting(RECORDING_CLOSEOUT_SETTING_KEY);
  return parseCloseoutMetaBag(raw);
}

export async function saveCloseoutMetaBag(bag: RecordingCloseoutMetaBag): Promise<void> {
  await setSiteSetting(RECORDING_CLOSEOUT_SETTING_KEY, serializeCloseoutMetaBag(bag));
}

export async function patchCloseoutMeta(
  recordingId: number,
  patch: RecordingCloseoutMeta,
): Promise<RecordingCloseoutMeta | null> {
  const bag = await loadCloseoutMetaBag();
  const next = applyCloseoutMetaPatch(bag, recordingId, patch);
  await saveCloseoutMetaBag(next);
  return next[String(recordingId)] ?? null;
}
