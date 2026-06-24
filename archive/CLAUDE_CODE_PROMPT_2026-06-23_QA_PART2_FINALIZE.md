# Claude Code Execution Prompt: QA Fixes Part 2 (Finalize, Verify, Close Out)

Continuation of `CLAUDE_CODE_PROMPT_2026-06-23_QA_FIXES.md`. That batch (Fixes 1 through 7) is coded. This batch finalizes it: fix the file-corruption root cause, close the one open editorial item, run the full ship gate, and lay out the post-deploy verification. There is no Fix 8. The original prompt has exactly seven fixes; if your copy looked truncated, the full restored version is in the repo root.

## How to work this batch

1. Read `CLAUDE.md`, `.ai/docs/STEERING.md`, then the Part 1 prompt, then this file.
2. Apply the writing rules to anything you touch: no em-dashes, no contrast-framing, no banned AI words, no rhetorical-question openers, no passive-inspiration filler.
3. Run the full ship gate (now four gates, below) before any VERIFIED claim.
4. You cannot push or deploy. Stage everything and leave the git command for Rye.

---

## Task A: Commit the restored package.json (do this first)

`package.json` was found truncated and invalid on disk on 2026-06-23: it cut off mid-array inside `onlyBuiltDependencies` after `"sharp",` with no closing brackets, so it was unparseable JSON. That breaks `pnpm install`, `pnpm typecheck`, and every build. It has been restored to the valid 183-line version from git's staged blob.

- Confirm it is valid: `node -e "require('./package.json') && console.log('ok')"` prints `ok`, and `pnpm install` parses it.
- Commit the restored file as its own commit so the fix is isolated and obvious in history.

## Task B: Stop the CRLF / truncation drift (root cause)

There is no `.gitattributes` in the repo. Files are drifting to CRLF and several have truncated on write this session (package.json, and editor writes to the fixes docs). Add a `.gitattributes` at the repo root to normalize line endings to LF and treat known binaries as binary:

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

Then renormalize once and commit:

```bash
git add --renormalize .
git status
```

Review the renormalized diff before committing (it should be line-ending only). This is the highest-leverage fix here: it prevents the corruption pattern the ship gate keeps catching after the fact.

## Task C: Bionomics seed-question rewrites (Fix 5 remainder)

Two rhetorical-question openers were held for Rye's editorial call (RULE 4). Default: apply the statement-form rewrites below. If Rye says keep the question framing as deliberate origin-story voice, skip this task and mark those two `WONTFIX (editorial)`.

`client/src/pages/Bionomics.tsx` (the 2017 timeline entry, body field):
- OLD: "Bitcoin can spend billions a year on energy to back its currency. What if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? This is the question that started everything. A democratic financial system backed by local food systems."
- NEW: "Bitcoin spends billions a year on energy to back its currency. In 2017 we started spending that kind of money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food. That idea started everything. A democratic financial system backed by local food systems."

`client/src/pages/Bionomics.tsx` (the "Local food economies" SectionHeading blurb):
- OLD: "Our entire journey started with food. In 2017 the question was simple. If Bitcoin could spend billions a year on energy to back its currency, what if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? Bionomics is what grew from that question."
- NEW: "Our entire journey started with food. Bitcoin spends billions a year on energy to back its currency. In 2017 we set out to spend that kind of money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food. Bionomics is what grew from that work."

## Task D: Run the full ship gate

```bash
python3 scripts/audit-truncation.py    # gate 1: no truncated files (catches the package.json failure mode)
rg -g '*.css' '<className-you-added>' client/src/   # gate 2, per new className
pnpm typecheck                          # gate 3: exit 0
node scripts/audit-links.mjs            # gate 4: every link + anchor resolves, exit 0
```

Note on gate 3: the only known typecheck error, `server/routes/callTasks.ts:582` (a Zod v4 `.default({})` that needs `.default({ limit: 50 })`), is an uncommitted WIP in a separate working change and is not part of this batch. Confirm the files YOU committed are type-clean; do not edit callTasks.ts as part of this batch unless Rye asks.

## Task E: Post-deploy live verification (after Rye deploys)

Open the production site and confirm:
- Fix 1: `/investor` while logged in does not show the Tao error page, and `/opportunity` renders directly. Paste the result.
- Fix 7: `/bionomics#local-food-economies` (and the `/local-food-economy` redirect) land with the "Local food economies" section in view. Spot-check one Table of Contents anchor on `/fund` or `/opportunity`. Re-test the "back to top" button.
- Fix 2: `/newsletter` cannot be re-submitted after success.
- Fix 3: homepage resume cards show real thumbnails, no blank boxes.
- Fix 4: `/land` and `/community` hero text is readable.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Command / Where |
|---|------|-----------------|
| 1 | Decide the Bionomics seed questions (Task C): apply the rewrite, or keep the question framing | reply, or edit `Bionomics.tsx` |
| 2 | Push and deploy | `git push` from the QA branch to main |
| 3 | Live-verify after deploy (Task E) | production browser |
| 4 | Delete the QA test newsletter subscriber | remove `rye+qatest@regencivics.earth` |

### CLAUDE CODE: can be done without Rye

| # | Task | Status |
|---|------|--------|
| A | Commit the restored package.json | TODO |
| B | Add `.gitattributes`, renormalize line endings | TODO |
| C | Apply the two Bionomics rewrites (default) | TODO, gated on Rye's call |
| D | Run the four ship-gate checks, attach evidence | TODO |
| E | Prepare the post-deploy verification checklist for Rye | TODO |

### WAITING ON YOU

- Task C is `BLOCKED` only if you want to keep the question framing; otherwise the default rewrite proceeds.
- Task E runs after your deploy.
