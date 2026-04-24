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

## Tech Stack
- Frontend: React 18 + TypeScript + Vite + Wouter (router) + tRPC client + Tailwind + shadcn/ui (Radix primitives)
- Backend: Node + Express + tRPC server + Drizzle ORM
- Database: MySQL on Railway (DATABASE_URL in `.env`)
- Storage: Cloudflare R2 (`assets.regencivics.earth`), proxied through `/api/img` for resize + caching
- Hosting: Railway (production: regencivics.earth, gov.regencivics.earth)
- Blockchain: Base (chain id 8453), JSON-RPC via Alchemy. Server-side reads only; writes happen via Hypha.
- Email: Resend
- Auth: Google OAuth + Apple OAuth + email magic link, JWT in HttpOnly cookie
- Google Workspace, GitHub: collaboration + code

## Repository Structure
- `client/src/` — React frontend (pages, components, hooks, lib)
- `server/` — Express + tRPC server. `server/routes/` holds tRPC routers, `server/_core/` holds auth/cookies/sdk, `server/lib/hypha-bridge/` holds the bridge module, `server/webhooks/` holds inbound webhook handlers
- `drizzle/` — Drizzle schema (`schema.ts`) + numbered SQL migrations
- `shared/` — types and constants used by both client and server
- `scripts/` — one-shot operational scripts (migration runner, audits, seeds)
- `archive/` — fully-shipped or superseded planning docs. Don't reference for new work

## Conventions
- TypeScript strict-mode-ish (no implicit any, exact-optional-property-types relaxed)
- Imports use `@/...` alias for `client/src/...`, `@shared/...` for `shared/...`
- Commit messages: type(scope): subject + body explaining the why. No conventional-commits enforcement; pattern matches what's in the log
- Plain language in all docs and copy. Written for community members, not just developers

## Core Concepts (read before writing any content)

- `CONTEXT_THE_TWO_GAMES.md` — **essential context on the Fund vs. Game distinction.** Read this before writing anything about governance, finance, tokens ($RCivics vs $ReGen), or the two-sided structure of ReGen Civics. The Fund (RCVoice / $RCivics) is anchored in the old Game; the Game (RGVoice / $ReGen) is anchored in the new Games. They work together as two sides of a bridge. This distinction shapes all copy, posts, and design decisions.

## Planning Documents (read before implementing)

**START HERE: `REMAINING_WORK_2026-04-08.md`** — consolidated list of everything outstanding, priority-tagged. Updated during the 2026-04-08 cleanup pass that archived 4 more completed docs (21 total now in archive/).

### Active execution prompts (11)

- `COMMUNITY_AGREEMENTS_PLAN.md` — **primary active build prompt.** All 7 parts of the current sprint: Community Agreements feature, forum UI fixes, category image support, land/alliance routing fixes, calendar button standardization, and Zoom-to-Riverside migration.
- `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` — **master build plan.** 7-track consolidated build covering database foundation, seeds, backend routers, citizenship tiers, frontend pages, visualizations, and social sharing. Resolves cross-spec conflicts.
- `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` — CTO hardening (mostly done) + Round 2 Safari walkthrough. Remaining: recording flow Zapier mapping, notifyRecordings toggle, R2-21 heal-the-land seeds (Rye).
- `CLAUDE_CODE_PROMPT_2026-04-07_POST_AUDIT_CLEANUP.md` — CSP nonce migration (C1, HIGH but RISKY) and out-of-scope hardening items. Read `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md` alongside this.
- `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md` — H3: wire `.ink-reveal` and `.blur-up` classes to actual DOM elements. Deferred so a human can review each placement in `npm run dev`.
- `CLAUDE_CODE_PROMPT_2026-04-07_CITIZENSHIP_BATCH.md` — verify `checkCitizenshipTiers` nightly batch: does it run, does it demote, does grace-period notification fire?
- `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md` — Track 7 social sharing: confirm the 11 static OG images exist and sharePrompt UI fires on the right pages.
- `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` — citizenship tier foundation. Admin UI and profile badge shipped. Remaining: nightly batch verification (see CITIZENSHIP_BATCH doc).
- `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` — quest locking UI. Core components shipped; PASS/FAIL audit doc against `QUEST_PROGRESSION_SPEC.md` still pending.
- `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` — recording flow: Zapier flat-key mapping verification, `notifyRecordings` opt-in toggle.
- `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` — **reference spec.** Full 5-phase game system build prompt. Overlaps with UNIFIED_BUILD; use as reference, build incrementally.

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

17 fully-shipped or superseded planning docs were moved to `archive/` on 2026-04-07. On 2026-04-08: MAP_PERF, CTO_AUDIT_FIXES archived; CHARACTER_ART was archived then restored (contains visual style guide + image gen prompts for all 13 role illustrations). Additional fixes/audit docs archived 2026-04-08: FIXES_TO_MAKE_2026-03-29, AUDIT_QUEST_LOCKING_2026-03-29, FIX_17_QUEST_LOCKING_AUDIT, CTO_PRELAUNCH_REPORT, CTO_VISUAL_AUDIT, SITE_AUDIT, OUT_OF_SCOPE_FINDINGS. Do not reference archived docs for new work.

- `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` — **visual style guide.** Full prompts and style direction for all 13 role character illustrations. Solarpunk/solarpunk-elven-jedi aesthetic, card vs scene format, image gen specs. Reference any time character art or role illustrations are touched.

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

## Hypha Bridge (ReGen Civics to Hypha on Base)

Hypha runs on Base (Coinbase L2, chain ID 8453). Anytime a player moves from ReGen Civics to Hypha to act on-chain (formalizing a forum decision as a DHO proposal, bringing a crowdpool contribution proposal to a land project DHO, submitting a historical contribution claim, buying Hypha tokens through our flow, etc.), the handoff MUST go through the Hypha Bridge module.

The Hypha Bridge module lives at `apps/web/src/lib/hypha-bridge/` and is responsible for:

1. Collecting player context from our MySQL ledger (internal token balance, citizenship tier, bioregion, recent quests, contribution history, Harvest/Gratitude pool state)
2. Packaging that context into the field names Hypha's create-proposal forms expect (title, description, leadImage, attachments, spaceId, creatorId, recipient, payouts, label, etc.)
3. Generating a signed, short-lived pre-fill token keyed to a bridge key (title marker plus fuzzy match fallback) so Hypha can pick the context up on arrival
4. Redirecting the player to the correct Hypha route for the intent (the 11 creation routes: activate-spaces, buy-hypha-tokens, change-entry-method, change-voting-method, deploy-funds, membership-exit, pay-for-expenses, propose-contribution, redeem-tokens, space-settings-transparency, space-to-space-membership)
5. Watching Base via Alchemy webhooks for on-chain execution and writing events back to our ledger so claim thresholds, storyteller triggers, and citizenship tier updates all flow

Three pre-fill strategies are used in order of preference: (A) upstream PR to hypha-dao adding searchParams support to the creation forms, (B) our own `useResubmitProposalData` style hook wrapped around Hypha's form, (C) our own formalization page that renders the same fields and posts through the bridge.

Token contracts on Base (chain id 8453):
- `$REGEN`: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics`: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`
- `RGVoice`: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`
- `RCVoice`: (not yet deployed)

Railway env var names (server reads these at startup, falls back to the
hard-coded defaults in `server/blockchain.ts` if unset):
- `REGEN_TOKEN_CONTRACT`
- `RCIVICS_TOKEN_CONTRACT`
- `RGVOICE_TOKEN_CONTRACT`
- `RCVOICE_TOKEN_CONTRACT` (optional; RCVoice reads are skipped if unset)

Relevant DHO slugs: `regen-games`, `regen-civics`. Hypha app base URL: `https://app.hypha.earth`.

**Rule for any future Claude Code instance**: if the task involves moving a player or their data from ReGen Civics to Hypha for any reason, use the Hypha Bridge. Do not hand-roll new redirect logic. Extend the bridge with the new intent type instead. The full flow spec lives in `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`.

## Token model: private-first, claim bridge to public

Every economic feature on ReGen Civics operates against the **private ledger** first. The on-chain (Base) public balance is a downstream projection that only updates when a user explicitly claims via the Hypha bridge. Before building any feature that earns, spends, scores, or burns tokens, internalize these four rules.

**1. Reads (game logic) use TOTAL = private + public.** Contribution scores, voice weight, citizenship tiers, and any new economic system read the player's combined position. A player who has claimed everything to Base still counts that balance toward their score loop. Use `playerProfiles.getMyTokens` which returns `{ public, private, total }` per token.

**2. Writes (credits AND debits) only touch the private ledger.** Every economic mutation goes through `db.creditPrivateTokens({ userId, tokenType, amount, source, sourceRef, description })`. Positive amounts credit, negative amounts debit. The helper writes one append-only row to `user_token_ledger` and updates the matching `player_profiles.{token}Private` cache column atomically. Public balance is never written from server code; it changes only when the chain emits a Transfer that the Alchemy webhook reconciles.

**3. Spend limit checks use PRIVATE only, not total.** When a feature checks "does the user have enough to spend N", the answer is `private >= N`. Even if they have plenty on-chain, public balance can't be deducted by server code (one-way flow). Players who have cashed out everything to Base have no in-game spend capacity until they earn more privately.

**4. One-way flow private → public.** Tokens move from private to public when the user clicks Claim on the profile dialog and completes a Hypha redeem-tokens proposal. Once on-chain, they live on Base: tradable, transferable, burnable on Base markets. The system is single-direction; on-chain holdings stay on chain and don't re-enter the private ledger.

**Default for new economic features.** Use `creditPrivateTokens` with a new `source` tag (free string; pick one matching the existing pattern: `gratitude_received`, `harvest`, `quest_completion`, `seeds_claim`, `claim_pending`, `claimed_to_base`, `claim_released`, `manual`). On-chain reads happen only via the claim bridge (`playerProfiles.requestClaim`) or the periodic balance sync (`playerProfiles.syncTokens`). Look for an existing pattern (gratitude.ts, game.ts harvest, players.ts quest_completion) before writing anything new.

**Key surfaces:**
- `db.creditPrivateTokens(...)` — the only legitimate write to private balances
- `playerProfiles.getMyTokens` — total/public/private reads for the four tokens
- `playerProfiles.requestClaim({ tokens })` — start a claim, debits private at request time
- `cancelClaim` / nightly `cancelStaleClaimBridges` — refund flows when a claim doesn't land
- `webhook-receiver.cascadeClaimPassed` — on-chain confirm reconciliation
- `user_token_ledger` table — append-only audit, source-tagged
- `player_profiles.{regen,rgvoice,rcvoice,rcivics}Private` — private cache (updated by `creditPrivateTokens`)
- `player_profiles.{rvoiceBalance, rgenBalance, rcvoicePublic, rcivicsPublic}` — public cache (updated by `syncTokens`)
- Per-token thresholds in `game_variables`: `governance.claim_threshold_{regen,rgvoice,rcivics,rcvoice}`

## Hypha PR Contributions

**GitHub account for all Hypha PRs: `Rieki777`** (not Rieki7)

- Fork: `https://github.com/Rieki777/hypha-web` (fork of `hypha-dao/hypha-web`)
- Use the `hypha-pr-workflow` skill (in `.claude/skills/hypha-pr-workflow/`) for all Hypha PR work
- The skill contains the full technique for automating the CM6 web editor, committing files, and responding to CodeRabbit reviews

## Installed Skills

Project-specific skills (in `~/.claude/skills/`):

- `regen-fixes-handoff` — produce `FIXES_TO_MAKE_*.md` docs with the canonical Handoff Breakdown table format and status vocabulary. Use whenever a fix is too complex for inline work
- `regen-ship-gate` — the audit-truncation + className grep + typecheck protocol that must pass before any "VERIFIED" or "DONE" claim
- `regen-seasonal-roles` — generate / evolve / manage seasonal game roles. Use at season transitions. Templates in the skill dir
- `regen-database-sql` — patterns for MySQL on Railway, Drizzle ORM, seed scripts, migrations
- `regen-fundraising-copy`, `regen-outreach-sequences`, `regen-content-repurposing`, `regen-community-onboarding` — voice-matched writing skills
- `hypha-pr-workflow` — automation for hypha-web PRs (CM6 editor, file commits, CodeRabbit responses). Used from GitHub account `Rieki777`

ln- delivery pipeline skills (in `~/.claude/skills/`), for structured large-feature builds:

- `ln-1000-pipeline-orchestrator` — kick off full feature delivery
- `ln-200-scope-decomposer` — break down large features or projects
- `ln-210-epic-coordinator` / `ln-220-story-coordinator` — planning phases
- `ln-400-story-executor` / `ln-401-task-executor` — implementation
- `ln-500-story-quality-gate` — quality check before shipping

## Ship Gate (MANDATORY before any "VERIFIED" or "DONE" claim)

Three gates must pass before marking any fix, task, or feature VERIFIED, DONE,
or shipped. Run them from repo root:

```bash
python3 scripts/audit-truncation.py      # gate 1: no truncated source files
rg -g '*.css' '<className-you-added>' client/src/   # gate 2: per change, for any new className or @keyframes
pnpm typecheck                                        # gate 3: exit 0
```

See `.claude/skills/regen-ship-gate/SKILL.md` for the full protocol.

**Why this exists.** On 2026-04-18 an audit of commit b06b7aa found 5 of 13
fixes marked "resolved" were false (className added, CSS missing) and 15 source
files on disk were truncated mid-statement with NUL-byte padding (including
App.tsx, events.ts, and 12 page components). The build would have broken on
next `pnpm dev`. This gate prevents that pattern from shipping again.

Every `FIXES_TO_MAKE_*.md` row in the CLAUDE CODE table must include an
Evidence column (file:line, grep result, screenshot path, or script output
line). No evidence = status stays `CODED`, never `VERIFIED`.

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