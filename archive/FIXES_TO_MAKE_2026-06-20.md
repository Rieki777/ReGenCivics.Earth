# Fixes to Make: 2026-06-20 (Updated with audit findings)

This batch covers UI readability issues, a scroll bug, homepage layout changes, a broken save button, and a CRITICAL truncated files issue discovered during audit. All from mobile screenshots + Cowork code audit.

---

## CRITICAL: Truncated Source Files (BLOCKING)

**Status:** MUST FIX FIRST

**Symptom:** 6 source files are truncated mid-expression and will not compile. 2 additional files have NUL-byte padding. This is the same pattern flagged on 2026-04-18 that the ship gate was built to prevent.

**Truncated files (cut off mid-JSX):**
- `client/src/pages/Apply.tsx` (1065 lines, cuts at `{currentStep < t`)
- `client/src/components/QuestDetailModal.tsx` (758 lines, cuts at `onClick={() =>`)
- `client/src/components/CrowdPoolingTool.tsx` (1412 lines, cuts at `<div `)
- `client/src/pages/Home.tsx` (807 lines, cuts at `<button className="w-full`)
- `client/src/pages/Play.tsx` (612 lines, cuts at `<Compass cl`)
- `client/src/pages/Game.tsx` (1796 lines, cuts at `Ready to Play?`)

**NUL-byte padded files (structurally complete but dirty):**
- `client/src/components/AdminEventAnalytics.tsx` (3 NUL bytes after final newline)
- `client/src/components/ProgressiveOnboarding.tsx` (~100 bytes NUL padding)

**Fix:** Restore all truncated files from the last clean commit on main:
```bash
# Run the audit first to confirm which files are affected
python3 scripts/audit-truncation.py

# Restore truncated files from git
git checkout main -- \
  client/src/pages/Apply.tsx \
  client/src/components/QuestDetailModal.tsx \
  client/src/components/CrowdPoolingTool.tsx \
  client/src/pages/Home.tsx \
  client/src/pages/Play.tsx \
  client/src/pages/Game.tsx \
  client/src/components/AdminEventAnalytics.tsx \
  client/src/components/ProgressiveOnboarding.tsx
```

Then re-apply any un-committed fixes on top of the restored files.

---

## ALREADY FIXED by Cowork (2026-06-20)

### Fix A: Select component text contrast (was Fix 8 partial)
**Status:** FIXED
**File:** `client/src/components/ui/select.tsx`
**Change:** Replaced hardcoded `text-[#1a472a]`, `data-[placeholder]:text-[#1a472a]/80`, and `[&_svg]:text-[#1a472a]/80` with theme-aware `text-foreground`, `data-[placeholder]:text-muted-foreground/90`, and `[&_svg]:text-foreground/80`. Now matches Input/Textarea/Label which already use `text-foreground`.

### Fix B: Plays nav link added to Navigation
**Status:** FIXED
**File:** `client/src/components/Navigation.tsx`
**Change:** Added "Plays" link (with Layers icon and "New" badge) to both the desktop "Play the Game" dropdown and the mobile expandable menu. Links to `/plays`. Placed after the "Play" (singular) item.

---

## Fix 1: Apply page form text readability (High)

**Status:** INVESTIGATE AFTER RESTORE

**Symptom:** On `/apply`, form labels and input text are too light on mobile.

**Audit findings:**
- Apply.tsx is TRUNCATED. Must restore first.
- Section headers use `text-[#1a472a]` (which maps to `--foreground`), so contrast should be fine.
- Most Labels have NO explicit text color class, inheriting from the Label component which uses `text-foreground`.
- Helper text uses `text-[#1a472a]/80` (80% opacity), which may be too light on mobile.
- Input/Textarea components already use `text-foreground`. Select now fixed (see Fix A above).
- The `apply-form-dark` CSS class referenced in code (line 318) has NO definition anywhere. This was supposed to scope form styling for dark-on-parchment readability.

**Fix after restore:** Add the `apply-form-dark` CSS class definition to `index.css` or remove the dead className. Boost helper text from `text-[#1a472a]/80` to `text-[#1a472a]` (full opacity). Verify on mobile after deploy.

**Files to change:** `client/src/pages/Apply.tsx`, `client/src/index.css`

---

## Fix 2: Remove LOI suggestion box from Apply page (High)

**Status:** INVESTIGATE AFTER RESTORE

**Audit finding:** The text "Early stage and just exploring? Send a brief Letter of Intent" does NOT exist in Apply.tsx. The only "Early stage" reference is a SelectItem helper text (line 370) describing project types. The LOI suggestion box may be rendered by a different component, may have already been removed, or may only appear on mobile. Check the live site on mobile to confirm.

**Files to check:** Search codebase for "Letter of Intent" in component files. May be in a child component or conditional render block that's in the truncated portion of Apply.tsx.

---

## Fix 3: Quest detail modal scroll bug (Critical)

**Status:** PARTIALLY IMPLEMENTED, VERIFY AFTER RESTORE

**Audit findings:**
- QuestDetailModal.tsx already has `document.body.style.overflow = "hidden"` useEffect (lines 484-491)
- Content container already has `overflow-y-auto overscroll-contain max-h-[50vh]` (line 563)
- File is TRUNCATED at line 758 so the full component state is unknown
- The existing scroll prevention code looks correct. Bug may be specific to certain mobile browsers or may be in the truncated footer section.

**Fix after restore:** Verify the full component compiles. If scroll bug persists on mobile, add `touch-action: none` to the backdrop overlay and `-webkit-overflow-scrolling: touch` to the scrollable content container. Also consider adding `overscroll-behavior: contain` inline style (not just Tailwind class) for broader mobile support.

**Files to change:** `client/src/components/QuestDetailModal.tsx`

---

## Fix 4: Homepage welcome section layout (Medium)

**Status:** ALREADY PARTIALLY FIXED, VERIFY AFTER RESTORE

**Audit findings:**
- Home.tsx is TRUNCATED at line 807
- The first paragraph ("regen civics is a fund...") is ALREADY in a card above the map (lines 374-385, `rounded-2xl bg-[#f8f5f0]/95`)
- The second paragraph ("We create quests...") stays on the map with a radial-gradient overlay for contrast
- Code comment at lines 362-365 confirms this restructuring was intentional (moved from parchment overlay due to mobile washout)
- The 2x2 path cards (lines 468-571) already use the compact design with PathCardImage, "Go ->", "MORE" expander

**Fix after restore:** This may already be fixed. Verify on mobile after file restoration. If the card is still hard to read on mobile, increase the bg opacity from `bg-[#f8f5f0]/95` to `bg-[#f8f5f0]` (full opacity) and ensure the map section has enough padding.

**Files to change:** `client/src/pages/Home.tsx` (verify only, may need no changes)

---

## Fix 5: Landing screen 2x2 path cards redesign (Medium)

**Status:** ALREADY DONE

**Audit findings:** Both first-visit (Home.tsx lines 468-571) and return-visitor (ProgressiveOnboarding.tsx) already use the compact card design with PathCardImage, "Go ->" links, and "MORE" expandable sections. The return-visitor version adds contextual "YOUR PATH" badges based on user data. The first-visit version omits those badges but uses the same layout. Condition at line 232: all logged-out visitors see ProgressiveOnboarding by default.

**No action needed.** Close this fix.

---

## Fix 6: Token page readability (High)

**Status:** PARTIALLY FIXED, VERIFY ON MOBILE AFTER RESTORE

**Audit findings:**
- The token content is in `Play.tsx` (not Economy.tsx as originally noted)
- Play.tsx line 540 already has `bg-black/55 backdrop-blur-md` panel behind the "ReGen Game Tokens + RGVoice" heading
- The "NOTE" box at line 554 has `bg-amber-400/20 border border-amber-400/50`
- Play.tsx is TRUNCATED at line 612
- Economy.tsx has NO background images, uses solid `background: "#1a472a"` throughout. Economy.tsx is NOT truncated.

**Fix after restore:** The backdrop panel is already present. If still hard to read on mobile, increase `bg-black/55` to `bg-black/70` and the NOTE box from `bg-amber-400/20` to `bg-amber-400/30`. Verify on mobile.

**Files to change:** `client/src/pages/Play.tsx`

---

## Fix 7: Save button broken on contribution form (Critical)

**Status:** INVESTIGATE AFTER RESTORE

**Audit findings:**
- CrowdPoolingTool.tsx is TRUNCATED at line 1412
- Save button (line 769) has `onClick={confirmSaveToProfile}` and `type="button"`, which looks correct
- `confirmSaveToProfile` (lines 272-298) validates name, normalizes email, calls `createSavedContribution.mutate()`
- The mutation has `onSuccess`/`onError` handlers (lines 158-168)
- Button has `disabled={createSavedContribution.isPending}`
- No `<form>` wrapping the dialog, both buttons have `type="button"`
- The code structure looks correct. The bug may be:
  (a) the mutation endpoint failing silently (check tRPC server route)
  (b) state issue where `saveName` is empty when it shouldn't be
  (c) the truncated file causing a build error that prevents the component from rendering properly

**Fix after restore:** First restore the file and verify it compiles. Then test the save flow. If the mutation fails, check `server/routes/` for the `savedContributions.create` endpoint. Add error logging if missing.

**Files to change:** `client/src/components/CrowdPoolingTool.tsx`, potentially server route

---

## Fix 8: Form text contrast site-wide (High)

**Status:** PARTIALLY FIXED

**Audit findings:**
- `input.tsx`: uses `text-foreground` (correct)
- `textarea.tsx`: uses `text-foreground` (correct)
- `label.tsx`: uses `text-foreground` (correct)
- `select.tsx`: WAS using hardcoded `text-[#1a472a]`, NOW FIXED to `text-foreground` (see Fix A above)
- CSS variable `--foreground` resolves to `oklch(0.33 0.07 155)` which is `#1a472a` (dark forest green), plenty of contrast on white backgrounds
- The remaining contrast issue is likely page-specific: Apply.tsx helper text uses `text-[#1a472a]/80` (80% opacity) which is lighter on mobile

**Remaining work:** After restoring truncated files, audit Apply.tsx helper text opacity values. Change any `text-[#1a472a]/80` to `text-[#1a472a]` for full contrast. Check if the dead `apply-form-dark` CSS class needs a definition or should be removed.

**Files to change:** `client/src/pages/Apply.tsx`, possibly `client/src/index.css`

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| - | Run Plays migrations 0137-0140 | Railway DB access | `npx tsx scripts/run-migration.ts --all` (after deploy) |
| - | Push to git after Claude Code commits | git push requires auth | `git push origin main` |
| 7 | Reproduce Save button bug on live site | Browser interaction needed | Click Save on crowd pooling form, check console |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| - | Restore 6 truncated files from git | MUST DO FIRST |
| - | Clean NUL bytes from 2 files | MUST DO FIRST |
| A | Select component text-foreground fix | FIXED (by Cowork) |
| B | Plays nav link in Navigation.tsx | FIXED (by Cowork) |
| 1 | Apply page form readability tweaks | AFTER RESTORE |
| 2 | LOI box investigation | AFTER RESTORE |
| 3 | Quest modal scroll verification | AFTER RESTORE |
| 4 | Homepage layout verification | AFTER RESTORE |
| 5 | 2x2 path cards | ALREADY DONE, CLOSE |
| 6 | Token page readability tweaks | AFTER RESTORE |
| 7 | Save button debugging | AFTER RESTORE |
| 8 | Form text contrast (remaining) | AFTER RESTORE |
| - | Run ship gate (truncation + typecheck + build) | AFTER ALL FIXES |

### PRIORITY ORDER

1. **RESTORE TRUNCATED FILES** (blocking everything else)
2. Fix 7 (save button) + Fix 3 (quest modal scroll): Critical
3. Fix 1 + 6 + 8 (readability/contrast): High
4. Fix 2 (LOI box investigation): High
5. Fix 4 (homepage verification): Medium
6. Ship gate, commit, push
