# Fixes to Make — 2026-04-21 Batch 2

This document continues from `FIXES_TO_MAKE_2026-04-21_UI_BATCH.md`.

Scope: five UI/UX fixes Rye called out on 2026-04-21 after the first batch landed. All five are shipped in-source by Claude (no "specced-for-Claude-Code-later" rows in this batch). Everything in this doc is CODED and ready to push.

---

## Fix 1 — Governance: Who Holds the Vote image replaces pie chart

**Status:** FIXED

**Symptom:** The SVG pie chart at the top of the Governance page wasn't communicating the voice-holder breakdown well. Rye wanted the dedicated "Who Holds the Vote" diagram image used instead, with the per-slice legend kept underneath.

**Root cause:** `WhoHoldsVoteChart` rendered a hand-computed SVG pie. The illustrated diagram already lived at `client/public/images/governance/who-holds-vote.png` but wasn't wired.

**Fix:** Rewrote the component to render the PNG as the primary visual. Kept the legend (four rows with colored swatch + label + percentage from `governanceSlices`) and the figcaption so percentages remain accurate and accessible.

**Files changed:**
- `client/src/components/governance/WhoHoldsVoteChart.tsx` (full rewrite)

---

## Fix 2 — Gratitude dialog clipped by forum reply cards on desktop

**Status:** FIXED

**Symptom:** Clicking the Gratitude button inside a forum reply card on desktop opened a textarea that was cut off horizontally and vertically by the card's `overflow: hidden` and stacking context.

**Root cause:** The panel was a sibling of the button inside the card. Any ancestor with `overflow: hidden` or a lower `z-index` stacking context clipped it. Standard CSS `z-index` can't escape those ancestors.

**Fix:**
1. Rendered the panel through `createPortal(document.body)` so it escapes every ancestor.
2. Added `useLayoutEffect` that measures the button with `getBoundingClientRect()` on open + on scroll/resize, then positions the portal with `position: fixed` + computed `top`/`left`.
3. Prefers showing above the button when there's >180px of headroom, falls back to below; clamps `left` to the viewport with 8px padding.
4. Added Escape-key close and an invisible `z-[9998]` backdrop that catches outside clicks.
5. `autoFocus` on the textarea so typing begins immediately.

**Files changed:**
- `client/src/components/GratitudeButton.tsx`

---

## Fix 3 — Forum forest theme (joinseeds.earth vibe)

**Status:** FIXED

**Symptom:** Forum landed on a pale tan `#f8f5f0` page background. Rye wanted the forest-green feel of joinseeds.earth: deep green backdrop, content cards floating on top.

**Root cause:** Three forum page roots all hard-coded `bg-[#f8f5f0]`, and the hero's gradient faded into that tan color.

**Fix:**
- Swapped the root page background on all three forum pages to a forest gradient: `bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]`.
- Updated the Community hero bottom gradient fade target from `to-[#f8f5f0]` to `to-[#0a1f12]` so the hero blends seamlessly into the new page bg.
- Updated the loading + "thread not found" screens on `CommunityPost` to use the forest gradient with light text colors (`text-white`, `text-white/65`, `text-[#7dd87d]`) so text stays legible.
- Left interior card backgrounds (`bg-white`, `bg-[#f8f5f0]` on inner cards inside white panels) alone: cream cards floating on forest is the joinseeds pattern.

**Files changed:**
- `client/src/pages/Community.tsx` (2 lines: root bg + hero gradient)
- `client/src/pages/CommunityPost.tsx` (3 blocks: loading, not-found, main)
- `client/src/pages/CommunityNewPost.tsx` (2 blocks: auth-loading, main)

---

## Fix 4 — Tools Library AI Matcher position

**Status:** FIXED

**Symptom:** The "Describe your problem" button opened the AI Matcher, but the matcher rendered further down the page, under the "Tools we use" grid. Users clicked and thought nothing happened.

**Root cause:** Rendering order put the matcher after the tools grid instead of immediately under the button that opened it.

**Fix:** Moved the `{showMatcher && …}` block to sit directly between the "Describe Your Problem" button and the "Tools we use" heading. The open/close flow is now visually continuous with the button that triggers it.

**Files changed:**
- `client/src/pages/ToolsLibrary.tsx`

---

## Fix 5 — Promote to a decision: dual scrollbar + treat as full modal

**Status:** FIXED

**Symptom:** Opening "Promote to a decision" showed two vertical scrollbars: one on the browser window (page scroll) and one inside the modal's right panel. Users also noted the modal's inner scrollbar was thin and hard to grab.

**Root cause:** The modal didn't lock the underlying page, and it had nested `overflow-y-auto` regions. Both ancestors and descendants were scrollable, so the browser split scroll between them.

**Fix:**
1. **Lock body scroll while modal is open.** Added a `useEffect` that sets `document.body.style.overflow = "hidden"` and compensates for the vanishing scrollbar by padding the body right by its measured width, so the page doesn't jump when the modal opens. Cleanup restores the previous values on close.
2. **Clamp modal height.** The modal root now has `max-h-[calc(100dvh-3rem)] md:max-h-[85vh] overflow-hidden`, guaranteeing it never exceeds the viewport and never asks the page to scroll.
3. **Single scroll context on the right panel.** Removed `md:overflow-y-auto` from the outer right panel wrapper (it's now `flex-1 flex flex-col min-h-0`), and kept `overflow-y-auto` only on the middle content area between the header and footer. That's the one and only scrolling region inside the modal on desktop.
4. **Left panel still scrolls independently.** Added `md:min-h-0` + `[scrollbar-gutter:stable]` so long thread previews scroll cleanly alongside the form.
5. **Wider, grippable scrollbar.** Added WebKit scrollbar styling (`[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full`) on the middle content so the scrollbar is easier to grab and stays in theme.

**Files changed:**
- `client/src/components/governance/PromotionModal.tsx`

---

## Priority Order

All five fixes in this batch are user-facing polish. Ordered by user-visible impact:

1. **Fix 5** (Promote to a decision modal) — biggest UX win, affects a primary workflow.
2. **Fix 3** (forum forest theme) — sets the tone for the entire community section.
3. **Fix 2** (Gratitude dialog clipping) — real functional bug on desktop replies.
4. **Fix 4** (Tools Library matcher position) — clarity fix for a new feature.
5. **Fix 1** (Who Holds the Vote image) — visual upgrade on Governance page.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| All | Pull + inspect the new commit, then `git push origin main` | Cowork agent does not hold push credentials | `git pull` then `git push origin main` on Windows |
| All | Verify on staging after push (forum bg, governance image, promotion modal, gratitude on a forum reply card, tools library matcher) | Requires signed-in browser + eye test | `regencivics.earth/community`, `/governance`, open a thread → promote, open a reply card → gratitude |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Who Holds the Vote image replaces SVG pie | FIXED | `client/src/components/governance/WhoHoldsVoteChart.tsx` (full rewrite to `<img src="/images/governance/who-holds-vote.png">` + legend) |
| 2 | Gratitude dialog escapes card clipping via Portal + fixed positioning | FIXED | `client/src/components/GratitudeButton.tsx` (createPortal + useLayoutEffect + Escape handler) |
| 3 | Forum forest-green theme on all three forum pages | FIXED | `Community.tsx:244,263`, `CommunityPost.tsx:359,369,393`, `CommunityNewPost.tsx:154,168` (bg-gradient forest) |
| 4 | Tools Library matcher moved under the button | FIXED | `client/src/pages/ToolsLibrary.tsx` (matcher block relocated above Tools we use grid) |
| 5 | Promote to a decision: body scroll lock + single inner scroll + wider grippable scrollbar | FIXED | `client/src/components/governance/PromotionModal.tsx:87-101` body lock, `:179` max-h clamp, `:235` right-panel no overflow, `:247` single scroll with custom scrollbar |
| All | Local commit of all five fixes | READY | awaiting `git push origin main` by Rye |

### Note on database migrations

Claude Code CAN run migrations. The Cowork VM has access to `.env` and to the
`scripts/run-migration.ts` runner documented in `CLAUDE.md`. None of the fixes
in this batch require a migration, but when future batches include schema
changes, Claude Code will run:

```bash
npx tsx scripts/run-migration.ts drizzle/NNNN_name.sql
```

and mark the migration step as CLAUDE CODE, not HUMAN. The prior fixes doc
(`FIXES_TO_MAKE_2026-04-21_UI_BATCH.md`) was updated to reflect this.

### WAITING ON YOU before Claude Code can proceed

Nothing in this batch is blocked. Commit is local and ready to push.
