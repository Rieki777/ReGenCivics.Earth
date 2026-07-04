# The Golden Rule — Before Any Feature Work

Every new feature follows these 5 steps in order. No exceptions.

## Step 1: CEO Review
Run `/plan-ceo-review` and describe the feature. Only proceed if it passes the "does this serve regenerative land coordination or is it scope creep?" test.

## Step 2: Skills Check
Run `npx skills find [feature domain]` before writing any code. Don't rebuild what already exists in the open ecosystem.

## Step 3: Build
Implement the feature. Use specialist personas as needed:
- `/design-review` for UI work
- `/security-review` for anything touching auth, tokens, DAO logic, or Railway DB

## Step 4: Security Gate
Run `/security-review` on any code touching:
- Authentication or JWT
- $ReGen / $RCVoice / RGVoice token logic
- Base blockchain interactions
- Hypha DAO
- Railway MySQL connection strings

## Step 5: Ship
Run `/ship` before every Railway deploy. Never push directly without it.

## Parallel Worktree Workflow

**Never run two sessions in `~/regen-civics` at once.** They share one working tree and git index, so they cross-commit each other's files, half-apply changes, and diverge from `origin/main` in ways that need a manual rebase to untangle (this happened 2026-07-03). One session per directory, always.

These worktrees are already set up (each is its own directory + branch, sharing one `.git` store):
- `../regen-features` (branch `wt/features`): active feature build
- `../regen-database` (branch `wt/database`): database / migration work
- `../regen-content` (branch `wt/content`): content, or a second feature / security audit

`~/regen-civics` itself stays on `main` and is the one that deploys (push to `main` auto-builds on Railway).

**Start of every session:** confirm no other session is using your directory. If you need a fresh isolated stream, run `scripts/new-worktree.sh <name>` (creates `../regen-<name>` on `wt/<name>`, copies `.env`, installs deps).

**Shipping from a worktree:** commit on `wt/<name>`, then land it on main to deploy:
```bash
cd ~/regen-civics && git fetch origin && git checkout main && git pull --ff-only
git merge wt/<name> && git push        # push to main deploys
```
Resolve any conflicts in `~/regen-civics` (not the worktree). Keep each worktree rebased on `origin/main` so merges stay clean.
