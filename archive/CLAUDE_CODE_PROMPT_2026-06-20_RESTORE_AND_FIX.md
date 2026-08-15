# Claude Code Prompt: Restore Truncated Files + Apply All Fixes (2026-06-20)

Read `CLAUDE.md`, `.ai/docs/STEERING.md`, and `FIXES_TO_MAKE_2026-06-20.md` before starting.

## Context

A Cowork audit on 2026-06-20 discovered that 6 source files are truncated mid-expression and won't compile. This is the same truncation pattern from the 2026-04-18 incident. Additionally, 2 files have NUL-byte padding. These must be restored before any other work can happen.

Two fixes were already applied by Cowork:
1. `client/src/components/ui/select.tsx`: Changed `text-[#1a472a]` to `text-foreground` (and matching placeholder/svg classes)
2. `client/src/components/Navigation.tsx`: Added "Plays" link (Layers icon, "New" badge) to both desktop dropdown and mobile menu

The `PLAY_CREATION_PROMPT.md` was also updated with a 7-chapter conversational storytelling path. This file exists in both root and `client/public/downloads/create-your-play-prompt.md`.

## Phase 1: Restore Truncated Files (BLOCKING)

```bash
# 1. Run truncation audit to confirm affected files
python3 scripts/audit-truncation.py

# 2. Restore ALL truncated files from the last clean main commit
git checkout main -- \
  client/src/pages/Apply.tsx \
  client/src/components/QuestDetailModal.tsx \
  client/src/components/CrowdPoolingTool.tsx \
  client/src/pages/Home.tsx \
  client/src/pages/Play.tsx \
  client/src/pages/Game.tsx

# 3. Clean NUL-byte files
git checkout main -- \
  client/src/components/AdminEventAnalytics.tsx \
  client/src/components/ProgressiveOnboarding.tsx

# 4. Verify restoration worked
python3 scripts/audit-truncation.py
# Should report 0 truncated files
```

IMPORTANT: The Cowork changes to `select.tsx` and `Navigation.tsx` are NOT in any of the restored files, so they won't be overwritten by the git checkout. Verify they're still present after restore.

## Phase 2: Apply Fixes (after restore)

Work through the fixes in FIXES_TO_MAKE_2026-06-20.md. Here's the execution order with specific guidance based on the audit:

### Fix 1: Apply page form text readability

After restoring Apply.tsx:
- Search for all `text-[#1a472a]/80` helper text instances and change to `text-[#1a472a]` (full opacity)
- Check if `apply-form-dark` CSS class at line ~318 has a definition in `index.css`. If not, either add one or remove the dead className.
- Labels already use the Label component with `text-foreground`, so they should be fine.

### Fix 2: LOI suggestion box

After restoring Apply.tsx, search the FULL file for "Letter of Intent" or "LOI" or "Early stage and just exploring". The truncated version didn't have it, but the full restored version might. If found, remove the entire callout box. If not found in Apply.tsx, grep the full codebase:
```bash
rg -l "Letter of Intent" client/src/
rg -l "Early stage and just exploring" client/src/
```

### Fix 3: Quest modal scroll

After restoring QuestDetailModal.tsx, verify:
- The useEffect for `document.body.style.overflow = "hidden"` is present
- The content container has `overflow-y-auto overscroll-contain`
- Add to the backdrop overlay div: `style={{ touchAction: 'none', overscrollBehavior: 'contain' }}`
- Add to the scrollable content div: `style={{ WebkitOverflowScrolling: 'touch' }}` alongside existing className

### Fix 4: Homepage welcome section

After restoring Home.tsx, verify the first paragraph is already in its own card above the map (look for `bg-[#f8f5f0]/95` around line 374). If so, this fix is already done. If mobile still needs work, bump opacity to `bg-[#f8f5f0]`.

### Fix 5: 2x2 path cards

Already done. Both versions use compact design. Close this item.

### Fix 6: Token page readability

After restoring Play.tsx, verify:
- Line ~540: the `bg-black/55 backdrop-blur-md` panel is present
- Line ~554: the NOTE box has `bg-amber-400/20`
- If readability is still weak on mobile, bump to `bg-black/65` and `bg-amber-400/30`

### Fix 7: Save button

After restoring CrowdPoolingTool.tsx:
1. Check if the `confirmSaveToProfile` function and `createSavedContribution` mutation exist and are complete
2. Check the corresponding server route for `savedContributions.create`:
   ```bash
   rg "savedContributions" server/routes/
   ```
3. If the route doesn't exist or is incomplete, that's the bug. The client-side code (onClick, mutation, state) looked correct in the audit.
4. If the route exists and looks fine, check if `saveName` state is being properly set when the dialog opens (the `handleSaveToProfile` function)

### Fix 8: Form text contrast

The select.tsx fix is already applied (by Cowork). After restoring Apply.tsx, handle the remaining opacity issues per Fix 1.

## Phase 3: Verify Everything

Preserve the Cowork changes (select.tsx + Navigation.tsx) and run:

```bash
# 1. Verify no truncated files remain
python3 scripts/audit-truncation.py

# 2. Verify select.tsx still has text-foreground (not text-[#1a472a])
rg "text-foreground" client/src/components/ui/select.tsx

# 3. Verify Navigation.tsx has Plays link
rg "'/plays'" client/src/components/Navigation.tsx

# 4. Verify Play Creation Prompt exists in both locations
ls -la PLAY_CREATION_PROMPT.md client/public/downloads/create-your-play-prompt.md

# 5. Typecheck
pnpm typecheck

# 6. Build
pnpm build

# 7. Full ship gate
python3 scripts/audit-truncation.py && pnpm typecheck
```

## Phase 4: Commit and Push

Stage all changes with descriptive messages:

```bash
# Commit 1: Restore truncated files
git add client/src/pages/Apply.tsx client/src/components/QuestDetailModal.tsx \
  client/src/components/CrowdPoolingTool.tsx client/src/pages/Home.tsx \
  client/src/pages/Play.tsx client/src/pages/Game.tsx \
  client/src/components/AdminEventAnalytics.tsx \
  client/src/components/ProgressiveOnboarding.tsx
git commit -m "fix: restore 6 truncated source files + clean NUL bytes

Truncation audit found Apply.tsx, QuestDetailModal.tsx, CrowdPoolingTool.tsx,
Home.tsx, Play.tsx, and Game.tsx all cut off mid-expression. Restored from
last clean main commit. Cleaned NUL-byte padding from AdminEventAnalytics.tsx
and ProgressiveOnboarding.tsx."

# Commit 2: Cowork fixes (select, nav, prompt, fixes doc)
git add client/src/components/ui/select.tsx \
  client/src/components/Navigation.tsx \
  PLAY_CREATION_PROMPT.md \
  client/public/downloads/create-your-play-prompt.md \
  FIXES_TO_MAKE_2026-06-20.md \
  CLAUDE_CODE_PROMPT_2026-06-20_RESTORE_AND_FIX.md
git commit -m "feat: Plays nav link, select contrast fix, Play creation storytelling prompt

- Added Plays link (Layers icon, New badge) to Play the Game dropdown + mobile
- Fixed select.tsx: hardcoded text-[#1a472a] to text-foreground for theme support
- Updated Play Creation Prompt with 7-chapter conversational storytelling path
- Updated fixes doc with audit findings (truncation, corrected file targets)"

# Commit 3: Applied fixes (after Phase 2 work)
# Stage whatever files were changed in Phase 2
git add -A
git commit -m "fix: apply page readability, quest modal scroll, form contrast

Batch of mobile readability fixes from 2026-06-20 screenshots:
- Apply page helper text opacity boosted
- Quest modal scroll prevention hardened for mobile
- Token page backdrop contrast verified
- LOI box investigated and resolved"
```

Then tell Rye to `git push origin main` and run migrations:
```
npx tsx scripts/run-migration.ts --all
```

## Files Changed by Cowork (already in workspace, do not overwrite)

| File | Change |
|------|--------|
| `client/src/components/ui/select.tsx` | `text-[#1a472a]` to `text-foreground`, matching placeholder/svg |
| `client/src/components/Navigation.tsx` | Added Plays link (desktop dropdown + mobile menu) |
| `PLAY_CREATION_PROMPT.md` | Added 7-chapter conversational storytelling path |
| `client/public/downloads/create-your-play-prompt.md` | Same content as above |
| `FIXES_TO_MAKE_2026-06-20.md` | Updated with audit findings |

## Expected outcome

After all phases:
- All 8 truncated/NUL files restored and clean
- Ship gate passes (0 truncated, typecheck clean, build clean)
- Plays accessible from nav dropdown on both desktop and mobile
- Form text contrast consistent across all form components
- Apply page helper text readable on mobile
- Quest modal scroll locked on mobile
- 3 commits ready for Rye to push
