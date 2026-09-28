# Claude Code prompt: foundation audit carryover (CI DB decision + Phases 3 and 4)

You are picking up the ReGen Civics foundation audit. Phases 0, 1, 2 (start), and 5 already shipped on `main` (commits `73525ae` through `d949409`, 2026-07-16). Read these first, in order:

1. `FOUNDATION_AUDIT_PLAN_2026-07-16.md` (repo root) — the full audit, findings, and phase plan. Your work is Phases 3 and 4 plus the two carryovers below.
2. `SHIPPED_LOG.md` top entry (2026-07-16) — what already landed and why.
3. `.ai/docs/STEERING.md` — hard rules. Non-negotiable.

This session runs on the dev machine with the full toolchain and DB access (the previous session was in a sandbox that could not run `pnpm` or reach the database, which is why this is a handoff).

## Working rules (from STEERING, apply to every commit)

- **Behavior-preserving refactors only.** Any behavior change is its own commit with its own justification.
- **Ship gate before any "done" claim:** `python3 scripts/audit-truncation.py` (0 truncated), `rg -g '*.css' '<new-className>' client/src/` for any CSS you add, and `pnpm check` exit 0. Record evidence per item.
- **One file or one domain per commit.** `type(scope): subject` messages. **Targeted `git add` only** (never `git add -A`; concurrent Claude Code sessions cause working-tree drift and simultaneous pushes = instant FAILED Railway deploys).
- **Tests first on untested code:** write characterization tests (render + one critical interaction per tab/step) before decomposing any monster component. Only ~10 client test files exist today.
- **Green deploys:** after each push, poll `pnpm railway:deploys` until the newest deploy reaches SUCCESS; fix forward if red. Migrations via `scripts/run-migration.ts` only.
- **No em-dashes** anywhere. No contrast framing, no AI word patterns (see STEERING section 1).
- **Local test env gotcha:** unset NODE_ENV before vitest (`NODE_ENV= pnpm vitest ...` or PowerShell `$env:NODE_ENV=''`); DB-backed suites need a real `DATABASE_URL` from `.env`.
- Reference architecture to refactor toward: **`client/src/pages/Assembly.tsx` (338 lines)** — thin page, tRPC-driven, heavy UI delegated to `client/src/components/assembly/`. Every monster page should end up looking like this.

---

## Carryover A: decide how CI builds a fresh database (then enable the integration job)

The DB-backed suites (evolution, ratification, forum, applications, contributions, citizenship-tiers, emoji-reactions, ...) do not run in GitHub CI. The integration job is disabled with a documented block in `.github/workflows/ci.yml` (search for "PENDING a schema-build decision"). They DO run in the local ship gate via `pnpm test:all`.

The blocker: a fresh MySQL cannot be built from the numbered migrations alone. `scripts/run-migration.ts --all` applies only `0048+`; the base schema (tables up to `0047`: `game_variable_history`, `citizenship_tier_history`, columns like `contributionScore`, `reactionWeight`) lives only in the drizzle-kit journal that `drizzle/README.md` freezes and forbids `drizzle-kit push` from materializing.

**This needs Rye's decision before you act** (it touches the frozen-journal hard rule). Two options to put to Rye:

- **Option 1 - `drizzle-kit push` against the ephemeral CI DB only.** The rule's rationale ("recreate existing tables") does not apply to a throwaway empty CI database. Add a CI step that pushes `schema.ts` to the service-container MySQL, then run `pnpm test:all`. Cheapest, but relaxes the hard rule in one narrow place; needs an ADR.
- **Option 2 - commit a `drizzle/ci-baseline.sql` structure dump.** Generate a schema-only dump (mysqldump --no-data) of the current production/dev structure, check it in, and have CI load it before `run-migration.ts --all`. Keeps drizzle-kit fully out; adds a file to keep in sync when the base schema changes.

Once Rye picks one: implement it in the `integration` job, confirm the run is green (all DB suites pass against the fresh DB), and append an ADR to `.ai/docs/DECISIONS.md`. Also resolve finding C5 (schema drift) if Option 2 makes a baseline available: a script that diffs `information_schema` against `schema.ts` table/column names.

## Carryover B: finish the db.ts split (Phase 2 remainder)

`server/db.ts` is still ~3,600 lines. The pattern is proven: `server/db/newsletter.ts` (shipped `cc9d663`) and `server/db/tokens.ts` (transactional model). Continue one domain per commit: move a contiguous domain section to `server/db/<domain>.ts` unchanged, re-export from `db.ts` so every `import ... from "./db"` keeps working, let `pnpm check` prove the move. Domains remaining: applications, investors, forum, players, campaigns, governance, notifications, glossary/knowledge, quests, gratitude, misc. Anything transactional follows `tokens.ts`. Also (lower priority, from the plan): extract the ~6 cron endpoint bodies out of `server/_core/index.ts` into `server/lib/cron/`. Do NOT touch the JWT-helper consolidation yet: naive key-derivation changes would invalidate live sessions and emailed magic links; leave it for a dedicated, carefully-migrated commit.

---

## Phase 3: client foundations

Do these in order. Characterization tests first, then decompose, then commit per component/section.

### 3.1 Admin.tsx (4,763 lines) - finish the half-done extraction
~24 tabs already lazy-load from `client/src/components/admin/*` (Admin.tsx around lines 83-105), but ~25 panels are still defined inline, including `AdminDashboard` at roughly lines 3167-3798 (~630 lines), plus `ReviewerEmailManager`, `NewsletterSubscribersList`, `ScheduledEmailsManager`, `OrgClaimsAdminPanel`, `GlossaryAdminPanel`, `AdminPlayersTab`, `AdminRecordingsTab`, `AdminEventsTab`, and more. Move each inline panel to its own file under `components/admin/`, following the pattern the existing extracted tabs already use. Target: `Admin.tsx` under ~400 lines of shell. The `localStorage "admin_authenticated"` gate (lines 824, 3428, 4742) is UX only and was verified server-enforced; leave it as a UX gate, do not treat it as security.

### 3.2 CreateCampaign.tsx (2,692 lines) - collapse duplicated forms
Five near-identical section components, ~250-280 lines each: `LandSection` (~1405), `EquipmentSection` (~1685), `RolesSection` (~1944), `OtherNeedsSection` (~2259), `FinancialTargetSection` (~2469). Each repeats the same formData/editing-state/add-edit-delete pattern. Collapse into one configurable `CampaignSection` component parameterized by field config, then extract the wizard steps. A bug fix should land once, not five times.

### 3.3 PlayerProfile.tsx (3,017 lines) - extract components, real tabs
~22 inline stateful form components (`CreateProfileForm`, `ProfileCard`, `CollaborationSettingsPanel`, `GiftsNeedsPanel`, `OrgClaimSection`, `RssFeedManager`, `QuestEndorsementManager`, `ContributionsTab`, `QuestsTab`, `SubmissionsTab`, `QuestJournal`, ...). Move to `client/src/components/profile/`. Replace the hand-rolled 7-tab system (`activeTab === "overview" | "submissions" | "quests" | "tasks" | "gratitude" | "contributions" | "settings"`, around lines 2452 and 2627-2817) with shadcn `Tabs`.

### 3.4 useLocalStorage hook + fetch->tRPC
198 raw `localStorage` call sites across 53 files, no wrapper. Add one typed `useLocalStorage` hook (in-memory-safe, SSR-guarded, typed keys) and migrate call sites opportunistically as you touch files. Separately: 112 raw `fetch()` across 46 files bypass tRPC. Migrate to tRPC where a procedure already exists; keep documented exceptions (file uploads, SSE, `useCsrfToken`, `_core/hooks/useAuth`).

### 3.5 Design tokens (do this LAST, incrementally, never big-bang)
`client/src/lib/design-tokens.ts` exists (281 lines, the forest/spring/parchment palette) but only 5 files import it. There are 5,032 hardcoded hex literals across 122 files; `index.css` is 2,808 lines; Tailwind 4 is CSS-first (no `tailwind.config`). Wire the tokens into `@theme` in `index.css` so they become Tailwind utility classes, then migrate hex literals to those utilities **per page as pages get touched** during 3.1-3.4. Do not attempt a repo-wide recolor. After the token layer is real, rewrite `DESIGN_SYSTEM.md` to describe what actually exists (today it describes a `design-tokens.ts` migration that never happened).

---

## Phase 4: game surfaces (after Phase 3 patterns exist)

### 4.1 GameMechanics.tsx (2,350 lines) - decompose presentation, keep the data source
The data architecture is already correct: numbers flow from `shared/gameMechanics.ts` through the `useGameMechanics` hook (also consumed by `server/routes/game.ts`, covered by `server/gameMechanics.test.ts`). Do NOT duplicate or move that data. The bloat is presentation: 20 `useState`, 9 tRPC calls, 9 inline subcomponents, 10 inline option arrays (`SCOPE_TIER_OPTIONS` ~1411, `IMPACT_OPTIONS` ~1417), and the live impact simulator (`computeImpactSummaries` from `config/impactRules`). Decompose into `client/src/components/game-mechanics/`: one component per section, option arrays to a data module, the simulator as its own component. Simulator behavior must stay pixel-identical (before/after screenshots).

### 4.2 Game.tsx (1,846 lines) - make the static page data-driven
Static explainer with zero tRPC, 316 hardcoded hex literals, content hand-written inline instead of in the existing `client/src/data/pageCopy` module. Move its copy into `pageCopy`, tokenize the 316 hex values (using the Phase 3.5 token layer), and split its 4 inline components out. It should end up a thin renderer over data.

### 4.3 Assembly + Evolution Engine UI - leave alone
`Assembly.tsx` and `components/assembly/EvolutionEngine` are the reference architecture and are healthy. No work here. (The engine behind them was already hardened in Phase 0.)

---

## Definition of done

Each numbered item: characterization tests green, `pnpm check` exit 0, ship gate clean, one focused commit, pushed, Railway deploy verified SUCCESS. Update `SHIPPED_LOG.md` as you go. Append an ADR for any load-bearing choice (the CI-DB decision, the `CampaignSection` abstraction, the token-layer wiring). Surface to Rye only what genuinely needs a human decision (Carryover A is the main one); carry everything else to a green deploy.
