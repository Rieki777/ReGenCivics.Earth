# Stage 2. Domain assignment: `signals`

One page. Owner: platform engineering, ratified by Rye.
Exit gate: no incumbent, or an explicit migration plan off the incumbent.

## The domain

**`signals` — risks, tensions and commitments.** Named things a community carries: a hazard someone
flagged, a gap between how it says it works and how it works, and an ongoing agreement between
parties. Nothing else.

**The platform holds nothing in this domain today.** There is no risks table, no tensions table and
no commitments table anywhere in `drizzle/`. This is the only claim in Saberra's matrix (04:35) with
genuinely no counterpart in our DDL, which is why it is the listing: no spine migration, no
source-of-truth renegotiation, no identity join-key policy, and no collision with the CRM vendor
that comes later. It exercises the whole adapter path at the smallest possible blast radius.

**Incumbent: none.** Saberra is the sole driver. The 409 collision refusal in `setModuleLifecycle`
has nothing to refuse yet; `signals` is what gives it its first holder.

## Retrospectives are excluded, and this is deliberate

Saberra's matrix row 04:35 bundles retrospectives with risks, tensions and commitments and calls the
whole row "no counterpart on your side; pure gain." That is wrong on retrospectives, and the
collision is philosophical rather than structural, which is the kind that gets conceded by default
if nobody says it out loud.

`server/lib/seasonRetrospective.ts` already exists. Its header states the rule: no composite score,
because villages optimise whatever number is displayed, and a single "season health" figure would go
green while the founder held everything. Each read stands on its own with its own honest null, and
it emits typed actions with evidence numbers instead of a grade.

Saberra ships `GET /health-score` returning a 0-100 org-health grade with a breakdown, cached ten
minutes. `docs/COORDINATION_SUBSTRATE.md` never-builds exactly that.

So: **retrospectives are not listed, and the health score is not surfaced in-game.** Not because
theirs is bad, but because the platform already answered this question and answered it the harder
way. Say it to Saberra rather than letting it arrive by default — the artifact on our side is the
stronger one and they should hear the reason.

## What the spine owns versus what the driver holds

There is no spine table in `signals` today and the listing does not require one, because nothing on
the platform side is keyed to a Saberra object id and no page renders from a Saberra read. The
driver is read-mostly and fire-and-forget.

- **The driver holds** the records themselves, in the tenant's own Notion workspace, which the
  village owns and can export independently of us.
- **The platform owns** the deletion state and the consent record — the two things a vendor may
  never be the authority for. Per the domain rule's clause 5, export and anonymize enumerate the
  spine plus the registry of external stores that must be told, and Saberra is one of those stores.
  This is Lane C's C2 driver registry, not a `signals` table.
- **When the spine becomes necessary:** the first time anything on our side references a Saberra
  record by id — a steward accepting one, a member dismissing one, a quote being pinned to a
  structure on the map. At that moment `signals` needs a platform-owned row carrying the join key,
  and it should be created then rather than pre-built now.

## The enumerated write surface

**Outbound to Saberra, in v1: nothing except deletion.**

| Operation | Direction | Payload |
|---|---|---|
| `read(query)` | out → in | GET only. Risks, Tensions, Commitments for this tenant. |
| `health()` | out → in | `GET /health`, unauthenticated, liveness only. |
| `exportMember(userId)` | out → in | read of what they hold about one person, appended to `GET /api/profile/export`. |
| `forgetMember(userId)` | **out, write** | the hard-delete call. The only write in the listing. |
| `write(op)` | **inert in v1** | implemented because the interface requires all five, and refuses every op with a stated reason. Not wired to any route. |

That is the whole surface. No `/extract`, no `/reprocess`, no meeting ingest, no transcript
forwarding, no capture-address CC, no inbound webhook receiver. Saberra has no outbound events
(doc 03:79), which is exactly why this listing needs no generic webhook infrastructure and can ship
before one exists.

## The refusal list

Explicit, structural, and not negotiable per listing.

1. **Never writes to a core module.** Quests, gratitude, progression and profiles are the platform's
   own loop. No Saberra record creates, edits or completes any of them.
2. **Never reaches the ledger.** No auto-minting, no auto-crediting, no auto-assignment. Nothing
   Saberra sends may move value. A record can suggest; only a person can credit.
3. **Never produces a capability answer.** The permission gate reads `roles` / `role_holders` /
   `hasCapability` and platform state only. Nothing a vendor holds ever decides what a member may
   do, and a stale mirror deciding permissions is how that goes wrong quietly.
4. **Never flips a module lifecycle.** `setModuleLifecycle` is a human action. A vendor does not
   turn its own module on, off, or up.
5. **Never touches a seat holder.** No proposal from this driver may reach `seat_holder` or
   `end_holding`. One accepted seat change becomes recurring automatic recognition within the hour
   via the settlement job, with no reversal route in the API, and "an AI proposed that you stop
   holding this seat" is the single most relationship-poisoning message this integration could send.
6. **Never enters `assistant_drafts`.** Its `DRAFT_KINDS` is `role` and `circle` only, it rejects
   unknown payload keys, it has no provenance column, and both its routes hard-require a named human
   proposer.
7. **Never appears in a federated document.** `/api/platform/info` and `/.well-known/village.json`
   carry counts and never people, and they will not carry which commercial services a village buys.
   Those two payloads must be byte-identical before and after this module exists.
8. **Never surfaces a record without evidence.** Every record shown to a member carries a verbatim
   quote, a source anchor and a timestamp. Anything without one is dropped on arrival, not stored,
   and the drop is counted and shown to admins. This is the platform's existing bar in DDL — quote
   and timestamp `NOT NULL`, "no quote, no timestamp, no row" — and it does not get lowered to
   accommodate a vendor.
9. **Never surfaces the health score, and never lists retrospectives.** See above.

## Tier consequence

Managed. The credential is platform-held and env-only, never in `SECRET_KEYS`, copying the
`PLATFORM_ASSISTANT_KEY` posture exactly: read from env at call time, never returned by the secrets
route, not even masked, because it is not the village's secret to see. The village has no Saberra
account. That is the mechanical tell of the tier, and it is the thing to check if anyone asks
whether a listing is really Managed.
