# Email ship note (2026-10-02)

Local branches, not merged. GitHub push failed: the token in this environment is rejected (`Invalid username or token`). No pull request could be opened from here. Nothing was deployed. Migration `0284` and `0285` were not applied. No letter was sent to a real inbox. `RESEND_API_KEY` is not set in this environment, so there was no Resend test send.

## What is committed

| Branch | Commits | What |
|---|---|---|
| `cursor/email-wave0-silent-drop-4e93` | docs plan, then the silent-drop fix | Wave 0 / A-1 + A-7 core. `sendEmail` returns a status and records every attempt. Digest, reminders, harvest, outbound, scheduled mail, recordings, needs/offers, and magic links do not treat a missing Resend id as done. The weekly digest waits out the startup window. |
| `cursor/email-a0-a2-4e93` | cron health, then the webhook | A-0 measured. A-2 matches webhooks by Resend id. |
| `cursor/email-a9-season-rollup-4e93` | season rollup | A-9 sends one recipient per letter. |

## Evidence

- `pnpm gate` passed on the Wave 0 tree (truncation, fund claims, typecheck).
- Unit tests: `server/email-silent-drop.test.ts`, `server/jobs/digestJob.reliability.test.ts`, `server/lib/reminderClaim.test.ts`, `server/harvest-email-drop.test.ts`, `server/auth.magic-link-drop.test.ts`, `server/lib/signupReminderBlast.test.ts`, `server/lib/resendEvent.test.ts`, `server/lib/seasonRollup.test.ts`, `shared/eventReminderCronHealth.test.ts`.
- `pnpm exec tsc --noEmit` passed after the webhook change and again after the rollup.
- Public HTTP, 2026-10-02: `/email-preferences` 200, `/unsubscribe` 200, `/schedule` 200. `/join` returns 302 to the live studio. Reminder copy on this branch still says "Join the call" and links to `/join`.

## First run after a Wave 0 deploy

Apply `drizzle/0284_email_attempt_status.sql` before the new process reads `event_auto_reminder_sends.status`. Existing reminder rows default to `complete`, so old offsets are not sent again. A digest week already saved is not rebroadcast. Needs/offers pairs that already have `emailSentAt` are not introduced again. Held Outbound issues become failed and are not auto-retried. Magic-link requests that Resend does not accept return 500.

Apply `drizzle/0285_email_webhook_events.sql` after 0284, before a complaint is stored. The webhook secret value was not read.

Do not add an `event-reminders` Railway cron until Rye says so. The first successful run would send the 20 to 28 hour signup blast.

## Waiting on Rye

- R-1 postal address and R-5 open pixel: not started.
- R-2 cron commands: measured, not changed. Five services still lack `sh -c` (`cron-nightly-batch`, `cron-admin-automations`, `cron-operator-pulse-ping`, `cron-governance-jobs`, `cron-daily-contribution-snapshots`). No service posts to `/api/cron/event-reminders` or `/api/cron/outbound-issues`.
- R-3 live limiter values: not read. Defaults were not raised.
- R-6 applicant wording: A-8 not started. The words need Rieki's note before that mail goes out.

## Not done

Phase A from A-3 onward (timezone, Season 2 reminders, catch-up wording, the shared `reminderSent` flag, check-in mint, unsubscribe-by-typed-address, and the rest) is still open. Phase B, C, and D are not started. One-sided needs/offers failures still are not retried. The season rollup footer still points at `/settings`.

## What the briefs understated

The hourly event-reminders cron is not failing auth. It is absent. The 20 to 28 hour blast and scheduled custom reminders have no scheduler. Auto-reminder offsets still run inside the server process.
