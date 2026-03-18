// Runs daily: removes draft applications that have not been updated in 30+ days.
// This prevents stale abandoned drafts from accumulating in the database.
import * as db from "../db";

export async function runDraftCleanupJob() {
  const deleted = await db.deleteStaleApplicationDrafts(30);
  if (deleted > 0) {
    console.log(`[DraftCleanup] Removed ${deleted} stale draft application(s) older than 30 days.`);
  }
}
