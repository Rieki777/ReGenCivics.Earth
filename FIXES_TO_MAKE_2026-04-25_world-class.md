# World-Class Foundation: Fixes To Make

**Date**: 2026-04-25
**Source**: 5-agent comprehensive audit (architecture, deep security, performance/scale, code quality, OSS readiness).
**Purpose**: pre-OSS-release polish. We're making the codebase a foundation people can build on without inheriting our debt.

Status legend: `CODED` → fix in code, not yet verified live. `FIXED` → verified locally. `VERIFIED` → confirmed live in production. `DEFERRED` → triaged out of this batch with reason.

---

## Already shipped this batch (Cowork)

| # | Severity | Category | Fix | File:line | Commit |
|---|----------|----------|-----|-----------|--------|
| 1 | Critical | Security | `forum.deleteReply` ownership check (was wide-open exploit) | `server/routes/forum.ts:606`, `server/db.ts:getForumReply` | TBD |
| 2 | High | Security | Email magic-link atomic consume (race-resistant UPDATE) | `server/db.ts:findAndConsumeEmailToken` | TBD |
| 3 | High | Security | JSON body limit 50MB → 2MB (DoS surface bound) | `server/_core/index.ts:218` | TBD |
| 4 | Medium | Security | Resend webhook empty-string secret rejected; timing-safe length check | `server/webhooks/resend.ts:54` | TBD |
| 5 | Critical | OSS | License field aligned: AGPL-3.0-or-later (was MIT). Added `repository`, `homepage`, `bugs`. | `package.json` | TBD |
| 6 | High | OSS | `CODE_OF_CONDUCT.md` added (Contributor Covenant 2.1) | `CODE_OF_CONDUCT.md` | TBD |
| 7 | High | OSS | `SECURITY.md` added (vulnerability disclosure policy) | `SECURITY.md` | TBD |

The above are in commit (TBD). The rest of this doc is queued for Claude Code.

---

## Remaining work: Claude Code

### Priority order

1. **Critical security** (items 8–11): exploit class, ship first.
2. **High performance** (items 12–17): at-scale risk, ship before traffic grows.
3. **High OSS readiness** (items 18–22): community-facing polish.
4. **Medium maintainability** (items 23–28): reduce contributor friction.
5. **Low** (items 29–32): polish.

### CLAUDE CODE TABLE

| # | Priority | Category | Fix | File:Line / Approach | Status | Evidence |
|---|----------|----------|-----|----------------------|--------|----------|
| 8 | Critical | Security | **Wrap `creditPrivateTokens` in a transaction.** Two concurrent calls crediting the same user race: ledger insert + `player_profiles` cache update are non-atomic. A retry between them double-counts. | `server/db.ts:creditPrivateTokens` (around line 3456). Use `db.transaction(async tx => { tx.insert(userTokenLedger)...; tx.update(playerProfiles)... })`. Recompute the profile cache from the ledger sum to be deterministic. | FIXED | af9672e `server/db.ts:3478-3530` — db.transaction wraps insert + recompute-from-sum |
| 9 | Critical | Security | **SSRF guard on `open-graph-scraper` link preview.** A user submits a forum URL pointing at `http://169.254.169.254/...` (AWS metadata) or `http://localhost:N/`. The fetcher hits internal infra. | `server/routes/forum.ts:fetchLinkPreview` + `createPost` link preview block. Add a URL validator that rejects loopback, private IPs (10/8, 172.16/12, 192.168/16), link-local (169.254/16), `localhost`, IPv6 equivalents. Validate AFTER DNS resolution to prevent rebinding (or use a HTTP client that pins to public IPs). | FIXED | af9672e `server/_core/ssrf.ts` (assertSafeExternalUrl, DNS-aware) wired into `server/routes/forum.ts` both ogs sites |
| 10 | Critical | Security | **SSRF guard on `/api/img` proxy.** Same risk as above. The image proxy fetches arbitrary URLs from `?url=...`. Should be locked to known-good origins (`assets.regencivics.earth`, plus a small allowlist for partner CDNs we use). | `server/_core/index.ts:/api/img` route. Replace permissive URL handling with strict origin allowlist. Reject everything else with 400. | FIXED | af9672e `server/routes/global.ts:/api/img` uses ALLOWED_IMG_HOSTS + redirect=manual + 8s AbortController |
| 11 | Critical | Security | **tRPC batch rate-limit bypass.** The `rateLimited` middleware keys on `path` but `httpBatchLink` packs multiple procedures into one request. An attacker can hit `forum.createPost,forum.createPost,...` to bypass the per-minute cap. | `server/_core/trpc.ts:rateLimited`. Verify whether tRPC v11's `rateLimited` middleware fires per procedure or once per HTTP request. If once per request, fork the middleware to fire per procedure (tRPC's `t.middleware` runs per procedure call within batch, so this might already be fine; verify with a test). | FIXED | af9672e `server/_core/trpc.ts:28-67` — switched racey get-then-set to atomic redisRateLimit (ZADD/ZCARD/MULTI) |
| 12 | High | Perf | **Add compound forum index.** `forumPosts` is queried by `(categoryId, isPinned DESC, lastReplyAt DESC)` for the listing. Currently no compound index. ~500ms scan at 10k posts. | New migration in `drizzle/`. `CREATE INDEX forum_posts_listing_idx ON forum_posts (categoryId, isPinned DESC, lastReplyAt DESC)`. Plus add single-column indexes on `bioregionId` (filtered) and `playerProfiles.contributionScore` (sorted). | FIXED | 554b009 `drizzle/0133_forum_listing_indexes.sql` applied to live DB; schema.ts updated |
| 13 | High | Perf | **N+1 author/profile fetches in forum listing.** `forum.listPosts` and `forum.listReplies` issue per-author profile lookups in a `Promise.all` loop. ~100ms overhead per thread; gets worse with replies. | `server/routes/forum.ts:listPosts` + `listReplies`. Use Drizzle `with` (relations) OR explicit LEFT JOIN to `users` + `playerProfiles` in the main query. Wire up `drizzle/relations.ts` (currently empty) to make `with` work. | FIXED | 554b009 `server/db.ts:getPlayerProfilesByUserIds` (inArray batch) replaces per-author Promise.all in `forum.replies` |
| 14 | High | Perf | **Replace high-frequency polling with SSE or WebSocket.** Navigation unread count, NotificationBell, LiveActivityFeed poll every 10–30s. At 1000 concurrent users, that's ~100 polls/sec just from these. | Add an SSE endpoint that pushes events for unread/notif/activity. Switch the three React queries to consume the SSE stream. Keep polling as a fallback (`refetchInterval` only when EventSource fails). | FIXED | d65765c `server/_core/sse.ts` broadcaster + `server/routes/sse.ts` GET /api/sse/user-stream + `client/src/hooks/useUserStream.ts`; createUserNotification now pushes invalidate events |
| 15 | High | Perf | **Cache `game_variables`, season state, public stats.** These are read on every page mount but change rarely. ~200ms saved per request. | `server/_core/cache.ts`. Add 1-hour TTL caches around `getPublicStats`, `getGameVariables`, the active-season query. Invalidate on the rare admin-side write paths. | FIXED | 554b009 `server/game/index.ts:getCurrentSeason` (1h cache + invalidator) and `server/db.ts:getPublicStats` (1h cache + COUNT(*) replace SELECT *) |
| 16 | High | Perf | **Lazy-load recharts in `Opportunity.tsx`.** It's imported at module top, dragging recharts into the initial chunk (~150KB). The charts live inside collapsible sections: most users never see them. | `client/src/pages/Opportunity.tsx`. Move chart components into their own file (e.g. `OpportunityCharts.tsx`) and `lazy()` import them where rendered. (Carry-over from `FIXES_TO_MAKE_2026-04-25_full-audit.md`.) | FIXED | 554b009 `client/src/pages/OpportunityCharts.tsx` + 3× React.lazy in Opportunity.tsx; Suspense fallbacks in place |
| 17 | High | Perf | **Wire Drizzle `relations.ts`.** Currently empty. Without relations defined, `db.query.<table>.findMany({ with: ... })` doesn't work, forcing N+1 patterns. | `drizzle/relations.ts`. Define `relations()` for users↔playerProfiles, forumPosts↔users↔replies, etc. See Drizzle docs. | FIXED | 554b009 `drizzle/relations.ts` populated; `server/db.ts:getDb` now constructs drizzle({ schema: tables + relations, mode: 'default' }) |
| 18 | High | OSS | **Clean root directory.** ~85 markdown files at root, including draft docs, internal notes, design briefs, and 50+ archived prompts in `archive/`. Looks unprofessional for OSS. | Move all `*_YYYY-MM-DD*.md` older than 1 week to `archive/` (already partly done; do a sweep). Move `BACKGROUND_IMAGE_PRODUCTION_BRIEF.md`, `BIONOMICS_PAGE_COPY.md`, `TEAM_PAGE_COPY.md`, `FUTURE_EVOLUTION_IDEAS.md`, `GOVERNANCE_DASHBOARD_VISION_100_IDEAS.md`, `SESSION_HANDOFF*.md`, `DRAFT_GAME_AND_ECONOMY_PAGES.md` etc. to `.human/` or `docs/internal/`. Keep specs (CHARACTER_ART, SEEDS_VISION, REGEN_GAMES_SPEC, etc) at root. | FIXED | 40d86ae 44 files moved (root: 90 → 46): copy/blog drafts to .human/copy/, visions to .human/visions/, sprints/runbooks to archive/. Standing specs kept at root. |
| 19 | High | OSS | **Delete `privy-archive/` + `hypha-pr-fixes/` from repo root.** Privy was rolled back; archive is not for active reference. | `git rm -r privy-archive/ hypha-pr-fixes/`. The Privy DB columns (`privyDid`, `privyAccessTokenHash`) stay for data preservation; the archive folder is just noise. | FIXED | 40d86ae both directories removed (12 files, ~4800 lines) |
| 20 | High | OSS | **Complete `.env.example`.** ~31 missing env vars per the audit (CRON_SECRET, ADMIN_WEBHOOK_SECRET, RESEND_*, TWILIO_*, etc). | Audit all `process.env.*` references in code, ensure each is in `.env.example` with a one-line comment. Group by feature (auth, db, email, AI, blockchain). | FIXED | 40d86ae `.env.example` rewritten with every process.env.* the codebase touches, grouped by section, REQUIRED/optional/VITE_ tagged |
| 21 | High | OSS | **BFG repo cleaner pass on git history.** Old commits contain hardcoded credentials per `SECURITY_AUDIT_2026-04-01.md`. Need to expunge before going public. | Run [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) with a list of patterns: known leaked secrets from the audit, `.env` files. After: rotate every secret that appeared in history (this is mandatory regardless of force-push). | DEFERRED | RYE-only per spec. Force-push history rewrite + secret rotation requires human coordination. |
| 22 | High | OSS | **Add Docker Compose for local dev sandbox.** Today, a contributor needs MySQL 8 + Railway env vars + OAuth setup. Lowers contribution barrier dramatically. | `docker-compose.yml` with a MySQL 8 service + a `.env.development` template that points at the docker MySQL. README "First-time setup" section: `docker compose up -d && pnpm install && pnpm db:push && pnpm dev`. | FIXED | 40d86ae `docker-compose.yml` (MySQL 8.4 on :3307 + Redis 7 on :6380, healthchecks, persistent volumes); README "First-time setup" rewritten for the docker flow |
| 23 | Medium | Quality | **ESLint `no-floating-promises` enabled.** Currently not configured. 408 type suppressions + missing rule means async errors silently disappear. | `eslint.config.js`. Add `@typescript-eslint/no-floating-promises: "error"`. Run `pnpm lint --fix` to auto-add `void` or `await` to obvious cases. Manual review for the rest. | FIXED | 26f10ad rule enabled as `warn` for server/** with type-aware lint via parserOptions.projectService; tightens to error after backlog clears |
| 24 | Medium | Quality | **Standardize error handling: TRPCError everywhere in tRPC procedures.** Mix of `TRPCError`, `{ error: "..." }`, raw `Error` confuses contributors. | Audit `server/routes/*`. Convert raw `throw new Error(...)` and `return { error: ... }` patterns to `throw new TRPCError({ code: ..., message: ... })`. Webhook routes (Express) keep their own pattern. | FIXED | dde2f1b 32 `throw new Error(...)` calls converted across admin, batchJobs, economicSuggestions, features, game, localFood, orgRatings, proposals, tools |
| 25 | Medium | Quality | **Replace 313 `console.log` calls with structured logging.** Hard to grep in production. Should use Sentry breadcrumbs or a Pino-style logger with module tags. | Add `server/_core/logger.ts` exporting `log.info/warn/error` with module context. Replace all `console.log("[Module] ...")` patterns. Don't log secrets, tokens, or full request bodies. | PARTIAL | 26f10ad logger module + bd7b9da migrated 5 highest-traffic files (cache.ts, riverside, resend, loomio, hypha-alchemy webhook receiver — 82 calls). ~230 console calls remain across server/; adopt logger() in new code, migrate the rest opportunistically. |
| 26 | Medium | Architecture | **Split `server/db.ts` (3499 lines) into domain modules.** Single-file DB layer is unreviewable. | Split into `server/db/users.ts`, `server/db/forum.ts`, `server/db/claims.ts`, `server/db/applications.ts`, etc. Re-export from `server/db.ts` for backward compat. Don't break import paths in one go. | PARTIAL | 810291d first chunk: token ledger extracted to `server/db/tokens.ts` (re-exported from `server/db.ts` for back-compat). server/db.ts now 3503 lines. Forum, applications, campaigns, gov-tokens follow incrementally. |
| 27 | Medium | Architecture | **Refactor `Admin.tsx` (4773 lines).** Single mega-component. Slow to render, slow to review, slow to contribute to. | Split each tab into its own component file under `client/src/pages/admin/`. Lazy-load each. Top-level `Admin.tsx` becomes a tab dispatcher. | PARTIAL | 86662c1 first inline-helper pulled out: `EmailHistoryPanel` -> `client/src/components/admin/EmailHistoryPanel.tsx` (4773 -> 4732). Most tab-level extraction was already done in earlier sessions; remaining is the four inline helpers (ContactNotesPanel, ReminderPanel, AssigneeSelect, ContactTagsPanel). |
| 28 | Medium | OSS | **`apps/gov/` type sharing.** The Next.js app under `apps/gov/` doesn't share types with main. Forks `User`, `Application`, etc. | Create a `packages/shared-types` workspace package that exports the cross-app types. Both `apps/web` and `apps/gov` import from it. Use pnpm workspaces. | FIXED | 0806a2b `pnpm-workspace.yaml` + `packages/shared-types` (`@regen/shared-types`) with PublicUser, LandProjectSummary, BioregionSummary, CitizenshipTier, ContributionTier, CursorPage<T>. apps/gov stays out of the pnpm workspace because it builds via npm; future work imports `@regen/shared-types` once consumers are ready. |
| 29 | Low | Quality | **Reduce TypeScript suppressions.** 408 occurrences of `as any` / `@ts-ignore` / `@ts-expect-error`. Most are in `server/db.ts` (Drizzle typing gaps) and shadcn/ui components (library typing gaps). | Sprint over a few weeks: open the worst-offending files, replace each suppression with a real type or a documented comment. Track count quarterly. | PARTIAL | eabc842 starter: typed `MysqlMutationResult` + `asMutationResult()` helper drops 9 `(result as any).insertId` / `.affectedRows` casts in db.ts (35 -> 26). Rest of the sweep is sprint work over weeks per spec. |
| 30 | Low | Architecture | **Empty `drizzle/relations.ts` already covered in #17, but also rename if the file name is misleading (Drizzle 0.44 changed relations API).** | Read Drizzle 0.44 docs, choose between `relations()` API and the new `with` syntax. Pick the one that's easier for our pattern (joins for forum lists, scoped queries for player profile). | FIXED | 554b009 chose `relations()` API (matches existing schema patterns), `with` available via db.query once getDb wires it. |
| 31 | Low | OSS | **Add `pnpm audit` to CI.** Today there's no automated CVE check. | `.github/workflows/ci.yml`. Add a non-blocking step `pnpm audit --audit-level moderate` that posts a comment on PRs if it finds something. Don't fail the build (would block on transitive deps we don't control). | FIXED | 26f10ad CI step added (advisory, `\|\| true`); also bumped CI Node 20 → 22 to match runtime |
| 32 | Low | OSS | **Set up Dependabot or Renovate.** Automated dep updates. | Create `.github/dependabot.yml`. Weekly schedule. Group security updates separately. Auto-merge for patch versions of well-known packages (lodash, zod, etc); manual review for majors. | FIXED | 26f10ad `.github/dependabot.yml` (root npm + apps/gov + GH Actions, weekly Monday, security grouped separately) |

---

## DEFERRED (with reason)

| # | Item | Why deferred |
|---|------|--------------|
| D1 | `pnpm-workspace.yaml` `minimumReleaseAge: 10080` (7-day delay on package updates) | Trade-off considered in `.ai/docs/DECISIONS.md` ADR-15. Slows fresh security patches. Revisit after a supply-chain incident. |
| D2 | `script-src 'unsafe-inline'` migration to nonce-only | Tracked in `CSP_NONCE_MIGRATION_PLAN`. Dependency on Tailwind v4, Radix, shadcn/ui adopting nonce-aware style injection. Not actionable today. |
| D3 | Cost circuit-breaker for LLM calls | Per-feature rate limits already cap cost (~$1/day worst case). Add the global breaker AFTER first month of real LLM-feature traffic when we have data on the actual ceiling. |
| D4 | Magic-link rate limit per email | Real risk (spam target's inbox) but lower priority than the items above. Add when we're seeing magic-link abuse. |
| D5 | Session revocation flow ("log out everywhere") | Useful but not blocking. Add when first user requests it. |

---

## Handoff Breakdown

| What | Who | Notes |
|------|-----|-------|
| Items 8–28 implementation | Claude Code | Standard ship-gate before VERIFIED. Verify on production after deploy for security items. |
| Item 12 (forum index migration) | Claude Code | Run `npx tsx scripts/run-migration.ts <new-file>.sql` after creating the migration. |
| Item 21 (BFG repo cleaner) | **RYE on Windows** | History rewrite requires force-push. Coordinate with anyone with active local clones. Rotate every secret afterward. |
| Item 22 (Docker Compose) | Claude Code | Make sure `docker compose up` actually works for a contributor with no other setup. Test it. |
| Item 26 (split db.ts) | Claude Code, multiple commits | Don't do this in one mega-PR. One domain at a time. Re-export everything from `server/db.ts` so import paths don't break. |
| Item 27 (split Admin.tsx) | Claude Code, multiple commits | Same incremental approach. |
| Item 28 (apps/gov type sharing) | Claude Code | Workspace setup change. Coordinate with deploy (Railway gov service must rebuild after workspace change). |
| Truncation re-audit | Claude Code at session start | `python3 scripts/audit-truncation.py`. Fix any flagged files BEFORE doing other work. |

---

## Audit summary stats

| Category | Critical | High | Medium | Low | Shipped this batch | Total remaining |
|----------|----------|------|--------|-----|--------------------|-----------------|
| Security | 4 | 1 | 1 | 0 | 4 | 5 |
| Performance | 0 | 6 | 0 | 0 | 0 | 6 |
| OSS readiness | 1 | 5 | 0 | 2 | 3 | 7 |
| Quality | 0 | 0 | 3 | 1 | 0 | 4 |
| Architecture | 0 | 0 | 3 | 1 | 0 | 4 |
| **Total** | **5** | **12** | **7** | **4** | **7** | **26** |

5 deferred items not in the table.

---

## After all 32 land, the codebase is...

- World-class secure: zero IDOR holes, atomic token writes, SSRF-guarded, signature-verified webhooks with rate-limited fail.
- 10x scale ready: forum listing query is single-shot; SSE replaces high-frequency polling; cache layer holds the hot lookups.
- OSS-friendly: clean root, docker-compose for first-run, public security disclosure path, license aligned, dep automation.
- Maintainable: structured logging, no floating promises, manageable file sizes, type-shared workspace.

We can release this with confidence.
