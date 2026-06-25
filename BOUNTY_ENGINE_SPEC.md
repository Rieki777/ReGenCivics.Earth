# Bounty Engine Spec

**Status:** Draft for build. Created 2026-06-24. Revised 2026-06-24 to a unified engine.

One bounty engine that handles every kind of rewarded work in ReGen Civics. The first two kinds it serves are call tasks (already live) and code contributions (the new two-sided propose-and-ship flow). The engine is built so a third or fourth kind is a small adapter, not a new system.

This spec assumes the token model in `CLAUDE.md` (private-first ledger, `creditPrivateTokens`, one-way claim bridge to Base).

---

## 1. Why one engine

Today there is one bounty flow, in `server/routes/callTasks.ts`. The first draft of this spec was going to add a second, parallel flow for code contributions, with its own table and its own payout code. That would mean two copies of the most safety-critical logic in the system: the part that credits real tokens.

Two payout paths is two places to get idempotency right, two places a redelivered webhook or a double-click can double-pay, and two audit surfaces to reason about. One engine with a single hardened payout path is the core security argument for unifying.

The simplicity argument is the same shape. One lifecycle state machine, one approval gate, one notification pattern, one `game_variables` namespace for thresholds, one admin queue. Each new bounty kind reuses all of it.

What this is not: a single wide table with a column for every possible field and a pile of `if kind == ...` branches. That is the failure mode of naive unification. The design below keeps a small shared core and pushes everything kind-specific into typed adapters.

---

## 2. The shared idea: a bounty has payable roles

Every rewarded unit of work is a **bounty**. A bounty has one or more **payable roles**. A role is a slot a player can fill and get credited for.

- A **call task** is a bounty with one role: the doer.
- A **code contribution** is a bounty with two roles: the proposer (who suggested the fix or feature) and the shipper (who built it and got it merged).
- A future **reviewed contribution** is the same bounty with a third role: the reviewer.
- A **community-boosted** bounty is the same bounty with extra contributor roles that add to the pot.

"Two-sided" is just "two roles." The engine never knows or cares how many sides a bounty has. It pays roles. This is what lets the proposer and the shipper each earn their own reward from one piece of work, and what lets future reward shapes drop in without a schema change.

---

## 3. Data model

Three core tables, plus typed source metadata.

### `bounties` (the core)

```
bounties
  id              int PK autoincrement
  sourceType      enum [call_task, contribution]   -- the kind; extend as kinds are added
  title           varchar(255)
  body            text
  tokenType       varchar(16) default "regen"
  status          enum [proposed, accepted, open, claimed, in_progress,
                        in_review, completed, declined, expired]
  approvedBy      int nullable        -- maintainer who accepted (gate 1)
  declinedReason  text nullable
  autoPayMaxKey   varchar(64)         -- game_variables key for this kind's auto-pay ceiling
  externalRef     varchar(255) nullable  -- indexed lookup key (e.g. github PR url) for webhooks
  expiresAt       timestamp nullable
  createdAt, updatedAt timestamps

  index on (status, sourceType)
  index on externalRef
```

### `bounty_roles` (the payable slots, the generalization of two-sided)

```
bounty_roles
  id          int PK autoincrement
  bountyId    int FK -> bounties.id
  role        enum [doer, proposer, shipper, reviewer, booster]
  userId      int nullable        -- null until the slot is filled / claimed
  amount      int default 0       -- this role's reward
  status      enum [unfilled, filled, payable, paid, void]
  ledgerId    int nullable        -- FK into user_token_ledger once paid
  paidAt      timestamp nullable
  createdAt, updatedAt timestamps

  index on (bountyId)
  index on (userId, status)
```

### `bounty_source_meta` (typed adapter data, one row per bounty)

Kind-specific fields stay out of the core. Each source type validates its own shape with zod before write.

```
bounty_source_meta
  bountyId    int PK FK -> bounties.id
  meta        json
```

For `call_task`, `meta` holds the existing fields: `recordingId`, `sourceVideoId`, `roleSlug`, `evidenceQuote`, `evidenceTimestampSeconds`, `sociocraticOverview`.

For `contribution`, `meta` holds: `kind` (fix | feature), `sourceForumPostId`, `githubRepo`, `githubIssueNumber`, `githubPrNumber`, `prMergedAt`.

The few fields a webhook or board query must filter on fast (like the PR identifier) are mirrored to the indexed `bounties.externalRef` column so lookups never scan JSON.

### Profile additions on `player_profiles`

```
githubHandle    varchar(255) nullable
githubId        int nullable          -- numeric GitHub id, stable across handle renames
githubLinkedAt  timestamp nullable
```

`githubId` is the join key for automated payout. It does not change when a player renames their GitHub handle.

---

## 4. The single payout path

Every credit in the system flows through one function. This is the heart of the security case for one engine.

```
payRole(roleId):
  1. compare-and-swap bounty_roles.status: payable -> paid   (atomic; a second call no-ops)
  2. if the swap did not apply, return early (already paid; idempotent)
  3. resolve the role's userId; if unfilled, move to a pending queue, do not pay
  4. if role.amount > game_variables[bounty.autoPayMax for this kind]:
        leave status payable, flag for maintainer consent, stop
  5. ledgerId = creditPrivateTokens({
        userId, tokenType, amount: role.amount,
        source: sourceTagFor(role),    // bounty_proposal | bounty_delivery | call_task_bounty | ...
        sourceId: bounty.id,
        description: bounty.title })
  6. write ledgerId and paidAt onto the role
  7. notify the player
```

No other code path writes a bounty reward. Webhooks, manual admin consent, and auto-pay all converge here. The compare-and-swap on role status is the same guard `callTasks.ts` uses today, lifted to the shared layer so it is written and audited once.

Source tags stay per-role so the ledger keeps its current vocabulary: `call_task_bounty` for the doer role, `bounty_proposal` for the proposer role, `bounty_delivery` for the shipper role.

---

## 5. Lifecycle and completion triggers

One state machine on the core. What differs per kind is the trigger that moves a role to `payable`.

```
  proposed   -- someone suggests work (contribution) or it is seeded (call task)
     | accept (gate 1, admin)
     v
  accepted   -- proposer role becomes payable (if pay-on-accept), bounty opens
     |
     v
  open       -- claimable on the board
     | a player claims a role
     v
  claimed / in_progress
     | work submitted: artifact (call task) or PR opened (contribution)
     v
  in_review
     | completion trigger fires (see below)
     v
  completed  -- remaining payable roles run through payRole
```

Completion triggers, per source adapter:

- **call_task:** circle consent, or auto-pay when under the ceiling. Same as today.
- **contribution:** a `pull_request` merged event from GitHub, matched to the bounty. The merge into a protected branch is the proof, since it passed review and CI. Nothing pays on a self-report of "done."

Side paths shared by all kinds: `declined` (rejected with a reason) and `expired` (claimed but never completed inside the window, role goes back to `unfilled` and the bounty back to `open`). This mirrors the nightly stale-claim job already in the token system.

---

## 6. Proof of ship for contributions

The contribution adapter pays the shipper on one verifiable event: a PR merged into the repo's protected main branch.

Matching a merged PR to a bounty, checked in order:

1. A line in the PR body: `Bounty: #<bountyId>` (explicit, preferred).
2. A linked issue (`Closes #<issue>`) whose number matches the bounty's stored `githubIssueNumber`.
3. A label `bounty-<id>` on the PR.

The PR author's numeric GitHub id is matched to `player_profiles.githubId` to find the shipper role's user. If no profile matches, the merge lands in a pending queue for a maintainer to resolve. No silent drops.

---

## 7. Linking a GitHub profile

To receive a shipper reward, a player links GitHub to their profile, following the same shape as the existing `linkBaseAccount` in `server/routes/players.ts`.

**GitHub OAuth (recommended).** Add a GitHub provider alongside Google and Apple in `server/_core/oauth.ts`. The player clicks "Link GitHub," authorizes, and the callback writes `githubHandle`, `githubId`, `githubLinkedAt`. OAuth proves the player controls that account, which is what makes automated payout safe. De-duplication guard: one GitHub id maps to one profile, same as the Base-account guard.

Linking is required only for the shipper role. Proposing needs no GitHub link, since proposals live inside ReGen Civics.

---

## 8. Automation: merge to credit

```
  GitHub --(pull_request: closed, merged=true)--> webhook receiver (server/webhooks/)
                                                       |
                              verify HMAC (X-Hub-Signature-256)
                                                       |
                              match PR -> bounty (sec. 6), via externalRef / body / label
                                                       |
                              match author githubId -> profile -> shipper role
                                                       |
                              bounty.status -> completed; mark roles payable
                                                       |
                              payRole(shipper); payRole(proposer if pay-on-merge)
```

The webhook only decides which roles are payable. It then calls the shared `payRole`. It holds no payout logic of its own, so the double-pay guard and the auto-pay ceiling apply automatically.

---

## 9. tRPC surface

One router, `server/routes/bounties.ts`, registered in `server/routers.ts` as `bounties`. Kind-specific creation is a typed input, shared verbs are generic.

```
propose         protected   create a bounty (sourceType + typed meta)
listBoard       public      open + accepted bounties, filterable by sourceType
listMine        protected   roles I hold, across all kinds
claimRole       protected   fill a role on a bounty (e.g. take the shipper slot)
releaseRole     protected   give up a claimed role
linkPr          protected   attach a PR to a contribution bounty (-> in_review)

accept          admin       gate 1: accept a proposal
decline         admin       reject with reason
adminQueue      admin       proposals to review + held payouts + unmatched merges
resolvePending  admin       manually attach an unmatched merge to a role
consentAndPay   admin       release a held over-ceiling payout (calls payRole)
```

Profile procedures in `server/routes/players.ts`: `linkGithub`, `unlinkGithub`, `getMyGithub`.

The existing `callTasks` procedures keep working during migration (Phase 4); they become thin wrappers that create a `call_task` bounty with one `doer` role.

---

## 10. Profile UI and board

Profile "Contributions" tab: Link GitHub button and state, my proposals, my claimed deliveries, linked PRs and merge state, and a running total earned per role type.

Public **Bounty Board**: open and accepted bounties with title, kind, the reward on each role, and a Claim button per open role. It reads as a live contribution roadmap the community can pull from.

---

## 11. Ten ideas to improve and refine the system

The engine makes several of these cheap, since they are new roles or new triggers rather than new systems.

1. **Difficulty tiers with set payouts.** Tag a bounty `small`, `medium`, or `large` at accept time, each mapped to a fixed role amount in `game_variables`. Maintainers pick a tier, which keeps rewards consistent and removes per-bounty haggling.

2. **Review reward.** Add a `reviewer` role with a small amount, credited to whoever reviews and approves the merged PR. In the engine this is one extra role, not a feature. Code review is real work and it is where quality is held.

3. **Shipper reputation and streaks.** Track merged-contribution count and a reputation score on `player_profiles`, surfaced as a badge and fed into the citizenship tier loop, so consistent shippers climb from Explorer toward Steward through real work.

4. **Community boosting.** Let players add tokens from their own private balance to an open bounty as a `booster` role, raising its payout. Popular fixes rise on the board on their own. This is a crowdpool for code, and it shows maintainers what the community wants built. Again, just another role.

5. **Auto-draft the tracking issue.** On accept, generate a GitHub issue from the proposal body and store its number on the bounty. The shipper gets a ready issue and PR-to-bounty matching via `Closes #issue` becomes automatic.

6. **Definition of done on every bounty.** Require an acceptance checklist at accept time. It sets expectations for the claimant up front and gives reviewers an objective bar, which cuts disputes over whether work is finished.

7. **First-merge onboarding quest.** Make "ship your first merged contribution" a Welcome Aboard quest over a curated `good-first-issue` set with a guaranteed starter bounty. New technical players get a guided path from signup to a merged PR and their first tokens.

8. **Anti-gaming guards in one place.** Because payout is one function, the guards live in one place: require the PR to touch real files for auto-pay, cap how many roles one player can hold open at once, exclude self-merges on unprotected branches, and keep the append-only ledger as the audit trail. Hardening the engine hardens every kind at once.

9. **Seasonal contribution leaderboard.** Roll completed bounties into the seasons system so each season has a contributor leaderboard and a Harvest moment, tying contribution into the game's seasonal rhythm.

10. **Stale-role auto-release and nudges.** If a claimed role has no progress after N days, nudge; after the window, return the role to `unfilled` and reopen the bounty. Mirrors the nightly `cancelStaleClaimBridges` job, so good bounties never sit locked behind someone who moved on.

---

## 12. Build plan

Phased so the engine proves itself on new, low-risk work before the live call-task flow is moved onto it.

### Phase 1: The engine + contribution bounties, manual completion
- Migrations for `bounties`, `bounty_roles`, `bounty_source_meta`.
- Implement `payRole` (the single payout path) and the shared lifecycle.
- `bounties` router with `propose`, `listBoard`, `listMine`, `claimRole`, `accept`, `decline`, `consentAndPay`.
- Add `bounty_proposal` and `bounty_delivery` source tags.
- `game_variables` keys: `bounty.contribution.proposal_amount`, `bounty.contribution.delivery_amount`, `bounty.contribution.auto_pay_max`, `bounty.contribution.pay_proposal_on`.
- Profile Contributions tab and public Bounty Board.
- A maintainer marks a contribution `completed` by hand to fire payout. Fully working, human-driven on the merge step.

### Phase 2: GitHub identity
- `githubHandle`, `githubId`, `githubLinkedAt` on `player_profiles`.
- GitHub OAuth provider and `linkGithub` / `unlinkGithub` / `getMyGithub`.
- Link GitHub UI on the profile.

### Phase 3: Merge automation
- GitHub webhook receiver in `server/webhooks/` with HMAC verification.
- PR-to-bounty and author-to-profile matching; auto-credit through `payRole`.
- Pending queue and `resolvePending` for unmatched merges.

### Phase 4: Migrate call tasks onto the engine
- Write the `call_task` adapter (one `doer` role; recording/evidence fields into `bounty_source_meta`).
- Backfill existing `callTasks` rows into `bounties` + `bounty_roles`.
- Repoint the `callTasks` procedures to thin wrappers over the engine.
- Keep the old `callTasks` table read-only until the new path is verified, then deprecate. Append an ADR to `.ai/docs/DECISIONS.md` recording the unification.

### Phase 5: Refinements
- Pull in the highest-value ideas from section 11. Suggested first three: difficulty tiers (1), review reward (2), first-merge onboarding quest (7).

---

## 13. Handoff Breakdown, Who Does What

### YOU (Rye), things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Create a GitHub OAuth App | Needs your GitHub account and org access | github.com/settings/developers, callback `https://regencivics.earth/api/oauth/github/callback` |
| H2 | Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to Railway | Railway dashboard login required | Railway, ReGenCivics.Earth service, Variables |
| H3 | Create the GitHub webhook on the repo | Repo admin access required | Repo Settings, Webhooks, point at `/api/webhooks/github`, subscribe to Pull requests |
| H4 | Add `GITHUB_WEBHOOK_SECRET` to Railway | Same secret used to sign the webhook | Railway Variables, must match H3 |
| H5 | Run the engine migrations | DB only reachable from your machine | `npx tsx scripts/run-migration.ts drizzle/<NNNN>_bounty_engine.sql` |
| H6 | Run the `player_profiles` GitHub-columns migration | Same DB reachability constraint | `npx tsx scripts/run-migration.ts drizzle/<NNNN>_profile_github.sql` |
| H7 | Run the `game_variables` bounty seed | Writes to production DB | Seed script (Claude Code writes it; you run it) |
| H8 | Run the call-task backfill (Phase 4) | Writes to production DB | Backfill script (Claude Code writes it; you run it) |
| H9 | `git add -A && git commit && git push` after each phase | Deploy gate | repo root |
| H10 | Confirm Railway deploy is green before testing live | Dashboard access | Railway deploy logs |

### CLAUDE CODE, can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | Write engine migrations (`bounties`, `bounty_roles`, `bounty_source_meta`) | TODO |
| C2 | Write `player_profiles` GitHub-columns migration | TODO |
| C3 | Implement `payRole` single payout path + shared lifecycle | TODO |
| C4 | Build `server/routes/bounties.ts` and register it | TODO |
| C5 | Add `bounty_proposal` / `bounty_delivery` source tags | TODO |
| C6 | Add GitHub OAuth provider + link procedures | TODO |
| C7 | Build the GitHub webhook receiver with HMAC verify | TODO |
| C8 | PR-to-bounty + author-to-profile matching | TODO |
| C9 | Profile Contributions tab + public Bounty Board | TODO |
| C10 | Write `game_variables` seed script | TODO |
| C11 | Write the `call_task` adapter + backfill script (Phase 4) | TODO |
| C12 | Append the unification ADR to `.ai/docs/DECISIONS.md` | TODO |
| C13 | Run the ship gate (audit-truncation, className grep, typecheck) | TODO |

### WAITING ON YOU before Claude Code can proceed

- Live OAuth testing is blocked until H1, H2, H9.
- Live merge-payout testing is blocked until H3, H4, and a real test PR merge.
- Phase 4 backfill (C11) should run only after Phase 1 to 3 are verified in production.
- All of Phase 1 can be built and typecheck-verified by Claude Code; the only human steps in Phase 1 are the migration run (H5) and the deploy (H9).

---

## 14. Open questions for Rye

Defaults are chosen so Phase 1 can start. Change any in `game_variables` later.

1. Proposal vs delivery split for contributions. Default: small proposal amount, delivery several times larger.
2. `bounty.contribution.pay_proposal_on`: pay the proposer on `accept` or on `merge`. Default `accept`.
3. Token type. Default `regen`, matching the call-task default.
4. Repos in scope for automated payout. Default the main `regen-civics` repo, expand later.
5. Phase 4 appetite. Migrating call tasks onto the engine is optional. The engine works fine serving only contributions if you would rather leave the live call-task flow untouched for now.
