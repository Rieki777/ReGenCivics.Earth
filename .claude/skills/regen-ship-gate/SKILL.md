---
name: regen-ship-gate
description: Use before marking any fix, task, or feature as VERIFIED, DONE, or shipped in the ReGen Civics repo. Required when closing out multi-file edits, writing completion reports, updating fix status tables, or committing JSX/CSS changes. Enforces three gates that catch the specific failure modes observed in this codebase: file truncation, className/keyframes mismatch, and typecheck regressions.
---

# ReGen Ship Gate

## Why this skill exists

Three failure modes have shipped broken work to `regencivics.earth`:

1. **File truncation.** On 2026-04-18, 15 source files including `client/src/App.tsx`, `server/routes/events.ts`, and 12 page components were found cut off mid-statement on disk with NUL-byte padding at the end. The build would have failed on next `pnpm dev`. None of these were caught before the previous session claimed "DONE."
2. **className / keyframes mismatch.** Commit b06b7aa marked 13 fixes "resolved." Audit found 5 of those were false: JSX got `className="ink-reveal"` and `animation: shimmer 2s` attributes, but the `.ink-reveal` rule and `@keyframes shimmer` definition were never added to any stylesheet. The render was a no-op.
3. **Completion claims without typecheck.** Multiple sessions have closed out without running `pnpm gate` or `pnpm build`. TypeScript errors shipped.

This skill blocks all three before anything is marked VERIFIED.

## The three gates

**Before claiming VERIFIED, DONE, or shipped, run all three gates. No exceptions.**

### Gate 1 — Truncation audit

Run from repo root:

```bash
pnpm gate   # runs this audit + the typecheck, and finds a working Python itself
```

Or the audit alone: `py scripts/audit-truncation.py` on Windows, `python3 scripts/audit-truncation.py` on the cowork VM.

Exit code 0 means clean. Non-zero means one or more files are truncated.

The audit covers `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.css`, and `.scss` files in `client/src`, `server`, `shared`, `drizzle`, and `scripts`. It checks four signals:

1. Last non-whitespace character is alphanumeric (ends mid-identifier)
2. Last non-whitespace character is an unclosed quote (ends mid-string)
3. CSS files with unbalanced `{}`, `()`, or `[]` counts
4. JS/TS files where the last non-blank line is indented 16+ chars (ends mid-JSX even if the last char is a valid close like `}`)

Signal 4 specifically catches the pattern that shipped `MobileMoreMenu.tsx` truncated mid-`<Link>` on 2026-04-18: the file ended with `href={item.href}\r\n    ` — last char `}` passed the old check, but the deep indent revealed the truncation.

If truncations found, restore from HEAD before continuing:

```bash
py scripts/audit-truncation.py --fix   # `python3` on the cowork VM
py scripts/audit-truncation.py         # re-run to confirm 0
```

Then re-apply whatever changes the restore overwrote. Do not skip this step. Do not rationalize that "the ones I edited are fine."

### Gate 2 — className / keyframes match

For every CSS-looking change in this batch (new `className=`, new `animation:` or `transition:`, new `@keyframes`, new custom utility), verify the referenced name exists on the stylesheet side.

Minimum check for each added className:

```bash
# Example: added className="ink-reveal" to a component
rg -g '*.css' -g '*.scss' 'ink-reveal' client/src/
rg -g '*.css' 'keyframes\s+shimmer' client/src/
```

If the stylesheet grep returns nothing, the class or keyframe does not exist. The visual effect is a no-op. Fix (add the CSS) before marking VERIFIED.

Same check for Tailwind arbitrary values if you introduced a token like `animation: shimmer 2s` on an element — grep for the keyframe name in any CSS file.

### Gate 3 — Typecheck

```bash
pnpm check       # `pnpm typecheck` is an alias for the same thing
# or: npx tsc --noEmit -p tsconfig.json
```

Exit code 0 means clean. Any TypeScript error means NOT VERIFIED.

For fixes that touch server code, also run:

```bash
pnpm build
```

A build pass is the strongest evidence available without a browser.

### Gate 4 — Link and anchor integrity

Run whenever you add, change, or remove a route, a `<Link>`/`navigate()`/`href`, or an in-page anchor. Catches links that point at routes which do not exist (they 404 to the NotFound page) and `#fragment` links with no matching target.

```bash
node scripts/audit-links.mjs
```

Exit code 0 means every internal link and anchor resolves. Exit 1 lists each broken link as `raw <- file:line`. Fix it, or add a justified entry to the `ALLOW` list at the top of `scripts/audit-links.mjs`. This guard found `/campaigns/${id}` and `/application/${app.id}` shipping to users as dead links on 2026-06-23.

## Required in every fixes document

The `regen-fixes-handoff` skill requires a Handoff Breakdown table. Every CLAUDE CODE row needs an `Evidence` column with a concrete artifact:

| # | Task | Status | Evidence |
|---|------|--------|----------|
| V5 | Add ink-reveal shimmer to hero heading | VERIFIED | `client/src/index.css:118` has `@keyframes ink-reveal-shimmer`, `Home.tsx:42` applies class |
| V6 | Fix radial arc widening | VERIFIED | `docs/screenshots/2026-04-18-radial.png`, `WizardRadialMenu.tsx:89` |
| V7 | Bionomics hero title overlap | CODED | awaiting browser verify after deploy |

**Acceptable evidence types:**
- `path/to/file.tsx:LINE` with the exact change
- Grep result proving the referenced symbol exists in its stylesheet/token/route file
- Screenshot path in `docs/screenshots/`
- Script output line (`pnpm gate` exit 0, `audit-truncation.py` exit 0)

**Not acceptable:**
- "Should work now"
- "Edited the file"
- "Agent reported success"
- No evidence column at all

## Status vocabulary, strict

| Status | Meaning | Requires |
|--------|---------|----------|
| `CODED` | Edit is in the file | Read-back of the edit |
| `VERIFIED` | Behavior confirmed | All three gates + evidence |
| `DONE` | Shipped and observed live | Screenshot from production URL |

A fix may move from CODED to VERIFIED only after all three gates pass. Never skip gates because "the change is small" or "it's obviously correct."

## Red flags, stop

- About to write "all done," "shipped," "verified," "resolved" without having run the three gates in this session
- About to update a fixes-doc status from CODED to VERIFIED without an Evidence entry
- Relying on the agent's own summary instead of re-reading the file or re-running grep
- Tired, at the end of a long session, wanting to close out

All of these mean: run the gates.

## Quick reference

```bash
# From repo root, before any "VERIFIED" claim:
pnpm gate                                           # gates 1 + 3, any platform
rg -g '*.css' '<className-you-added>' client/src/   # gate 2, per change
node scripts/audit-links.mjs                        # gate 4, when routes/links/anchors changed
```

`pnpm gate` exists because the hand-written form of these commands was wrong here
for three months: `pnpm typecheck` named a script that never existed, and on
Windows `python3` is a Store stub that exits 0 without running the audit. Both
failed silently, because each session substituted a working command by hand
instead of fixing the source. If you find yourself translating a gate command
before running it, fix the doc — that is how a gate rots into decoration.

Four checks. Less than two minutes. Prevents the patterns that shipped 15 truncated files, 5 no-op CSS references, and dead route links to production.
