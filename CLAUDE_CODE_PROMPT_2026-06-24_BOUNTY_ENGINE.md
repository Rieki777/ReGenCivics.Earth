# Claude Code Prompt: Build the Bounty Engine

**Date:** 2026-06-24
**Spec (rationale + full design):** `BOUNTY_ENGINE_SPEC.md` in repo root. Read it first. This prompt is the execution order; the spec is the why.

## Objective

Build one bounty engine that pays players for rewarded work, replacing the existing call-task flow. The headline feature is a two-sided code-contribution bounty: one reward for the player who proposes a fix or feature, a separate reward for the player who ships and merges it. The engine generalizes "two-sided" to "a bounty has one or more payable roles," so call tasks (one role) and contributions (two roles) run through the same code, and future reward shapes are new roles rather than new systems.

The payment system is pre-launch with no live data, so this is a big-bang replacement. Delete the old `callTasks` table and router. Do not migrate or backfill.

## Locked decisions (do not re-litigate)

1. **Settlement hold = one moon cycle.** Both proposer and shipper are credited at merge but cannot claim to Base for 29.5 days (`bounty.settlement_hold_hours = 708`). During that window an empowered admin can reverse the payout.
2. **Proposer paid on merge.** `bounty.pay_proposal_on = merge`. Nothing is minted for ideas that never ship.
3. **Empowerment model, not account-age gates.** Any new account can propose, claim, and earn. Value is released only at two human-gated points: accepting a proposal and merging code. Both are restricted to empowered accounts.
4. **Owner seeded with full powers.** `rieki.cordon@gmail.com` gets `canAccept` and `canReverse`. An admin section lets the owner grant `canAccept` to others later.
5. **Season budget unlimited for now.** Build the cap mechanism; leave `bounty.season_budget` unset (unlimited).
6. **Citizenship tier floor built but permissive.** Build and read the tier gate; default `bounty.large_tier_min = explorer` so every account qualifies.

## Ground rules

- Follow all writing rules in `CLAUDE.md` for any user-facing copy (no em-dashes, no contrast-framing, no banned words).
- Every token credit goes through `creditPrivateTokens` and the new `payRole` wrapper. No other code path writes a bounty reward.
- Use the migration runner (`scripts/run-migration.ts`), never ad-hoc SQL scripts.
- Run the ship gate before claiming any task VERIFIED (see Verification).
- Commit per phase with a clear message; Rye pushes.

---

## Phase 1: Engine core

### 1.1 Migrations

Write one migration file `drizzle/NNNN_bounty_engine.sql` (pick the next number) creating:

- `bounties` (core; work lifecycle only). Columns per spec sec. 3: `id`, `sourceType` enum(call_task, contribution), `title`, `body`, `tokenType` default "regen", `tier` enum(trivial, small, medium, large) nullable, `workStatus` enum(proposed, accepted, open, claimed, in_review, completed, declined, expired), `approvedBy` nullable, `declinedReason` nullable, `completionChecklist` json nullable, `expiresAt` nullable; contribution fields `kind` enum(fix, feature) nullable, `sourceForumPostId` nullable, `githubRepo` nullable, `githubIssueNumber` nullable, `mergedPrNumbers` json nullable; call_task fields `recordingId` nullable, `roleSlug` nullable, `evidenceQuote` nullable, `evidenceTs` nullable; timestamps. Indexes on `(workStatus, sourceType)` and `(githubRepo, githubIssueNumber)`.
- `bounty_roles` (the only owner of payment state). Columns: `id`, `bountyId` FK, `role` enum(doer, proposer, shipper, reviewer, booster), `userId` nullable, `amount` int default 0, `payStatus` enum(unfilled, filled, payable, held, paid, reversed, void), `ledgerId` nullable, `filledByLog` json nullable, `paidAt` nullable, `claimableAt` nullable, timestamps. Indexes on `(bountyId)` and `(userId, payStatus)`.
- `bounty_events` (immutable audit log). Columns: `id`, `bountyId` FK, `roleId` nullable, `actorUserId` nullable, `event` varchar(48), `detail` json nullable, `createdAt`. Index `(bountyId, createdAt)`.
- `webhook_deliveries` (idempotency). `deliveryId` varchar(64) PK, `receivedAt` timestamp.
- `bounty_permissions`. `userId` PK FK, `canAccept` tinyint default 0, `canReverse` tinyint default 0, `grantedBy` nullable, `grantedAt` timestamp.
- `player_profiles` add `githubHandle` varchar(255) nullable, `githubId` int nullable, `githubLinkedAt` timestamp nullable.
- `user_token_ledger` add `idempotencyKey` varchar(128) nullable with a UNIQUE index. (MySQL allows multiple NULLs in a unique index, so non-bounty credits keep leaving it null.)

Mirror all of this in `drizzle/schema.ts` so Drizzle types are correct.

### 1.2 Remove the legacy flow

Delete `server/routes/callTasks.ts`, the `callTasks` table from `schema.ts`, and unregister it from `server/routers.ts`. Write a migration to drop the `callTasks` table. Grep the codebase for `callTasks` and `call_task` references and update client and server call sites to the new engine. Keep the `call_task_bounty` ledger source tag (the doer role uses it).

### 1.3 The single payout path

Add `payRole(roleId)` (put it in `server/db/tokens.ts` next to `creditPrivateTokens`, or a new `server/db/bounties.ts`, your call). Behavior, in order:

1. Load the role, its bounty, and all roles on that bounty.
2. **Separation of duties:** if the same `userId` fills more than one paid role on this bounty, set `payStatus = held`, log a `held` event, stop (needs maintainer consent).
3. **Season budget:** if `bounty.season_budget` is set and this credit would push active-season bounty issuance over it, set `payStatus = held`, log, stop. If unset, skip.
4. Compare-and-swap `payStatus`: `payable -> paid`, atomic. If the swap did not apply, return (already paid).
5. Call `creditPrivateTokens({ userId, tokenType, amount, source: sourceTagFor(role), sourceId: bountyId, idempotencyKey: ` + "`bounty:${bountyId}:${role}`" + `, description: title })`. The unique `idempotencyKey` makes a duplicate credit physically impossible at the DB.
6. Set `role.ledgerId`, `paidAt`, and `claimableAt = now + settlement_hold_hours`.
7. Write a `paid` event; notify the player.

`sourceTagFor`: doer -> `call_task_bounty`, proposer -> `bounty_proposal`, shipper -> `bounty_delivery`.

Add the reversal helper `reverseRole(roleId, reason)`: only callable by a user with `canReverse`, only while `now < claimableAt` and `payStatus = paid`. Writes a compensating negative `creditPrivateTokens` with source `bounty_reversed` and a distinct `idempotencyKey` (e.g. append `:rev`), sets `payStatus = reversed`, logs a `reversed` event, notifies the player.

### 1.4 Lifecycle + events

Implement the work-lifecycle state machine on `bounties.workStatus` per spec sec. 5. Every transition writes a `bounty_events` row. `workStatus` never encodes payment state; payment lives on the role.

### 1.5 Router

Create `server/routes/bounties.ts`, register as `bounties` in `server/routers.ts`. Procedures (spec sec. 12):

- Player: `propose`, `listBoard` (public), `listMine`, `claimRole`, `releaseRole`, `linkPr`.
- Maintainer (guard on `bounty_permissions.canAccept`): `accept` (enforce accepter != proposer), `decline`, `adminQueue`, `resolvePending`, `consentAndPay`.
- Maintainer (guard on `canReverse`): `reverse`.
- Superadmin: `grantMaintainer`, `revokeMaintainer`, `listMaintainers`.

Add a reusable `maintainerProcedure` (checks `canAccept`) and `reverserProcedure` (checks `canReverse`) following the existing `adminProcedure` pattern in `server/_core/trpc.ts`. Use `rateLimited` on `propose` and `claimRole`.

### 1.6 game_variables seed

Write a seed script under `scripts/` (Rye runs it) that sets:

```
bounty.tier.trivial.delivery = 25      # placeholder, Rye confirms
bounty.tier.small.delivery   = 75
bounty.tier.medium.delivery  = 250
bounty.tier.large.delivery   = 750
bounty.proposal_fraction     = 0.15
bounty.pay_proposal_on       = merge
bounty.settlement_hold_hours = 708     # one moon cycle, 29.5 days
bounty.season_budget         = (unset / null = unlimited)
bounty.large_tier_min        = explorer
bounty.auto_pay_max          = (carry over the existing call-task ceiling)
```

The same script seeds `bounty_permissions` for `rieki.cordon@gmail.com` with `canAccept = 1`, `canReverse = 1` (look up the user id by email).

---

## Phase 2: GitHub identity

- Add a GitHub OAuth provider in `server/_core/oauth.ts` alongside Google and Apple: `getGithubTokens(code)` (POST `https://github.com/login/oauth/access_token`) and `getGithubUserInfo(token)` (GET `https://api.github.com/user`). Register the route in `registerOAuthRoutes`, callback `/api/oauth/github/callback`.
- Add profile procedures `linkGithub`, `unlinkGithub`, `getMyGithub` in `server/routes/players.ts`, following the `linkBaseAccount` shape. Store `githubHandle`, `githubId`, `githubLinkedAt`. De-dup: one `githubId` maps to one profile.
- Reads `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` from env (Rye sets these in Railway).

---

## Phase 3: Merge automation

Add the webhook receiver in `server/webhooks/` for GitHub `pull_request` events, route `/api/webhooks/github`. Flow (spec sec. 6 and 8):

1. Verify the HMAC `X-Hub-Signature-256` against `GITHUB_WEBHOOK_SECRET`.
2. If `X-GitHub-Delivery` already in `webhook_deliveries`, drop. Else record it.
3. Only act on `action = closed` with `pull_request.merged = true` into the protected default branch.
4. Verify required CI checks passed on the merge commit (read check-suite conclusion from the payload) and that at least one approving review came from someone other than the PR author. If either fails, hold for maintainer instead of paying.
5. Match the PR to a bounty: `Bounty: #<id>` in the PR body, else `Closes #<issue>` matching `githubIssueNumber`, else label `bounty-<id>`. Unmatched -> pending queue.
6. Match `pull_request.user.id` to `player_profiles.githubId` -> shipper role. No match -> pending queue.
7. Set bounty `workStatus = completed`, mark shipper and proposer roles `payable`, call `payRole` on each.
8. Also handle revert detection on the default branch: a revert of a paid bounty's merge commit inside the hold window triggers `reverseRole` and reopens the bounty.

The webhook only decides which roles are payable, then calls `payRole`. It contains no payout logic of its own.

---

## Phase 4: UI

- **Profile Contributions tab:** Link GitHub button and state, my proposals, my claimed deliveries with linked PRs and merge state, a settlement-hold countdown on held tokens, totals earned per role type.
- **Public Bounty Board** page: open and accepted bounties with title, kind, tier, the reward per open role, a Claim button per role. Filterable by sourceType and tier.
- **Admin Bounty Maintainers section:** list users with a toggle to grant/revoke `canAccept` and `canReverse` (superadmin only), plus a held-payout review view where a `canReverse` admin can reverse a payout during the moon-cycle hold. Show each held/paid role with its `claimableAt`.

---

## Verification (run before marking anything VERIFIED)

Ship gate (from repo root):

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck   # must exit 0
```

Money-path tests (write them, they must pass):

- A redelivered webhook (same `X-GitHub-Delivery`) pays exactly once.
- Two `payRole` calls on the same role credit exactly once (idempotencyKey holds).
- A role overlap (one user, two paid roles) goes to `held`, not paid.
- With a season budget set, a payout over the cap goes to `held`.
- `reverseRole` inside the hold window writes a negative entry and sets `reversed`; outside the window it refuses.
- The claim bridge refuses bounty-sourced tokens before `claimableAt` and allows them after.
- `accept` by the proposer of the same bounty is rejected (accepter != proposer).

Append an ADR to `.ai/docs/DECISIONS.md` recording the unified engine and the big-bang replacement of `callTasks`.

---

## Handoff Breakdown, Who Does What

### YOU (Rye), things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Create a GitHub OAuth App | Your GitHub account / org | github.com/settings/developers, callback `https://regencivics.earth/api/oauth/github/callback` |
| H2 | Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` to Railway | Dashboard login | Railway, ReGenCivics.Earth, Variables |
| H3 | Create the GitHub webhook on the repo | Repo admin | Repo Settings, Webhooks, `/api/webhooks/github`, subscribe to Pull requests |
| H4 | Add `GITHUB_WEBHOOK_SECRET` to Railway | Must match H3 | Railway Variables |
| H5 | Confirm branch protection (require review + required checks) on the default branch | Repo admin; proof of ship depends on it | Repo Settings, Branches |
| H6 | Run all migrations | DB only reachable from your machine | `npx tsx scripts/run-migration.ts --all` |
| H7 | Run the game_variables + owner-permissions seed | Writes to production DB | `npx tsx scripts/seed-bounty-config.ts` (after loading .env) |
| H8 | `git add -A && git commit && git push` per phase | Deploy gate | repo root |
| H9 | Confirm Railway deploy is green before live testing | Dashboard | Railway deploy logs |

### CLAUDE CODE, can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | Write all engine migrations + ledger idempotency index | TODO |
| C2 | Delete legacy `callTasks` table + router; update call sites | TODO |
| C3 | Implement `payRole` + `reverseRole` with all gates | TODO |
| C4 | Build `server/routes/bounties.ts` + maintainer/reverser procedures; register | TODO |
| C5 | Add `bounty_proposal` / `bounty_delivery` / `bounty_reversed` source tags | TODO |
| C6 | GitHub OAuth provider + link procedures | TODO |
| C7 | Webhook receiver: HMAC, dedup, CI + non-author-approval, revert detection | TODO |
| C8 | PR-to-bounty + author-to-profile matching + pending queue | TODO |
| C9 | Profile Contributions tab + public Bounty Board | TODO |
| C10 | Admin Bounty Maintainers + held-payout reverse UI | TODO |
| C11 | game_variables + owner-permissions seed script | TODO |
| C12 | Money-path tests + ship gate | TODO |
| C13 | ADR in `.ai/docs/DECISIONS.md` | TODO |

### WAITING ON YOU before Claude Code can proceed

- Live OAuth testing: blocked until H1, H2, H8.
- Live merge-payout testing: blocked until H3, H4, H5, and a real test PR merge.
- All of Phase 1 builds and typecheck-verifies with no human step except the migration run (H6) and the deploy (H8).

### Still to confirm (does not block the build, defaults are in place)

1. Real tier amounts in your token scale (placeholders: 25 / 75 / 250 / 750, proposer 15%).
2. Token type (default `regen`).
3. Repos in scope for automated payout (default main `regen-civics` repo).
4. Any accounts beyond the owner to grant `canAccept` at launch.
