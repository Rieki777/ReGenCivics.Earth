# Migrations

## The canonical system: `scripts/run-migration.ts`

Migrations are plain hand-written MySQL files named `drizzle/NNNN_description.sql`,
applied by `scripts/run-migration.ts` and tracked in the `_migrations_applied`
table. This is the ONE source of truth for the live schema. It runs against
`DATABASE_URL` and is idempotent (skips already-applied files): it discovers
every numbered file `0000`–current and applies whatever the tracking table does
not already list.

It cannot build a fresh database from scratch. See "Fresh databases" below.

```bash
pnpm db:migrate:status                                   # what's applied vs pending
pnpm db:migrate:all                                      # apply all pending (idempotent)
pnpm db:push                                             # alias for --all (fresh DB or catch-up)
npx tsx scripts/run-migration.ts drizzle/0153_thing.sql  # apply one file
```

### Writing a migration

1. Create `drizzle/NNNN_short_description.sql` (next free number).
2. Write plain MySQL. Gotchas the naive splitter cares about:
   - **No `ADD COLUMN IF NOT EXISTS`** — that's a MariaDB extension this MySQL
     rejects. Use plain `ADD COLUMN`; the `_migrations_applied` tracking gives
     idempotency. Use `CREATE TABLE IF NOT EXISTS` (that one is supported).
   - **No `;` inside SQL comments** — the runner splits statements on `;`.
3. Update `drizzle/schema.ts` to match (it is the TypeScript type source of
   truth for the drizzle-orm runtime; it does NOT drive migrations).
4. Run it, then `--status` to confirm.

## drizzle-kit is NOT the migration system

`drizzle.config.ts` + `drizzle/meta/_journal.json` are legacy. The drizzle-kit
journal is **frozen at `0047`** (~March 2026); everything from `0048` on is
managed only by the custom runner above.

**Do not run `drizzle-kit generate`, `drizzle-kit migrate`, or `drizzle-kit
push`.** They diff `schema.ts` against the stale `0047` snapshot and would try
to recreate tables that already exist, corrupting the schema or failing the
deploy. (This is why the `preDeployCommand` was removed from `railway.toml`, and
why it broke the Python transcription-worker when inherited.)

drizzle-kit is fine for read-only inspection (`drizzle-kit studio`); just never
let it write migrations.

## Fresh databases: `drizzle/ci-baseline.sql`

A fresh database is built from `drizzle/ci-baseline.sql` (a generated
structure-only snapshot), then brought current with `run-migration.ts --all`.
This is what CI does. See ADR-37.

```bash
npx tsx scripts/load-ci-baseline.ts      # structure + reference rows + migration history
npx tsx scripts/run-migration.ts --all   # anything added since the snapshot
npx tsx scripts/check-schema-drift.ts    # schema.ts vs information_schema (finding C5)
npx tsx scripts/dump-ci-baseline.ts      # regenerate the snapshot when it drifts
```

The baseline exists because the numbered migrations **cannot** replay onto an
empty database. Measured 2026-07-16 against MySQL 9.4: of 194 files, 157 apply
and **36 fail**, across five independent root causes:

| Cause | Example | Note |
| --- | --- | --- |
| Reserved word unquoted | `0096_game_system.sql` | `maxValue` is bare; `MAXVALUE` is reserved in MySQL, so the file is a syntax error and has never run. It cascades into 20 more failures. |
| MariaDB-only syntax | `0074`, `0098` | `CREATE INDEX / ADD COLUMN IF NOT EXISTS`, which this file already warns against |
| Stored procedures | `0037`, `0041` | the runner uses `conn.execute()`; the prepared-statement protocol rejects `DROP PROCEDURE` |
| Duplicate `CREATE TABLE` | `0036`, `0040` | table already created by an earlier file |
| Data-dependent seeds | `0105`, `0107` | assume rows that only exist on a populated database |

These files are already applied in production and must never re-run there, so
they stay frozen as history rather than being repaired. The baseline carries the
`_migrations_applied` rows they would have written, so the runner skips them and
only genuinely new migrations apply on top.

## Historical note

The early files (`0000`–`0047`, random two-word names like
`0000_yellow_tombstone.sql`) were originally drizzle-kit-generated. They remain
in this folder as history. Files from `0048` on use descriptive names and are the
custom-runner convention.
