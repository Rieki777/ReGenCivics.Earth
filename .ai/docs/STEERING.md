# STEERING: Hard Constraints

Load this file first on every agent session. Everything here is non-negotiable. If a request appears to conflict with a constraint here, surface the conflict to Rye before proceeding.

Last reviewed: 2026-04-25.

---

## 1. Writing rules (apply to ALL user-facing copy)

These are reproduced from `/CLAUDE.md` Writing Rules section. They apply to forum posts, page copy, emails, marketing, social, every string a player will read. They DO NOT apply to JSDoc comments or internal logs (those are technical, not user-facing).

### 1.1 No em-dashes
Em-dashes (`-`) are banned in all user-facing content. Zero. Replace with comma, period, or rewrite. This is also Rye's user-global rule (`~/.claude/CLAUDE.md`).

### 1.2 No contrast framing
Banned: "not X, but Y", "not just X, it's Y", "less X, more Y", "this isn't about X, it's about Y", parallel contrast implying lesser/greater. Lead with the affirmative.

### 1.3 No AI word patterns
Banned vocabulary: delve, tapestry, foster, leverage, "it's worth noting", "in conclusion", embark, vibrant, crucial, groundbreaking, "transformative journey", "testament to", "beacon of", nurture (as metaphor), unlock, unleash, seamless, robust, comprehensive, "cutting-edge", empower, utilize, navigate (as metaphor), genuinely (hedge), honestly (hedge), straightforward.

### 1.4 No rhetorical question openers
Don't open with "What if we could…?" or "Have you ever wondered…?". Start with the thing itself.

### 1.5 No passive inspiration
Banned: "join us on this journey", "be part of something bigger", "together we can". Say something specific instead.

### 1.6 Voice
Direct, grounded, specific. Rye's voice. First person + contractions are fine. Short sentences are fine.

---

## 2. Maximum autonomy default

Project-level rule from `/CLAUDE.md`: "Do as much as possible without asking. Only surface tasks to Rye when there is literally no way to proceed without human input."

Concrete:
- Don't ask about token-mapping decisions when context makes the answer obvious. ($ReGen for gratitude credits, not RGVoice. RGVoice is the votes token.)
- Don't ask about architectural choices with one clearly-correct option (use existing `hyphaBridges` table; don't invent a new one).
- Don't ask about tool recovery (FUSE git lock blocks commit → use plumbing path).

Times TO ask (use `AskUserQuestion`, max 4 questions, mark recommended option `(Recommended)`):
- 3+ defensible architectural options exist
- A choice would meaningfully shape the data model
- Voice direction has a stylistic fork that needs Rye's call

---

## 3. Ship gate: MANDATORY before any "VERIFIED" or "DONE" claim

Three gates from `/CLAUDE.md`:

```bash
pnpm gate                                           # gates 1 + 3, on any platform
rg -g '*.css' '<className-you-added>' client/src/   # gate 2: any new className must have CSS
```

`pnpm gate` (scripts/gate.mjs) runs the truncation audit and the typecheck, and
locates a working Python itself. By hand it is `py scripts/audit-truncation.py`
on Windows / `python3 …` on the cowork VM, plus `pnpm check`.

Until 2026-07-16 this block read `python3 …` + `pnpm typecheck`. `typecheck` was
a script that had never existed (the real one is `check`), and on Windows
`python3` is a Store stub that exits 0 *without running the audit*. Both were
copied into 30+ prompt docs from here, and both failed silently for three months
because each session quietly substituted a working command instead of fixing the
source. Third trap for the list below: **a gate you must translate before running
is a gate that eventually gets skipped.**

Plus, for any FIXES_TO_MAKE row marked DONE / VERIFIED, the Evidence column must contain file:line, grep result, screenshot path, or script output line. No evidence = stays `CODED`.

Two traps when the gate involves tests:

- **The DB-backed suites need a real `DATABASE_URL`**, or `skipIfNoDb` skips them and vitest still reports green. "4 passed" can mean "4 skipped the part you changed". Check the skip count, not just the exit code. Also unset `NODE_ENV` first (`NODE_ENV= pnpm vitest ...`).
- **They run against the shared dev database, so they flake when two sessions run at once.** They create and delete real rows. On 2026-07-16 two contribution tests failed mid-session and passed on a clean re-run with no code change in between. Before believing a DB-suite failure, re-run it alone; before believing a pass, make sure it wasn't skipped.

This exists because on 2026-04-18 an audit of commit `b06b7aa` found 5 of 13 fixes marked "resolved" were false (className added, CSS missing) and 15 source files on disk were truncated mid-statement. Don't ship that pattern again.

---

## 4. Verify on production after every load-bearing deploy

Working-style memory has the canonical version. Summary:

- "Code looks right" / "tests pass" is not enough. Multiple times fixes have landed in code but not taken effect for Rye on iPhone Safari (FAB position, sign-in OAuth). Always navigate to the live URL via Claude in Chrome and reproduce the user flow.
- For load-bearing changes (auth, tokens, payments, webhooks): mandatory.
- For visual tweaks: recommended.
- Pattern: `mcp__Claude_in_Chrome__navigate` to regencivics.earth → perform user action → screenshot → confirm fix is live. If broken in production despite correct code: diagnose (deploy rebuilt? CDN cache? file truncated? deeper bug?) before more code lands on top.

---

## 5. Token model: private-first, claim bridge to public

From `/CLAUDE.md`. Four absolute rules for every economic feature:

1. **Reads (game logic) use TOTAL = private + public.** Contribution scores, voice weight, citizenship tiers. Use `playerProfiles.getMyTokens` (`{ public, private, total }`).
2. **Writes (credits AND debits) only touch the private ledger.** Through `db.creditPrivateTokens({ userId, tokenType, amount, source, sourceRef, description })`. Public balance is never written from server code; it changes only when chain emits a Transfer that the Alchemy webhook reconciles.
3. **Spend limit checks use PRIVATE only.** Even if user has plenty on-chain, public can't be deducted by server (one-way flow).
4. **One-way flow private → public.** Tokens move private→public when user claims via Hypha redeem-tokens. Once on chain, they live there. No re-entry to private.

Token contracts on Base (chain id 8453):
- `$REGEN`: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics`: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`
- `RGVoice`: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`
- `RCVoice`: not yet deployed

---

## 6. Hypha bridge: only one path off-platform

Anytime a player moves from ReGen Civics to Hypha to act on-chain, the handoff MUST go through the Hypha Bridge module (`apps/web/src/lib/hypha-bridge/`). Don't hand-roll redirect logic. Extend the bridge with the new intent type instead.

Spec: `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`.

---

## 7. Cowork VM quirks

From `~/.claude/memories/cowork-vm-quirks.md`. Top issues:

- **FUSE silent truncation**: after Edit/Write on long files, content can be cut. Always run `python3 scripts/audit-truncation.py` after meaningful edits. Restore via `git show HEAD:path > /tmp/restore && cp /tmp/restore path` (NOT `git checkout`: FUSE blocks unlink).
- **Stuck `.git/index.lock`**: bypass with `GIT_INDEX_FILE=/tmp/index-X` workaround. Commit via `git commit-tree` plumbing.
- **`tsx` broken on the VM**: pnpm-installed esbuild is Windows-only binary. Use `npm install mysql2` in `/tmp/migrate-tool/` and a `.cjs` runner (pattern in `scripts/run-riverside-migration.cjs`).
- **Push from VM fails**: no GitHub credentials. Always commit locally; Rye pulls + pushes from Windows.
- **Mixed line endings**: ~600 files show as modified due to CRLF/LF mismatch. Real changes are spotted via `git diff <file>` showing actual content diff vs whole-file rewrite.

---

## 8. Auto-archive convention for dated docs

From working-style memory:

- Anything in repo root with a date in the filename (`CLAUDE_CODE_PROMPT_YYYY-MM-DD_*.md`, `FIXES_TO_MAKE_YYYY-MM-DD*.md`, `REMAINING_WORK_YYYY-MM-DD.md`) older than 1 week → moves to `archive/`.
- **Spec / reference docs stay in root** even when older. A doc is a "spec" if it captures style direction, design rules, or canonical reference material. Heuristic: opens with "Generate / produce / build with these rules" → spec, keep. Opens with "READ THIS FIRST / Pick up from Push 1 / Skip nothing" → implementation prompt, archive.

---

## 9. Commit + push protocol

- Commit per logical batch with descriptive messages. Don't pile every fix into one commit.
- **Commit by pathspec, not by index: `git commit -m "..." -- path/one path/two`.** "Targeted `git add`" is NOT enough protection when a concurrent session is running. The index is shared: another session can stage its own files at any moment, and `git commit` then sweeps them into your commit no matter how careful your own `git add` was. This is not hypothetical, it happened on 2026-07-16: a db.ts refactor commit silently swallowed 12 unrelated files (webp assets, CustomGames.tsx, a docs manifest) that the other session had staged. Caught before the push; the fix was `git reset --soft HEAD~1` then re-commit with a pathspec, which also leaves the other session's staged files exactly as they were.
- Always print `git show --stat --oneline HEAD` after committing and confirm the file list is only yours. Do it before pushing, while `reset --soft` is still cheap.
- Cowork VM cannot push. Always end with the unpushed commit list (sha + subject) and the Windows push command for Rye.
- After commit, run `git fetch origin && git log origin/main..main --oneline` to verify what's actually unpushed (Rye pushes between turns; local view goes stale).
- Per `~/.claude/memories/rye-working-style.md`: unpushed list goes in chronological order, oldest first, in the Claude Code handoff prompt.

---

## 10. Skills are first-class

When making a deliverable that has a matching skill, USE the skill. Skills are in:
- `.claude/skills/` (project-specific, committed)
- `~/.claude/skills/` (cross-project user skills)

Most-used:
- `regen-fixes-handoff`: produce FIXES_TO_MAKE docs
- `regen-ship-gate`: the audit-truncation + className grep + typecheck protocol
- `regen-do-everything`: autonomous end-to-end fix execution
- `regen-database-sql`: MySQL on Railway, Drizzle patterns
- `regen-fundraising-copy`, `regen-outreach-sequences`, `regen-content-repurposing`, `regen-community-onboarding`: voice-matched writing
- `regen-seo-audit`, `regen-release-notes`, `regen-comparison-pages`, `regen-landing-copy`, `regen-event-blast`, `regen-investor-deck`, `regen-incubator-review`, `regen-character-art`: added 2026-04-25
- `regen-form-design`, `regen-background-design`: visual / UX work
- `hypha-pr-workflow`: for hypha-web PR contributions

Full list: see CLAUDE.md "Installed Skills" section.

---

## 11. Deterministic-first for autonomous behavior

Before building any autonomous or recurring behavior (agent, automation, cron, scheduled task, anything that runs more than once), split it into deterministic and nondeterministic parts.

- Deterministic part: write a plain tool that runs without an LLM. Spend tokens once to build it, then run it forever at zero token cost. Wire it to a schedule yourself.
- Nondeterministic part: the only place an agent or LLM call belongs. Keep it as small as possible. Call it on a schedule, only for the judgment it needs.

Default to the tool. If the whole task is deterministic, there is no agent, just a tool that runs free. If a step is left unattended, the deterministic tool keeps running on its own; the agent only wakes on its schedule for the part that truly cannot be deterministic.

The coordination engine already follows this: the YouTube poll, role reconciliation, stale-claim sweep, upload, and publish writes are deterministic crons and server code at zero token cost; only the transcript-understanding step spends tokens.

Full reasoning and the decision checklist: the `regen-deterministic-first` skill.

---

## What is NOT a hard constraint

The following are preferences, not steering rules. They live in `.ai/docs/DECISIONS.md` (architectural choices) or in skills (process):

- Choice of UI library (shadcn/ui via Radix). Documented in DECISIONS, not steering.
- Forum schema specifics. Documented in CLAUDE.md.
- Deploy target (Railway). Documented in DECISIONS.
- Color palette / brand colors. Documented in skills + design specs, not steering.
