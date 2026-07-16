# Rye tasks: activating the Evolution Engine

Written 2026-07-14. Everything in the code is built, tested, and deployed. What remains is
credentials, one dashboard subscription, one rehearsal, and one community vote. In order.

Read `docs/EVOLUTION-ENGINE.md` for the as-built map. This file is the click-by-click.

---

## Step 1 — Alchemy webhook subscription (DONE, one Railway paste left)

Until this is fully wired, ratifications work but a human relays the Hypha outcome
(`assembly.confirmRatification`). After it, a passed vote on Hypha applies itself.

### What Claude did on 2026-07-14

1. **Created the webhook** in your Alchemy dashboard (Rieki's Team). It is active:
   - Name: **ReGen Civics Governance Ratification (DAOProposals)**
   - ID: `wh_q697hih2m6ljvvl2`
   - Type: Custom (GraphQL), Base Mainnet
   - URL: `https://regencivics.earth/api/webhooks/hypha-alchemy`
   - Query filters logs from the DAOProposals contract
     `0x001bA7a00a259Fb12d7936455e292a60FC2bef14` (the address the server decodes; hardcoded as the
     fallback, so no new contract env var is needed).

2. **Found the signing-key catch and fixed it in code.** Your Alchemy account issues a distinct
   signing key per webhook, and three webhooks now POST to the same `/api/webhooks/hypha-alchemy`
   endpoint (the active token Address-Activity feed, the old paused token Custom feed, and this new
   governance feed). The server verified against a single key, so the new webhook's deliveries
   would have been rejected with a 401. Claude shipped `verifyAlchemySignature` to accept a
   comma-separated list of keys (commit `f934020`, deploy SUCCESS). The active token webhook keeps
   working; the governance one works once its key is added.

### The one step left for you: add the governance webhook's key to Railway

The Railway var `ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY` currently holds the active token webhook's key
(ends `...soyl`). Append the new governance webhook's key (ends `...DMxs`) so it holds both.

1. Open the new webhook:
   `https://dashboard.alchemy.com/webhooks/wh_q697hih2m6ljvvl2` → click **Signing Key** → copy it.
2. Railway → project **ReGen Civics** → environment **production** → service **ReGenCivics.Earth**
   → **Variables** → edit `ALCHEMY_HYPHA_WEBHOOK_SIGNING_KEY`.
3. Put the cursor at the end of the existing value, type a comma (no space), paste the copied key.
   The result is `whsec_<existing ...soyl>,whsec_<new ...DMxs>`.
4. Save and let it redeploy.

Claude did not paste the key itself because entering secret keys into fields is a line it does not
cross. Once you have saved it, tell Claude and it will fire an Alchemy test delivery and confirm in
`pnpm railway:logs -s "ReGenCivics.Earth"` that the `[hypha-alchemy]` receiver accepts the signature
(no `signature verification failed`, no 401).

### Where the receiving code lives, for reference

- Route: `POST /api/webhooks/hypha-alchemy`
- Handler: `server/lib/hypha-bridge/webhook-receiver.ts` → `registerHyphaWebhookRoutes`
- Mounted: `server/_core/index.ts` (raw body captured by the `express.json` verify hook, which is
  what the HMAC is computed over)
- Decoder: `decodeHyphaProposalLog` reads `event.data.block.logs[]`, matches the contract address,
  decodes `ProposalExecuted(proposalId, passed, yes, no)`, ignores everything else without throwing
- Ratification: `cascadeAssemblyRatified` → `server/lib/ratification.ts` → `dispatchExecution`
- Real proof arrives with the first live vote: the log line reads
  `assembly proposal N ratified via webhook: execution ...`.

---

## Step 2 — Rung 3 activation

Do these in order. Do not skip the rehearsal.

### 2a. GITHUB_GOVERNANCE_TOKEN (Railway)

Create the PAT on the **Rieki777** account.

1. github.com → your avatar → **Settings** → **Developer settings** (bottom of the left rail)
2. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
3. Fill in:
   - Token name: `regen-civics-governance`
   - Resource owner: **Rieki777**
   - Expiration: 90 days (calendar it; the engine goes quiet when it lapses)
   - Repository access: **Only select repositories** → `Rieki777/ReGenCivics.Earth`
4. Repository permissions, set exactly these three, everything else stays **No access**:
   - **Contents**: Read and write
   - **Issues**: Read and write
   - **Pull requests**: Read and write
5. Generate, copy the token.
6. Railway → project **ReGen Civics** → environment **production** → service **ReGenCivics.Earth**
   → **Variables** → New Variable → name `GITHUB_GOVERNANCE_TOKEN`, paste the value → deploy.

Never paste the token into a file, a commit, or this chat.

### 2b. GitHub repo secret + variable

For `.github/workflows/assembly-builder.yml`.

Via the UI: repo → **Settings** → **Secrets and variables** → **Actions**.
- **Secrets** tab → New repository secret → `ANTHROPIC_API_KEY` → your Anthropic key.
- **Variables** tab → New repository variable → `ASSEMBLY_BUILDER_ENABLED` → `true`.

Or via `gh` (run these yourself, they read the values from your shell):

```bash
gh secret set ANTHROPIC_API_KEY --repo Rieki777/ReGenCivics.Earth
gh variable set ASSEMBLY_BUILDER_ENABLED --body true --repo Rieki777/ReGenCivics.Earth
```

Note the ordering: setting `ASSEMBLY_BUILDER_ENABLED=true` on the production repo only unlocks the
Actions-side lock. The tier is still 1 and the PAT gate still applies, so nothing can fire. The
rehearsal below happens in a fork so a mistake cannot reach production anyway.

### 2c. The tier-3 rehearsal (in a fork, never in the production repo)

Acceptance is `ASSEMBLY_PAGE_SPEC.md` Phase 7. Three things must be proven:

**A. The happy path.** In a fork of the repo with `ASSEMBLY_BUILDER_ENABLED=true`, `ANTHROPIC_API_KEY`
set, and a test server whose `evolution.max_autonomy_tier` is forced to 3:
a toy ratified feature opens a `governance-approved` issue → the builder workflow opens a PR on
`assembly/<proposalId>` → `assembly-gates` in CI fetches the ratified scope from the server and
passes → the launch window starts its countdown → a human applies `approved-for-launch` →
squash-merge → deploy SUCCESS → the `governance_executions` row reads `shipped` with the merge SHA
→ the forum announcement posts.

**B. The guard holds.** Push a commit on an `assembly/*` branch that touches a path in
`.github/assembly-protected-paths.json` (auth, tokens, webhooks, the engine, CI). CI must fail,
fail closed, with `scripts/check-protected-paths.mjs` naming the path.

**C. The breaker trips.** Two consecutive failed or rolled-back ships must drop
`evolution.max_autonomy_tier` back to 1 automatically, logged.

I can drive this whole rehearsal once the fork exists and the secrets are on it. Say the word and
I will set it up and run it end to end, then report what each of A, B, C actually did.

### 2d. The community vote

Only after 1, 2a, 2b, 2c. The proposal text is below, ready to paste into the Assembly. This is a
governance act, so you raise it. I will not submit it.

---

## The proposal text (for the Assembly, then Hypha)

**Title:** Raise the Evolution Engine to tier 3

**Aim line:** Let ratified features build and ship themselves, with a human still approving the
merge.

**Body:**

Today the Assembly already changes the game without me. When you ratify a variable change or a
bounds change, it applies itself the moment the vote closes. That is tier 1, and it has been live
since July.

Tier 3 extends the same idea to features. A ratified feature proposal opens a GitHub issue carrying
its spec and its scope, an AI builder writes the code inside that scope and only that scope, the
machine gates check the work against the scope the community actually ratified (fetched from the
server, so the machine cannot write its own permission slip), the change sits in a visible launch
window that any Steward can pause, and then a human approves the merge and it ships.

The guardrails do not move when the tier does:

- Protected paths stay protected. Auth, tokens, webhooks, the engine itself, and CI are off limits
  to the machine, enforced in code, not by vote.
- Any Steward can pause a ship during the launch window, and a pause survives the window.
- Two failed ships in a row drop the tier back to 1 on their own.
- A human still has to approve the merge. That requirement is its own variable
  (`evolution.launch_require_approval`), and it stays at 1 until the community decides otherwise in
  a separate vote.

What this changes: the maintainer stops being the bottleneck between what the community decides and
what the game actually does.

**Execution payload:** variable change, `evolution.max_autonomy_tier`, from `1` to `3`.

**What passing this does immediately:** nothing visible. The next ratified feature proposal is the
first one that flows through the pipeline.

---

## Step 3 — the copy about linking the Hypha proposal (DONE, shipped 2026-07-14)

Machine ratification only arms for a proposal once the proposer pastes their Hypha proposal link
back into the Assembly (`assembly.recordHyphaProposal`). It is built, it has a UI row, and it
depends on people remembering. So it now says so in two places:

- The ready-to-launch governance email (`server/jobs/assemblyNotify.ts`)
- The Assembly Steward's deliverables (`seasons/season-1-the-first-build.md`, role 14)

Commit `9133ffe`, deploy SUCCESS on Railway.
