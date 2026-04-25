# Fixes to Make — 2026-04-23 Batch 3

Continues from `FIXES_TO_MAKE_2026-04-21_BATCH2.md`.

Scope: sixteen fixes Rye flagged on 2026-04-23. Six are shipped directly in-source by Claude in this commit. Nine are specced below for Claude Code. One is on Rye (Google Calendar edit).

---

## Fixes shipped directly in this commit

### Fix 1 — Governance page: remove Contribution Scores card

**Status:** FIXED

**Symptom:** The Governance page advertised "Contribution Scores" as one of three coordination tools, but the scoring system isn't built yet. Users clicking through expect something that isn't there.

**Fix:** Removed the Contribution Scores card from `Three Tools for Coordination`. Retitled the section to `Two Tools for Coordination`, collapsed the grid from `md:grid-cols-3` to `md:grid-cols-2` with a `max-w-3xl mx-auto` so two cards still feel centered. Also trimmed the intro paragraph to stop mentioning Contribution Scores.

**Files changed:** `client/src/pages/Governance.tsx` (lines ~775, 794-816)

---

### Fix 2 — Season label: "winter" until Sept 2026 equinox

**Status:** FIXED

**Symptom:** The More tab showed "spring season" because `getCurrentSeason()` uses calendar months. ReGen Civics runs a game season that stays in Winter (Season 1 — "The First Build") until Season 2 begins at the September 2026 equinox.

**Fix:** Rewrote `getCurrentSeason()` in `client/src/lib/seasons.ts` to return "winter" until `2026-09-22T00:00:00Z`, after which the calendar-based rotation takes over. Everything that reads season (`useSeasonTint`, `MobileMoreMenu` header label, hero tints) now reflects the real game state.

**Files changed:** `client/src/lib/seasons.ts`

---

### Fix 3 — Schedule: hide TBD caveat under Past Events tab

**Status:** FIXED

**Symptom:** Under the Historical/Past Events tab, a tan caveat said "Episode day/time may be adjusted during the 1st Episode based on the 13 selected projects' availability." That's only relevant to future episodes.

**Fix:** Wrapped the caveat in `{activeTab === "upcoming" && …}` so it only renders when the Upcoming tab is active. No change under Historical.

**Files changed:** `client/src/pages/Schedule.tsx` (around line 1100)

---

### Fix 4 — Forum: Weekly Digest card readability

**Status:** FIXED

**Symptom:** On the new forest-green forum background, the `Get the Weekly Digest` card used a translucent green tint with sage-green text that faded into the backdrop. On Rye's phone the whole card was nearly invisible.

**Fix:** Swapped the card surface to `bg-[#0d2818]/80` with a `border-[#7dd87d]/40` border and `shadow-lg shadow-black/20`. Text recolored to `text-white` + `text-white/80` + `text-[#7dd87d]` for the subscribed state. Now reads as a solid card floating on the forest bg.

**Files changed:** `client/src/pages/Community.tsx` (Newsletter CTA block)

---

### Fix 5 — Forum: Create Account button routes to actual account creation

**Status:** FIXED

**Symptom:** Tapping "Create Account" on a gated forum category page sent the user to `/connect`, which is the interest-form page. Users hit it, saw a form about what they're interested in, and bounced.

**Fix:** Changed the Create Account button onClick to `window.location.href = getLoginUrl()`, which runs Google OAuth. The OAuth flow creates a new account on first sign-in and signs existing users in. `returnTo` is still stored in sessionStorage so the user lands back at the same forum page after auth.

**Files changed:** `client/src/pages/CommunityCategory.tsx` (line ~134)

---

### Fix 6 — Apply page: login dialog restyled to match site theme

**Status:** FIXED

**Symptom:** Clicking Apply for Season 2 from the Schedule page as a logged-out user showed a dialog with a tan `bg-[#f0ebe3]` background and default Card chrome. It looked like a different app. Also the button said `Login to Continue`, which felt hostile for a first-time user who doesn't have an account yet.

**Fix:** Rewrote the gate to use the forest gradient (`from-[#0a1f12] via-[#0d2818] to-[#122e1c]`) with a dark card (`bg-[#0d2818]/80 border-[#7dd87d]/30`), white text, and a clearer CTA: `Sign in or create account`. `returnTo` now includes the search string so the user comes back to the exact season they were applying to. Added a small `Back to home` link for people who didn't mean to land there.

**Files changed:** `client/src/pages/Apply.tsx` (login-gate block)

---

### Fix 7 — More tab logo: phoenix + circle-of-life crest

**Status:** FIXED

**Symptom:** The More tab header used the plain square logo file. Rye wanted the phoenix-and-circle-of-life crest (the one on the Connect page) here too, for brand consistency.

**Fix:** Swapped the `<img>` src on the More tab header from `/images/logos/regencivics-logo-light-transparent-rounded.webp` to the Connect page CDN asset `https://assets.regencivics.earth/qtPtaaJfgElzmVAI.png`, bumped size from 80×80 to 96×96, and dropped the `rounded-2xl shadow-lg` chrome so the crest art reads as art (not a tile).

**Files changed:** `client/src/components/mobile/MobileMoreMenu.tsx`

---

## Specs for Claude Code (open work)

### Fix 8 — Gratitude dialog on mobile: verify the Portal fix is live

**Status:** BLOCKED on deploy

**Symptom:** In Rye's screenshot the Gratitude panel is still visually cut off by the forum reply card on mobile.

**Root cause (likely):** Batch 2 shipped the Portal + fixed-positioning fix for this exact issue (commit `c89a802`). If Rye's phone was hitting a cached or pre-batch-2 build, this would still look broken.

**Next step for Claude Code:**
1. Confirm commit `c89a802` is deployed to production (Railway + whatever CDN is fronting `/assets`).
2. Force a cache-bust on mobile Safari (add a `?v=N` query or bump the asset hash).
3. If the bug still reproduces after deploy + cache clear, open `client/src/components/GratitudeButton.tsx` and verify the `panelPos` calc accounts for mobile viewport (iOS Safari's dynamic viewport vs. `window.innerHeight`).
4. Consider `position: fixed` on iOS edge case where a focused textarea repositions the viewport (URL bar collapse).

**Files involved:** `client/src/components/GratitudeButton.tsx`

---

### Fix 9 — Music player mobile: one smooth experience, not two stacked panels

**Status:** CODED spec

**Symptom:** On mobile, opening the More tab shows *two* music panels stacked: a compact "Wasteland into Wonderland ⏮ ▶ ⏭" strip at the top, and below it a taller `Hymns of the ReGeneration` card with `Hide / + Add song / ⬇ Download`. Two tracks showing the same thing. Also on the full-page player, the playlist panel renders the same controls again.

**Root cause:** `MobileMoreMenu` renders both the compact transport (from its built-in AudioContext block) *and* the `MobilePlaylistPanel` component, which has its own Play / Hide / Add Song / Share header.

**What needs to change:**
1. In `MobileMoreMenu.tsx`, pick ONE surface for music:
   - Option A: Keep the compact strip at the top (now-playing + prev/play/next), remove the `MobilePlaylistPanel` body. Tapping the compact strip opens the full-page player (already exists).
   - Option B: Keep `MobilePlaylistPanel`, remove the compact strip.
   - Recommendation: **Option A**. Players expect the compact transport at the top of a "More" drawer; the full playlist lives on the dedicated music page.
2. On the full-page mobile music player, ensure there's exactly one `Hide / Add song / Share` header, not the one from `MobileMoreMenu` + the one from `MobilePlaylistPanel`.

**Files involved:**
- `client/src/components/mobile/MobileMoreMenu.tsx` (lines ~16, ~20 — audio-related imports + MobilePlaylistPanel)
- `client/src/components/mobile/MobilePlaylistPanel.tsx`

**Evidence when done:** Two screenshots — compact player at top of More tab; full playlist on the dedicated music route. No more duplicate "Add song / Download / Hide" headers visible on the same screen.

---

### Fix 10 — Mobile music player: volume slider not responding

**Status:** CODED spec

**Symptom:** On iPhone Safari, tapping/dragging the volume slider at the bottom of the music player doesn't change volume.

**Root cause (hypothesis):** `<input type="range">` on iOS can have touch event issues when a wrapping container has `touch-action: none` or `pointer-events: none` applied for drag/swipe gestures. Or the `onChange` is only wired to the mouse path. Location: `client/src/components/SoundPlayer.tsx` around line 190-199.

**What needs to change:**
1. Open `SoundPlayer.tsx` volume slider.
2. Ensure the input has both `onChange` (covers all input types) and, if needed, `onInput` for live updates during drag.
3. Check that no ancestor applies `touch-action: none` or `pointer-events: none` while the player panel is visible.
4. Verify the `audio.volume = v` setter runs on iOS — Safari historically ignored `audio.volume` programmatic changes (treats it as system volume). If that's the cause, detect iOS and hide the volume slider there with a note ("Use your device volume").

**Files involved:** `client/src/components/SoundPlayer.tsx:190-199`

**Evidence when done:** Slider visibly moves on iPhone, volume audibly changes OR (if iOS restriction) slider is hidden with the system-volume note.

---

### Fix 11 — iPhone Safari: quick-action FAB missing

**Status:** CODED spec

**Symptom:** The bottom-right quick-action button (WizardRadialMenu) that opens the floating quick-access wheel is missing on iPhone Safari. Rye can't find it on the Connect page.

**Files involved:** `client/src/components/mobile/WizardRadialMenu.tsx:158` (FAB with `fixed bottom-24 right-4 z-40`)

**What needs to change:**
1. Confirm WizardRadialMenu is rendered from a layout/root that mounts on Safari (not hidden behind a feature flag for specific routes).
2. Check if `bottom-24` is being covered by the Safari bottom chrome + MobileTabBar. If MobileTabBar is `bottom-0` with height `h-16`, FAB needs `bottom-20` or `bottom-24` to sit above. Measure at mobile widths with Safari's dynamic viewport.
3. z-index: FAB is `z-40`. MobileTabBar may be `z-50`, which would hide the FAB behind the bar. Either bump FAB to `z-[60]` or anchor it `bottom-[calc(env(safe-area-inset-bottom)+5rem)]` so it sits above the tab bar.
4. Re-test on iPhone Safari after deploy.

**Evidence when done:** Screenshot from iPhone Safari on `/connect` showing the FAB visible above the MobileTabBar.

---

### Fix 12 — Safari mobile menu: disable horizontal scroll

**Status:** CODED spec

**Symptom:** In iPhone Safari, the hamburger drawer menu lets the user swipe horizontally, revealing background content. Menu should be a locked vertical-only panel.

**Root cause (hypothesis):** The Sheet/Drawer container uses default touch behavior; iOS lets pan-x happen unless explicitly stopped.

**What needs to change:**
1. Find the mobile nav drawer component (likely `client/src/components/mobile/` or wherever the hamburger opens a `SheetContent`).
2. Add `overflow-x-hidden touch-pan-y [overscroll-behavior:contain]` on the sheet container.
3. For the sheet body, `overflow-y-auto` stays; `overflow-x: hidden` explicitly.
4. If the issue is a body-level swipe (not the sheet itself), lock `document.body` with `overflow-x: hidden` while the sheet is open.

**Evidence when done:** Attempt to drag the open menu left/right on iPhone Safari — nothing moves.

---

### Fix 13 — Globe map: audit Apply / Website / Forum buttons on land project popups

**Status:** CODED spec

**Symptom:** On the land projects map, Rye reported the "Apply" button on the Finca Sagrada card is broken. Need to audit all project-card buttons.

**Files involved:** `client/src/components/GlobeMap.tsx:660` (Apply wired to applyUrl) and `GlobeMap.tsx:1495` (Apply as a New Land Project → /apply).

**What needs to change:**
1. Open `GlobeMap.tsx`. For each project card rendered (Finca Sagrada, Liminal Village, Salt Cross, and any others), verify: (a) Website button opens the correct `websiteUrl`, (b) Apply button opens `applyUrl` in a new tab or routes correctly, (c) Forum button (currently "coming soon") is either wired or cleanly disabled.
2. If Apply is wired to `applyUrl` but the data is null for a project, render the button disabled or hide it. Don't leave a dead-looking button.
3. Cross-reference the project data source (probably `activeLandProjectsData` from tRPC) to confirm `applyUrl` is set per project.

**Evidence when done:** Tap every button on every project card — each one does the correct action.

---

### Fix 14 — Sign-in process: debug & test

**Status:** CODED spec

**Symptom:** Rye reported Sign In doesn't work on mobile, including with a new email. The menu shows Sign In button but the flow is broken somewhere.

**What needs to change:**
1. Open the Sign In button in the mobile menu drawer — trace its onClick to `getLoginUrl()` (`/api/oauth/google`).
2. Confirm the OAuth redirect URL is registered correctly in Google Cloud Console for the mobile Safari origin.
3. Check the server `/api/oauth/google` handler — does it set a cookie with `SameSite=Lax` and `Secure`? iOS Safari can drop cookies with incorrect SameSite settings during OAuth redirect.
4. After auth, the return URL is pulled from `sessionStorage.returnTo` (set by the Create Account button). Confirm sessionStorage survives the OAuth round-trip on mobile Safari (it should, but verify).
5. Reproduce with Rye's account in Safari devtools and capture the network waterfall for the OAuth dance.

**Evidence when done:** Sign in from iPhone Safari lands signed in on the return route.

---

### Fix 15 — "Who do the children look up to" content push

**Status:** HUMAN STEP REQUIRED

**Symptom:** Rye mentioned this content is missing from the live site and "need to push that commit."

**What this means:** There's a local commit on Rye's Windows machine that isn't on `origin/main` yet. The Cowork VM doesn't see it. Nothing for Claude Code to do here other than: after Rye pushes, verify the content renders where expected.

**Action:** Rye to `git status` / `git log --oneline origin/main..HEAD` on the Windows machine, confirm the unpushed commit, then `git push origin main`.

---

### Fix 16 — Earth Day Launch Google Calendar event: swap Zoom → Riverside

**Status:** HUMAN STEP REQUIRED

**Symptom:** The Google Calendar event Rye created for Earth Day 2026 Launch (Wed 22 April, 07:00-09:00) still shows a Zoom link. Rye wants it to be the Riverside link instead.

**What this means:** This is an event in Rye's Google Calendar (not a row in the site's events DB — the on-site April 22 event has already been removed per prior batch). Only Rye can edit their own Google Calendar event.

**Action:** Rye to open that event in Google Calendar and replace the Zoom block with the Riverside link + any YouTube livestream link.

---

## Priority Order

1. **Fix 14** (Sign in broken) — blocks new users from joining at all.
2. **Fix 13** (Apply button audit) — users actively trying to apply.
3. **Fix 11** (Safari FAB missing) — quick action is a primary navigation entry.
4. **Fix 9** (Music player duplication) — visible clutter on every mobile More visit.
5. **Fix 8** (Gratitude mobile verify) — may already be fixed by deploy.
6. **Fix 12** (Menu horizontal scroll) — polish bug.
7. **Fix 10** (Volume slider) — polish bug, may be iOS-inherent.
8. **Fix 15** (Who Looks Up To) — Rye pushes.
9. **Fix 16** (Earth Day calendar) — Rye edits Google Cal.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 15 | Push the local "Who do the children look up to" commit | Cowork VM doesn't see your local Windows commits | `git log --oneline origin/main..HEAD` then `git push origin main` |
| 16 | Edit Earth Day Google Calendar event: replace Zoom link with Riverside link | It's your Google Calendar, only you can edit the event | Google Calendar → open `ReGen Civics Earth Day Launch` event → Edit → replace Zoom block |
| All | Pull + push this commit | Cowork agent does not hold push credentials | `git pull` then `git push origin main` on Windows |
| All | Verify on staging after push | Requires physical iPhone + signed-in browser | See Priority Order above for test list |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Governance: remove Contribution Scores card | FIXED | `client/src/pages/Governance.tsx` (card deleted, grid collapsed to 2-up, intro paragraph trimmed) |
| 2 | Season calc: winter until Sept 2026 equinox | FIXED | `client/src/lib/seasons.ts` (getCurrentSeason() returns "winter" until 2026-09-22) |
| 3 | Schedule: hide TBD caveat under Historical tab | FIXED | `client/src/pages/Schedule.tsx` (conditional `activeTab === "upcoming"` wrapper) |
| 4 | Weekly Digest card readability | FIXED | `client/src/pages/Community.tsx` (bg-[#0d2818]/80 + white text) |
| 5 | Create Account routes to OAuth | FIXED | `client/src/pages/CommunityCategory.tsx` (window.location.href = getLoginUrl()) |
| 6 | Apply page login gate restyled | FIXED | `client/src/pages/Apply.tsx` (forest gradient + dark card + Sign in or create account CTA) |
| 7 | More tab logo → phoenix crest | FIXED | `client/src/components/mobile/MobileMoreMenu.tsx` (src swapped to assets.regencivics.earth/qtPtaaJfgElzmVAI.png) |
| 8 | Gratitude mobile verify after deploy | BLOCKED on deploy | batch 2 `c89a802` already ships the Portal fix |
| 9 | Music player mobile dedupe | CODED spec | Recommendation: remove MobilePlaylistPanel from MobileMoreMenu, keep compact strip |
| 10 | Volume slider mobile | CODED spec | Check iOS audio.volume restriction; add touch/input handlers |
| 11 | Safari FAB missing | CODED spec | Check z-index vs MobileTabBar; use env(safe-area-inset-bottom) |
| 12 | Menu horizontal scroll | CODED spec | touch-pan-y + overflow-x-hidden on SheetContent |
| 13 | Apply button audit on map | CODED spec | Cross-check all project cards + applyUrl data |
| 14 | Sign-in debug | CODED spec | Trace OAuth round-trip; check SameSite cookies |

### WAITING ON YOU before Claude Code can proceed

- **Fix 15** (Who Looks Up To): blocked on Rye's unpushed commit.
- **Fix 16** (Earth Day Cal): Rye-only.

### Note on database migrations

Claude Code CAN run migrations via `npx tsx scripts/run-migration.ts <file>`. None of the fixes in this batch require a migration.
