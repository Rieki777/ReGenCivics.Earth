# Deployment (Railway)

The standard deploy flow (test, migrations, ship gate, commit and push, verify, report) lives in `CLAUDE.md`. This file holds the service map and the CLI detail behind it. Moved out of `CLAUDE.md` on 2026-09-27.

## Services

- **Production site:** the Railway service `ReGenCivics.Earth` (regencivics.earth), in the `ReGen Civics` project, `production` environment.
- **Governance app:** a separate service, `ReGen Governance App` (gov.regencivics.earth).
- **Trigger:** pushing to `main` on GitHub. Railway watches the branch and builds with `railway.toml`: nixpacks builder, `pnpm run build`, start command `node dist/index.js`.
- **Before pushing:** run `/ship` (`docs/GOLDEN_RULE.md`). Deploys do not run migrations, so apply any new `drizzle/NNNN_*.sql` with the migration runner first (`CLAUDE.md`, Database migrations).

## CLI

The Railway CLI is installed and logged in. The deploy, logs and up scripts pin `-s "ReGenCivics.Earth"`, so they always report the production site:

```bash
pnpm railway:deploys   # each deploy's status (SUCCESS / FAILED / BUILDING / CRASHED)
pnpm railway:logs      # live build + deploy logs
pnpm railway:status    # plain `railway status`: project / environment / linked service + all resources
pnpm railway:deploy    # railway up: manual deploy of the working tree (bypasses the GitHub trigger)
```

To check the governance app instead, pass `-s "ReGen Governance App"` (for example `railway logs -s "ReGen Governance App"`).

## Keep the `-s` pins

Until 2026-07-16 this repo's CLI was linked to `multiplayer-earth`, a different service from the site, so a bare `railway deployment list` reported that service's deploys, newest 2026-07-04. It answered, it just answered about the wrong thing, and a months-stale SUCCESS reads exactly like a fresh green deploy. The link now points at `ReGenCivics.Earth`, and the scripts pin `-s` on top so a future re-link cannot quietly break the deploy check again.

`railway status` is the exception: it takes no `-s` and always reports the linked service. That makes it the thing to run if deploy output ever looks wrong. If it prints anything other than `Service: ReGenCivics.Earth`, re-link with `railway service "ReGenCivics.Earth"`.

## When a deploy fails

Pull the reason with `pnpm railway:logs`, fix, and push again. The `regen-deploy-doctor` skill has the triage recipes (empty-log FAILED deploys, instant fails from dead lockfile tarballs, concurrent-push double failures).
