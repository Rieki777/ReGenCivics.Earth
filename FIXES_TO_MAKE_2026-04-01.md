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

## Priority Order

1. Fix 5 - My Submissions admin data (High, privacy/UX)
2. Fix 3 - Notification toggle (High, broken UI)
3. Fix 2 - On-Chain Tracking links (Medium, missing functionality)
4. Fix 7 - Cultivator rename (Medium, prep for citizenship tiers)
5. Fix 6 - OG image/description (Medium, social sharing)
6. Fix 1 - Background image (Medium, blocked on finding/generating image)
7. Fix 4 - Quest 8 experience text (Low, quick text change)

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

### WAITING ON YOU before Claude Code can proceed

- Fix 1: Need to locate or regenerate the new homepage background images
- Fix 6: Need Rye's approval on OG description copy and image choice
