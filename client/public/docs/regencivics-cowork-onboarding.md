# ReGen Civics — Cowork Onboarding

Welcome. This guide gets a new contributor set up to work on the ReGen Civics
codebase with Claude Cowork in under an hour.

## What is Cowork?

Cowork is a workflow where a human contributor and a Claude agent share the
same repo, branch, and shell. You drive, Claude implements. When you come
across work that needs to happen (a bug, a feature, a migration, a doc), you
describe it in a fixes document and Claude executes end-to-end: edits source,
runs tests, applies SQL migrations, commits, and pushes to main.

The contract with Claude:
- Branches named `claude/<something>` are Claude's working space.
- `main` is the deploy branch. Railway watches `main` and rebuilds on every
  push.
- Fixes documents (`FIXES_TO_MAKE_*.md` at repo root) describe what to do and
  which fixes Claude should own vs. which stay human-only.

## Before you start

You need:
- Node 20.19 or newer
- pnpm 8.x
- A GitHub account with write access to the repo
- Access to the Railway project for DB credentials (the `DATABASE_URL`)
- Claude Code installed locally (VS Code extension or CLI)

## First-time setup

```bash
git clone https://github.com/Rieki777/ReGenCivics.Earth.git regen-civics-clean
cd regen-civics-clean
pnpm install
cp .env.example .env   # then fill in DATABASE_URL and friends
pnpm dev
```

Open `http://localhost:5173` to confirm the site boots.

## Repo layout

```
regen-civics-clean/
  CLAUDE.md                          project context for Claude
  MEMORY.md, memory/                 Claude's auto-memory (not checked in)
  .claude/
    skills/                          custom skills Claude uses
    worktrees/                       Claude's feature branches live here
    settings.local.json              your local permissions
  client/
    src/                             React + TypeScript + Vite frontend
    public/                          static assets, service worker
  server/
    routes/                          tRPC routers
    _core/                           auth, trpc setup, db
    lib/                             shared server helpers
  shared/                            code usable by both server + client
  drizzle/
    schema.ts                        single source of truth for DB shape
    NNNN_name.sql                    raw SQL migrations
  scripts/
    run-migration.ts                 idempotent migration runner
    audit-truncation.py              ship gate gate 1
```

## How the fixes workflow runs

1. You collect a batch of issues (screenshots, bug reports, feature ideas).
2. You write `FIXES_TO_MAKE_YYYY-MM-DD_TOPIC.md` at the repo root. For each
   fix, note the symptom, the root cause (if known), the files to touch,
   and whether it is yours or Claude's to ship.
3. Commit and push the fixes doc to main.
4. Open Claude Code, open the feature branch, tell Claude to read the fixes
   doc and execute.
5. Claude ships each item: edits source, writes migrations, runs them,
   commits on the feature branch, fast-forwards to main, and pushes.
6. Railway picks up the push and deploys.

## Migrations

Every schema change lives in `drizzle/NNNN_description.sql`. The runner
tracks applied migrations in a `_migrations_applied` table so the same
file never runs twice.

Claude is authorized to run migrations:

```bash
npx tsx scripts/run-migration.ts --status
npx tsx scripts/run-migration.ts drizzle/0130_example.sql
npx tsx scripts/run-migration.ts --all
```

Watch for two known runner gotchas: no leading `--` comment on the first
line of a migration file (the splitter strips it and breaks the first
statement), and any column identifier that collides with a MySQL reserved
word (for example `maxValue`, which collides with the `MAXVALUE` partition
keyword) must be backticked.

## The ship gate

Before Claude marks anything done, two gates run:

```bash
python3 scripts/audit-truncation.py      # zero truncated source files
pnpm typecheck                            # exit code 0
```

On a UI-touching change, Claude also runs `pnpm dev` and verifies in a
browser. If any gate fails the work stays as CODED, never VERIFIED.

## Working with the ln- skills pipeline

The ln- skills in `~/.claude/skills/` are a structured delivery pipeline:
- `ln-1000-pipeline-orchestrator` — start a full feature from scope
- `ln-200-scope-decomposer` — break a big idea into epics and stories
- `ln-400-story-executor` — drive a single story through implementation
- `ln-500-story-quality-gate` — quality check before shipping

You don't need to memorize them. Say what you want in plain language and
Claude picks the right skill.

## Troubleshooting

**"Claude pushed to a feature branch but nothing deployed":** Railway
watches `main`, not feature branches. Fast-forward to main with
`git push origin claude/<branch>:main` or let Claude do it automatically.

**"The migration errored on a column I can see in the schema":** the
column name probably collides with a MySQL reserved word. Wrap it in
backticks in the INSERT column list.

**"`.env` is missing in the worktree":** the repo root has it. Copy it in
with `cp ../../../.env .env` before running a migration, then `rm .env`
after so it does not get committed.

## Where to ask for help

- Writing fixes docs: model them on the existing files at the repo root.
  `FIXES_TO_MAKE_2026-04-21_UI_BATCH.md` is a clean recent example.
- Questions about ReGen Civics the project: read `CLAUDE.md` at the repo
  root. Start with the "What This Project Is" section.
- Questions about the Hypha bridge (for anything touching on-chain work):
  `.ai/docs/HYPHA-BRIDGE.md` has the full flow.

Welcome aboard. This codebase is a living thing, grown by a distributed
community. The more you play with it, the better it gets for everyone.
