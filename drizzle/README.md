# Migrations

## The canonical system: `scripts/run-migration.ts`

Migrations are plain hand-written MySQL files named `drizzle/NNNN_description.sql`,
applied by `scripts/run-migration.ts` and tracked in the `_migrations_applied`
table. This is the ONE source of truth for the live schema. It runs against
`DATABASE_URL`, is idempotent (skips already-applied files), and can build a
fresh database from scratch because it discovers and runs every numbered file
`0000`–current in order.

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

## Historical note

The early files (`0000`–`0047`, random two-word names like
`0000_yellow_tombstone.sql`) were originally drizzle-kit-generated and remain in
this folder so the custom runner can rebuild from scratch. Files from `0048` on
use descriptive names and are the custom-runner convention.
