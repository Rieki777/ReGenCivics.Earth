# Assembly + The Evolution Engine — Comprehensive Build Spec (V2)

Status: **PHASES 1-6 SHIPPED** (2026-07-03); Phase 7 (Rung 3) built dark 2026-07-04, awaiting
human go-ahead + community tier vote. **The as-built state lives in `docs/EVOLUTION-ENGINE.md`
— read that first**; this spec remains the design source of truth for anything not yet built.
Owner: Rye. Route: `/assembly`. Written 2026-07-02, evolved same day.
Amended 2026-07-03 after whole-build review: last-call launch is owner-initiated through the
bridge, not automatic (§2, §11); synthesis carries a global cost cap and kill switch (§5);
migration numbering starts at 0163 (§9); phantom-key and sweep-list notes corrected against the
code (§6, §13); Rung 3 protected paths extended to the gate tooling (§7.3). Companion doc:
`FIXES_TO_MAKE_2026-07-02_forum-governance-evolution.md` — its "Relationship to Assembly" section
defines the one-door rule for forum threads.

This spec is self-contained. A fresh Claude Code instance should be able to build it from this
document plus the repo's standing rules (`CLAUDE.md`, `.ai/docs/STEERING.md`,
`docs/GOLDEN_RULE.md`, `.ai/docs/security/`). Read those first. Follow the standard deploy flow in
`CLAUDE.md` end to end for every phase, including the ship gate and Railway verification.

---

## 0. Vision: an infinite game governed by its players

Assembly is not just a governance page. It is the front door of a **self-evolving game**: players
raise ideas in the forum, shape them into proposals, signal where they stand, ratify them on-chain
through Hypha, and then **the game changes itself** — first its tunable variables, eventually its
own features — with no human gatekeeper in the loop. The degree of machine autonomy is itself a
set of game variables the community governs. The game evolves by the people, and the people decide
how much the game may evolve on its own.

The ladder of autonomy (each rung is community-governed):
- **Rung 0** — humans apply ratified decisions by hand (today).
- **Rung 1** — ratified *variable changes* auto-apply to the live game (this build).
- **Rung 2** — ratified *content changes* (quest copy, page text) auto-apply (later).
- **Rung 3** — ratified *feature changes* auto-build, auto-test, auto-ship through GitHub +
  Railway (scoped in section 7, built behind a flag, enabled by governance).

---

## 1. Scope and boundary

### Game only
Assembly governs the **Game** (RGVoice / $ReGen). The **Fund** (RCVoice / $RCivics) is governed
separately and never appears here. See `CONTEXT_THE_TWO_GAMES.md`.

Banner, pinned at the top of the page, always visible:

> **This is the Game's community-governed space.** Anyone in the community can raise a proposal,
> signal where they stand, and help decide what advances to an on-chain vote. The Fund is governed
> separately.

### Forum, Assembly, Hypha
- **Forum** — where the raw conversation happens. Assembly links back, never replaces.
- **Assembly** — the on-ramp and the mirror: synthesize, signal, pressure-test, launch, record.
- **Hypha** (`regen-games` DHO, `https://app.hypha.earth/en/dho/regen-games/`) — the binding vote
  and agreement ledger on Base. Voting, treasury, members, delegation live there. We link out.

Hard rule: any feature that duplicates the binding vote, agreement ledger, treasury, or
member/delegation management belongs on Hypha, not here. Delegation is a link:
`https://app.hypha.earth/en/dho/regen-games/members/`.

---

## 2. Proposal lifecycle

```
forum thread
   └─ raised into a proposal (requires an AIM line)
        ├─ MINOR LANE: passes after 7 quiet days, or is contested up to the full lane
        └─ FULL LANE:
             forming  → (gates met, owner moves) → last_call (48h) → deciding (Hypha vote)
                │                                        │                  │
                └─ resting (30d quiet, revivable)        └─ objection can   ├─ ratified → EXECUTION
                                                            pull it back    │   (Evolution Engine, §7)
                                                            to forming      └─ rejected → recorded
```

### The aim line (required at raise time)
Every proposal carries one sentence: **"This serves the Game by ___."** Sociocratic practice:
objections are evaluated against the aim, deliberation stays anchored, and the AI synthesis uses it
as its measuring stick. One text field, no exceptions.

### Two lanes
- **Full lane** (default): the complete pipeline below.
- **Minor lane** (lazy consent): for small changes (wording, tweaks that do not move tokens or
  change rules). Raiser flags it minor. It passes automatically after
  `governance.minor_lane_quiet_days` (default **7**) with no objections. Any member can object with
  one click + a reason, which bumps it to the full lane; the "minor" label is community-checkable.
  Minor passes are recorded in Record like everything else. This protects the community's
  governance capacity for decisions that deserve it.

### Last call (48h)
When the owner hits "Move to Decide", the proposal enters a visible **last call** state for
`governance.last_call_hours` (default **48**) before the Hypha handoff. One final chance for a
late objection. A reasoned objection during last call (same standard as the steelman: harm to the
aim, not preference) pulls it back to forming; the objection is displayed.

**Launch is owner-initiated, not automatic (amended 2026-07-03).** The Hypha Bridge is a
human-in-the-loop redirect (signed pre-fill token, the player approves on Hypha), and
`.ai/docs/security/AI-AUTOMATION-RISKS.md` Risk 7 says that final human confirmation stays. So
when last call passes quietly, the proposal flips to a **"ready to launch"** state: the owner is
notified (section 8) and gets a one-click **"Launch the vote on Hypha"** bridge link on the card.
If the owner is idle for 7 days in ready-to-launch, any signed-in member sees the launch link
(the proposal belongs to the community, not the owner's calendar).

### Resting
Forming proposals with no new signals and no new forum replies for
`governance.resting_after_days` (default **30**) collapse into a "resting" strip at the bottom of
Forming. One click revives them. Keeps the list alive without deleting anyone's work.

---

## 3. Page structure (stacked, single scroll, no tabs)

### 3.0 Scope banner
Section 1 copy.

### 3.1 Needs you (logged-in only)
- Your queue (reuse `governance.myDecisionQueue`).
- Forming proposals you have not signaled yet.
- Your proposals ready to move (all gates met) or sitting in last call.
- Minor-lane proposals in their quiet window (so silence is informed consent, not ignorance).
- Community governance load gauge (reuse `governance.communityLoad`), compact.

### 3.2 Forming
One card per proposal, sorted by net points descending. Card anatomy:
- Title + **aim line** + one-line ask.
- "Read the conversation" link to the forum thread.
- **Pros / Cons** (AI-synthesized, voice counts) + **strongest objection** flag with the
  owner's "mark addressed" loop (section 5).
- **Refresh** button with "synced 2h ago" + changelog of what changed since last sync.
- **Readiness meter** (existing gate: min age 48h, min 3 unique voices).
- **The Signal**: 7-segment −3..+3 pills, net points headline, average + count context, mini
  histogram of the seven buckets (section 4).
- **Stale-signal badge**: if synthesis refreshed after you signaled, your pill shows "cast before
  the latest changes" (compare `synthesis.lastSyncedAt > yourSignal.updatedAt`). A nudge, never a
  reset.
- Owner-only **"Move to Decide"**, unlocked when every gate passes; disabled state lists exactly
  which gates are unmet.
- Minor-lane cards show a countdown ("passes in 4 days if no objections") + an "I object" control.

### 3.3 Last call
Its own thin strip between Forming and Deciding: proposals in the 48h window, each with the
countdown and an "raise an objection" control. Subscribed members are emailed when a proposal
enters this state (section 8).

### 3.4 Deciding
Read-only mirror of proposals at a binding Hypha vote: title, closes-at if known, **"Vote on
Hypha"** deep link. No tally, no vote control.

### 3.5 Record
- Recently ratified (reuse `governance.recentlyRatified`).
- **Provenance trail**: forum thread → proposal → Hypha vote → outcome → execution (variable
  updated / feature shipped, with commit link) → Base transaction if tokens moved. Backed by
  `decisionLineage`, `decisionStorytellerNarratives`, and the new `governance_executions` table.
- **Impact update**: the regenerative outcome that followed.
- Overridden objections are recorded here with the owner's override note (accountability trail).

### 3.6 Delegation footer
One link out: "Delegate your voice on Hypha" → `https://app.hypha.earth/en/dho/regen-games/members/`.

### Empty states teach the flow
Every section's empty state explains the pipeline and offers the next action (Forming empty links
to `/community`; Deciding and Record explain what will appear). At launch the page doubles as the
governance explainer.

---

## 4. The Signal (−3..+3)

One adjustable signal per signed-in member per proposal. Replaces the binary upvote.

| Score | Label |
|------:|-------|
| **+3** | I absolutely love this |
| **+2** | I'm for this |
| **+1** | I can live with this |
| **0** | No strong feeling either way |
| **−1** | Needs some changes first |
| **−2** | I'm against this as it stands |
| **−3** | Absolutely not, not in any form |

- 7-segment pill row, one tap sets, tapping again moves, current segment highlighted. Optimistic
  update for the actor, ~15s `refetchInterval` for others. No websockets in V1.
- **Net points** (sum) is the headline and the sort key. **Average** and **count** are context.
  **Histogram** (7 tiny bars) makes consensus vs. split visible; net 0 from apathy looks different
  from net 0 from war.
- **"What would move you?"** — when someone sets −1..−3, an optional one-line prompt appears:
  "What would need to change for this to be a +1?" Stored on the signal row, fed into the next
  synthesis as a first-class objection/suggestion. Opposition becomes improvement fuel.
- **Aggregate-only privacy**: individual scores are never shown to anyone, including the raiser.
  "What would move you" lines surface in the synthesis unattributed.

### Advance gates (all must pass)
1. Readiness (existing `forumThreadReadiness`).
2. `net_points >= governance.signal_advance_points` (default **12**).
3. `average >= governance.signal_advance_avg` (default **+1.0**) — the sentiment floor.
4. No unaddressed strongest objection, OR an explicit recorded owner override with a note.

`moveToDecide` re-checks every gate server-side. Client `canMoveToDecide` is display-only.

---

## 5. AI synthesis

Runs through `invokeLLM` (`server/_core/llm.ts`). Forum text and "what would move you" lines are
**untrusted input**: read `.ai/docs/security/AI-AUTOMATION-RISKS.md` end to end. Delimit clearly,
never allow instruction override, never render returned URLs unsanitized.

Cached per proposal in `proposal_synthesis`:
`pros` `[{point, voiceCount}]` · `cons` `[{point, voiceCount}]` · `steelman` (strongest unresolved
objection) · `steelmanAddressed` (`{replyUrl, note, at}`) · `summary` · `sourceReplyCount` ·
`changelog` (last diff) · `lastSyncedAt`.

- **Refresh**: any signed-in member; only re-runs when new replies exist; cooldown
  `governance.synthesis_refresh_cooldown_min` (default 30) + per-user cap 10/day. Returns a
  changelog ("2 new voices. New objection on water rights. Signal moved toward support.").
- **Cost cap + kill switch (amended 2026-07-03, required by AI-AUTOMATION-RISKS Risk 3 and the
  ADR-21/22 pattern):** a global daily cap on synthesis runs (50/day across all users, counted in
  code, not just per-user), max input/output tokens set on every `invokeLLM` call, and an env kill
  switch `ASSEMBLY_SYNTHESIS_ENABLED` (default on; unset kills the feature without a deploy).
  Synthesis output renders through the same sanitizer as user content with an AI provenance badge.
- **Objection loop**: owner marks the steelman addressed with the resolving forum reply URL; the
  next refresh re-checks whether it still stands and re-opens it with reasoning if not.
- Synthesis input includes the aim line and the anonymized "what would move you" lines.

---

## 6. Game Mechanics page: fully database-driven (critical)

**Requirement from Rye: every variable on the Game Mechanics page is pulled from the database and
updatable, and the variables section renders ONLY from the database. This is the heart of the
game — variables are how the game evolves.**

The schema already supports this completely: `game_variables` has `displayName`, `description`,
`category`, `subcategory`, `value`, `valueType`, `minValue`, `maxValue`, `defaultValue`,
`isActive`, `updatedBy`, plus a `game_variable_history` audit table and an admin
`game.updateVariable` mutation (requires a reason, busts the cache). The page problem is purely
that display metadata was duplicated into hardcoded frontend dicts instead of read from the DB.

### The overhaul
1. **Backfill the DB** (migration `drizzle/016X_game_variables_display_backfill.sql`):
   - UPDATE `displayName` + `description` for every row, migrating the content of the
     `VARIABLE_HELP` dict (`GameMechanics.tsx` ~L105-272) and the hardcoded card copy into the DB.
   - Add a `unit` VARCHAR(20) column (`$ReGen`, `%`, `days`, `hours`, `×`) and backfill it.
   - Fill `minValue`/`maxValue` for every player-facing tunable (these double as slider bounds AND
     as hard bounds for governance auto-apply, section 7).
   - Seed the missing keys the page references. Verified 2026-07-03: the claim-threshold slider
     already points at the live `governance.claim_threshold_regen` (seeded in 0132, matched at
     `GameMechanics.tsx` ~L363) — no fix needed there. The genuine phantoms are
     `gratitude.pool_per_cycle` and `gratitude.claim_threshold` (referenced ~L2187-2219, seeded
     nowhere). Seed both (`GRATITUDE_SYSTEM_SPEC.md` names the pool
     `gratitude.regen_distribution.pool_per_cycle` — pick ONE name, align page + seed + spec doc).
2. **Rebuild the page rendering**:
   - Delete `VARIABLE_HELP` and all hardcoded variable copy. Descriptions come from the row.
   - The Live Variables Dashboard stays (already dynamic via `trpc.game.listVariables`).
   - Reference sections (Citizenship Tiers, Gratitude, Living Tree, Bounty) render from the DB
     grouped by `category`/`subcategory`, using `displayName` + `description` + `unit`.
   - Simulator sliders take `min`/`max`/`baseline` from `minValue`/`maxValue`/`value` (live), step
     derived from `valueType`. Delete `SIM_DEFAULTS` hardcoded baselines.
3. **Acceptance**: change any variable's value or description in the DB (admin UI or SQL) and the
   page reflects it on next load with **zero deploy**. Grep the page for hardcoded variable keys:
   the only remaining literals are section groupings, not values or copy.
4. Known naming inconsistency (`project.` vs `projects.` prefixes in 0099 seeds): do NOT rename —
   server reads them as-is. Note only.

New Assembly variables (section 10) are seeded with proper `displayName`/`description`/`unit` and
therefore appear on the page automatically, satisfying "the game variable is in the game mechanics
section" by construction.

---

## 7. The Evolution Engine (ratified decisions execute themselves)

The goal: once the community ratifies a change on Hypha, the game applies it **without a human in
the loop**, at the autonomy level the community itself has authorized.

### 7.0 Shared plumbing: structured execution payloads
Proposals gain an optional **execution payload** — a typed, validated description of what should
happen if ratified:

```json
{ "kind": "variable_change", "variableKey": "gratitude.budget_base", "newValue": 120 }
{ "kind": "feature", "specMarkdown": "...", "acceptanceCriteria": ["..."], "scopePaths": ["client/src/pages/..."] }
```

Validated at raise time (a `variable_change` outside the variable's `minValue`/`maxValue` bounds is
rejected with a clear message: "propose a bounds change first"). Every execution is logged in the
append-only `governance_executions` table (section 9) and surfaced in Record's provenance trail.

### 7.1 Rung 1 — variable changes auto-apply (THIS BUILD)
- New proposal template: **"Change a game variable"**. Raiser picks the variable (searchable list
  served from the DB), sees current value, bounds, and description, and proposes a new value.
  Assembly's own rules (`signal_advance_points`, `last_call_hours`, tier gate, the autonomy
  settings below) are variables too — **the community tunes its own governance and the machine's
  leash by the same mechanism**. Ostrom's collective-choice principle, made mechanical.
- On Hypha ratification (webhook confirm, same receiver pattern as
  `webhook-receiver.cascadeClaimPassed`): the server applies the change through the SAME code path
  as `game.updateVariable` (bounds re-checked, `game_variable_history` written, cache busted),
  with `updatedBy` = the system governance actor and reason = link to the proposal + Hypha
  agreement. An execution row records it. Record shows "executed automatically" with the before/after.
- Failure (variable deleted, bounds changed since raise): execution row marked `failed` with the
  reason, owner + stewards notified, nothing partially applied.

### 7.2 Rung 2 — content changes (LATER, design placeholder)
Structured content payloads (quest copy, page text stored in DB) auto-apply the same way. Only
content that already lives in the database qualifies. Not scoped further here.

### 7.3 Rung 3 — feature auto-ship (SCOPED HERE, BUILT BEHIND A FLAG)
The full loop: ratified feature proposal → built → tested → shipped, machine end to end.

**Pipeline:**
1. **Ratification webhook** creates a `governance_executions` row (`kind: feature`) and opens a
   GitHub issue on the repo via API, labeled `governance-approved`, body = the ratified spec
   (aim, spec markdown, acceptance criteria, declared scope paths, link to the Hypha agreement).
2. **Builder agent**: a headless Claude Code run (GitHub Action or scheduled runner) picks up
   `governance-approved` issues, builds on branch `assembly/<proposalId>`, and opens a PR that
   references the issue and the proposal.
3. **Machine gates on the PR** (all enforced in CI, none waivable by the agent):
   - `pnpm check`, `pnpm test`, `pnpm build` green.
   - Truncation audit (`python3 scripts/audit-truncation.py`).
   - Automated security review (the `/security-review` skill run headless; findings of
     medium+ severity fail the gate).
   - **Protected-paths check**: the diff may only touch the proposal's declared `scopePaths`, and
     may NEVER touch the protected list (below) regardless of declaration.
4. **Launch window**: after gates pass, the PR waits `evolution.launch_window_hours` (default
   **24**) in a visible "shipping soon" state on Assembly. Any Steward+ can pause it with one
   click (recorded, with reason). This window is a game variable: **the community can vote it down
   to 0 when trust in the machine is earned. Human oversight is a governed dial, not a hardcoded
   veto.**
5. **Auto-merge to `main`** → Railway auto-deploys → the runner polls `railway deployment list`
   to SUCCESS → execution row marked `shipped` with the commit SHA → Record updates → an
   announcement post lands in the forum ("The game just evolved: <title>, ratified <date>,
   shipped <date>").
6. **Rollback**: one action reverts the merge commit and redeploys. Any Steward+ can trigger.
   Logged on the execution row.

**Hard safety rails (not community-tunable, code-enforced):**
- **Protected paths** — the machine may never modify: `server/_core/` (auth, cookies, sdk),
  `server/lib/hypha-bridge/`, `server/webhooks/`, any token credit/claim logic
  (`creditPrivateTokens`, claim bridge, ledger), payment/donation code, `.github/` workflows,
  the protected-paths list itself, and `drizzle/` migrations that drop or alter existing
  columns. Added 2026-07-03: also `CLAUDE.md`, `.ai/docs/`, `docs/GOLDEN_RULE.md`,
  `scripts/audit-truncation.py`, and `scripts/run-migration.ts` — an agent that can edit the
  ship-gate tooling or the standing rules can neuter its own gates. Changes there always require
  a human PR. This list lives at `.github/assembly-protected-paths.json` and the CI check reads it.
- **Circuit breaker** — `evolution.circuit_breaker_failures` (default **2**) consecutive failed
  or rolled-back ships freezes Rung 3 (`evolution.max_autonomy_tier` drops to 1) until a new
  ratified proposal re-enables it. The game notices when it is hurting itself and stops.
- **Prompt-injection posture** — the ratified spec is community-approved *content* but still
  untrusted as *instructions*: the builder agent runs with least-privilege permissions (no
  production secrets, no env access beyond build), the spec is delimited as data in its prompt,
  and the security-review gate runs on the diff regardless of what the spec says.
- **Token model is sacred** — nothing in the Evolution Engine writes tokens. `STEERING.md`
  section 5 rules are untouchable by auto-ship (enforced by the protected paths).

**Autonomy settings (game variables, community-governed via Rung 1):**
- `evolution.max_autonomy_tier` = **1** at launch (variable changes only; 3 = full auto-ship)
- `evolution.launch_window_hours` = **24**
- `evolution.circuit_breaker_failures` = **2**

Rung 3 ships dark: fully built and tested behind `evolution.max_autonomy_tier`, and the community's
first act of meta-governance can be voting the tier up. The game asks its players for permission to
evolve itself. That moment is the point.

---

## 8. Notifications

- **Profile toggle**: add `governanceUpdates: boolean` to the existing `users.notificationPrefs`
  JSON (default false). Surface it in profile settings next to the existing digest/notification
  controls, labeled "Governance updates: email me when a proposal reaches last call or ships."
- **Emails** (via existing Resend infra, `server/_core/email.ts`, logged in the email log like the
  digest):
  - Proposal enters **last call** → subscribers get title, aim, net points, link, window end.
  - Proposal **ships or executes** (any rung) → subscribers get the outcome + provenance link.
  - Batched: at most one governance email per user per day (digest-style roll-up if multiple).
- **Weekly digest**: add an Assembly block to `server/jobs/digestJob.ts` (new forming, in last
  call, moved to Decide, ratified, executed). Small isolated change; reuse its duplicate guard.

---

## 9. Data model

Latest migration at spec time: `0162` — and note TWO files share that number
(`0162_drop_loomio_columns.sql`, `0162_forum_notifications.sql`), so Assembly migrations start at
**0163** and each takes its own number. Apply with `npx tsx scripts/run-migration.ts --all`.
Never drizzle-kit generate/migrate. Also verified 2026-07-03: `game_variables` and
`game_variable_history` exist only in raw SQL (`0096_game_system.sql`), not in `schema.ts` —
"mirror in schema.ts" for those means adding Drizzle definitions for the first time (optional;
`game.ts` reads them via raw SQL today and may keep doing so).

```sql
-- 016X_assembly_signals.sql
CREATE TABLE IF NOT EXISTS proposal_signals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  score TINYINT NOT NULL,                       -- clamped -3..+3 in code
  moveNote VARCHAR(500) NULL,                   -- "what would move you" (negative scores only)
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_proposal_signal (proposalId, userId),
  KEY idx_signal_proposal (proposalId)
);

CREATE TABLE IF NOT EXISTS proposal_synthesis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  pros JSON, cons JSON,
  steelman TEXT, steelmanAddressed JSON,
  summary TEXT,
  sourceReplyCount INT NOT NULL DEFAULT 0,
  changelog JSON,
  lastSyncedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_synthesis_proposal (proposalId)
);

-- 016X_assembly_lifecycle.sql
ALTER TABLE proposals
  ADD COLUMN aim VARCHAR(300) NULL,
  ADD COLUMN lane ENUM('full','minor') NOT NULL DEFAULT 'full',
  ADD COLUMN lastCallStartedAt TIMESTAMP NULL,
  ADD COLUMN restingSince TIMESTAMP NULL,
  ADD COLUMN executionPayload JSON NULL;

CREATE TABLE IF NOT EXISTS governance_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  kind ENUM('variable_change','content','feature') NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','applied','shipping','shipped','paused','failed','rolled_back') NOT NULL DEFAULT 'pending',
  detail JSON,                                  -- commit SHA, PR url, error, pause reason...
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executedAt TIMESTAMP NULL,
  KEY idx_execution_proposal (proposalId)
);
-- Append-only by convention: rows are never UPDATEd except status/detail/executedAt transitions,
-- never DELETEd.
```

Plus the Game Mechanics backfill migration (section 6) and the game-variable seeds (section 10).
Mirror all new tables/columns in `drizzle/schema.ts`. Existing `proposals.status` enum already has
the needed stages (`signaling`=forming, `in_governance`=deciding, `passed`/`implemented`,
`declined`); last call and resting are derived from the new timestamps, not new enum values.

Deprecated, kept for history, no new writes: `proposal_votes`, `proposals.signalVoteCount`.

---

## 10. Game variables to seed

All seeded with proper `displayName`, `description`, `unit`, `minValue`, `maxValue` so they render
on Game Mechanics automatically (section 6). Category `governance` unless noted:

| Key | Default | Bounds |
|---|---|---|
| `governance.signal_advance_points` | 12 | 1..500 |
| `governance.signal_advance_avg` | 1.0 | 0..3 |
| `governance.synthesis_refresh_cooldown_min` | 30 | 5..1440 |
| `governance.signal_min_tier` | "none" | none / co_creator (stored as coded number, see note) |
| `governance.minor_lane_quiet_days` | 7 | 1..30 |
| `governance.last_call_hours` | 48 | 0..168 |
| `governance.resting_after_days` | 30 | 7..120 |
| `evolution.max_autonomy_tier` (category `evolution`) | 1 | 0..3 |
| `evolution.launch_window_hours` (category `evolution`) | 24 | 0..168 |
| `evolution.circuit_breaker_failures` (category `evolution`) | 2 | 1..10 |

Note: `game_variables.value` is DECIMAL; encode `signal_min_tier` numerically (0 = none,
1 = co_creator) with the mapping in `description`. Reuse existing
`governance.promotion.min_thread_age_hours` (48) and `min_unique_voices` (3) for readiness.

---

## 11. tRPC API

New `assembly` router in `server/routes/assembly.ts`, registered in `server/routers.ts`. Reads
public, writes `protectedProcedure`. Signaling and Refresh open to **any signed-in member**;
`assembly.signal` reads `governance.signal_min_tier` on every call so the tier gate is a config
flip later, no deploy. Raising keeps the existing Co-Creator+ check (`requireCoCreatorPlus`).

```
assembly.forming()          → cards: proposal(+aim,+lane), synthesis, signal aggregates
                              {netPoints, avg, count, histogram[7], mySignal?, mySignalStale?},
                              readiness, gates {readiness, points, avg, objection}, canMoveToDecide
assembly.lastCall()         → proposals in the window, with endsAt
assembly.deciding()         → mirror rows + Hypha deep links
assembly.record({limit?})   → ratified + executions (provenance trail) + impact
assembly.needsYou()         (protected) → queue, unsignaled, readyToMove, minorPending, load
assembly.signal({proposalId, score, moveNote?})   (protected)
                              zod: score int -3..3; moveNote max 500, only stored when score < 0.
                              Upsert on (proposalId,userId). → fresh aggregates
assembly.mySignal({proposalId})                   (protected) → {score, updatedAt} | null
assembly.refreshSynthesis({proposalId})           (protected) cooldown + 10/day cap → synthesis+changelog
assembly.markObjectionAddressed({proposalId, replyUrl, note?})  (protected, owner) → steelmanAddressed
assembly.objectMinor({proposalId, reason})        (protected) bumps minor → full lane
assembly.objectLastCall({proposalId, reason})     (protected) pulls last_call → forming, objection recorded
assembly.moveToDecide({proposalId, overrideObjection?}) (protected, owner)
                              server-side re-check of ALL gates → enters last_call
assembly.raiseFromThread({forumPostId, aim, lane, executionPayload?, ...}) (protected, Co-Creator+)
                              validates executionPayload bounds at raise time
```

Server jobs (extend the existing scheduled-jobs pattern):
- `assemblyLifecycleJob` (hourly): expire last-call windows → flip to ready-to-launch + notify
  the owner (owner-initiated bridge launch, §2); pass quiet minor-lane proposals; mark resting;
  send batched notification emails.
- Hypha ratification handling: extend the existing webhook receiver; on confirm, run the execution
  dispatcher (Rung 1 applies variable changes via the `game.updateVariable` code path with the
  governance actor; Rung 3 creates the GitHub issue when `evolution.max_autonomy_tier >= 3`).

Reuse untouched: `governance.communityLoad`, `governance.recentlyRatified`,
`governance.myDecisionQueue`. `moveToDecide`'s bridge launch goes through
`server/lib/hypha-bridge/` — extend it with a new intent type if none of the 11 routes fits; never
hand-roll the redirect (`.ai/docs/HYPHA-BRIDGE.md`).

Run the `.ai/docs/security/BUILD-PLAYBOOK.md` checklist for every new procedure, webhook change,
and table.

---

## 12. Frontend

Page `client/src/pages/Assembly.tsx`; components in `client/src/components/assembly/`:
`ScopeBanner`, `NeedsYouStrip`, `FormingList`/`ProposalFormingCard` (with `SignalControl`,
`SignalReadout`+`SignalHistogram`, `MoveNotePrompt`, `ProsConsPanel`, `SteelmanFlag`,
`ReadinessMeter`, `RefreshSynthesisButton`, `MoveToDecideButton`, `MinorLaneCountdown`),
`LastCallStrip`, `DecidingList`, `RecordList`/`ProvenanceTrail`, `RestingStrip`,
`DelegationFooter`.

Style: match the dark-green glass aesthetic (`bg-white/5 border-white/10 rounded-2xl`, `#7dd87d`
accent, `var(--font-display)` headings) — copy patterns from `DecisionsDashboard.tsx`. Mobile-first;
the pill row must be comfortably tappable at 375px. All user-facing copy follows `STEERING.md`
section 1 (no em-dashes, no contrast framing, plain language, Rye's voice). Joyful touches are
welcome where they cost nothing: the "shipping soon" state can feel like a countdown to a season
launch, the Record section is a story, not a table.

Profile settings: add the "Governance updates" toggle where notification prefs already render.

---

## 13. Nav, routes, redirects

- Add `/assembly` in `client/src/App.tsx`. `/proposals` and `/community/decisions` become
  route-level redirects to `/assembly` (wouter `<Redirect>`), kept permanently.
- Desktop menu (`client/src/components/Navigation.tsx` ~L438-513): remove "Proposals" (~L445-451)
  and "Decisions" (~L493-499); add **"Assembly"** immediately after "Governance" (~L486-492),
  icon `Vote`, target `/assembly`. Mobile: same change ~L1133+ and `client/src/config/mobileMenu.ts`.
- Sweep all references to the old routes. Verified 2026-07-03, the actual reference sites are:
  `CommandPanel.tsx:184`, `mobile/WizardRadialMenu.tsx:176`, `pages/Governance.tsx:810` (all
  `/proposals`), plus `/community/decisions` in `StorytellerStories.tsx`, `GovTenant.tsx`,
  `Navigation.tsx`, `mobileMenu.ts`. (`prefetch.ts`, `SEO.tsx`, `SiteFooter.tsx` have no route
  references; `CommandPalette.tsx` has neither route.) Grep repo-wide for both paths before
  calling this done.
- Retire `Proposals.tsx` and `DecisionsDashboard.tsx` only after redirects are verified live.

---

## 14. Build phases + acceptance criteria

Each phase ends with the three ship gates (`CLAUDE.md`: truncation audit, CSS grep for new
classNames, typecheck) plus evidence (file:line, grep output, screenshot), then the full deploy
flow (test → migrate → `/ship` → push → poll Railway to SUCCESS → verify in production).

### Phase 1 — Skeleton + merge
Route, redirects, nav, banner, section scaffolding on existing data, Deciding mirror, delegation
footer, empty states.
**Accept:** `/assembly` renders; both old routes redirect; menu updated desktop + mobile; typecheck
green.

### Phase 2 — Signal
Signals migration + schema mirror, `signal`/`mySignal`/`forming`, pill row, readout, histogram,
net-points sort, stale badge, "what would move you" prompt, tier-gate toggle (off).
**Accept:** two accounts signal + adjust; aggregates update; sort follows net points; second signal
overwrites; score 4 rejected; moveNote stored only for negative scores.

### Phase 3 — Synthesis
Synthesis table, `refreshSynthesis`, pros/cons, changelog, steelman + addressed loop, cooldown +
cap; moveNotes and aim feed the prompt.
**Accept:** real thread synthesizes with voice counts; no-new-replies refresh no-ops politely;
new-replies refresh diffs; objection re-opens when unresolved.

### Phase 4 — Lifecycle + notifications
Aim required at raise; lanes; minor quiet-window pass + objection bump; last call with objection
pull-back; resting/revive; `assemblyLifecycleJob`; profile toggle; last-call + shipped emails;
digest block.
**Accept:** minor proposal passes after quiet window (test with a short var value); objection bumps
it; last call expiry fires the bridge launch; subscriber receives the last-call email (Resend log);
non-subscriber does not.

### Phase 5 — Game Mechanics DB-driven overhaul
Backfill migration (displayName/description/unit/bounds for all ~205 rows, VARIABLE_HELP content
moved into DB), phantom-key fixes, page rebuild rendering only from DB, simulator bounds from DB.
**Accept:** change a description and a value in the DB → page shows both with no deploy;
`VARIABLE_HELP` and `SIM_DEFAULTS` deleted; grep shows no hardcoded variable copy; new Assembly
variables visible on the page with help text.

### Phase 6 — Evolution Rung 1
`governance_executions`, execution payloads on raise (bounds-validated), "Change a game variable"
template, webhook-confirm dispatcher applying via the `updateVariable` code path, Record provenance
shows executions.
**Accept:** end-to-end on a test variable: raise with payload → (simulated) ratification event →
variable updated in DB with history row + governance actor + proposal-linked reason → execution row
`applied` → visible in Record. Out-of-bounds raise rejected with the "propose a bounds change
first" message.

### Phase 7 — Evolution Rung 3 (auto-ship, dark launch)
Protected-paths file + CI check, GitHub issue creation on ratified features, builder-agent workflow,
machine gates, launch window with Steward pause, auto-merge + deploy verify, rollback action,
circuit breaker. All gated behind `evolution.max_autonomy_tier >= 3` (default 1: everything is
built and testable, nothing fires in production).
**Accept:** with tier forced to 3 in a test environment: a toy ratified feature flows issue → PR →
gates → launch window → merge → deploy SUCCESS → execution `shipped` with SHA → forum announcement.
Protected-path violation in the diff fails CI. Two consecutive failures trip the breaker (tier
drops to 1, logged).

### No-code item
Add an **Assembly Steward** seasonal role (tends the pipeline: nudges resting proposals, helps
first-time raisers, closes Record loops) via the `regen-seasonal-roles` skill →
`SEASONS_HISTORY.md` / current season doc.

---

## 15. Decisions locked (do not re-litigate without Rye)

1. Scale is **−3..+3** (7 points). Ranking is **net points** (sum); average floor +1.0 as a gate.
2. Signaling + Refresh open to **any signed-in member**; tier gate is the `signal_min_tier`
   config flip, built now, off at launch.
3. Assembly is **Game-only**; the Fund never appears here.
4. Signals are **aggregate-only**; individual scores never shown; moveNotes surfaced unattributed.
5. **Delegation links out to Hypha**, never rebuilt. Binding votes live on Hypha, full stop.
6. **Stacked single-scroll** layout, no tabs.
7. **Aim line required**; objections judged against the aim.
8. **Two lanes** with lazy consent for minor; **48h last call**; **30d resting**.
9. **Game Mechanics page renders variables ONLY from the DB**; hardcoded variable copy is deleted.
10. **The Evolution Engine's autonomy is community-governed** via `evolution.*` variables;
    Rung 1 on at launch, Rung 3 built dark behind the tier variable; protected paths and the
    circuit breaker are code-enforced and NOT community-tunable.
11. Old routes redirect permanently; `proposal_votes` deprecated, never dropped in this build.

## 16. Open items for the builder (decide in-flight, log the choice)

- Exact Hypha Bridge intent type for the ready-to-launch handoff. Note the distinction: Hypha has
  11 *creation routes* (`HYPHA-BRIDGE.md`), the bridge has 8 *intent types*
  (`server/lib/hypha-bridge/intents.ts`). `decision-to-contribution` is the closest existing
  intent; add a new one (e.g. `assembly-proposal-to-contribution`) if the pre-fill shape differs,
  plus a `DOMAIN-LANGUAGE.md` entry.
- Write ADRs for the load-bearing choices this spec introduces (Assembly page + one-door rule,
  the Signal, the Evolution Engine + autonomy variables) per `CLAUDE.md`'s ADR rule.
- Whether the Hypha ratification event arrives via the existing Alchemy webhook or needs a new
  subscription — wire whichever is real, stub with an admin "confirm outcome" action if neither
  carries it yet, and log the gap in `SHIPPED_LOG.md`.
- Builder-agent runner for Rung 3: GitHub Action vs. scheduled Railway job. Pick based on where
  secrets can be scoped tightest.
- Batching window implementation for governance emails (reuse the digest duplicate-guard pattern).
