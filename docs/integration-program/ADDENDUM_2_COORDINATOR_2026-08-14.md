# Addendum 2 to the Master Integrator Coordinator

Paste into the coordinator session after Addendum 1. This carries Rye's decisions since that addendum,
the seven fixes to the diagnostic design, and the revised landing queue.

---

## A. Decisions Rye has made since Addendum 1

Record these in ledger §8 as rulings, dated, with the reasons. They are settled and should not be
reopened without new evidence.

1. **The `crm` split is confirmed.** `people` is platform-owned with no vendor driver in v1;
   `leads` is vendor-drivable. Saberra's Profiles is a mirror of `people`, never the authority.
2. **Support routing is a mechanism, not a policy.** Every listing carries a support URL and a support
   email as required registry fields, validated, rendered by the product. A listing without both cannot
   exist at any tier. This is now clauses 9 to 12 of the module library contract.
3. **The tier decides where routing points.** Included and Managed point at ReGen Civics. Connected
   points at the vendor. The routing rule keys on **who supports**, never on who built.
4. **Maia performs the diagnosis.** A villager asks and she identifies what is wrong and who to
   contact. See Addendum 1 §3a for the design, and section B below for the seven fixes that make it
   safe to ship.
5. **Triage remains ReGen Civics' obligation in all three tiers.** Routing is what happens after
   triage, never instead of it.
6. **The Managed cap holds at two slots, and the second is explicitly a transition slot.** So one
   steady-state Managed listing, plus room to onboard a replacement without going dark. It ratchets on
   evidence, not on appetite. See fix 7.

## B. The seven fixes

Each one names the problem, the fix, and where it lands.

### Fix 1. Health data does not exist, and its absence fails in the worst direction

**Problem.** `secretStatus.setAt` records when a key was typed, never when it last worked, so a revoked
or expired credential reads as connected forever. Diagnosis built on it would confidently tell a
village its credential is fine about a dead one, on the single most common failure.

**Fix.** An `integration_health` record per (module, operation) carrying `lastSuccessAt`,
`lastFailureAt`, `lastFailureStatus`, `lastFailureDetail` and `consecutiveFailures`. Written by the
**driver wrapper on every outbound call**, never by each driver, so a new listing inherits it and
cannot forget. `peer_instances` already carries three of these facts written from one central place;
copy that shape. Add a hard rule to the diagnostic layer: **it never asserts credential health from
`setAt`.** With no recorded success the answer is "never confirmed working", not "fine".

**Lands:** Lane C phase 1, promoted ahead of C2. Blocks the first Connected or Managed listing.

### Fix 2. Absence of a failure is not evidence of health

**Problem.** The log records calls that were made. A module that is off, a driver that never fires, or
a job that silently stopped produces no failure row, so diagnosis reports nothing wrong. That blind
spot sits exactly where slow rot lives.

**Fix.** Every listing declares a **liveness window** in its registry entry, either a period inside
which a successful call is normally expected, or an explicit "on demand only, silence is normal". A
scheduled probe evaluates it, following the tools link-checker discipline verbatim: per-row
`last_checked_at` and `last_check_status`, and **one digest, never a per-item ping**. For on-demand
integrations the probe makes a cheap synthetic health call rather than inferring from silence.

Internally the diagnosis gains a fifth state, **unknown or stale**, which must render as unknown and
must never collapse into healthy.

**Lands:** registry field in Lane C phase 1; the probe with the incident log. Contract clause 12.

### Fix 3. Being wrong once kills the mechanism, not just the answer

**Problem.** The first confident wrong attribution to a vendor ends the village's trust in diagnosis
permanently, and thereafter everything routes to Rye anyway.

**Fix.** A written confidence rule in the diagnostic contract:

> Attribution requires a recorded fact that discriminates between outcomes. If two or more outcomes
> are consistent with the evidence, or if the newest relevant record is older than the liveness
> window, the answer states what was observed, declines to attribute, and routes to ReGen Civics.
> **Never route to a vendor on inference.**

Then instrument it: every attribution is logged with the evidence it used and, later, what it turned
out to be. That record is what lets the rule be loosened on measurement rather than on feeling.

**Lands:** the diagnostic reader, and ledger §9 as a standing rule.

### Fix 4. No escape hatch when the diagnosis is wrong

**Problem.** A villager who thinks the diagnosis is wrong has nowhere to go, so a confident wrong
answer is a dead end and Rye never finds out.

**Fix.** Every diagnosis ends with "this does not match what I am seeing", which files a report
carrying the diagnosis, the evidence it used and the villager's own description. **It goes to ReGen
Civics regardless of tier**, because a wrong diagnosis is a platform defect and not the vendor's.

Reuse the feedback relay rather than building a second channel: it already captures locally always,
relays content only, is queue-and-forget, and captures its consent at capture time. It needs a module
reference and a diagnosis reference added. Note the standing rule on that consent: `may_relay` is the
promise the form made to that person, so turning on any new relay destination must never ship the
existing backlog.

**The dispute rate is the metric for whether the mechanism deserves trust.** Track it in the ledger.

**Lands:** with the diagnostic reader.

### Fix 5. Your log becomes the arbiter between your customer and your vendor

**Problem.** A vendor saying "our logs show 200s" against your log showing timeouts is a relationship
question with no technical answer, and you have not decided how it resolves.

**Fix.** Three parts, and the second is the highest value per unit of effort in this whole addendum.

1. The incident log records request metadata, outcome, HTTP status, latency, timestamp and a
   correlation id. **Never payloads, never member content**, so the log is always something you would
   be willing to show a vendor.
2. **Send the correlation id on every outbound request in a header.** Then "our log says timeout at
   14:02, correlation `abc123`" is checkable on their side in a minute instead of an afternoon. This is
   a few lines in the driver wrapper and it is the difference between an evidence-based conversation
   and two parties asserting.
3. Contract language, now clause 11: the log is evidence and not adjudication, and both parties compare
   correlation ids before either escalates.

**Lands:** the driver wrapper and the incident log, Lane C.

### Fix 6. You are about to generate tickets into someone else's queue at your cadence

**Problem.** A vendor who signed up to be in a catalog did not necessarily sign up for machine-generated
tickets from N villages. Good diagnosis makes you a great partner; noisy diagnosis makes you a bad
customer at scale.

**Fix.** Three controls, plus one thing to sell.

1. **Deduplicate and cap.** The same diagnosis for the same module within a window produces one
   conversation, not one per click. Cap handoffs per village per vendor per day.
2. **Aggregate upward.** When one outage hits several villages, the vendor receives **one notification
   from you**, not N tickets from N villages. Say this in the sales conversation: being in the catalog
   should *reduce* their support volume relative to selling to those communities directly. That is a
   genuine reason for a good vendor to want to be listed, and it is now in the contract.
3. **Agree the numbers per listing at stage 5**: an expected support volume band and a stated
   first-response time, recorded in ledger §3a.

**Lands:** contract (done), §3a columns, and the handoff mechanism.

### Fix 7. Managed load is unchanged, so the cap keeps its other four jobs

**Problem.** Routing sends nothing away in Managed, because Managed points at Rye by definition.

**Fix.** State the cap precisely and instrument it rather than defending a number.

- **Two slots, the second explicitly a transition slot.** One steady-state Managed listing, plus room
  to onboard a replacement without going dark.
- **The cap exists for the four obligations routing does not touch**: credit risk, variable cost inside
  a fixed price, the data-return obligation on exit, and an SLA for software Rye cannot patch. Write
  that reason next to the number so a future reader does not mistake it for caution.
- **Managed listings additionally require a named escalation human with a response commitment.** Rye
  cannot route the villager, so he must be able to route himself.
- **Ratchet on evidence.** The number moves when there is a clean quarter on the first listing, a
  measured ticket count and time-to-resolution, and someone other than Rye answering. Track those three
  in the ledger so the review is a scheduled decision rather than a negotiation under pressure.

**Lands:** ledger §3a and §8, and the contract's Managed entry conditions.

## C. Revised landing queue

The diagnostic path reorders things. Two items moved forward.

1. **Lane A** (memory foundation). Unchanged. Ships alone, merges first.
2. **Lane C phase 1** (catalog, tier metadata, 503 lapse path, dynamic secret slots, registry-driven
   Integrations cards, tier stamped at enable). **Now also carries `integration_health` and the
   correlation id in the driver wrapper**, promoted from later because diagnosis is unsafe without them.
3. **The hub ADR** for the platform-held Managed credential. Must precede any Managed credential code.
4. **Lane C phase 2** (the `forgetMember` / `exportMember` driver registry). Gates the first paid listing.
5. **The incident log and the liveness probe.** Moved ahead of the first Connected listing, because
   without them every attribution is an assertion.
6. **The diagnostic path** (reader, four outcomes, two answer tiers, the no-model fallback, the escape
   hatch). Depends on 1, 2 and 5.
7. **Lane S stages 0 to 5.** Not blocked on any of the above. Dispatch now.
8. **Lane S build.** After 2, 3 and 4.
9. **The hub side of a Managed listing** (shared vendor account, per-fork roster, billing line item,
   contracting entity block).

## D. Still open for Rye

- The four contracting-entity questions from the main prompt. Questions 1 to 3 block CORE signing
  anything; question 4 blocks the first invoice. Neither blocks building.
- Saberra's commercial terms, which decide whether Lane S build is worth scheduling at all.
- Whether the contract is published on a URL or sent privately. It cannot go to a second vendor until
  Lane C phase 1 and the incident log land, because clauses 9 to 12 describe machinery that does not
  exist yet.
- The eight diagnostic sentences, four outcomes times two answer tiers. Draft them deliberately before
  the code rather than under pressure at 2am. They are shipped copy through the voice gate.
