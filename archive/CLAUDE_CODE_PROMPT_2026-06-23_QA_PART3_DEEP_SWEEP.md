# Claude Code Execution Prompt: QA Part 3 (Deep-Sweep Findings)

A deeper static sweep of the whole codebase (accessibility, security hygiene, leftover debug, placeholder content, dead links and buttons, route reachability, file hygiene) followed the Part 1 and Part 2 batches. Headline: the build is clean on almost every dimension. This batch is a short, low-severity hygiene and review list, plus one post-deploy verification carried over from Part 1.

Read `CLAUDE.md` and `.ai/docs/STEERING.md` first. Apply the writing rules to anything you touch. Run the four-gate ship gate before any VERIFIED claim. You cannot push or deploy.

## What the deep sweep confirmed CLEAN (no action needed)

State this in your report so the coverage is on record:
- Accessibility: zero `<img>` without `alt`.
- Security: the three `dangerouslySetInnerHTML` uses are safe (`JsonLD.tsx` via `safeJsonForScript`, `ui/chart.tsx` for CSS). No raw user HTML injection.
- No leftover production `console.log`: the six in `ServiceWorkerRegister.tsx` are all guarded by `import.meta.env.DEV`.
- Every `target="_blank"` has a matching `rel=` on an adjacent line. No bare ones.
- No hardcoded `localhost`, `127.0.0.1`, or staging hosts in client code.
- Zero orphan routes: every static route is linked from somewhere internally.
- Zero dead (`() => {}`) onClick handlers.

## Finding 1 (LOW, file hygiene): 124 untracked `.bak` files in `client/src`

There are 124 `*.tsx.bak` / `*.ts.bak` backup files sitting in `client/src`. They are untracked (git is not committing them, so they will not ship), but they clutter the tree and slow down search and tooling.

- Confirm they are not needed: `git status --porcelain --ignored client/src | grep '\.bak$' | head`.
- Remove them: preview with `git clean -nxd -- 'client/src/**/*.bak'`, then `git clean -fxd -- 'client/src/**/*.bak'` (or delete manually).
- Add `*.bak` to `.gitignore` so they do not come back into status noise.

## Finding 2 (LOW, dead dev page): `ComponentShowcase.tsx`

`client/src/pages/ComponentShowcase.tsx` is not registered in `App.tsx`, so it is unreachable in production. It contains three dead `href="#"` links (lines 741, 751, 764) and a dead `/components` link (line 853). Pick one:
- Delete the page if it is no longer used, or
- Keep it but gate it clearly as dev-only and replace the `href="#"` placeholders with real targets or buttons.

After this, remove the `/components` entry from the `ALLOW` list in `scripts/audit-links.mjs` (it only exists to excuse this page), then re-run `node scripts/audit-links.mjs` and confirm exit 0.

## Finding 3 (REVIEW, not a bug): "Coming Soon" content inventory

The sweep found about a dozen "coming soon" states. Most are intentional graceful-empty placeholders and should stay (quest guide/video placeholders in `QuestDetailModal.tsx`, `QuestHowToVideoModal.tsx`, `QuestTier3Media.tsx`, `VideoPreviewCard.tsx`; per-project forum in `GlobeMap.tsx`). Do not change those. Surface this list to Rye to confirm none are unintended gaps, in particular the user-facing ones on high-traffic pages:
- `client/src/pages/Fund.tsx:504` "Fund Overview - Coming Soon" (the fund overview video on the main fundraising page).
- `client/src/pages/Community.tsx:1051,1055` "Long-form challenges, coming soon" / "Coming Soon" badge.
- `client/src/pages/Blog.tsx:398` "How-To videos coming soon!".
- `client/src/components/CalculatorWeightsSheet.tsx:125` `date: 'Coming Soon'`.

These are content-backlog items, not code defects. No code change unless Rye wants one removed or filled.

## Finding 4 (VERIFY post-deploy, carried from Part 1 Fix 7): anchor scroll on the real build

During the deep sweep, programmatic scrolling behaved oddly in automation: `window.scrollTo` and `documentElement.scrollTop` did not move the page, and `<html>`/`<body>` reported the full content height. The site scrolls fine by mouse wheel, so the active scroller may be a wrapper, not the window. After deploy, confirm on production:
- `/bionomics#local-food-economies` and the `/local-food-economy` redirect land with the "Local food economies" section in view.
- One Table of Contents anchor on `/fund` or `/opportunity` scrolls correctly.
- The "back to top" button (`ScrollToTop.tsx:27-29`, uses `window.scrollTo`) actually returns to top. If it does not, point it at the real scroll container.

## Ship gate (run before VERIFIED)

```bash
python3 scripts/audit-truncation.py    # gate 1
rg -g '*.css' '<className-you-added>' client/src/   # gate 2, per change
pnpm typecheck                          # gate 3 (the callTasks.ts WIP error is separate, not this batch)
node scripts/audit-links.mjs            # gate 4, exit 0
```

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Where |
|---|------|-------|
| 1 | Decide whether to delete `ComponentShowcase.tsx` (Finding 2) | reply or remove |
| 2 | Confirm the "Coming Soon" content items (Finding 3) are intentional | reply |
| 3 | Deploy, then run the Finding 4 verification | production browser |

### CLAUDE CODE: can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Remove the 124 `.bak` files and add `*.bak` to `.gitignore` | TODO |
| 2 | Delete or gate `ComponentShowcase.tsx`, then drop the `/components` ALLOW entry and re-run gate 4 | TODO, gated on Rye's call |
| 3 | Record the clean-dimension summary in the fixes log | TODO |
| 4 | Prepare the Finding 4 verification checklist for Rye | TODO |

### WAITING ON YOU

- Findings 2 and 3 want Rye's call before code changes. Finding 1 proceeds now.
