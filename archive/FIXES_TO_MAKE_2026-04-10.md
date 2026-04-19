# Fixes to Make -- 2026-04-10

New batch of ideas and fixes from Rye's screenshots (messaging app).
This document continues from `COMMUNITY_AGREEMENTS_PLAN.md` (Parts 1-7, shipped).

---

## Fix 1 -- Remove "We are ReGen Magicians" song (Medium)

**Status:** CODED

**Symptom:** The song "We are ReGen Magicians" plays as track 2 in the site-wide audio playlist. Rye wants it removed for now.

**Root cause:** It's hardcoded in the PLAYLIST array.

**Fix:** Remove the "We are ReGen Magicians" entry from the PLAYLIST array in `client/src/contexts/AudioContext.tsx` (line 14). Also update the `PAGE_START_INDEX` map (lines 45-54) since removing track index 1 shifts all subsequent indices down by one. Update `SONG_SHORT_LABELS` in `client/src/components/SmartBottomNav.tsx` (line 35) to remove the "Magicians" entry.

**Files to change:**
- `client/src/contexts/AudioContext.tsx` -- remove line 14, fix PAGE_START_INDEX
- `client/src/components/SmartBottomNav.tsx` -- remove "We are ReGen Magicians" from SONG_SHORT_LABELS

**Current PLAYLIST (7 tracks):**
```
0: Wasteland into Wonderland  -> /land
1: We are ReGen Magicians     -> /quest   <-- REMOVE THIS
2: We are the Land            -> /community
3: ReGen Transition Team      -> /play
4: Better & Better & Better   -> /team
5: Addiction 2 Addition        -> /game
6: Cult to Culture            -> /governance
```

**After removal (6 tracks):**
```
0: Wasteland into Wonderland  -> /land
1: We are the Land            -> /community
2: ReGen Transition Team      -> /play
3: Better & Better & Better   -> /team
4: Addiction 2 Addition        -> /game
5: Cult to Culture            -> /governance
```

**Updated PAGE_START_INDEX:**
```ts
const PAGE_START_INDEX: Record<string, number> = {
  "/land": 0,
  "/quest": 0,        // was 1, now falls back to track 0
  "/community": 1,    // was 2
  "/play": 2,         // was 3
  "/team": 3,         // was 4
  "/game": 4,         // was 5
  "/governance": 5,   // was 6
  "/economy": 5,      // was 6
  "/tokenomics": 5,   // was 6
}
```

The audio file `client/public/audio/we-are-regen-magicians.mp3` can stay on disk (no need to delete, just not referenced).

---

## Fix 2 -- First-time visitor "What is Regeneration?" video gate (High)

**Status:** IN PROGRESS

**Symptom:** First-time visitors land on the site with no context about what "regeneration" means. Rye wants an auth-style box that asks: "Already familiar with regeneration? If not, watch this video. If yes, skip right into the site."

**Design:**
- Show a modal/dialog on first visit (use localStorage key like `regen-intro-seen`)
- Two paths:
  - "I'm new to regeneration" -> embeds YouTube video: `https://youtu.be/GMLyhJw4Bps`
  - "I already know, let me in" -> dismisses and sets localStorage flag
- Show BEFORE the existing OnboardingWizard (which fires after login)
- This is for ALL visitors, not just logged-in users

**Existing components to reference:**
- `client/src/components/OnboardingWizard.tsx` -- similar localStorage gating pattern (uses `onboarding_complete` key)
- `apps/gov/src/components/WelcomeModal.tsx` -- similar first-visit modal (uses `regen-gov-welcome-seen` key)

**Implementation approach:**
1. Create `client/src/components/RegenIntroGate.tsx` -- a full-screen overlay / modal
2. Two buttons: "What is Regeneration?" (shows embedded YouTube iframe) and "Skip, I'm ready" (dismisses)
3. After watching or skipping, set `localStorage.setItem('regen-intro-seen', 'true')`
4. Render in `client/src/App.tsx` at the top level, gated by localStorage check
5. YouTube video ID: `GMLyhJw4Bps`

**Files to change:**
- `client/src/components/RegenIntroGate.tsx` -- NEW file
- `client/src/App.tsx` -- add RegenIntroGate near root

---

## Fix 3 -- Map page: command center covers filter icons on load (High)

**Status:** IN PROGRESS

**Symptom:** On the Map page (`/map`), the SmartBottomNav / CommandPanel sits at the bottom and covers the filter tab bar on the globe. When a player first arrives, they have to scroll down to see the filter tabs because the bottom nav overlaps them.

**Root cause:** The desktop filter tabs are absolutely positioned at `bottom: 4` (1rem) from the bottom of the globe container (`GlobeMap.tsx` line 1367). The SmartBottomNav is `fixed` at the bottom of the viewport and overlaps this area.

**Rye's request:** Have the command center on the map page grow to include the filter icons (the bottom nav icons) so they're visible on the map without scrolling. On both desktop and mobile.

**Proposed fix -- two options (Claude Code should pick the simpler one):**

**Option A (simpler):** Move the desktop filter bar UP so it clears the bottom nav. Change `bottom-4` to `bottom-20` (5rem) on the filter bar container at line 1367 of `GlobeMap.tsx`. This keeps filters visible above the nav.

**Option B (Rye's preferred vision):** Absorb the filter tabs into the SmartBottomNav/CommandPanel when on the `/map` route. The CommandPanel would detect it's on the map page and render the filter tabs inline. This requires passing filter state up or using a context. More complex.

**Recommendation:** Start with Option A. It's a one-line CSS change and solves the immediate UX problem. Option B can be a follow-up.

**Files to change:**
- `client/src/components/GlobeMap.tsx` -- line 1367: change `bottom-4` to `bottom-20` on desktop filter bar
- Same file, mobile: the mobile filter tabs (line 1583-1591) are below the globe in the normal document flow, so they shouldn't have this problem. But verify.

---

## Fix 4 -- Crowd pooling card readability (Medium)

**Status:** IN PROGRESS

**Symptom:** The crowd pooling campaign cards have low readability. Background images are low-res, card backgrounds are too opaque, and text lacks contrast.

**Root cause:** Card styling in `CrowdPoolingCampaigns.tsx` and/or `CrowdPoolingTool.tsx` uses background images that may be compressed, and the card overlay opacity doesn't provide enough contrast for text.

**Fix -- three changes:**
1. **Higher resolution background images:** Check the `cdnImg()` URLs used for card backgrounds. If they're using low-res thumbnails, switch to higher-res versions or remove the background image sizing constraints.
2. **Less opaque card backgrounds:** Reduce the opacity of the card background overlay so more of the image shows through. Currently cards likely use something like `bg-white` or `bg-[#1a472a]/90`. Change to a lower opacity like `/70` or `/60`.
3. **More text contrast:** Ensure all text on cards has sufficient contrast. Add `text-shadow` or use darker text colors on lighter cards, lighter text on darker cards. Consider adding a subtle `backdrop-blur` behind text.

**Files to change:**
- `client/src/pages/CrowdPoolingCampaigns.tsx` -- card styling, background images, text contrast
- `client/src/components/CrowdPoolingTool.tsx` -- if it renders cards too
- `client/src/pages/CrowdPooling.tsx` -- header background image (line 55, uses `cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")`)

**Notes:** This fix requires visual judgment. Claude Code should make the changes and then Rye should review in `npm run dev` before shipping.

---

## Fix 5 -- Quest map redesign: bird's eye village illustration (Post-Launch)

**Status:** BLOCKED (needs art assets from Rye)

**Symptom:** The current quest progression uses a node-graph style map (`ProgressMap/ProgressMapSVG.tsx`). Rye wants to replace this with a bird's-eye-view village illustration where each quest is a physical location in the village.

**Design vision:**
- 14 separate quest location images (one per quest, each a building/area in the village)
- 1 background map canvas image (the village itself, top-down aerial view)
- Quest locations are clickable hotspots overlaid on the map canvas
- As quests are completed, the corresponding building/area "lights up" or transforms
- Replaces the current ProgressMap SVG node graph

**Current quest map components:**
- `client/src/components/ProgressMap/ProgressMap.tsx` -- full-screen overlay, desktop sidebar + mobile bottom sheet
- `client/src/components/ProgressMap/ProgressMapSVG.tsx` -- the actual SVG node graph
- `client/src/components/ProgressMap/ProgressMapMini.tsx` -- mini version in CommandPanel
- `client/src/components/ProgressMap/useProgressMap.ts` -- progress data hook
- `client/src/components/ProgressMap/mapData.ts` -- path and node definitions
- `client/src/components/ProgressMap/mapAssets.ts` -- asset URLs

**What's needed before code work:**
1. Rye needs to create or commission the 15 images (14 quest locations + 1 map canvas)
2. Define the x,y coordinates for each quest hotspot on the canvas
3. Define the "lit up" vs "locked" visual treatment for each location

**This is a POST-LAUNCH item.** The current ProgressMap works fine. This is a visual upgrade for later.

---

## Fix 6 -- Menu top bar overlap / design issues (High)

**Status:** IN PROGRESS

**Symptom:** The navigation top bar has overlap or layout issues. Specific problems not fully detailed in the screenshot, but likely related to z-index conflicts, dropdown menus overlapping content, or the sticky header not clearing page content properly.

**Relevant file:** `client/src/components/Navigation.tsx` (1,212 lines)

**Common causes to check:**
1. **z-index stacking:** Navigation uses `z-50` (sticky top header). Dropdowns inside it need higher z-index. Check if any page content has competing z-index values.
2. **Sticky header height:** If `top-0` is set but the body/main content doesn't have enough `padding-top` or `margin-top` to clear the header height, content will render behind the nav.
3. **Mobile menu overlap:** The hamburger menu drawer (uses `vaul` Drawer component) may not properly overlay other fixed elements.
4. **Dropdown clipping:** Desktop dropdown menus may clip behind other absolutely positioned elements.

**Investigation needed:** Rye should provide more specifics or a screenshot showing exactly which elements overlap. Claude Code can then target the exact CSS fix.

**Files to change:**
- `client/src/components/Navigation.tsx` -- z-index, positioning, height calculations
- `client/src/App.tsx` or layout wrapper -- ensure main content clears the nav height

---

## Priority Order

1. **Fix 1** -- Remove Magicians song (quick, no risk)
2. **Fix 3** -- Map filter overlap (quick CSS fix, high UX impact)
3. **Fix 6** -- Menu overlap (needs more specifics from Rye, but investigate)
4. **Fix 2** -- Regen intro video gate (new component, medium effort)
5. **Fix 4** -- Crowd pooling readability (visual tuning, needs review)
6. **Fix 5** -- Quest map village (blocked on art assets, post-launch)

---

## Handoff Breakdown -- Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 5 | Create 15 village illustration images (14 quest locations + 1 map canvas) | Art direction and image generation/commissioning | Image gen tool or artist |
| 5 | Define x,y hotspot coordinates for each quest on the map canvas | Design decision | Provide as a simple table or annotated image |
| 6 | Provide a screenshot or more detail on which elements overlap in the menu | Only you can see the live site behavior | Screenshot from browser |
| 4 | Review crowd pooling card changes in `npm run dev` | Visual judgment call | `npm run dev` then check `/crowd-pooling-campaigns` |
| 2 | Confirm the YouTube video ID `GMLyhJw4Bps` is correct for the intro gate | Content decision | Verify the video is public and appropriate |
| ALL | `git add -A && git commit && git push` after fixes are coded | Git push requires your machine | Terminal in project root |
| ALL | Confirm Railway deploy after push | Railway dashboard | railway.app dashboard |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Remove "We are ReGen Magicians" from PLAYLIST, fix PAGE_START_INDEX, fix SONG_SHORT_LABELS | READY TO CODE |
| 2 | Create RegenIntroGate.tsx component with YouTube embed and localStorage gating | READY TO CODE |
| 2 | Wire RegenIntroGate into App.tsx | READY TO CODE |
| 3 | Move desktop filter bar from `bottom-4` to `bottom-20` in GlobeMap.tsx | READY TO CODE |
| 4 | Adjust card opacity, text contrast, and backdrop-blur in CrowdPoolingCampaigns.tsx | READY TO CODE |
| 6 | Investigate Navigation.tsx z-index and sticky header clearance | READY TO CODE |

### WAITING ON YOU before Claude Code can proceed

| # | What's needed | Why |
|---|--------------|-----|
| 5 | 15 village illustration images | Cannot build the quest map village without art assets |
| 6 | More specific screenshot of menu overlap | Need to see exactly which elements collide to write the right fix |
