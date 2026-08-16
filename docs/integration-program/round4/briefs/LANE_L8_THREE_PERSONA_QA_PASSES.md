# Lane L8: three persona QA passes on live (report only)

Drafted 2026-08-16 by the coordinator against game-amora `origin/main` = `135db66`. Three lanes, one per persona: `wt-r4-qa-1`, `wt-r4-qa-2`, `wt-r4-qa-3`. Dispatch condition: every other round-4 lane is DONE and live `/health` reports the closing SHA; the coordinator fills in `<SHA>` then.

## Objective

Walk `https://amora.regencivics.earth` at build `<SHA>` as three different people on phones and produce, per persona, a ranked improvement list with a screenshot per finding per viewport, a harm-metric verdict table, and reproducible steps. Fix nothing. The coordinator triages the three reports into fix lanes with disjoint zones.

## Why

R31, Rye's words: ["After all your lanes pass and our live, we're gonna run three comprehensive QA passes against the live site with three unique perspectives for how to navigate the site and what they're looking for so that we get a full and robust test preference for mobile as that will be our main platform that people are using to explore the site to ensure the highest quality look for any ways that we can improve improvement any design improvements, any routing improvements anyways that people can navigate the site in a more effective way anything that can make it easier for them making sure we're taking care of all bugs and overlapping buttons and design things that just aren't of the highest standard we're releasing a world class platform here I wanna demonstrate as being a world class and the QA passes are to identify ways to make that possible"].

This lane implements R31 in the round-2 L/V shape (`LANE_L_AND_V_LIVE_QA_BRIEFS.md`, `round2-qa/LANE_V2_CLOSING_REPORT_2026-08-15.md`): harm-metric verdicts, a could-not-measure count, WebKit as the Safari engine. It closes what R28 opened (module library flow §1, map/circles rebuild §10.2, the calendar with an Admin Events section attaching an external calendar §9.3) and R29 (Your agent in every profile §10.4, one calendar §10.5). R30 fixes the order: L8 runs last, never over dirty worktrees. R26 defines the mobile harm class the verdict table leads with.

## Boundaries

May edit: `scripts/qa/persona-N/**` inside your own worktree only (`N` = 1, 2, 3). May write reports to the hub at `docs/integration-program/round4/qa/persona-N/` (the coordinator commits the hub).
May read: everything in the worktree, `scripts/qa/lib.mjs` (reuse `baseUrl`, `tokenKey`, `contextFor`, `reportUnmeasured`), `scripts/qa/README.md` (its blind-spot table), the round-2 QA reports.
May NOT touch: `client/`, `server/`, `shared/`, `drizzle/`, `docs/prototypes/grounds-v0.html` (map session), any other lane's zone, the existing `scripts/qa/*.mjs`. A defect found is reported, never patched.

## Design

1. **Engine and viewport matrix** (round-2 shape). Playwright WebKit, iPhone 14 descriptor, DPR 3, touch, iOS UA. Mobile FIRST at 390x844, 390x664 (URL bar showing), 375x812, plus 360; desktop second at 1280x800. `contextFor` in `scripts/qa/lib.mjs` builds contexts; extend the profile list in your own copy, never in `lib.mjs`.
2. **Auth states.** Signed out first. Persona 2 and 3 then read what a member or admin sees via the coordinator-minted token for the standing test admin `integration-qa` (`tools/mint-test-token.mjs`; <= 24 h, injected through `localStorage[TOKEN_KEY]`, `TOKEN_KEY = "amora-auth-token"` in `client/src/lib/gameApi.ts`, never on disk or in a screenshot). GET/render only. Persona 2 signs in as the test admin only if the dispatch message says so.
3. **Persona 1, first-time visitor deciding whether to visit.** Lands from a shared link (`/`, `/visit`, `/stay`, `/map`), reads Now on the land map (`/map` iframes `/grounds/index.html`; the `Now | Vision | Org | Flows` band is `#lyNow` etc. in `grounds-v0.html`), the public calendar layer at `/events` ("What's On" in `client/src/config/nav.ts`), `/team`, `/how-we-create`, `/seasonal-festivals`, the public `/modules` library if L1 shipped it (§8 item 6). Looks for trust signals (who these people are, what it costs, how to get there), clarity, speed (first paint on the phone profile, JS transferred).
4. **Persona 2, new member finding their place.** Their seat (`/map/circles`, `/roles`, `SeatClaimCard`, `/api/org/my-unclaimed-seats`), the calendar (`/events` as rebuilt by L5a/L5b: year wheel, stacked month and moon headers, village time named), introductions (`/messages` and the L7 Intents card), the map's Org lens, their profile (`/profile`, `/profile/characters`) and **Your agent** (L6, expected under `/profile`; hypothesis: heading text "Your agent"; absent is a finding). Reads the mobile bottom bar (`client/src/config/mobileNav.ts`, five static slots, no module gate, §1 item 9) and the header drawer for reachability.
5. **Persona 3, founder administering on a phone.** Module library flow: browse `/modules`, open a detail, find Turn on, follow the Go-live card (§1 items 3 to 5, §8 items 10 to 12), see the Admin tab appear (tabs live in the URL as `?tab=`, `Admin.tsx` "S62"). Events admin including the external calendar subscription (§9.3, `?tab=events-admin` or its L5 successor). The power map setup walk (§8 item 16, `/map/circles`). Resources rules (L3). On LIVE every button is hit-tested, none pressed if it writes. Writes (turn on, go live, attach a calendar URL) run ONLY against a local build of the same SHA with the scratch schema (`scripts/qa-scratch-db.mjs`).
6. **Harm-metric verdict table**, one per persona, every row measured: (a) R26 class "partially visible and dead" (a control whose top edge shows above the fixed `MobileTabBar` (`md:hidden fixed bottom-0 ... z-50`) while its centre is under it, at first paint); (b) tap targets under 44 px (`elementFromPoint` walk, strict ownership, never ancestor containment); (c) horizontal overflow (`scrollWidth > clientWidth`, document and map iframe); (d) text under 14 px; (e) contrast (rendered pixels; count NOT MEASURABLE nodes); (f) dead ends (no route onward except browser back); (g) broken back (`?focus=` and `?tab=` included); (h) 404s (network and soft); (i) console errors. Each row: PASS or FAIL, count, worst example, NOT MEASURABLE count even when zero.
7. **Ranked improvement list.** Categories: design, routing, navigation, overlapping controls, polish, copy. Rank by audience pain for that persona: HIGH (blocks the goal or loses data), MED (degrades or confuses), LOW (cosmetic). Each entry: build marker, route, viewport(s), element chain, one-line repro, screenshot path, category, and the persona's sentence ("I wanted to know what a night costs and could not find it"). No fixes; name the file the coordinator should route to.
8. **Copy rules.** Plain words, no em-dashes, no "not X but Y", even though hub reports sit outside check-voice.
9. **Evidence data model.** `docs/integration-program/round4/qa/persona-N/REPORT_<date>.md`, `findings.json` (`{id, severity, category, route, viewport, buildMarker, elementChain, repro, screenshot, personaLine}`), `verdicts.json`, `unmeasured.json`, `screenshots/<route>-<viewport>-<id>.png`. Screenshots go to the hub, never under game-amora `client/public`.
10. **Probes fail loud.** Every numeric band is asserted finite before comparison; NaN, undefined or unparsed counts as NOT MEASURABLE and is printed, never passed. Each detector flags a known-bad fixture and passes a negative control before any zero is trusted (round 2 did 34/34).

## Steps

1. Cut `wt-r4-qa-N` from origin/main at dispatch; `pnpm install`; `npx playwright install webkit` if absent (official binaries only). Confirm live `/health` build equals `<SHA>`. Commit `scripts/qa/persona-N/README.md`.
2. Write `scripts/qa/persona-N/probe.mjs` (routes, viewports, detectors, JSON writers) reusing `lib.mjs`, with fixtures for detector validation. Commit.
3. Run signed out across the mobile matrix, then desktop; write results incrementally per viewport. Commit scripts (never tokens or screenshots into the worktree).
4. Run the tiered pass (persona 2 and 3) with the coordinator token; persona 3 runs its write flows on the local same-SHA build. Commit.
5. Write the report, harm table, ranked list, could-not-measure list. Hand the hub paths to the coordinator. Push the branch; open a PR with `scripts/qa/persona-N/**` only if the coordinator asks for the scripts to land.

## Gates and harm metrics

DONE for L8 means: report, `findings.json`, `verdicts.json`, `unmeasured.json` and screenshots exist at the hub path; every harm row carries a measured count and a NOT MEASURABLE count; every finding has a screenshot per viewport; the build marker in every file equals live `/health` at run start and end (state both if it moved); detector validation recorded; nothing written to live. If scripts land by PR, the fourteen-step CI verify job is green on that tip.

## Non-findings

Do not fix, do route: safe-area insets (WebKit on Windows reads 0; could-not-measure); the map artifact's internal layout (owner: the map session, `docs/prototypes/grounds-v0.html`); anything in another lane's zone (write the finding, name the file); the R26 second kind (wholly under the bar at first paint, reachable by scroll) is a UX note and R26 rules it outside harm; real iOS URL bar, keyboard, LCP. All go to the coordinator's `round4/qa/TRIAGE_<date>.md`.

## Tools

Playwright WebKit (Chromium only as a labelled proxy for CPU throttling), `scripts/qa/lib.mjs`, `scripts/qa-scratch-db.mjs`, `docs/integration-program/tools/mint-test-token.mjs` (coordinator runs it), `curl` for `/health` and `/api/modules`, `gh`.

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

Worktree and branch for this lane: `wt-r4-qa-1`, `wt-r4-qa-2`, `wt-r4-qa-3` (one per persona, scripts only). Migration number: none.

## Report format

```
Lane L8 persona N: <name>. Live build start / end: <marker> / <marker>. Tip SHA: <sha>. Engine: Playwright WebKit <ver>, iPhone 14 DPR3 touch.
Harm table: nine rows, each PASS/FAIL, count, worst example, NOT MEASURABLE count.
Ranked list: HIGH <n> / MED <n> / LOW <n>, top three with route and viewport.
Detector validation: <k>/<k>. Could NOT measure: <n>, listed.
Writes to live: none. Local write pass: <yes/no>, scratch schema dropped.
Paths: docs/integration-program/round4/qa/persona-N/ (REPORT, findings.json, verdicts.json, unmeasured.json, screenshots/).
Status: CODED / VERIFIED / DONE.
```
