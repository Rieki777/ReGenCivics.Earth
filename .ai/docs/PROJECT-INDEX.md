# Project Index: standing specs, planning docs, living records

Annotated index of the project's reference docs. Referenced from `/CLAUDE.md`. `SHIPPED_LOG.md` is the rolling record of what has shipped; this file is the map of the always-on reference material. Where each kind of doc lives is set by `STEERING.md` section 8.

## Where docs live

- **Root:** the standard repo files, `CLAUDE.md`, `SHIPPED_LOG.md`, and the canonical docs listed below.
- **`docs/planning/`:** specs, plans, audits, briefs, research, outreach drafts, Rye's task lists, and active `CLAUDE_CODE_PROMPT_*.md` / `FIXES_TO_MAKE_*.md` docs. Flat, filenames unchanged.
- **`docs/`:** developer reference (setup, deployment, design system, as-built maps).
- **`archive/`:** shipped or superseded prompts, fixes docs and handoffs. Don't reference for new work.

## Planning flow

- `SHIPPED_LOG.md`: rolling index of past sprints, fixes batches, and execution prompts. Each entry summarizes what shipped and points at the source doc. Read it first when picking up new work.
- Active sprint work lives in `docs/planning/` as `CLAUDE_CODE_PROMPT_*.md` or `FIXES_TO_MAKE_*.md`. When the work is done, the file moves to `archive/` and a one-paragraph entry goes to the top of `SHIPPED_LOG.md`.
- Auto-archive (`STEERING.md` section 8): any dated prompt or fixes doc older than one week moves to `archive/`. Standing specs (style guides, design tokens, component specs) stay in `docs/planning/` at any age.

## Canonical docs (root)

- `CONTEXT_THE_TWO_GAMES.md`: **essential context** on the Fund vs. Game distinction. Read before writing anything about governance, finance, or tokens. For the cooperative's wording, `shared/fund.ts` (`COOP`) wins.
- `REGEN_GAMES_SPEC_V1.md`: **the game spec.** 24 features across 5 phases. Single source of truth for game features.
- `SEASONS_HISTORY.md` and `SEASON_TEMPLATE.md`: see Living records.
- `AI_VISIBILITY_LOG.md`: bi-weekly AI answer-engine visibility record, appended by the `regen-ai-visibility-panel` scheduled task.
- `anastasia_canon.md`, `yeshua_canon.md`: verbatim source texts for the elder corpus (`scripts/build-elder-corpus.ts`, `scripts/scrape-yeshua-canon.py`).
- `ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md`: source of truth for the ship terms copy (`shared/shipTerms.ts` mirrors it).
- `CROWDPOOL*.md`, `CROWDPOOLING*.md`: crowdpooling plans and specs. In the root while the crowdpool lane has them open, then `docs/planning/`.

## Standing specs (always-on references)

- `docs/EVOLUTION-ENGINE.md`: **how the game evolves itself.** The as-built map of the Assembly + Evolution Engine: the full ratification flow, what is live (Rung 1, machine ratification), what is built dark (Rung 3 auto-ship), and the remaining steps to full autonomy. Read BEFORE touching `server/lib/evolution*`, `server/lib/ratification.ts`, the hypha-bridge webhook receiver, or the assembly workflows.
- `docs/planning/ASSEMBLY_PAGE_SPEC.md`: the Assembly + Evolution Engine build spec (V2). Phases 1-6 shipped; design source of truth for what is not yet built. Locked decisions in §15 are not re-litigated without Rye; ADR-27/28/29 record the load-bearing choices.
- `docs/planning/SEEDS_VISION_IMPLEMENTATION_SPEC.md`: SEEDS economic vision translated to ReGen Civics. Read alongside `REGEN_GAMES_SPEC_V1`.
- `docs/planning/CITIZENSHIP_TIERS_SPEC.md`: standalone reference for the 4-tier citizenship system.
- `docs/planning/QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`: standing spec for paths, portals, citizenship tiers and the three rings. Supersedes the tier criteria in `docs/planning/CITIZENSHIP_TIERS_SPEC.md` and the unlock chain in `docs/planning/QUEST_PROGRESSION_SPEC.md` for new work.
- `docs/planning/QUEST_SYSTEM_EVOLUTION_SPEC.md`: the Living Quest Board (v1.2), built on the path progression spec.
- `docs/planning/QUEST_PROGRESSION_SPEC.md`: quest locking and unlock chain reference; still authoritative for the Rites' content and forum-post pattern.
- `docs/planning/GRATITUDE_SYSTEM_SPEC.md`: canonical gratitude mechanic, reconciled with the code on 2026-07-28. Companions: `docs/planning/GRATITUDE_SYSTEM_OVERVIEW.md`, `docs/planning/GRATITUDE_AUDIT_2026-07-28.md`, `docs/planning/GRATITUDE_TAB_BUILD_SPEC.md`.
- `docs/planning/BOUNTY_VALUATION_ENGINE_SPEC.md`: canonical design for how a bounty's token reward is set. `docs/planning/BOUNTY_ENGINE_SPEC.md` is the engine it feeds.
- `docs/planning/MOBILE_FIRST_MASTER_PLAN.md`: rationale and phase history behind `STEERING.md` section 12.
- `docs/planning/LIVING_TREE_VISUALIZATION_SPEC.md`: Living Tree visual concept.
- `docs/planning/SOCIAL_SHARING_SPEC.md`: social sharing optimization (included in UNIFIED_BUILD Track 7).
- `docs/planning/SITE_IMPROVEMENT_BRIEF_SEEDS_VISION.md`: content direction for Game section reframing.
- `docs/planning/PROGRESS_MAP_DESIGN.md`: interactive progress map component spec.
- `docs/planning/ReGenCivics_WelcomeAboard_Brief.md`: Welcome Aboard Quests content brief.
- `docs/planning/SEEDS_WHITE_DECK_SYNTHESIS.md`: SEEDS White Deck synthesis.
- `docs/planning/PLAYER_EXPERIENCE_SPEC.md`: superseded by `REGEN_GAMES_SPEC_V1`, kept for reference.
- `docs/planning/CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md`: **visual style guide.** Full prompts and style direction for all 13 role character illustrations. Solarpunk / solarpunk-elven-jedi aesthetic, card vs scene format, image gen specs. Reference any time character art or role illustrations are touched.

## Active plans and open task lists

- `docs/planning/CUSTOM_GAMES_MASTER_PLAN.md`: the Custom Games product line (v4.1).
- `docs/planning/LLM_DISCOVERABILITY_PLAN.md`: the AI answer-engine visibility plan behind `AI_VISIBILITY_LOG.md`.
- `docs/planning/MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`: coordination engine vision and data model. The as-built workflow is `docs/COORDINATION_ENGINE_WORKFLOW.md`.
- `docs/planning/CLAUDE_CODE_PROMPT_FORUM_WORLD_CLASS.md`: forum upgrade design and build plan, status PLANNED, decisions locked 2026-07-02.
- `docs/planning/SHIP_BUILD_INDEX.md`: ReGen Ship build docs and their status (the prompts it lists are in `archive/`). Live prices and policies: `docs/SHIP_VARIABLES.md`.
- `docs/planning/RYE_BROWSER_TASKS_REGEN_SHIP.md`, `docs/planning/RYE_COWORK_TASKS_SHIP_MAP.md`, `docs/planning/RYE_TASKS_EVOLUTION_ENGINE_ACTIVATION.md`: Rye's open human tasks (ship listing and partners, ship map basemap and data, Evolution Engine activation).

Everything else in `docs/planning/` is a dated audit, research note, brief, outreach draft, or an older spec kept for reference.

## Developer reference (`docs/`)

- `docs/DEV_CONTEXT.md`: how the site has been built; read before touching code.
- `docs/ARCHITECTURE.md`: system architecture.
- `docs/DEPLOYMENT.md`: Railway services, the CLI scripts, and the `-s` pin rule.
- `docs/SETUP.md`: production setup checklist for external services.
- `docs/DESIGN_SYSTEM.md`: palette, typography, spacing and component conventions.
- `docs/WORKTREES.md`: the shared session claims board.
- `docs/IMAGE_ARCHITECTURE.md`, `docs/IMAGE_UPLOAD_PROCESS.md`, `docs/image-management.md`: the image pipeline.
- `docs/COORDINATION_ENGINE_WORKFLOW.md`: canonical current-state workflow of the coordination engine.
- `docs/EVENT_FLOW_OVERVIEW.md`: events, reminders and schedule.
- `docs/planning/EMAIL_COMMS_AUDIT_2026-10-02.md`: as-built audit of outbound mail (send sites, schedulers, preferences, the hourly cap). Read before changing `server/_core/email.ts` or any send path. Wave 0 to Wave 4 live here.
- `docs/planning/FIXES_TO_MAKE_2026-10-02_EMAIL_SYSTEM.md`: Phase A to D defect list for the same engine. Companion to the audit, not a replacement for the wave order.
- `docs/planning/CLAUDE_CODE_PROMPT_2026-10-02_EMAIL_SYSTEM.md`: lane prompt that points at that fixes list.
- `docs/planning/UNIFIED_EMAIL_PLAN.md`: how Phase A lines up with the waves, and the order the lane ships.
- `docs/planning/EMAIL_CRON_HEALTH_2026-10-02.md`: which Railway cron services exist, which start commands expand `CRON_SECRET`, and that nothing posts to `/api/cron/event-reminders`.
- `docs/SHIP_VARIABLES.md`: every ReGen Ship price, policy and setting, and where to change it.
- `docs/GAME_GENERATION.md`: the standing prompt that turns a custom game blueprint into content.
- `docs/CO_CREATORS_GUIDE.md`: draft guide for co-creators.
- `docs/BLOCKCHAIN_INTEGRATIONS.md`: blockchain data connections tracker.
- `docs/GOLDEN_RULE.md`: the five steps before any feature work, and the worktree workflow.

## Living records

- `SEASONS_HISTORY.md`: **index** of all seasons with compensation bands, cross-season tracking table, and links to per-season detail files. Updated each season by the `regen-seasonal-roles` skill.
- `SEASON_TEMPLATE.md`: the season assembly template.
- `seasons/season-1-the-first-build.md`: full detail for Season 1. All 13 roles with bands, Seed/Harvest metrics, deliverables, character art descriptions, and blank scorecard for Season Festival.
- Later seasons follow the `seasons/season-N-name.md` pattern (Season 2: `seasons/season-2-the-first-turn.md`).

---

_Updated 2026-09-27: root planning docs moved to `docs/planning/`, developer reference to `docs/`, and dated prompts to `archive/` (STEERING section 8). Every path above was checked on disk._
