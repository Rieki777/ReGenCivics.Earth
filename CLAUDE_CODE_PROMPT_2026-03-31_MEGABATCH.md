# Claude Code Execution Prompt — 2026-03-31 Megabatch

Read CLAUDE.md, CONTEXT_THE_TWO_GAMES.md, QUEST_PROGRESSION_SPEC.md, and PROGRESS_MAP_DESIGN.md before starting any work.

This prompt covers ALL outstanding work across 4 execution prompts and 3 fixes documents. Execute in the order below. Each section references its source doc for full details.

---

## PHASE 1: Immediate (no blockers, run in parallel if possible)

### Track A: Recording Flow (source: CLAUDE_CODE_PROMPT_2026-03-28_PART5.md)

Read that file for full specs. Six parts:

1. **Fix Zapier data field mapping** in `server/webhooks/riverside.ts`. Normalize the `data_` prefix keys so Zapier webhook data maps correctly.
2. **Update forum category** from "episodes" to "session-recordings". Replace fuzzy LIKE lookup with exact slug in the recordings route.
3. **Add "Watch Replay" button** to Schedule page for completed events that have recordings.
4. **Map integration** for recording info modal: show recording metadata in map quest tooltips.
5. **Recording email notification**: send email via Resend when a recording finishes processing.
6. **Email opt-in preference**: add a toggle in the Settings page (which was just overhauled) for recording notifications.

### Track B: FIXES_TO_MAKE_2026-03-29.md (22 fixes)

Read that file for full specs on each fix. Execute in priority order:

**Critical:**
- Fix 4: Move quest floating buttons (Report/Share/Love) into the Command Center panel
- Fix 7: Readability audit (WCAG AA contrast sweep across all pages)

**High:**
- Fix 1: Game page intro text replacement (full copy in the doc) + add Tokenomics and Governance CTA buttons
- Fix 2: Game page merge alliance cards into unified rendering
- Fix 3: Opportunity page collapsibles default to closed
- Fix 5: CommandPanel single-click collapse (header click toggles)
- Fix 6: Increase parallax panel transparency
- Fix 8: Steward Dashboard prevent claiming when existing stewards assigned
- Fix 9: Image upload fix stream.getReader error in Cloudflare Worker
- Fix 11: Navigation rename "Learn + Connect" to "Explore + Connect"

**Medium:**
- Fix 10: Profile page overhaul (edit button debug, photo upload post-fix-9, add bannerUrl schema + banner display). Full spec in CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md.
- Fix 13: Remove 1-pager routes, export content to markdown in docs/
- Fix 14: Glossary propose-a-term UI (schema exists, add form + "Proposed" badge). Full spec in CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md.
- Fix 15: Feature suggestions page + Community.tsx entry card. Full spec in CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md. NOTE: DB migration needed by Rye after you write the schema.
- Fix 16: Map auto-tracking (auto-scroll on quest completion)
- Fix 18: Feature suggestions form redesign: add bug/feature toggle, different fields per type, "Copy Prompt" button
- Fix 19: Community page bigger cards + add Feature Suggestions link + open-source mention
- Fix 20: Forum post edit: add image upload to edit mode (reuse creation component)
- Fix 21: Forum content templates that change based on post type (discussion, case study, seeking team)
- Fix 22: LOI /opportunity conditional routing: if user hasn't submitted /investment form, redirect there first with return URL

### Track C: MAP_PERF Part 1 (source: CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md)

Read that file for full specs. Generate quest hero images for Fire and Food Forest quests using Gemini 3 Pro image generation (2K WebP). This is the CRITICAL BLOCKER for Phase 2.

NOTE: Image generation requires the Gemini API which only works from the Windows machine (Linux VM proxy blocks it). If running in Claude Code on Windows, use the generate_image.py script from the nano-banana-pro skill. If blocked, skip to Phase 2 non-image tasks and flag for Rye.

---

## PHASE 2: After MAP_PERF Part 1 completes

### MAP_PERF Parts 2-3 (source: CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md)

- Part 2a: Create responsive map image variants (7 maps x 3 sizes = 21 WebPs)
- Part 2b: Update mapAssets.ts with srcSets and getMapSrc() helper
- Part 3: Add dissolve page transitions (fadeout/fadein between routes)

### QUEST_LOCK (source: CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md)

Read that file AND QUEST_PROGRESSION_SPEC.md for full specs. Five parts:

1. Create `useQuestUnlocks` hook (core unlock chain logic)
2. Build HeroQuestCard component (Fire + Food Foresting with hero backgrounds)
3. Season progress ring component (visual seasonal rite completion indicator)
4. Locked quest badge + states (greyed cards, overlays, unlock messaging)
5. Quest title tweaks (remove numbering from routine quests)

### FIXES_TO_MAKE_2026-03-31.md (7 fixes, all CODED but verify)

These were coded in a Cowork session. Verify they compile and the logic is correct:
1. Fire + Food Forest hero images wired up
2. Remove quest 14 numbering prefix
3. Spring Rites locked behind Fire quest completion
4. Epic quests require ALL 13 rites (not just 1 per season)
5. Other quests unlock after 1 per season
6. Move "Got a Quest Idea?" above Epics section
7. Replace bottom CTA with Tokenomics/Governance info cards

### Fix 17 from FIXES_TO_MAKE_2026-03-29.md

Seasonal Rites locking audit. Run after QUEST_LOCK is complete. Verify the full unlock chain works correctly per QUEST_PROGRESSION_SPEC.md.

---

## PHASE 3: Deploy prerequisites (Rye must do these)

After all code is written, Rye needs to:

1. `git add -A && git commit -m "Megabatch: recording flow, 22 fixes, map perf, quest locking" && git push`
2. Run DB migrations: `npx drizzle-kit push` (for bannerUrl, featureSuggestions table)
3. Run glossary seed script if terms migrated to DB: `npx tsx scripts/seed-glossary.ts`
4. Deploy Cloudflare Worker (image-gen): `cd workers/image-gen && wrangler deploy`
5. Visual QA in browser after deploy

---

## Files already changed in today's Cowork session (DO NOT revert these)

These files were modified today and should be committed as-is:

- `client/index.html` — OG/Twitter meta tags now use local `/og-default.jpg`
- `client/public/og-default.jpg` + `.webp` — New 1200x630 Ghibli village social sharing image
- `client/public/og-social-share.jpg` + `.webp` — Same image, alternate filename
- `client/src/components/SEO.tsx` — DEFAULT_IMAGE uses local path, all village-scene pages use `${BASE_URL}/og-default.jpg`
- `server/_core/vite.ts` — SSR now replaces twitter:title, twitter:description, twitter:url, twitter:image (previously only replaced OG tags). DEFAULT_META image uses .jpg.
- `client/src/pages/Apply.tsx` — Back button has explicit dark text color + hover state
- `FIXES_TO_MAKE_2026-03-29.md` — Added Fixes 18-22 + updated handoff breakdown

Also already done in previous Cowork sessions (committed or awaiting push):
- `client/src/pages/Schedule.tsx` — All Riverside URL placeholders replaced
- `client/src/pages/Land.tsx` — Button visibility + golden glow
- `client/src/pages/LOI.tsx` — Dark input text + /opportunity links
- `client/src/components/SocialLinks.tsx` — WhatsApp/Discord replaced with Socials
- `client/src/components/Navigation.tsx` — Color mapping for new social keys
- `client/src/pages/Socials.tsx` — Bot/scam messaging, removed "recommended"
- `client/src/pages/Team.tsx` — "Ask in Forum" linked to /community/post/624
- `client/src/pages/Game.tsx` — TypewriterText component added
- `server/_core/email.ts`, `server/jobs/digestJob.ts`, `server/webhooks/riverside.ts`, `server/routes/recordings.ts`, `server/routes/events.ts` — "Update email preferences" linking to /settings

---

## PHASE 4: Social Sharing System (source: SOCIAL_SHARING_SPEC.md)

Read `SOCIAL_SHARING_SPEC.md` for the full spec. This is the go-to-market audience building system. Execute in the order listed in the spec's "Implementation Priority" section.

**Phase 4a (can start in parallel with Phase 1):**
- Generate 11 unique OG images for missing pages (requires Gemini API on Windows)
- Fix dimensions on 5 existing OG images to 1200x630
- Wire all images into ROUTE_META in vite.ts and pageSEO in SEO.tsx
- Test with Facebook Debugger, Twitter Card Validator, LinkedIn Post Inspector

**Phase 4b (after 4a):**
- Build `/api/og` dynamic image endpoint using satori + @resvg/resvg-js
- Create templates: forum posts, quest completions, campaign cards, player profiles, blog posts
- Wire dynamic routes in vite.ts SSR for /community/post/:id, /quest/:slug, /land/:slug, /crowd-pooling-projects/:id

**Phase 4c (after 4b):**
- Build SharePrompt component with contextual copy for 8 key moments
- Add referral tracking URL parameters (ref, src, ctx) to all share links
- Create database tables: share_events, referrals, ab_test_variants, ab_test_assignments
- Create text overlay variants for top 5 pages

**Phase 4d (after 4c):**
- Build "Social & Sharing" admin tab with: top-line cards, share activity chart, referral funnel, per-content breakdown, per-referrer leaderboard, A/B test results, campaign sharing stats, platform breakdown
- Player referral rewards system ($ReGen tokens for referred signups/completions)
- Player profile cards (shareable)
- Messaging app optimization (WhatsApp cache busting, title length limits)

**Phase 4e (later):**
- Embeddable widgets for external sites
- Seasonal wrap-up cards
- Daily rollup cron job for analytics pre-aggregation

---

## Cleanup (if you have file delete permissions)

Remove these temp files from the project root:
- `bg-seg1-starry-village.png`, `bg-seg2-village-life.png`, `bg-seg3-soil-gardens.png`, `bg-seg4-mycelium.png`, `bg-seg5-cosmic.png`
- `gen_bg_segments.py`, `gen_seg2_v2.py`, `stitch_bg.py`
- `og-social-b64.txt`, `og-check-b64.txt`
- `client/public/images/backgrounds/home-desktop-new.webp`, `home-mobile-new.webp`
- `AUDIT_PLANNING_2026-03-31.md`, `EXECUTION_PRIORITY_2026-03-31.txt` (generated audit files, no longer needed)
