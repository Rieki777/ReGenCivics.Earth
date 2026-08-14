# The Module Library Contract

**Version 1.0. 2026-08-14.** Destination in the repo: `docs/MODULE_LIBRARY_CONTRACT.md`, beside
`docs/FEEDBACK_HUB_CONTRACT.md`, which is the house precedent for a document of this kind.

This is the standard a service meets to be listed in the module library. It is written to be sent to
a vendor unchanged. Every listing is stamped with the contract version it was accepted under, so a
later version is a re-acceptance and never a silent rewrite.

---

## What the library is

The platform is a white-label village-coordination system. Villages fork it, run it on their own
infrastructure, and own the code and the data. Modules are units of capability. The four core modules
(quests, gratitude, progression, profiles) are always on and cannot be disabled. Every other module
ships off, and a village turns on what it wants.

The library is the catalog of modules that connect the platform to an outside service.

**Every module is first-party code in the platform repository.** A listing is a connector we write
and maintain against your API. We do not run vendor code inside a village's server, and there is no
plugin runtime. This is deliberate: it is what lets us support the platform at all, and it means your
service is never blamed for a defect in someone else's.

## The three tiers

A listing sits in one tier. The tier answers the only two questions a village asks: who do I pay, and
who do I call.

| | **Included** | **Connected** | **Managed** |
|---|---|---|---|
| Built by | us | you | you |
| Billed by | us, in the platform price | **you, direct to the village** | **us** |
| Supported by | us | you for the service, us for the connector | us first line, you behind a private escalation |
| Credential | none, or the village's own upstream account | **a key the village holds and can see** | **platform-held, the village never sees it** |
| The village has an account with you | n/a | **yes** | **no** |

**Connected is the default for third parties.** Managed is a deliberate spend on our side and is hard
capped at two concurrent listings.

The credential placement is the mechanical definition of the tier, not a description of it. In
Included and Connected the key lives in the village's own secrets store, where an admin sees its
source and last four characters and can rotate it without asking us. In Managed the key is held by the
platform in environment configuration and is never returned to a village, not even masked, because it
is not theirs to see.

## What every listing must provide

These apply at every tier. None of them softens because you bill the village directly.

**1. A named counterparty.** A legal entity, a jurisdiction, a named human with an email, an exact
product URL, a terms URL and a status page. We do not list anonymous services. If we promise a village
that someone answers the phone, there has to be someone to name.

**2. Five driver methods, all of them.** `read`, `write`, `health`, `exportMember`, `forgetMember`. The
last two are not optional and are not a roadmap item. A service that cannot delete one person's data
on request, and confirm it, is not listable.

**3. An evidence rule on anything a member reads.** Any record you push that will be shown to a member
carries a verbatim quote, a source anchor and a timestamp. Anything without one is dropped on arrival
and the drop is counted and shown to the village's admins. This is the bar our own AI already meets at
the database level: no quote and no timestamp means no row. We are not going to show your output to a
community at a lower bar than we hold our own.

**4. Graceful absence.** When your service is unavailable, the connector reports unavailable and
everything else in the village keeps working. No village-facing surface may depend on a read from you
to render. Every integration in this platform already works this way.

**5. A data classification and, where it applies, a data agreement.** Each listing declares whether it
touches nothing, village content, or member personal data. Where it touches member personal data we
require a signed processing agreement naming your sub-processors, a documented retention period, a
documented hard-delete endpoint, and a deletion turnaround we can state to a member.

**6. Idempotency on anything you push.** If you deliver events, they carry a stable identifier derived
from your own record, not a timestamp, and redelivery of the same fact is a no-op on our side.

**7. Version your interface and tell us before you change it.** Sixty days' notice on any breaking
change to an endpoint, a payload shape or an authentication method.

**8. Setup a founder can complete alone.** A village admin enables the module, follows the card, and it
works. If any step requires a human logging into your product to paste something back, tell us at
proving time, because it becomes a permanent per-village cost and it changes the commercial terms.

**9. A support address that is answered, and kept current.** A support URL and a support email, both
required to be listed, both stored as fields we render rather than as a line in a document. A listing
whose support address stops resolving is reviewed and can be withdrawn. Where you are the supporting
party, our members reach you through that address with a structured evidence packet attached (see
below), and we ask for a stated first-response time.

**10. Accept our evidence packet.** When our diagnosis attributes a fault to your service, the village
reaches you with a machine-generated packet: the instance identifier, the module, the operation, the
observed HTTP outcomes and latencies, and the timestamps. It carries no member names and no member
content. It is a record of what we observed rather than a conclusion about your system, and it exists
so the conversation starts from evidence instead of from a villager's description of software they did
not build.

**11. Echo our correlation id.** Every request we make carries a correlation identifier in a header.
Log it on your side. When our records and yours disagree, the correlation id is how we find the same
call in two systems in a minute rather than an afternoon. Our log is evidence and not adjudication:
where the two disagree, both parties compare correlation ids before either escalates.

**12. Tell us what healthy looks like.** Each listing declares a liveness expectation, either a window
inside which a successful call is normally expected, or an explicit statement that the integration is
on-demand only and silence is normal. We probe against it. Without this, an integration that quietly
stopped working reads to us as an integration nobody happened to use, and neither of us finds out until
a member does.

## Additional terms for platform-billed listings

If we bill the village for your service, three more terms apply, and they exist because we sell a
fixed monthly price with the words "no surprises" in it.

- **A flat wholesale rate per village per month**, with a stated included volume.
- **A hard cap that actually stops requests**, with a defined behaviour at the ceiling that we can
  describe to a customer in advance. A soft budget that warns and never blocks is not a cap.
- **Per-source cost attribution readable over your API**, so we reconcile against our own meter rather
  than against your invoice.

A service that will not offer these is still welcome in the library. It is listed as Connected, and the
village buys it from you.

## What the platform guarantees you

- **We own triage in all three tiers.** We keep a call log with outcomes and latencies, and when
  something breaks we tell the village whose problem it is before anyone raises their voice. You fix
  yours; we fix ours.
- **We attribute conservatively, and we absorb the ambiguous ones.** Where the recorded evidence does
  not clearly discriminate, the village is routed to us rather than to you. You will get fewer tickets
  than a naive rule would send, and the ones you get will carry evidence.
- **We aggregate.** When one outage affects several villages, you receive one notification from us and
  not one ticket per village. Being in this catalog should reduce your support volume relative to
  selling to those communities directly, not raise it. We also cap and deduplicate handoffs per
  village per day so a repeated failure produces one conversation.
- **We do not compete with a listing we solicited.** If we decide to build in your domain we tell you
  before we start, not after.
- **Your name appears where you earned it.** Connected listings carry your name and your support link
  in the catalog and on the setup card. Managed listings do not name you to the village by default,
  because in Managed we sold the sentence "call us"; if naming matters commercially we will discuss
  placement.
- **Withdrawal is orderly in both directions.** Ninety days' notice, a data return, and the listing is
  marked withdrawn rather than deleted so nothing orphans.

## What the platform will never do

These are structural and are not negotiable per listing.

- **No vendor is a source of truth.** Each domain has a platform-owned table holding the join key, the
  consent record and the deletion state. Your service is a driver behind it. At most one driver per
  domain runs at a time.
- **Nothing you hold ever decides what a member may do.** The permission gate reads platform state
  only.
- **Nothing you send ever moves value.** Token movement is double-entry and human-consented. A record
  you push can suggest; only a person can credit.
- **Nothing you send is ever written as fact.** Everything crossing the boundary lands in a review
  queue on our side.
- **Nothing about a village's vendors is published.** Our federated documents carry counts and never
  people, and they will not carry which commercial services a village buys.
- **We do not write to a core module on your behalf.** Quests, gratitude, progression and profiles are
  the platform's own loop.

## How a listing happens

Eleven stages. The gates that stop most conversations are the first three.

0. **Intake.** One sentence naming the capability, without marketing words, and the domain it claims.
1. **Diligence.** The named counterparty above. No name, no listing.
2. **Domain assignment.** Which domain, who holds it today, and the enumerated write surface.
3. **Data and legal.** Classification, agreement, deletion endpoint, export answer.
4. **Technical proving.** A sandbox tenant and one real captured payload per operation. Documentation
   is not evidence. All five driver methods demonstrated live, including a deletion verified by reading
   back and getting nothing.
5. **Tier and commercials.** Tier, credential plane, margin, response commitments, withdrawal terms.
6. **Build.** Ours.
7. **Pilot in one named village**, with the export and deletion drill run rather than planned.
8. **List.** The bar is that a second person can enable it in a fresh fork using only the shipped
   interface and the runbook.
9. **Operate.** Health probes, a call log, and a quarterly review that you still exist, terms have not
   changed, the agreement is current and the tier is still honest.
10. **Withdraw**, when it ends, by the terms above.

---

*Contract version 1.0. Listings are accepted against a version. A new version is offered to existing
listings as a re-acceptance and does not apply retroactively.*
