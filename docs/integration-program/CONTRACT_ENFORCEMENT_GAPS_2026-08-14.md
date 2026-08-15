# What the contract promises that the platform cannot yet mechanically enforce

Produced by Lane C at the close of its build, measured at game-amora `d14b160` (C1 + C2 landed).
This list is what every vendor conversation has to be honest about, and it is the source for
landing-queue items. Ordered by what would hurt soonest in a vendor conversation.

| Contract clause | Enforced today | The gap |
|---|---|---|
| 1 · Named counterparty | legalName, product/terms/status URLs, support URL + email: required, validated | **Jurisdiction and a named human are not fields.** A shared support@ inbox passes every check |
| 2 · Five driver methods | `forgetMember`/`exportMember` have a real interface + registry | **`read`/`write`/`health` have no interface anywhere**; stage 6's "all five demonstrated" gate does not exist; **nothing requires a member-pii listing to register a member driver at all** — it boots clean and deletion silently reaches nothing outside |
| 3 · Evidence rule | nothing generic | `call_tasks` enforces quote+timestamp for the automation module only. No generic inbound path, no drop counter, no admin surface for drops |
| 4 · Graceful absence | missing credential → 503, everything else works | **A present credential behind a dead service passes `requireVendor` untouched** — no circuit breaker; nothing prevents a village-facing surface depending on a vendor read |
| 5 · Data agreement | `dataClass` field exists | **No DPA record, sub-processor list, retention, hard-delete endpoint or turnaround fields; no gate stopping a member-pii listing enabling without any of them.** Stage 3's exit is entirely manual |
| 6 · Idempotency | — | Webhook receiver deliberately not built (waits for a webhook-driven vendor) |
| 7 · 60-day breaking-change notice | — | No interface-version field, no notice record. Not mechanically enforceable; say so out loud |
| 8 · Founder-alone setup | `setupSteps` renders; managed listings refused any | Nothing requires present-or-explicitly-empty; stage 8's "second person, fresh fork, no help" bar has no test |
| 9 · Support kept current | both addresses required, shape-validated | **Nothing checks they resolve** (tools link-checker exists, not pointed here); no first-response-time field; **no `withdrawn` state on a listing** — removing a registry entry orphans `module_settings`, which is exactly what the contract promises never happens |
| 10 · Evidence packet | — | Not built; and **`integration_health` records no latency**, which the packet spec requires. Add the column when building it |
| 11 · Correlation id | fully honoured on our side | Cannot enforce the vendor logs it; policy, not machinery |
| 12 · Liveness | declared, validated, five verdicts; `never-confirmed`/`stale` cannot collapse into healthy | **The probe does not exist** (correctly out of C1). An on-demand listing that quietly stopped being used reads `quiet` forever |
| Platform-billed terms | — | **The largest single gap: no metering, no hard cap, no cost attribution anywhere.** A Managed listing today has no spend ceiling of any kind, inside a price marketed as "one number, no surprises" |
| "We keep a call log" | — | `integration_calls` not built (queue item 5) |
| "We attribute conservatively" | `supportRoute` routes statically by tier | A Connected listing sends the village to the vendor unconditionally, no evidence gate. Safe only while nothing claims to have reasoned; **fix 3's confidence rule must land before any diagnosis infers** |
| "We aggregate / cap / dedupe handoffs" | — | Not built |
| Structural nevers | federated documents proven byte-identical (nothing about vendors leaks) | `provides` has no collision refusal (deliberate); no domain spine required; **nothing stops a driver writing to core-module tables**; no review queue exists, so "never written as fact" rests on convention |
| Managed entry conditions | cap of two enforced in code with its reason | Named escalation human, credit-back clause, proven local repro path: no fields, no checks |

## Small follow-ups queued from the same report

- `sectionCitation` still renders `Title > Heading` for every shelf document; the provenance
  marker is live but the one-line wiring lives in `knowledge.ts` (Lane A's file, now merged and
  unowned). The change is written out in `server/lib/moduleDocProvenance.ts`'s header.
- `PUT /api/admin/email-config` (index.ts ~12508) drops empty-string values, so a stored key can
  never be cleared through that route. Confirmed by both lanes, owned by neither's landed scope.
