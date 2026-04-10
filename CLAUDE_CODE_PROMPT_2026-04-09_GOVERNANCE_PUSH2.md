# Governance Pipeline: Push 2
**Date:** 2026-04-09
**Context doc:** `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`
**Pick up from:** Push 1 shipped Hypha Bridge, OIDC, governance tRPC router, Loomio webhook receiver, governance scheduled jobs, all DB migrations 0108-0111, and the BridgeHypha/Governance/GovTenant/GovCreate/GovBackField pages.

Read `CLAUDE.md`, `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`, and `REMAINING_WORK_2026-04-08.md` before writing any code.

---

## Step 0 — Run pending migrations

These four migrations were written in Push 1 but may not have been applied yet to Railway. Run them in order and confirm each succeeds:

```bash
npx tsx scripts/run-migration.ts drizzle/0108_governance_mechanics_variables.sql
npx tsx scripts/run-migration.ts drizzle/0109_governance_pipeline.sql
npx tsx scripts/run-migration.ts drizzle/0110_governance_phase2.sql
npx tsx scripts/run-migration.ts drizzle/0111_regen_guide_user.sql
```

If any are already applied the runner will skip them safely. Check `--status` first if uncertain:
```bash
npx tsx scripts/run-migration.ts --status
```

---

## Track A — Loomio new_comment mirror (1 file)

**File:** `server/webhooks/loomio.ts` — the `new_comment` case (around line 228) is a stub that logs and returns ok.

Wire it:
1. Find the `forumPostDecisions` row via `event.discussionKey` (join through `loomioDiscussionId`).
2. If found, get the associated `forumPostId`.
3. Insert a `forumReplies` row with:
   - `postId` = the forum post id
   - `authorId` = the ReGen Guide user id (look up by `openId = 'regen-guide-system'` from the `users` table)
   - `content` = `[Governance] ${event.commentAuthorName ?? 'Someone'} on the decision: ${event.commentBody}`
   - `createdAt` = now
4. If no matching decision is found, log and return `{ ok: true, note: 'no matching thread' }`.

---

## Track B — reconcileHyphaBridges: real Base RPC check (1 file)

**File:** `server/jobs/governanceJobs.ts` — `reconcileHyphaBridges` currently just logs stuck bridges and returns. Wire a real check:

1. Install `viem` if not already present: `pnpm add viem`.
2. For each stuck bridge (status `handoff_sent`, updated > 1 hour ago), use `publicClient.getLogs` with the contract address from `REGEN_TOKEN_ADDRESS_BASE` or `RCIVICS_TOKEN_ADDRESS_BASE` to look for a `ProposalCreated` event within the last 2 hours that contains the bridge key marker in its title field (emitted as the first indexed topic or as calldata — check what Hypha emits).
3. If a match is found, call `handleHyphaEvent` with the reconstructed event to flip the bridge to `on_chain_detected`.
4. If Base RPC is unavailable (env var missing), fall back to the existing log-and-return behavior.

Base RPC URL is in `BASE_RPC_URL` env var. Use `createPublicClient` from viem with `http(process.env.BASE_RPC_URL)` and `chain: base` from `viem/chains`.

---

## Track C — Storyteller opt-in toggle on PlayerProfile (careful, 3159-line file)

**File:** `client/src/pages/PlayerProfile.tsx`

This file is large. Do a surgical edit only:

1. Find the section where notification preferences are rendered (search for `notifyRecordings` or the notifications settings section).
2. Add a new toggle row in the same style as existing preference toggles:
   - Label: "Available as storyteller"
   - Description: "When a governance decision is ratified with high stakes, you may be picked to write the narrative that goes into the weekly roundup."
   - Bound to `user.availableAsStoryteller` (tinyint 0/1 in the users table)
3. Wire it to a new tRPC mutation `players.setStoryteller` that does:
   ```typescript
   setStoryteller: protectedProcedure
     .input(z.object({ available: z.boolean() }))
     .mutation(async ({ ctx, input }) => {
       await db.update(users).set({ availableAsStoryteller: input.available ? 1 : 0 })
         .where(eq(users.id, ctx.user.id));
       return { ok: true };
     }),
   ```
   Add this to `server/routes/players.ts`.

---

## Track D — Token ledger entries on quest completion

**Context:** `governanceTokenLedger` tracks internal tokens that accumulate until a player claims to Hypha at the `governance.claim_threshold_tokens` threshold (1000 by default). These are distinct from $ReGen scoring tokens.

Wire entries in two places:

### D1 — Quest completion
**File:** wherever `quest.complete` or `questCompletions.create` mutation lives (search `server/routes/` for `completeQuest` or `questCompletions`).

After a successful quest completion, insert a `governanceTokenLedger` row:
```typescript
await db.insert(governanceTokenLedger).values({
  userId: ctx.user.id,
  tenantId: 1, // platform-level default tenant id
  amount: questTokenValue, // read from the quest row or default to 10
  type: 'quest_completion',
  sourceRef: `quest:${questId}`,
});
```

The `tenantId: 1` is the platform-level governance tenant. Read the tenant id by querying `governanceTenants` where `slug = 'platform'` and cache it. If the platform tenant doesn't exist yet, create it first (slug='platform', tenantType='platform', displayName='ReGen Civics').

### D2 — Gratitude endorsements
**File:** wherever `game.sendGratitude` or `contributions.endorse` mutation lives.

After a successful gratitude send, insert a `governanceTokenLedger` row:
```typescript
await db.insert(governanceTokenLedger).values({
  userId: recipientUserId,
  tenantId: 1,
  amount: gratitudeTokenValue, // default 5
  type: 'gratitude_received',
  sourceRef: `gratitude:${gratitudeId}`,
});
```

---

## Track E — Claim threshold check

When a player's unclaimed `governanceTokenLedger` balance crosses `governance.claim_threshold_tokens` (1000 by default), show a banner on their profile and on the bridge page.

### E1 — New tRPC query
Add to `server/routes/governance.ts`:
```typescript
getClaimEligibility: protectedProcedure
  .query(async ({ ctx }) => {
    const threshold = await readGovernanceVariable('governance.claim_threshold_tokens', 1000);
    // Sum unclaimed balance (claimedAt IS NULL)
    const rows = await db.select({ total: sum(governanceTokenLedger.amount) })
      .from(governanceTokenLedger)
      .where(and(eq(governanceTokenLedger.userId, ctx.user.id), isNull(governanceTokenLedger.claimedAt)));
    const balance = Number(rows[0]?.total ?? 0);
    return { balance, threshold, eligible: balance >= threshold };
  }),
```

### E2 — Claim button
In `client/src/pages/BridgeHypha.tsx`, near the bottom of the page if `intent === 'redeem-internal-tokens'`, show the balance clearly. For all other pages where governance is surfaced, add a small indicator.

---

## Track F — Sync bioregion subgroup removal in Loomio

**File:** `server/webhooks/loomio.ts` — `syncLoomioSubgroups` always returns `removed: 0` because it only adds memberships.

Wire removal:
1. Fetch the user's current Loomio group memberships via `GET /api/v1/memberships?user_email=...`.
2. Compare against the user's current `bioregions` array.
3. For any group_key in Loomio that is NOT in the current bioregions list, call `DELETE /api/v1/memberships/:id`.
4. Update the return value with the actual `removed` count.

---

## Track G — Rate limits for new governance endpoints

**File:** `server/_core/index.ts`

Add rate limits for the new tRPC procedures (same pattern as the existing ones around line 144-172):

```typescript
app.use('/api/trpc/governance.initPromotion', rateLimitMiddleware(60 * 60 * 1000, 3));
app.use('/api/trpc/governance.cosignPromotion', rateLimitMiddleware(60 * 60 * 1000, 10));
app.use('/api/trpc/governance.watchThread', rateLimitMiddleware(60 * 1000, 20));
app.use('/api/trpc/governance.addToBackField', rateLimitMiddleware(60 * 1000, 10));
app.use('/api/trpc/governance.submitStrawPoll', rateLimitMiddleware(60 * 1000, 20));
app.use('/api/trpc/governance.voteStrawPoll', rateLimitMiddleware(60 * 1000, 30));
app.use('/api/trpc/hyphaBridge.create', rateLimitMiddleware(60 * 60 * 1000, 5));
```

---

## Track H — Nav link to Governance

**File:** `client/src/components/Navigation.tsx` (or wherever the main nav lives — search for the existing "Forum" or "Community" nav items).

Add a "Governance" link pointing to `/governance` in the same style. It should only appear for logged-in users (same guard as other authenticated nav items). If governance nav items are in the mobile bottom nav too, add it there with a `Scale` or `Vote` icon from lucide-react.

---

## Track I — COMMUNITY_AGREEMENTS_PLAN Parts 1-7

The community agreements feature is the next active sprint. Read `COMMUNITY_AGREEMENTS_PLAN.md` in full, then `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md` to see what has already been done (if anything). Build any remaining parts in order, 1 through 7.

This is HIGH priority as a launch blocker.

---

## Track J — Launch blockers from REMAINING_WORK_2026-04-08.md

After Tracks A-I, pick up the remaining HIGH-priority code items from `REMAINING_WORK_2026-04-08.md`:

1. **C1 CSP nonce migration** — read `CLAUDE_CODE_PROMPT_2026-04-07_POST_AUDIT_CLEANUP.md` and `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md`. Risky but HIGH. Do this last after everything else is stable.
2. **H3 `.ink-reveal` / `.blur-up` wiring** — read `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md`.
3. **Track 7 OG images** — read `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md`.
4. **Citizenship batch verification** — read `CLAUDE_CODE_PROMPT_2026-04-07_CITIZENSHIP_BATCH.md`.

---

## What Rye still needs to do manually (do not block on these)

| Task | Why it needs a human |
|---|---|
| Set `LOOMIO_API_KEY` in Railway once Loomio is provisioned | Requires Loomio admin dashboard access |
| Set `ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY` in Railway | Requires Alchemy dashboard — create a custom webhook on Base watching the $REGEN and $RCivics contract addresses, copy the signing key |
| Provision Loomio at `gov.regencivics.earth` | Railway deploy + DNS. See FORUM_LOOMIO_HYPHA_FLOW_SPEC section "Loomio provisioning". Set `OIDC_LOOMIO_CLIENT_ID=loomio-gov` and `OIDC_LOOMIO_CLIENT_SECRET` (already in Railway) on the Loomio side. |
| File Hypha PR for searchParams support | Open a PR against `hypha-dao/hypha-web` adding searchParams reading to the create-proposal pages. Spec is in FORUM_LOOMIO_HYPHA_FLOW_SPEC section "Stage 3 pre-fill strategies, Path A". |
| Restrict GCP Maps API key to regencivics.earth | Google Cloud Console, ~5 min (C2 from REMAINING_WORK) |
| Verify Sentry source maps | Sentry dashboard (H8 from REMAINING_WORK) |
| Run R2-21 heal-the-land seeds locally | Script exists at scripts/seed-heal-the-land.ts, needs your user ID |

---

## Writing rules (enforced on all output)

Hard rules, not guidelines. Every file touched must pass all of them:
- No em-dashes anywhere (not in code comments, not in strings, not in UI copy)
- No contrast framing ("not just X", "this is not X", "less X more Y")
- No banned AI words: delve, seamless, leverage, foster, robust, utilize, empower, transformative, vibrant, crucial, groundbreaking, tapestry, nurture, embark, navigate (as metaphor), unlock, unleash, beacon, testament

## Verification before completion

Before marking any track done, run:
```bash
pnpm run check        # TypeScript — must be zero errors
pnpm run test         # unit tests — must all pass
```

If the build is failing when you start, fix it first before adding anything new.
