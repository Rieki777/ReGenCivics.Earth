# Claude Code Briefing — ReGen Civics
*2026-03-14 — Start here for this session*

---

## What this project is

ReGen Civics is a fund and in-real-life game for regenerative land projects and the Regenerative Renaissance. The site is regencivics.earth. You are working on the codebase that powers it.

**Tech stack:**
- Frontend: React + TypeScript + Wouter routing + Tailwind CSS v4 (via @tailwindcss/vite) + Radix UI (shadcn)
- Backend: Node.js + tRPC
- Database: MySQL on Railway via Drizzle ORM
- Hosting: Railway
- Assets CDN: assets.regencivics.earth

**Key constraints — read these before writing anything:**
- No em-dashes anywhere in any file (use commas, periods, or rewrite)
- No AI writing patterns in any user-facing copy: no "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion"
- All copy should sound like a real person in the regen movement wrote it
- Accessibility: text must always be readable — never light text on light backgrounds
- `getDb()` is async — always `await getDb()` and add a null guard `if (!db) throw new TRPCError(...)`
- Tailwind v4 uses `@custom-variant dark (&:is(.dark *))` — dark mode requires `.dark` class on `<html>`
- Dynamic Tailwind classes (e.g. `` `bg-${season}` ``) get purged — always use static lookup objects

---

## Your primary reference document

**`FIXES_TO_MAKE_2026-03-13.md`** — this is the master task list. Every fix has a number, status, and full implementation spec. Read it before starting any work.

Also needed:
- `QUEST_MASTER_SHEET.md` — full quest content and philosophy (referenced by Fix 76 and 77)
- `COMMUNITY_SPACE_DESIGN_2026.md` — community page redesign spec (referenced by Fix 72-75)

---

## Status as of end of 2026-03-13

### COMPLETED this session (can skip):
- **Fix 86** — CRITICAL dark mode regression FIXED: `ThemeProvider defaultTheme="dark"` (was "light") in `App.tsx`. This restored all dark green card backgrounds and the quest seasonal theming.
- **Fix 91** — Language auto-detection removed: `LanguageContext.tsx` now defaults to `'en'` (not `detectLanguage()`). Russian translations remain available in i18n.ts for manual selection.
- **Fix 92** — Community card images: `onError` fallback added
- **Fix 93** — Seed scripts: team@regencivics.earth lookup-or-create, TEAM_USER_ID used for all seeded posts
- **Fix 94** — Finca Sagrada → Ecuador, Liminal Village → Italy, inactive projects removed from Community + seed scripts
- **Fix 75** — Community pulse strip + welcome card (communityPulse tRPC endpoint)
- **Fix 72** — Fire + Air sections on /community (activeAirThreads tRPC endpoint, fire/air sections in Community.tsx)
- **Fix 95** — Community page sections wrapped in Radix Accordion (collapsed by default)
- **Fix 83** — Connect forms dark styling + BackButton fallbackPath/inline props
- **Fix 81** — Play page second video fixed (uses src directly on video element)
- **Fix 78A** — PlayerProfile contrast fixes (low-opacity text bumped up)
- **Fix 78B** — `scripts/check-contrast.ts` static scanner created
- **Fix 85 A+C** — Seed scripts updated with markdown links + EPIC quest thread
- **Fix 77imp4** — useHemisphere hook with IP geolocation + sessionStorage caching
- **Fix 77imp5** — QuestArcMap constellation SVG component
- **Fix 77imp9** — Thematic experience strings in QuestFilter.tsx
- **Fix 77imp10** — "Good for right now" seasonal tags on quest cards
- **Fix 77imp11** — QuestGameIntro 4-panel cinematic intro
- **Fix 77imp12** — Elemental filtering in QuestFilter.tsx
- **Fix 77imp13** — questQualifiers.ts created (now cleared per Fix 88A)
- **Fix 77imp16** — EpicQuestSection component + epicQuestsData.ts
- **Fix 77imp19** — Token transparency tooltips on $ReGen and RVoice
- **Fix 76B** — PDF download button in QuestDetailModal
- All Wave 4 DB tables created and deployed (questCompletions, activeQuestSignals, entityRssFeeds, forumReports.severity)
- All Wave 4 tRPC router handlers (quest router 9 endpoints, rssFeed router)

### CODED IN SESSION — verify still live:
- **Fix 79** — Tokenomics link in SiteFooter
- **Fix 80** — Nav: "Explore Quests" with ⛰️, Custom Land Games 🗺️
- **Fix 82** — Play page token detail links
- **Fix 84** — Forum URL linkification (react-markdown + remarkGfm)
- **Fix 77imp2** — "Experienced N" button text in QuestProgressTracker
- **Fix 87** — Button stack cleanup + trophy → Footprints icon
- **Fix 88A** — questQualifiers.ts cleared of hardcoded data
- **Fix 89** — Why Quests? expanded with Arc, Tokens, Qualifiers panels
- **Fix 85D** — --reset flag in seed-forum-posts.ts
- **Fix 90** — 18 new seasonal quests added to seasonalQuestsData.ts

---

## Still pending (not yet coded)

### Wave 2 — UI (no DB)
- **Fix 73** — RSS feed integration (entityRssFeeds table exists, needs steward UI + poll-rss-feeds.ts script)
- **Fix 74** — Two-level content flagging (forumReports.severity exists, needs UI + admin tab)
- **Fix 77imp14** — SeasonalQuestFeed component shown ABOVE the carousel in Quest.tsx (uses seasonalQuestsData.ts)
- **Fix 77imp15** — Guest browsing: remove auth gate from QuestDetailModal open

### Wave 3 — Components needing DB (db:push already done)
- **Fix 77imp1** — QuestArtifactsGallery (replaces QuestLeaderboard)
- **Fix 77imp3** — "N in the field" count (activeQuestSignals)
- **Fix 77imp6** — Story card narrative in QuestDetailModal (pull from questDetailsData)
- **Fix 77imp8** — "I'm doing this" active quest toggle (activeQuestSignals)
- **Fix 77imp17** — Quest journal in PlayerProfile (questCompletions)
- **Fix 77imp18** — Community Quest Spotlight in Quest.tsx hero

### Wave 4 — Content + seeding
- **Fix 70** — Community card image generation (nano-banana-pro)
- **Fix 69** — Forum content quality audit (em-dashes + AI patterns)
- **Fix 88B** — Steward endorsement UI (questEndorsements DB table — needs another db:push)
- **Fix 76A** — PDF generation for quest field guides (pdf skill)

### Human steps still needed
- Run `npx tsx scripts/seed-forum-posts.ts --reset` after seed scripts are verified
- Run `npx tsx scripts/seed-active-entities.ts` on Railway (Fix 68)
- Confirm questQualifiers.ts data with stewards before re-enabling
- Run `npx tsx scripts/seed-organisations.ts` (Fix 66)

---

## Key gotchas for this codebase

1. **Tailwind v4** — no `tailwind.config.ts`. Config is in `@theme inline {}` block in `index.css`. Dark mode via `@custom-variant dark (&:is(.dark *))`. The `.dark` class is added by `ThemeContext` when `defaultTheme="dark"`.

2. **getDb() is async** — always `await getDb()` then null-guard: `if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' })`

3. **Dynamic class purging** — never construct Tailwind class names dynamically (`` `bg-${color}` ``). Use static lookup objects instead. The Quest.tsx seasonal hero uses inline `style={{ background: SEASON_HERO[currentSeason].gradient }}` which bypasses this correctly.

4. **DB schema** — Drizzle ORM. Schema in `drizzle/schema.ts`. Run `pnpm db:push` to apply changes. Only Rye can run this (needs Railway DATABASE_URL).

5. **No em-dashes** — check before every commit. Use commas or periods instead.

---

## Before you finish each wave, verify

- No em-dashes introduced in any user-facing copy
- No light text on light backgrounds introduced
- No `console.log` statements left in
- Run `pnpm build` to confirm TypeScript compiles clean
- Test any route you changed in the browser before marking done
