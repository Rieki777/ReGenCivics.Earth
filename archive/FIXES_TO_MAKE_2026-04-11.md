# Fixes to Make -- 2026-04-11

Pre-launch polish pass. Target: April 22nd public launch.
This document continues from `FIXES_TO_MAKE_2026-04-10.md`.

---

## Fix 1 -- Welcome modal: swap button priority + rewrite copy (High)

**Status:** CODED

**Symptom:** "What is Regeneration?" was styled as the primary (green) button and "Skip, I'm ready" was the secondary outline button. Should be the other way around. Also, the copy said "We have a short video" which implies we made it. We didn't.

**Fix:** Swapped button order and styling. "Skip, I'm ready" is now the primary green button (first in the row). "What is Regeneration?" is now the secondary outline button. Rewrote the description to: "Here's a short video that was shared with us. We think they did a beautiful job sharing what the word 'regeneration' means. Or jump right on in if you already know the word."

**Files changed:**
- `client/src/components/RegenIntroGate.tsx` -- button order, styling, and copy

---

## Fix 2 -- Seasonal quest heading visibility (High)

**Status:** CODED

**Symptom:** The "Spring Quests / Season of New Beginnings" heading text used dark green colors (#1a472a, #4a7c59) on dark parallax background images, making them nearly invisible. Same issue on Summer, Fall, and Winter sections.

**Fix:** Changed all four seasonal heading + subtitle combos to white text with text-shadow for readability on any background. Applied to Spring, Summer, Fall, and Winter quest section headers.

**Files changed:**
- `client/src/pages/Quest.tsx` -- lines ~1019-1022 (Spring), ~1050-1053 (Summer), ~1081-1084 (Fall), ~1112-1115 (Winter)

---

## Fix 3 -- Food Foresting quest: old-map checklist graphic (Medium)

**Status:** CODED

**Symptom:** Rye wanted a parchment/old-map style checklist added to the Food Foresting featured quest card showing the food foresting loop:
1. Get Delicious Local Fruits
2. Bring Yummy Fruits on a Forest/Nature Walk
3. Eat Yummy Fruits, Save Seeds, Enjoy the Walk
4. Plant Seeds in Good New Homes for Seeds
5. Harvest Wild Fruits Grown by You and Other Players
6. Repeat

**Fix:** Added a parchment-styled card within the featured quest section with a warm gradient background, subtle crosshatch pattern, Georgia serif font, green checkmarks, and a repeat/loop icon at the bottom. Positioned between the reward badges and the Mark Complete button.

**Files changed:**
- `client/src/pages/Quest.tsx` -- new "Old-Map Style Checklist" block in the featured quest section

---

## Fix 4 -- Remove "We are ReGen Magicians" song (Quick)

**Status:** DONE (already coded in previous session)

**Symptom:** Song was in the playlist. Rye wanted it removed.

**Fix:** Already removed from PLAYLIST in AudioContext.tsx, PAGE_START_INDEX updated, SONG_SHORT_LABELS updated. Audio file left on disk but not referenced. Confirmed in this session that the removal is clean.

---

## Blog Post Notes from Rye (Content, not code)

These are content direction notes from Rye for upcoming blog posts. Not code fixes, but captured here so they don't get lost.

### Blog Post: Founding Members / Federation
"Founding members from different communities we want to federate with" -- those who join during the 3-month season of forming the alliance get the designation of "Founder" for that alliance and are in charge of collectively playing all the various roles a founder plays by taking on just a few of the tasks that feel most aligned to our life purpose.

### Blog Post: What's Fundamentally Different This Time Than in SEEDS

Two key points:

1. We have "AI" now that can automate admin. Something that burned the core team out in SEEDS as we scaled to thousands of active people is the admin load that was growing. Taking us out of the roles we wanted to play into roles that we needed to play. Now a lot of that burden can be automated.

2. A LOT of effort it took to add new features to our governance and economic systems (the turnaround time from community agreement to implementation) was too long. These two features fundamentally change the game in how we can co-create regenerative economic systems and is picking up on the work SEEDS started.

---

## Fix 5 -- Map filter bar clears bottom nav (High)

**Status:** CODED

**Symptom:** The globe filter tabs (All / Land Projects / Organizations / Applicants) on the `/map` page were positioned `bottom-4` (1rem) from the bottom of the globe, putting them directly under the bottom nav bar which sits at roughly 80px.

**Fix:** Changed `bottom-4` to `bottom-20` on the desktop filter bar container in GlobeMap.tsx (line 1369). The mobile filter bar is in the normal document flow below the globe, so it's unaffected.

**Files changed:**
- `client/src/components/GlobeMap.tsx` -- `bottom-4` to `bottom-20`

---

## Fix 6 -- Page-level sticky headers stacking over global nav (High)

**Status:** CODED

**Symptom:** Two pages had their own `sticky top-0 z-50` sub-headers that would compete with the global navigation (`sticky top-0 z-50`) when scrolling. On scroll, the page sub-header would paint over or collide with the global nav.

**Pages affected:**
- `/crowd-pooling` -- page header with back button and action buttons
- `/co-creators-guide` -- quick-nav section bar

**Fix:** Changed both to `sticky top-16 z-40` so they stick 64px (the global nav height) from the top and sit one z-level below the global nav.

**Files changed:**
- `client/src/pages/CrowdPooling.tsx` -- `sticky top-0 z-50` to `sticky top-16 z-40`
- `client/src/pages/ReGenCoCreatorsGuide.tsx` -- same change

---

## Fix 7 -- Crowd Pooling hero image visibility (Medium)

**Status:** CODED

**Symptom:** The hero section on `/crowd-pooling-campaigns` had the background image at `opacity-40`, making it barely visible.

**Fix:** Bumped to `opacity-60` so the image reads clearly while still letting the gradient show through.

**Files changed:**
- `client/src/pages/CrowdPoolingCampaigns.tsx` -- `opacity-40` to `opacity-60`

---

---

## Fix 8 -- Quest 10 NVC: YouTube video inline player (High)

**Status:** CODED

**Symptom:** The NVC quest modal showed "Video Coming Soon." Rye shared the video URL: `https://www.youtube.com/watch?v=nWb2B2uPfMo`.

**Fix:** Added an inline YouTube iframe embed above the Step-by-Step Guide section in the NVC quest modal, matching the pattern used for Quest 0 and Quest 1. Also set `videoUrl` on the quest-10 data entry so the footer play button activates.

**Files changed:**
- `client/src/components/QuestDetailModal.tsx` -- added quest-10 video embed block, added `videoUrl` to quest-10 data

---

## Fix 9 -- Breathwork quest: add Kriya and Kundalini (Quick)

**Status:** CODED

**Symptom:** Step 1 of Quest 12 listed "Holotropic breathwork, Wim Hof" but Rye wanted Kriya and Kundalini mentioned first.

**Fix:** Prepended "Kriya, Kundalini," to the step 1 description.

**Files changed:**
- `client/src/components/QuestDetailModal.tsx` -- step 1 description updated

---

## Fix 10 -- Season Intention: save + history (High)

**Status:** CODED

**Symptom:** Clicking "Set" on the Season Intention widget did nothing. No save, no history.

**Root cause:** The `onSet` callback was wired as `() => {}` (no-op) in PlayerProfile.tsx. No backend endpoint exists yet.

**Fix:** Rewrote SeasonalIntention.tsx to use localStorage for persistence:
- Saves intention to localStorage key `regen-season-intentions` keyed by season+year
- Displays the saved intention in place of the form after setting
- Shows a "Past Intentions" history section below for previous seasons
- Adds an "Update intention" link to change the current one
- `onSet` callback still fires (for future backend wiring)

**Files changed:**
- `client/src/components/SeasonalIntention.tsx` -- full rewrite with localStorage + history

---

## Fix 11 -- Profile Strength: incomplete items clickable (High)

**Status:** CODED

**Symptom:** The Profile Strength checklist showed incomplete items with a tooltip "Visit your profile to update" on hover, but clicking did nothing.

**Fix:**
- Added `onItemClick?: (label: string) => void` prop to ProfileCompletionMeter
- Incomplete items now render as clickable underlined buttons
- In PlayerProfile.tsx, the handler:
  - "First quest completed" → navigates to `/quest`
  - All other incomplete items → switches to the Settings tab + Profile section, then scrolls to `#profile-settings-panel`
- Added `id="profile-settings-panel"` to the settings content area for the scroll target

**Files changed:**
- `client/src/components/ProfileCompletionMeter.tsx` -- added `onItemClick` prop + clickable button rendering
- `client/src/pages/PlayerProfile.tsx` -- wired `onItemClick` handler, added `id` to settings panel

---

## Fix 12 -- "Available as storyteller" toggle moved to Game section (Medium)

**Status:** CODED

**Symptom:** The storyteller toggle lived in the Notifications settings section but belongs in Game (it's a game mechanic, not a notification preference).

**Fix:** Moved `<StorytellerToggle />` from the Notifications section to the bottom of the Game & Wallet section.

**Files changed:**
- `client/src/pages/PlayerProfile.tsx` -- moved StorytellerToggle from notifications block to game block

---

## Priority Order

All fixes complete for this batch. Rye visual review needed before push.

1. ~~Fix 1~~ -- Welcome modal (CODED)
2. ~~Fix 2~~ -- Seasonal quest headings (CODED)
3. ~~Fix 3~~ -- Food Foresting checklist (CODED)
4. ~~Fix 4~~ -- Magicians song (DONE)
5. ~~Fix 5~~ -- Map filter bar (CODED)
6. ~~Fix 6~~ -- Sticky header stacking (CODED)
7. ~~Fix 7~~ -- Crowd Pooling hero opacity (CODED)

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| ALL | `git add -A && git commit && git push` after reviewing changes | Git push requires your machine | Terminal in project root |
| ALL | Confirm Railway deploy after push | Railway dashboard | railway.app dashboard |
| ALL | Visual review in `npm run dev` before push | You need to see the changes live | `npm run dev` then check `/quest` page and welcome modal |
| Blog | Write the two blog posts from the notes above | Content/voice is yours | Google Docs or site CMS |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Welcome modal: swapped buttons, rewrote copy | CODED |
| 2 | All 4 seasonal quest headings: white text + shadow | CODED |
| 3 | Food Foresting parchment checklist graphic | CODED |
| 4 | ReGen Magicians song removal | DONE (previous session) |
| 5 | Map filter bar: `bottom-4` to `bottom-20` in GlobeMap.tsx | CODED |
| 6 | CrowdPooling.tsx + ReGenCoCreatorsGuide.tsx: page sub-headers use `top-16 z-40` | CODED |
| 7 | CrowdPoolingCampaigns.tsx hero image: `opacity-40` to `opacity-60` | CODED |
| 8 | Quest 10 NVC: inline YouTube embed + videoUrl set | CODED |
| 9 | Quest 12 Breathwork step 1: added Kriya and Kundalini | CODED |
| 10 | SeasonalIntention.tsx: localStorage save + history display | CODED |
| 11 | ProfileCompletionMeter: clickable incomplete items with smart navigation | CODED |
| 12 | StorytellerToggle: moved from Notifications to Game section | CODED |

### WAITING ON YOU before Claude Code can proceed

| # | What's needed | Why |
|---|--------------|-----|
| 04-10 #5 | 15 village illustration images for quest map redesign | Cannot build without art assets (post-launch) |

### YOUR REVIEW CHECKLIST (before git push)

Run `npm run dev` locally and check these in your browser:

| Page | What to look for |
|------|-----------------|
| Home (clear `regen-intro-seen` from DevTools localStorage) | "Skip, I'm ready" is the big green primary button. "What is Regeneration?" is smaller/outline. Copy says "a short video that was shared with us." |
| `/quest` | Spring / Summer / Fall / Winter section headings are white and readable on the parallax backgrounds. Food Foresting card shows the parchment checklist below the reward badges. |
| `/map` | Filter tabs (All / Land Projects / Organizations) are visible above the bottom nav, not covered by it. |
| `/crowd-pooling` | Scrolling down, the page back-button header sticks below the global nav (not over it). |
| `/crowd-pooling-campaigns` | Hero background image is more visible than before (was very faint). |
| Quest modal -- Quest 10 NVC | Video player appears above the Step-by-Step Guide. Footer "Video Coming Soon" button is now active. |
| Quest modal -- Quest 12 Breathwork | Step 1 reads "Kriya, Kundalini, Holotropic breathwork, Wim Hof..." |
| `/profile` sidebar | Profile Strength incomplete items are underlined and clickable. Clicking "First quest completed" goes to `/quest`. Clicking others opens the Settings > Profile tab and scrolls to the form. |
| `/profile` > Settings > Season Intention | Typing and clicking "Set" saves the intention and shows it in place of the form. History of past seasons appears below. |
| `/profile` > Settings > Game & Wallet | "Available as storyteller" toggle appears at the bottom of the Game section, not in Notifications. |
