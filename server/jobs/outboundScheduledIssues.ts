/**
 * Due Outbound newsletter letters. Distinct from Events auto-reminders
 * (`server/jobs/eventReminders.ts`), which send OA/S2 call reminders.
 *
 * Picked up by POST /api/cron/outbound-issues and a one-minute in-process
 * sweep so a letter scheduled for 9:01 Pacific does not wait for a Railway
 * hourly tick.
 */
import { runDueNewsletterIssues } from "../lib/newsletter-issue-email";

export { runDueNewsletterIssues };
