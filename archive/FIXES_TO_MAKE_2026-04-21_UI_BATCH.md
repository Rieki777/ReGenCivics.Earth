# Fixes to Make — 2026-04-21 (UI batch from screenshots)

This document covers the 15-issue batch Rye delivered on 2026-04-21.

The **quick fixes (Fix 1 through Fix 6)** have been applied to source by the
Cowork agent and are ready to commit. The **complex fixes (Fix 7 through Fix
15)** are specced here for Claude Code to complete. **Claude Code: please do
`git push origin main` after completing your items.**

---

## Fix 1 — Forum editor: Bold / Italic / List / Quote + click-anywhere-to-focus (High)

**Status:** FIXED (awaiting push)

**Symptom:** In the forum reply and new-post editor, the bullet, numbered list,
and quote toolbar buttons appeared to do nothing. Clicking just outside the
typing area (toolbar margin, the padding between toolbar and textarea) failed
to focus the editor. Users had to click the small textarea exactly.

**Root cause:**
1. Toolbar buttons had no `onMouseDown preventDefault`. On mousedown the
   editor lost its ProseMirror selection, so when the click handler fired
   `editor.chain().focus().toggleBulletList()`, there was no selection to
   operate on and the command no-oped visually.
2. `serializeToMarkdown` always emitted `-` for `listItem`, regardless of
   whether the parent was `bulletList` or `orderedList`. Numbered lists
   serialized as bullet markdown, so numbered toggles appeared not to work.
3. The outer RichEditor `<div>` had no click handler, so clicking the padding
   or the toolbar's empty horizontal space did nothing.

**Fix:**
- Added `onMouseDown={(e) => e.preventDefault()}` to every toolbar button.
- Rewrote `serializeToMarkdown` to carry list context (`listType` and
  `orderedIndex`) into `listItem` so ordered lists render as `1.`, `2.`, ...
- Added `onClick` on the outer wrapper that focuses the editor if the click
  wasn't on a button.
- Added `cursor-text` to signal the whole area is clickable.
- Bumped `min-h-[150px]` to `min-h-[220px]` so the visible typing area is
  taller.

**Files changed:**
- `client/src/components/RichEditor.tsx`

---

## Fix 2 — Remove "High contrast" button from footer (Medium)

**Status:** FIXED (awaiting push)

**Symptom:** The "High contrast" button in the footer's Stay in the Loop
column did not do anything visible. It flipped a `data-contrast="high"`
attribute but no CSS rules targeted it.

**Fix:** Removed the `<li>` containing the High contrast button. Left the
PWA Install button and cookie/email preferences in place.

**Files changed:**
- `client/src/components/SiteFooter.tsx`

---

## Fix 3 — "Continue to Hypha" opens in new tab (Medium)

**Status:** FIXED (awaiting push)

**Symptom:** Clicking Continue to Hypha navigated away from ReGen Civics in
the same tab. Players lost their place.

**Fix:** Replaced `window.location.href = ...` with
`window.open(url, "_blank", "noopener,noreferrer")` and reset the
redirecting spinner state after the pop-up fires.

**Files changed:**
- `client/src/pages/BridgeHypha.tsx`

---

## Fix 4 — Comets originate from sky, not from the village (Medium)

**Status:** FIXED (awaiting push)

**Symptom:** Shooting stars on the Home background sometimes spawned mid-way
down the cosmos container, appearing to emerge from rooftops or the porch
lantern on the village panel.

**Fix:** Reduced the shooting-star spawn zone from `Math.random() * 55` (upper
55%) to `Math.random() * 27` (upper 27%) inside `CosmosParticles`. The cosmos
container is the top 22% of the page, so streaks now start near the top and
fade out cleanly above the village line.

**Files changed:**
- `client/src/components/PageBackground.tsx` (line 435)

---

## Fix 5 — Welcome map image: crop blurry top + narrow text box (Medium)

**Status:** FIXED (awaiting push)

**Symptom:**
- The top ~12% of the parchment image was soft / blurry.
- The ink text ("regen-civics is a fund ...") ran almost edge-to-edge inside
  the parchment, pushing against the torn borders.

**Fix:**
- Cropped 12% off the top of
  `client/public/images/village-map-scroll.webp` (2816×1536 → 2816×1352) via
  PIL.
- Updated `Home.tsx` aspect ratio from `2816 / 1536` to `2816 / 1352`.
- Bumped cache-buster `?v=3` → `?v=4`.
- Widened inner text padding from `px-[9%] md:px-[12%]` to
  `px-[17%] md:px-[20%]`, narrowing the text box by ~20%.

**Files changed:**
- `client/src/pages/Home.tsx`
- `client/public/images/village-map-scroll.webp` (binary, re-encoded)

---

## Fix 6 — Footer Game column condensed (Medium)

**Status:** FIXED (awaiting push)

**Symptom:** The Game column had 11 links while every other column had 4–5,
throwing the footer grid off balance.

**Fix:** Trimmed to 5 top-level entries: Game Overview, Start Questing,
Crowd Pooling, Tokenomics, Bionomics. Dropped subpages that were already
reachable from those parents (Crowd Pool Campaigns, Crowd Pool Calculator,
Contribution Calculator, Governance, Tools Library, Local Food Economy,
Game Mechanics).

**Files changed:**
- `client/src/components/SiteFooter.tsx`

---

## Fix 7 — "Vouches (0)" needs a "Vouch for this player" button (High, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** On someone else's player profile, the Vouches section header
shows "Vouches (0)" with no way to actually vouch.

**What already exists:**
- `client/src/components/VouchSection.tsx` currently takes
  `playerId`, `vouches`, `isOwnProfile`. Around line 41–47 there's already
  a "Vouch for this player" button placeholder with no submit handler.
- `VouchSection` is rendered from `client/src/pages/PlayerProfile.tsx`
  (import near line 91).

**What to do:**
1. Add a "Vouch for this player" button to the right of the `Vouches (N)`
   header at the top of `VouchSection.tsx`. It should be visible when
   `!isOwnProfile && isAuthenticated`.
2. Button opens a small modal with a required `note` textarea
   (max 280 chars) asking "Why do you vouch for this person?" and a submit
   button.
3. Wire a new tRPC procedure `trpc.profile.vouch`:
   - `vouch({ playerId: string, note: string })` → inserts into a `vouches`
     table (schema: `id, voucherId, playerId, note, createdAt`).
   - Guard: can't vouch for self, can't vouch twice (unique index on
     `(voucherId, playerId)`).
   - On success: invalidate the parent profile's vouches query so the
     count bumps immediately.
4. Schema migration: new file `drizzle/0120_vouches_table.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS vouches (
     id VARCHAR(32) PRIMARY KEY,
     voucherId VARCHAR(64) NOT NULL,
     playerId VARCHAR(64) NOT NULL,
     note TEXT NULL,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY unique_voucher_player (voucherId, playerId),
     INDEX idx_player (playerId)
   );
   ```
5. Update `server/routers/profile.ts` (or wherever vouches are listed) to
   include voucher display name + avatar via a join.

**Files to touch:**
- `client/src/components/VouchSection.tsx`
- `server/routers/profile.ts`
- `drizzle/0120_vouches_table.sql` (new)
- `shared/schema.ts` (if Drizzle ORM schema is source of truth)

---

## Fix 8 — "Focus areas selected" link goes to a page with no focus areas UI (High, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** In the Profile Strength widget, clicking "Focus areas selected"
calls `onItemClick("Focus areas selected")`. In `PlayerProfile.tsx` that
handler scrolls to `#profile-settings-panel` (line 601). But that panel has
no focus areas input anywhere (verified: `questInterests` appears 0 times in
`PlayerProfile.tsx`). The user lands on a page with nothing actionable.

**What to do:**
1. Add a "Focus Areas" section inside the `#profile-settings-panel` profile
   sub-section (`settingsSection === "profile"`, around line 3019).
2. Render it as a multi-select chip picker. Suggested focus area values:
   - `regenerative-agriculture`
   - `water-systems`
   - `local-food-economy`
   - `bioregional-governance`
   - `community-health`
   - `education`
   - `storytelling-media`
   - `technology-tools`
   - `finance-capital`
   - `legal-structures`
   - `land-access`
   - `indigenous-stewardship`
3. Save as a JSON-stringified array to the existing `questInterests` column
   on the players table.
4. When user clicks "Focus areas selected" in the Profile Strength widget,
   auto-scroll to the new Focus Areas anchor (add `id="focus-areas"` on the
   section, then update `PlayerProfile.tsx` onItemClick to jump to
   `#focus-areas` specifically for that label).

**Files to touch:**
- `client/src/pages/PlayerProfile.tsx`
- possibly a small new `client/src/components/FocusAreaPicker.tsx`

---

## Fix 9 — Spring 2026 Intention: Set button needs save + history (Medium, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** On player profile, the Spring 2026 Intention widget's "Set"
button appears to do nothing (no visible change). Users expect:
(a) a save-confirmation, (b) the current intention to display prominently
above the input, (c) a history of past season intentions below.

**What exists now:**
- `client/src/components/SeasonalIntention.tsx` uses `localStorage` only
  (key `"regen-season-intentions"`). No server persistence. No tRPC calls.

**What to do:**
1. Add a `seasonIntentions` table:
   ```sql
   CREATE TABLE IF NOT EXISTS seasonIntentions (
     id VARCHAR(32) PRIMARY KEY,
     playerId VARCHAR(64) NOT NULL,
     seasonSlug VARCHAR(64) NOT NULL,
     intention TEXT NOT NULL,
     createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     UNIQUE KEY unique_player_season (playerId, seasonSlug),
     INDEX idx_player (playerId)
   );
   ```
   File: `drizzle/0121_season_intentions.sql`.
2. tRPC procedures:
   - `trpc.profile.getIntentions(playerId)` — returns all past intentions
     sorted by season date desc, plus `currentSeason` from `getCurrentSeason()`.
   - `trpc.profile.setIntention({ seasonSlug, intention })` — upsert.
3. Refactor `SeasonalIntention.tsx`:
   - Layout: **current season intention** at top in a highlighted card (big
     text), **Set / Update intention** form below, **Past intentions** list
     at the bottom (season name + intention + date, most recent first).
   - Replace localStorage with the tRPC calls. Seed from localStorage on
     first load if the server list is empty (one-time migration).
   - After Set, invalidate the query and show an inline "Saved ✓" flash for
     2 seconds so the action is visible.

**Files to touch:**
- `client/src/components/SeasonalIntention.tsx`
- `server/routers/profile.ts`
- `drizzle/0121_season_intentions.sql` (new)
- `shared/schema.ts`

---

## Fix 10 — "Explore Epic Quests" wrongly shows "All Rites Complete" (High, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** A player who has NOT completed the Rites still sees "All Rites
Complete" on the Explore Epic Quests callout.

**Likely root cause** (per recon):
`client/src/components/EpicQuestSection.tsx` around line 124–125 uses
`useQuestUnlocks()` which can return null in a try/catch fallback. When null,
`isLocked` defaults to `false`, so the "Unlocked" / "Complete" branch renders.

**What to do:**
1. Change the default behavior: when `useQuestUnlocks()` returns null / is
   loading, render the **locked** state, not the unlocked state. Locked is
   the safe default.
2. Specifically: `isLocked = unlocks?.isEpicUnlocked === true ? false : true;`
   (inverted so the fallback is locked).
3. Separately, verify the server-side computation in
   `server/routers/questUnlocks.ts` (or equivalent) — does
   `isEpicUnlocked` actually gate on all 7 Rites being in the player's
   `questsCompleted` array? Write a quick test with a fixture player that
   has zero completed rites and confirm `isEpicUnlocked === false`.
4. Make sure the "All Rites complete" text is only rendered when
   `unlocks.ritesCompleted === TOTAL_RITES` (hardcode the count if needed),
   not when `isEpicUnlocked` is true (those are related but different
   states).

**Files to touch:**
- `client/src/components/EpicQuestSection.tsx`
- `server/routers/questUnlocks.ts` (verification only)

---

## Fix 11 — Replace river/bridge/scales image with official ReGen Civics graphic (Medium, BLOCKED on Rye uploading image)

**Status:** BLOCKED — waiting on Rye to upload the official graphic.

**Symptom:** The current hero image (phoenix bridge / bridging-worlds
illustration) on the Bionomics page is being replaced with an official
ReGen Civics graphic.

**Current location:**
`client/src/pages/Bionomics.tsx` line 668:
```tsx
src="/blog-hero-bridging-worlds.webp"
```

**What to do once Rye provides image:**
1. Rye uploads new graphic to `client/public/images/bionomics-hero.webp`
   (or sends the file, Claude Code names it).
2. Update `Bionomics.tsx:668` src path + bump cache-buster.
3. Update alt text to match the new graphic.

---

## Fix 12 — Mobile music playlist needs the full desktop experience (High, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** On mobile, the music playlist panel shows only a bare song list
with play buttons. Desktop has album art, progress bar, skip controls, and
volume, inside the CommandPanel's Sound tab.

**What exists now:**
- `client/src/components/mobile/MobilePlaylistPanel.tsx` (~52 lines, minimal).
- `client/src/components/CommandPanel.tsx` (~348 lines, full featured
  Sound/Search/Recent/Assist/Tools/Map tabs; player controls around line
  237–266).

**What to do:**
1. Pull the Sound-tab JSX out of `CommandPanel.tsx` into a new
   `client/src/components/SoundPlayer.tsx` component that takes the shared
   `usePlaylist` / `useAudio` hook state and renders: current track art,
   title + artist, progress bar, skip back / play-pause / skip forward,
   volume slider, queue list with tap-to-jump.
2. Use `SoundPlayer` in both places: `CommandPanel.tsx` Sound tab AND
   `MobilePlaylistPanel.tsx` as the body.
3. Mobile layout tweaks: album art `w-40 h-40` (instead of desktop
   `w-56 h-56`), controls as a horizontal row with larger hit targets
   (`min-h-[48px]` per Apple HIG), scrollable queue below.
4. Keep `MobilePlaylistPanel` as a thin wrapper that sets the mobile
   variant (`<SoundPlayer variant="mobile" />`).

**Files to touch:**
- `client/src/components/SoundPlayer.tsx` (new)
- `client/src/components/CommandPanel.tsx`
- `client/src/components/mobile/MobilePlaylistPanel.tsx`

---

## Fix 13 — Features & Bug Reports: add "Cowork onboarding" download button (Low, for Claude Code)

**Status:** CODED for Claude Code

**Symptom:** No download link for the Claude Cowork onboarding doc on the
Features & Bug Reports page.

**What to do:**
1. Author a short doc: `client/public/docs/regencivics-cowork-onboarding.md`
   (or `.pdf`) covering: why we use Cowork, how a new contributor installs
   the plugins + skills, what the folder layout looks like
   (`/regen-civics-clean`, `.claude/skills/`, `CLAUDE.md`), and the
   fixes-document workflow. Rye can provide the content or Claude Code can
   draft a first cut from `CLAUDE.md` + the ln- pipeline skills.
2. Add a small download button to the Hero section of
   `client/src/pages/FeatureSuggestions.tsx` (around line 57–77), styled
   secondary (next to the "Suggest or Report" primary CTA). Label:
   "Download Cowork onboarding guide". Use a plain `<a href=... download>`
   so the browser triggers a save.

**Files to touch:**
- `client/src/pages/FeatureSuggestions.tsx`
- `client/public/docs/regencivics-cowork-onboarding.md` (new)

---

## Fix 14 — Forum: reply-anywhere focus (same theme as Fix 1) (Low, verify only)

**Status:** VERIFIED covered by Fix 1 — please smoke test.

**Context:** Screenshots 2 and 3 both describe "click anywhere to focus the
reply box." Fix 1's `onClick` wrapper + `cursor-text` + `min-h-[220px]`
change on `RichEditor` addresses both. Please open `/community/[post]` and
confirm: clicking the toolbar gap, the padding, and the empty area below
the last line all land the cursor in the editor.

---

## Fix 15 — (covered above as Fix 11)

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 11 | Upload official ReGen Civics river/bridge/scales graphic | You have the file | Save to `client/public/images/bionomics-hero.webp` and let Claude Code know |
| All | Pull changes after Claude Code pushes | Cowork agent can't push on your behalf | `git pull --rebase` on Windows |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Forum editor toolbar + click-to-focus + serializer | FIXED |
| 2 | Remove High contrast button | FIXED |
| 3 | Continue to Hypha opens new tab | FIXED |
| 4 | Comets spawn only from sky | FIXED |
| 5 | Welcome map crop + narrow text box | FIXED |
| 6 | Footer Game column condensed to 5 | FIXED |
| 7 | Vouch for this player button + tRPC + migration | CODED (specced, Claude Code to implement + run `scripts/run-migration.ts drizzle/0120_vouches_table.sql`) |
| 8 | Focus Areas multi-select in Profile settings | CODED (specced) |
| 9 | Season Intention save + history (server-backed) | CODED (specced, Claude Code to implement + run `scripts/run-migration.ts drizzle/0121_season_intentions.sql`) |
| 10 | Epic Quests locked-by-default + verify unlock logic | CODED (specced) |
| 12 | Mobile playlist parity with desktop via SoundPlayer | CODED (specced) |
| 13 | Cowork onboarding download button + doc | CODED (specced) |
| 14 | Smoke test reply-anywhere focus | VERIFIED by Fix 1 |
| All | `git push origin main` after Claude Code completes work | pending |

### WAITING ON YOU before Claude Code can proceed

- **Fix 11**: blocked on the official ReGen 