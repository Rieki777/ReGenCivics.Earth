# What still waits on Rye (2026-10-02)

The lane can keep shipping code. These items need a person.

| # | Waiting on | Why it blocks |
|---|---|---|
| R-1 | A postal address for bulk email footers | Phase B-5. Do not invent an address. `HARVEST_POSTAL_ADDRESS` is the variable name already in use for harvest mail. |
| R-2 | Railway cron commands | Measured 2026-10-02. No service posts to `/api/cron/event-reminders` or `/api/cron/outbound-issues`. Five commands still lack `sh -c`: nightly-batch, admin-automations, operator-pulse-ping, governance-jobs, daily-contribution-snapshots. Do not add an event-reminders cron. The first successful run would send the 20 to 28 hour signup blast. |
| R-3 | Live limiter values | `EMAIL_RATE_LIMIT_PER_HOUR`, `STARTUP_EMAIL_LIMIT`, `EMAIL_HOLD`, and whether `RESEND_WEBHOOK_SECRET` is set. Defaults were not raised. |
| R-4 | Resend webhook target | Confirm it posts to `https://regencivics.earth/api/webhooks/resend` for delivered, bounced, complained, failed, suppressed, and delivery_delayed. The secret value was not read. |
| R-5 | Open tracking pixel | Keep it or remove it. Code has not removed the pixel. |
| R-6 | Applicant mail wording | A-8 is not started. Application status still goes to the owner with the applicant address in the body. Do not invent the applicant's letter. |
| R-7 | Ship Manifest sequence | A-21. The sequence is not scheduled. Wire it or remove it only after a yes. |

Also still open in code, and not blocked on those answers: one-sided needs/offers failures, unsubscribe by a typed address (old links still accept it), the per-event stop link, the hardcoded always-include address, waitlist faults, outbound resume, unescaped older templates, and the dead settings in A-21 other than the Ship Manifest.
