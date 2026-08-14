# Prompt: Lane S, add Saberra as the first library listing

Paste everything below the line into a fresh session.

---

You are adding **Saberra** as the first vendor listing in the game-amora module library. Saberra is an
institutional-memory product: it captures meetings and email, extracts structured records with Claude
into a 26-database Notion workspace the client owns, and exposes an assistant called Sera over an HTTP
API and an MCP server.

**Amora is already a live Saberra tenant.** Capture has been running from `roots@amora.cr` for months.
That fact shapes this whole lane: you are not opening a new data flow, you are putting an existing one
under a contract and making it visible.

## Read first, in this order

1. The Saberra integration package (8 markdown files, `amora-game-integration.zip`, extracted). Doc 04
   is their proposed source-of-truth matrix.
2. `SABERRA_INTEGRATION_REVIEW_2026-08-14.md` on the Desktop. This is the response to that package and
   it disagrees with the matrix in specific places.
3. `MODULE_LIBRARY_TIERS_AND_PROCESS_2026-08-14.md` and `MODULE_LIBRARY_CONTRACT.md`.
4. `CLAUDE.md` at the repo root.

## The scope, which is much narrower than what Saberra proposed

**List one domain: `signals`.** Risks, tensions, commitments. **Not retrospectives.**

Saberra's matrix claims retrospectives as "no counterpart on your side; pure gain". That is wrong, and
the collision is philosophical rather than structural. `server/lib/seasonRetrospective.ts` already
exists and its header states the rule: "No composite score. Villages optimise whatever number is
displayed, and a single 'season health' figure would go green while the founder held everything. Each
read stands on its own with its own honest null." It emits typed actions with evidence numbers instead.
Saberra ships `GET /health-score` returning a 0-100 grade, and `docs/COORDINATION_SUBSTRATE.md`
never-builds exactly that. **Do not surface their health score in-game, and do not list retrospectives.**
Say why to Saberra rather than letting it arrive by default; the platform's artifact is the stronger one
here.

Risks, tensions and commitments are the exclusive claims in Saberra's matrix with genuinely no
counterpart table anywhere in `drizzle/`. Everything else they proposed collides with something the
platform already ships in DDL:
meetings collide with the recordings/transcripts/call_syntheses pipeline, tasks collide with
`call_tasks` and its schema-level evidence rule, decisions collide with `forum_threads.kind='decision'`
and `village_record`, canon collides with `village_brief`, and people collide with the deletion promise.

`signals` needs no spine migration, no source-of-truth renegotiation, no identity join-key policy, and
no conflict with the CRM vendor that comes later. It exercises the entire adapter path at the smallest
possible blast radius.

**Tier: Managed.** Rye bills the village, Saberra invoices Rye. The mechanical consequence is that the
Saberra credential is **platform-held and env-only, never in `SECRET_KEYS`**. The village has no
Saberra account and cannot see the key, because it is not theirs to see. Copy the
`PLATFORM_ASSISTANT_KEY` posture in `server/lib/assistant.ts` exactly.

## Stages 0 to 5 are not code, and they are not blocked on anything

Do these first. They can run while Lane C builds the library machinery.

**Stage 0, and it gates the entire lane.** Pull `GET /backup` and `GET /stats` for the Amora tenant and
answer three questions with numbers, not impressions:

- How many records exist per Notion database, per week, over the last 90 days?
- Of the Decision Candidates and Tasks, how many did any human ever move off Draft?
- Read twenty extractions against meetings Rye actually attended. Is the precision good?

If most extraction is never reviewed on their side, then pushing it into a village's review queue moves
their backlog into someone's attention, and the answer to this whole lane is no. Report the numbers
before writing code. Their own report never suggested this audit and it is free.

**Stage 1, diligence.** Rye has a partnership offer and knows the people. That is not diligence. Obtain
in writing: legal entity name, jurisdiction, a named human with an email, terms URL, status page URL,
and the published or agreed price. Also ask the two things their package left open: what does Rye pay
today for the Amora tenant, and what would he pay after this.

**Stage 2, domain assignment.** Write the one-page statement: `signals` is the domain, the platform
holds nothing in it today, Saberra is the sole driver, and here is the enumerated write surface. Then
write the refusal list explicitly: this driver never writes to a core module, never reaches the ledger,
never produces a capability answer, never flips a module lifecycle.

**Stage 3, data and legal.** `signals` is `dataClass: 'member-pii'`. Do not talk yourself out of this:
their Risks database carries a "Collapse Pattern" taxonomy with seven community-failure modes including
burnout and wrong people, attached to named individuals. Required before go-live: a signed processing
agreement naming Notion, Anthropic, AWS SES, Railway and Google as sub-processors; documented retention
per record class; a documented hard-delete endpoint; and a stated deletion turnaround. Also get a
written answer to "who can read a Risk record filed against a named member, is it included when that
person asks what you hold about them, and what is your procedure for that conversation."

**Stage 4, technical proving.** This is cheap here because Saberra ships an MCP server, so the driver is
a tool the local assistant calls rather than a REST sync. Capture **one real payload per operation** as
a fixture. Documentation is not evidence. Demonstrate all five driver methods against a sandbox tenant,
including `forgetMember` verified by reading back and getting nothing. Ask for a **read-only,
role-scoped credential**: Sera's own loop can create, update, archive, merge records and send email,
with writes "consent-gated in conversation", and when a server proxies a question there is no human in
that conversation.

**Stage 5, commercials.** Managed requires, per the contract: a flat wholesale rate per village per
month with a stated included volume, a hard cap that actually stops requests, and per-source cost
attribution readable over their API. Their current control is a monthly budget that by their own
documentation "never blocks". That is a term to fix, not accept.

## Then build

Only after Lane C has landed its Phase C1 (tier metadata, the 503 vendor-lapse path, dynamic secret
slots, registry-driven Integrations cards) and its Phase C2 (the `forgetMember` / `exportMember` driver
registry wired into `anonymizeMember` and the profile export).

1. **The registry entry** in `shared/modules.ts`: id `signals`, `tier: 'managed'`, `dataClass:
   'member-pii'`, `provides: 'signals'`, the `vendor` record, `requires: []`, `recommends: []`, no
   `openStateCheck` (signals is not a debt anyone is owed). Platform-language copy only: the module
   name and description describe the capability, and the vendor's name lives in the structured `vendor`
   field. Note the brand guard bans four village names and will not catch a vendor name, so this rule
   is on you to hold.
2. **The `signals.read` capability**, added in lockstep across three files: the union, the
   `ALL_CAPABILITIES` array, and `CAPABILITY_CONSEQUENCE`. Only the third is a total `Record`, so it is
   the **only compile error**; omitting it from the array compiles clean and silently makes the key
   ungrantable by badges and invisible in the admin badge editor. Leave it **out of `STAGE_UNLOCKS`**,
   following the precedent of the capabilities reached by appointment rather than by climbing, and put
   a comment saying why. Run `scripts/check-examples.mjs` afterwards: it re-parses that array **by
   regex**, so reformatting breaks a CI prover with an error about examples.
3. **The driver**, in its own file, as the only file in the repo that knows Saberra exists. All five
   methods. `read` never throws and returns `[]` when the service is unavailable.
4. **The evidence rule at the boundary.** Every record you surface carries a verbatim quote, a source
   anchor and a timestamp. Anything without one is **dropped**, not stored, and the drop is counted and
   shown to admins. This is the platform's existing bar: `call_tasks` makes quote and timestamp NOT
   NULL, commented "no quote, no timestamp, no row", and the synthesis path already drops tasks whose
   quote is not in the transcript and shows the count. Do not lower it to accept a vendor.
5. **The credential**, env-only. Add `resolveMemoryKey()` and a daily cap mirroring `resolveKey` and
   `platformDailyCap`, keeping absent (default) and explicit `0` (means zero) distinct. Not in
   `SECRET_KEYS`. Add the env var to `docs/FORK_RUNBOOK.md` in the same session.
6. **The launch requirement**, with `appliesWhenModule: ['signals']`, worded like `assistant-own-key`
   so a village is told in the product that it runs on a key the platform lends it.
7. **The 503 path**, using Lane C's `requireVendor`. Managed means the failure message does not name
   Saberra and says the equivalent of "this is on us." Never 404.
8. **`docs/modules/signals.md`** plus its `MODULE_DOCS` entry with the provenance marker, or Maia will
   report the module as having no written contract.
9. **Outbound calls** go through `guardedFetchJson`, extended by Lane C or by you to carry a bearer.
   **Do not write a second dialer**: that file forbids it by name and names the SSRF it already caused.
   If you thread the header, **strip credential-bearing headers on a cross-origin redirect**, because
   the redirect recursion passes arguments through unchanged and the per-hop private-range guard does
   not help when the attacker's host is legitimately public. Also note the timeout is socket-idle per
   hop, so five redirects is up to six times the budget.

## Do not build these

- The org-chart mirror, transcript forwarding, and the inbound webhook receiver. Those are Phase 2 of
  Saberra's own plan and they are gated on the matrix renegotiation.
- Any extension of `assistant_drafts`. Its `DRAFT_KINDS` is `role` and `circle` only, it rejects unknown
  payload keys, it has no provenance column, and both its routes hard-require a named human proposer.
  Saberra events do not belong there.
- Anything in the `people`, `decisions`, `canon`, `meetings` or `tasks` domains.
- Any auto-minting, auto-crediting, or auto-assignment. Nothing Saberra sends may move value or grant a
  stage. Note there is currently **no undo**: the reversal primitive exists in code and is called from
  no route.
- Any proposal that touches a seat holder. One accepted seat change becomes recurring automatic
  recognition within the hour via the settlement job, with no way back through the API.

## Gates

Same eleven as Lane C, in CI order, cold. Two that will bite this lane specifically:
`tsconfig.tests.json` run cold is the only gate that catches a widened signature breaking a test
harness, and `scripts/check-examples.mjs` after touching the capabilities array.

Migration number if you need one: **0080**. Run all three scans first (`git log --all --diff-filter=A`
over `drizzle/*.sql`, `ls drizzle/*.sql`, and `ls <path>/drizzle/*.sql` for every path in
`git worktree list`). `ls drizzle/` is two behind reality. Never renumber afterwards.

## Acceptance

1. The stage 0 numbers, reported before any code was written.
2. In a fresh fork with no credential, the `signals` module is off and invisible. Enabled with no
   credential, it answers **503** and the message does not name the vendor. Enabled with a credential,
   it returns real records.
3. A record arriving without a quote or a timestamp is dropped, and the drop count is visible to an
   admin.
4. Deleting a member calls `forgetMember` against the Saberra driver, and a refusal produces a visible
   failure rather than a silent success. **Run this against the real tenant once**, on a test member,
   and record the confirmation.
5. `GET /api/profile/export` returns the Saberra-held records for that member alongside the local ones.
6. `/api/platform/info` and `/.well-known/village.json` are byte-identical to before, for a village
   running this module. Prove it.
7. The pilot drill run rather than planned, in Amora itself, since Rye is the tenant.

Prove the green is not hollow: `.env` present with `TEST_DATABASE_URL`, vitest Duration in minutes, and
the skipped count matching a baseline captured before editing.

## Report back

The stage 0 numbers first, with your honest read on whether the extraction quality justifies the
listing. Then the diligence artifacts, the DPA status, what shipped, and every place where the module
library contract promises something this listing cannot yet mechanically satisfy. If the answer to
stage 0 is bad, say so plainly and stop. That is a successful outcome for this lane.
