# regen-civics — Project Context for Claude

## Read first

When you start a fresh session, load these in order before touching code:

1. **This file** (project entry point + index).
2. **`.ai/docs/STEERING.md`** — hard constraints (writing rules, ship gate, token model, max autonomy, deterministic-first). Non-negotiable. Most rules that used to live in this file are now canonical there.
3. **`.ai/docs/DOMAIN-LANGUAGE.md`** — canonical names. Reach for this when a term feels ambiguous.
4. **`.ai/docs/DECISIONS.md`** — ADR log. Read before reversing a prior architectural choice.
5. **`.ai/docs/security/`** — OWASP-grounded baseline + AI-automation risks. Skim `README.md`; deep-read the relevant sub-doc when touching auth, webhooks, public input, or LLM-driven features.

Personal working preferences live in `~/.claude/CLAUDE.md` (global) and the `customInstruction` in `~/.claude/settings.json`. Use `.ai/` for project facts; use those for how-to-work-with-Rye preferences.

## When to use each `.ai/` doc

| When you're about to... | Open this file | And do this |
|---|---|---|
| Define or use any load-bearing term ($ReGen vs RGVoice, citizenship tier, season role, Hypha intent) | `.ai/docs/DOMAIN-LANGUAGE.md` | Read the canonical entry. If using a new term, add an entry. |
| Reverse, sidestep, or revisit an architectural choice | `.ai/docs/DECISIONS.md` | Read the prior ADR. If committing to the new direction, append an ADR that supersedes the old one. |
| Hard-block a request because it conflicts with a hard rule | `.ai/docs/STEERING.md` | Surface the conflict, quote the section, ask Rye before proceeding. |
| Move a player or their data from ReGen Civics to Hypha | `.ai/docs/HYPHA-BRIDGE.md` | Use the bridge; extend it with a new intent type. Never hand-roll redirects. |
| Touch the Evolution Engine, Assembly, ratification, or the machine-governance pipeline (`server/lib/evolution*`, `server/lib/ratification.ts`, hypha-bridge webhook, `assembly-*.yml` workflows) | `docs/EVOLUTION-ENGINE.md` | Read the as-built map first. ADR-27/28/29 record the decisions; `ASSEMBLY_PAGE_SPEC.md` §15 decisions are locked. New execution payload kinds must validate at raise AND execution, stay idempotent under concurrent dispatch, and extend `server/evolution.test.ts`. |
| Find the right skill for a task | `.ai/docs/SKILLS-INDEX.md` | Skills self-surface, but this is the curated catalog. |
| Find a standing spec, planning doc, or season record | `.ai/docs/PROJECT-INDEX.md` | Annotated map of the root-level reference docs. |
| Touch auth, OAuth, the cookie module, or JWT verification | `.ai/docs/security/OWASP-TOP10.md` (A01, A07) + `OPS-PLAYBOOK.md` Procedure 10 | Confirm the posture. Verify the flow in production. |
| Add a tRPC procedure, webhook, env var, cookie, or LLM feature | `.ai/docs/security/BUILD-PLAYBOOK.md` | Run the matching checklist section before merging. |
| Send user content to an LLM (chat, forum, video summary, glossary) | `.ai/docs/security/AI-AUTOMATION-RISKS.md` | Read it end to end. Treat user text as untrusted instruction. |
| Investigate an incident, rotate a secret, recover a leaked credential | `.ai/docs/security/OPS-PLAYBOOK.md` | Pick the matching procedure. Append an incident log entry. |
| Onboard a new agent or contributor | `.ai/README.md` then this file | Manifest gives the load order. |

## When to update each `.ai/` doc

| If you... | Update this |
|---|---|
| Make a load-bearing architectural choice (new framework, auth path, token, core third-party dep) | Append an ADR to `.ai/docs/DECISIONS.md` (title, date, status, context, decision, why, trade-offs, code refs). |
| Introduce a new term someone could redefine inline (role, quest type, Hypha intent) | Add an entry to `.ai/docs/DOMAIN-LANGUAGE.md`. |
| Add a new hard constraint any future agent must respect | Add a numbered section to `.ai/docs/STEERING.md`. Don't bury it here. |
| Add or change a security-relevant control (sanitizer, rate limit, cookie attr, CSP directive, webhook check) | Update `.ai/docs/security/OWASP-TOP10.md` in the matching A0n section; flip the `CHECKLIST.md` line if status changes. |
| Discover a new attack pattern or exploit class | Add to `.ai/docs/security/PRINCIPLES.md` (new posture) or `AI-AUTOMATION-RISKS.md` (LLM-specific). |
| Resolve a production security incident | Append an `Incident YYYY-MM-DD` entry to `.ai/docs/security/OPS-PLAYBOOK.md`. |
| Remove or rename a prior decision | Don't edit the old ADR. Add a new one marked `Superseded by ADR-N`. Keep history. |

The skills under `.claude/skills/` cover process (how to do work). The `.ai/docs/` files cover facts (what's true, decided, banned). Don't duplicate process into `.ai/docs/`; cross-link instead.

## What This Project Is

regen-civics is a **fund and an in-real-life game** for supporting regenerative land projects and the Regenerative Renaissance, a movement to heal ourselves, our earth, our communities, and our bioregions. We create quests and games that help people heal, and in doing so build new financial, economic, and governance systems that support and network land projects across the movement.

**Current priorities:**
1. Website — getting it up and polished
2. Fundraising — raising funds for the regen-civics fund
3. Incubator — attracting quality land projects to apply for the next season

**Stage:** Active / building — running incubator seasons, fundraising live.

## Team

Community of contributors. Distributed, non-hierarchical, movement-style. Rye leads and holds the vision.

## Tech Approach

Mixed — some code, some not. Part software project, part community organizing infrastructure, part game design. Solutions should be practical and accessible, not just technically elegant.

## Tech Stack

- Frontend: React 19 + TypeScript + Vite 6 + Wouter (router) + tRPC client + Tailwind 4 + shadcn/ui (Radix primitives)
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
- `archive/` — fully-shipped or superseded planning docs. Don't reference for new work.

## Conventions

- TypeScript strict-mode-ish (no implicit any, exact-optional-property-types relaxed)
- Imports use `@/...` alias for `client/src/...`, `@shared/...` for `shared/...`
- Commit messages: `type(scope): subject` + body explaining the why. No conventional-commits enforcement; match the log.
- Plain language in all docs and copy. Written for community members, not just developers.

## Core Concepts (read before writing any content)

`CONTEXT_THE_TWO_GAMES.md` — **essential context on the Fund vs. Game distinction.** Read before writing anything about governance, finance, tokens ($RCivics vs $ReGen), or the two-sided structure. The Fund (RCVoice / $RCivics) is anchored in the old Game; the Game (RGVoice / $ReGen) is anchored in the new Games. Two sides of a bridge. This distinction shapes all copy, posts, and design.

## Standing specs + planning docs

Full annotated index: **`.ai/docs/PROJECT-INDEX.md`**. Quick version: `SHIPPED_LOG.md` (repo root) is the rolling record of what shipped, read it first when picking up work; active sprint docs live in root as `CLAUDE_CODE_PROMPT_*.md` / `FIXES_TO_MAKE_*.md` and auto-archive per `STEERING.md` section 8; `REGEN_GAMES_SPEC_V1.md` is the single source of truth for game features; living records are `SEASONS_HISTORY.md` + `seasons/season-N-name.md` (updated by the `regen-seasonal-roles` skill).

## Skills

Custom skills catalog: **`.ai/docs/SKILLS-INDEX.md`**. Skills self-surface in Claude Code; project skills are in `.claude/skills/`, cross-project ones in `~/.claude/skills/`. Skills cover process; `.ai/docs/` cover facts.

## Database Migrations

**Always use the migration runner. Do not write ad-hoc Node scripts to run SQL.**

```bash
npx tsx scripts/run-migration.ts drizzle/0101_regen_tools_library.sql   # one migration
npx tsx scripts/run-migration.ts --all       # all unapplied, in order
npx tsx scripts/run-migration.ts --status     # what's applied
```

The runner connects via DATABASE_URL, tracks applied migrations in `_migrations_applied` (idempotent), splits SQL safely, and skips already-applied files. Migration files are hand-written `drizzle/NNNN_description.sql`; `schema.ts` is the TypeScript type source, not a migration driver. `pnpm db:push` is now an alias for `--all`. Do NOT run `drizzle-kit generate` / `migrate` (its journal is frozen at 0047 and would try to recreate existing tables). Full details: `drizzle/README.md`. Deeper patterns: `regen-database-sql` skill.

## Deployment (Railway)

The production site is the Railway **`ReGenCivics.Earth`** service (regencivics.earth) in the **`ReGen Civics` / production** project+environment. The governance app is a separate service, `ReGen Governance App` (gov.regencivics.earth). Deploys are **triggered by pushing to `main`** on GitHub — Railway watches the branch and auto-builds using `railway.toml` (nixpacks builder, `pnpm run build`, start `node dist/index.js`). Follow `docs/GOLDEN_RULE.md`: run `/ship` before pushing.

The Railway CLI is installed and logged in, and this repo is linked to the `ReGenCivics.Earth` service, so deploy status can be checked directly (commands default to the linked service):

```bash
pnpm railway:deploys   # railway deployment list — each deploy's status (SUCCESS / FAILED / BUILDING / CRASHED)
pnpm railway:logs      # railway logs — live build + deploy logs for the linked service
pnpm railway:status    # linked project / environment / service + all resources
pnpm railway:deploy    # railway up — manual deploy of the working tree (bypasses the GitHub trigger)
```

To check the governance app instead, append `-s "ReGen Governance App"` to any command (e.g. `railway logs -s "ReGen Governance App"`), or re-link with `railway link -s "ReGen Governance App"`.

### Standard deploy flow — Claude owns this end to end

When a change is ready to ship, Claude runs the whole loop without handing steps back to Rye:

1. **Test** — run the checks the change touches: `pnpm check` (typecheck), `pnpm test` (and `pnpm test:integration` when server logic changed), and `pnpm build` for anything that affects the bundle. Fix failures before proceeding; don't ship red.
2. **Migrations** — if the change adds `drizzle/NNNN_*.sql`, apply it with the migration runner (`npx tsx scripts/run-migration.ts --all`). Deploys do NOT run migrations.
3. **Ship gate** — run `/ship` per `docs/GOLDEN_RULE.md`. Never push without it.
4. **Commit + push** — commit with a `type(scope): subject` message, then push to `main`. Rye has standing authorization for Claude to push to `main` for this project; no need to ask each time.
5. **Verify the deploy automatically** — a push to `main` auto-triggers a Railway build. Immediately after pushing, poll `pnpm railway:deploys` until the newest deployment leaves `BUILDING` and confirm it reaches `SUCCESS`. If it lands `FAILED` or `CRASHED`, pull the reason with `pnpm railway:logs`, fix, and repeat.
6. **Report** — tell Rye the outcome: commit pushed, deploy status, and (if it failed) what broke and the fix.

Only pause for Rye when a step needs a human decision (a failing test that implies a design change, a risky migration, a security question). Otherwise carry the flow to a green deploy and report the result.

## Hypha Bridge

Any handoff from ReGen Civics to Hypha (on-chain action on Base) MUST go through the Hypha Bridge module (`server/lib/hypha-bridge/`). Don't hand-roll redirect logic; extend the bridge with a new intent type. Full detail (11 creation routes, token contract addresses, env var names, DHO slugs, pre-fill strategies): **`.ai/docs/HYPHA-BRIDGE.md`**. Summary rule: `STEERING.md` section 6.

## Token model: private-first, claim bridge to public

Four absolute rules (reads use TOTAL, writes touch PRIVATE only, spend checks use PRIVATE only, one-way private -> public) plus token contract addresses are canonical in **`STEERING.md` section 5**. Before building any earning/spending/scoring/burning feature, read it and copy an existing `source`-tag pattern (`gratitude_received`, `harvest`, `quest_completion`, `seeds_claim`, `call_task_bounty`, `manual`, ...).

**Key surfaces:**
- `db.creditPrivateTokens(...)` — the only legitimate write to private balances
- `playerProfiles.getMyTokens` — total/public/private reads for the four tokens
- `playerProfiles.requestClaim({ tokens })` — start a claim, debits private at request time
- `cancelClaim` / nightly `cancelStaleClaimBridges` — refund flows
- `webhook-receiver.cascadeClaimPassed` — on-chain confirm reconciliation
- `user_token_ledger` — append-only, source-tagged audit table
- `player_profiles.{regen,rgvoice,rcvoice,rcivics}Private` — private cache (written by `creditPrivateTokens`)
- `player_profiles.{rvoiceBalance,rgenBalance,rcvoicePublic,rcivicsPublic}` — public cache (written by `syncTokens`)
- `game_variables.governance.claim_threshold_{regen,rgvoice,rcivics,rcvoice}` — per-token thresholds

## Hypha PR Contributions

**GitHub account for all Hypha PRs: `Rieki777`** (not Rieki7). Fork: `https://github.com/Rieki777/hypha-web` (of `hypha-dao/hypha-web`). Use the `hypha-pr-workflow` skill for all Hypha PR work (CM6 web editor automation, file commits, CodeRabbit responses).

## Ship Gate (MANDATORY before any "VERIFIED" or "DONE" claim)

Full protocol and rationale: `STEERING.md` section 3 + the `regen-ship-gate` skill. The three gates, from repo root:

```bash
python3 scripts/audit-truncation.py                 # gate 1: no truncated source files
rg -g '*.css' '<className-you-added>' client/src/   # gate 2: per new className / @keyframes
pnpm typecheck                                       # gate 3: exit 0
```

Every `FIXES_TO_MAKE_*.md` CLAUDE CODE row needs an Evidence column (file:line, grep result, screenshot path, script output). No evidence = status stays `CODED`, never `VERIFIED`.

## Key Constraints

- Accessibility matters — outputs must work for people outside tech circles.
- Community-first — language and tools should feel welcoming, not gatekeeping.
- Lean operations — practical and sustainable over complex and impressive.
- Regenerative values — the work should embody healing, reciprocity, long-term thinking.
- **Maximum autonomy** — Rye is holding a lot. Do as much as possible without asking; only surface tasks when there is no way to proceed without human input. Full rule: `STEERING.md` section 2.

## Writing + voice

Hard writing rules (no em-dashes, no contrast framing, no AI word patterns, no rhetorical openers, no passive inspiration) apply to ALL user-facing copy. Canonical in **`STEERING.md` section 1** and **`~/.claude/CLAUDE.md`** (global). Voice: direct, grounded, specific. Rye's voice. The site currently sounds like Rye; keep it that way.

## About Rye

Founder, movement builder, tool designer. Engagement spans writing, fundraising, game design, community organizing, product, and spiritual ministry (Church of the Regenerative Earth). More in `~/.claude/CLAUDE.md`.

@docs/GOLDEN_RULE.md
