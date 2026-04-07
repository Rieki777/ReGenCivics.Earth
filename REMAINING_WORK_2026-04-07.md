# Remaining Work — Consolidated (2026-04-07)

Single source of truth for everything still outstanding across the active planning docs after the 2026-04-07 cleanup. 17 older docs moved to `archive/`. 10 docs remain in the root.

Priority tags:
- **LAUNCH BLOCKER** = ships before Earth Day 2026 (Apr 22)
- **HIGH** = ships this sprint
- **MEDIUM** = ships next sprint
- **REFERENCE** = long-horizon spec, not actively being built

---

## 1. Broken on production (LAUNCH BLOCKER)

From `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md`, Round 2 Safari walkthrough:

- **R2-1** Quest "Download Quest Image" button is broken
- **R2-2** Quest forum post wiring is broken (posts not linking to quest pages)
- **R2-3** Fund Governance Structure image is broken (404 or path issue)

## 2. Mobile layout + copy fixes (HIGH)

From `POST_CTO.md` Round 2:

- **R2-4** Quest 0 Fire card overlap on mobile
- **R2-5** Tokenomics button text overflow on mobile
- **R2-6** Card readability pass on mobile
- **R2-7** Tag overlap on mobile
- **R2-8** Four paths card images block text on mobile
- **R2-9** Routine Quests carousel (component refactor)
- **R2-10** Epic Quests carousel (component refactor)
- **R2-11, R2-12** /economy link routing fixes
- **R2-13** "Rate Local Producers" → "Collaborate with Local Producers" with new copy
- **R2-14** Insert returns-on-failure copy block into Tokenomics + Opportunity pages (copy already drafted in POST_CTO)
- **R2-20** Live Governance Dashboard countdown target = 2026-09-22 (September equinox)

## 3. Fund side (HIGH)

From `POST_CTO.md`:

- **R2-15, R2-16** Music player upgrade + song submission flow (schema migration for `songSubmissions` + `songSubmissionVotes`, tRPC router, UI, `hymnSubmissionWinnerReward = 3333` game variable)
- **R2-17 (images only)** Generate 14 fund role illustrations (7 card portraits + 7 scenes) via `nano-banana-pro`. Paths already referenced in `gameRoles.ts`. See `CHARACTER_ART.md` for style guide.
- **R2-21** Run heal-the-land seed scripts (needs `.env` + Rye's user ID, runs locally)

## 4. Character art (HIGH)

From `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md`:

- Generate **26 game role illustrations** (13 roles × 2: card portrait + full scene). Zero currently in `public/images/roles/` except `placeholder.svg`.
- Plus the 14 fund role images from above. **Total: 40 WebP files.**
- After generation, verify `gameRoles.ts` image paths match and commit.

## 5. Quest locking + map performance (HIGH)

From `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md`:

- Generate `quest-fire-hero.webp` and `quest-food-foresting-hero.webp`
- Create responsive map variants (3 sizes × 7 maps = 21 files) and wire into `mapAssets.ts`
- Preload hero map, lazy-load zone images, GPU-accelerated panning CSS
- `MapTransition` component with route preloading, dissolve blur animation, 2s timeout fallback

From `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md`:

- Core components already built (`useQuestUnlocks.ts` exists). **Remaining: verification audit** against `QUEST_PROGRESSION_SPEC.md` to confirm all gates behave correctly.

## 6. Recording flow (MEDIUM)

From `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md`:

- Fix Zapier flat-key mapping in `riverside.ts` webhook
- Forum category lookup: fuzzy → exact `session-recordings` slug
- `recordings.ts` tRPC router (`byEventId`, `list`)
- Link `recordingId` to event in webhook, add "Watch Replay" on Schedule event cards
- `notifyRecordings` column on `newsletterSubscribers`, opt-in toggle on profile, updated email footer
- Version-control the applied migration SQL

## 7. Remaining fixes from older fix batches (MEDIUM)

From `CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md` + `FIXES_TO_MAKE_2026-03-29.md`:

- **Fix 10** Profile page overhaul (edit button, photo upload, village banner, migration)
- **Fix 14** Glossary "Propose a Term" feature (button + form + modal)
- **Fix 15** Feature Suggestions page verification + Community.tsx entry point
- **Fix 17** Quest locking audit (overlap with MAP_PERF verification above)
- Plus any items from FIXES_2026-03-29 that weren't shipped in commit `490518c` (fixes 1-9, 11, 13, 16 were shipped there; others still need review)

## 8. Citizenship tiers + game system foundation (MEDIUM → LARGE)

From `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md`:

- Migrations 0098-0100 shipped. Still remaining:
  - Nightly batch job route + tier checker logic + endorsement tier snapshot
  - Admin Citizenship Tiers page + batch job dashboard
  - Profile: tier badge + grace period notification
  - Generate homepage background images (desktop + mobile) via `nano-banana-pro`

From `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` (the master plan, all 7 tracks):

- **Track 0** 7 quick fixes (mostly overlap with items above)
- **Track 1** Database foundation (14 new tables + fields, Drizzle migration)
- **Track 2** Seed citizenship/trust/harvest/gratitude variables + lunar cycles
- **Track 3** Nightly batch job (6 steps), tier checker, proposals router, 9 backend routers/helpers
- **Track 4** Citizenship badge, Living Tree component, Contribution Compass, quest progression verify, gratitude UI, admin pages
- **Track 5** `/economy`, `/local-food-economy`, `/game-mechanics`, `/proposals` pages + banners
- **Track 6** Tier badges across the site, contributions tab, reputation score, harvest review, mycelium network
- **Track 7** Social sharing: 11 static OG images, dynamic OG endpoint, sharePrompt UI, referral tracking

This is the big one. Treat `UNIFIED_BUILD.md` as the ordered playbook.

## 9. ReGen Games system (REFERENCE — Phases 1-5)

From `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` (references `REGEN_GAMES_SPEC_V1.md` as source of truth):

Long-horizon spec covering 24 features across 5 phases (Foundation → Trust + Gratitude → Visualizations → Seasonal → Advanced). Partially overlaps with UNIFIED_BUILD. Keep as a reference; build items incrementally alongside the Unified Build tracks.

Highlights worth planning around now: Living Tree visualization (Phase 3C), Contribution Compass (Phase 3A), Mycelium Network (Phase 4D), Seasonal Harvest (Phase 4B-C), Bioregional identity (Phase 5E).

## 10. CTO-report post-launch hardening (MEDIUM)

From `POST_CTO.md` (original sections, not Round 2):

- **C1** Move inline scripts behind CSP nonce, drop `'unsafe-inline'`
- **C2** Restrict Google Maps API key by HTTP referrer (Rye)
- **C3** Verify rate limiter handles new tRPC paths under load
- **H1** Remove framer-motion if not code-split
- **H2** Image weight audit, convert remaining PNG/JPG to WebP
- **H3** Wire `.ink-reveal` + `.blur-up` classes to DOM elements
- **H8** Verify Sentry DSN + source maps
- **M1-M12** Color token consolidation, glass panel consolidation, z-index scale, staleTime overrides, Recharts lazy, background pause, hero paragraph width, font-size audit, mobile font-size audit, admin page refactor, remove unused deps, CI typecheck

---

## Active docs remaining in repo root (10)

| Doc | Status | What it covers |
|---|---|---|
| `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` | **START HERE** | Master 7-track build plan |
| `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` | Active | CTO fixes + Round 2 Safari walkthrough |
| `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` | Active | 40 role illustrations to generate |
| `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` | Active | Citizenship tier foundation |
| `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` | Active | Map + quest hero performance |
| `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` | Active | Quest locking verification |
| `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` | Active | Recording flow + Zapier |
| `CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md` | Active | Fixes 10, 14, 15, 17 |
| `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` | **REFERENCE** | Full 5-phase game system spec |
| `FIXES_TO_MAKE_2026-03-29.md` | Reference | Original fix batch (referenced by others) |

## Archived this pass (17)

Moved to `archive/`:

- `CLAUDE_CODE_PROMPT_2026-03-31_MEGABATCH.md` (superseded by UNIFIED_BUILD)
- `CLAUDE_CODE_PROMPT_2026-03-31_IMAGE_PERF.md`
- `CLAUDE_CODE_PROMPT_2026-04-01_BACKGROUND_AND_OG.md`
- `CLAUDE_CODE_PROMPT_2026-04-01_UI_FIXES.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_BACKGROUND_IMAGE.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_BACKGROUNDS_AND_CONTRAST.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_FORM_READABILITY.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_MENU_RESTRUCTURE.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md`
- `CLAUDE_CODE_PROMPT_2026-04-02_TOOLS_LIBRARY.md`
- `CLAUDE_CODE_PROMPT_2026-04-03_COMPENSATION_AND_SCORECARD.md`
- `CLAUDE_CODE_PROMPT_2026-04-06_BIONOMICS.md`
- `FIXES_TO_MAKE_2026-03-30.md`
- `FIXES_TO_MAKE_2026-03-31.md`
- `FIXES_TO_MAKE_2026-03-31_IMAGES.md`
- `FIXES_TO_MAKE_2026-04-01.md`
- `FIXES_TO_MAKE_2026-04-03.md`

All were either fully shipped, superseded, or fully coded and verified in earlier commits per their own status markers.
