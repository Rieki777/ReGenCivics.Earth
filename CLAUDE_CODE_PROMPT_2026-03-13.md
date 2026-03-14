# Claude Code Briefing — ReGen Civics
*2026-03-13 — Start here for this session*

---

## What this project is

ReGen Civics is a fund and in-real-life game for regenerative land projects and the Regenerative Renaissance. The site is regencivics.earth. You are working on the codebase that powers it.

**Tech stack:**
- Frontend: React + TypeScript + Wouter routing + Tailwind CSS + Radix UI (shadcn)
- Backend: Node.js + tRPC
- Database: MySQL on Railway via Drizzle ORM
- Hosting: Railway
- Assets CDN: assets.regencivics.earth

**Key constraints — read these before writing anything:**
- No em-dashes anywhere in any file (use commas, periods, or rewrite)
- No AI writing patterns in any user-facing copy: no "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion"
- All copy should sound like a real person in the regen movement wrote it
- Accessibility: text must always be readable — never light text on light backgrounds

---

## Your primary reference document

**`FIXES_TO_MAKE_2026-03-13.md`** — this is the master task list. Every fix has a number, status, and full implementation spec. Read it before starting any work.

Also needed:
- `QUEST_MASTER_SHEET.md` — full quest content and philosophy (referenced by Fix 76 and 77)
- `COMMUNITY_SPACE_DESIGN_2026.md` — community page redesign spec (referenced by Fix 72-75)

---

## What NOT to wait for

**These fixes require no `pnpm db:push` and can be started right now:**

### Wave 1 — Quick wins (no DB, no new components)

**Fix 91** — Forum /community page: remove Russian language strings
- Grep the entire codebase for Cyrillic characters: `grep -rn '[А-Яа-яЁё]' client/src/ server/`
- Any found strings should be replaced with the correct English copy:
  - "Форум сообщества" → "Community Forum"
  - "Роща встреч" → the configured English title (check what it should be in the component)
  - Stats in Russian → ensure they are rendered from English-language template strings
  - "Начать обсуждение" → "Start a Discussion"
  - "Поиск по темам..." → "Search topics..."
- If an i18n library is present (i18next, react-intl, etc.) and a Russian locale file exists, remove it and lock the default locale to `en`
- All UI strings in the Community/Forum components should be plain English literals
- Full spec in Fix 91

**Fix 92** — Community page: fix broken land project/org card images
- Find the `<img>` tags in the Earth section cards in `Community.tsx` (or equivalent)
- Add an `onError` fallback: `onError={(e) => { e.currentTarget.src = '/images/placeholder-landscape.jpg' }}`
- Check if a placeholder image exists at that path; if not, use an inline gradient fallback div instead
- All card images should live at `public/images/community/[slug].jpg` -- add a comment noting this convention
- Full spec in Fix 92

**Fix 93** — Forum seed scripts: author = "ReGen Civics Team"
- In each seed script (`seed-forum-posts.ts`, `seed-land-project-threads.ts`, `seed-quest-forum-posts.ts`, any others), add a lookup-or-create block for a `team@regencivics.earth` user at the top
- Replace all hardcoded `userId: 1` or `userId: RYE_USER_ID` with `userId: TEAM_USER_ID` for seeded posts
- Full spec in Fix 93

**Fix 94** — Community data: location corrections + remove inactive projects
- Finca Sagrada location: set to "Ecuador" (find in `Connect.tsx`, `Community.tsx`, or seed scripts)
- Liminal Village location: set to "Italy"
- Remove the following from all hardcoded arrays AND from seed script data: Ubuntu, Tioga, Tabi, LaLa Gardens Cooperative, Highland Lake
- These should not appear in community cards or have forum threads seeded for them
- Full spec in Fix 94

**Fix 85** — Regenerate forum seed scripts (links + new quest posts)
- Find the forum seed script(s) in `scripts/` (e.g. `seed-forum-posts.ts`)
- Convert all bare URLs to markdown links: `[descriptive text](https://full-url)`
- Add one forum post per new seasonal quest (18 total) using the template in Fix 85 spec
- Add EPIC Quest forum threads (one per tier or per quest) under an `epic-quests` category
- Make script idempotent (lookup-before-insert guard)
- Full spec in Fix 85
- Note: Rye will delete existing posts in Railway after this ships and re-run the seed

**Fix 84** — Forum post body: URLs not rendering as clickable links
- File: find `ForumPost.tsx` or equivalent component that renders `post.body` / `post.content`
- Plain URLs typed in posts (e.g. `youtube.com/playlist?list=...`) display as unformatted text
- If using `react-markdown`: add `remarkGfm` plugin to enable GFM autolinks (`import remarkGfm from 'remark-gfm'`, add to `remarkPlugins`)
- If rendering plain text: add a `linkifyText()` utility that wraps bare URLs in `<a href="..." target="_blank" rel="noopener noreferrer">` tags
- If using DOMPurify: ensure `href`, `target`, `rel` are in `ALLOWED_ATTR`
- Link style: `text-[#7dd87d] underline hover:text-white transition-colors`
- Full spec in Fix 84

**Fix 79** — Add Tokenomics link to site footer
- File: `client/src/components/SiteFooter.tsx`
- Add `<li><Link href="/tokenomics" ...>Tokenomics</Link></li>` after the Governance link (~line 136)
- Match the exact className used for the Governance link

**Fix 80** — Nav rename + icon changes
- File: `client/src/components/Navigation.tsx`
- "Start Questing" → "Explore Quests" with ⛰️ emoji (both desktop ~line 219 and mobile ~line 674)
- "Custom Land Games" → keep label, change 🎮 to 🗺️ (both desktop ~line 256 and mobile ~line 741)

**Fix 82** — /play "Explore Token Details" — add links
- File: `client/src/pages/Play.tsx`
- Inside "Explore Token Details" collapsible: add "Explore tokenomics →" link (`href="/tokenomics"`) on ReGen token card, "Explore governance →" link (`href="/governance"`) on RGVoice token card
- Add a small two-link footer line at the bottom of the whole collapsed section as well

**Fix 77 improvement 2** — "Experienced N" button text
- File: `client/src/components/QuestProgressTracker.tsx`
- Change `MarkCompleteButton` text: 0 completions = "I've done this", 1 = "Experienced 1", 2 = "Experienced 2", 3+ = "Experienced 3" (or N for infinite quests like Food Foresting)
- Pure text change, no logic change

**Fix 77 improvement 19** — Token transparency tooltips
- Files: `client/src/pages/Quest.tsx`, `client/src/components/QuestDetailModal.tsx`
- Add a small Info icon (from lucide, already imported) next to every `$ReGen` and `RVoice` display
- On hover: tooltip explaining what each token is (text in Fix 77 spec)

**Fix 77 improvement 9** — Thematic time/difficulty indicators
- File: `client/src/components/QuestFilter.tsx`
- Add `experience: string` field to each quest in `QUEST_METADATA` with the experiential descriptions from Fix 77 spec
- In `Quest.tsx` QuestCard: display `experience` string instead of "beginner/intermediate/advanced" text

**Fix 77 improvement 13** — Qualifier badges on quest cards
- New file: `client/src/data/questQualifiers.ts` (content in Fix 77 spec)
- In `Quest.tsx` QuestCard: render small "🌱 [OrgName]" pills for quests with qualifiers. Max 2 shown, "+N more" if more exist

---

### Wave 2 — UI fixes (no DB)

**Fix 95** — Community page: wrap all major sections in collapsible accordion panels
- File: `client/src/pages/Community.tsx`
- Use Radix UI `Accordion` (already in the project via shadcn): `import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'`
- Wrap each major section (Earth/Land Projects, Alliance Orgs, Forum, any others) in `<AccordionItem>` with descriptive trigger headings
- `type="multiple"` so multiple sections can be open, `defaultValue={[]}` so all start collapsed
- Keep the page hero/intro section outside the accordion (always visible)
- Existing section subtitles move inside the content or appear as a small line below the trigger heading
- Full spec in Fix 95

**Fix 83** — /connect forms: dark backgrounds + back button
- File: `client/src/pages/Connect.tsx`, possibly `client/src/components/BackButton.tsx`
- Change form container from `bg-white/95` to `bg-[#1a472a]/90 backdrop-blur-sm`
- Update all text inside forms: labels → `text-white/90`, helper text → `text-white/60`, inputs → `bg-white/10 border-white/20 text-white placeholder:text-white/50`, checkbox cards → `border-white/20 bg-white/10` unselected, `border-[#7dd87d] bg-[#7dd87d]/20` selected
- Apply to ALL 7 form paths (Land Partner, Create with ReGens, Alliance Partner, Finance, Live, Role, Something Else)
- Back button: pass `fallbackPath="/connect"` when rendering `<BackButton>` in Connect.tsx
- If the button overlaps form content, add an `inline?: boolean` prop to `BackButton.tsx` that switches from `fixed top-20 left-4 z-40` positioning to `relative mb-4` inline positioning. Use inline mode in Connect.tsx.

**Fix 81** — /play second video not playing
- File: `client/src/pages/Play.tsx`
- Check if `AutoplayVideo` component supports a `src` prop for non-YouTube videos. If yes, use it. If not, apply manual Intersection Observer pattern (full code in Fix 81 spec in the fixes doc)
- Add `onError` handler to show a fallback image if CDN fails
- The video source: `https://assets.regencivics.earth/WZgPeSZvhJLTVpCn.mp4`

**Fix 78 Part A** — Readability: known instances
- PlayerProfile.tsx contributions tab: audit and fix any light text on light background instances
- After Fix 83 is done (Connect forms already fixed there)

**Fix 78 Part B** — Readability audit script
- Create `scripts/check-contrast.ts`
- Crawls all routes, reports elements where text vs background contrast ratio is below 4.5:1
- Full spec in Fix 78 in the fixes doc

---

### Wave 3 — New components and hooks (no DB)

**Important quest content distinction (read before touching Quest.tsx):**
- Quests 0-13 (Fire through Fasting) are ALL already live on the site. Do not create new quest cards or placeholder cards for any of them. Add story card text and PDF guide buttons to existing cards.
- The 18 new seasonal quests in `QUEST_MASTER_SHEET.md` Part 4 are NOT yet on the site. These need to be added via `seasonalQuestsData.ts` and rendered through the new `SeasonalQuestFeed` component.
- The EPIC Quests in `QUEST_MASTER_SHEET.md` Part 5 are NOT yet on the site. These go in the new `EpicQuestSection` component at the bottom of the page.
- Story card text for quests 5-13 will say "Story coming soon" until Rye finalizes that section of the master sheet. That's a string update, not a structural change.

**Fix 77 improvement 4** — Seasonal hero with IP geolocation
- New file: `client/src/hooks/useHemisphere.ts`
- Fetches `https://ipapi.co/json/`, derives hemisphere + season, caches in sessionStorage
- Apply to Quest.tsx hero: change gradient + tagline per season, auto-scroll carousel to current season tab
- Add hemisphere toggle near season tabs for manual override
- Full spec in Fix 77

**Fix 77 improvement 11** — "Enter the Game" first visit experience
- New component: `client/src/components/QuestGameIntro.tsx`
- 4-panel cinematic scroll intro, shown when `localStorage.getItem("regen_game_entered") !== "true"`
- "Enter the Game" button sets the flag and reveals main page
- Full spec in Fix 77

**Fix 77 improvement 12** — Elemental filtering
- File: `client/src/components/QuestFilter.tsx`
- Add `element: "earth"|"water"|"fire"|"air"` to QUEST_METADATA for each quest (mapping in Fix 77 spec)
- Add elemental icon filter buttons (🌍 🌊 🔥 🍃) to filter UI
- Update `filterQuests()` to handle element filter

**Fix 77 improvement 14** — Seasonal quest discovery feed ABOVE carousel
- New data file: `client/src/data/seasonalQuestsData.ts` (content from QUEST_MASTER_SHEET Part 4 — note: QUEST_MASTER_SHEET may still be edited, so use placeholder data now and note that content will be updated)
- New component: `client/src/components/SeasonalQuestFeed.tsx`
- Reads `currentSeason` from `useHemisphere()`, shows 2-3 matching quests as featured cards
- "Explore all seasonal quests" accordion below
- Position: ABOVE the seasons carousel in Quest.tsx

**Fix 77 improvement 5** — Quest arc visualization
- New component: `client/src/components/QuestArcMap.tsx`
- SVG constellation of numbered quests with connecting lines, node colors by season
- Click node → opens QuestDetailModal, completed quests show filled nodes
- Toggle button in Quest.tsx hero: "View Quest Arc"
- Full spec in Fix 77

**Fix 77 improvement 15** — Guest browsing
- Remove auth gates from opening QuestDetailModal in Quest.tsx
- Login prompts appear only on submit/track actions inside the modal

**Fix 77 improvement 16** — EPIC Quest section
- New data file: `client/src/data/epicQuestsData.ts` (content from QUEST_MASTER_SHEET Part 5 — same caveat as seasonalQuestsData, may be updated)
- New component: `client/src/components/EpicQuestSection.tsx`
- Dark green section, horizontal cards, 3 tier rows (Easy/Hard/Expert), "Epic Quest" glowing badge
- Position: bottom of Quest.tsx before footer

**Fix 77 improvement 10** — Bioregional context on cards
- Needs `useHemisphere` hook (do after improvement 4)
- Add `QUEST_BEST_SEASONS` mapping in Quest.tsx
- Show "✨ Great for right now" tag on cards matching current season

**Fix 76 A+B** — Quest page: flip hints + card changes
- Add "tap to explore" hint (RotateCcw icon, `text-xs text-[#1a472a]/40`) to bottom-right of each QuestCard face
- In QuestDetailModal: add PDF download button where "Details coming soon" placeholder appears (link to `/quest-guides/quest-NN-slug.pdf` — these files will be generated separately)
- Add PDF button alongside video for quests that have a video too

**Fix 72** — Fire + Air sections on /community
- Add `air-conversations` forum category creation to a seed script
- Add `activeAirThreads` tRPC endpoint in `server/routers.ts`
- Add Fire section (with Quest Suggestions CTA at top + live quest cards) and Air section to `Community.tsx`
- Update PlayerProfile.tsx quest forum links to use canonical paths
- Full spec in Fix 72

**Fix 75** — Community pulse strip + welcome card
- Add `forum.communityPulse` tRPC endpoint (count queries on forumPosts, forumReplies, last 7 days)
- Add pulse strip and welcome card to top of Community.tsx
- Full spec in Fix 75

---

### Wave 4 — Requires `pnpm db:push` first (HUMAN step needed)

**Do not start these until Rye confirms `pnpm db:push` has been run.**

The schema changes needed:
- `questCompletions` table (for Fix 77 improvements 1, 3, 8, 17, 18)
- `activeQuestSignals` table (for Fix 77 improvements 3, 8)
- `entityRssFeeds` table + `orgClaims.rssPromptDismissed` field (Fix 73)
- `forumReports.severity` enum field (Fix 74)

After `pnpm db:push`, build in this order:
1. `quest` tRPC router (7 endpoints, spec in Fix 77)
2. Fix 77 improvement 8 — "I'm doing this" active quest signal
3. Fix 77 improvement 3 — "N in the field" count on cards
4. Fix 77 improvement 1 — QuestArtifactsGallery (replaces QuestLeaderboard)
5. Fix 77 improvement 17 — Quest journal in PlayerProfile
6. Fix 77 improvement 18 — Quest Spotlight in hero
7. Fix 73 — RSS feed integration (entityRssFeeds + steward UI + poll script)
8. Fix 74 — Two-level content flagging

---

## Page structure for the /quest page after all improvements

```
1. QuestGameIntro (first visit only — overlays everything)
2. Hero — seasonal background, spotlight card, arc toggle
3. SeasonalQuestFeed — "What's alive this [Season]" — ABOVE carousel
4. Seasons carousel — Quest 0 + 12 existing quests — unchanged structure
5. Quest grid with elemental filter — each card has: story hint, Experienced N button,
   "I'm doing this" toggle (needs DB), qualifier badges, thematic time tag, bioregional context
6. EpicQuestSection — dark green, 3 tiers
7. "Quest journal lives in your profile →" prompt
8. QuestArtifactsGallery floating button — bottom-right (replaces leaderboard, needs DB)
9. QuestProgressTracker floating button — shifted left to not overlap gallery button
```

---

## Before you finish each wave, verify

- No em-dashes introduced in any user-facing copy
- No light text on light backgrounds introduced
- No `console.log` statements left in
- Run `pnpm build` to confirm TypeScript compiles clean
- Test any route you changed in the browser before marking done

---

## Questions to surface to Rye

Only surface these if you truly cannot proceed without an answer:

1. **Quests 1-13 are all already live on the site.** Do not add placeholder cards or replace any existing quest cards. Quests 5-9 (Dreaming Spaces of Love, Rites of Love, Healing Circles, Wild Foraging, Medicine Journey), quests 11-12 (Coordination Patterns, Breathplay and Future Dreaming), and quest 13 (Fasting) are all already there. The task is to add story cards, PDF guides, and UI improvements to existing cards, not create new ones.
2. **Qualifier data** — the `questQualifiers.ts` mapping uses example org names. Flag that Rye should confirm which land projects and orgs actually want to be listed as qualifiers before launch.
3. **PDF generation** — the quest guide PDFs (Fix 76) will be generated by a separate process once QUEST_MASTER_SHEET.md is finalized. Build the PDF download buttons pointing to `/quest-guides/quest-NN-slug.pdf` — they will 404 until the PDFs are dropped in, which is fine. Story card text for quests 5-13 in `questDetailsData` can use a short placeholder like "Story coming soon — check back as the master sheet is finalized." This is a string change when the content is ready.
