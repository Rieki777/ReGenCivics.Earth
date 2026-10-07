/**
 * Deploys land before `npx tsx scripts/run-migration.ts` runs.
 * A select that names a column the database does not have yet must not
 * take down the public site or the recording cron.
 */
import { getTableColumns } from "drizzle-orm";
import { recordings } from "../../drizzle/schema";

const EDITED_CUT_COLUMNS = [
  "editedYoutubeVideoId",
  "editedCutAttachedAt",
  "editedCutMatch",
  "editedEmailSent",
  "descriptionChaptersJson",
] as const;

/** drizzle/0291_recording_pipeline_retry.sql. descriptionChaptersJson stays on 0290. */
const PIPELINE_RETRY_COLUMNS = [
  "processAttempts",
  "lastError",
  "nextRetryAt",
] as const;

export function recordingColumnsOmitting(keys: readonly string[]) {
  const cols = { ...getTableColumns(recordings) };
  for (const key of keys) delete cols[key as keyof typeof cols];
  return cols;
}

export function isMissingSchema(err: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const row = current as { code?: string; errno?: number; message?: string; cause?: unknown };
    if (row.code === "ER_BAD_FIELD_ERROR" || row.errno === 1054) return true;
    if (row.code === "ER_NO_SUCH_TABLE" || row.errno === 1146) return true;
    if (typeof row.message === "string" && /Unknown column|doesn't exist|does not exist/i.test(row.message)) {
      return true;
    }
    current = row.cause;
  }
  return false;
}

/** Columns that exist before drizzle/0290_edited_cut_email.sql. */
export function recordingWithoutEditedCutColumns() {
  return recordingColumnsOmitting([...EDITED_CUT_COLUMNS, ...PIPELINE_RETRY_COLUMNS]);
}

/** 0290 is applied and 0291 is not. */
export function recordingWithoutPipelineRetryColumns() {
  return recordingColumnsOmitting(PIPELINE_RETRY_COLUMNS);
}
