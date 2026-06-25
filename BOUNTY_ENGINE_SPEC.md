# Bounty Engine Spec

**Status:** Draft for build. Created 2026-06-24. Revised 2026-06-24 (unified engine; integrity hardening; big-bang build since the payment system is pre-launch and has no live data to preserve).

One bounty engine for every kind of rewarded work in ReGen Civics. The first two kinds it serves are call tasks and code contributions, the latter being the two-sided propose-and-ship flow. The engine is built so a third or fourth kind is a small adapter rather than a new system, and so the part that mints real tokens is correct by construction.

This spec assumes the token model in `CLAUDE.md` (private-first ledger, `creditPrivateTokens`, one-way claim bridge to Base).

---

## 1. Why one engine

There is one bounty flow today, in `server/routes/callTasks.ts`, and it is not yet serving live users. The first draft of this spec was going to add a second, parallel flow for code contributions with its own table and its own payout code. Two payout paths means two copies of the most safety-critical logic in the system, the part that credits real tokens, which is two places to get idempotency right and two audit surfaces to reason about.

One engine with a single hardened payout path is the core security argument. The simplicity argument is the same shape: one lifecycle, one approval gate, one notification pattern, one `game_variables` namespace, one admin queue, reused by every kind.

This is not a single wide table with a column for every field and a pile of `if kind == ...` branches. The design keeps a small shared core and pushes everything kind-specific into typed adapter logic.

**Big-bang, no migration.** Because the existing call-task flow has no live data, the build replaces it outright. The legacy `callTasks` table and router are deleted in the same overhaul. There is no backfill, no dual-write window, and no read-only transition table. The engine is the only payment path that ever exists.

---

## 2. The shared idea: a bounty has payable roles

Every rewarded unit of work is a **bounty**. A bounty has one or more **payable roles**. A role is a slot a player fills and gets credited for.

- A **call task** is a bounty with one role: the doer.
- A **code contribution** is a bounty with two roles: the proposer (who suggested the fix or feature) and the shipper (who built it and got it merged).
- A **reviewed contribution** adds a third role: the reviewer.
- A **community-boosted** bounty adds booster roles that increase the pot.

"Two-sided" is "two roles." The engine pays roles and never knows how many sides a bounty has. This is what lets the proposer and the shipper each earn from one piece of work, and what lets new reward shapes drop in without a schema change.

---

## 3. Data model

Four tables. Source-specific fields live as typed columns on the core, so there is no 1:1 JSON sidecar table and no extra join on every read.

### `bounties` (core, work lifecycle only)

```
bounties
  id                  int PK autoincrement
  sourceType          enum [call_task, contribution]
  title               varchar(255)
  body                text
  tokenType           varchar(16) default "regen"
  tier                enum [trivial, small, medium, large] nullable
  workStatus          enum [proposed, accepted, open, claimed, in_review,
                            completed, declined, expired]
  approvedBy          int nullable            -- maintainer who accepted (gate 1)
  declinedReason      text nullable
  completionChecklist json nullable           -- definition of done (sec. 11)
  expiresAt           timestamp nullable

  -- contribution adapter fields (null for call_task)
  kind                enum [fix, feature] nullable
  sourceForumPostId   int nullable
  githubRepo          varchar(255) nullable
  githubIssueNumber   int nullable
  mergedPrNumbers     json nullable           -- one or more PRs (sec. 11)

  -- call_task adapter fields (null for contribution)
  recordingId         int nullable
  roleSlug            varchar(64) nullable
  evidenceQuote       text nullable
  evidenceTs          int nullable

  createdAt, updatedAt timestamps
  index (workStatus, sourceType)
  index (githubRepo, githubIssueNumber)
```

`workStatus` describes the work only. It never encodes whether money moved. Payment state lives on the role, and only there.

### `bounty_roles` (payable slots; the only owner of payment state)

```
bounty_roles
  id           int PK autoincrement
  bountyId     int FK -> bounties.id
  role         enum [doer, proposer, shipper, reviewer, booster]
  userId       int nullable          -- null until claimed/filled
  amount       int default 0
  payStatus    enum [unfilled, filled, payable, held, paid, reversed, void]
  ledgerId     int nullable          -- FK into user_token_ledger once paid
  filledByLog  json nullable         -- who filled it, when, by what action
  paidAt       timestamp nullable
  claimableAt  timestamp nullable    -- settlement hold expiry (sec. 9)
  createdAt, updatedAt timestamps
  index (bountyId)
  index (userId, payStatus)
```

### `bounty_events` (immutable audit log of every transition)

```
bounty_events
  id          int PK autoincrement
  bountyId    int FK
  roleId      int nullable
  actorUserId int nullable
  event       varchar(48)   -- proposed, accepted, claimed, pr_linked, merged,
                            -- paid, held, reversed, declined, expired, disputed
  detail      json nullable
  createdAt   timestamp
  index (bountyId, createdAt)
```

Every state change writes one row here. Disputes, separation-of-duties checks, and debugging all read from it.

### `webhook_deliveries` (event-level idempotency)

```
webhook_deliveries
  deliveryId  varchar(64) PK   -- GitHub X-GitHub-Delivery UUID
  receivedAt  timestamp
```

A redelivered GitHub event is dropped before it reaches matching.

### `bounty_permissions` (who is empowered)

```
bounty_permissions
  userId       int PK FK -> users.id
  canAccept    tinyint default 0   -- accept/decline proposals, manage the queue
  canReverse   tinyint default 0   -- reverse a payout during the settlement hold
  grantedBy    int nullable        -- which admin granted it
  grantedAt    timestamp
```

At launch, `rieki.cordon@gmail.com` is seeded with both `canAccept` and `canReverse`. The admin section (sec. 12) lets that owner grant `canAccept` to other trusted accounts as the community grows. Merge rights to the protected branch are controlled separately on GitHub, by who holds repo write access.

### Profile additions on `player_profiles`

```
githubHandle      varchar(255) nullable
githubId          int nullable          -- numeric GitHub id, stable across renames
githubLinkedAt    timestamp nullable
```

### Ledger idempotency

Add a nullable, unique `idempotencyKey` to `user_token_ledger`. Bounty credits set it to `bounty:{bountyId}:{role}`. Non-bounty credits leave it null (MySQL unique indexes permit multiple nulls). A second attempt to credit the same role on the same bounty hits a constraint violation instead of minting twice. Money correctness does not depend on application logic being perfect.

---

## 4. The single payout path

Every credit in the system flows through one function. This is the heart of the integrity case.

```
payRole(roleId):
  1. load role + bounty + all roles on the bounty
  2. separation-of-duties check (sec. 10). If violated, set payStatus=held,
     log, require maintainer consent, stop.
  3. season budget check (sec. 9). If this credit would exceed the season's
     bounty budget, set payStatus=held, log, stop.
  4. compare-and-swap payStatus: payable -> paid   (atomic; second call no-ops)
  5. if the swap did not apply, return (already paid; idempotent)
  6. ledgerId = creditPrivateTokens({
        userId, tokenType, amount: role.amount,
        source: sourceTagFor(role),          // call_task_bounty | bounty_proposal | bounty_delivery
        sourceId: bounty.id,
        idempotencyKey: `bounty:${bounty.id}:${role.role}`,
        description: bounty.title })
     // the unique key makes a duplicate credit physically impossible
  7. set role.ledgerId, paidAt, and claimableAt = now + settlement hold (sec. 9)
  8. write a `paid` event; notify the player
```

No other code path writes a bounty reward. Webhooks, manual admin consent, and auto-pay all converge here, so the double-pay guard, the budget cap, the separation-of-duties rule, and the settlement hold apply automatically to every kind.

Source tags stay per-role so the ledger keeps its current vocabulary: `call_task_bounty` for the doer, `bounty_proposal` for the proposer, `bounty_delivery` for the shipper.

---

## 5. Lifecycle

One work-lifecycle state machine on the bounty. Payment state is tracked separately on each role.

```
  proposed   -- suggested (contribution) or seeded (call task)
     | accept (gate 1, admin, sec. 10)
     v
  accepted   -- bounty opens; proposer role becomes payable only if pay-on-merge is off
     v
  open       -- claimable on the board
     | a player claims a role
     v
  claimed
     | work submitted: artifact (call task) or PR linked (contribution)
     v
  in_review
     | completion trigger fires (sec. 11)
     v
  completed  -- remaining roles set payable, run through payRole
```

Side paths shared by all kinds: `declined` (rejected with a reason) and `expired` (claimed but never completed inside the window; the role returns to `unfilled` and the bounty to `open`, mirroring the nightly stale-claim job already in the token system).

Completion triggers per kind: call tasks complete on circle consent or auto-pay under the ceiling; contributions complete on a verified merge (sec. 6) plus a satisfied definition of done (sec. 11).

---

## 6. Proof of ship for contributions

The shipper is paid on a merge that actually means something, checked from GitHub itself rather than from a self-report.

A merge qualifies only when all of these hold:

1. The PR merged into the repo's protected default branch.
2. Required CI checks on the merge commit passed (read the check-suite conclusion from the webhook payload; a green branch-protection config is verified, not assumed).
3. At least one approving review came from a human other than the PR author (this is the separation-of-duties proof, sec. 10).

Matching a merged PR to a bounty, checked in order: an explicit `Bounty: #<id>` line in the PR body, then a linked issue (`Closes #<issue>`) whose number matches the bounty, then a `bounty-<id>` label. The PR author's numeric GitHub id is matched to `player_profiles.githubId` to find the shipper. An unmatched merge lands in a pending queue for a maintainer. No silent drops.

---

## 7. GitHub linking

To receive a shipper reward, a player links GitHub to their profile, following the existing `linkBaseAccount` shape in `server/routes/players.ts`.

Add a GitHub OAuth provider alongside Google and Apple in `server/_core/oauth.ts`. The player clicks "Link GitHub," authorizes, and the callback writes `githubHandle`, `githubId`, `githubLinkedAt`, and `githubAccountAge`. OAuth proves the player controls the account, which is what makes automated payout safe. One GitHub id maps to one profile, the same de-duplication guard the Base-account link uses.

Linking is required only for the shipper role. Proposing needs no link, since proposals live inside ReGen Civics.

---

## 8. Automation: merge to credit

```
  GitHub --(pull_request: closed, merged=true)--> webhook receiver (server/webhooks/)
       |
   1. verify HMAC (X-Hub-Signature-256)
   2. drop if X-GitHub-Delivery already in webhook_deliveries  (idempotency)
   3. match PR -> bounty (sec. 6)
   4. verify CI green + non-author approval (sec. 6); else hold for maintainer
   5. match author githubId -> profile -> shipper role
   6. bounty.workStatus -> completed; mark roles payable
   7. payRole(shipper); payRole(proposer) if pay-on-merge
       |
   also subscribe to revert detection on the default branch (sec. 9)
```

The webhook decides which roles are payable and then calls the shared `payRole`. It holds no payout logic of its own, so every integrity rule applies without being re-implemented.

---

## 9. Economic integrity

Bounties mint private tokens that count toward scores, voice weight, and citizenship tier, and can be claimed to Base. The engine treats issuance as a controlled supply, not a faucet.

**Pay for shipped value.** `bounty.pay_proposal_on` defaults to `merge`. The proposer is paid only when the work actually lands, so nothing is minted for ideas that never ship.

**Tiered pricing, no free-form amounts.** A bounty's reward is set by its `tier`, mapped to fixed amounts in `game_variables`. Maintainers pick a tier rather than typing a number, so total issuance is bounded by a small known schedule. Example schedule (set the real values in `game_variables`):

```
bounty.tier.trivial.delivery = 25
bounty.tier.small.delivery   = 75
bounty.tier.medium.delivery  = 250
bounty.tier.large.delivery   = 750
bounty.proposal_fraction     = 0.15   // proposer earns 15% of the delivery amount
```

**Season minting budget (built, off by default).** `game_variables` holds `bounty.season_budget`, unset at launch, which means unlimited issuance. When a positive value is set, `payRole` sums bounty issuance for the active season and holds any payout that would cross the cap, pending maintainer consent, rather than minting past it. The cap mechanism ships now; the limit stays off until you choose one.

**Settlement hold before claimability (one moon cycle).** Both the proposer and the shipper are credited to the private ledger at merge, but the tokens are not claimable to Base until `claimableAt`, set to one moon cycle (29.5 days, `bounty.settlement_hold_hours = 708`) after payout. The claim bridge checks `claimableAt` before letting bounty-sourced tokens cross to Base. The hold is the review window: during the moon cycle an empowered admin can reverse a payout, and after it the tokens are the contributor's to cash out.

**Reversal and clawback.** Because the ledger is append-only, a reversal is a compensating negative `creditPrivateTokens` entry with source `bounty_reversed`, plus the role moving to `reversed`. A reversal fires when a merged PR is reverted on the default branch within the hold window, or when a maintainer upholds a dispute. After tokens have crossed to Base they cannot be clawed back (the bridge is one-way), which is the entire reason the settlement hold sits in front of the bridge.

---

## 10. Integrity rules: separation of duties and sybil resistance

The proof of ship assumes the people in the loop are distinct humans. In a small pre-launch community that assumption fails by default, so it is enforced rather than trusted.

**Separation of duties (one identity, multiple roles).**
- The accept gate counts only if the accepter is a different user than the proposer.
- Auto-pay is blocked, and maintainer consent is required, whenever one user fills more than one paid role on the same bounty.
- The shipper auto-payout requires an approving PR review from someone other than the author (sec. 6).
- `filledByLog` and `bounty_events` record which user filled each role, so any overlap is visible and auditable.

A solo contributor still earns legitimately. What is blocked is the unchecked loop where one account proposes, accepts, ships, reviews, and collects every role.

**Sybil resistance through empowerment, not account heuristics.** New contributors are welcome, so there is no account-age or history gate on participation. Any new account can propose, claim a role, and earn. The defense against one person wearing two identities to collect both sides sits at the two points that actually release value, and both are gated to empowered humans:
- Only an empowered maintainer (`canAccept`) can accept a proposal, and a maintainer cannot accept their own proposal. A self-made second identity cannot self-approve its way to a payout.
- Only an empowered maintainer can merge code to the protected branch (controlled by GitHub repo write access). The merge is the proof of ship, so the act that triggers the shipper payout is already in trusted hands.
- The moon-cycle settlement hold (sec. 9) gives an admin a full review window to catch and reverse anything that slips through before tokens become irreversible.

Optional guards that ship in the code but stay off at launch, switchable in `game_variables` when you want them:
- A citizenship-tier floor for large bounties (`bounty.large_tier_min`, default `explorer` so every account qualifies now). The tier system is built and read; the floor is simply set to the lowest tier.
- Per-account velocity limits on open roles and earnings per period (unset by default).

---

## 11. Completion is not "one PR merged"

The naive model of one bounty equals one PR equals done is wrong for real engineering work. A fix can take several PRs, a feature can land in stages, and a merge can be incomplete.

- A bounty can reference more than one merged PR (`mergedPrNumbers`).
- Accepting a bounty can attach a `completionChecklist` (the definition of done). The bounty completes when the linked PRs are merged and the checklist is satisfied, confirmed by the reviewer or maintainer. For a simple bounty the checklist is empty and a single qualifying merge completes it.
- A reverted merge inside the hold window reopens the bounty and reverses the payout (sec. 9).

This keeps the trigger honest: payout follows work that is actually finished and actually passing, not work that merely touched the branch.

---

## 12. tRPC surface

One router, `server/routes/bounties.ts`, registered in `server/routers.ts` as `bounties`.

```
propose         protected   create a bounty (sourceType + typed fields)
listBoard       public      open + accepted bounties, filterable by sourceType / tier
listMine        protected   roles I hold, across all kinds
claimRole       protected   fill a role (e.g. take the shipper slot)
releaseRole     protected   give up a claimed role
linkPr          protected   attach a PR to a contribution bounty (-> in_review)

accept          maintainer  gate 1: accept a proposal (enforces accepter != proposer; needs canAccept)
decline         maintainer  reject with reason (needs canAccept)
adminQueue      maintainer  proposals to review, held payouts, unmatched merges, disputes
resolvePending  maintainer  attach an unmatched merge to a role
consentAndPay   maintainer  release a held payout (budget / role-overlap)
reverse         maintainer  reverse a payout during the hold (needs canReverse; writes bounty_reversed)

grantMaintainer  superadmin grant canAccept / canReverse to a user
revokeMaintainer superadmin remove a user's bounty permissions
listMaintainers  superadmin current empowered accounts
```

Maintainer procedures check `bounty_permissions` (`canAccept` for the queue, `canReverse` for reversal), not the generic admin role. The grant / revoke / list procedures are superadmin-only, so the owner controls who is empowered. Profile procedures in `server/routes/players.ts`: `linkGithub`, `unlinkGithub`, `getMyGithub`.

---

## 13. Profile UI and board

Profile "Contributions" tab: Link GitHub button and state, my proposals, my claimed deliveries, linked PRs and merge state, settlement-hold countdown on held tokens, and a running total earned per role type.

Public **Bounty Board**: open and accepted bounties with title, kind, tier, the reward per open role, and a Claim button per role. It reads as a live contribution roadmap the community can pull from.

---

## 14. Further refinements (optional, post-core)

Several earlier ideas are now in the core: tiered pricing, the review role, separation-of-duties guards, definition of done. These remain optional:

1. **Community boosting.** Players add tokens from their own private balance as a `booster` role to raise an open bounty, a crowdpool for code that surfaces what the community wants built.
2. **Auto-draft the tracking issue.** On accept, generate a GitHub issue from the proposal body so PR matching via `Closes #issue` is automatic.
3. **Shipper reputation and streaks.** Track merged-contribution count and a reputation score, surfaced as a badge and fed into the citizenship tier loop.
4. **First-merge onboarding quest.** A Welcome Aboard quest over a curated `good-first-issue` set with a guaranteed starter bounty, guiding new technical players from signup to a merged PR.
5. **Seasonal contribution leaderboard.** Roll completed bounties into the seasons system with a per-season leaderboard and a Harvest moment.
6. **Stale-role auto-release and nudges.** Nudge an idle claimed role, then return it to `unfilled` after the window, mirroring `cancelStaleClaimBridges`.
7. **Dynamic pricing.** Auto-escalate the tier of a bounty that sits unclaimed too long until it clears.
8. **Maintainer SLA and escalation.** Nudge maintainers when proposals sit unaccepted, so contributors keep faith in the queue.

---

## 15. Build plan (big-bang, single path)

No migration phase. The engine ships as one coherent overhaul and replaces the legacy call-task flow.

### Phase 1: Engine core
- Migrations: `bounties`, `bounty_roles`, `bounty_events`, `webhook_deliveries`, `bounty_permissions`, the `player_profiles` GitHub columns, and the `user_token_ledger` `idempotencyKey` unique index.
- Delete the legacy `callTasks` table and `server/routes/callTasks.ts`.
- Implement `payRole` (single payout path) with idempotency key, separation-of-duties check, season-budget check, and settlement hold.
- Shared lifecycle + `bounty_events` logging.
- `bounties` router: full surface from section 12.
- Source tags `bounty_proposal`, `bounty_delivery`, `bounty_reversed`; keep `call_task_bounty`.
- `game_variables` keys: tier schedule, `bounty.proposal_fraction`, `bounty.pay_proposal_on` (= `merge`), `bounty.season_budget` (unset = unlimited), `bounty.settlement_hold_hours` (= 708), `bounty.large_tier_min` (= `explorer`), optional velocity limits, auto-pay ceiling.
- Both call-task and contribution bounties run through the engine from day one.

### Phase 2: GitHub identity
- GitHub OAuth provider and `linkGithub` / `unlinkGithub` / `getMyGithub`, capturing `githubAccountAge`.
- Link GitHub UI on the profile.

### Phase 3: Merge automation
- GitHub webhook receiver with HMAC verification and delivery dedup.
- PR-to-bounty matching, CI-green + non-author-approval verification, author-to-profile matching, revert detection.
- Auto-credit through `payRole`; pending queue and `resolvePending` for unmatched merges.

### Phase 4: Refinements
- Pull from section 14 as desired. Suggested first: community boosting (1) and first-merge onboarding quest (4).

### Verification (every phase)
- Run the ship gate: `python3 scripts/audit-truncation.py`, the className grep for any new CSS, and `pnpm typecheck` at exit 0.
- Money-path tests: a redelivered webhook pays once; a duplicate `payRole` call pays once; an over-budget payout holds; a role overlap holds; a revert inside the hold window reverses; the claim bridge refuses bounty tokens before `claimableAt`.

---

## 16. Handoff Breakdown, Who Does What

### YOU (Rye), things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Create a GitHub OAuth App | Needs your GitHub account and org access | github.com/settings/developers, callback `https://regencivics.earth/api/oauth/github/callback` |
| H2 | Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to Railway | Railway dashboard login | Railway, ReGenCivics.Earth service, Variables |
| H3 | Create the GitHub webhook on the repo | Repo admin access | Repo Settings, Webhooks, point at `/api/webhooks/github`, subscribe to Pull requests |
| H4 | Add `GITHUB_WEBHOOK_SECRET` to Railway | Must match the webhook secret in H3 | Railway Variables |
| H5 | Run the engine migrations | DB only reachable from your machine | `npx tsx scripts/run-migration.ts --all` |
| H6 | Run the `game_variables` + owner-permissions seed | Writes to production DB | Seed script (Claude Code writes it; you run it). Seeds the moon-cycle hold, tier schedule, and `canAccept` + `canReverse` for `rieki.cordon@gmail.com` |
| H7 | Confirm branch protection on the default branch | Repo admin; the proof of ship depends on it | Repo Settings, Branches (require review + required checks) |
| H8 | `git add -A && git commit && git push` after each phase | Deploy gate | repo root |
| H9 | Confirm Railway deploy is green before live testing | Dashboard access | Railway deploy logs |

### CLAUDE CODE, can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | Write all engine migrations + ledger idempotency index | TODO |
| C2 | Delete legacy `callTasks` table + router | TODO |
| C3 | Implement `payRole` with all four integrity gates | TODO |
| C4 | Build `server/routes/bounties.ts` and register it | TODO |
| C5 | Add `bounty_proposal` / `bounty_delivery` / `bounty_reversed` source tags | TODO |
| C6 | Add GitHub OAuth provider + link procedures | TODO |
| C7 | Build the webhook receiver: HMAC, dedup, CI + approval checks, revert detection | TODO |
| C8 | PR-to-bounty + author-to-profile matching | TODO |
| C9 | Profile Contributions tab + public Bounty Board | TODO |
| C9b | Admin Bounty Maintainers section (grant/revoke canAccept, canReverse) + held-payout review/reverse UI | TODO |
| C10 | Write the `game_variables` + owner-permissions seed script | TODO |
| C11 | Write money-path tests (sec. 15) | TODO |
| C12 | Append the engine ADR to `.ai/docs/DECISIONS.md` | TODO |
| C13 | Run the ship gate | TODO |

### WAITING ON YOU before Claude Code can proceed

- Live OAuth testing is blocked until H1, H2, H8.
- Live merge-payout testing is blocked until H3, H4, H7, and a real test PR merge.
- All of Phase 1 builds and typecheck-verifies with no human step except the migration run (H5) and the deploy (H8).

---

## 17. Open questions for Rye

Defaults are chosen so the build can start. The economic ones carry real consequences, so confirm or adjust before launch. All live in `game_variables` and move without a code change.

Decisions locked for this build: settlement hold is one moon cycle (29.5 days), the season budget ships unlimited (cap mechanism built, off), both proposer and shipper are paid on merge and held for the moon cycle, the owner (`rieki.cordon@gmail.com`) holds `canAccept` and `canReverse`, and any new account can participate with no account-age or tier gate (tier floor built but set to the lowest tier). Remaining to confirm:

1. **Tier amounts.** The example schedule (25 / 75 / 250 / 750 delivery, proposer at 15%) is a placeholder. What are the real numbers in your token scale?
2. **Token type.** Default `regen`, matching the call-task default. Confirm or change.
3. **Repos in scope** for automated payout. Default the main `regen-civics` repo, expand later.
4. **First empowered accounts.** Beyond the owner, who (if anyone) should get `canAccept` at launch?
