# Stage 5. Tier and commercials

Tier sought: **Managed**, one of two slots, hard cap.
Exit gate: a free slot against the cap **plus all four Managed entry conditions** **plus** the three
platform-billed terms (stage 5a). Default is Connected; Managed is a deliberate spend.

## The gate table

Nothing here is a preference. Each row is a term that must be answered in writing before the tier is
granted, and each has a stated fallback if it is refused. **Every fallback is Connected**, which is
a real outcome and not a threat — the village buys it from Saberra directly, holds its own key, and
sees it as source and last4.

### Stage 5a, the billing bar (all three, or it is Connected)

| # | Term | Required | Where it stands | If refused |
|---|---|---|---|---|
| 1 | **Flat wholesale rate per village per month** | a single number, invariant to usage inside the included volume | **unknown.** No price of any kind is on file, published or agreed. | Connected. A fixed monthly price marketed as "no surprises" cannot sit on top of a variable cost. |
| 2 | **Stated included volume** | what one village gets for that number: processed meetings per month, `/ask` calls, records extracted, storage | **unknown.** | Connected. Without it there is no unit to reconcile and no way to price the second village. |
| 3 | **A hard cap that actually stops requests** | a ceiling that refuses, plus a designed behaviour at the ceiling we can describe to a customer in advance | **fails today.** Doc 03:87: an optional monthly soft budget per tenant that "never blocks; warns admins at 80%." | **This is a term to fix, not to accept.** A budget that warns and never blocks is not a cap. Connected if they will not build the ceiling. |

On row 3, the behaviour at the ceiling has to be named, not just the ceiling. For `signals` the
right one is: reads stop returning new records, the module reports unavailable through the 503 path,
the village keeps working, and the admin is told. It must never be: keep serving and invoice the
overage.

### The four Managed entry conditions

| # | Condition | Required | Where it stands | If refused |
|---|---|---|---|---|
| 4 | **A named escalation human with a response commitment** | a person, an email, and a stated first-response time for the private escalation the village never sees | partial. `rick@saberra.com` corresponds with Rye; no surname, role, or commitment on file. | Connected. In Managed their 3am outage is ours, for software we cannot patch. |
| 5 | **A status page** | a URL we render | **missing.** | Connected. |
| 6 | **A credit-back clause** pointing at our own incident log | written | **missing.** | Connected. |
| 7 | **A proven local reproduction path** | we can reproduce a fault without them | **not established.** No entity read surface exists yet, so there is currently nothing to reproduce against. | Connected. |

### The remaining platform-billed terms

| # | Term | Required | Where it stands |
|---|---|---|---|
| 8 | **Per-source cost attribution readable over their API** | so we reconcile against our own meter rather than against their invoice | **likely already true and unverified.** Doc 02:84 names `token_ledger` and `token_usage_by_source`; doc 03:87 says game-originated questions would be "visibly attributable and billable." Neither is exposed on a documented endpoint. `GET /stats` returns 7-day totals, not per-source. Ask for the route. |
| 9 | **Expected support-volume band and first-response time** | a band we can staff against, both directions | **missing.** Ask: how many support conversations per tenant per month at their existing five tenants, and what fraction are extraction-quality complaints. |
| 10 | **Withdrawal terms both ways** | 90 days' notice, a data return, listing marked withdrawn not deleted | **missing.** Ask now, while everyone is friendly. |
| 11 | **Twelve months' notice on price change and token revocation** | written | **missing.** Continuity term; unobtainable once five villages depend on it. |
| 12 | **The Managed exit obligation** | **ours, not theirs.** In Managed the village never had the account, so the data return is the platform's obligation. Scheduled `/backup` into storage we control, with a restore drill proven before go-live. | Not started. Costed as platform work, not vendor work. |

## The margin conversation, with a floor

Opening position, per the tiers doc: **a margin on list price with a floor covering one support hour
per village per month.** Support cost scales with villages, not with usage, and Managed means we
take the first call every time regardless of whose fault it is.

Get their number before building, not after the pilot. Four inputs, all of which exist as queries on
their side today (`/ask` returns `costUsd`; the ledger is per-source per day): what Rye pays for the
Amora tenant now, what he would pay after, the per-village floor at one village and at five, and the
measured cost per `/ask` and per processed meeting over the last 30 days — the tail, not the median.

Do not name a price first. The shape the review argues for stands: memory is a line item inside
`regen-full-service`, which already exists in code and in a shipped price, with Rye as single biller
and the tenant secret as the de facto licence. No new pricing concept, no entitlement system, no
billing code.

## Honest assessment of the tier ask

**On today's evidence Saberra does not clear Managed.** Rows 1, 2, 5, 6, 9, 10 and 11 are empty, row
3 fails against their documented behaviour, and rows 4 and 7 are partial. That is not a judgement
about the product; it is stage 5 doing what stage 1 did to Orbit, one gate earlier in the funnel and
with a real counterparty on the other end.

Two things follow.

1. **Every one of these is answerable in a single reply.** Most are administrative. Only row 3 (the
   hard cap) and row 8 (the attribution route) are engineering work on their side, and row 3 is the
   one worth spending the relationship on.
2. **Connected is a genuine outcome, not a failure.** If the cap never gets built, Saberra is listed
   as Connected: the village holds its own key, sees it as source and last4, buys the service
   directly, and can revoke it without asking us. The whole listing still ships. What changes is
   that the platform stops carrying uncapped usage-scaled cost inside a fixed price with the words
   "no surprises" in it — which is exactly what the tier exists to prevent, and it is
   self-selecting in the right direction.

The Managed slot stays open while they answer. It does not get granted provisionally.
