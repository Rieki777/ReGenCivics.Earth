# Claude Code Briefing — ReGen Civics
*2026-03-14 — All fixes for today in this prompt*

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
- No AI writing patterns in any user-facing copy: no "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion", "embark on", "vibrant", "crucial", "groundbreaking", "transformative journey"
- No contrast-framing ("This is not X, this is Y" / "This is not a meditation app, this is a game"). Define things by what they are, not by what they are not.
- No rhetorical questions used to introduce topics ("What if we could...?" as a section opener)
- All copy should sound like a real person in the regen movement wrote it: direct, grounded, specific, no performance
- Accessibility: text must always be readable — never light text on light backgrounds
- `getDb()` is async — always `await getDb()` and add a null guard `if (!db) throw new TRPCError(...)`
- Tailwind v4 uses `@custom-variant dark (&:is(.dark *))` — dark mode requires `.dark` class on `<html>`
- Dynamic Tailwind classes (e.g. `` `bg-${season}` ``) get purged — always use static lookup objects

---

## Your primary reference document

**`FIXES_TO_MAKE_2026-03-14.md`** — today's fixes (Fix 96-107 + quest + token rebalancing). Read this first.

**`FIXES_TO_MAKE_2026-03-13.md`** — prior fixes. Pending items from this doc are listed in the "Still pending" section below.

**`QUEST_RINGING_CEDARS_DRAFT.md`** — confirmed Ringing Cedars quest. Implement this as a new Anytime quest.

**`TOKEN_REBALANCING_PROPOSAL.md`** — confirmed token amounts. Apply all values to the codebase.

**`BLOG_CLAIM_YOUR_PROJECT.md`** and **`BLOG_SEEDS_CONTRIBUTIONS.md`** — blog posts to add to the site.

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

### URGENT — Fix 109: Home page loads in ~60 seconds (ship this first)

**Fix 109** — Critical performance: home page taking ~60 seconds to load on a fresh browser

This is the top priority. A 60-second load time will cause 100% bounce on any outreach or fundraising link. Work through all 10 steps in Fix 109 in `FIXES_TO_MAKE_2026-03-14.md`.

Summary of the 10 steps:

1. **Verify route code splitting is working** - confirm `pnpm build` output shows many small chunks, not one large file. Check for barrel imports in Landing.tsx that pull in the entire component library.
2. **Run bundle visualizer** - `npx vite-bundle-visualizer` - identify the top 5 largest modules. Common culprits: `import * as icons from 'lucide-react'` (imports all 1000+ icons), questData.ts or seasonalQuestsData.ts bundled into Landing, Radix UI pulled in everywhere.
3. **Enable gzip/brotli compression on the Express server** - install `compression` package and add `app.use(compression())` before static file serving. A 233KB bundle becomes ~65KB compressed. This is the single highest-leverage change.
4. **Add resource preconnect hints to index.html** - `<link rel="preconnect" href="https://assets.regencivics.earth">` and any font CDN.
5. **Fix font loading** - add `font-display: swap` to all `@font-face` rules. Add `&display=swap` to any Google Fonts URL.
6. **Audit tRPC queries on the landing page** - defer any query that loads below-the-fold data using `enabled: isBelowFoldVisible`. Add `staleTime: 5 * 60 * 1000` to all queries so they don't refetch on every navigation.
7. **Add idle preloading of likely next routes** - after landing page renders, use `requestIdleCallback` to silently preload Quest, Community, Play pages so they feel instant.
8. **Hero image preload** - add `<link rel="preload" as="image" href="/backgrounds/hero.webp" fetchpriority="high">` to index.html for the hero background.
9. **Add /health endpoint** - simple `{ status: 'ok', timestamp: Date.now() }` response. Rye will set up an uptime pinger to prevent Railway cold starts.
10. **Measure before + after** - run `npx lighthouse https://regencivics.earth --output json --output-path lighthouse-before.json --chrome-flags="--headless"` first to get a baseline, then again after shipping.

Full spec with code examples for each step is in Fix 109 in `FIXES_TO_MAKE_2026-03-14.md`.

---

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

### Wave 1.5 — Token rebalancing (update all quest reward values)

**TOKEN_REBALANCING_PROPOSAL.md is confirmed by Rye — apply all values now.**

Update every quest's `$ReGen` reward in the codebase. Files to update:
- `client/src/data/questData.ts` or wherever numbered quest rewards live (Quests 0-13)
- `client/src/data/seasonalQuestsData.ts` for the 18 new seasonal quests

Use these exact values (1 RGVoice unchanged throughout):

| Quest | $ReGen |
|---|---|
| Quest 0 Fire | 111 |
| Quest 1 Potions | 111 |
| Quest 2 Seeds | 111 |
| Quest 3 Healing Whole | 144 |
| Quest 4 Food Foresting | 111 per completion (repeatable) |
| Quest 5 Dreaming Spaces of Love | 111 |
| Quest 6 Rites of Love | 99 |
| Quest 7 Healing Circles | 144 |
| Quest 8 Wild Foraging | 111 |
| Quest 9 Medicine Journey | 222 |
| Quest 9b Tree Talk | 99 |
| Quest 10 NVC | 177 |
| Quest 11 Coordination Patterns | 177 |
| Quest 12 Breathplay + Future Dreaming | 111 |
| Quest 13 Fasting | 77 per completion (repeatable, no cap) |
| Healing the Five Bodies | 144 |
| Study Natural Hygiene | 111 |
| ReGen Financial Systems | 333 |
| Friendship with a Free Animal | 111 |
| Your Honey Moon | 144 |
| Singing to Your Food Forest | 77 |
| Animal Spirit Totems | 111 |
| Future Casting | 77 |
| Eating Sunlight | 99 |
| Becoming Trauma Informed | 111 |
| Write a Children's Book | 177 |
| Make a Song for the ReGeneration | 111 |
| Recreate Your Personal Cycles | 111 |
| Decrease Expenses, Increase Joy | 77 |
| Hermetic Seal | 144 |
| Start a Friend Pool | 111 |
| Present Parenting | 444 |
| The Fifth Agreement | 99 |

---

### Wave 1.6 — Ringing Cedars quest (new Anytime quest)

Add from `QUEST_RINGING_CEDARS_DRAFT.md`. Full spec is in that file. Key data:

```ts
{
  id: "ringing-cedars",
  title: "The Ringing Cedars",
  subtitle: "Ancient Wisdom for a Regenerative World",
  season: "anytime",
  rewards: { regenPerBook: 33, rvoicePerBook: 1, totalBooks: 10, completionBonus: 333 },
  time: "Self-paced - one book 4-10 hours, full series over weeks or months",
  element: "aether",
  deliverable: "A forum post after each book, reflecting through a regenerative lens. Claim once when done reading.",
  image: "/quest-images/seasonal/ringing-cedars.webp",
}
```

Special logic for this quest:
- 33 $ReGen + 1 RGVoice per book (player tracks how many they have read)
- One claim only -- cannot claim partial then return for more
- Completing all 10 earns 333 $ReGen total + 10 RGVoice + cedar tree badge
- Cedar tree badge: add to badge system, awarded on 10-book completion

Also add to seed-forum-posts.ts:
- Thread title: "The Ringing Cedars Series - Reading Circle"
- Post body: use forum seed post from QUEST_RINGING_CEDARS_DRAFT.md
- Category: anytime-quests (or the anytime tab's forum category)

Generate image using nano-banana-pro:
- Prompt: `Open book resting on a cedar log in a forest clearing, soft golden light filtering through tall pine trees, a single green seedling growing from the pages, photorealistic, warm and quiet atmosphere`
- Save to: `public/quest-images/seasonal/ringing-cedars.webp`

---

### Wave 2.5 — UI and dashboard fixes (no DB)

**Fix 101** — Restore parallax scrolling backgrounds with pre-baked overlays
- Write `scripts/bake-overlays.ts` using sharp to composite the current CSS overlay opacity directly into background image files
- Restore `background-attachment: fixed` (desktop) with scroll fallback on mobile (max-width 768px)
- Use passive scroll listener for JS parallax if CSS approach doesn't work
- Full spec in Fix 101 in `FIXES_TO_MAKE_2026-03-14.md`

**Fix 102** — Logo in footer
- Rye will save logos to `public/images/logos/regencivics-logo-dark.png` and `regencivics-logo-light.png`
- Once saved: add Logo A (dark) to `SiteFooter.tsx`, ~120px, `rounded-full`, centered above footer links
- Full spec in Fix 102

**Fix 103** — Explore Quests nav icon: ⛰️ → 🌲
- `client/src/components/Navigation.tsx`, desktop ~line 219 and mobile ~line 674

**Fix 104** — Multi-path "YOUR PATH" badges on dashboard
- Detect investor/land/alliance/player engagement across existing tables
- Badge each matching persona card independently
- Full spec in Fix 104

**Fix 105** — Hide "Book a Discovery Call" from non-investors
- Wrap card in `{isInvestor && ...}` check
- Full spec in Fix 105

**Fix 107** — /game page: contributions framework + forum seed post
- Update SEEDS callout copy (full copy in Fix 107 and `BLOG_SEEDS_CONTRIBUTIONS.md`)
- Add contributions forum thread to seed-forum-posts.ts
- Full spec in Fix 107

**Fix 110** — /quest page comprehensive overhaul
- **Fix 110-A:** Four floating buttons overlapping bottom-right — stack them in a single `fixed bottom-6 right-6 flex flex-col gap-3` container
- **Fix 110-B:** Seasonal carousels incomplete — every quest in `seasonalQuestsData.ts` for a season must appear in that season's carousel tab. Add a new Anytime section after Winter (parallax bg, carousel of all `season: 'anytime'` quests including Ringing Cedars). Generate bg image with nano-banana-pro (prompt in Fix 110-B).
- **Fix 110-C:** "Start Your Journey" cards to `grid-cols-2 lg:grid-cols-3`. Remove "Earn Tokens, Gain Voice" callout box from Why Quests accordion.
- **Fix 110-D:** Expand Why Quests accordion with the full Arc narrative from `QUEST_MASTER_SHEET.md` Parts 1 and 2 (The Infinite Game + The Arc). Keep under 600 words. No token mechanics box.
- **Fix 110-E:** Quest Arc label change ("Quest Arc for the Rites of Passage: full journey!") and View Quest Arc button icon to `Map` from lucide-react.
- **Fix 110-F additional:** Wire all story cards from `QUEST_MASTER_SHEET.md` Part 3 into `questDetailsData.ts`. ALL 14 numbered quests now have full story cards, how-to steps, deliverables, tips, resources, and connected-to. No quest should show "Details coming soon." Flag any that are missing and fill from the master sheet.
- Full spec in Fix 110 in `FIXES_TO_MAKE_2026-03-14.md`

**Fix 108** — Community Forum page full overhaul (route: `/community/`)
- **CRITICAL:** Replace all hardcoded Russian/Cyrillic text with English (hero badge, H1, stats, CTA button, search placeholder, community guidelines heading + body) - see Russian-to-English table in Fix 108
- **CRITICAL:** Fix activity bar ("71 posts this week") - `text-white/70` is invisible on cream background - change to `text-[#1a472a]`, bar bg to `bg-[#7dd87d]/25`, add `animate-pulse` to dot
- **CRITICAL:** Fix "Get the Weekly Digest" - currently a plain non-interactive div - replace with email input + subscribe button component
- Restructure page: remove duplicate category listings, reorder so Earth/Water/Fire/Air elemental accordions come FIRST (collapsed by default), then "All Threads" accordion last (also collapsed)
- Empty states for 0-thread categories: `opacity-60` + "Be the first to post" text + 🌱 empty state when clicked
- Tag pills: add "Filter by:" label, tooltips on hover, active/filled state on click
- Hero polish: stats to `text-white/90`, CTA button hover scale + glow animation
- Back button: change to "← Back to Community" with destination context
- Activity bar: make sticky below nav
- Sort All Threads categories by thread count descending
- Full spec in Fix 108 in `FIXES_TO_MAKE_2026-03-14.md`

---

### Wave 2.6 — Blog posts

Add two blog posts to the site's blog system:

**Blog post 1:** `BLOG_CLAIM_YOUR_PROJECT.md`
- Slug: `claim-your-land-project-or-organisation`
- Title: "Your Space Is Waiting - How to Claim Your Land Project or Organisation"
- Category: Community / How-To
- Full content in the file

**Blog post 2:** `BLOG_SEEDS_CONTRIBUTIONS.md`
- Slug: `your-seeds-contributions-live-on`
- Title: "Your SEEDS Contributions Live On - And Here Is How to Bring Them Home"
- Category: Movement / Tokens / History
- Full content in the file
- Also add the embedded forum seed post from that file to seed-forum-posts.ts

---

### Wave 3.5 — PDF field guides (uses pdf skill)

**Fix 76A** — Quest PDF field guides
- IMPORTANT: Before writing any code for this, read the pdf skill: `/sessions/stoic-peaceful-feynman/mnt/.skills/skills/pdf/SKILL.md`
- Generate one PDF field guide per numbered quest (0-13) using the content in `QUEST_MASTER_SHEET.md`
- Each PDF has: quest title, story card, how-to steps, deliverable, resources, blank journal section
- Save to `public/quest-guides/[slug]-field-guide.pdf`
- The PDF download button in QuestDetailModal (Fix 76B, already shipped) links to these files
- Full field guide outline is in the regen-quest-builder skill: `QUEST_MASTER_SHEET.md Part 3`

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
- `pnpm db:push` for Fix 106 (superadmin role enum) then run `npx tsx scripts/set-superadmin.ts` to grant master admin to rieki.cordon@gmail.com

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
