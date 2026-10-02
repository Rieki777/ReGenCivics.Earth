# Email cron health (measured 2026-10-02)

Read from the Railway project **ReGen Civics** (`1b47f872-03c6-4c22-9ab7-a42c81d11e51`), production environment, service config only. Variable values were not read. No cron command was changed.

## What actually sends reminders

`POST /api/cron/event-reminders` is the only path that runs the 20 to 28 hour signup blast and the admin-scheduled custom reminders. The in-process sweep (`server/_core/index.ts`) runs auto-reminder offsets, the Interop Circle sync, and the season-schedule sync. It does not run that blast.

The production project has **no service** whose start command posts to `/api/cron/event-reminders`. Docs that name a `cron-event-reminders` service are ahead of the project. Until a service exists, those two reminder paths run only when a person calls the endpoint.

`POST /api/cron/outbound-issues`, `/api/cron/quest-crew-assembly`, `/api/cron/needs-offers-matcher`, and `/api/cron/gratitude-cycles` also have no matching cron service. Outbound due letters and auto-reminder offsets still have in-process timers.

## Start commands

A curl image does not expand `$CRON_SECRET` unless the command is wrapped in `sh -c`. Without `curl -f` (or `-sf`), an HTTP 401 still exits 0, and Railway paints the run green.

| Service | Schedule | Shell wrap | Fail on HTTP error | Path |
|---|---|---|---|---|
| cron-nightly-batch | `0 2 * * *` | no | no | `/api/cron/nightly-batch` |
| cron-admin-automations | `0 * * * *` | no | no | `/api/cron/admin-automations` |
| cron-operator-pulse-ping | `0 * * * *` | no | no | `/api/cron/operator-pulse-ping` |
| cron-governance-jobs | `0 * * * *` | no | no | `/api/cron/governance-jobs` |
| cron-daily-contribution-snapshots | `15 0 * * *` | no | no | `/api/cron/daily-contribution-snapshots` |
| curl (tier-detector) | `*/15 * * * *` | yes | no | `/api/cron/tier-detector` |
| cron-coordination-pipeline | `*/10 * * * *` | yes | no | `/api/cron/coordination-pipeline` |
| cron-coordination-flywheel | `0 9 * * *` | yes | no | `/api/cron/coordination-flywheel` |
| cron-harvest-generation | `30 * * * *` | yes | yes (`-sf`) | `/api/cron/harvest-generation` |
| cron-harvest-digest | `0 9 * * 1` | yes | yes (`-sf`) | `/api/cron/harvest-digest` |

Each of these services has a variable named `CRON_SECRET`. Whether that value is a reference to `ReGenCivics.Earth` or a drifted copy was not opened (R-2).

## Waiting on Rye (R-2)

Do not add the missing reminder cron, and do not rewrite the unwrapped commands, until Rye says so. A new hourly `event-reminders` service would start the 20 to 28 hour blast on its first successful run. The commands that need `sh -c` and `curl -f` are nightly-batch, admin-automations, operator-pulse-ping, governance-jobs, and daily-contribution-snapshots.
