---
name: regen-railway-crons
description: Use when creating, editing, or debugging Railway cron jobs for ReGen Civics, especially curl-based HTTP crons that POST to /api/cron/* endpoints with a Bearer token. Covers the shell-expansion trap, the silent-401 trap, and the secret-drift trap discovered on 2026-06-24. Triggers on: "Railway cron", "cron job", "coordination-pipeline", "coordination-flywheel", "tier-detector", "CRON_SECRET", "curl cron", "cron returns Unauthorized", "cron silently failing", "add a cron", "sh -c".
---

# ReGen Railway Crons

## Why this skill exists

On 2026-06-24, three curl-based cron services in the `captivating-grace` Railway project were authenticating against the app's `/api/cron/*` endpoints with an empty or wrong Bearer token. Two of them were brand new (coordination-pipeline, coordination-flywheel). The third, tier-detector, had been failing on every 15-minute run for an unknown length of time. All three showed "Last run succeeded" in green the whole time. Three traps combined to hide it.

## The three traps

### Trap 1: Railway runs the curl start command without a shell

A cron service built from the `curlimages/curl:latest` Docker image runs its Custom Start Command as exec args, not through a shell. So `$CRON_SECRET` in the command is passed to curl as the literal text `$CRON_SECRET`, never expanded to the secret value. The endpoint receives `Authorization: Bearer $CRON_SECRET` (or an empty bearer) and returns 401.

Fix: wrap the whole command in `sh -c '...'` so a shell evaluates it and expands the variable.

Wrong:

```
curl -X POST https://regencivics.earth/api/cron/coordination-flywheel -H "Authorization: Bearer $CRON_SECRET"
```

Right:

```
sh -c 'curl -X POST https://regencivics.earth/api/cron/coordination-flywheel -H "Authorization: Bearer $CRON_SECRET"'
```

Use single quotes around the `sh -c` argument and double quotes around the header, so the inner shell expands `$CRON_SECRET` from the service environment.

### Trap 2: curl exits 0 on an HTTP 401, so Railway shows green

`curl` without the `-f` flag returns exit code 0 even when the server responds 401. Railway only checks the exit code, so the cron shows "Last run succeeded" while every request is rejected. Green status proves nothing about auth.

The only proof is the deploy log of the run. A working run shows the endpoint's JSON body, for example:

```
ok: true pollFetched: 15 ingested: 5 ...
{"ok":true,"scanned":1,"earned":1}
ok: true ... rolesReconcile.total: 20
```

A broken run shows:

```
error: Unauthorized
```

Always open the run's Deploy Logs and read the actual response. Never trust the green checkmark alone.

### Trap 3: the cron service's CRON_SECRET can drift from the app's

The endpoint validates against the app's `process.env.CRON_SECRET` on the `ReGenCivics.Earth` service. A cron service that carries its own literal `CRON_SECRET` copy will silently break if the app's secret is ever rotated. The tier-detector cron had a stale literal that no longer matched.

Fix: do not store a literal on the cron service. Reference the live value from the app service:

```
${{"ReGenCivics.Earth".CRON_SECRET}}
```

The service name is quoted because it contains a dot. In the Railway variable editor, type `${{ReGen` to trigger the reference picker and it will show the correctly quoted form. This way the cron always sends exactly what the endpoint checks, and a rotation updates everywhere at once. Referencing the live value also means you never handle the secret in plaintext.

## Recipe: add a new HTTP cron

1. Add service, Docker Image, `curlimages/curl:latest`.
2. Variables, add `CRON_SECRET` with value `${{"ReGenCivics.Earth".CRON_SECRET}}`.
3. Settings, Deploy, Custom Start Command:
   `sh -c 'curl -X POST https://regencivics.earth/api/cron/<endpoint> -H "Authorization: Bearer $CRON_SECRET"'`
4. Settings, Deploy, Cron Schedule, set the cadence (for example `*/10 * * * *` for every 10 minutes, `0 9 * * *` for daily at 09:00 UTC, a quiet hour).
5. Deploy.
6. Cron Runs, Run now, then open the run's Deploy Logs and confirm the response body is the endpoint's real JSON, not `error: Unauthorized`.
7. Rename the service from its Railway auto-name to `cron-<purpose>` so it is identifiable later.

## Current coordination crons

- `cron-coordination-pipeline`: every 10 minutes, POST `/api/cron/coordination-pipeline`. Ingests new YouTube uploads and proposes call tasks.
- `cron-coordination-flywheel`: daily at 09:00 UTC, POST `/api/cron/coordination-flywheel`. Reconciles roles and nudges stale claims.
- `curl` (tier-detector): every 15 minutes, POST `/api/cron/tier-detector`. Tier progression.

All three read the same shared secret on `ReGenCivics.Earth` and must use the `sh -c` wrapper.

## If a cron starts failing

Open the service, Cron Runs, click the latest run, Deploy Logs. If you see `error: Unauthorized`, check in order: the start command is wrapped in `sh -c`, the `CRON_SECRET` variable references `${{"ReGenCivics.Earth".CRON_SECRET}}`, and the app's `CRON_SECRET` is still set on `ReGenCivics.Earth` (a missing one returns a 500 with `CRON_SECRET not configured`, not a 401). The endpoint auth code lives in `server/_core/index.ts`.
