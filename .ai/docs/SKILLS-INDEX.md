# Skills Index

Catalog of the project's custom skills. Skills self-surface in Claude Code (each has its own `SKILL.md`), so this is a curated reference, not the authoritative source. Referenced from `/CLAUDE.md`. Process lives in the skills; facts live in `.ai/docs/`.

Project skills live in `.claude/skills/` (committed with the repo). Cross-project user skills live in `~/.claude/skills/`.

## Season management

- `regen-seasonal-roles` — generate / evolve / manage seasonal game roles. Produces updated gameRoles arrays, character art prompts, seasons arrays, and SEASONS_HISTORY entries. Use at each season transition. Templates and reference docs in the skill dir.

## Workflow + verification

- `regen-fixes-handoff` — produce `FIXES_TO_MAKE_*.md` docs with the canonical Handoff Breakdown table format and status vocabulary. Use whenever a fix is too complex for inline work.
- `regen-ship-gate` — the audit-truncation + className grep + typecheck protocol that must pass before any "VERIFIED" or "DONE" claim.
- `regen-do-everything` — autonomous end-to-end fix execution: diagnose, code, build-check, commit, push, verify live, report.
- `regen-database-sql` — patterns for MySQL on Railway, Drizzle ORM, seed scripts, migrations.
- `regen-railway-crons` — Railway HTTP cron setup and debugging. The `sh -c` shell-expansion fix, the silent-401 trap (curl exits 0 on 401), and the `${{"ReGenCivics.Earth".CRON_SECRET}}` secret reference. Use when adding or fixing any `/api/cron/*` cron.
- `regen-deterministic-first` — foundational rule for any autonomous or recurring behavior. Build a deterministic tool that runs without an LLM at zero token cost first; only call an agent for the genuinely nondeterministic part, on a schedule. Also a hard constraint in `STEERING.md` section 11.
- `regen-deploy-doctor` — Railway deploy failure triage: empty-CLI-log FAILED deploys (dashboard card via Chrome), instant fails (lockfile grep for dead tarballs), concurrent-push double failures. Mined from session memory 2026-07-17.
- `regen-windows-env` — environment recipes for Rye's Windows machine + Cowork sandbox: cross-env test runs, FUSE staleness, Desktop Commander patterns, worktree gate recipe. Mined from session memory 2026-07-17.
- `regen-skill-scout` — discover and install skills from the open ecosystem with a mandatory source-vetting gate (scripts, keys, instruction conflicts, context cost, fit). Adapted from `vercel-labs/skills` find-skills, vetted 2026-07-17. CLI installs stay gitignored per the skills-lock.json manifest policy.

## Research + intelligence

- `last30days` — full 30-day community research engine from `mvanhorn/last30days-skill` (installed 2026-07-17, v3.16.0, Rye-approved). Deterministic Python engine gathers Reddit/HN/web keyless, LLM synthesizes. **Keyless posture is a hard rule: never run its cookie or keychain setup scripts (setup-keychain.sh, setup-pass.sh, chrome/safari cookie extraction), never configure AUTH_TOKEN/CT0.** Session cookies are full account credentials; the ecosystem scanners rate this skill High Risk for exactly that machinery. If X/TikTok depth is ever wanted, use a SCRAPECREATORS_API_KEY, not cookies. Its output-format LAWs override our writing rules inside its own synthesis only (Rye-approved exception 2026-07-17). Installed via `npx skills add` so the directory is gitignored; `skills-lock.json` is the manifest and `npx skills install` regenerates it. The 14MB `assets/` demo media dir is safe to delete locally after install or update.
- `regen-last30` — lean keyless WebSearch fallback for community-pulse research when the full engine is unavailable (sandbox sessions, broken toolchain) or the topic only needs a light sweep. Engine behind the weekly capacity briefing.

## Game + seasons

- `regen-quest-builder` — full quest pipeline: questData entry, modal, hero image, PDF guide, forum seed post.

## Design + visuals

- `regen-form-design` — form readability, contrast, dark-mode rules.
- `regen-background-design` — page backgrounds (Gemini compositing + PageBackground wiring).
- `regen-character-art` — 13-role character illustrations (solarpunk-elven-jedi style, card + scene per role).

## Writing + content

- `regen-fundraising-copy` — investor pitch, grant, LOI, donor email, fund narrative.
- `regen-outreach-sequences` — email sequences, cold/follow-up, newsletter, drip campaigns.
- `regen-content-repurposing` — adapt long-form to Twitter, IG, LinkedIn, newsletter, forum, Discord.
- `regen-community-onboarding` — quest flows, welcome sequences, first-week experiences.
- `regen-release-notes` — turn commit batches / SHIPPED_LOG entries into player-facing release notes.
- `regen-event-blast` — cross-channel event announcements plus reminder sequences.
- `regen-landing-copy` — landing page architecture: hero, value prop, social proof, CTA, FAQ, A/B variants.
- `regen-comparison-pages` — honest "alongside SEEDS / Hypha / Regen Network / Gitcoin" pages, no-strawman framing.
- `regen-seo-audit` — technical SEO audit: meta tags, OG/Twitter cards, JSON-LD, sitemap, internal links.
- `regen-investor-deck` — 14-slide pptx deck builder with Fund vs. Game framing, traction, ask, use of funds.
- `regen-incubator-review` — 6-dimension rubric for reviewing land project applications.

## External integrations

- `hypha-pr-workflow` — automation for hypha-web PRs (CM6 editor, file commits, CodeRabbit responses). Used from GitHub account `Rieki777`. See `HYPHA-BRIDGE.md` for the bridge itself.

## ln- delivery pipeline (in `~/.claude/skills/`)

For structured large-feature builds:

- `ln-1000-pipeline-orchestrator` — kick off full feature delivery.
- `ln-200-scope-decomposer` — break down large features or projects.
- `ln-210-epic-coordinator` / `ln-220-story-coordinator` — planning phases.
- `ln-400-story-executor` / `ln-401-task-executor` — implementation.
- `ln-500-story-quality-gate` — quality check before shipping.
