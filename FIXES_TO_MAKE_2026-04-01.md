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

**Status:** DONE (Cowork session 2026-04-02)

**Fix applied:** Strengthened text-shadows on all card text elements in `ProgressiveOnboarding.tsx` to double-layer with full black opacity.

**Files:** `client/src/components/ProgressiveOnboarding.tsx`

---

## Fix 11 - Error page buttons not clickable (High)

**Status:** CLAUDE CODE

**Symptom:** "Return Home" and "Visit Community" buttons render on the error/404 page but cannot be clicked or tapped on mobile.

**Root cause:** Component likely uses `useNavigate` from React Router inside an ErrorBoundary where router context is unavailable. Or an invisible overlay element sits above the buttons.

**Fix:** Replace button onClick handlers with plain `<a href="/">` and `<a href="/community">` tags. Style identically to current buttons. If no useNavigate, add `position: relative; z-index: 10` to button container.

**Files:** Search for "ponder the TAO" or "Return Home" in `client/src/`

---

## Fix 12 - Gold glow banner styling (Medium)

**Status:** DONE (Cowork session 2026-04-02)

**Fix applied:** Created `GameHookBanner` component with gold gradient background and warm white text. Now rendered site-wide as a pre-footer element in `App.tsx`.

**Files:** `client/src/components/GameHookBanner.tsx`, `client/src/App.tsx`

---

## Fix 13 - "If enough of us play" banner moved to site-wide pre-footer (Medium)

**Status:** DONE (Cowork session 2026-04-02)

**Symptom:** The GameHookBanner appeared only on the home page as an awkward mid-page callout that didn't align with the rest of the design.

**Fix applied:** Removed from `Home.tsx`, added to `App.tsx` before `SiteFooter` with route-aware variant selection (home/play/quest/game/food). Now appears on every public page as a pre-footer band.

**Files:** `client/src/App.tsx`, `client/src/pages/Home.tsx`

---

## Fix 14 - Home page background image had stitching and doubled earth (High)

**Status:** DONE (Cowork session 2026-04-02)

**Symptom:** The vertical panorama background on the home page had visible seams between panels and two identical earth circles at the bottom. A previous version (from commit 241304f) was better: seamless blending, no doubled earth, cohesive art.

**Fix applied:** Restored the previous background images from commit 241304f (both desktop and mobile versions).

**Files:** `client/public/images/backgrounds/home-desktop.webp`, `client/public/images/backgrounds/home-mobile.webp`

---

## Handoff Breakdown

| Task | Who | Status |
|------|-----|--------|
| Fix 8 (Treasury readability) | DONE in Cowork | CSS opacity bump |
| Fix 9 (Players page readability) | DONE in Cowork | Hero overlay 0.30 to 0.50 |
| Fix 10 (Welcome Back cards) | DONE in Cowork | Text shadow strengthening |
| Fix 11 (Error page buttons) | Claude Code | useNavigate to anchor tags |
| Fix 12 (Gold banner) | DONE in Cowork | GameHookBanner component |
| Fix 13 (Banner to pre-footer) | DONE in Cowork | App.tsx placement |
| Fix 14 (Background image) | DONE in Cowork | Restored from git history |
| Fixes 1-7 | Claude Code | Original batch |
| Rotate Railway DB password | Rye | Railway dashboard |
| Rotate Gemini API key | Rye | Google AI Studio |
| Set CRON_SECRET env var | Rye | Railway dashboard |
| Set APPLE_CLIENT_ID env var | Rye | Railway dashboard |