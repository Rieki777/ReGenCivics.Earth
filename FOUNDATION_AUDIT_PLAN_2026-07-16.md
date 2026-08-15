# Foundation Audit and Hardening Plan

**Date:** 2026-07-16
**Status:** PLAN, awaiting Rye's review before execution
**Scope:** Whole-ecosystem foundations: server, client, Evolution Engine, game mechanics surfaces, build/CI, database, docs
**Evidence base:** Static analysis of the working tree. 904 TS/TSX source files, ~210k lines, 2,866 tracked files. Every finding below cites file:line or a reproducible count. Key claims were independently re-verified before this doc was written.

---

## 1. What is already solid (preserve these, use them as templates)

The security-critical paths are the best-engineered code in the repo. The audit confirms them rather than flags them.

- **Token ledger** (`server/db/tokens.ts`, 140 lines): the only writer of private balances (verified by grep across the repo), wrapped in a real transaction, idempotency-key guarded, and recomputes the cached column from `SUM(user_token_ledger)` so drift self-heals. This is the model every future money-touching write should copy.
- **Evolution Engine** (`server/lib/evolution.ts`, `ratification.ts`, `routes/assembly.ts`): payload validation double-gated at raise time (zod union + `validateExecutionPayload`), layered idempotency (UNIQUE `governance_executions.proposalId`, `ER_DUP_ENTRY` concurrent-winner handling, status guards on redelivery), circuit breaker that drops autonomy tier after consecutive failures, HMAC + `timingSafeEqual` webhook auth. Real tests exist (`evolution.test.ts` ~18 cases incl. idempotent double-dispatch, `ratification.test.ts`).
- **tRPC layer** (`server/_core/trpc.ts`): clean procedure hierarchy (public/protected/admin/superadmin/maintainer/reverser), CSRF middleware, Redis-atomic rate limiting, zod on effectively every input (sampled 6 routers).
- **Client shell** (`client/src/App.tsx`): 131 routes, 120 `lazy()` imports, fully code-split, with a retry wrapper for chunk-fetch failures.
- **`Assembly.tsx`** (338 lines): the reference page architecture. Thin page, data via tRPC, heavy UI delegated to `components/assembly/`. Monster pages get refactored toward this shape.
- **`shared/gameMechanics.ts`**: single source of truth for mechanics numbers, consumed by both the client hook and `server/routes/game.ts`, covered by `server/gameMechanics.test.ts`.
- **Supply chain and secrets**: no committed secrets (grepped), `.env` untracked, no git/alpha/beta dependency pins, deliberate pnpm security overrides (`path-to-regexp`, `ws`, `nanoid`).

## 2. Findings, ranked by risk

### A. Security (fix before anything else)

| # | Finding | Evidence |
|---|---------|----------|
| A1 | **Open redirect.** `/api/track/click/:emailLogId?url=...` passes `req.query.url` straight to `res.redirect(302)`, no allowlist, no same-origin check, unauthenticated. Phishing-grade. | `server/trackingRoutes.ts:61,77,83` (re-verified) |
| A2 | **Admin UI gate is client-side only.** `localStorage.setItem("admin_authenticated","true")` gates the Admin page. Server-side `adminProcedure` likely enforces the real boundary, and Admin.tsx also makes 8 raw `fetch()` calls that bypass tRPC. Needs a verified sweep: every admin mutation must hit a server-enforced admin check. | `client/src/pages/Admin.tsx:824,3428,4742` |
| A3 | **Execution-time payload trust.** `dispatchExecution` reads `proposal.executionPayload as ExecutionPayload` from the DB and switches on it without re-running shape validation. Fails safe today via bounds re-checks. Cheap to close, worth closing before more payload kinds ship. | `server/lib/evolution.ts:295` |

### B. The gates lie (CI, typecheck, build)

| # | Finding | Evidence |
|---|---------|----------|
| B1 | **The Evolution Engine tests never run in CI.** `pnpm test` excludes 13 integration suites (including `evolution`, `ratification`, `forum`, `applications`, `contributions`). CI runs only `pnpm test`. `test:integration` and `test:all` exist and nothing invokes them. Governance-core regressions merge green. | `package.json:34-36`, `.github/workflows/ci.yml:38` (re-verified) |
| B2 | **Test files excluded from typecheck.** `tsconfig.json` excludes `**/*.test.ts`, so `tsc --noEmit` never sees them. | `tsconfig.json:3` (re-verified) |
| B3 | **`contrast-audit.yml` permanently fails.** Calls a nonexistent `pnpm preview` script, on Node 20 (engines require >=22.19), pnpm 8 (pinned 10.4.1). A gate that is always red teaches everyone to ignore red. | `.github/workflows/contrast-audit.yml:27,46,69` |
| B4 | **Non-reproducible deploy installs.** `railway.toml` uses `pnpm install --no-frozen-lockfile`; `packageManager` pins 10.4.1 while devDeps declare `pnpm ^10.15.1`. | `railway.toml:3`, `package.json:173,186` |
| B5 | **No lint gate anywhere.** The `lint` script allows 1,000 warnings and no workflow calls it. | `package.json` scripts, `.github/workflows/` |

### C. Data layer

| # | Finding | Evidence |
|---|---------|----------|
| C1 | **`server/db.ts` is a god module.** 3,686 lines, 258 exported functions across ~15 domains, one 95-symbol schema import. Biggest merge-conflict and comprehension liability in the repo. | `server/db.ts` |
| C2 | **Routes bypass it anyway.** 395 `getDb()` calls across 51 files plus 191 inline raw SQL statements in routes. Two data-access styles, neither enforced. | grep counts, server-wide |
| C3 | **No transactions outside `tokens.ts`.** Zero real `.transaction(` calls in db.ts; multi-step mutations in routes can partially apply under failure or concurrency. | `server/db.ts:2069` (comment only) |
| C4 | **14 duplicate migration numbers**, `0163` appears three times (`forum_notifications`, `gratitude_cycles`, `sensing_open_to_all`). Apply order between same-numbered files is alphabetical by description, not by intent. | `drizzle/` listing (re-verified), 191 files / 176 distinct prefixes |
| C5 | **`schema.ts` (4,703 lines) has no drift guard** against the hand-written migrations. The drizzle-kit journal is frozen at 0047 by design, so the normal drift check is disabled and nothing replaced it. | `drizzle/README.md:31-44` |

### D. Module graph and server structure

| # | Finding | Evidence |
|---|---------|----------|
| D1 | **121 dynamic `await import()` calls papering over cycles**, concentrated in `evolution.ts`, `ratification.ts`, `players.ts`, `webhook-receiver.ts`. One lib-to-route violation: `webhook-receiver.ts:21` imports from `routes/batchJobs`. | grep counts |
| D2 | **`_core/index.ts` (1,131 lines) is an overloaded entrypoint**: Sentry init, inline cookie parsing, ~6 cron endpoints with business logic inline, LLM streaming, static serving. | `server/_core/index.ts` |
| D3 | **JWT boilerplate duplicated in 5 files** (sdk, oauth, newsletter, oidc, ship) with separately-handled secrets. | `sdk.ts:83`, `oauth.ts:254`, `newsletter.ts:67`, `oidc.ts:308`, `ship.ts:144,1512` |
| D4 | **Config split-brain.** Validated `ENV` module exists (`_core/env.ts`, fail-fast on critical vars), yet 179 direct `process.env` reads remain, including secrets read both ways (github/riverside webhook secrets). `.env.example` documents 99 keys; code uses 113 (~9 undocumented secret-bearing). | `_core/env.ts:6-27`, grep counts |
| D5 | **Logging is unstructured.** 247 `console.*` across 72 files; the structured `logger()` is used in 12. | grep counts |
| D6 | **Evolution core is raw SQL against governance tables.** Parameterized (injection-safe) and untyped, so schema drift on the most safety-critical tables never surfaces at compile time. | `evolution.ts`, `ratification.ts` |

### E. Client structure

| # | Finding | Evidence |
|---|---------|----------|
| E1 | **`Admin.tsx` (4,763 lines), half-refactored.** ~24 tabs already lazy-load from `components/admin/`, yet ~25 panels remain inline, including a ~630-line inline `AdminDashboard` (lines 3167-3798). The extraction pattern exists; it was never finished. | `Admin.tsx:83-105, 3167-3798` |
| E2 | **`PlayerProfile.tsx` (3,017 lines)**: ~22 inline stateful form components, hand-rolled 7-tab system instead of shadcn Tabs. | `PlayerProfile.tsx:2452,2627-2817` |
| E3 | **`CreateCampaign.tsx` (2,692 lines)**: five near-identical CRUD section components (~250-280 lines each). One bug fix must land five times. | `CreateCampaign.tsx:1405,1685,1944,2259,2469` |
| E4 | **112 raw `fetch()` calls in 46 files** bypass tRPC; **198 raw `localStorage` sites in 53 files** with no wrapper hook, ad-hoc string keys, scattered try/catch. | grep counts |
| E5 | **Design tokens exist and nothing uses them.** `client/src/lib/design-tokens.ts` (281 lines, dated 2026-04-17) is imported by 5 files. 5,032 hardcoded hex literals across 122 files (Game.tsx 316, CreateCampaign 315, Admin 302). `index.css` is 2,808 lines. A palette change is currently a 122-file edit. | re-verified: file exists, 5 importers |
| E6 | **Client test coverage is near zero where it matters.** 10 client test files; 99 of 100 pages and ~369 of 377 components untested, including every monster page. | test file listing |

### F. Game evolution + mechanics surfaces (the specific pages Rye asked about)

| # | Finding | Evidence |
|---|---------|----------|
| F1 | **`GameMechanics.tsx` (2,350 lines): right data architecture, bloated presentation.** Data flows correctly from `shared/gameMechanics.ts` via tRPC (no duplication, server-tested). The file itself holds 20 `useState`, 9 tRPC calls, 9 inline subcomponents, 10 inline option arrays, and the live impact simulator. | `GameMechanics.tsx:20,1411,1417` |
| F2 | **`Game.tsx` (1,846 lines): static hand-written explainer.** Zero tRPC, 316 hex literals, content inline instead of in the existing `data/pageCopy` module. | `Game.tsx:53` |
| F3 | **Assembly/Evolution UI is already healthy** (`Assembly.tsx` + `components/assembly/EvolutionEngine`). No work needed beyond A3 and B1 on the engine behind it. | `Assembly.tsx:245-247` |

### G. Hygiene

| # | Finding | Evidence |
|---|---------|----------|
| G1 | 114 root `.md` files; 22 dated prompt/fixes docs past the STEERING §8 one-week archive rule. | root listing |
| G2 | 11 loose one-shot scripts in repo root (`run_0100.mjs`, `cleanup_doubled_data.mjs`, `tmp-check.ts`...) plus unlabeled privilege scripts (`make-superadmin.mjs`, `set-superadmin.ts`) that are destructive against prod `DATABASE_URL`. | root + `scripts/` listing |
| G3 | `PROJECT-INDEX.md` references two docs that do not exist; `STEERING.md` last reviewed 2026-04-25; `DESIGN_SYSTEM.md` describes a token migration that never happened. | doc contents |
| G4 | 533 `as any` casts; 3 `@ts-ignore`. Strict mode is on but nothing beyond baseline (no `noUncheckedIndexedAccess`). | grep counts, `tsconfig.json` |

---

## 3. The plan

Ordering principle: **make the safety net honest before leaning on it.** Gates first, then server structure, then client structure, then the game surfaces, then hygiene. Every phase ships independently; nothing is big-bang.

### Phase 0: Close the holes (one session)

1. Fix A1: allowlist or same-origin check on the tracking redirect, plus a test that a foreign URL 400s.
2. Verify A2: sweep every mutation Admin.tsx triggers (tRPC procedures and the 8 raw fetches) and confirm server-side admin enforcement on each. Document the result. Fix any gap found; keep the localStorage gate as UX only.
3. Fix A3: re-run `validateExecutionPayload` (or a zod parse) inside `dispatchExecution` before the switch, plus a test with a malformed stored payload.

### Phase 1: Make the gates tell the truth (one to two sessions)

1. B1: add an integration-test job to `ci.yml` (MySQL service container, `pnpm test:integration`). Evolution and ratification suites must gate merges. If a CI database is not workable immediately, at minimum run them in the local ship gate.
2. B2: remove `**/*.test.ts` from the tsconfig exclude; fix whatever typecheck fallout appears.
3. B3: fix `contrast-audit.yml` (add the missing script, Node 22, pnpm 10.4.1) or delete it deliberately. No permanently red gates.
4. B4: `--frozen-lockfile` on Railway install; align the pnpm version pins.
5. C4 guard: small CI script that fails on duplicate `drizzle/NNNN` prefixes. No retroactive renumbering (applied history is keyed by filename); guard forward only.
6. D4 partial: script that diffs `.env.example` keys against `process.env` usage and fails CI on undocumented vars; backfill the ~28 missing keys (names only, no values).

### Phase 2: Server foundations (incremental, several sessions)

1. C1/C2: split `db.ts` into `server/db/<domain>.ts` modules following the `tokens.ts` model, one domain per commit, mechanical moves only, re-exported from `db.ts` during transition so nothing breaks. Domains: applications, investors, forum, players, campaigns, newsletter, governance, notifications, misc.
2. C3: introduce a thin transaction helper; wrap the multi-step mutations that touch tokens, claims, governance executions, and campaign finances first. Copy the `tokens.ts` pattern.
3. D3: extract one JWT sign/verify primitive in `_core`; migrate the 5 call sites.
4. D4: migrate direct `process.env` reads to `ENV` in every file touched during the split; delete the split-brain secret reads.
5. D1: fix the lib-to-route import (`webhook-receiver.ts` -> move `checkCitizenshipTiers` into lib); retire dynamic imports as the db split dissolves the cycles that forced them.
6. D5: adopt `logger()` in every file touched; no dedicated logging sweep, just a ratchet.
7. D2: extract cron endpoint bodies out of `_core/index.ts` into `server/lib/cron/`; entrypoint becomes registration only.
8. D6 (optional, discuss first): add Drizzle table types for the four governance tables so evolution/ratification SQL gets compile-time column checking. Behavior identical; ADR-worthy.

### Phase 3: Client foundations (incremental, several sessions)

1. E1: finish the Admin.tsx extraction using its own existing pattern; every inline panel moves to `components/admin/`. Target: Admin.tsx under 400 lines of shell.
2. E3: collapse CreateCampaign's five duplicate sections into one configurable section component; then extract the wizard steps.
3. E2: extract PlayerProfile's 22 inline components into `components/profile/`; replace hand-rolled tabs with shadcn Tabs.
4. E4: add one `useLocalStorage` hook with typed keys; migrate call sites opportunistically. Migrate raw `fetch()` to tRPC where procedures already exist; keep uploads/SSE as documented exceptions.
5. E5: wire `design-tokens.ts` into Tailwind 4 `@theme` in `index.css` so tokens become utility classes; migrate hex literals per page as pages get touched. No big-bang recolor.
6. E6: characterization tests before each monster refactor (render + critical interaction per tab/step), so the refactors have a net. This is where the client test count actually grows.

### Phase 4: Game surfaces (two to three sessions, after Phase 3 patterns exist)

1. F1: decompose GameMechanics.tsx into `components/game-mechanics/` (simulator, option arrays to a data module, one component per section). `shared/gameMechanics.ts` stays the only data source. Before/after screenshots; simulator behavior pixel-identical.
2. F2: move Game.tsx copy into the `pageCopy` data module, tokenize its 316 hex values, split its 4 inline components out. It becomes a thin renderer over data, matching how a content page should work.
3. F3: Assembly untouched; it is the reference.

### Phase 5: Hygiene sweep (one session)

1. G1: archive per STEERING §8 (22 overdue docs).
2. G2: move root one-shots to `archive/` or `scripts/one-shots/`; add a DANGER header + confirmation prompt to privilege scripts.
3. G3: correct `PROJECT-INDEX.md`, refresh `STEERING.md` review date, rewrite `DESIGN_SYSTEM.md` to describe what Phase 3 actually built.
4. C5: add a lightweight schema-drift check (script that introspects the live DB information_schema against `schema.ts` table/column names) run manually pre-release, CI later if stable.

---

## 4. Method and evidence rules (apply to every phase)

- **Behavior-preserving refactors only.** Any behavior change is its own commit with its own justification.
- **Ship gate per STEERING §3 on every batch**: `audit-truncation.py`, className greps for any CSS touched, `pnpm check` exit 0. Evidence (file:line, grep output, test output, screenshot) recorded per item; no evidence, status stays CODED.
- **One domain or one file per commit**, `type(scope): subject` messages, targeted `git add` only (concurrent Claude Code sessions cause working-tree drift; never `git add -A`).
- **Green deploys**: push, poll `pnpm railway:deploys` to SUCCESS, fix forward if red. Migrations via the runner only.
- **Tests before refactors on untested code**: characterization tests for Admin, PlayerProfile, CreateCampaign, GameMechanics before their decomposition.
- **Where this runs**: the Cowork sandbox cannot run the pnpm toolchain, so execution happens in Claude Code sessions on the dev machine (which can run check/test/build/railway). This document is the working plan for those sessions.
- **ADRs**: the db.ts split, the CI integration-test job, and any governance-table typing change each get an ADR appended to `.ai/docs/DECISIONS.md`.

## 5. Handoff breakdown

| Item | Who | Why |
|------|-----|-----|
| All code changes, tests, commits, pushes, deploy verification | Claude | Standing authorization per STEERING §2/§9 |
| Approve this plan and phase ordering | Rye | Direction call |
| Decide CI integration-DB approach (GitHub Actions MySQL service vs skip-if-no-DB) | Rye | Infra cost/complexity call |
| Confirm allowed redirect domains for the tracking fix | Rye | Product knowledge (which external domains emails legitimately link to) |
| Add any new Railway env vars if needed | Rye | Railway dashboard access |
| Delete vs fix decision on contrast-audit workflow | Rye | Judgment call on whether the audit still earns its keep |
| Branch protection to require the new CI jobs (optional) | Rye | GitHub repo settings |

## 6. Suggested execution order and rough effort

Phase 0 and Phase 1 are small and high-leverage: roughly two working sessions combined, and they de-risk everything after. Phases 2 and 3 are the bulk (each spread across multiple sessions, interleavable with feature work since every step ships independently). Phase 4 rides on Phase 3's patterns. Phase 5 is a closing sweep.

If only one thing gets approved today, it should be Phase 0 + B1 (the redirect fix and making the Evolution Engine's own tests gate the pipeline that is about to grow).
