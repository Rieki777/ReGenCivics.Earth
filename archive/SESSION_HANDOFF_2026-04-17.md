# Session Handoff: 2026-04-17

**Purpose:** Carry context from the Cowork session (2026-04-08 through 2026-04-17) into a fresh Claude Code or Cowork session.

---

## What happened in this session

This session covered planning, database work, and browser-based SQL execution for the ReGen Civics web app. The primary deliverable was `COMMUNITY_AGREEMENTS_PLAN.md`, a 7-part build plan that Claude Code subsequently implemented (all 16 parts now shipped).

### Database changes applied via Railway SQL console

All migrations were executed directly in Railway's browser-based SQL console during this session:

| Migration | What it does |
|---|---|
| `0086_community_agreements.sql` | Created `communityAgreements` + `communityAgreementVotes` tables |
| `0087_seed_existing_agreements.sql` | Seeded 6 ratified agreements (Honesty, Respect, Curiosity, Regeneration, Address ideas not people, No spam or misinformation) |
| `0088_category_images.sql` | Added `imageUrl` column to `forumCategories` |
| `0089_move_land_threads.sql` | Moved threads from `active-projects` to `land-projects` |
| `0090_move_alliance_threads.sql` | Moved threads from `active-organisations` to `alliance-partners` |

Additional direct SQL (no migration file):
- Category id 11 (`active-projects`) repurposed to `land-general` (name "Land General", icon "Sprout", sortOrder 3)
- Category id 10 (`active-organisations`) repurposed to `alliance-general` (name "Alliance General", icon "Users", sortOrder 7)

### COMMUNITY_AGREEMENTS_PLAN.md: all 16 parts shipped

Parts 1-7 were planned in this Cowork session. Parts 8-16 were added and built by Claude Code in follow-up sessions. All parts are marked DONE in the plan document. Key deliverables:

1. Interactive Community Agreements page (propose + vote, modeled on Quest Suggestions)
2. Forum UI renames (Hard Conversations to Clarity & Agreements, card to Healthy Conversations)
3. Broken card image paths fixed
4. Category image upload added to Add Category form
5. Land Projects routing fix (ensureEntityForumThread now routes to `land-projects`)
6. Alliance Partners routing fix (routes to `alliance-partners`)
7. Schedule page calendar buttons standardized
8. All Zoom references replaced with Riverside
9. Recordings section added to Schedule page
10. CommandPanel music player layout fixes
11. Messenger readability audit
12. Nav menu reorder
13. Land.tsx header text update
14. Treasury dashboard prominence
15. GlobeMap defaults to Active Only
16. Privy wallet email capture modal (Part 16, shipped 2026-04-11)
17. Site readability audit (217 + 48 replacements across 80 files)

---

## What still needs doing

### Human-only tasks (Rye)

These cannot be done by code. They require browser access to external services:

1. **Riverside: create a room** in the ReGen Civics project, copy the room URL
2. **Riverside: connect YouTube** via Settings > Streaming (enables simulcast)
3. **Zapier: turn ON** the "New YouTube videos to Riverside webhook POST" Zap
4. **Verify Riverside Pro** covers Season 2 hours (13 episodes x 2 hours = 26 hours)
5. **C2: GCP Maps API key restriction** to regencivics.earth domain (Google Cloud Console)
6. **H8: Sentry DSN + source maps** verification (Railway env + Sentry dashboard)
7. **R2-21: heal-the-land seed scripts** (run locally with .env + your user ID)
8. **Gemini API key refresh** for AI-generated images (4 PIL placeholders waiting: seasonal voting, donut chart, node diagram, watercolor circle)

### Code work remaining

Prioritized list from `REMAINING_WORK_2026-04-08.md`:

| Item | Priority | Spec doc |
|---|---|---|
| **C1** CSP nonce migration | HIGH but RISKY | `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md` |
| **H3** Wire `.ink-reveal` and `.blur-up` to DOM | HIGH | `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md` |
| Citizenship tier nightly batch verification | MEDIUM | `CLAUDE_CODE_PROMPT_2026-04-07_CITIZENSHIP_BATCH.md` |
| Track 7 social sharing OG images | MEDIUM | `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md` |
| Fix 17: Quest locking audit vs spec | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` |
| Recording flow Zapier mapping verification | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` |
| `notifyRecordings` opt-in toggle | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` |
| UNIFIED_BUILD remaining tracks | MEDIUM-LARGE | `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` |
| Admin.tsx refactor (4769 lines) | POST-LAUNCH | Out of scope for launch week |
| Fix migration runner bug | LOW | Chunks starting with `--` comments drop first SQL statement |

### Known bug

The migration runner (`scripts/run-migration.ts`) has a bug: when a SQL chunk starts with a `--` comment line, it silently drops the first actual SQL statement in that chunk. Workaround: ensure migration files don't start with comment-only lines, or strip comment-only lines from chunk starts. Not urgent since migrations can be run manually.

---

## Key file locations

| File | Purpose |
|---|---|
| `COMMUNITY_AGREEMENTS_PLAN.md` | Master build plan (all 16 parts, all DONE) |
| `REMAINING_WORK_2026-04-08.md` | Consolidated outstanding work list |
| `CLAUDE.md` | Project context, tech stack, writing rules, skill references |
| `drizzle/schema.ts` | Drizzle ORM schema (tables, relations) |
| `server/db.ts` | Database helpers including `ensureEntityForumThread` |
| `server/routes/` | tRPC routers (applications, players, events, auth, forum) |
| `server/webhooks/riverside.ts` | Riverside recording webhook handler |
| `client/src/pages/Community.tsx` | Forum page with SECTION_SLUGS, category cards |
| `client/src/pages/Schedule.tsx` | Schedule page (now Riverside, was Zoom) |
| `client/src/pages/QuestSuggestions.tsx` | Reference pattern for propose-and-vote UI |

---

## Database state

- 14 forum categories (including `land-general` and `alliance-general`)
- `communityAgreements` table with 6 ratified records
- `communityAgreementVotes` table (empty, ready for use)
- `forumCategories` has `imageUrl` column
- Land project threads live in `land-projects` category
- Alliance org threads live in `alliance-partners` category
- `ensureEntityForumThread` routes `land_project` to `land-projects` and `alliance_org` to `alliance-partners`

---

## How to pick up from here

For Claude Code: read `REMAINING_WORK_2026-04-08.md` first, then the relevant spec doc for whichever item you're tackling. The COMMUNITY_AGREEMENTS_PLAN is fully shipped and can be used as reference for patterns (propose-and-vote, forum thread auto-creation, category routing).

For Rye: the human-only tasks above are the main blockers. The Riverside room URL is needed before the Schedule page can fully work. Everything else is code work that Claude Code can handle autonomously.
