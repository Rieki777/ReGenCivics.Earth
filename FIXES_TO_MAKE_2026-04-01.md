# Fixes to Make - 2026-04-01

This document continues from `FIXES_TO_MAKE_2026-03-31.md`.

---

## Fix 1 - Four Paths background image not updated (Medium)

**Status:** CLAUDE CODE

**Symptom:** The "Four Paths to Play" section on the homepage still shows the old background image. A new background was created in a previous session but never swapped in.

**Root cause:** `Home.tsx` lines 183-184 still reference `home-desktop.webp` and `home-mobile.webp`. The MEGABATCH prompt (line 172) references `home-desktop-new.webp` and `home-mobile-new.webp`, but those files don't exist in `client/public/images/backgrounds/`. The new images were likely generated but never saved to the repo.

**Fix:** Check if new background images exist anywhere (uploads, generated files). If they exist, copy them to `client/public/images/backgrounds/` and update `Home.tsx` to reference them. If they don't exist, flag for Rye to provide the new images.

**Files:** `client/src/pages/Home.tsx` (lines 183-184, 191-192)

---

## Fix 2 - On-Chain Tracking links not clickable (Medium)

**Status:** CLAUDE CODE

**Symptom:** The "On-Chain Tracking" section on the player profile shows Hypha DAO and Base Blockchain as info boxes but they don't link anywhere. Rye wants the Hypha button to go to app.hypha.earth and the Base Blockchain button to link to the Base blockchain explorer for the user's account.

**Root cause:** `PlayerProfile.tsx` lines 1703-1734 renders text-only info boxes with no href attributes.

**Fix:**
- Hypha DAO: Link to `https://app.hypha.earth` (or `https://app.hypha.earth/profile/{hyphaProfileUrl}` if the player has linked their Hypha account)
- Base Blockchain: Link to `https://basescan.org/address/{walletAddress}` if the player has a linked wallet address. If no wallet linked, link to `https://basescan.org` with a note to link their wallet first.
- Make both boxes clickable with external link icon and `target="_blank"`

**Files:** `client/src/pages/PlayerProfile.tsx` (lines 1703-1734)

---

## Fix 3 - Notification toggle visual not updating (High)

**Status:** CLAUDE CODE

**Symptom:** Clicking "Session Recording Updates" toggle fires the mutation (popup shows "Recording updates enabled") but the toggle switch visual doesn't move. The toggle appears stuck in the off position even though the backend state changed.

**Root cause:** `UserNotificationPreferences.tsx` lines 107-145. The `RecordingEmailToggle` component uses `mutation.mutate({ enabled: !enabled })` on click (line 124). The visual toggle state is likely reading from stale query data or not invalidating the query cache after mutation succeeds. The mutation fires correctly (toast appears) but the local UI state doesn't re-render.

**Fix:** After mutation succeeds, either:
- A) Optimistically update local state on click, then revert on error
- B) Invalidate the query cache in the mutation's `onSuccess` callback so the toggle re-fetches its state
- Check if the `enabled` variable (line 124) comes from a query that isn't being invalidated

**Files:** `client/src/components/UserNotificationPreferences.tsx` (lines 107-145)

---

## Fix 4 - Quest 8 Medicine Journey shows "A morning walk" (Low)

**Status:** CLAUDE CODE

**Symptom:** Quest 8 (Medicine Journey) displays "A morning walk" in green text below the subtitle. Rye wants this changed to "An inner exploration" (lowercase).

**Root cause:** `QuestFilter.tsx` line 254 has `QUEST_METADATA["quest-8"]` with `experience: "A morning walk"`. This experience field is displayed on the quest card.

**Fix:** Change the `experience` value from `"A morning walk"` to `"An inner exploration"` in the QUEST_METADATA object.

**Files:** `client/src/components/QuestFilter.tsx` (line 254, the `experience` field for `"quest-8"`)

---

## Fix 5 - My Submissions tab shows admin data to regular users (High)

**Status:** CLAUDE CODE

**Symptom:** The "My Submissions" tab on the player profile shows Land Project Applications (13 applications) and Investor Inquiry sections. Rye says these should be admin-only. Regular players seeing application management data is confusing and exposes admin-level information.

**Root cause:** `PlayerProfile.tsx` lines 2399-2483, `SubmissionsTab()` component. The Land Project Applications section (lines 2408-2429) and Investor Inquiry section (lines 2467-2479) fetch data via `trpc.applications.myApplications` and `trpc.investorInquiries.mine` with no admin role check gating the UI.

**Fix:** Two options:
- A) **Hide the entire "My Submissions" tab for non-admin users** if the tab only contains admin-relevant data
- B) **Gate the Land Project Applications and Investor Inquiry sections** behind an admin check, keeping the tab visible for sections like Saved Contribution Profiles that are player-relevant

Recommendation: Option B. Keep the tab, gate the admin sections. Check how `isAdmin` is determined elsewhere in PlayerProfile.tsx and apply the same pattern.

**Files:** `client/src/pages/PlayerProfile.tsx` (lines 2399-2483, SubmissionsTab component)

---

## Fix 6 - OG image and description need improvement (Medium)

**Status:** CLAUDE CODE

**Symptom:** When sharing regencivics.earth on social media, the preview image is a close-up of a golden figure holding a flame (og-default.jpg). Rye doesn't like it. The description reads "ReGen Civics is a fund for regenerative land projects, who also runs quests and games for real-world regeneration." which is grammatically off ("who" should be "that") and doesn't capture the vision well.

**Root cause:** `client/index.html` lines 57-77 and `client/src/components/SEO.tsx`. Static OG tags set in HTML head.

**Fix:**
- **Description:** Update to something that captures the fund + game + movement better. Suggested: "A fund and a game for regenerative land projects. Do quests, earn tokens, fund real-world regeneration." (Rye to approve final copy)
- **Title:** Consider updating from "Fund and Game for Regenerative Land Projects" to "Infinite Game for the Regenerative Renaissance" (matches the screenshot's current title style)
- **Image:** Generate or select a new OG image that represents the community and movement better (the four paths, the map, or a broader community visual). Save as `og-default.jpg` (1200x630). Rye to provide or approve the image.

**Files:** `client/index.html` (lines 57-77), `client/src/components/SEO.tsx`, `client/public/og-default.jpg`

---

## Fix 7 - Rename contribution tier "Steward" to "Cultivator" (Medium)

**Status:** CLAUDE CODE

**Symptom:** The contribution score system and the citizenship tier system both use the name "Steward" for different things. This will cause confusion as citizenship tiers roll out.

**Root cause:** `getTierFromPercentile()` in `server/routes/game.ts` returns "Steward" for the 70th percentile. The citizenship tier "Steward" means something different (sustained contributor with specific quest/gratitude/endorsement requirements).

**Fix:** In `getTierFromPercentile()`, rename the 70th percentile return value from `"Steward"` to `"Cultivator"`. Search for any other references to this tier name in the codebase and update them (TierBadge component, any UI that displays contribution tier names, seed data).

**Files:** `server/routes/game.ts` (getTierFromPercentile function), any components displaying contribution tier names

---

---

## Fix 8 - Mobile text readability: Hypha Space Treasury modal (High)

**Status:** CLAUDE CODE

**Symptom:** The Hypha Space Treasury popup/modal on mobile shows body text
that is hard to read against the background image. The text "Explore our
complete treasury dashboard on Base..." lacks enough contrast.

**Root cause:** The modal card likely has insufficient background opacity or
is missing a solid/semi-opaque backdrop behind the text content area.

**Fix:** Increase the background color opacity on the modal content container
to at least `rgba(0, 0, 0, 0.75)` or `rgba(10, 30, 15, 0.85)`. Alternatively,
add a solid dark-green panel behind the text. Ensure text color is white or
near-white with `font-weight: 500` minimum. Test on mobile viewport.

**Files:** Search for "Hypha Space Treasury" in the codebase. Likely in a
modal or card component on the Fund or Profile page.

---

## Fix 9 - Mobile text readability: Anyone / ReGen Players page (High)

**Status:** CLAUDE CODE

**Symptom:** The "Anyone / ReGen Players" path page has text overlaid on the
background image that is hard to read on mobile. The headline "Anyone / ReGen
Players" and body copy are not legible enough.

**Root cause:** The text overlay section has insufficient contrast against the
colorful background. Text shadow may be missing or too subtle. The dark
overlay behind the text is not dark enough for mobile.

**Fix:**
- Add or increase `text-shadow` on the headline: `0 2px 12px rgba(0,0,0,0.8)`
- Increase the dark overlay opacity on the hero section from whatever it
  currently is to at least `0.55`
- Ensure the body copy paragraph has a semi-transparent dark pill/backdrop
  or increased overlay in that region
- Check and fix on all mobile breakpoints (375px, 390px, 430px)

**Files:** The Players/Anyone path page component. Search for "Anyone" or
"ReGen Players" in `client/src/pages/`.

---

## Fix 10 - Mobile text readability: Welcome Back four-path cards (Medium)

**Status:** CLAUDE CODE

**Symptom:** On the logged-in "Welcome Back to ReGen Civics" mobile view,
the four path card labels ("FUND THE RENAISSANCE", "EVOLVE YOUR PROJECT",
"JOIN THE ALLIANCE", "PLAY THE GAME") are hard to read against the card
background images.

**Root cause:** Card label text on the image cards likely needs a stronger
gradient overlay at the bottom, or the text needs a shadow. On mobile,
the cards are smaller and the text competes more with the imagery.

**Fix:**
- Add `text-shadow: 0 1px 8px rgba(0,0,0,0.9)` to all card label text
- Strengthen the bottom gradient overlay on each card image from current
  value to at least `linear-gradient(to top, rgba(0,0,0,0.75), transparent)`
- Verify the subtitle text under each label (e.g. "Go →") is also legible

**Files:** The logged-in home/dashboard component. Search for "Welcome Back"
or the four path card component used on the authenticated home view.

---

## Fix 11 - Error page buttons not clickable (High)

**Status:** CLAUDE CODE

**Symptom:** The error/404 page showing "When we think things are broken,
ponder the TAO..." has "Return Home" and "Visit Community" buttons that
Rye cannot click. The buttons appear rendered but do not respond to taps
on mobile.

**Root cause:** Likely one of:
- The buttons are rendered but a parent element is intercepting pointer
  events (`pointer-events: none` on a wrapper, or an invisible overlay
  sitting on top)
- The buttons use `<button onClick>` with a router navigation that is
  broken in the error boundary context (the router context may not be
  available inside the error boundary)
- `z-index` issue where an invisible element sits above the buttons

**Fix:**
- Check the error page/boundary component for any overlay elements with
  higher z-index than the buttons
- If using React Router's `useNavigate` inside an ErrorBoundary, replace
  with plain `<a href="/">` and `<a href="/community">` anchor tags — router
  hooks can fail inside error boundaries
- Add `position: relative; z-index: 10` to the button container
- Test on mobile (touch events) and desktop (click events)

**Files:** Search for "ponder the TAO" or "Return Home" or the ErrorBoundary
/ 404 component in `client/src/`.

---

## Fix 12 - "If enough of us play" banner: gold glow background (Medium)

**Status:** CLAUDE CODE

**Symptom:** The "If enough of us play the Game, it's real." banner on the
homepage is a plain green section. Rye wants it to have a glowing gold
background to make it feel more special and significant.

**Root cause:** Cosmetic — the section currently uses a flat background color.

**Fix:** Replace the background with a warm gold glow treatment:
```css
background: linear-gradient(135deg, #8B6914 0%, #C9960C 35%, #F0B429 55%, #C9960C 75%, #8B6914 100%);
box-shadow: inset 0 0 60px rgba(240, 180, 41, 0.4), 0 0 40px rgba(240, 180, 41, 0.2);
```
Or as a Tailwind-compatible inline style if the project doesn't use
arbitrary CSS. The text color should shift to deep brown/black
(`#2D1B00` or `#1A0F00`) for contrast against the gold, or stay white
with a strong text shadow if the gold is dark enough.

The arrow/link icon after "A regenerative economy built by the people who
use it." should also pick up the gold treatment — either white on gold, or
a deep warm tone.

Test at multiple viewport widths. The glow should feel warm and alive, not
gaudy. If it reads as too bright, reduce the lighter gold stop:
`#F0B429` → `#D4A017`.

**Files:** Search for "If enough of us play" or "if-enough" in
`client/src/pages/Home.tsx` or the component that renders this banner.

---

## Priority Order (updated)

1. Fix 5 - My Submissions admin data (High, privacy/UX)
2. Fix 3 - Notification toggle (High, broken UI)
3. Fix 11 - Error page buttons not clickable (High, broken UI)
4. Fix 8 - Hypha Treasury mobile readability (High, legibility)
5. Fix 9 - ReGen Players page mobile readability (High, legibility)
6. Fix 2 - On-Chain Tracking links (Medium, missing functionality)
7. Fix 7 - Cultivator rename (Medium, prep for citizenship tiers)
8. Fix 10 - Welcome Back cards mobile readability (Medium, legibility)
9. Fix 12 - Gold glow banner (Medium, visual polish)
10. Fix 6 - OG image/description (Medium, social sharing)
11. Fix 1 - Background image (Medium, blocked on finding/generating image)
12. Fix 4 - Quest 8 experience text (Low, quick text change)

---

## Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Provide or approve new homepage background images | Creative decision + may need to regenerate | Check if images exist from prior session, or generate new ones |
| 6 | Approve new OG description copy | Voice/brand decision | Review Claude Code's suggested copy |
| 6 | Provide or approve new OG image | Creative decision | Either generate, screenshot, or select from existing assets |
| ALL | `git add -A && git commit && git push` | Git push from your machine | After Claude Code finishes all fixes |

### CLAUDE CODE - already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 2 | Add clickable links to On-Chain Tracking (Hypha + Base) | READY TO CODE |
| 3 | Fix notification toggle visual state after mutation | READY TO CODE |
| 4 | Change Quest 8 experience from "A morning walk" to "An inner exploration" | READY TO CODE |
| 5 | Gate Land Project Applications + Investor Inquiry behind admin check | READY TO CODE |
| 6 | Update OG description text in index.html and SEO.tsx | READY TO CODE (pending Rye's copy approval) |
| 7 | Rename contribution tier "Steward" to "Cultivator" in game.ts + all references | READY TO CODE |
| 8 | Increase overlay opacity on Hypha Treasury modal text | READY TO CODE |
| 9 | Fix text contrast on Anyone / ReGen Players page | READY TO CODE |
| 10 | Fix card label readability on Welcome Back mobile view | READY TO CODE |
| 11 | Fix error page buttons (replace router hooks with plain anchor tags) | READY TO CODE |
| 12 | Apply gold glow background to "If enough of us play" banner | READY TO CODE |

### WAITING ON YOU before Claude Code can proceed

- Fix 1: Need to locate or regenerate the new homepage background images
- Fix 6: Need Rye's approval on OG description copy and image choice
