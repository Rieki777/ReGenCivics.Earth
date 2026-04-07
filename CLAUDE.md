# regen-civics — Project Context for Claude

## What This Project Is
regen-civics is a **fund and an in-real-life game** for supporting regenerative land projects and the Regenerative Renaissance — a movement to heal ourselves, our earth, our communities, and our bioregions. We create quests and games that help people heal, and in doing so build new financial, economic, and governance systems that support and network land projects across the movement.

**Current priorities:**
1. Website — getting it up and polished
2. Fundraising — raising funds for the regen-civics fund
3. Incubator — attracting quality land projects to apply for the next season

**Stage:** Active / building — running incubator seasons, fundraising live

## Team
Community of contributors. Distributed, non-hierarchical, movement-style. Rye leads and holds the vision.

## Tech Approach
Mixed — some code, some not. This is part software project, part community organizing infrastructure, part game design. Solutions should be practical and accessible, not just technically elegant.

## Tech Stack (code portions)
- [CUSTOMIZE: Frontend — e.g., Next.js, React, plain HTML]
- [CUSTOMIZE: Backend — e.g., Node.js, Python, Webflow, no-code]
- [CUSTOMIZE: Database / CMS — e.g., Supabase, Airtable, Notion]
- [CUSTOMIZE: Hosting — e.g., Railway, Vercel, Netlify]
- Google Workspace (Docs, Sheets, Drive, Gmail) — primary collaboration layer
- GitHub — code versioning and issues

## Repository Structure
[CUSTOMIZE: brief description of folders, e.g.:]
- `src/` or `app/` — main application code
- `docs/` — documentation, game specs, incubator materials
- `public/` or `static/` — assets, images, website files

## Conventions
- [CUSTOMIZE: language/framework style guide if applicable]
- [CUSTOMIZE: commit style, e.g., conventional commits]
- Plain language in all docs — written for community members, not just developers

## Core Concepts (read before writing any content)

- `CONTEXT_THE_TWO_GAMES.md` — **essential context on the Fund vs. Game distinction.** Read this before writing anything about governance, finance, tokens ($RCivics vs $ReGen), or the two-sided structure of ReGen Civics. The Fund (RCVoice / $RCivics) is anchored in the old Game; the Game (RGVoice / $ReGen) is anchored in the new Games. They work together as two sides of a bridge. This distinction shapes all copy, posts, and design decisions.

## Planning Documents (read before implementing)

**START HERE: `REMAINING_WORK_2026-04-07.md`** — consolidated list of everything outstanding across the 10 remaining active docs, priority-tagged. Created during the 2026-04-07 cleanup pass that archived 17 fully-shipped planning docs.

### Active execution prompts (10)

- `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` — **master build plan.** 7-track consolidated build covering database foundation, seeds, backend routers, citizenship tiers, frontend pages, visualizations, and social sharing. Resolves cross-spec conflicts. Start here for any Track 1-7 work.
- `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` — **current sprint.** CTO hardening items (C1-C3, H1-H10, M1-M12) + Round 2 Safari walkthrough fixes (R2-1 to R2-21) including music player, song submissions, fund role illustrations, and heal-the-land seeds.
- `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` — **40 illustrations to generate.** 26 game role images + 14 fund role images via `nano-banana-pro`. Zero currently in `public/images/roles/`. Paths already referenced in `gameRoles.ts`.
- `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` — citizenship tier foundation. Migrations 0098-0100 shipped. Remaining: nightly batch job, tier checker, admin UI, profile display, homepage background images.
- `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` — map performance + quest hero image generation + dissolve page transitions.
- `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` — quest locking UI. Core components shipped; verification audit still pending against `QUEST_PROGRESSION_SPEC.md`.
- `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` — recording flow: Zapier normalization, `recordings.ts` tRPC router, Watch Replay button, opt-in email preference.
- `CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md` — remaining older fixes: 10 (profile overhaul), 14 (glossary propose UI), 15 (feature suggestions), 17 (quest locking audit).
- `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` — **reference spec.** Full 5-phase game system build prompt. Overlaps with UNIFIED_BUILD; use as reference, build incrementally.
- `FIXES_TO_MAKE_2026-03-29.md` — original 22-fix batch. Referenced by other active docs for individual fix specs.

### Standing specs (always-on references)

- `CONTEXT_THE_TWO_GAMES.md` — **essential context** on Fund vs. Game distinction (already above).
- `REGEN_GAMES_SPEC_V1.md` — **the game spec.** 24 features across 5 phases. Single source of truth for game features.
- `SEEDS_VISION_IMPLEMENTATION_SPEC.md` — SEEDS economic vision translated to ReGen Civics. Read alongside REGEN_GAMES_SPEC_V1.
- `CITIZENSHIP_TIERS_SPEC.md` — standalone reference for the 4-tier citizenship system.
- `LIVING_TREE_VISUALIZATION_SPEC.md` — Living Tree visual concept.
- `SOCIAL_SHARING_SPEC.md` — social sharing optimization (included in UNIFIED_BUILD Track 7).
- `DRAFT_GAME_AND_ECONOMY_PAGES.md` — `/economy` and `/local-food-economy` page copy + tech spec.
- `SITE_IMPROVEMENT_BRIEF_SEEDS_VISION.md` — content direction for Game section reframing.
- `QUEST_PROGRESSION_SPEC.md` — quest locking and unlock chain reference.
- `PROGRESS_MAP_DESIGN.md` — interactive progress map component spec.
- `ReGenCivics_WelcomeAboard_Brief.md` — Welcome Aboard Quests content brief.
- `SEEDS_WHITE_DECK_SYNTHESIS.md` — SEEDS White Deck synthesis.
- `QUALITY_SPRINT_9_10.md` — quality sprint backlog.
- `PLAYER_EXPERIENCE_SPEC.md` — superseded by REGEN_GAMES_SPEC_V1, kept for reference.

17 fully-shipped or superseded planning docs were moved to `archive/` on 2026-04-07. Do not reference them for new work.

## Living Records

- `SEASONS_HISTORY.md` — **index** of all seasons with compensation bands, cross-season tracking table, and links to per-season detail files. Updated each season by the `regen-seasonal-roles` skill.
- `seasons/season-1-the-first-build.md` — Full detail for Season 1. All 13 roles with bands, Seed/Harvest metrics, deliverables, character art descriptions, and blank scorecard for Season Festival.
- Future seasons: `seasons/season-N-name.md` pattern.

## Custom Skills (in `skills/` directory, install to `~/.claude/skills/`)

- `skills/regen-seasonal-roles/` — Skill for generating, evolving, and managing seasonal game roles. Produces updated gameRoles arrays, character art prompts, seasons arrays, and SEASONS_HISTORY entries. Use at each season transition. Includes templates and reference docs.

## Database Migrations

**Always use the migration runner script to apply SQL migrations.** Do not write ad-hoc Node.js scripts to run SQL.

```bash
# Run a specific migration
npx tsx scripts/run-migration.ts drizzle/0101_regen_tools_library.sql

# Run ALL unapplied migrations (in order)
npx tsx scripts/run-migration.ts --all

# Check which migrations have been applied
npx tsx scripts/run-migration.ts --status
```

The script:
- Connects via DATABASE_URL from .env
- Tracks applied migrations in a `_migrations_applied` table (idempotent)
- Splits SQL properly (handles multi-line INSERTs)
- Skips already-applied migrations
- Reports results

Migration files live in `drizzle/` and follow the pattern `NNNN_description.sql` (e.g., `0101_regen_tools_library.sql`).

For Drizzle ORM schema changes (generating migrations from schema.ts): use `npm run db:push` which runs `drizzle-kit generate && drizzle-kit migrate`.

## Installed Skills (ln- pipeline)
This project uses a structured delivery pipeline via the ln- skills (in ~/.claude/skills/):
- `ln-1000-pipeline-orchestrator` — kick off full feature delivery
- `ln-200-scope-decomposer` — break down large features or projects
- `ln-210-epic-coordinator` / `ln-220-story-coordinator` — planning phases
- `ln-400-story-executor` / `ln-401-task-executor` — implementation
- `ln-500-story-quality-gate` — quality check before shipping

## Key Constraints
- Accessibility matters — outputs must work for people outside tech circles
- Community-first — language and tools should feel welcoming, not gatekeeping
- Lean operations — practical and sustainable over complex and impressive
- Regenerative values — the work should embody healing, reciprocity, long-term thinking
- **Maximum autonomy** — Rye is holding a lot. Do as much as possible without asking. Only surface tasks to Rye when there is literally no way to proceed without human input. When a `[HUMAN]` step is unavoidable, complete everything else first, then ask for only the minimal required input. Try things before asking permission. Prefer attempting and reporting over asking whether to attempt.

## Writing Rules (apply to ALL user-facing copy, docs, forum posts, emails, and markdown files)

These are hard rules. Not guidelines. Every piece of content produced for this project must pass all of them before it ships.

### RULE 1: No em-dashes. Zero.
Em-dashes (—) are banned in all content. Not "use sparingly." Not "one per page." Zero. Replace with a comma, a period, a colon, or rewrite the sentence entirely.
- Wrong: "This is the seed thread — share what you made."
- Right: "This is the seed thread. Share what you made."

### RULE 2: No contrast-framing.
Never define something by what it isn't. This pattern takes many forms and all of them are banned:
- "This is not X, this is Y."
- "Seed content is not marketing. It's genuine participation."
- "Players do quests. Co-creators design them." (parallel contrast implying lesser/greater)
- "Not just X, but Y."
- "Less X, more Y."
- "This isn't about X, it's about Y."

Rewrite to state what the thing IS. Lead with the affirmative.
- Wrong: "Seed content is not marketing. It's genuine participation."
- Right: "The best seed content comes from someone who has actually done the quest and written something real about it."

### RULE 3: No AI word patterns.
Banned words and phrases: "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion", "embark on", "vibrant", "crucial", "groundbreaking", "transformative journey", "testament to", "beacon of", "foster", "nurture" (as metaphor), "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge", "empower", "utilize", "navigate" (as metaphor).

### RULE 4: No rhetorical question openers.
Don't introduce sections with "What if we could...?" or "Have you ever wondered...?" Start with the thing itself.

### RULE 5: No passive inspiration.
"Join us on this journey," "be part of something bigger," "together we can" — these are vague filler. Say something specific instead.

### Voice
Direct, grounded, specific. Write as if a thoughtful person inside the regen movement wrote it. Rye's voice. First person is fine. Contractions are fine. Short sentences are fine. The site currently sounds like Rye. Keep it sounding like Rye.

## About Rye
Founder, movement builder, tool designer. Engagement will be extremely diverse — writing, fundraising, ga