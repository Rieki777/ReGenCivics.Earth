/**
 * Daily contribution snapshot cron — site_settings last-ok stamp key.
 * Mirrors shared/eventReminderCronHealth.ts (cheap stamp, no new table).
 * Admin health UI can read this later; stamp alone is enough for ops greps.
 */

/** site_settings key: ISO timestamp of last successful HTTP cron completion. */
export const DAILY_SNAPSHOT_CRON_LAST_OK_KEY =
  "daily_contribution_snapshots.last_cron_ok_at";

/** Suggested Railway cron expression (00:15 UTC — yesterday UTC is closed). */
export const DAILY_SNAPSHOT_CRON_EXPR = "15 0 * * *";

export const DAILY_SNAPSHOT_CRON_PATH = "/api/cron/daily-contribution-snapshots";
