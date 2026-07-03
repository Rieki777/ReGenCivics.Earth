#!/usr/bin/env bash
# Create an isolated git worktree for a concurrent Claude/dev session.
#
# Why: multiple sessions editing the SAME working tree collide (shared git
# index, half-applied changes, cross-committed work). A worktree gives each
# session its own directory + branch while sharing one .git object store.
#
# Usage:   scripts/new-worktree.sh <name> [base-branch]
# Example: scripts/new-worktree.sh features           # -> ../regen-features on wt/features
#          scripts/new-worktree.sh hotfix main         # branch off main explicitly
#
# After it finishes, open a Claude/editor session INSIDE the new directory.
# Ship from there by merging the branch into main (push to main deploys):
#   cd ../regen-<name> && git commit ... && git checkout main && git merge wt/<name> && git push
# or open a PR from wt/<name>.
set -euo pipefail

NAME="${1:?usage: new-worktree.sh <name> [base-branch]}"
BASE="${2:-main}"
ROOT="$(git rev-parse --show-toplevel)"
DEST="$(dirname "$ROOT")/regen-${NAME}"
BRANCH="wt/${NAME}"

if [ -e "$DEST" ]; then
  echo "error: $DEST already exists" >&2
  exit 1
fi

echo "→ Fetching latest so the worktree starts from up-to-date $BASE"
git -C "$ROOT" fetch origin "$BASE" --quiet || true

echo "→ Creating worktree $DEST on new branch $BRANCH (from origin/$BASE)"
git -C "$ROOT" worktree add "$DEST" -b "$BRANCH" "origin/${BASE}"

# .env is gitignored, so the worktree won't have it. Copy it so DB access,
# migrations, and builds work from the worktree.
if [ -f "$ROOT/.env" ]; then
  cp "$ROOT/.env" "$DEST/.env"
  echo "→ Copied .env into the worktree"
fi

echo "→ Installing dependencies (fast: pnpm hardlinks from the shared store)"
( cd "$DEST" && pnpm install --prefer-offline )

echo
echo "✓ Worktree ready: $DEST  (branch $BRANCH)"
echo "  Open your session there. Ship by merging $BRANCH into main and pushing."
