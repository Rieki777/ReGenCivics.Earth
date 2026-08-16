# Lane L7: Intents and Introductions (library card "Introductions", requires messaging)

Worktree `wt-r4-intents`, branch `wt/r4-intents`, cut from game-amora `origin/main` at dispatch. Migration `0086`.
Facts below were measured at `135db66` in the read-only scout; line numbers are hints, anchor by content.

## Objective

Ship one library card, "Introductions": members say in plain words what they seek, confirm offers the village
already knows about them, and receive a few good introductions a week. Matching is deterministic first, a match
is an opportunity both people accept separately, and a mutual yes opens one Messages thread through
`openDirect`. Nothing is published, matched or accepted for anyone; incognito is matched and never rendered;
founders get a demand signal beside the concierge's gaps.

## Why

Proposal §4 items 2 and 3; §9.2 lessons 2 (infer offers), 3 (bridging), 4 (few, good introductions, a
confidence floor), 5 (recipient cap), 7 (show and correct), 8 (never only in a chat stream), 11 (one reminder,
then the pool); A1 to A7 at their defaults. Rulings: R28 (§9 "yes if not mentioned", ratifying §8 item 23: L7
before L6, the brief to L5b); R29 ("Love all the lessons": §9.2 and A1 to A7 as written); R30 (§10.4
foundations: consent sentence, show/correct, policy lines). The R30 text is not in the proposal file I measured;
the coordinator confirms the number at dispatch.

## Boundaries

May edit: `server/lib/intents.ts` (new) + `server/lib/intents.test.ts` + `server/intents.routes.e2e.test.ts`;
`drizzle/0086_member_intents.sql`; `shared/modules.ts` (ONE entry after `messaging`); `shared/gameVariables.ts`
(one appended block, `introductions.*` keys only); `client/src/pages/Introductions.tsx` (new, lazy);
`client/src/pages/Admin.tsx` (one nav item `intents-admin` after `calls-admin`, one `IntentsAdminTab`, one
`activeTab === "intents-admin"` line); `client/src/App.tsx` (one `lazyPage`, one `<Route
path="/introductions">`, one title-map entry, beside the `/messages` lines); `client/src/config/nav.ts` (one
Community item `{ href: "/introductions", label: "Introductions", module: "introductions" }` after Messages);
`server/index.ts`: the new `/api/intents` block (`app.use("/api/intents", requireModule("introductions"))`,
directly after the `/api/admin/map/concierge-log` route), one `registerJob("intents-sweep", …)` after
`record-derive`, one statement each in the erasure block (anchor: `UPDATE concierge_queries SET query =
'[removed with the member]'`) and the export object (anchor: `conciergeQueries: await mine(`);
`server/lib/map.ts`: one token widening `insertContactRequest`'s `source` union to `"introduction"` (column
`varchar(32)`, no migration).

May read: everything under `server/lib/`, `shared/`, `drizzle/`, `Messages.tsx`, `server/messaging.test.ts`
(the DB harness shape).

May NOT touch: `messaging.ts` beyond calling it; `notify.ts` (a cadence line `case "introduction": return
p.messagesEmail;` is a written request; without it `emailCadenceFor` falls to `default: "off"`, in-app only);
`knowledge.ts` (`rank` hides scores; write your own scored loop from its `tokenize`/`indexDoc`); `assistant.ts`
modes (reuse `concierge`); readers, templates, tokens, `SKILL.md` (L6); the weekly brief (L5b: export
`opportunitiesForBrief(pool, userId)` and stop); `grounds-v0.html` (other session); `ModulesTab` and the Admin
nav filter (L1); `server/db/schema.ts` (measured: it stops at the token ledger and holds no messaging or
concierge tables; row types are interfaces in `intents.ts`, the `messaging.ts` pattern).

## Design

1. **Module entry** (`ModuleDef`, `shared/modules.ts`): `id: "introductions"`, `name: "Introductions"`, `tier:
   "included"`, `dataClass: "member-pii"`, `requires: ["messaging"]` (as `feed` requires `forum`), `capabilities:
   []`, `variableKeys` = `introductions.recipient_daily_cap | match_floor | opportunity_days | retention_days`,
   `apiPrefixes: ["/api/intents"]`. `knowledge.test.ts` asserts uncovered + `MODULE_DOCS` = `MODULES.length`; a
   nineteenth module without a doc still passes.
2. **Tables** (`0086`, no CHARSET clause per the 0078 note). `member_intents`: `id, user_id, kind
   enum('seek','offer'), text varchar(500), why varchar(300) NULL, tier enum('public','members','incognito',
   'private') DEFAULT 'members', lifecycle enum('active','paused','fulfilled','expired'), topics json,
   inferred_from json NULL, expires_at, reminded_at NULL`, timestamps. `intent_opportunities`: `id, user_a,
   user_b, intent_a_id, intent_b_id` (sorted pair, UNIQUE), `score, method enum('deterministic','llm'), reasons
   json` (`[{text, source, subject}]`), `status enum('proposed','a_accepted','b_accepted','opened','declined',
   'expired'), a_accepted_at, b_accepted_at, declined_by, conversation_id, surfaced_at, reminded_at, expires_at`.
   `member_intent_policies`: `user_id` PK, `consent_at NULL, max_per_week int DEFAULT 2, topics json NULL,
   paused_until NULL`. Suggested offers are computed on read, never stored: an unconfirmed offer has no row,
   which is what "never auto-published" means.
3. **Who may act.** Post, edit, confirm, policy, accept: `hasCapability("message.send", await
   capabilityCtx(user))`, or `stageOf(user) === "guest"` with a `stays` row `status = 'active'` (`staysForUser`).
   Visitors: the board only, at lifecycle `public` (`requireModule` 404s off and preview). Refuse example
   identities with `isExampleUser` + `EXAMPLE_REFUSAL_BODY`, as `/api/map/contact` does.
4. **Consent sentence** (lesson 6, R30). Until `consent_at` is set by `PUT /api/intents/policy {consent: true}`,
   the matcher reads none of that member's seats, badges, skill tags, quests or `joined_at`, and suggests no
   offers. Copy: "Use what the village already knows about me (seats, badges, skills, quests, when I arrived) to
   suggest offers and introductions." Withdrawing pauses every intent, deletes nothing.
5. **Inferred offers** (lesson 2, A3). `GET /api/intents/suggestions` builds "you could offer…" chips from
   `skill_tags` (0023), `listOrgAssignments(pool, lapseContext())` with `holderKind === "member"` joined to
   `listOrgRoles` (name, aim, domain), `awardsFor` badge names, `quest_claims.status = 'consented'` titles.
   Confirming writes an `offer` with `inferred_from`. Nothing else writes offers.
6. **Matcher, deterministic first** (lesson 4; the concierge at `/api/assistant/coordinate`). Pure
   `scorePairs(seeker, candidates, opts)`, unit-tested: BM25 in the `knowledge.ts` shape over the counterpart's
   offers, active seeks, seat aims, badge names, consented quest titles; `+2` per shared topic (the
   `scoreCandidates` weight), `+1` when the pair share no circle by seat, `+1` when `users.joined_at` differ by
   more than 90 days (lesson 3). Nothing under `introductions.match_floor` (default 3) surfaces. Ambiguity = the
   top two candidates within 1 point and both above the floor: one `callAssistant({ mode: "concierge",
   maxTokens: 300 })`, shortlist fenced with `fenceForPrompt`, answer validated against candidate ids or dropped.
   Every run writes a usage row through the host's `noteAssistantUsage("introductions", …)`; a deterministic run
   writes `path: "deterministic"`, `keySource: "none"`, `iterations: 0` (0081 posture), so the metric is
   `COUNT(*) WHERE mode='introductions' AND path <> 'deterministic'`. Runs on create (that intent only) and in
   `intents-sweep` every 6 h; the sweep makes no model call when the concierge day budget is under 20 percent.
7. **Caps and policy** (lessons 4, 5, A6). Before surfacing to a person: `contactCountsToday(...).received` plus
   opportunities `surfaced_at` today stays under `introductions.recipient_daily_cap` (default 3, min 1, max 20:
   `map.contact_recipient_daily_cap` semantics on their own key, one shared day for a busy person); their
   `max_per_week` (default 2), `topics` filter and `paused_until` hold. Over cap: held for the sweep, never dropped.
8. **Opportunity, both accept** (lessons 8, 11). Surfacing writes the row, `notify({type: "introduction", link:
   "/introductions", dedupeKey: "intro:" + id})` to each side, `recordEvent(kind: "introduction", audience:
   "admin")`. `POST /api/intents/opportunities/:id/accept` sets the acting `authedUser`'s column only;
   `acceptOpportunity(pool, id, actingUserId)` throws for a non-party and is the ONLY writer of `*_accepted_at`.
   On the second yes: `insertContactRequest` once per direction with `source: "introduction"` (audit, export,
   retention and the cap for free), then `openDirect(pool, a, b)` (deduped on the sorted pair), store
   `conversation_id`, status `opened`, notify both with `link: "/messages/" + conversationId`. The platform writes
   no message; the page offers an opening line the person may type. `decline` sets `declined_by`; both intents
   return to the pool. One reminder after 3 days (`dedupeKey: "intro-reminder:" + id`); expiry at
   `introductions.opportunity_days` (default 10) back to the pool.
9. **Projection is the privacy boundary.** One `projectOpportunityFor(viewerId, opp, intents)` renders every
   response: an `incognito` intent whose owner is not the viewer contributes no text, why or topics to anyone
   (the counterpart reads "someone here is looking for what you offer" plus reasons sourced from their own facts);
   `private` rows are never matched or listed; the board lists `public` (and `members` to signed-in viewers) rows
   only, first name only to visitors. Admin sees counts and topics for incognito, never text.
10. **Show and correct** (lesson 7, R30). Every reason is `{text, source: "intent:<id>" | "seat:<id>" |
    "badge:<id>" | "quest:<id>" | "skill:<tag>" | "cohort", subject: userId}`, templated from data, no model text
    about a person. `POST .../opportunities/:id/reasons/:idx/hide` (subject only) removes it from every
    projection; hiding an inferred-offer reason pauses that offer.
11. **Page** `/introductions` (lazy): consent card; offer chips (Confirm / Not now); my intents and compose (kind,
    text, why, tier picker with one-line glosses, topics, expiry 2/4/8 weeks); the inbox (reasons with an "about
    me?" control where the viewer is the subject, Accept / Not now, state line "waiting for Ana" / "you both said
    yes: open the thread"); the policy line (0 to 3 a week, topics only, pause); the board. One column at 390.
12. **Admin tab** `intents-admin`, `GET /api/intents/admin/demand` (`isAdmin`): unmatched active intents (no
    opportunity in 14 days) by topic beside the concierge's `matched_kind = 'none'` rows from
    `/api/admin/map/concierge-log?unmatched=1` ("map is off" on 404); counts this moon incl. model calls. Never
    incognito text.
13. **Retention and erasure.** The sweep blanks `reasons` and expired `text` after `introductions.retention_days`
    (default 90, the `sweepContactBodies` shape). Erasure deletes the member's intents and policy and blanks
    `reasons` where they are a party; export returns their intents and both halves of their opportunities.

## Steps

1. Cut worktree; `0086` + row interfaces + `intents.ts` skeleton; runner applies locally. Commit.
2. Module entry, four variables, `scorePairs` / `projectOpportunityFor` / `suggestOffers` with unit tests. Commit.
3. `/api/intents` block, sweep, caps, policy; DB tests in the `messaging.test.ts` harness. Commit.
4. Second-yes path: relay rows, `openDirect`, notifications; e2e route test. Commit.
5. `Introductions.tsx`, route, nav item, Admin tab; Playwright pass at 390x844 WebKit. Commit.
6. Erasure and export statements, `map.ts` token; full gate run; PR, merge commit.

## Gates and harm metrics

DONE = CI `verify` green on the tip SHA (fourteen steps enumerated from `ci.yml`), live `/health` build marker
equals that SHA, live read-only probe of `/api/modules` listing `introductions` and `/introductions` signed out
(404 or board per lifecycle). Harm metrics, each a loud test: (a) incognito text, why or topics never appear in
any projection or list for a non-owner, admin included; (b) no code path writes an acceptance without the
accepting user's own request (unit refusal, grep test over `server/**/*.ts` for writers of `*_accepted_at`, e2e
where the sweep runs and every row stays `proposed`); (c) the recipient cap holds under 20 candidate pairs
against one person (3 surfaced, 17 held, none dropped); (d) unambiguous fixtures leave zero `assistant_usage`
rows with `path <> 'deterministic'` for `mode = 'introductions'`; (e) `private` rows never leave their owner's
responses. Skip count and duration of `pnpm test` reported.

## Non-findings

`/opportunities` and "Business Opportunities" (`Opportunities.tsx`) are investor content: do not reuse; our word
in copy is "introduction". `contact_requests` already reads as "introductions" in the export: leave it. The
relay email, `map.contact_daily_cap` and the concierge route are the map's. The weekly brief and "meet me"
windows are L5b (through `opportunitiesForBrief`); agent tokens and `SKILL.md` are L6. A
`docs/modules/introductions.md` may be written; its `MODULE_DOCS` registration is a request. Anything in
`notify.ts` or `Messages.tsx` you wish were different is a written request.

## Tools

The fourteen `ci.yml` steps run locally; `tsx scripts/run-migration.ts --all|--status`; Playwright WebKit;
`gh pr create`, `gh pr merge N --merge`; `curl https://amora.regencivics.earth/health`.

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

Lane values: worktree `wt-r4-intents`, branch `wt/r4-intents`, migration `0086`.

## Report format

Tip SHA; PR number and merge commit; each of the fourteen gate steps with its output line (skip count and
duration for `pnpm test`, TEST_DATABASE_URL set yes/no); `0086` applied locally (`--status` line); the five
harm-metric tests by name with pass output; live probe: `/health` build, `/api/modules` shows `introductions`,
`/introductions` signed out; the usage-row query for `mode = 'introductions'`; written requests raised;
status CODED / VERIFIED / DONE with the reason it is not higher.
