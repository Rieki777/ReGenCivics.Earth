# Project Index — standing specs, planning docs, living records

Annotated index of the root-level reference docs. Referenced from `/CLAUDE.md`. `SHIPPED_LOG.md` is the rolling record of what has shipped; this file is the map of the always-on reference material.

## Planning flow

- `SHIPPED_LOG.md` — rolling index of past sprints, fixes batches, and execution prompts. Each entry summarizes what shipped and points at the archived source doc. Read it first when picking up new work.
- Active sprint work lives in repo root as `CLAUDE_CODE_PROMPT_*.md` or `FIXES_TO_MAKE_*.md`. When the work is done, the file moves to `archive/` and a one-paragraph entry goes to the top of `SHIPPED_LOG.md`.
- Auto-archive convention (`STEERING.md` section 8): any dated `CLAUDE_CODE_PROMPT` or `FIXES_TO_MAKE` doc older than one week migrates to `archive/` automatically. Spec / reference docs (style guides, design tokens, component specs) stay in root regardless of age.

## Standing specs (always-on references)

- `CONTEXT_THE_TWO_GAMES.md` — **essential context** on the Fund vs. Game distinction. Read before writing anything about governance, finance, or tokens.
- `docs/EVOLUTION-ENGINE.md` — **how the game evolves itself.** The as-built map of the Assembly + Evolution Engine: the full ratification flow, what is live (Rung 1, machine ratification), what is built dark (Rung 3 auto-ship), and the remaining steps to full autonomy. Read BEFORE touching `server/lib/evolution*`, `server/lib/ratification.ts`, the hypha-bridge webhook receiver, or the assembly workflows.
- `ASSEMBLY_PAGE_SPEC.md` — the Assembly + Evolution Engine build spec (V2). Phases 1-6 shipped; design source of truth for what is not yet built. Locked decisions in §15 are not re-litigated without Rye; ADR-27/28/29 record the load-bearing choices.
- `REGEN_GAMES_SPEC_V1.md` — **the game spec.** 24 features across 5 phases. Single source of truth for game features.
- `SEEDS_VISION_IMPLEMENTATION_SPEC.md` — SEEDS economic vision translated to ReGen Civics. Read alongside `REGEN_GAMES_SPEC_V1`.
- `CITIZENSHIP_TIERS_SPEC.md` — standalone reference for the 4-tier citizenship system.
- `LIVING_TREE_VISUALIZATION_SPEC.md` — Living Tree visual concept.
- `SOCIAL_SHARING_SPEC.md` — social sharing optimization (included in UNIFIED_BUILD Track 7).
- `SITE_IMPROVEMENT_BRIEF_SEEDS_VISION.md` — content direction for Game section reframing.
- `QUEST_PROGRESSION_SPEC.md` — quest locking and unlock chain reference.
- `PROGRESS_MAP_DESIGN.md` — interactive progress map component spec.
- `ReGenCivics_WelcomeAboard_Brief.md` — Welcome Aboard Quests content brief.
- `SEEDS_WHITE_DECK_SYNTHESIS.md` — SEEDS White Deck synthesis.
- `PLAYER_EXPERIENCE_SPEC.md` — superseded by `REGEN_GAMES_SPEC_V1`, kept for reference.
- `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` — **visual style guide.** Full prompts and style direction for all 13 role character illustrations. Solarpunk / solarpunk-elven-jedi aesthetic, card vs scene format, image gen specs. Reference any time character art or role illustrations are touched.

## Living records

- `SEASONS_HISTORY.md` — **index** of all seasons with compensation bands, cross-season tracking table, and links to per-season detail files. Updated each season by the `regen-seasonal-roles` skill.
- `seasons/season-1-the-first-build.md` — full detail for Season 1. All 13 roles with bands, Seed/Harvest metrics, deliverables, character art descriptions, and blank scorecard for Season Festival.
- Future seasons follow the `seasons/season-N-name.md` pattern.

---

_Verified 2026-07-16 (foundation audit Phase 5): every doc listed above exists. Stale references to `DRAFT_GAME_AND_ECONOMY_PAGES.md` and `QUALITY_SPRINT_9_10.md` were dropped._
