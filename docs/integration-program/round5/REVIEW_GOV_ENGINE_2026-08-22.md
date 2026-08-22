**CONFIRMED** — tip `6d4e78e3b81782e32f4b915e7937d4e97b80a8ec` (PR #38, wt/r5-gov-engine).

**The deciding line:** I attacked the engine's own laws through the built server with my own tests — Gate E exclusion, fail-closed weights, a mid-ballot mode-flip-plus-reallocation, and the hypha-token refusal — and every law held exactly as claimed.

**Gates, re-run cold by me at the tip:**
- `pnpm check` exit 0; cold tests-tsc (tsbuildinfo deleted first) exit 0
- `pnpm build` exit 0, fresh marker `built @ 6d4e78e` = tip; main JS 514.41 kB (< 700 kB budget)
- `shared/governanceEngine.test.ts` 17 pass; `server/lib/ballots.test.ts` 10 pass (real MySQL, 2.3s)
- `server/loop.e2e.test.ts` whole file against the fresh build: 68 pass, including both G1 tests
- Full suite: 113 files / 1788 tests pass (517s) — exact match to the claim
- check-voice, check-brand-refs, check-hyphen-dash, check-auth-fetch, check-doc-links, check-artifact-budget, check-image-budget: all exit 0 (exit codes read, not tails)
- `validate-module.mjs --diff` on the lane's diff: clean (the 1 violation it found was my own untracked scratch test's raw `fetch`; removed)
- PR checks re-read via `gh` at the tip SHA: verify ×2, intake, review all SUCCESS

**The six attacks:**
1. **Snapshot law** — lane's lib test (dial + weight change mid-ballot, outcome frozen: 2/2 unity 50 vs frozen 80, failed) and route e2e (unity/quorum 80→100, 20→100 mid-ballot, still passed at frozen dials) re-run green. MY test additionally flipped `weight_mode` custom→equal mid-ballot AND handed the yes-voter weight 9: tallies stayed frozen 0/5, failed, and the dial did NOT apply.
2. **Fail-closed** — my test: custom mode with zero allocations refused open with "total voting weight is zero"; absent-row=0 proven in lib; zero-weight members enter the roll but weigh nothing; a hypha-governed weight token was refused at open ("governed on Hypha"), an unknown token with "No token called"; noteless weight change 400 "Say why".
3. **Idempotency** — double-open ER_DUP no-op, double-close zero-rows no-op returning first closer's state, re-vote upsert (one row, latest choice), vote after closes_at refused: all green in the re-run lib file, re-close 409 in e2e.
4. **THE ONE APPLY** — lane e2e proves passed_onsite walks the same tail (brake → cycle hold → apply; I diffed it against the webhook tail at index.ts:20129-20146 — identical order), amendment row carries `gm:<id> bal:<ballotId>`, and my test proved the failed outcome does NOT apply (proposal → failed, dial unmoved). Module OFF: routes 404 `module_disabled`, to_hypha loop works (lane e2e).
5. **Gate E** — my test: a warning badge deny on `ballot.vote` excluded the member from a NEW electorate (exact count 3 not 4), their vote refused with "outside this ballot's electorate"; capability added to union + ALL_CAPABILITIES in lockstep (gate count now 23).
6. **Migration** — 0089 applied from zero on every provisioned scratch schema today (lib harness + e2e child boot). Four-way scan redone myself: all origin refs max 0088, all local refs max 0088, disk scan of all 67 worktrees found `0089_governance_engine.sql` only on this branch. Enum MODIFY preserves every 0044 value and only adds `onsite_vote`/`passed_onsite`. Case-sensitive greps for "Formal decisions bind", "Equity and voice live", "What Hypha governs", "Earned recognition to qualify" in tests: zero hits — no assertion breaks.

**Non-blocking findings (note for the record, none reject-worthy):**
1. `drizzle/0089` comment lines 6 and 8 end in `;`, violating the letter of the house migration rule. Harmless in fact — `splitStatements` strips comment lines before splitting (verified in `server/db/migrate.ts:44-47`, and from-zero provisioning proves it) — but the design doc restates the rule and the file breaks it.
2. 0089 line 83's comment "Only an open objection blocks" contradicts the shipped (and design-§2.4-correct) standing = open + integrated in `standingObjectionCount`.
3. Consent edge: a voter who switches no→yes leaves their auto-filed objection standing `open`; it blocks until withdrawn or ruled. Defensible (objections are first-class), unstated in the design.
4. Crash window: if the server dies between the ballot-close UPDATE and the proposal flip, the proposal is stuck `onsite_vote` (not applyable, not re-ballotable); the code comment's "heals on the admin apply path" overstates recovery. Narrow window, manual fix possible.
5. Cycle-close comment says on-site passes "sort with their close order"; NULL `verified_at` actually sorts them FIRST, by id. Cosmetic.
6. At lifecycle `public` (which the e2e uses) ballot pages with voters' first names are world-readable; design says member-visible. `members` lifecycle gives that; a founder's choice, but worth a line in the module docs.
7. `member.vouch` + `membership.vouch_threshold` ship with no consuming route (G5's zone); threshold default 0 = off. Confirmed stale: `governance.voice_weighting` description (gameVariables.ts:358) still says "Formal decisions bind on Hypha" — correctly flagged for the copy lane.

**Not verifiable here:** CI Node 22 / MySQL 9.4 runtime behavior beyond the green PR checks (local runs are Node 25 + MariaDB; no new dependencies — package.json/lockfile diff empty); token-mode weight resolution against real `token_balances` rows (both refusal paths proven; the positive weighting path is code-read only, matching the lane's own caveat); G2-G5 consumers; the proposed Ring 0 sentence is the founder's ruling to accept, not mine — it greps clean against tests and passes the voice gate.