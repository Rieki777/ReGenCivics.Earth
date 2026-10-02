# Email ship note (2026-10-02)

Wave 0 is on `main` as `0702aa01` (#192). The webhook migration `0285` is on `main` as `62d7f756` (#194). Owner alerts through `sendEmail` are on `main` as `c3c5cf93` (#196). This branch is the season rollup only, rebased onto that main. Migration `0284` is in the Wave 0 squash and has not been applied here. No letter was sent to a real inbox. `RESEND_API_KEY` is not set in this environment, so there was no Resend test send.

## This pull request

`sendSeasonRollupEmails` sends one recipient per letter. A rate-limit drop is not counted as sent and stops the rest of the list. A retry skips addresses already accepted for that season. An admin click still sends the wrap. It does not run on deploy. The footer still points at `/settings`.

## First run after a Wave 0 deploy

Apply `drizzle/0284_email_attempt_status.sql` before the new process reads `event_auto_reminder_sends.status`. Existing reminder rows default to `complete`, so old offsets are not sent again. A digest week already saved is not rebroadcast. Needs/offers pairs that already have `emailSentAt` are not introduced again. Held Outbound issues become failed and are not auto-retried. Magic-link requests that Resend does not accept return 500.

Apply `drizzle/0285_email_webhook_events.sql` after 0284, before a complaint is stored. The webhook secret value was not read.

Do not add an `event-reminders` Railway cron until Rye says so. The first successful run would send the 20 to 28 hour signup blast.

## Waiting on Rye

- R-1 postal address and R-5 open pixel: not started.
- R-2 cron commands: measured, not changed. Five services still lack `sh -c` (`cron-nightly-batch`, `cron-admin-automations`, `cron-operator-pulse-ping`, `cron-governance-jobs`, `cron-daily-contribution-snapshots`). No service posts to `/api/cron/event-reminders` or `/api/cron/outbound-issues`.
- R-3 live limiter values: not read. Defaults were not raised.
- R-6 applicant wording: A-8 not started. The words need Rieki's note before that mail goes out.

## What the briefs understated

The hourly event-reminders cron is not failing auth. It is absent. The 20 to 28 hour blast and scheduled custom reminders have no scheduler. Auto-reminder offsets still run inside the server process.
