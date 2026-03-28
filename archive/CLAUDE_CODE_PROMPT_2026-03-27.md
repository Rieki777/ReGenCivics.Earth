# Claude Code Session: Forum Fixes + Profile Cleanup + Command Bar

**Date:** 2026-03-27
**Project:** regen-civics-clean
**What this is:** Implementation prompt for all approved fixes and upgrades from March 27. DB migrations for postReactions, welcome-aboard-quests category, and thread moves are already applied. Your job is code changes only.

---

## Context

ReGen Civics web app: a fund and in-real-life game for regenerative land projects. Full stack: React + TypeScript (Vite), tRPC, Express, MySQL on Railway.

**Read these files before writing any code:**
1. `FIXES_TO_MAKE_2026-03-27.md` -- all fix descriptions, what's coded, what still needs work
2. `QUALITY_SPRINT_9_10.md` -- broader sprint context
3. `CLAUDE.md` -- writing rules and project conventions

---

## Writing Rules (MANDATORY)

- No em-dashes anywhere. Use commas, colons, or separate sentences.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "vibrant", "transformative", "unlock", "empower", "seamless", "robust", "comprehensive", "utilize", "navigate" (as metaphor).
- No contrast-framing ("not X, but Y"). Lead with the affirmative.
- No rhetorical question openers.
- Direct, grounded voice. Sound like a thoughtful person inside the regen movement.

---

## Before You Start

1. `pnpm install`
2. `pnpm build` -- confirm baseline compiles

---

## DB State (already applied, do NOT run again)

These are already live in Railway production:
- `postReactions` table exists (emoji reactions)
- `welcome-aboard-quests` forum category exists (slug: `welcome-aboard-quests`)
- 10 Welcome Aboard quest threads are now in `welcome-aboard-quests` category (moved from `rites-of-passage`)
- `rites-of-passage` category exists but has 0 threads (waiting for seed script to be run by Rye)
- No `quests` table exists in DB. Quests live in `client/src/data/questData.ts`.

---

## Tasks (in priority order)

### 1. Fix 226: Filter admin-seeded apps from My Submissions (Medium)

The "My Submissions" tab shows 13 land project applications because Rye's account seeded all season 1 data. Regular users would only see their own 0-1 apps, but Rye sees all 13.

**What to do:**
- Add `adminSeeded` tinyint(1) default 0 column to the `applications` table in Drizzle schema
- Write migration SQL: `ALTER TABLE applications ADD COLUMN adminSeeded TINYINT(1) DEFAULT 0; UPDATE applications SET adminSeeded = 1 WHERE submittedAt IS NULL OR submittedAt < '2026-03-01';`
- Save migration as `drizzle/0083_admin_seeded_apps.sql`
- Update `myApplications` query in `server/routes/applications.ts` to filter out `WHERE adminSeeded = 0`
- Keep admin panel showing all applications (including admin-seeded ones)

### 2. Fix 229: Steward Dashboard improvements (Medium)

**What to do:**
- Add `stewardUserId` nullable int column to `applications` table in Drizzle schema
- Write migration SQL, save as `drizzle/0084_steward_user_id.sql`
- Add unclaimed-only filter dropdown to the Steward Dashboard
- When a steward claims a project, auto-set `stewardUserId` to their user ID

### 3. Fix 230: Command bar overhaul (High)

The Command Center / bottom nav has broken or outdated buttons.

**What to do:**
- Remove broken "Quick Post" button functionality
- Fix Guide button wiring so it actually opens the ReGen Guide
- Remove any buttons that don't work or link to unimplemented features
- Keep working buttons: Home, Quests, Community, Profile
- Reference `COMMAND_CENTER_SPEC.md` and `COMMAND_CENTER_DESIGN.md` for architecture

### 4. Fix 236: Category page display bug (Medium)

`/community/c/rites-of-passage` shows empty page despite having posts (after seeding). Breadcrumb shows "Unknown".

**What to do:**
- Investigate `CommunityCategory.tsx` and the `forum.categoryBySlug` tRPC route
- The route likely isn't returning posts for the given category slug
- Fix the breadcrumb to show the actual category name
- Test with `welcome-aboard-quests` category (which has 10 threads right now)

### 5. Fix 228: User notification preferences component (Low)

**What to do:**
- Build a user-facing notification preferences component
- Admin notification prefs have already been removed from user profile (coded in Cowork session)
- The new component should let users control their own notification settings (email digest frequency, etc.)

### 6. Fix 236 (continued): "Discuss in Forum" link on Quest pages (Low, after Rye seeds threads)

After Rye runs the seed script and populates `forumUrl` values in `questData.ts`:
- Add a "Discuss in Forum" link/button to the Quest detail page (`Quest.tsx` or equivalent)
- Link should go to the `forumUrl` value for that quest
- Only show the link if `forumUrl` is not empty string

---

## Migration SQL files to generate

Create these files (Rye will run them in Railway after reviewing):

1. `drizzle/0083_admin_seeded_apps.sql`:
```sql
ALTER TABLE applications ADD COLUMN adminSeeded TINYINT(1) NOT NULL DEFAULT 0;
UPDATE applications SET adminSeeded = 1 WHERE submittedAt IS NULL OR submittedAt < '2026-03-01';
```

2. `drizzle/0084_steward_user_id.sql`:
```sql
ALTER TABLE applications ADD COLUMN stewardUserId INT NULL DEFAULT NULL;
```

---

## What NOT to do

- Do NOT run any DB migrations. Just create the SQL files.
- Do NOT modify the 10 Welcome Aboard quest threads or their content. Rye edited some of them by hand.
- Do NOT recreate or re-seed Welcome Aboard threads.
- Do NOT touch `scripts/seed-rites-forum-posts.ts` or `scripts/data/rites-of-passage-forum-posts.ts` (those are ready for Rye to run).
- Do NOT modify `questData.ts` forumUrl values (Rye will populate those after running seed script).

---

## Files likely to change

- `server/db.ts` or Drizzle schema (add adminSeeded, stewardUserId columns)
- `server/routes/applications.ts` (filter myApplications)
- `client/src/pages/StewardDashboard.tsx` (unclaimed filter, claim logic)
- `client/src/components/SmartBottomNav.tsx` or equivalent (command bar cleanup)
- `client/src/pages/CommunityCategory.tsx` (fix empty page bug)
- `client/src/pages/Quest.tsx` or quest card components (forum link, later)

---

## Done criteria

- `pnpm build` passes with zero errors
- My Submissions tab no longer shows admin-seeded applications for logged-in users
- Category pages show their threads correctly with proper breadcrumbs
- Command bar has no broken buttons
- All migration SQL files are created and ready for Rye to run
