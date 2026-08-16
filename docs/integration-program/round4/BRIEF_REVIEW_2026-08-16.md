# Round 4 brief review, 2026-08-16

Ten briefs read in full. Code checked against `wt-r4-scout` at `3c295b8` (PR #16 and #17 merged; housing `0077`, `wt-map-org` `archetypes`, `0080` still absent). L1a and L5a are running: their items below are "send to the running lane".

## 1. Zone overlap

- **`Admin.tsx` `navGroups()`**: L1 claims the whole function ("only in `navGroups()` and its call in `Admin()`"); L5a edits inside it ("relabel `:292` Gatherings to Calendar"); L3 adds "one nav item" `resources-admin`; L7 adds "one nav item `intents-admin` after `calls-admin`". Four lanes, one array. Fix: L1 owns the array; L3/L7/L5a add exactly one line each and rebase; L1's `TAB_MODULE` (in `client/src/lib/adminNav.ts`) is the single owner of tab-to-module mapping and must carry `resources-admin -> resources` and `intents-admin -> introductions` or those tabs show with the module off.
- **`Admin.tsx` module-local constants**: L1 Design 5 uses `POOL_REASON_COPY` and `BUILDER_GUIDE_URL` on the public `/modules` page; both are non-exported constants inside `Admin.tsx` (`:3277`, `:3288`). L1's zone forbids touching them. Fix: L1 lifts both into `shared/moduleCatalog.ts` and `Admin.tsx` imports them (one import line added to L1's zone).
- **`server/index.ts` `registerJob` anchor**: L5a ("`registerJob` calls included ... before `startScheduler` at :18892") and L6 ("its `registerJob` calls (before `startScheduler`, `:18892`)") insert at the same line. L5b, L2, L7 each name a distinct anchor. Fix: every lane registers its jobs inside its own route block (the L5b pattern); send to L5a.
- **`server/index.ts` concierge route (`:7575-7650`)**: L6 edits the `mode: "concierge"` call site; L7 inserts after `concierge-log` (`:7725`); L2's map block ends at `/api/map/contact` (`:7462`). Adjacent, sequential, no shared lines.
- **`package.json` + `pnpm-lock.yaml`**: L5a lists `package.json`; L2 adds `d3-interpolate` but lists neither file. Fix: add both to L2's zone.
- **`shared/gameVariables.ts`, `server/db/schema.ts`**: L5a, L7 (variables) and L2, L3, L5a, L5b (schema) all "append one block". End-of-file appends collide on rebase; each brief should say append below the last block, rebase, never reorder.
- **`shared/modules.ts`**: L1 owns fields and values; L3 and L7 add one entry each. Sequential, but see 5.
- `assistantTemplates.ts` (L5b then L6) and the events block (L5a then L5b) are additive and sequential.

## 2. Missing rules

All ten carry the identical Rules block, so worktree, `git add -p`, PR + merge commit, fourteen steps, mutex, migration numbers, harm metrics, hypotheses, voice, security, live read-only are present everywhere. Gaps are in the lane-specific text:

- **L1**: no `/security-review` step although it adds an image PUT (`/api/admin/modules/:id/image`) and a public route.
- **L7**: no `/security-review` step; `member-pii` module, member text into `callAssistant`, `insertContactRequest` widening.
- **L1a** (running): `GEMINI_API_KEY` is a credential and an external fetch; "key never on disk or in a log" is stated, no review step. Send: say in the report that the checklist ran.
- **L8**: report format has no gate outputs or skip count although DONE says "if scripts land by PR, the fourteen-step CI verify job is green".
- **L4**: handover waives the fresh worktree explicitly. No gap.
- Neither R30 nor R31 appears in `ROUND4_PROPOSAL_2026-08-16.md` (L5a and L7 say so). Every brief leaning on them needs the ledger text pasted at dispatch.

## 3. Fact checks (eight, against `3c295b8`)

1. **L1** modules block: `app.get("/api/modules"` `:5723`, `/api/admin/modules` `:5774`, `.../lifecycle` `:5892`, `.../config` `:5967`; `hasRealContent` `examples.ts:864`, `modulesWithExamples` `:285`, `loadExampleSeed` `:318`; `setModuleConfig` `modules.ts:502`, `stampListing` `:465`; `POST /api/admin/brand/image` `:13374`. CONFIRMED. `POOL_REASON_COPY` / `BUILDER_GUIDE_URL` importable from a page: REFUTED (module-local in `Admin.tsx:3277,3288`).
2. **L2** `VillageMap.tsx` 888 lines; `layoutNestedMap` `mapLayout.ts:171`; `circlesRepo` `table: "circles"` `:987`; map gate `:7202`, `/api/map/contact` `:7462`; org block `app.get("/api/org"` `:17301` to `seatings/:id/forget` `:18140`; `guardedFetchJson` `toolcheck.ts:101`; `priceLine` `modules.ts:774`; `payments.ts` `usd` `:84,:459`. CONFIRMED. `archetypes` absent from `orgChart.ts` on main: CONFIRMED (absorb branch is live).
3. **L3** `app.use("/api/health", requireModule("health"))` `:10682`; `POST /api/forum/threads` inline `:6283`, `proposal.open` check `:6302`, `DECIDED_ONLY_META` `:6333`, `onThreadCreated` `:6354`; `EventsAdminPanel` `Bearer ${password}` `:53`; `activeTab === "health-admin"` `Admin.tsx:9122`; `MEDIA_SEED` `grounds-v0.html:1459`; `moduleActivity` `modules.ts:534`. CONFIRMED.
4. **L5a** `CycleClock.tsx:38-39` passes `moonPhase()` into `wheelState()`; `wheel.ts:57` divides `moonAgeDays / 29.53`; `events` untracked in `schema.ts` (only `stage_events`), `quests` tracked `:109`; events gate `:7941`, `by-structure` `:8032`, `DELETE /api/admin/events/:id` `:8209`, `startScheduler` `:18892`, `overLimit` `:3440`, `Admin.tsx:292` "Gatherings", `:9093` mount; `SECRET_KEYS`/`allSecretStatuses` `secrets.ts:71,168`. CONFIRMED.
5. **L5b** `rsvp()` `FOR UPDATE` `gatherings.ts:299`; `withdrawRsvp` `:389`; `RENDERERS` `assistantTemplates.ts:84` resolved at `assistantRouter.ts:241`; `quests` has no `created_at` (`0001_init.sql:42-58`; only `quest_crews` in `0067` has one); `todayInTz` `:2642`; `stay-nightly` `:3648`. CONFIRMED.
6. **L6** `ASSISTANT_MODES.member` `assistant.ts:61`; `KeySource = "village" | "platform"` `:139`; `DRAFT_KINDS = ["role","circle"]` pinned `drafts.test.ts:120`; `express.json` `:4981`; `encodeToken(userId, email, tokenVersion)` `:1317`; `authedUser` `:2219`; `AUTH_TOKEN_SECRET` fallback `:636`; `key_source varchar(16)` `0078:37`; docs read `:18524`; `guardOutboundUrl` `toolcheck.ts:255`. CONFIRMED (`drafts/:id/accept` is `:9991`, drift). `noteAssistantUsage` is a private function in `server/index.ts:1167`, so L7's `intents.ts` cannot call it: it must be injected as a dep from the route block.
7. **L7** `concierge-log` `:7725`; `record-derive` `:4096`; erasure anchor `:3169`; export anchor `:18453`; `insertContactRequest` `source: "map" | "concierge"` `map.ts:108`; `openDirect` `messaging.ts:241`; `staysForUser` `stays.ts:156`; `contactCountsToday` `map.ts:136`, `sweepContactBodies` `:196`, `scoreCandidates` `:58`; `fenceForPrompt` `villageReaders.ts:135`; `knowledge.test.ts:99` `uncovered + MODULE_DOCS = MODULES.length`. CONFIRMED.
8. **L1a / L8** `window.SPRITES` has 30 keys incl. `fire`, `tools`, `library`; image budget 38 files / 1,813,710 = baseline; `images/avatars/manifest.json` exists; CI has fourteen `run:` steps in the order L3/L4 list; `TOKEN_KEY = "amora-auth-token"` `gameApi.ts:10`; `lib.mjs` exports `baseUrl`, `tokenKey`, `contextFor`, `reportUnmeasured`; `MobileTabBar` `md:hidden fixed bottom-0 ... z-50`; `TAB_SLOTS` "Exactly five slots". CONFIRMED.

## 4. Contradictions with R28 / R29 / R30

- **R28 numbering is off the proposal's numbering.** §9 quotes "item 8 gains an Other section; item 13's radiation becomes ...". In §8, item 8 is the five shelf groups and item 13 is images (radiation is item 21). The briefs each guess: L2 "R28 (Other entries)", L3 "item 9's Other section", L4 "item 13 amended to always-on rings", L1 says nothing. If R28's item 8 is the shelf, **L1 lacks the sixth "Other" group** (`MODULE_GROUPS` "five, ordered"). Coordinator must paste R28's actual list into the proposal and settle L1's group count before dispatch.
- **Radiation (R28 verbatim in L4 A5)** then caps: "Caps 24 live icons desktop, 10 when `body.pocket`; viewport cull first ... zoom LOD ... collapses to a static badge row". "Every producing sprite always has a ring" and a 24-icon cap over 22 structures giving several capitals cannot both hold unless the ring itself is uncapped and only the rising icons are budgeted. L4 must say that in one sentence.
- **Currency (N4)**: "per-user display currency in the site header". L2 mounts the picker "on the legend footer in v1, exported for the header later" and hands the header to the coordinator. Deviation, small, but nobody owns the header mount this round.
- **One calendar (R29, N7)**: L5a, L5b, L7 comply. L2's `season: {current, nextRollAt}` and `termEnds` read the legal rows that L5a mirrors as `seat-term`/`season`; consistent with "mirrored, never moved".
- **Hypha deep link, agent harness in every profile, three persona QA on live**: L2/L3 (`useModules().hypha`, `HyphaLink` chip), L6 (`Profile.tsx` one render line, L8 checks the heading) and L8 (writes only on a local same-SHA build) comply.
- **§8 item 14 card copy** "includes the Living Map of the land" and the "How Power Is Held" name: L1 says "`map` stays 'Village Map'; L2 may rename one entry later"; L2 says `shared/modules.ts` is "Not yours". Nobody renames the card. Same for L5a's "ask L1 to rename the card 'Village Calendar'", which L1 never mentions.

## 5. Dependency order

Order holds: L1(+L1a) -> L2 and L5a -> L3 and L5b -> L7 -> L6 -> L4 -> L8. Gaps:

- **L2 -> L3**: L3 needs "the lens hook L2 exposes", `NestedLayout`, a `pad` prop and a formatter name. L2's brief exposes `formatMoney` in `shared/money.ts` but names no lens slot and no `pad`. Add to L2.
- **L1 -> L3, L7**: L1's `shared/moduleCatalog.test.ts` "proves every `MODULES` id has a catalog entry, group and setup, and nothing else does". L3 and L7 each add a `MODULES` entry and neither lists `shared/moduleCatalog.ts`, `group`, `setup` or `TAB_MODULE`. Their entries will fail L1's test.
- **L7 -> L5b**: L7 exports `opportunitiesForBrief(pool, userId)` "and stop"; L5b's brief takes `opportunities: string[]` "empty until L7". L5b lands first and `calendarBrief.ts` is L5b's zone, so no one is named to wire the call. Name the coordinator or grant L7 one line in `calendarBrief.ts`.
- **L7 -> L6**: L6 posts intents "into L7's create function"; L7 names no exported create function. L6 exports `enqueueAgentDelivery` for L7's opportunities; L7 lands earlier and never mentions the inbox. Both need one sentence.
- L5a -> L6/L7 (`listCalendarItems`), L3 -> L4 (capital ids and medium defaults match), L1a -> L1 (`onError` still fires on the SPA's HTML 200): fine.

## 6. Twelve edits

1. **L1 Boundaries**: add "`shared/moduleCatalog.ts` also exports `POOL_REASON_COPY` and `BUILDER_GUIDE_URL`, lifted from `Admin.tsx`; `Admin.tsx` gains one import line for them."
2. **L1 Design 8**: add "`TAB_MODULE` also maps `resources-admin -> resources` and `intents-admin -> introductions` now, so L3 and L7 tabs hide until their modules are on."
3. **L1 Design 2**: add "Rename per-entry `name` for `map` to 'How Power Is Held' with the gloss 'includes the Living Map of the land' (§8 item 14) and `events` to 'Village Calendar' (L5a's request); `MODULE_GROUPS` gains `other` if R28's item 8 is the shelf; coordinator confirms before step 2."
4. **L1 Steps 7**: prepend "`/security-review` on the catalog route and the image PUT."
5. **L2 Boundaries**: add "`package.json` and `pnpm-lock.yaml` for `d3-interpolate` only" and "`PowerMap.tsx` exposes `lenses?: React.ReactNode` rendered inside the SVG after seats, and `layoutForShape` takes `pad` (outer margin) so L3 draws its ring without editing this lane's files."
6. **L2 Design 4**: add "the picker also exports `CurrencyPicker` from `components/power/`; the header mount is a coordinator follow-up, stated in the report."
7. **L3 and L7 Boundaries**: add "`shared/moduleCatalog.ts` (one entry: promise, benefits, forWhom, setupSummary, dataSummary, hue, emblem) and `client/src/lib/adminNav.ts` `TAB_MODULE` (one line) so L1's catalog test and nav filter stay green."
8. **L7 Design 8**: add "Export `createIntent(pool, userId, input)` for L6's confirmed write and, when `enqueueAgentDelivery` exists on main, call it once per surfaced opportunity; if it does not exist at your tip, leave a named TODO the coordinator wires after L6."
9. **L7 Steps 6**: prepend "`/security-review` (member-pii tables, model call on member text, `insertContactRequest` widening)."
10. **L5b Design 7**: add "`opportunities` comes from L7's `opportunitiesForBrief(pool, userId)` when it exists on main; if L7 has not landed, export `setOpportunitiesProvider(fn)` so L7 or the coordinator wires it with one line."
11. **L4 Design A5**: add "The ring itself is never culled or capped; the 24 / 10 caps and the LOD collapse apply to the rising icons only."
12. **Send to L5a (running)**: "Register `calendar-mirror`, `calendar-external-poll` and the sky job inside the events route block, not at the `startScheduler` anchor; L6 will insert there later." **Send to L1a (running)**: "State in the report that the generator run passed the security checklist (key from env, never printed, no fallback model)."


