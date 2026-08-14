# Saberra x Amora-Game: assessment, and what to change before integrating

Prepared 2026-08-14. Written against the Saberra integration package (8 docs, dated 2026-08-11),
the Amora-Game codebase at `origin/main` (1428603, 2026-08-13), the ReGen Civics repo, and live
probes of both sides run today.

Every factual claim below is either a `file:line` in our own code or a live response I fetched.
Where I could not verify something, I say so.

---

## Verdict

Do it. The analysis is right about the shape: they are the memory layer, we are the action layer,
and the collision surface really is small. The trust models genuinely match, which is rare and is
the reason this is cheap.

Do not sign the plan as written. Three things need to change before a line of code:

1. **The phase order.** As scoped, Phase 1 sends them our transcripts, our org structure and our
   members' email addresses, and returns a sync job into their Notion. Nothing arrives on our side
   that a steward or a member can see. Then doc 06 gates Phase 2 on "one month of Phase 1 actually
   being used," which is measured after everything they wanted has already moved. Flip it.
2. **The commercials.** Doc 06 R10 disposes of the only money question in the package with
   "a business conversation, not an engineering one," and doc 07 Q9 asks whether you are even
   interested, as if the architecture were not already committed to it. That is the term that
   decides whether you write any code.
3. **The build split.** They assign us four of six items and themselves two. All four of ours are
   under-sized, some by a factor of ten. Their only genuinely net-new piece is deferred to Phase 2.

None of that means bad faith. It is a well-made document written by someone selling something real,
in the register of an engineering audit, and its honesty about code is what makes the framing
persuasive. Read it that way and it is still worth doing.

---

## What is genuinely strong

- The source-of-truth matrix is the right *kind* of artifact. Most of the ownership calls are
  correct, and giving us the org chart is correct for the reasons they state.
- "AI proposes, humans consent" really does line up on both sides. That is not marketing.
- The org chart argument (doc 04:40-48) is honest against their own interest. They call their model
  "a flat Circles/Roles/Assignments triple designed for extraction, not administration" and concede
  the domain.
- They read our actual code. The federation surfaces, the draft queue, the webhook conventions, the
  secrets store: all real, all cited. Very few partners do this.
- The email capture path and `POST /extract` mean Phase 1 needs no new infrastructure on their side.
- Doc 07 is written as questions, not assumptions. That is the right posture.

---

## Six things that change the deal

### 1. Phase 1 is entirely outbound, and the review gate sits after the transfer

Doc 04:74 has us forwarding transcripts, exposing the org chart, and (via doc 07 Q1) building a
route that hands over member emails. They run a pull job into their own Notion. Doc 06:62 then
gates Phase 2 on a month of usage of a phase that has no user-visible surface at all.

It cannot even be measured. There is no member-facing Maia surface in the product: `member` mode is
declared at `server/lib/assistant.ts:59` and has no route anywhere. Doc 05:16's core member promise
is doc 04:67's Phase 3 "medium, optional" item.

We have run this experiment already and lost. `assistant_drafts` shipped with a review UI and no
producer UI, so it is an empty table in every running deployment. A queue with no producer never
grows a review habit.

**Counter-proposal:** their outbound emitter plus our receiver is the first increment. Nothing
leaves Amora until proposals are flowing back and a steward has accepted some. Doc 03:79 already
calls the emitter small and says it lands at a single existing choke point in their pipeline.

### 2. The matrix functions as a mutual non-compete, and it is not neutral

They concede exactly the domains where their model is admittedly weaker, and keep meetings,
decisions, tasks, knowledge and retrospectives. Adopting it means we agree never to build the half
that compounds, and it retires code that already ships:

- `call_syntheses` and `call_tasks` with a schema-level evidence rule: quote and timestamp
  `NOT NULL`, "no quote, no timestamp, no row" (`drizzle/0028_automation_pipeline.sql:55-68`).
  That is a *stronger* bar than Draft/Candidate status.
- Member-facing decision records behind `proposal.decide`: `forum_threads.kind = 'decision'` with
  `{status, outcome, decidedBy, decidedAt}` (`drizzle/0019_forum.sql:13-16`,
  `server/index.ts:5914-5937`).
- `server/lib/seasonRetrospective.ts`, which refutes doc 04:35's "no counterpart; pure gain" on
  retrospectives outright.
- A three-table knowledge system with proposed/confirmed review status and revision history
  (`drizzle/0052_village_brain.sql`) plus a BM25 retrieval layer (`server/lib/knowledge.ts`).

Correct the matrix on one row in particular: **we own the decision record as well as the process.**
They own the evidence and the detection. Assigning decisions wholesale to Saberra would orphan
three live surfaces, one of them member-facing and capability-gated.

### 3. They have already built the governance product they offer to run as a mirror

Doc 01:77 names CCOS: Circles, Roles, Role Assignments with an Energization Level, Decision
Candidates with implementation tracking, Tensions, Canon Change Requests, a CCOS Ledger, and a
per-tenant governing purpose. A mirror is a competing product with its switch off.

And doc 02:86 lists `dashboard_users`, `dashboard_sessions`, `dashboard_invites`. Per-user logins
inside a customer we sold, delivered and support. Ask what they are agreeing not to do, and for how
long.

### 4. The risk register carries no Saberra-side risk

Ten entries. Their one admitted gap (R3, no outbound events) is scored the lowest impact in the
whole document at I2. Cost (R10) is I2 and deferred. There is no entry for extraction quality, for
Sera hallucinating inside a member-facing answer, for Saberra ceasing to operate, for Notion loss,
or for cost overrun. Every mitigation resolves to an Amora asset, an Amora queue, or an Amora
decision.

Also, R2's "residual risk: very low" is wrong in a way they could not have known. The automated
money path is not gratitude, it is **org seats**: `runSettlement` mints role-cycle recognition to
every live seat holder on the hourly moon-settlement job (`server/lib/economy.ts:861-917`,
`server/index.ts:3641-3655`). And there is no undo anywhere: `reverse()` and `isReversed()`
(`economy.ts:426-472`) are implemented, unit-tested, and called from no route or job. One accepted
seat proposal becomes recurring automatic recognition within the hour, and the API has no way back.

### 5. The evaluation that decides everything is free, available today, and the report never mentions it

**Amora is already one of their live tenants.** SES capture is already running from `roots@amora.cr`
(doc 01:60). Months of real extraction over our own meetings and email already exist.

Before agreeing to anything, pull `GET /backup` and `GET /stats` and answer three questions:

- How many records per database per week?
- Of the Decision Candidates and Tasks, how many did any human ever move off Draft?
- Read twenty extractions against meetings you were actually in. Is the precision good?

If most extraction is never reviewed on their side, Phase 2 is a pipe from their unreviewed backlog
into our stewards' attention, and everything else on this page is moot. Nobody should design a
boundary before reading what the pipe has already produced.

### 6. "Paid upgrade from Maia" cannot be built as named, on either side

Our side: a repo-wide grep for entitlement / subscription / tier / plan across `server/`, `shared/`
and `client/src` returns Stripe payment products, forum thread subscriptions and web-push
subscriptions. Nothing reads a plan. No purchase unlocks anything. And we cannot meter what we would
sell: `callAssistant` reads only `data.content` and discards `data.usage` entirely
(`server/lib/assistant.ts:271-277` — I read it directly), every budget counts HTTP calls rather than
tokens (`server/index.ts:3180`), and no rate-limit bucket is keyed by user.

Their side: doc 03:87's control is a monthly soft budget that "never blocks; warns admins at 80%."

So today we cannot price the free tier, cap a paying customer, prove what a village costs, or turn
memory off for a village that stops paying.

---

## The business shape I would take instead

**Do not build a paid upgrade tier. Sell memory as a line item inside `regen-full-service`, which
already exists in code and in a shipped price.**

`hostingEnum = z.enum(["self-hosted", "regen-full-service"])` is already a blueprint field
(`regen-civics-clean/shared/customGameBlueprint.ts:40`), and CUSTOM_GAMES_MASTER_PLAN.md Decisions
locked #4 already prices it: a fixed monthly price scoped at contract, "bare hosting at the low end,
up through AI credits, updates, and ongoing stewardship... one number for what you asked us to
carry, no surprises."

Saberra is the phrase "AI credits" in that sentence, made bigger. That framing needs no new pricing
concept, no entitlement system, and no billing code.

- **You sign one contract with the village.** You already own that relationship through the
  `custom_game_inquiries` / `custom_game_applications` funnel. Saberra invoices you per tenant. The
  village never sees a Saberra contract, a Saberra login, or a second bill.
- **The de facto licence is the tenant secret.** A fork without `saberra_api_key` simply has no
  memory layer. That is the whole enforcement mechanism and it costs two lines in
  `server/lib/secrets.ts`.
- **Reject the alternatives explicitly.** A village-facing upgrade needs billing infrastructure
  nobody has scoped. A direct Saberra-to-village contract gives you the support burden without
  revenue control. Equity or JV is unpriceable while neither side has a paying joint customer.

**On price: get their real numbers before naming one.** `/ask` returns `costUsd` per call (doc
03:18) and cost is metered per source per day (doc 02:84). The actual cost of a month of Amora's own
usage is one query away on their side. Do not negotiate against an estimate when the real number
exists. Ask for: their model, whether the loop uses prompt caching, measured cost per `/ask` and per
processed meeting over 30 days, and the tail rather than the median.

**Four continuity terms, signed before Phase 1.** These cost nothing to ask now and are
unobtainable once five villages depend on them:

1. **Source escrow or an automatic fallback licence**, triggered on acquisition, cessation, or 90
   days of unremediated failure. Their own doc 01:56 argues their Postgres "holds nothing a client
   would grieve losing," which is their argument for why this is cheap to grant.
2. **Twelve months' notice** on tenant-token revocation and on price changes. We sell 3-to-6-month
   deliveries into multi-year relationships.
3. **A contractual backup obligation**, not a documented endpoint: scheduled `GET /backup` into
   storage we control, with a restore drill proven during Phase 1.
4. **A processor DPA** naming Notion, Anthropic, AWS SES, Railway and Google as sub-processors,
   with retention per record class and a deletion-propagation obligation.

**Rebalance the build split.** Pick one: either their developer writes the `POST /api/webhooks/saberra`
receiver, the new proposal kinds and the member panel as a PR into the fork (both codebases are
TypeScript/Node, so this is not a skills gap), or we keep 100% of the memory line item per village
for the first 12 months while our build cost amortizes.

**Replace doc 06's Phase-2 gate.** "One month of usage by Amora stewards" measures internal
engagement on a free deployment, after the spend. Use checkpoints that test money:

- **CP1**, before any Amora-side code: continuity terms signed, their model and caching posture
  disclosed, a hard per-tenant spend cap replacing the soft budget.
- **CP2**, end of Phase 1: cost accounting live on both sides and a real dollar figure for a month
  of Amora's actual usage. No number, no Phase 2.
- **CP3**, before the joint offering: one non-Amora land project has signed and paid one invoice
  that includes the memory line. A design partner using it free is not this checkpoint.
- **CP4**, before any exclusivity or equity: three paying villages, a measured churn and support
  rate, and a gross margin you can state.

**One disclosure to write.** `client/src/pages/CustomGames.tsx` promises prospects "100% ownership
of the code, the data, and the keys," "no subscription required to keep it running," and "your API
keys never touch our database." All three stay true: the game is still fully owned and self-hosted,
and Saberra is a separately purchased optional service. But the owner's guide needs the sentence
that says which half is rented and what stops working the day they cancel. We already hold ourselves
to this standard for the borrowed Anthropic key (`docs/FORK_RUNBOOK.md:27`: a borrowed key "must not
survive handoff, since the village loses Maia the day it rotates"). Write the Saberra equivalent
before the first sale, and pair it with a cancellation-artifact clause: the village keeps its Notion
workspace and receives a final `/backup` export in a documented format.

---

## Nine changes to the technical plan

1. **Land Saberra events in a new `external_proposals` table, not `assistant_drafts`.** Doc 07 Q3
   assumes `assistant_drafts` and gives a reason that is false: "human accept calls the same
   creation functions as manual admin forms." For roles there *is* no admin form to share a function
   with. There is no `POST /api/admin/roles`; the draft-accept path at `server/index.ts:9091-9105`
   is the only role-creation route in the server. For circles the two paths call the same repo
   method with different objects and already differ in their defaults (`status: "active"` at 6635
   versus `"forming"` at 9124). Beyond that: `DRAFT_KINDS` is `["role", "circle"]` only
   (`shared/draftKinds.ts:19`), unknown payload keys are rejected (44-51), there is no provenance
   column at all, and both routes hard-require a named human proposer. Render the new table in the
   same review component so stewards keep one habit. Reuse the vocabulary we already have:
   `health_events.actor_kind` is `enum('human','agent','system','peer')`
   (`server/lib/events.ts:20`) and was built for exactly this.
2. **Replace the email join with a confirmed identity mapping.** Add `external_identities`
   (system, external_id, user_id, match_basis, status proposed/confirmed/refused/severed) and expose
   an opaque `subjectRef` outward, never `users.email`. Compute the join from email once as a
   proposal, confirm it by a human, then store it, which survives typos and address changes.
   `anonymizeMember` flips rows to severed and fires the erasure signal. Doc 07 Q1 asks for "member
   id or email": give it neither.
3. **Specify the envelope properly.** Clone the Stripe mechanism (HMAC over the raw body with a
   timestamp tolerance, `server/lib/payments.ts:114-134`), not the Riverside shared-secret header.
   Require a stable idempotency key derived from their own record identity (the Notion page id or
   the Meeting Capture Key), never `occurred_at`, because a re-extraction of the same transcript
   emits the same fact with a new timestamp. Add a **batch id** and their **significance score**,
   which doc 02:71 says they already compute internally, so stewards can group by meeting and cap by
   significance instead of reading a flat time-sorted list.
4. **Design the queue as lanes with caps and expiry.** Consent (quest claims, value-bearing,
   per-item, no batch actions) stays separate from Memory (decisions, summaries, risks, tensions:
   batch-reviewable) and Noise (gratitude observations, profile updates: digest only). Per-type
   daily ceilings as game variables, defaulting low, keeping the top N by significance and rolling
   the rest into one "23 more, mostly small" line. Auto-expiry at 14 days to `superseded`, counted
   rather than deleted. The restraint that exists for Maia does not transfer: `capBatch` limits a
   proposal batch to `max(3, activeMembers)` (`server/lib/drafts.ts:143-145`) and a webhook has no
   batch.
5. **Raise the evidence bar at the boundary rather than lowering ours.** Every pushed event carries
   a verbatim quote plus a source anchor and timestamp. Anything without one is dropped silently and
   the drop count is shown to stewards. This is not a new standard, it is ours:
   `drizzle/0028_automation_pipeline.sql:55-68` makes quote and timestamp `NOT NULL`, and
   `server/lib/callSynthesis.ts` drops tasks whose quote is not in the transcript.
6. **Forbid Saberra-originated proposals from ever touching `seat_holder` or `end_holding`**
   (`drizzle/0056_org_drafts.sql:47`). Contract term plus one guard. Restrict them to descriptive
   org changes. See finding 4: one accepted seat proposal becomes recurring automatic recognition
   within the hour, with no reversal route, and "an AI proposed that you stop holding this seat" is
   the single most relationship-poisoning message this integration could send.
7. **Kill the CC-the-capture-address idea (doc 04:52).** Its appeal is that it needs no code, which
   is exactly why it would silently copy member-to-member private correspondence into permanent
   third-party storage. Our contact relay puts the full message and the sender's real address into
   transactional email (`server/index.ts:6821-6829`) under a deliberate 180-day retention sweep
   (`shared/gameVariables.ts:702-708`). Replace it with a purpose-built emitter carrying a hardcoded
   allowlist of event kinds and no message bodies.
8. **Do not put meeting summaries in the forum.** Our forum module runs at lifecycle `public`, and
   I confirmed live today that `GET https://amora.regencivics.earth/api/forum/threads` returns 200
   to an unauthenticated stranger with thread bodies, author names and handles. `forum_threads` has
   no visibility column of any kind (`drizzle/0019_forum.sql:5-37`). Doc 04:25 and doc 05:15 both
   put meeting content there, which breaks doc 06 R5's own mitigation using R5's own recommended
   mechanism. Add a member-gated Brief page instead; it is smaller than moving the forum to
   `members` and does not change what the outside world can read.
9. **Get a read-only, role-scoped token.** Sera behind `/ask` can create, update, archive, merge
   and send email, with writes "consent-gated in conversation" (doc 01:71, doc 03:27). When our
   server proxies a member's question there is no human in that conversation. A read-only tool
   allowlist bound to the integration credential is a precondition, not a nice-to-have. Related:
   doc 03:85 puts `/ask-stream` at 20/min/IP, and a server-side proxy makes the whole village one
   IP, so one member's burst starves everyone.

**Two more, on the data side, which I would treat as Phase 0 and not Phase 3.** Our published
constitutional law 14 promises a departing member's name is scrubbed everywhere
(`shared/constitution.ts:104-108`, served anonymously at `server/index.ts:15367`), and
`GET /api/profile/export` carries the comment that "everything the village holds about me" has to
mean everything. `anonymizeMember` (`server/index.ts:2838-2960`) touches only local tables and
signals nothing outward. Capture is already running, so this is remediation of a live exposure
rather than a hypothetical. We need an erasure endpoint keyed on email that scrubs Notion, the alias
map, user preferences, embeddings and the confidential-identity map, plus a subject-export endpoint
we can append into our own export. And adoption should go through our own decision primitive: a
forum decision thread with `proposal.decide`. It costs an afternoon and it is the difference between
a system the village agreed to and one that was installed.

---

## How this improves Maia, deal or no deal

The plan's diagnosis of Maia is worth more than its prescription. Reading Sera's feature list
against our code produces a precise list of what Maia lacks, and most of it we should build for
ourselves regardless.

**First, correct the record for them.** Doc 03:71, doc 04:66 and doc 06:53 all assume "Maia's
existing loop" plus native SDK MCP support, and score it 9/10 "mostly configuration." Maia is
single-shot. I read the call site directly: `server/lib/assistant.ts:259-264` sends exactly
`{model, max_tokens, system, messages}`, the headers at 254-257 are only `x-api-key`,
`anthropic-version` and `content-type`, `stop_reason` is never read, and there is no loop. There is
no `@anthropic-ai/sdk` and no `@modelcontextprotocol/*` in package.json. So MCP is the *most*
expensive of the three available paths and carries the report's highest feasibility score. They
already pre-supplied the right answer in doc 07 Q4: a server-side pre-step. Take it.

**Build these regardless of what happens with Saberra**, roughly in this order:

1. **Per-call usage capture.** Read `data.usage` alongside `data.content` and write one row per call
   (mode, model, user, input/output tokens, key source). It is the precondition for every commercial
   sentence in this plan and it is about forty lines. It must not be built on the Gratitude ledger:
   recognition-kind tokens are non-purchasable by invariant. This is an ops table.
2. **The tool loop over the seven readers that already exist and are dead code.**
   `server/lib/villageReaders.ts:152-279` is finished, gated, token-capped and prompt-fenced, with
   `describe` fields already written as tool descriptions, and `callReader` / `readerCatalog` /
   `fenceForPrompt` have zero callers outside the file. `ModeSpec.toolCalls` is declared at
   `assistant.ts:47` with per-mode values and read nowhere. MAIA_BRAIN_SPEC.md:763 says it plainly:
   "Tool loop still open." Three to five days. Move the day-cap and per-IP checks *inside* the loop
   per iteration, because the spec already warns that counting requests rather than calls lets a
   four-turn loop quietly multiply spend by four. This is also the single largest prerequisite for
   ever building memory in-house, which is the only thing that makes the continuity terms negotiable
   rather than a favour.
3. **Cited answers.** The BM25 ranker already computes `sectionCitation` and prints it into the
   prompt (`server/index.ts:8957`). Return it to the client as a structured sources array and render
   it. Cheapest trust upgrade Maia can get.
4. **Use `fenceForPrompt` now, not when Sera arrives.** Member-written text reaches live prompts
   unfenced today: the concierge serialises quest titles and org role aims straight into the user
   message (`server/index.ts:6887-6915`), organize injects call-synthesis excerpts verbatim (8698),
   studio injects village_brief bodies (8952). The helper exists and has zero callers. Sera's
   answers would be a fourth class of third-party text arriving in the same prompts. This is a live
   defect independent of the deal.
5. **A member-facing Maia route.** `member` mode is declared with a budget and a `toolCalls` of 2
   and has no route. Ship `POST /api/assistant/member` with the village readers and the member
   brief. It is valuable on day one with zero Saberra dependency, and it is the socket the paid
   memory reader plugs into.
6. **Scoped short-lived tokens** (they mint these for browser streaming and meeting ingest so
   browsers never hold the master secret) and **feedback triage** (a thumbs-down stored with which
   shelves and readers were consulted, never the exchange).

**Where the free/paid line goes: tense, not visibility.** Free Maia answers anything derivable from
this village's own database and the shipped literature. Paid memory answers anything whose answer is
not in the database because it happened in a meeting or an inbox. We structurally cannot answer
those: there is no transcription worker anywhere in the repo, and the only transcript paths are a
Riverside body field or an admin paste. The pitch is one line: **Maia knows what your village is;
Sera knows what your village said.**

Doc 05:51's "members never need to know it exists" is right as UX and self-defeating as a business
model. An invisible paid layer cannot be demoed, missed when it lapses, or argued for at renewal.
Make the boundary legible inside Maia's own answers instead: every memory-sourced answer says where
it came from and shows its sources. A village that turns the upgrade off visibly loses the sourced
past-tense answers and keeps everything else.

**Protect three free surfaces by name** so the upgrade is not a hostage: the map concierge (which is
deterministic-first and answers most questions at zero tokens), the public proposal guide at
/work-with-us (which carries the largest budget in the table precisely because it is the one a
stranger meets), and Session 0 / studio drafting on a fresh fork. Our sales page already promises
"AI features cost nothing until the founder adds their own key."

**What Maia never delegates:** a write of any kind; a live-state or permissions question (Sera's
mirror is stale by minutes and mirrors the descriptive plane, while the plane that decides who may
do what is `roles`/`role_holders` feeding `hasCapability`); the village brief, which is authority
rank 2 and is promised fork-local by its own migration; the refusal (if Sera is down or returns no
sources, Maia says the memory has nothing and never fills in from literature); the public
unauthenticated proposal route; the persona; and the conversation itself. The question may go to
Sera. The exchange never does.

**Two features nobody in the report proposed, and both are strong paid-tier arguments:**

- **The seat transition brief.** We already know 14 days ahead that a term is ending (the term-watch
  job at `server/index.ts:3602-3624`, `GET /api/admin/org/expiring` at 16550). They already have
  `POST /transition-brief` keyed on person, role or circle (doc 03:23). Join them: at 14 days out,
  put a draft handover in front of the outgoing holder, the incoming holder and the circle lead.
  The pain is real and recurring, it needs no identity join beyond the seat, it needs no new member
  surface, and it is exactly what a land project would buy the backend for.
- **Map-anchored memory.** Doc 04:22 mentions `structure_key` as an afterthought. It is the most
  Amora-native idea in the package. Events already attach to structures via a JSON `structure_keys`
  column with a roll-up query (`server/lib/gatherings.ts:141-146, 405-425`). Tap a building, get its
  living history: gatherings held there, quests completed there, decisions made about it, risks
  logged against it. They have no spatial model at all (doc 01:93), so this is a capability neither
  product has alone, and it presents memory as a place rather than as an inbox.

**Cut the gratitude nudge in its proposed form.** `gratitude.require_message` defaults true and its
own description reads: "When on, Gratitude cannot be sent silently. The message is what makes
recognition mean something to the person receiving it." A machine-supplied reason inverts the one
rule the village wrote down about what makes recognition real, it spends the nudged member's single
send for the cycle (`max_per_recipient_per_cycle` defaults to 1), and there is no undo. Ship
"you were appreciated" as a read-only line in the member's digest instead, with the quote and no
button. Being appreciated is the value.

---

## Corrections to send them

Their docs stake credibility on verification-first, so send these as findings rather than
complaints. Five are ours to fix, three are theirs.

**Ours, and they should know before building against it:**

1. `supports: ["org/1"]` lives on `/.well-known/village.json`, not `/api/platform/info`. Confirmed
   live today.
2. `org.json`'s own `protocol` field reads `village/1`, not `org/1`. Confirmed live.
3. The Markdown org mirrors carry no signature at all. Only the JSON has `proof`.
4. **`orgUpdatedAt` is a real bug and it breaks their mirror.** The document version is a `MAX` over
   `org_roles` and `org_role_assignments` only (`server/index.ts:16228-16238`), while the document
   itself carries circles and typed relations, and it is signed at that same `updatedAt`. So
   renaming a circle or adding a deputy link changes the body with no change to the version marker
   or the proof. Until it is fixed, tell the mirror to diff the canonical body via `canonicalJson`
   rather than trusting the marker. Worth fixing on our side regardless.
5. Doc 07 Q3's premise is false: human accept does not call the same creation functions as the
   manual admin forms. See change 1 above.

**Theirs:**

6. Doc 03:71's "the Anthropic SDK supports MCP servers natively, so Maia could call ask_sera inside
   her existing loop" is wrong on both halves. There is no SDK and no loop. This is why doc 06's
   9/10 is the most wrong number in the package, and why their own doc 07 Q4 fallback is the plan.
7. Doc 04:35's "no counterpart on your side; pure gain" is wrong on retrospectives
   (`server/lib/seasonRetrospective.ts`) and understates decisions and tasks.
8. **Their unauthenticated `/health` returns the full tenant routing table.** I fetched it today:
   `routableTenants: 6`, naming VERDANA, amora, HQ, the-osa-foundation, SANDBOX and
   life-project-education beside their hostnames. Doc 01:7 says five live tenants. This is not a
   security incident, and it is the only observable evidence of their actual privacy operating
   standard against their prose. We sell to communities on sovereignty, and our equivalent public
   documents carry counts and never people, test-enforced. It belongs in the contract as a
   pre-provisioning condition.

---

## Questions to send

Ordered by how much the answer changes the decision.

1. Amora is already one of your live tenants. Send me the 90-day numbers for my own workspace:
   records created per database, and of those, how many Decision Candidates and Tasks any human ever
   moved off Draft. If most extraction is never reviewed on your side, Phase 2 is a pipe from your
   unreviewed queue into my stewards' attention, and I want us both looking at that number before we
   design anything.
2. Phase 1 as written sends you my transcripts, my org structure and, through Q1, my members' email
   addresses, and returns a sync job into your Notion. What arrives on my side in Phase 1 that a
   steward or a member can actually see? I would rather we build your outbound emitter first and
   forward nothing until proposals are flowing back.
3. What do I pay you today for the Amora tenant, what would I pay after this, and what is the
   per-tenant floor for a ReGen village? Doc 06 R10 calls this a business conversation and defers
   it, and it is the term that decides whether I write a line of code.
4. What model does Sera's loop run on, does it use prompt caching, and what is your measured cost per
   `/ask` and per processed meeting over the last 30 days at Amora? `/ask` returns `costUsd` and your
   ledger is per-source, so this is a query rather than an estimate.
5. You already ship Circles, Roles, Role Assignments with Energization Level, Decision Candidates,
   Tensions and a CCOS ledger. If I adopt the matrix I stop building the memory half and you keep a
   governance product you could sell directly to any community I introduce you to. What are you
   agreeing not to do, and for how long?
6. Your risk register has ten entries and not one of them is a risk you carry. Your only admitted
   gap is scored the lowest impact in the document. What is your honest failure mode: extraction
   quality, key person, Notion, or cost? I would trust the rest of the package more with that
   paragraph in it.
7. Has an extraction at any tenant ever produced a decision or a task that was materially wrong and
   reached a human as fact? What happened, and what changed afterwards? I should tell you plainly
   that on my side there is currently no undo: my reversal primitive exists in code and is called
   from no route.
8. Doc 06 R7 names the one-core-developer risk on both sides and mitigates it by keeping the code
   decoupled. That protects my codebase, not my customer. Will you sign source escrow or an
   automatic fallback licence triggered on acquisition, cessation, or 90 days of unremediated
   failure, plus 12 months' notice on token revocation and price changes? Doc 01:56 says your
   Postgres holds nothing a client would grieve losing, so this should be cheap for you to grant.
9. Sera behind `/ask` can create, update, archive, merge and send email, with writes consent-gated in
   conversation. When my server proxies a member's question there is no human in that conversation.
   Will you mint a read-only, role-scoped token so no member phrasing can ever cause a write in my
   community's memory?
10. When a member deletes their account on my side, my deletion is an anonymization across about
    thirty tables and it propagates nowhere. What is the single call I make to you, what does it
    actually erase across Notion, the alias map, the embeddings and the chat threads, and what is
    the turnaround? You already hold names of people I would be obliged to forget.
11. Will every event you push carry a verbatim quote and a source anchor, so I can drop anything
    without one? My own AI already works to that rule at schema level: no quote and no timestamp
    means no row, and I show my admins how many were dropped. I am not going to surface your output
    to members at a lower bar than I hold my own.
12. Doc 03 puts `/ask-stream` at 20 per minute per IP. If my server proxies every member question,
    my whole village is one IP and one person's burst starves everyone. What is the real limit for a
    server-side integration, and can you key it per end user?
13. Do you have a written policy for Risks records that file a named individual under burnout or
    wrong people? Who can read them, are they included when that person asks what you hold about
    them, and what is your procedure for that conversation? That is the moment this integration
    either survives or does not.
14. Your `/health` is unauthenticated and returns the full tenant routing table, naming all six
    tenants and their hostnames. Doc 01 says five. Will that be closed before any ReGen village is
    provisioned?
15. If this ends, what does Amora walk away with beyond the Notion pages: the alias map, the
    embeddings, the extraction prompts? And what would it cost me to run one tenant myself? I would
    rather hear the honest number from you, because it is the difference between a partnership and a
    dependency.
16. Doc 04:78 says my fork plus your provision call makes a new village a one-day setup. My own
    shipped page sells 3 to 6 months and my runbook lists seven preconditions that each need a human
    with accounts. Are you pricing this partnership against a volume assumption I have not agreed
    to, and what happens to your per-tenant price if the answer is three villages in two years?

One note on the "42 land projects" figure the docs price against (01:81, 04:78, 05:44): it does not
exist as deployed villages anywhere in either repo. Land projects are rows in ReGen's `applications`
table, which are applicants in a CRM, and an `applications` row carries no instanceId, no domain and
no fork reference. Forks mint their own UUID at first boot and nothing reports home. Do not trade
exclusivity, equity, or a discounted rate against a pipeline number nobody can produce yet.

---

## What I would do this week

1. **Pull the backup.** `GET /backup` and `GET /stats` on our own tenant. Count records per
   database, count how many were ever reviewed, read twenty extractions against meetings you were
   in. This is the gate on everything else and it costs an afternoon.
2. **Take the MCP connector for your own Claude.** Doc 07:20 offers it. It costs nothing, sits
   entirely outside the product, and is the fastest way to judge whether Sera's answers are worth
   money. Take that half and decline the Maia-as-MCP-client half.
3. **Have the two-hour session they propose**, with the commercial questions on the table alongside
   the matrix. Their doc 07:27 is right that the matrix is the actual contract. It is also not the
   only one.
4. **Ship the usage capture.** Forty lines in `assistant.ts` plus one table. Every commercial
   sentence in this plan is blocked on it, and it is worth doing whether or not the deal happens.

If the extraction audit comes back good and they will sign the continuity terms, this is a strong
partnership and the memory line item is a real product for the custom-game tier. If the extraction
audit comes back thin, the honest answer is to keep the MCP connector for yourself, build the tool
loop for Maia, and revisit in six months with a much better negotiating position.
