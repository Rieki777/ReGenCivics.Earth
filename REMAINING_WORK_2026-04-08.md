# Remaining Work — Consolidated (2026-04-08)

Single source of truth for everything still outstanding. Supersedes
`REMAINING_WORK_2026-04-07.md` (moved to archive).

Priority tags:
- **LAUNCH BLOCKER** = ships before Earth Day 2026 (Apr 22)
- **HIGH** = ships this sprint
- **MEDIUM** = ships next sprint
- **POST-LAUNCH** = after Earth Day
- **REFERENCE** = long-horizon spec, not actively being built

---

## Status snapshot (2026-04-08)

### Shipped today (2026-04-08, this session)

| Item | What was done |
|---|---|
| DB migration 0086 | `communityAgreements` + `communityAgreementVotes` tables created in Railway |
| DB migration 0087 | 6 ratified agreements seeded (Honesty, Respect, Curiosity, Regeneration, Address ideas not people, No spam or misinformation) |
| DB migration 0088 | `imageUrl` column added to `forumCategories` |
| DB migration 0089 | Forum threads moved from `active-projects` to `land-projects` category |
| DB migration 0090 | Forum threads moved from `active-organisations` to `alliance-partners` category |
| land-general category | DB category id 11 repurposed: name='Land General', slug='land-general', icon='Sprout', sortOrder=3 |
| alliance-general category | DB category id 10 repurposed: name='Alliance General', slug='alliance-general', icon='Users', sortOrder=7 |
| COMMUNITY_AGREEMENTS_PLAN.md | Full 7-part build plan written for Claude Code |

### Already shipped (prior sessions, verified on disk)

See `REMAINING_WORK_2026-04-07.md` in archive for the full list. Summary:
Round 2 Safari fixes (R2-1 to R2-20), Fund roles (7 in gameRoles.ts + 14 illustrations),
Hymn Book, Bionomics page, Bioregions forum category, all CTO C3/H1-H10/M1-M12 items
(except C1, H3, H8), citizenship tier admin UI + badge, all 40 role illustrations,
quest hero images, homepage backgrounds, all 7 map size variants,
Track 7 social sharing scaffolding, all 98 migrations tracked in _migrations_applied.

---

## Genuinely outstanding

### Rye-only (cannot be done by code)

| Item | Priority | Notes |
|---|---|---|
| **C2** GCP Maps API key restriction | LAUNCH BLOCKER | Google Cloud Console, ~5 min. Restrict the key to regencivics.earth domain. |
| **H8** Sentry DSN + source maps verification | HIGH | Needs Railway env access and Sentry dashboard. Confirm VITE_SENTRY_DSN is set and source maps are uploading on build. |
| **R2-21** heal-the-land seed scripts | HIGH | Run locally with .env + your user ID. Script is in the repo, just needs real credentials. |
| **Riverside: create a room** | HIGH | Log into Riverside, create a room in the ReGen Civics project, copy the room URL. Required before Schedule.tsx Zoom-to-Riverside migration can be completed. |
| **Riverside: connect YouTube** | MEDIUM | Settings > Streaming in Riverside. Enables YouTube Live simulcast. |
| **Zapier: turn ON the Riverside Zap** | HIGH | The Zap "New YouTube videos to Riverside webhook POST" exists and is published but toggle appeared off. Confirm it's live and processing. |

### Code work

| Item | Owner | Priority | Spec doc |
|---|---|---|---|
| **COMMUNITY_AGREEMENTS_PLAN Parts 1-7** | code | HIGH (launch target) | `COMMUNITY_AGREEMENTS_PLAN.md` |
| **C1** CSP nonce migration | code | HIGH but RISKY | `CLAUDE_CODE_PROMPT_2026-04-07_POST_AUDIT_CLEANUP.md` + `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md` |
| **H3** Wire `.ink-reveal` and `.blur-up` to actual DOM | code | HIGH | `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md` |
| **Citizenship tier nightly batch verification** | code | MEDIUM | `CLAUDE_CODE_PROMPT_2026-04-07_CITIZENSHIP_BATCH.md` |
| **Track 7 social sharing OG images** | code | MEDIUM | `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md` |
| **Fix 17** Quest locking audit vs QUEST_PROGRESSION_SPEC | code | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` |
| **Recording flow Zapier mapping** | code | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` |
| **`notifyRecordings` opt-in toggle on profile** | code | MEDIUM | `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` |
| **UNIFIED_BUILD remaining tracks** | code | MEDIUM-LARGE | `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` |
| **CTO M10** Admin.tsx refactor (4769 lines) | code | POST-LAUNCH | Spec says out of scope for launch week |
| **CTO M11** depcheck removal of unused deps | code | LOW | Mostly false positives, needs manual review |
| **REGEN_GAMES_SPEC_V1 phases 4-5** | code | REFERENCE | Long-horizon: Mycelium Network, advanced Seasonal mechanics, Bioregional identity |

---

## COMMUNITY_AGREEMENTS_PLAN.md breakdown

The new primary active build prompt. Seven parts, roughly in order:

| Part | What it builds | Priority |
|---|---|---|
| Part 1 | Community Agreements feature: DB schema in Drizzle, tRPC `agreements` router, `/community/guidelines` page rewrite with propose + vote UI | HIGH |
| Part 2 | Forum UI changes: rename "Hard Conversations" section to "Clarity & Agreements", rename first card to "Healthy Conversations", fix broken Air section card image paths | HIGH |
| Part 3 | SQL migration files 0086-0090 (already applied to Railway, migration files need to exist in drizzle/ for runner tracking) | HIGH |
| Part 4 | Land Projects routing fix: `ensureEntityForumThread` and `updateStatus` approval flow use `land-projects` slug; SECTION_SLUGS and Community.tsx wired for `land-general` + `land-projects` sections | HIGH |
| Part 5 | Alliance Partners routing fix: same pattern, `alliance-partners` and `alliance-general` | HIGH |
| Part 6 | Schedule.tsx calendar button standardization: green `bg-[#7dd87d]` for Google Calendar, ghost style for Apple/Outlook | MEDIUM |
| Part 7 | Zoom-to-Riverside migration in Schedule.tsx: replace ZOOM_INFO constant with RIVERSIDE_INFO, update all ~50 Zoom references, add recordings section. Needs Rye's Riverside room URL first. | HIGH (blocked on Rye) |

---

## Active docs (12 total)

| Doc | Status | What it covers |
|---|---|---|
| `COMMUNITY_AGREEMENTS_PLAN.md` | **START HERE for code work** | All 7 parts of the current build sprint |
| `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` | Active | Master 7-track build plan |
| `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` | Active | CTO hardening + Round 2 Safari (mostly done; recording flow + R2-21 remain) |
| `CLAUDE_CODE_PROMPT_2026-04-07_POST_AUDIT_CLEANUP.md` | Active | CSP nonce migration (C1) + out-of-scope cleanup |
| `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md` | Active | H3 ink-reveal + blur-up wiring |
| `CLAUDE_CODE_PROMPT_2026-04-07_CITIZENSHIP_BATCH.md` | Active | Nightly batch job verification |
| `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md` | Active | Social sharing OG image generation |
| `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` | Mostly done | Citizenship tier foundation (batch verification pending) |
| `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` | Active | Recording flow: Zapier mapping, opt-in toggle |
| `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` | Code done, audit pending | Quest locking audit doc needed |
| `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` | **REFERENCE** | Full 5-phase game system spec |
| `FIXES_TO_MAKE_2026-03-29.md` | Reference | Original 22-fix batch (referenced by others) |

---

## Migration tracking note

All 98 drizzle migrations are recorded in `_migrations_applied` as of 2026-04-07.
Migrations 0086-0090 were applied directly to Railway via the browser console on
2026-04-08. The `.sql` files exist in `drizzle/` but may not have been run through
the migration runner script yet. Run `npx tsx scripts/run-migration.ts --status` to
check and backfill if needed.

The land-general and alliance-general categories were created by direct SQL UPDATE
on existing category rows (id 11 and id 10) in Railway on 2026-04-08. No new
migration file was needed for this.
