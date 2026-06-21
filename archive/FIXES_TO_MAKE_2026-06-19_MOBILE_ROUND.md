# Fixes to Make — 2026-06-19 (Mobile screenshot round)

Source: a batch of ~24 mobile screenshots from Rye walking the live site on a phone.

Rye's instances confirmed these design decisions for this round:
- Homepage hero: remove both circled buttons + the subtitle entirely. (Done.)
- Readability: build ONE reusable dark-green translucent scrim and apply it to every text-over-image block site-wide.
- The parchment map section: replace the white background with two maps side by side, the second mirrored, as one seamless band.

Writing rules apply to every string changed here: no em-dashes, no contrast-framing, no AI words.

---

## Already done in this session (verify, do not redo)

These five were edited directly in the working tree. Confirm they are intact, then they ship with the rest.

| # | Fix | Files | Status |
|---|-----|-------|--------|
| A | Hook banner reworded to "The more we Play the Game the more fun and real this new world becomes." | `client/src/components/GameHookBanner.tsx` (home variant), `client/src/pages/Economy.tsx` (~line 533) | CODED |
| B | Homepage hero: removed "Start your journey" + "Play the game" buttons + the "Investor, land project, ally, or player" subtitle (the whole primary-CTA `<section>`) | `client/src/pages/Home.tsx` (was ~lines 312-339) | CODED |
| C | Epic filter chip emoji changed from crossed swords to mountain (🏔️) | `client/src/pages/Quest.tsx` (~line 1409) | CODED |
| D | Moved the "Governance: How we coordinate" card from the Water panel to the Air panel (re-themed blue→slate) | `client/src/pages/Community.tsx` | CODED |
| E | Removed the "Send a Letter of Intent" nudge from the Land project apply CTA (LOI is for investors, not land projects) | `client/src/pages/Land.tsx` (~line 1115) | CODED |

---

## Fix 1 — Site-wide readability scrim for text over images (High)

**Status:** CODED (needs implementation)

**Symptom:** Light text sits directly on busy background images and is hard to read. Flagged on the token page ("NOTE: these tokens are unique from the Fund tokens"), the Land page ("What You Receive", "From Pasture to Paradise", "Regenerative transformation in progress", "Featured Land Projects"), and others. Rye asked for a proper readability audit, not one-off patches.

**Root cause:** Text blocks are layered over `object-cover` hero/section images with no consistent backing panel. Some sections have a translucent panel, many do not.

**Fix:**
1. Build one reusable component, e.g. `client/src/components/ReadableScrim.tsx` (or a Tailwind utility class in the global stylesheet, e.g. `.readable-scrim`). It wraps text and gives it a dark-green translucent backing sized to the content: background around `rgba(13,40,24,0.72)` (matches `#0d2818` in the palette), `backdrop-blur-sm`, rounded corners, and padding just large enough to cover the text. It must not stretch full-bleed; it hugs the text.
2. Audit every page that renders text in front of a background image and wrap those text blocks. Start with the confirmed offenders: `Tokenomics.tsx`, `Land.tsx`, `HealTheLand.tsx`, `Home.tsx`, `Apply.tsx`, `Seasons.tsx`. Grep for `object-cover` and `absolute inset-0` image patterns to find text-over-image sections, and for any heading/paragraph with `text-white` that is not already inside a panel.
3. Use the same scrim everywhere for consistency. Light text stays light; the scrim carries the contrast.

**Files:** new `client/src/components/ReadableScrim.tsx` (+ optional css), then `Tokenomics.tsx`, `Land.tsx`, `HealTheLand.tsx`, `Home.tsx`, `Apply.tsx`, `Seasons.tsx`, and any other page where the grep turns up unpanelled light text over an image.

---

## Fix 2 — Dark text on the light contribution forms (Medium)

**Status:** CODED (needs implementation)

**Symptom:** On the historical contributions calculator, input text and some labels are light/low-contrast on a white form, hard to read while typing.

**Root cause:** Inputs inherit a light text color on a light (white) form surface.

**Fix:** In `client/src/components/ContributionCalculator.tsx`, set input/select/textarea text to a dark color (`text-[#1a472a]`) and ensure placeholders are a readable mid-tone. Apply to every field on the light forms.

**Files:** `client/src/components/ContributionCalculator.tsx`

---

## Fix 3 — Role portal card images crop off the heads (High)

**Status:** CODED (needs implementation)

**Symptom:** On the roles page, several character card images cut off the top of the head (The Weaver, The Tinkerer, The Architect, and others).

**Root cause:** The card image uses `object-cover` with a fixed height and default (center) object position, so tall portraits get cropped at the top.

**Fix:** In `client/src/components/RolePortalCard.tsx`, change the image to `object-top` (or `object-[50%_20%]`) and/or increase the image container height so the full head shows. Apply the fix to ALL role cards, not just the three named. Check the worst offenders (Weaver, Tinkerer, Architect) at 360-430px wide.

**Files:** `client/src/components/RolePortalCard.tsx`

---

## Fix 4 — Epic Quests section renders all cards in one column (Medium)

**Status:** CODED (needs implementation)

**Symptom:** On the Epic Quests section, every card stacks in the second column, leaving the first column empty.

**Root cause:** Likely a CSS columns / masonry container where items are not distributed, or a grid with wrong column placement.

**Fix:** In `client/src/components/EpicQuestSection.tsx`, fix the layout so cards split evenly across columns 1 and 2 (use a 2-col CSS grid with normal flow, or balance the masonry). Verify on mobile widths.

**Files:** `client/src/components/EpicQuestSection.tsx`

---

## Fix 5 — "Start Questing" button broken (High)

**Status:** CODED (needs implementation)

**Symptom:** On Easy Mode → "QUEST! Complete Games and Tasks", the "Start Questing" button does nothing. Also appears in the Welcome Aboard card.

**Root cause:** Unknown until investigated. Likely a missing/incorrect href or a click handler that no longer resolves (route changed).

**Fix:** Trace the "Start Questing" control in `client/src/pages/Play.tsx`, `client/src/components/WelcomeAboardQuests.tsx`, and `client/src/components/QuestStartPopup.tsx`. Confirm it routes to the quest flow (`/quest` or the intended start route) and fix the broken link/handler. Test the tap on mobile.

**Files:** `client/src/pages/Play.tsx`, `client/src/components/WelcomeAboardQuests.tsx`, `client/src/components/QuestStartPopup.tsx`

---

## Fix 6 — "Claim Contributions" should open the historical contributions calculator (High)

**Status:** CODED (needs implementation)

**Symptom:** On Play → "CLAIM! Your Contributions", the "Claim Contributions" button does not open the calculator that already exists.

**Fix:** In `client/src/pages/Play.tsx`, point the "Claim Contributions" button at the existing historical contributions calculator route (the one that renders `ContributionCalculator.tsx`). Find the route in `App.tsx` and wire the button to it.

**Files:** `client/src/pages/Play.tsx` (link), confirm route in `client/src/App.tsx`

---

## Fix 7 — "Find Your Community" should go to the map (Medium)

**Status:** CODED (needs implementation)

**Symptom:** On Play → "JOIN! An Existing Organization or Village", the "Find Your Community" button should open the map.

**Fix:** In `client/src/pages/Play.tsx`, point "Find Your Community" at the map route (confirm the exact path in `App.tsx`, e.g. `/map`).

**Files:** `client/src/pages/Play.tsx` (link), confirm route in `client/src/App.tsx`

---

## Fix 8 — Share-song button on mobile (Medium)

**Status:** CODED (needs implementation)

**Symptom:** The Hymns of the ReGeneration player has no way to share a song on mobile.

**Fix:** Add a share button to the player (`client/src/pages/HymnPlayer.tsx` and/or `client/src/components/SoundPlayer.tsx`). Use the Web Share API (`navigator.share`) with a copy-link fallback, matching the existing share pattern used elsewhere on the site (ShareButton / SharePrompt). Make sure it is visible and tappable on mobile.

**Files:** `client/src/pages/HymnPlayer.tsx`, `client/src/components/SoundPlayer.tsx`, reuse `client/src/components/ShareButton.tsx` if it fits

---

## Fix 9 — Quest page allows horizontal scroll / zoom on arrival (Medium)

**Status:** CODED (needs implementation)

**Symptom:** Landing on the quest page, the page is horizontally scrollable and zoomed out until the user pinch-zooms to snap it back. It should arrive at the correct width automatically.

**Root cause:** Some element overflows the viewport width (a wide grid, a fixed-width image, or a section wider than 100vw), so the browser zooms out to fit.

**Fix:** In `client/src/pages/Quest.tsx`, find the overflowing element (check the season carousels, Epic section, and any `min-w`/fixed widths). Add `overflow-x-clip` / `max-w-full` to the offending container and ensure no child exceeds `100vw`. Confirm the page loads at 1x with no horizontal scroll at 360-430px.

**Files:** `client/src/pages/Quest.tsx` (and any child component that overflows)

---

## Fix 10 — Expanding a segment should scroll to the top of that section (Medium)

**Status:** CODED (needs implementation)

**Symptom:** When the user expands an accordion segment (Apply page "What We're Looking For", and any other collapsible), the viewport does not move, so the opened content can be below the fold.

**Fix:** On expand, scroll the opened section header to the top of the viewport (`scrollIntoView({ behavior: 'smooth', block: 'start' })`). Apply to the shared Collapsible usage so it works everywhere, not just Apply. Start in `client/src/pages/Apply.tsx`; if a shared accordion wrapper exists, do it there.

**Files:** `client/src/pages/Apply.tsx`, plus any shared Collapsible wrapper used across pages

---

## Fix 11 — Command bar suggests the page you are already on (Low)

**Status:** CODED (needs implementation)

**Symptom:** On the new-post page, the command bar shows the suggestion to go to the same page two extra times (duplicate "New post" entries, bottom right).

**Root cause:** Suggestion list is not deduplicated and does not exclude the current route.

**Fix:** In `client/src/components/CommandPanel.tsx`, dedupe suggestions and filter out the current path so the bar never offers to navigate to the page you are already viewing.

**Files:** `client/src/components/CommandPanel.tsx`

---

## Fix 12 — Community should reopen at the forum-section picker on repeat visits (Medium)

**Status:** CODED (needs implementation)

**Symptom:** The first time the user opens Community they get the intro; on the second and later visits they want to land directly at the forum-section chooser (the Earth / Water / Fire / Air grid).

**Fix:** In `client/src/pages/Community.tsx`, persist a "has visited community" flag (localStorage). On repeat visits, deep-link or auto-scroll to the section-picker grid so the user lands right at the choice. Keep the full intro for first-time visitors.

**Files:** `client/src/pages/Community.tsx`

---

## Fix 13 — Per-subsection guidance on the new-post form (Medium)

**Status:** CODED (needs implementation)

**Symptom:** The new-post form is generic across all topics. Rye wants each subsection to carry its own guidance so posts are uniform.

**Fix:** In `client/src/pages/CommunityNewPost.tsx`, drive the title/description placeholders (and a short helper line) from the selected Topic. Example for Alliance Partners: title placeholder = the alliance organization name; description placeholder/helper = what it offers the movement (tools, resources, services, products, assets) and what the movement can offer back (roles to fill, resources needed). Encourage specific offers and asks. Add tailored guidance for each topic, not just Alliance Partners.

**Files:** `client/src/pages/CommunityNewPost.tsx`

---

## Fix 14 — Welcome Aboard card + exit button redesign (Medium)

**Status:** CODED (needs implementation)

**Symptom:** The "Welcome Aboard / Your Quests Are Ready" card and its top-left X exit button look unpolished.

**Fix:** In `client/src/components/WelcomeAboardQuests.tsx`, uplevel the card (spacing, hierarchy, the quest list styling, the Start Questing / Later buttons) and redesign the top-left close button into a clear, tappable control (min 44px target, visible affordance). Keep it on-brand (enchanted-forest, solarpunk). Pair with Fix 5 (Start Questing must work).

**Files:** `client/src/components/WelcomeAboardQuests.tsx`

---

## Fix 15 — Floating action button: swap the controller glyph for a map icon (Low)

**Status:** CODED (needs implementation) — confirm scope with Rye

**Symptom:** Rye wants the green floating button's icon (currently the seed-of-life / atom glyph he reads as a "controller") replaced with a map icon.

**Note:** This FAB is the global command menu trigger, so the icon change is site-wide. Confirm Rye wants it global (not just on the roles page).

**Fix:** In `client/src/components/mobile/WizardRadialMenu.tsx`, replace the trigger glyph with a lucide `Map` (or `MapPinned`) icon. Keep the green circular button and its behavior.

**Files:** `client/src/components/mobile/WizardRadialMenu.tsx`

---

## Fix 16 — Center and redesign the "You Bring / We Bring" lists (Low)

**Status:** CODED (needs implementation)

**Symptom:** On the Heal the Land page, the "You Bring" and "We Bring" bullet lists are ragged and need centering and better design.

**Fix:** In `client/src/pages/HealTheLand.tsx`, center the lists and improve the design (consistent bullet treatment, aligned items, readable spacing). Wrap in the readability scrim from Fix 1 if they sit over an image.

**Files:** `client/src/pages/HealTheLand.tsx`

---

## Fix 17 — Parchment map section: replace white background with two mirrored maps (Medium)

**Status:** CODED (needs implementation)

**Symptom:** The homepage intro section sits on a white card Rye dislikes ("that awful white background"). He wants the map motif instead.

**Fix:** In `client/src/pages/Home.tsx`, replace the white intro card background with a seamless parchment band: the map image plus a horizontally mirrored copy side by side, so it reads as one continuous wide map with no white. Keep the intro text legible over it (use the Fix 1 scrim). Match the existing parchment/map art already used lower on the page.

**Files:** `client/src/pages/Home.tsx` (+ reuse the existing map asset, add a `scale-x-[-1]` mirrored copy)

---

## Verification gate (run before marking anything VERIFIED)

```bash
python3 scripts/audit-truncation.py
pnpm typecheck
```

Per ship gate: for any new className or keyframe added (readability scrim, role-card classes), grep it exists in the CSS. No "VERIFIED" without evidence (file:line, grep result, or screenshot).

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Push + deploy all of this | Claude Code can't hold the git index / Railway deploy | `git add -A && git commit && git push`, then confirm Railway deploy |
| H2 | Confirm Fix 15 scope | The FAB is global; you may want the map icon only in some contexts | Reply in chat: global swap, or scoped |
| H3 | Spot-check on your phone after deploy | Final visual confirm at real mobile widths | Walk the same screens you shot |

### CLAUDE CODE — can be done without Rye

| # | Task | Status |
|---|------|--------|
| A-E | The five simple edits from this session | CODED |
| 1 | Readability scrim component + apply site-wide | CODED |
| 2 | Dark text on light contribution forms | CODED |
| 3 | Role card head-crop fix (all cards) | CODED |
| 4 | Epic Quests column distribution | CODED |
| 5 | Start Questing button repair | CODED |
| 6 | Claim Contributions → calculator wiring | CODED |
| 7 | Find Your Community → map wiring | CODED |
| 8 | Share-song button on mobile | CODED |
| 9 | Quest page horizontal-overflow fix | CODED |
| 10 | Accordion expand scroll-to-top | CODED |
| 11 | Command bar dedupe / exclude current page | CODED |
| 12 | Community reopen at forum-section picker | CODED |
| 13 | Per-subsection new-post form guidance | CODED |
| 14 | Welcome Aboard card + exit button redesign | CODED |
| 15 | FAB controller→map icon (pending H2 scope) | CODED |
| 16 | You Bring / We Bring list centering | CODED |
| 17 | Parchment map: two mirrored maps, no white bg | CODED |

### WAITING ON YOU before Claude Code can proceed

- Fix 15 final scope (H2) — Claude Code can implement the global swap by default and you can narrow it later.
- Nothing else is blocked. Everything ships on your push (H1).
