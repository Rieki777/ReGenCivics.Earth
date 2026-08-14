# Prompt: Lane C, build the module library

Paste everything below the line into a fresh session.

---

You are building the **module library** in game-amora: the platform machinery that lets a module be
listed as a connector to an outside paid service. You are not integrating any vendor. A separate
session does that against what you build.

## Read first

1. `CLAUDE.md` at the repo root. The Gates section and the House traps section are both load-bearing.
2. `docs/ARCHITECTURE.md`.
3. `docs/modules/module-framework.md`. Note it quotes a stale `ModuleDef` and points at a client
   registry file that does not exist. Correcting it is one of your tasks.
4. `MODULE_LIBRARY_CONTRACT.md` and `MODULE_LIBRARY_TIERS_AND_PROCESS_2026-08-14.md` on the Desktop,
   one level above the repo. The contract is what you are making mechanically true.

## Set up

```bash
git worktree add C:/Users/taren/Desktop/Amora/wt-library -b wt/module-library origin/main
```

Do not work in `wt-integrate`: it is another lane's home, sits ahead on its own branch, and has
neither `node_modules` nor `.env`. Copy a `.env` in from `C:/Users/taren/Desktop/Amora/gov-overflow`
(it has `TEST_DATABASE_URL`), then `pnpm install --frozen-lockfile`.

Confirm the environment before writing code: `node scripts/check-voice.mjs` must exit 0 rather than
`ERR_MODULE_NOT_FOUND`, and `pnpm exec vitest run server/ledger.test.ts` must report passed tests
greater than zero rather than skipped.

## The three concepts you are implementing

**Tier.** Every listing is Included, Connected or Managed, cut by who bills and who supports. The
mechanical definition is where the credential lives: Included and Connected put it in `SECRET_KEYS`
where a village admin sees source and last4; Managed holds it in env only and never returns it to a
village, which is exactly the `PLATFORM_ASSISTANT_KEY` posture in `server/lib/assistant.ts` (read from
env at call time, deliberately kept out of `SECRET_KEYS`). Read that file before you start; you are
generalising it.

**Domain.** A vendor is never a source of truth. A domain is, the platform owns it, and vendors are
drivers behind it. You add the `provides` field as data now. You do **not** build the collision
refusal: that waits for a second vendor in one domain.

**Lapse.** A module that is off answers 404 to hide its existence. A module that is on and paid for
whose vendor is not answering must answer **503**, or a village learns its feature was deleted.

## Phase C1: the catalog. Ships alone and is worth shipping alone.

**1. Listing metadata on `ModuleDef`** (`shared/modules.ts`). Add `tier: 'included'|'connected'|'managed'`,
`vendor?: {legalName, url, supportUrl, statusUrl, termsUrl, secretKeys: string[]}`,
`dataClass: 'none'|'village-content'|'member-pii'`, `provides?: string`. All 18 existing modules become
`tier: 'included'`, `dataClass` per honest reading.

Safe to add: every reader is a named property access and nothing iterates ModuleDef keys. Keep the new
fields as **structured data, never prose**: `scripts/check-voice.mjs` scans `shared/` and reads string
literals, so text in `description` is gate-visible shipped copy while `vendor.legalName` is a value in
a field. The registry must stay import-clean for the client bundle: pure data, no `mysql2`, no `fs`, no
clock.

**2. Project it into the three hand-written payloads** that will otherwise silently omit it:
`/api/modules`, `/api/admin/modules`, and the command-centre module block in `server/index.ts`. This is
the real cost of the field, and there is precedent for getting it wrong: `served` and `config` are
already served and rendered nowhere, and `recommends` has no consumer at all.

**Deliberately do not** add tier or vendor to `/api/platform/info` or `/.well-known/village.json`. Both
are read at rank `members` or above and village.json is signed against a permanent instance id, so a
vendor name there is a permanent public disclosure of which commercial services a village buys. Record
that as a decision in the commit message so the next reader does not "fix" it.

**3. Render it.** A third pill beside the existing Core and legal-review pills on the admin module
card, and a fourth muted line beside the `requires:` line carrying who supports it. The same support
line on the command-centre health row, because that is the screen a founder opens when something is
dark.

**4. The 503 vendor-lapse path.** A `requireVendor(id)` middleware mounted **after** `requireModule`,
answering 503 with a structured body `{error: 'vendor_unavailable', module, tier, responsibleParty,
supportAt, stillWorks}`. Around six client pages already render `d.error` from a body verbatim, so a
server-authored sentence reaches a human today. Write the three tier-specific sentences from the
contract: Connected names the vendor and their support link, Managed says "this is on us" and never
names the vendor, Included says whatever that module's own honest refusal already says.

**5. Dynamic secret slots.** `SECRET_KEYS` is a frozen literal union with a hardcoded `ENV_FALLBACK`
map, so adding a vendor credential today means editing platform code and shipping a release to every
fork. Derive it: base keys union the registry's `vendor.secretKeys`, keeping write-only, masked-read
and admin-beats-env intact. Two notes. The store can **already** hold a server-readable inbound signing
secret, because `secretValue` returns the value to server callers and only the browser gets a masked
status, so amend the module header from "write-only" to "write-only to the browser, read by the server"
or the next reader will build a second mechanism. And a **Managed** credential must never be added
here: env only.

**6. Integrations cards from the registry. This also fixes a live bug.** The CARDS array in
`client/src/pages/Admin.tsx` is a hardcoded four-entry list covering 4 of 7 secrets. Three
(`riverside_webhook_secret`, `governance_hub_secret`, `basescan_api_key`) are settable over the API and
appear in the status payload with no field in the UI, to the point that shipped copy elsewhere in that
same file tells an admin to set the Riverside secret under Integrations, where no such card exists.
Drive CARDS from the registry's `vendor` record, add fields for manual vendor-side setup steps, and the
bug and the future are fixed in one change.

**7. Tier is stamped at enable time.** The registry tier is the **offer**. The tier a village is **on**
is written into `module_settings.config` when it is enabled, together with the contract version, plus a
`module_events` row. This is the version-stamped acknowledgement pattern the exchange module already
uses for its legal card: read that first and copy its shape. A later tier change then becomes a
re-acceptance an admin must read, rather than a silent rewrite of their support contract.

**8. Launch requirements per vendor module.** Reuse the existing machinery rather than inventing a
vendor registry. It already carries `{why, severity, fixAt, fixLabel, appliesWhenModule, runbookAnchor}`,
already gates on `effectiveLifecycle` so a demoted module withdraws its own requirements, already
renders in three consumers, and already fails visibly when a check is unwired. Copy the shape of
`assistant-own-key` verbatim for Managed listings: its existing sentence about running on a lent key
that can be rotated at any time is exactly the Managed risk disclosure, already in house voice.

**9. Docs.** Land `docs/MODULE_LIBRARY_CONTRACT.md` from the Desktop file. Update
`docs/ARCHITECTURE.md`'s add-a-module checklist, which mentions neither docs nor tier nor vendor.
Correct `docs/modules/module-framework.md`. Add a `FORK_RUNBOOK.md` line for anything you add that a
fork must configure, in the same session. Note `MODULE_DOCS` in `server/lib/knowledge.ts` is a
deliberate allowlist and not a glob, so a vendor-authored contract needs a provenance marker before it
could ever join Maia's shelf: add the marker mechanism, not any vendor's document.

**10. `scripts/enable-all-modules.mjs`.** Its hand-written TARGETS list hard-exits 3 on any non-core
module it does not know, and it is already stale for `messaging` and `events`. Add an explicit
exclusion for vendor-tier modules with the reason in a comment (enabling one without its credential
probes a surface that cannot answer), and fix the two stale entries while you are there.

## Phase C2: the deletion and export bridge. This gates the first paid listing.

`anonymizeMember` is an exhaustive **local** sweep across roughly thirty tables and it signals nothing
outward. `GET /api/profile/export` carries a comment saying that "everything the village holds about
me" has to mean everything, written after it was caught answering with eleven of nineteen domains. And
`shared/constitution.ts` publishes "Leaving well is guaranteed" on the public Game Mechanics page.

The day a vendor holds a copy of member data, all three become false and **nothing goes red**.

Build a driver registry with `forgetMember(userId)` and `exportMember(userId)`, called from both
places, with a **visible** failure when a driver cannot confirm. This is large because the failure mode
is the design: a member must never be told "deleted" when a vendor did not answer. Decide and document
what the member sees, what the admin sees, and what is recorded when confirmation does not arrive.

Do not treat this as future-proofing. The first listing is already a live external tenant holding
member-linked content, so this is remediation of an exposure that exists today.

## Do not build these. They are named so you do not drift into them.

- The `provides` collision refusal (409 on enable). Waits for a second vendor in one domain.
- A generic inbound webhook receiver. Waits for a webhook-driven vendor. When it comes, it generalises
  `server/lib/payments.ts`, which already does raw-body HMAC with event-level dedupe for Stripe.
- An `integration_calls` incident log, vendor health probes, `lastSuccessAt`, and an outage
  notification. All are "by the second listing".
- A schema-driven config editor, a member-facing structured error component, per-module support intake,
  a vendor-name gate. All are "by vendor three".
- Any vendor's driver, credential, or registry entry.

## Gates, in CI order, cold

```
pnpm check
rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit
node scripts/check-brand-refs.mjs
node scripts/check-voice.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-artifact-budget.mjs
pnpm build
pnpm test
pnpm audit --prod --audit-level high
```

Plus the bundle-budget block in `.github/workflows/ci.yml` (MAX_MAIN_JS_KB=700, MAX_TOTAL_DIST_KB=6000).

- `pnpm check` excludes `**/*.test.ts`, so **`tsconfig.tests.json` is the only gate that catches a
  widened type breaking a test harness**, and it must run cold because the incremental cache does not
  re-check files whose dependencies did not change. It is a blocking CI gate that CLAUDE.md does not
  list.
- The brand ratchet has **zero headroom**: 63 references against a baseline of 63. Read `$?`, never the
  last line, because a failing run prints a blank final line. Never use `--update-baseline`.
- `check-voice.mjs` scans `shared/`, so any new `description` text is shipped copy: no dashes, no
  "not X but Y" framing, no filler.
- Add no dependency. CI runs Node 22 and this machine does not.

## Acceptance

1. A throwaway `connected`-tier module with a `vendor` record renders its pill, its support line and
   its Integrations card in a fresh fork, with no code outside the registry entry.
2. Hitting its route with no credential returns **503** with the vendor's name and support link in the
   body, and the client renders that sentence. Hitting an `off` module still returns 404.
3. The same module set to `managed` renders a card with **no credential field** and a failure message
   that does not name the vendor.
4. Enabling it writes tier and contract version into `module_settings.config` and appends a
   `module_events` row.
5. `/api/platform/info` and `/.well-known/village.json` are byte-identical to before your change for a
   village running that module. Prove it, do not assert it.
6. Deleting a member with a driver registered calls `forgetMember`, and a driver that refuses produces
   a visible failure rather than a silent success.
7. Then delete the throwaway module. It was a fixture.

Prove the green is not hollow: `.env` present with `TEST_DATABASE_URL`, the vitest Duration in minutes
rather than seconds, and the skipped count equal to a baseline you captured **before** editing.
Without the env var, 19 of 60 test files skip while the summary still says passed.

## Lane protocol

Three lanes run concurrently. Lane A owns `server/lib/assistant.ts`, `villageReaders.ts`,
`villageBrain.ts`, `knowledge.ts` and migration 0078. Lane S adds the first vendor listing on top of
your work. You own `shared/modules.ts`, `server/lib/modules.ts`, `server/lib/secrets.ts`, the catalog
and Integrations UI, and migration **0079** if you need one.

- Migration numbers are claimed across worktrees and branches, and `ls drizzle/` is two behind reality.
  Before taking 0079, run all three scans: `git log --all --diff-filter=A --name-only --pretty=format: -- 'drizzle/*.sql'`,
  `ls drizzle/*.sql`, and `ls <path>/drizzle/*.sql` for every path in `git worktree list`. Never
  renumber a file afterwards: the ledger keys on filename, so a rename replays it.
- In `server/index.ts` you own the secrets boot block **narrowed to the ranges outside 1047-1062**
  (Lane A owns the wiring calls in there), and the admin integrations routes. Append new routes after
  the admin integrations block, not at whatever end-of-file region feels natural.
- Never put `village_brief`, `village_record`, `village_brief_revisions`, `briefAll` or
  `recordSummaries` into `server/lib/feedback.ts`, `network.ts` or `villageExport.ts`. A test scans
  those three files as raw source text, so even a comment fails the suite.
- Stage with `git add -p`, never `git add .`. Several worktrees hold uncommitted work in
  `server/index.ts` right now.
- Announce before any full `pnpm test`: every `.env` points at the same MySQL host and the harness
  provisions a scratch schema per suite. Treat a first "Hook timed out" as load, re-run that file
  alone once, then debug it as code.
- A push is not a green. `gh` is installed; read the run afterwards.

## Report back

What shipped, what you deliberately did not build, the acceptance evidence for all seven items, and any
place where the contract in `MODULE_LIBRARY_CONTRACT.md` promises something the platform cannot yet
mechanically enforce. That last list is the most valuable thing you produce, because it is what the
next vendor conversation has to be honest about.
