# Claude Code Execution Prompt: QA Master (2026-06-23)

Single source of truth for the full QA pass on regencivics.earth. It consolidates three earlier docs (the seven-fix batch, the finalize batch, and the deep-sweep batch) into one. The original per-batch docs remain in the repo root for full evidence:
`CLAUDE_CODE_PROMPT_2026-06-23_QA_FIXES.md`, `..._QA_PART2_FINALIZE.md`, `..._QA_PART3_DEEP_SWEEP.md`. Supporting evidence: `.claude/skills/regen-qa-crawl/runs/2026-06-23/`.

## How to work

1. Read `CLAUDE.md`, `.ai/docs/STEERING.md`, then this file.
2. Apply the writing rules to anything you touch: no em-dashes, no contrast-framing, no banned AI words, no rhetorical-question openers, no passive-inspiration filler.
3. Run the four-gate ship gate before any VERIFIED claim. You cannot push or deploy; stage and leave the git command for Rye.

## Ship gate (mandatory before VERIFIED or DONE)

```bash
python3 scripts/audit-truncation.py    # gate 1: no truncated files
rg -g '*.css' '<className-you-added>' client/src/   # gate 2: per new className/keyframe
pnpm typecheck                          # gate 3: exit 0
node scripts/audit-links.mjs            # gate 4: every link + anchor resolves, exit 0
```
The `server/routes/callTasks.ts:582` typecheck error is a separate uncommitted WIP (Zod v4 `.default({})` needing `.default({ limit: 50 })`), not part of this work. Confirm your committed files are clean; do not edit callTasks.ts here.

## Status at a glance

| Item | What | Owner | Status |
|------|------|-------|--------|
| Fix 1 | /investor to /opportunity crash + redirect loop (P0) | Claude Code | CODED, verify on prod |
| Fix 2 | Newsletter re-submit after success | Claude Code | CODED |
| Fix 3 | Homepage resume-card blank thumbnails | Claude Code | CODED |
| Fix 4 | Low-contrast hero text on /land and /community | Claude Code | CODED |
| Fix 5 | 20 of 22 copy fixes (2 Bionomics held) | Claude Code | CODED |
| Fix 6 | Two dead route links | Claude Code | FIXED in source |
| Fix 7 | Anchor deep-links do not scroll to section | Claude Code | CODED, verify on prod |
| A | Commit restored package.json | Claude Code | TODO |
| B | Add .gitattributes, stop CRLF drift | Claude Code | TODO |
| C | Bionomics seed-question rewrites | Rye decides | gated |
| D1 | Remove 124 untracked .bak files | Claude Code | TODO |
| D2 | Delete or gate ComponentShowcase dead page | Rye decides | gated |
| D3 | "Coming Soon" content review | Rye decides | review |

---

# PART A: The seven fixes (coded in the first batch, verify and finish)

Fixes 2 through 7 are coded. Re-read each in `..._QA_FIXES.md` if you need the full root-cause writeups. The one that still needs care is Fix 1.

## Fix 1 (P0): /investor shows the Tao error page for verified investors

A verified investor opening `/investor` is bounced to `/opportunity`, which throws during render; the `EBRedirect` boundary then bounces back to `/investor`, and the loop settles on the Tao fallback. The structural fix is to (a) make `/opportunity` render without throwing and (b) stop `InvestorForm.tsx` from auto-redirecting verified users into a page that can crash.

The error is logged at `components/ErrorBoundary.tsx:68-69` (`[ErrorBoundary] Caught error:` plus component stack). Reproduce in `pnpm dev` with the console open: open `/opportunity`, and if it does not crash set `localStorage.setItem('investor_verified','true')` then open `/investor`. Read the stack to find the throwing line in `Opportunity.tsx` and guard it. After the fix, `/opportunity` renders directly, verified `/investor` does not loop, and unverified `/investor` shows the form. Paste the captured `[ErrorBoundary]` line and a clean-render confirmation as evidence. This one needs a production check after deploy.

## Fix 2 to Fix 7 (verify)

- Fix 2: `Newsletter.tsx` shows the success state in place of the form so it cannot be re-submitted.
- Fix 3: `ProgressiveOnboarding.tsx` resume cards show real thumbnails, no blank boxes.
- Fix 4: hero text on `Land.tsx` and `Community.tsx` meets readable contrast over its background.
- Fix 5: 20 of 22 copy fixes applied (em-dashes, contrast-framing, rhetorical openers, passive filler). The two `Bionomics` seed questions are held under Part B / Task C.
- Fix 6: `CampaignManage.tsx` uses `/campaign/${id}`; `MyApplications.tsx` uses `/apply/status`. Confirmed in source; `node scripts/audit-links.mjs` exits 0.
- Fix 7: `ScrollToTop.tsx` is hash-aware. See Part C verification for the production check.

---

# PART B: Finalize

## Task A: Commit the restored package.json (first)

`package.json` was found truncated and invalid on disk (cut off mid-array in `onlyBuiltDependencies` after `"sharp",`), which breaks `pnpm install` and every build. It has been restored to the valid 183-line version from git's staged blob. Confirm with `node -e "require('./package.json') && console.log('ok')"` and `pnpm install`, then commit it as its own isolated commit.

## Task B: Add .gitattributes to stop the CRLF and truncation drift (root cause)

There is no `.gitattributes`. Files keep drifting to CRLF and several truncated on write during this work, including package.json. Add one at the repo root:

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.ico binary
*.woff binary
*.woff2 binary
*.pdf binary
*.ics text eol=lf
```
Then `git add --renormalize .`, review that the diff is line-endings only, and commit. This is the highest-leverage item here.

## Task C: Bionomics seed-question rewrites (Rye decides)

Two rhetorical-question openers in `client/src/pages/Bionomics.tsx` were held for Rye (RULE 4). Default is to apply the statement-form rewrites; if Rye wants the question framing kept as deliberate origin-story voice, mark them `WONTFIX (editorial)`.

Timeline entry (the 2017 "seed question" body):
- OLD: "Bitcoin can spend billions a year on energy to back its currency. What if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? This is the question that started everything. A democratic financial system backed by local food systems."
- NEW: "Bitcoin spends billions a year on energy to back its currency. In 2017 we started spending that kind of money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food. That idea started everything. A democratic financial system backed by local food systems."

"Local food economies" SectionHeading blurb:
- OLD: "Our entire journey started with food. In 2017 the question was simple. If Bitcoin could spend billions a year on energy to back its currency, what if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? Bionomics is what grew from that question."
- NEW: "Our entire journey started with food. Bitcoin spends billions a year on energy to back its currency. In 2017 we set out to spend that kind of money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food. Bionomics is what grew from that work."

---

# PART C: Deep-sweep findings

A full static sweep (accessibility, security hygiene, leftover debug, placeholder content, dead links and buttons, route reachability, file hygiene) found the build clean on almost every dimension. Record this bill of health in your report:
- Zero `<img>` without `alt`. The three `dangerouslySetInnerHTML` uses are safe (`JsonLD.tsx`, `ui/chart.tsx`). No leftover production `console.log` (the six are `import.meta.env.DEV` guarded). Every `target="_blank"` has a matching `rel=`. No hardcoded localhost or staging hosts. Zero orphan routes. Zero dead `() => {}` onClick handlers.

The actionable items are low severity:

## Task D1 (file hygiene): remove 124 untracked `.bak` files

`client/src` holds 124 untracked `*.tsx.bak` / `*.ts.bak` files. They will not ship (untracked) but clutter search and tooling. Preview `git clean -nxd -- 'client/src/**/*.bak'`, then remove them, and add `*.bak` to `.gitignore`.

## Task D2 (dead dev page): ComponentShowcase.tsx (Rye decides)

`client/src/pages/ComponentShowcase.tsx` is not in the router, so it is unreachable in production. It has three dead `href="#"` links (lines 741, 751, 764) and a dead `/components` link (line 853). Either delete the page or gate it clearly as dev-only and replace the placeholders. After that, remove the `/components` entry from the `ALLOW` list in `scripts/audit-links.mjs` and re-run gate 4.

## Task D3 (content review, not a bug): "Coming Soon" inventory (Rye decides)

About a dozen "coming soon" states exist. Most are intentional empty-state placeholders and should stay (`QuestDetailModal.tsx`, `QuestHowToVideoModal.tsx`, `QuestTier3Media.tsx`, `VideoPreviewCard.tsx`, per-project forum in `GlobeMap.tsx`). Surface the user-facing ones on high-traffic pages for Rye to confirm are intentional: `Fund.tsx:504` (fund overview video), `Community.tsx:1051,1055`, `Blog.tsx:398`, `CalculatorWeightsSheet.tsx:125`. No code change unless Rye asks.

---

# Post-deploy verification (after Rye deploys)

Open production and confirm, pasting results:
- Fix 1: `/investor` logged in does not show the Tao page; `/opportunity` renders directly.
- Fix 7: `/bionomics#local-food-economies` and the `/local-food-economy` redirect land with the "Local food economies" section in view. Spot-check one Table of Contents anchor on `/fund` or `/opportunity`. Confirm the "back to top" button (`ScrollToTop.tsx:27-29`) works; during the sweep, programmatic scroll behaved as if the real scroller is a wrapper, not the window, so if the button or the anchor scroll fails, point them at the actual scroll container.
- Fix 2: `/newsletter` cannot be re-submitted after success.
- Fix 3: homepage resume cards show real thumbnails.
- Fix 4: `/land` and `/community` hero text is readable.

---

# Handoff Breakdown: Who Does What

## YOU (Rye): things only you can do

| # | Task | Where |
|---|------|-------|
| 1 | Decide the Bionomics rewrites (Task C): apply or keep the question | reply, or edit `Bionomics.tsx` |
| 2 | Decide ComponentShowcase (Task D2): delete or keep gated | reply |
| 3 | Confirm the "Coming Soon" items (Task D3) are intentional | reply |
| 4 | Push and deploy | `git push` from the QA branch to main |
| 5 | Run the post-deploy verification | production browser |
| 6 | Delete the QA test newsletter subscriber | remove `rye+qatest@regencivics.earth` |

## CLAUDE CODE: can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Finish and self-verify Fix 1, confirm Fixes 2 to 7 in source | CODED, paste evidence |
| 2 | Task A: commit restored package.json | TODO |
| 3 | Task B: add .gitattributes, renormalize | TODO |
| 4 | Task C: apply the two Bionomics rewrites (default) | gated on Rye |
| 5 | Task D1: remove 124 .bak files, gitignore `*.bak` | TODO |
| 6 | Task D2: delete or gate ComponentShowcase, drop the ALLOW entry, re-run gate 4 | gated on Rye |
| 7 | Run all four ship-gate checks and attach evidence | TODO |
| 8 | Prepare the post-deploy verification checklist | TODO |

## WAITING ON YOU

- Tasks C, D2, D3 want Rye's call before code changes. Everything else proceeds now.
