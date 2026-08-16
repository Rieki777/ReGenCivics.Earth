# Lane L3: How Resources Flow (module `resources`, `shared/capitals.ts`)

Coordinator brief, 2026-08-16. Measured at game-amora `135db66` (read-only scout `wt-r4-scout`); line numbers are hints, anchors are given by content. Worktree `wt-r4-resources`, branch `wt/r4-resources`, migration `0084`. Branch after L2 lands (its `decides_by` column and currency settings) or agree the shape with L2 in writing.

## Objective

Ship a map of rules, never a wallet: a new module `resources` where a village declares who may spend what, with whose approval, paid from where, and where the money comes from, drawn as a second lens on `/map/circles` beside the measured inflows the ledger and `fiat_charges` already know. One action, "Request approval", opens a forum decision pre-filled from the rule. `shared/capitals.ts` ships from here so L4 and the land map read one vocabulary.

## Why

Proposal §2 card B (four questions, four data shapes; declared vs measured drawn differently; reads the ledger, never writes it), §8 items 17 (Request approval opens a forum proposal), 18 (id `resources`, never `flows`), 19 (Capitals on the land belong to `map`; both read `shared/capitals.ts`), §9.1 P8 and P9 (currencies, budgets per season, source kinds), §10.2 currency (minor units + ISO code, CHF default, Amora CRC). Rulings: R28 ("yes if not mentioned"; item 9's Other section is why every vocabulary carries `other`), R29 (P8 currency; P10 declare rights: admins plus whoever represents a circle), R30 (go signal; N1 to N8 at defaults).

## Boundaries

May edit: `server/lib/resources.ts` + `server/lib/resources.test.ts` + `server/resources.routes.e2e.test.ts` (new); `drizzle/0084_resources.sql` (new) plus three additive table blocks appended to `server/db/schema.ts`; `shared/modules.ts` (ONE new entry); `shared/capitals.ts` + `shared/capitals.test.ts` (new); `client/src/components/power/ResourcesLens.tsx`, `ResourcesPanel.tsx`, `ResourcesAdminPanel.tsx` (new, inside L2's folder; follow L2's folder name); `server/index.ts` one new `/api/resources` + `/api/admin/resources` block; `client/src/pages/Admin.tsx` one import, one nav item, one render line for tab `resources-admin`.

May read: `server/lib/ledger.ts` (constants `TREASURY`, `RECOGNITION_FAUCET`, `CYCLE_POOL_FAUCET`, `MINT_FAUCET`, `tokenDef`), `payments.ts`, `orgChart.ts`, `modules.ts`, `shared/capabilities.ts`, `shared/mapLayout.ts`, `VillageMap.tsx`, `Forum.tsx`, the `MEDIA_SEED` block of `grounds-v0.html`, `.github/workflows/ci.yml`.

May NOT touch: `grounds-v0.html` (map-prototype session, L4), `ledger.ts` and `payments.ts` (platform economy), `VillageMap.tsx` core and `shared/mapLayout.ts` (L2; L3 uses only the lens hook L2 exposes), `shared/gameVariables.ts`, `shared/capabilities.ts`, `server/lib/examples.ts` + `examples-seed.json`, `server/lib/knowledge.ts` (`MODULE_DOCS`), `Layout.tsx`, `nav.ts`, `App.tsx` (no new route). Anything here is a written request.

## Design

1. **Registry entry** (`shared/modules.ts`, after `map`): `{ id: "resources", tier: "included", dataClass: "village-content", name: "How Resources Flow", description: <one sentence: describes how money and resources are governed, moves nothing>, requires: ["map"], recommends: ["forum"], capabilities: [], variableKeys: [], apiPrefixes: ["/api/resources"], defaultConfig: { requestCategory: "governance", measuredVisibleTo: "members", labels: {} }, validateConfig }`. `requires` follows `feed` requiring `forum` (measured: `reconcileGraph` demotes when a dependency is off). No new capability, no game variable: declare rights reuse admin plus L2's `org.declare` and `represents_circle` (R29 P10); until L2 lands, admins only, and the route says so.

2. **Migration `0084_resources.sql`** (hand-written, no CHARSET clause, a header explaining why, like `0082`). Three tables, `is_example` on each: `spending_rules` (`id`, `scope enum('circle','role')`, `scope_id`, `amount_minor bigint`, `unit varchar(32)` = ISO 4217 uppercase or `token:<slug>` checked against `tokenDef`, `approval enum('none','circle-consent','lead','founders','treasury','hypha','other')`, `approval_note`, `paid_from enum('treasury','circle-budget','member','grant','sponsor','other')`, `visibility enum('village','holders')`, `note`, `created_by`, timestamps, key `(scope, scope_id)`); `funding_sources` (`id`, `name`, `kind enum('donations','memberships','stays','grants','sales','land-or-lease','investors','other')`, `share_pct decimal(5,2) NULL`, `amount_minor_per_year bigint NULL`, `unit`, `note`, `sort_order`); `circle_budgets` (`id`, `circle_id`, `season_id varchar(64) NULL` as in `org_role_assignments`, `amount_minor`, `unit`, `note`, unique `(circle_id, season_id, unit)`). Two rows per scope answer "alone" (approval `none`) and "with permission". Minor units, the `ModulePricing` pattern; a new rule defaults to L2's village currency, `CHF` when none is set. Never a balance of a named person.

3. **`server/lib/resources.ts`**: pure functions over `Pool` + a viewer context the route builds (`{ userId, isAdmin, canDeclare, canRequest, heldRoleIds, circleIds }`), the `structureRead` pattern. `listView`: admins and declarers see all; members see `village` rules plus `holders` rules for a role they hold or a circle they hold a seat in; signed-out (only while `map.public_structure` is on, as `/api/map`) see sources as name + kind, no amounts, no rules. `measuredInflows` is SELECT only: `fiat_charges` `COUNT(*)`, `SUM(amount_minor)` by `module`, `currency`, `status='paid'`; `token_ledger` `COUNT`, `SUM(amount)` by `from_account`, `to_account`, `token_type`, restricted to `sys:treasury`, `sys:mint`, `sys:gratitude-pool`, `sys:cycle-pool`; counts and totals, no user ids, hidden from members when `measuredVisibleTo` is `admins`. `answerFourQuestions(view, viewer)`: template sentences at zero tokens ("You can spend up to X from the Kitchen budget without asking; up to Y with Kitchen consent; the Kitchen is paid from stays and memberships"), reading L2's `decides_by` for the money domain when present. `buildApprovalRequest(rule, amountMinor, purpose, viewer, forumCategories)` returns `{ category, kind: "decision", title, body, meta: { resourcesRequest: { ruleId, scope, scopeId, amountMinor, unit, approval, paidFrom, requestKey } } }`; category = config `requestCategory` when the forum has it, else the forum's first. Every write (`upsertRule`, `upsertSource`, `upsertBudget`, delete) touches only these three tables and records `moduleActivity("resources", ...)`.

4. **Routes** (`server/index.ts`, beside `app.use("/api/health", requireModule("health"))`, same shape): `app.use("/api/resources", requireModule("resources")); app.use("/api/admin/resources", requireModule("resources"))`. `GET /api/resources` (view + measured + viewer + `capitals`), `GET /api/resources/me` (four questions), `POST /api/resources/requests` (auth required; the rule applies to the viewer, `approval !== 'none'`, `amountMinor <= rule.amount_minor`; 409 when an open decision thread by the same author carries the same `requestKey`, a read of `forum_threads`; returns the pre-fill). Admin CRUD under `/api/admin/resources/{rules,sources,budgets}` behind `isAdmin` or `canDeclare`. Measured: the decision primitive is `POST /api/forum/threads` with `kind: "decision"`, inline in `server/index.ts` with no extracted creation function (checks `proposal.open`, validates category, rate-limits, strips `DECIDED_ONLY_META`, calls `onThreadCreated`), so the client posts the pre-fill there once, with the `busy` guard `Forum.tsx` uses. That calls the existing primitive without duplicating it.

5. **`shared/capitals.ts`**: `CAPITALS` = nine `{ id, label, formal, hue }`: `financial` Money, `material` Materials, `living` Living things, `intellectual` Knowledge, `experiential` Experience, `social` Relationships, `cultural` Culture, `spiritual` Spirit, `health` Health; formal names ("financial capital" ... "health and wellbeing") for tooltips; one hex hue each. `MEDIA_KEYS` = the nine `MEDIA_SEED` keys measured in the artifact (water, energy, money, materials-raw, materials-finished, food-raw, food-prepared, compost, care) and `MEDIUM_TO_CAPITAL`: water, energy, materials-raw, materials-finished to `material`; food-raw, food-prepared, compost to `living`; money to `financial`; care to `social` (agreed with L4's brief). Test: every medium has a default; every capital has label, formal, hue; ids unique.

6. **Lens** (`ResourcesLens.tsx`, SVG `<g>` over L2's `NestedLayout`): sources on an outer ring outside `village.r`; a treasury node at 12 o'clock on the village ring; arrows source to treasury; arcs treasury to circle centres, stroke scaled by budget (1.5 to 8); seat pills "up to X alone" where an `approval: none` rule applies (role rule first, else circle rule); short approval arrows seat to approver (circle-consent: arc on the circle; lead: `circles.lead_role_id` seat; founders: village centre; treasury: the node; hypha: `HyphaLink` chip, display only, P7). Declared = dotted stroke + "declared"; measured = solid + "measured". Below `md` the accordion gets a Resources block per circle, in words. Outer-ring padding is L2's layout concern: request a `pad` prop, or draw inside the lens wrapper.

7. **Panel** (`ResourcesPanel.tsx`): tap a seat, or "What can I spend?", and the four answers render from `/api/resources/me`; the one button "Request approval" (hidden when `forum` is off via `useModule("forum")`, disabled with the reason when `viewer.canRequest` is false: decisions need `proposal.open`). Amount input in the rule's unit; success links to the thread. Currency formatting uses L2's formatter when it exists, else `Intl.NumberFormat` (hypothesis on L2's export name).

8. **Admin tab** (`ResourcesAdminPanel.tsx`, `EventsAdminPanel` shape: `Authorization: Bearer ${password}`): rules, sources, budgets with add/edit/delete; scope pickers read `/api/map` circles and roles; a labels editor writes `config.labels` overrides for the shipped vocabularies (R29 P4); an empty state naming the three rows to write first. Example rows through the `is_example` machinery need `EXAMPLE_TABLES` and the seed (out of zone): request at Step 3; if not granted by Step 5, ship the empty state.

## Steps

1. Cut `wt-r4-resources` from `origin/main` after L2 lands; enumerate `ci.yml`; `shared/capitals.ts` + test; registry entry; typecheck. Commit.
2. `0084_resources.sql` + `schema.ts` blocks; `npx tsx scripts/run-migration.ts --status` then `--all` on the scratch DB; `resources.ts` reads, writes, `answerFourQuestions`, `buildApprovalRequest` with unit tests. Commit.
3. Routes block; e2e suite (`provisionTestDb`, own port range) covering tiers, 401/404 semantics, `POST /requests` then `POST /api/forum/threads` = one thread; send the examples request. Commit.
4. Lens + panel on L2's hook, desktop and accordion; probe at 1280 and 390x844. Commit.
5. Admin tab (import, nav item, render line; anchor by `activeTab === "health-admin"`), labels editor. Commit.
6. Full gates, push, PR, merge commit, live probe. Report.

## Gates and harm metrics

CI verify at `135db66` = fourteen `run:` steps (Install, Typecheck, Typecheck tests, Brand guard, Voice guard, Dash guard, Auth guard, Living map artifact budget, Doc link guard, Image budget, Build, Test, Bundle budget, Dependency audit); re-enumerate on your tip. DONE means: (a) no write path to ledger or payments: `rg -n "postTransfer|postTransferPair|INSERT|UPDATE|DELETE" server/lib/resources.ts` hits only `spending_rules|funding_sources|circle_budgets`, and a unit test reads the file and asserts the same; (b) `POST /api/resources/requests` then one `POST /api/forum/threads` yields exactly one `forum_threads` row with `kind='decision'`, `meta.status='open'`, `meta.resourcesRequest.ruleId`, and a repeat with the same `requestKey` answers 409 (e2e); (c) tiers: a member sees only `village` rules plus `holders` rules for seats they hold, a stranger sees no amounts, `off`/`preview` answer the byte-identical 404 (e2e); (d) declared and measured render with different stroke and label (probe reads `stroke-dasharray` and legend text); (e) main JS under 700 KB (lens and panel load inside the already lazy `VillageMap`); (f) brand 63/63, check-voice green, image budget unchanged.

## Non-findings

- Treasury outflow, multisig, budgets that debit anything: out by ruling (§2 card B, Q9).
- The `map` module gates land map, org chart and concierge together (§8 item 14); do not split ids.
- Publishing rules to `/org/**.md` or `village.json` (`villageExport.ts`): L2's surface; send a note.
- Forum categories are village config with no circle mapping, so "the circle's category" (§8 item 17) is `requestCategory`; per-circle categories are a coordinator follow-up.
- `MODULE_DOCS` shelf line and `docs/modules/how-resources-flow.md` (`Provenance: platform`): doc if time allows, shelf line by request.
- Capitals on the land map, radiation, reduced motion in the artifact: L4.

## Tools

`pnpm check`; `npx tsc -p tsconfig.tests.json --noEmit`; `node scripts/check-{brand-refs,voice,hyphen-dash,auth-fetch,artifact-budget,doc-links,image-budget}.mjs`; `pnpm build`; `pnpm test`; `pnpm audit --prod --audit-level high`; `node scripts/validate-module.mjs resources`; `npx tsx scripts/run-migration.ts --status|--all`; Playwright WebKit (`scripts/qa/README.md`); `gh pr create`, `gh pr merge N --merge`; `curl https://amora.regencivics.earth/health`.

## Rules

- Worktree: one fresh worktree per lane cut from origin/main AT DISPATCH (after the other session lands PR #16 and its five dirty worktrees), name and branch given below; commit with git add -p or explicit paths at every milestone, never git add -A; push the branch; land by PR with a merge commit (gh pr merge N --merge), never fast-forward; a push is not a green.
- Zone: edit ONLY the files/blocks listed under Boundaries; anything else is a written request to the coordinator. server/index.ts and Admin.tsx are shared with other lanes: anchor by route string / component name, keep diffs local, never reformat.
- Gates (game-amora CI = the verify job's FOURTEEN run: steps at 135db66, enumerate .github/workflows/ci.yml before reporting, never trust a count): pnpm check; rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit; brand ratchet 63/63 zero headroom (never --update-baseline); check-voice (parses shared/ string literals: platform language, no village brand, no dashes, no "not X but Y"); dash guard; check-auth-fetch; living-map artifact budget (raw <= 7,000,000 / wire <= 5,000,000 bytes); doc-links; image budget (WebP only under client/public, 400 KB per file, total may only fall unless the brief says the ratchet is raised once with the reason in the commit body); pnpm build (watch the libuv teardown crash leaving dist/index.js stale); pnpm test whole files never -t, TEST_DATABASE_URL set or DB suites skip while the summary says passed: read the skip count and duration; pnpm audit --prod --audit-level high; bundle 700/6000 KB (new pages lazy). Mutex C:/Users/taren/Desktop/Amora/.test-lock: skip the local full suite only when it is held AND CI is green on your tip; release only locks you acquired.
- Migrations: the number given below is pre-allocated (0083 L2, 0084 L3, 0085 L5a, 0086 L7, 0087 L6, 0088 L5b); never renumber; hand-written drizzle/NNNN_*.sql + schema.ts types; run via the project's runner; the coordinator re-runs the four-way scan at dispatch.
- Reporting: a lane reporting done gives the tip SHA, every gate's output, the test skip count and duration, and for anything user-visible a live probe after merge; CODED / VERIFIED / DONE (DONE = CI verify green on THAT SHA + /health build marker matches + live probe). Targets are HARM metrics, not counts. Root causes stated in this brief are hypotheses to measure.
- Voice: no em-dashes, no "not X but Y" framing, plain words; every user-facing string in shared/ or client/ is subject to check-voice and the brand ratchet.
- Security: any new credential, token, webhook, external fetch or upload path goes through the security-review checklist before merge (rate limits, revocation, audit rows, SSRF guard, secrets never printed or persisted, PII reports carry field names only). Never guess legal/tax/contract answers.
- Live is read/render only: no accounts, forms, enables or production DB use by a lane; test admin integration-qa exists (token minted by the coordinator, <= 24 h, never on disk).
- Playwright hazards: networkidle never fires (use domcontentloaded + ~3.5 s); mobile = WebKit iPhone 14 DPR3 at 390x844 / 390x664 / 375x812 (+360); safe-area reads 0; force scroll-behavior:auto; a NaN band passes everything, make probe failure loud.

Worktree `wt-r4-resources`, branch `wt/r4-resources`, migration `0084`.

## Report format

```
Lane L3 report: <CODED|VERIFIED|DONE>
tip: <SHA>   PR: #<n> (merge commit <SHA>)   live /health build: <marker>
gates (14, enumerated from ci.yml on tip): <name: pass/fail, one line each>
tests: <files run>, skipped <n> (TEST_DATABASE_URL <set|unset>), duration <s>
harm metrics: (a) ledger write grep <output> (b) one-proposal e2e <result>
  (c) tiers e2e <result> (d) declared vs measured probe <result>
  (e) main JS <KB> (f) brand <63/63>, voice <clean>, images <unchanged>
zone requests sent: <examples entry, MODULE_DOCS line, L2 pad prop, formatter name>
could not measure: <list, with why>
```
