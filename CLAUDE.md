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

These files define all outstanding work for this project. Always check them before starting any implementation:

- `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` — **active** execution prompt. Recording flow fixes, Zapier data normalization, map illustration production integration, and email opt-in preference.
- `QUALITY_SPRINT_9_10.md` — quality sprint backlog. Performance, security, and code quality targets.
- `ReGenCivics_WelcomeAboard_Brief.md` — full content brief for the Welcome Aboard Quests: all 10 quest cards, forum post bodies, seed comments, and implementation plan.
- `PROGRESS_MAP_DESIGN.md` — full spec for the interactive progress map component (illustrations done, component build is next).
- `QUEST_PROGRESSION_SPEC.md` — quest locking and progression system. Unlock chain, visual states, component changes, useQuestUnlocks hook.
- `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` — **active** execution prompt. Map performance optimization, quest hero image generation, dissolve page transitions.
- `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` — **active** execution prompt. Quest locking UI, hero quest cards, season progress ring. Depends on MAP_PERF running first.
- `FIXES_TO_MAKE_2026-03-29.md` — **active** fixes batch. 22 fixes (original 17 + 5 added 2026-03-31). Fixes 1-9, 11, 13, 16 completed in commit 490518c. Fixes 18-22 added from Cowork session: feature suggestions redesign, community cards, forum edit images, forum templates, LOI routing.
- `FIXES_TO_MAKE_2026-03-30.md` — **active** fixes batch. Profile avatar sync, R2 image proxy, settings reorganization.
- `FIXES_TO_MAKE_2026-03-31.md` — **active** fixes batch. Quest hero images, locking UI, progression gating, CTA replacements. All CODED.
- `CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md` — **active** execution prompt. Remaining fixes: 10 (profile overhaul), 14 (glossary propose UI), 15 (feature suggestions page), 17 (quest locking audit). Fix 12 DONE.
- `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` — **START HERE.** Unified execution prompt consolidating ALL specs (game system, citizenship tiers, economy pages, social sharing, fixes, visualizations) into one build plan with 7 tracks. Resolves 10 cross-spec conflicts. Includes Social Sharing system (Track 7). Supersedes MEGABATCH and all prior execution prompts. Created 2026-04-01.
- `CLAUDE_CODE_PROMPT_2026-03-31_MEGABATCH.md` — **SUPERSEDED by UNIFIED_BUILD.** Kept for reference.
- `SOCIAL_SHARING_SPEC.md` — **active** spec, **included in UNIFIED_BUILD as Track 7.** Full social sharing optimization system: 12 initiatives across static OG images, dynamic image generation (satori), share prompts, referral tracking, viral loops, embeddable widgets. Go-to-market audience building infrastructure.
- `PLAYER_EXPERIENCE_SPEC.md` — **SUPERSEDED by REGEN_GAMES_SPEC_V1.md.** Original draft of player experience features. Kept for reference only.
- `REGEN_GAMES_SPEC_V1.md` — **THE GAME SPEC. START HERE for all game features.** Complete game system: Game Variables admin architecture, percentile-based contribution scoring, trust multiplier system, Living Tree visualization, gratitude system, land project status progression, seasonal harvest/composting, seasonal councils, endorsements/flags with cascading consequences, contribution compass, mycelium network, proof timeline, resume, gated quests, bioregional identity, forum reputation weighting, co-creator invitations, quiet recognitions, silent sharing score. 24 features across 5 phases with full database schema and compatibility notes. Built on SEEDS architecture, adapted for ReGen Civics.
- `LIVING_TREE_VISUALIZATION_SPEC.md` — Detailed visual concept for the Living Tree growth visualization on player profiles. 6 life stages, 9 root arteries (forms of capital), seasonal mechanics, visual-to-data mapping. Referenced by REGEN_GAMES_SPEC_V1.md Part 3.
- `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` — **GAME BUILD.** Full execution prompt for building the entire ReGen Games system (all 5 phases, 24 features) in one consecutive run. References REGEN_GAMES_SPEC_V1.md as the single source of truth.
- `SITE_IMPROVEMENT_BRIEF_SEEDS_VISION.md` — **CONTENT DIRECTION.** How the Game section should be reframed as co-creating a regenerative economic system. Based on Rye's 7 SEEDS Medium articles. Covers quest entry redesign, Play page improvements, new "Economy" page, site-wide language shifts, content pieces to write. The core hook: "if enough of us play the Game, it's real."
- `DRAFT_GAME_AND_ECONOMY_PAGES.md` — **ACTIVE BUILD SPEC.** Full copy and technical spec for /economy page, /local-food-economy page, /game additions, and site-wide "if enough of us play" hook. Includes economic upgrade suggestion voting feature, food producer application flow, SEEDS complementary path framing, bioregional seasons roadmap. v4.
- `SEEDS_WHITE_DECK_SYNTHESIS.md` — Synthesis of the 155-page SEEDS White Deck. 10 missing concepts, 20 food movement ideas, broader game/economy ideas, storytelling improvements. First-pass analysis before the full spec.
- `SEEDS_VISION_IMPLEMENTATION_SPEC.md` — **SEEDS ECONOMIC VISION. READ ALONGSIDE REGEN_GAMES_SPEC_V1.md.** 33 features across 7 groups translating the SEEDS economic design into ReGen Civics. Citizenship tiers (Explorer/Co-Creator/Steward/Sage), gratitude trust graph multipliers, Game Mechanics page with simulator, proposals system with weighted voting, BFF governance, LocalScale/Hypha integration, food economy infrastructure, seasonal protocols (solstice/equinox + lunar cycles). Includes gap analysis with 5 decisions for Rye and 3 missing calculations to define. Two copy deliverables: Day in the Life walkthrough and first-person SEEDS origin story.
- `CITIZENSHIP_TIERS_SPEC.md` — **CITIZENSHIP TIERS. Standalone reference.** Four-tier system (Explorer/Co-Creator/Steward/Sage) with full requirements, powers, Game Variables, grace period demotion, trust graph mechanics, admin controls, database schema, and quick-reference power comparison table. Extracted from SEEDS_VISION_IMPLEMENTATION_SPEC.md for easy reference.
- `FIXES_TO_MAKE_2026-04-01.md` — **active** fixes batch. 7 fixes: admin-gate My Submissions, notification toggle visual, On-Chain Tracking links, Cultivator rename, OG description, Quest 8 experience text, background image.
- `FIXES_TO_MAKE_2026-04-03.md` — **active** fixes batch. 7 fixes: crowdpooling button visibility, ClaimSeeds inline signup form, ClaimSeeds form readability, landing page video inline playback, forum post broken image fallback, "community socials" text fix, Cowork referral link integration across builder content.
- `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` — **active** execution prompt. Part A: 7 fixes from screenshots. Part B: Full citizenship tier foundation build (schema, migrations, seeds, nightly batch job, tier checker, admin UI, profile display).

- `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md` — **active** execution prompt. Full Team page overhaul: 13 sociocratic game roles with powers/rights/responsibilities/token awards, role portal cards with character illustrations, seasonal rhythm section (Winter/Spring/Summer/Fall), application pitch process, CSS shimmer animations. References CHARACTER_ART prompt for image generation. Roles renamed: Lead Builder -> Grand Builder, Quest Author -> Quest Steward. Each role has characterName (e.g., "The Gardener") and tagline.
- `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` — **active** execution prompt. Generate 26 character illustrations (13 card portraits + 13 full scenes) via nano-banana-pro/Gemini. Detailed per-character descriptions, style guide, prompt templates, WebP conversion. Run before or alongside TEAM_ROLES.
- `CLAUDE_CODE_PROMPT_2026-04-02_FORM_READABILITY.md` — **active** execution prompt. ClaimSeeds dark-mode overhaul, site-wide form audit, base UI component fixes, post-submit notifications, profile SEEDS Claim card, navigation menu updates.
- `CLAUDE_CODE_PROMPT_2026-04-02_MENU_RESTRUCTURE.md` — **active** execution prompt. Desktop dropdown restructure (4 groups), mobile nav, Economy item, footer updates.
- `CLAUDE_CODE_PROMPT_2026-04-03_COMPENSATION_AND_SCORECARD.md` — **active** execution prompt. 7-band compensation system ($0.01/token), Seed/Harvest bonus model (+30% for both, +15% for one), deliverables and hours per role, Role Variables section on Team page, Season Scorecard section, compensation bands table. Run AFTER TEAM_ROLES (extends the gameRoles data).

All older prompt and fixes docs have been archived to `archive/`. Do not reference them for new work.

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