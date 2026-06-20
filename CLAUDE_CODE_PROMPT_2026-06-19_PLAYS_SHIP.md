# Claude Code: Ship the Plays Feature

**Date:** 2026-06-19
**Context:** The Plays feature has been fully coded in a Cowork session. All files are created and wired. This prompt covers what Claude Code needs to do to verify, fix, and ship.

**Read first:**
- `PLAYS_PAGE_SPEC.md` (full feature spec)
- `CLAUDE.md` (project context, writing rules, ship gate)

---

## What Already Exists (DO NOT rebuild)

All code files are created and wired:

### New files created:
- `drizzle/0137_plays_tables.sql` (6 tables: plays, play_categories, play_category_map, play_endorsements, play_adoptions, play_views)
- `drizzle/0138_plays_seed_categories.sql` (7 category seeds)
- `drizzle/0139_plays_forum_category.sql` (forum category for Plays)
- `drizzle/0140_plays_game_variable.sql` (plays.adoption_reward game variable)
- `server/routes/plays.ts` (10 tRPC procedures: list, getBySlug, categories, trackView, submitPlay, adopt, endorse, analyzeDocument, listPending, moderate)
- `client/src/pages/PlaysLibrary.tsx` (library listing at /plays)
- `client/src/pages/PlayDetail.tsx` (detail view at /plays/:slug)
- `client/src/pages/PlaySubmit.tsx` (4-step submission wizard at /plays/submit)
- `client/public/downloads/create-your-play-prompt.md` (downloadable AI prompt for play creation)

### Existing files modified:
- `drizzle/schema.ts` (added plays, playCategories, playCategoryMap, playEndorsements, playAdoptions, playViews tables)
- `server/routers.ts` (imported and registered playsRouter)
- `client/src/App.tsx` (added lazy imports and routes for /plays, /plays/submit, /plays/:slug)
- `client/src/components/Navigation.tsx` (added Gamepad2 import, Plays link in desktop + mobile "Play the Game" dropdown, updated isPlayGameActive)
- `client/src/pages/Community.tsx` (added 'plays' to SECTION_SLUGS)

---

## Task 1: Typecheck and Fix Errors

Run:
```bash
pnpm typecheck
```

Fix any TypeScript errors. Common things to watch for:

1. **Import paths**: Make sure `@/_core/hooks/useAuth` resolves (it should, this is the existing pattern). Make sure `@/const` has `getLoginUrl`.

2. **tRPC type inference**: The `trpc.plays.*` calls in the client pages should auto-type from the router. If there are type mismatches, check that `server/routers.ts` properly exports the playsRouter registration.

3. **Schema types**: The `plays` table in `drizzle/schema.ts` was added at the end of the file. Make sure the file wasn't truncated. Run:
```bash
python3 scripts/audit-truncation.py
```

4. **PLAY_SECTIONS import**: `PlaySubmit.tsx` imports `PLAY_SECTIONS` from `@/pages/PlaysLibrary`. Verify this named export exists.

5. **creditPrivateTokens**: In `server/routes/plays.ts`, the adopt procedure uses `const { creditPrivateTokens } = await import("../db/tokens")`. Verify `server/db/tokens.ts` exists and exports this function.

## Task 2: Fix Any Build Issues

Run:
```bash
pnpm build
```

Fix any build errors. The most likely issues:
- Unused imports (remove them)
- Missing component imports
- Type errors from the raw SQL patterns (the plays router uses `db.execute(sql\`...\`)` which returns loosely typed results)

## Task 3: Verify Schema Integrity

Check that `drizzle/schema.ts` ends properly. The plays tables should be at the very end of the file. If the file was truncated (NUL bytes, incomplete expressions), fix it. Run the truncation audit:

```bash
python3 scripts/audit-truncation.py
```

## Task 4: Test the Route Structure

Verify these routes work in the router:
1. `/plays` renders PlaysLibrary
2. `/plays/submit` renders PlaySubmit (not matched as `:slug`)
3. `/plays/some-slug` renders PlayDetail

The route ordering in App.tsx should be: `/plays` first, then `/plays/submit`, then `/plays/:slug`. If `/plays/submit` comes after `/plays/:slug`, the router will match "submit" as a slug. Fix the order if needed.

## Task 5: Verify Nav Integration

Check that:
1. "Plays" appears in the "Play the Game" dropdown (desktop)
2. "Plays" appears in the mobile Play the Game section
3. `Gamepad2` icon is imported from lucide-react in Navigation.tsx
4. Clicking "Plays" navigates to /plays

## Task 6: Verify Download File

Confirm `client/public/downloads/create-your-play-prompt.md` exists and contains the full AI prompt. The PlaysLibrary hero has a download link to `/downloads/create-your-play-prompt.md`.

## Ship Gate (MANDATORY)

```bash
python3 scripts/audit-truncation.py      # no truncated files
pnpm typecheck                            # exit 0
pnpm build                                # exit 0
```

All three must pass before marking DONE.

---

## Migrations (DO NOT RUN)

These migration files need to be run by Rye in Railway:
- `drizzle/0137_plays_tables.sql`
- `drizzle/0138_plays_seed_categories.sql`
- `drizzle/0139_plays_forum_category.sql`
- `drizzle/0140_plays_game_variable.sql`

Or via the migration runner after deploy:
```bash
npx tsx scripts/run-migration.ts drizzle/0137_plays_tables.sql
npx tsx scripts/run-migration.ts drizzle/0138_plays_seed_categories.sql
npx tsx scripts/run-migration.ts drizzle/0139_plays_forum_category.sql
npx tsx scripts/run-migration.ts drizzle/0140_plays_game_variable.sql
```

---

## Handoff Breakdown: Who Does What

### CLAUDE CODE (autonomous)
- Fix any typecheck errors
- Fix any build errors
- Fix truncated files if found
- Verify route ordering
- Verify nav integration
- Run ship gate

### RYE (human required)
- Run migrations 0137-0140 in Railway
- Review the pages visually after deploy
- Submit the ReGen Civics Play as the first featured Play
- Upload cover images
- Turn on the AI document analyzer (requires LLM API key in .env)
