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
Run parallel workstreams in separate git worktrees, one directory per stream:
- `../regen-features`: active feature build
- `../regen-database`: database / migration work
- `../regen-content`: content, or a second feature / security audit

Create each with `git worktree add ../regen-<name> -b <branch>`, then open a `claude` session inside that directory. Separate directories are what keep the sessions isolated. Running multiple sessions in the same directory shares one working tree and git index, so it is not isolated and can cause conflicts.
