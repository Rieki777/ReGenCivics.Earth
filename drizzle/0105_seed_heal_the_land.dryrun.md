# Dry-run: 0105_seed_heal_the_land.sql

## What this seed inserts

### 1. Author user (idempotent)
- `users` row with `email = 'team@regencivics.earth'`, `role = 'admin'`
- Skipped if already present (the same convention used by every other
  forum / blog seed in the repo)

### 2. Blog post
- `blogEdits` row, `slug = 'heal-the-land-heal-ourselves'`
- ~3KB of body content describing the three-stage Heal the Land,
  Heal Ourselves community ministry: free food outreach, community
  gardening days, land residency. Closes with the partner-call.
- Skipped if a blogEdits row with this slug already exists.

### 3. Forum announcement post (pinned)
- `forumPosts` row in the `land-projects` (or `active-projects`)
  category, authored by the team account, `isPinned = 1`
- Title: "Heal the Land, Heal Ourselves: We are Looking for Land
  Project Partners"
- Body: ~1KB call for land project partners, with two inline links
  to `/heal-the-land` and `/land#heal-program`
- Skipped if a post with this title already exists.

## Acceptance after running

- `/blog/heal-the-land-heal-ourselves` renders the long-form ministry post
- `/community/c/land-projects` shows the announcement pinned at the top
- `/heal-the-land` already renders from the existing page component
  (no DB dependency)

## How to run

```bash
npx tsx scripts/run-migration.ts drizzle/0105_seed_heal_the_land.sql
```

The migration runner is idempotent: it tracks `_migrations_applied`
so re-running is a no-op. Each individual statement is also wrapped
in `WHERE NOT EXISTS` so a partial-failure mid-run can be safely
re-run.

## Why SQL instead of a Node script

The spec says "leave it ready for Rye to invoke via the migration
runner". The migration runner only handles SQL files. The earlier
`scripts/seed-heal-the-land-blog.mjs` and `scripts/seed-heal-forum-post.mjs`
remain in the repo for local-environment use; this SQL file is the
runner-ready equivalent that Rye can fire from any shell with
`DATABASE_URL` set, without needing his personal user ID (the team
account is the author by convention, matching every other seed in
the repo).

## Not run against prod

Per the spec instruction. Rye runs it.
