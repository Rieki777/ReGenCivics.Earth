# The Module Library: tiers, the domain rule, and the integration process

Prepared 2026-08-14. Verified against `origin/main` (1428603), the live vendor surfaces, and the
Saberra integration package. Companion to `SABERRA_INTEGRATION_REVIEW_2026-08-14.md`,
`MEMORY_MODULE_BUILD_PLAN_2026-08-14.md` and `LANE_A_MEMORY_FOUNDATION_2026-08-14.md`.

This is the checklist for vendor number seven, not just for the first two.

---

## Stop the presses on Orbit

`orbitdao.com` is a parked domain listed for sale on HugeDomains for $2,995. I fetched it: it
302s to `hugedomains.com/domain_profile.cfm?d=orbitdao.com`, titled "OrbitDao.com is for sale".

The product matching your description is **`orbitdao.io`**, "The CRM that runs itself". It is real
and its docs are good: a public REST API (`Authorization: Bearer orb_...`, workspace-scoped),
44 webhook events with `X-Orbit-Signature` HMAC-SHA256 over the raw body, explicit at-least-once
delivery, and per-tenant workspaces. API access starts at their third tier, $39/user/month.

But the vendor is anonymous. `orbitdao.io/about` returns "Hub not found". No company name, no
jurisdiction, no named human, no SLA, no DPA, no sub-processor list, and no reseller, partner or
white-label billing terms of any kind. Targeted searches for who builds it return nothing.

Also worth knowing: at least eight live products are called Orbit, and one of them, `orbit.love`,
was a community CRM that ceased operations in March 2023. The bare word is not an identifier. Any
registry entry carries the exact URL or it does not exist.

**Orbit is not listable at any tier today**, and that is the diligence stage doing its job on its
first run. Confirm the URL and produce a named human before anything else happens.

---

## The tiers

Your cut was by who built it. Nobody has ever asked who built something at the moment they need it.
They ask **who do I pay** and **who do I call**. So the tier is that pair, and `builtBy` becomes a
credit line rather than a badge. That collapses cleanly to three, because "vendor bills, we support"
is a shape nobody should ever sell: you would carry the support cost of a product whose revenue you
never see.

### Included

> Part of the platform. One bill, one number to call: ours.

Built by us, billed by us (it is in the platform price), supported by us end to end. Credential is
either none or the village's own upstream account when the village is the merchant of record (Stripe,
Resend). No pill in the catalog: Included is the absence of a badge, exactly as `core` is a badge and
everything else is silence today. All 18 current modules are this tier and need no migration. Maia
lists here, which is what makes the catalog read as a platform with a library rather than a wrapper
around two vendors.

### Connected

> You buy it from them. We wire it up. They answer for the service, we answer for the wiring.

Built and billed by the vendor, supported by the vendor for the service and by us for the connector.
The credential is a `SECRET_KEYS` entry the village holds and can see as source and last4. **That
visibility is the tier**: the village has its own account and can revoke it without asking us.

Catalog shows a `connected` pill and a muted line: "Built and supported by \<vendorLegalName\>. You
hold the account." The setup card carries `vendorUrl`, `supportUrl`, `statusUrl`, `termsUrl`, and any
manual vendor-side steps. Failure is a 503 whose body names them: "\<Vendor\> is not answering. Your
plan with them is the village's own. Reach them at \<supportUrl\>. Everything else keeps working."

**This is the default tier for third parties.**

### Managed

> One bill, from us. One number to call, ours. Somebody else builds it.

Built by the vendor, billed and first-line supported by us, with the vendor behind a private
escalation the village never sees. The credential is **platform-held and env-only, deliberately not
in `SECRET_KEYS`** — the exact posture of `PLATFORM_ASSISTANT_KEY`, which is read from env at call
time and never returned by the secrets route, not even masked, "since it is not the village's secret
to see". The village has no account with the vendor and cannot see the key. That is the mechanical
tell of Managed.

Setup card has **no credential field at all**: it shows an entitlement state ("Included in your plan"
/ "Not on your plan") and a contact link. First card in the product with nothing to type, and that is
correct. Failure never names the vendor: "This is on us. We know, and we are on it," plus what still
works. You sold the sentence "call us".

**The discriminator is the credential plane, not the label.** Included and Connected put the
credential where the village sees source and last4. Managed puts it in env, invisible to the fork
admin. That makes the tier mechanically checkable rather than decorative. And it inherits a risk
disclosure that is already shipped and already in house voice: `assistant-own-key` tells an admin
"This deployment is running the guide on a key the platform lends it. That key can be rotated at any
time, and when it is, your guide stops answering." Reuse that sentence per Managed listing.

The tier is a **label, never a gate**. `setModuleLifecycle` makes no network call, reads no secret
and checks no licence. The credential is the entitlement in every tier.

---

## Eight corrections to the tier model

1. **Customers do not respect tier boundaries.** You will take the first call every time, because the
   village bought the platform and the connector is yours. "They support it directly" is a promise
   about the fix, not about the phone. So **own triage in all three tiers and say so**: "we tell you
   whose problem it is, they fix theirs." That obligation is unmeetable without an incident log
   (build item 13); today an Anthropic outage leaves only a `console.error`. Without it, every
   Connected dispute resolves as "the platform is broken", because you are the only party with a face.
2. **Data protection does not tier, and this is the sharpest hole.** If member data flows through your
   product into a vendor, you are very likely controller or joint controller regardless of who
   invoices. Add a `dataClass` field **orthogonal** to tier: `none` / `village-content` /
   `member-pii`. One gate applies at every tier: nothing with `member-pii` goes live without a signed
   DPA, a documented hard-delete API, and a driver `forgetMember()` wired into `anonymizeMember` that
   **fails visibly** when it cannot confirm.
3. **The tier will change and today it cannot.** `shared/modules.ts` is a compile-time constant, so a
   tier change ships to every fork, and a village that enabled under Managed could wake up Connected
   with its support contract silently rewritten. Keep two facts: the registry tier is the **offer**;
   the tier a village is **on** is stamped into `module_settings.config` at enable time with a
   `module_events` row. That is the version-stamped acknowledgement pattern the exchange already uses
   for its legal card. A tier change becomes a re-acceptance.
4. **Managed is the highest-burden tier and must be capped by policy.** It is the only tier where a
   vendor's 3am outage is your 3am, for software you cannot patch, reproduce without them, or roll
   back. **Hard cap: two concurrent Managed listings, written down.** Entry price per listing: a named
   escalation human with a response commitment, a status page, a credit-back clause pointing at your
   own incident log, and a proven local reproduction path. Missing any one and it is Connected or it
   is not listed.
5. **In Connected you hold no off-switch in either direction.** The vendor can reprice, deprecate or
   die (see `orbit.love`, March 2023), and can cut a village off without telling you. And you cannot
   stop a village using a vendor that has become unsafe, because the credential is theirs. Fix: a
   registry-level `withdrawn` state on the **listing**, distinct from a village's module lifecycle,
   that blocks new enables and banners existing ones.
6. **The tiers say nothing about leaving, which is what you sell.** State an exit obligation in the
   same breath as each support promise. Included: the platform exports it. Connected: the village owns
   the vendor account and takes it with them; your obligation is that removing the module leaves the
   spine intact. **Managed: you owe a data return**, because the village never had the account and
   cannot get it themselves. That third one is a real liability and is invisible in the original
   framing.
7. **A vendor lapse must not reuse the 404.** `requireModule` answers 404 `{error:'module_disabled'}`
   for off, deliberately, to hide existence. Routing a lapsed paid entitlement through that gate tells
   a village its feature was deleted. Neither the tier nor the lifecycle enum can express "paid for,
   enabled, vendor not answering." Prerequisite to the first paid listing.
8. **Default to silence outward.** `/api/platform/info` and `/.well-known/village.json` publish module
   id and lifecycle at rank `members` or above, keyed to a permanent instanceId, and village.json is
   **signed**. If library entries are ordinary modules, every village permanently advertises which
   commercial services it buys, to peers and crawlers. Publish the tier **word** to members via the
   Game Mechanics payload that is already wired and rendering nothing. Publish nothing about vendors
   in the federated documents.

---

## The domain rule

> **A vendor is never a source of truth. A domain is, the platform owns it, and vendors are drivers
> behind it, at most one non-off driver per domain.**

Six clauses:

1. Every library domain has a platform-owned spine table carrying the join key, the consent record and
   the deletion state, however thin.
2. A vendor module is a **driver** against that spine, never the authority.
3. At most one driver per domain may be non-off, refused on the enable path.
4. A lapsed credential degrades vendor-only reads to 503 while the spine keeps answering. Never 404.
5. Export and anonymize enumerate the spine **plus** a registry of external stores that must be told.
6. Nothing a vendor holds is ever an input to the capability gate, the ledger, or a signed federation
   document.

**Where the guard goes.** The only conflict precedent in the codebase is `sellsToken`, which throws at
boot when two modules claim the same token. Right idea, wrong shape for a library: a catalog is
*supposed* to list Saberra and Orbit side by side in one domain, and a registry-level assertion would
make the second vendor's mere presence in `shared/modules.ts` unbootable for every fork, including
forks running neither. So the refusal goes in `setModuleLifecycle`'s enable path beside the existing
`missing` check, returning 409 in the same shape as the three refusals already there:

```
{ok: false, status: 409, domain: 'people', holder: 'saberra',
 error: '"Orbit" cannot be enabled: "Saberra" already holds the people domain. Switch it off first, or migrate the domain.'}
```

Boot follows `reconcileGraph`'s demote-and-log discipline instead: a hand-edited table with two
holders demotes the later one and logs at fatal volume. Loud, never bricking.

**One interface per domain, N drivers.** Never one interface per vendor. The existing conflict
primitive is domain-shaped; capabilities are domain-shaped, so vendor-per-interface forces a
capability per vendor and breaks the one-gate rule; vendor identity already has a home in the secrets
store; and `apiPrefixes` has zero runtime readers, so per-vendor route namespaces buy nothing.

The driver interface is five methods, **all mandatory**: `read(query)`, `write(op)`, `health()`,
`exportMember(userId)`, `forgetMember(userId)`. The last three are what make the published
constitution survivable. A driver that cannot implement all five is not listable at any tier.

### Split `crm` into `people` and `leads`. This is the highest-leverage decision here.

`crm` as one domain is too coarse to arbitrate, and the Saberra/Orbit collision is an artefact of
calling one domain by a marketing word.

- **`people`** — anyone the village holds data about who is or was a member. Platform source of truth.
  **No vendor driver in v1.** Saberra keeps Profiles and Interactions as a *mirror*.
- **`leads`** — external inbound inquiries and partner organisations who have never had an account.
  Vendor-drivable. Orbit gets this and only this, if it ever clears diligence.

Neither owns `people`. The overlap dissolves without a treaty.

### What must change in Saberra's matrix

| Row | Today | Becomes |
|---|---|---|
| 04:28 wider people universe | SoT: Saberra | **SoT: platform spine, mirror: Saberra** |
| 04:30 decisions | SoT: Saberra | **SoT: platform, extractor: Saberra** |
| 04:36 knowledge / canon | SoT: Saberra | **SoT: platform, may propose: Saberra** |
| 04:29 meetings, 04:32 tasks, 04:37 Q&A | SoT: Saberra | vendor-held **with conditions** |
| 04:35 risks, tensions, commitments, retrospectives | SoT: Saberra | **unchanged, the only surviving exclusive claim** |
| — | absent | **new row: deletion. SoT: platform.** |

The people row is non-negotiable and it is not about Orbit. It is about `GET /api/profile/export`,
whose own comment says everything must mean everything, and `anonymizeMember`, an exhaustive local
sweep that signals nothing outward. A `people` spine table with the join key, a consent row and a
deletion state must exist **before** any driver in that domain is enabled.

Decisions and canon are load-bearing: the platform already ships the decision primitive
(`forum_threads.kind='decision'` with `{status, outcome, decidedBy, decidedAt}`), the decision record
(`village_record.source='decision'` with an indexed idempotency key), and `currency_prices.decision_ref`
citing the thread that authorised a price. And `village_brief`'s own migration header forbids the
alternative in terms: "Fork-local, always. Nothing here is ever published, relayed, federated, or
crawled." Canon owned by a vendor makes a Notion workspace the authority for what a village is for.

**The one thing that must not be conceded** is tasks. `call_tasks` enforces the evidence rule in DDL:
`quote text NOT NULL`, `timestamp_ms int NOT NULL`, commented "no quote, no timestamp, no row."
Saberra's Tasks database has an assignee and a status and no schema-level evidence constraint.
Delegating tasks without carrying that constraint into the driver relaxes an invariant the platform
enforces in DDL, invisibly. Driver rule: a task arriving without a verbatim quote and a timestamp is
**dropped**, not stored, and the drop is counted.

**Why the matrix is the wrong instrument for a library.** Saberra's own mitigation for its top risk is
social ("the matrix is the contract... only if it is actually adopted rather than admired") and leans
on "your side already refuses external writes by construction since there is no public write API."
Both halves are properties of a two-party arrangement. A library with N vendors has no counterparty to
negotiate with, and the moment you ship one inbound webhook receiver that structural guarantee is gone
for every vendor that gets the same treatment. The domain rule replaces the treaty: enforced by a 409
rather than agreed by two parties.

---

## The integration process

Eleven stages. Every listing walks all of them.

**Stage 0. Intake.** Entry: someone can name the capability in one sentence without the vendor's
marketing words. Artifact: a one-page listing brief naming the capability, the domain it claims, who
the customer is, and the tier sought. Owner: Rye. **Exit gate:** the capability maps to exactly one
domain, and either the spine exists or someone has costed building it. A vendor claiming two domains
is two listings or it is refused.

**Stage 1. Vendor diligence.** This is the stage that kills bad listings cheaply, and it just proved
itself on its first run. Artifacts: legal name, jurisdiction, a named human with an email, the exact
product URL (never the bare name), terms URL, status page, published pricing including whether API
access costs extra, and whether partner or reseller billing exists at all. Owner: Rye. **Exit gate: a
named legal entity and a named human.** No named counterparty means no Connected (there is nobody to
answer the phone you promised) and no Managed (you would be indemnifying an anonymous party). There is
no workaround.

**Stage 2. Domain assignment and collision check.** Artifacts: the domain this listing `provides`, the
current holder if any, a written statement of what the spine owns versus what the driver caches, and
the enumerated **write surface**. Owner: platform eng, ratified by Rye. **Exit gate:** no incumbent, or
an explicit migration plan off the incumbent. Hard refusal list: no driver writes to a core module's
tables (quests, gratitude, progression, profiles cannot be disabled, and at least one vendor sells a
competing quest product), no driver reaches the ledger, no driver produces a capability answer, no
driver flips a module lifecycle.

**Stage 3. Data and legal.** Artifacts: `dataClass`; a signed DPA if `member-pii`; documented
retention, deletion SLA and sub-processors; the vendor's hard-delete endpoint, named; and a written
answer to "what does export return for this domain". Owner: Rye with counsel. **Exit gate:** for
`member-pii`, DPA plus documented hard-delete plus a committed `forgetMember()`. **This gate applies at
every tier and does not soften because the vendor bills.**

**Stage 4. Technical proving.** Artifacts: a sandbox tenant; **one real captured payload per operation,
saved as a fixture** (docs are not evidence; every claim about a vendor's JSON is unproven until a live
call returns it); a driver spike implementing all five methods; a written list of manual vendor-side
setup steps per fork; and measured rate limits, pagination, error codes, versioning. Owner: platform
eng. **Exit gate:** all five methods demonstrated live, `forgetMember` verified by re-reading and
getting nothing back, and the manual-setup list either empty or costed per fork. A vendor whose webhook
registration is UI-only means a human logs in per village forever. Discover that here, not from an
angry founder.

**Stage 5. Tier and commercials.** Artifacts: the tier and its reason; the credential plane that
follows; revenue share or margin; support response commitments in both directions; escalation contact;
and withdrawal terms both ways, written now while everyone is friendly. Owner: Rye. **Exit gate:** for
Managed, a free slot against the cap of two plus all four Managed entry conditions. Default to
Connected; Managed is a deliberate spend, not a fallback.

**Stage 5a. The billing bar** (from the single-biller decision). To be listed as platform-billed, the
vendor offers a **flat wholesale rate per village per month, a stated included volume, and a hard cap
that actually stops requests** with a designed behaviour at the ceiling. Vendors who will not are still
listed, just Connected. This is self-selecting in the right direction: never carry uncapped
usage-scaled cost inside a fixed price you market as "one number, no surprises."

**Stage 6. Build.** Checklist: registry entry with the new `tier` / `vendor` / `dataClass` / `provides`
fields; the driver; the secret slots (a webhook-driven vendor needs **two** kinds, an outbound bearer
and an inbound signing secret the server reads back); `defaultConfig` + `validateConfig`; launch
requirements with `appliesWhenModule`; an Integrations card; `docs/modules/<id>.md` plus its
`MODULE_DOCS` entry **with a provenance marker**, because `sectionCitation` presents every section as
"sourced and shipped with the platform"; a `FORK_RUNBOOK.md` line per new env var, same session; and
`scripts/enable-all-modules.mjs` updated or explicitly excluded (it hard-exits 3 on any non-core module
it does not know, and is already stale for messaging and events). **Exit gate:** all gates green plus a
new one asserting the driver implements all five interface methods.

**Stage 7. Pilot in one village.** Enabled at `preview`. A dated window, a rollback plan, and **the
exit drill run, not planned**: export a real member, anonymize a real test member, confirm the vendor
forgot them. Owner: Rye plus that village's founder, named. **Exit gate:** the exit drill passed and
the incident log shows real calls with real latencies. A pilot that never exercised deletion has not
been piloted.

**Stage 8. List.** Catalog copy live, tier pill and support line rendering, Integrations card live,
docs contract on Maia's shelf, and a recorded decision on whether the tier word is published to
members. **Exit gate: a second person can enable this module in a fresh fork using only the shipped UI
and the runbook, with no help.** If setup needs a conversation, it is not listed, it is bespoke.

**Stage 9. Operate.** Continuous: a vendor probe on the scheduled-job pattern the tools link checker
already proves (per-row `last_checked_at` / `last_check_status` plus **one digest, never a per-item
ping**); `lastSuccessAt` / `lastFailureAt` on the secret status; the incident log; and a quarterly
review that the vendor still exists, terms have not changed, the DPA is current and the tier is still
honest. **Recurring exit gate:** the review either re-ratifies or moves to stage 10. A listing nobody
has looked at in a year is a liability wearing a badge.

**Stage 10. Withdraw and delist.** The stage nobody designs. Three triggers: the vendor withdraws, you
withdraw, or the vendor dies without telling anyone. In order: (1) mark the **listing** `withdrawn`,
blocking new enables and bannering existing ones, changing nothing currently serving; (2) 90-day notice
to every village running it, naming the date and what still works after; (3) run the export drill for
every affected village and hand each one its data, **which in Managed is your obligation** because the
village never held the account; (4) run `forgetMember` for every member whose data crossed and record
the confirmations; (5) reclaim the spine, which keeps answering degraded, never 404; (6) only then
force the lifecycle off, guarded by an `openStateCheck`-shaped refusal so unmigrated vendor-side
records block the switch the way open loans block disabling the library; (7) leave the registry entry
in place with `withdrawn` set rather than deleting it, so an old `module_settings` row resolves to a
known withdrawn listing instead of an orphan; (8) update docs, `MODULE_DOCS`, the runbook and the
enable-all script. **Vendor-death variant:** steps 3 and 4 are unavailable, so the notice must say so
plainly. Which is precisely why stage 3's documented hard-delete and stage 4's proven `forgetMember`
are entry gates and not nice-to-haves.

---

## Platform build for the library

**Needed for the first vendor:**

1. **[S]** Listing metadata on `ModuleDef`: `tier`, `vendor?{legalName,url,supportUrl,statusUrl,termsUrl,secretKeys[]}`,
   `dataClass`, `provides?`. Safe to add: every reader is a named property access and nothing iterates
   ModuleDef keys. Keep them as **data, not prose** — `check-voice.mjs` scans `shared/` and reads string
   literals, so a vendor name in `description` is gate-visible copy while `vendor.legalName` is a value.
2. **[S]** Project it into the three hand-written payloads that will otherwise silently omit it:
   `/api/modules`, `/api/admin/modules`, and the command-centre module block. **Deliberately do not** add
   tier or vendor to `/api/platform/info` or `/.well-known/village.json`; record that as a decision in
   the commit message.
3. **[S]** Render it: a third pill beside Core and legal review on the admin module card, and a fourth
   muted line carrying who supports it. Same support line on the command-centre health row, because that
   is the screen a founder opens when something is dark.
4. **[M]** **The 503 vendor-lapse path.** A `requireVendor(id)` middleware mounted after `requireModule`,
   answering 503 with `{error, module, tier, responsibleParty, supportAt, stillWorks}`. Prerequisite to
   the first paid listing. About six client pages already render `d.error` verbatim, so a server-authored
   sentence can reach a human today.
5. **[M]** **Dynamic secret slots.** `SECRET_KEYS` is a frozen union with a hardcoded env-fallback map, so
   adding a vendor credential today means shipping platform code to every fork. Derive it: base keys union
   the registry's `vendor.secretKeys`, keeping write-only, masked-read and admin-beats-env intact. Two
   notes: the store **can** already hold a server-readable inbound signing secret, so amend the module
   header from "write-only" to "write-only to the browser, read by the server" or the next reader builds a
   second mechanism. And a Managed credential must not be added here at all.
6. **[S-M]** **Integrations cards from the registry, which also fixes a live bug.** The CARDS array is a
   hardcoded four-entry list covering 4 of 7 secrets. Three (`riverside_webhook_secret`,
   `governance_hub_secret`, `basescan_api_key`) are settable over the API with no field in the UI, to the
   point that shipped copy tells an admin to set the Riverside secret under Integrations where no such card
   exists.
7. **[S per listing]** Launch requirements per vendor module. The existing machinery already carries
   `{why, severity, fixAt, fixLabel, appliesWhenModule, runbookAnchor}`, already gates on
   `effectiveLifecycle` so a demoted module withdraws its own requirements, and already fails visibly when
   a check is unwired. Reuse it rather than inventing a vendor registry.
8. **[S]** Docs contract plus `MODULE_DOCS` entry with a provenance marker. Also update
   `docs/ARCHITECTURE.md`'s add-a-module checklist, which mentions neither docs nor tier nor vendor, and
   correct `docs/modules/module-framework.md`, which quotes a stale `ModuleDef` and points at a client
   registry file that does not exist.
9. **[XS]** Decide whether vendor modules belong in `enable-all-modules.mjs` at all, and add an explicit
   exclusion with the reason.

**Before the second vendor in any domain:** `provides` plus the 409 collision refusal.

**Before any member data crosses:** **[L]** outbound deletion and export hooks. A driver registry with
`forgetMember` / `exportMember` called from `anonymizeMember` and the profile export, with a **visible**
failure when a driver cannot confirm. This single item is what keeps the published constitution true. It
is large because the failure mode has to be designed: a member cannot be told "deleted" when a vendor did
not answer.

**Before any webhook-driven vendor:** **[M-L]** generic inbound webhook receipt as platform
infrastructure, not per-module code: raw-body capture before parsing, per-endpoint HMAC, constant-time
compare, event-level idempotency, delivery logging. `server/lib/payments.ts` already does exactly this for
Stripe and is the thing to generalise. Needed for Orbit, **not** needed for Saberra, which has no outbound
events. That asymmetry is why Saberra can ship first.

**By the second listing:** an `integration_calls` incident log generalising `payments_log` (which already
has outcome, latency, detail and event dedupe, for exactly one vendor); vendor probes with
`lastSuccessAt` (today `SecretStatus.setAt` is when the key was *typed*, never when it last worked, so a
revoked key reads Connected forever); and a `module_outage` notification with a case in `emailCadenceFor`,
which defaults unknown types to off, which is why the tools dead-link digest never leaves the app.

**By vendor three:** a schema-driven config editor, a member-facing structured error contract, per-module
support intake, a vendor-name gate (URL-matching, never a bare substring: `shared/modules.ts:122` already
ships "the roles that orbit them" as correct copy and would fail a naive rule), and publishing the tier
word to members.

---

## Saberra and Orbit are not the same shape

**Saberra: Managed, scoped to one domain.** You have a partnership offer, you are already a live tenant,
and you can reach a named human. The credential is platform-held and env-only. Ship the
`assistant-own-key`-style disclosure with it so the village is told in the product that it runs on a
lent key.

**List one domain in v1: `signals`** — risks, tensions, commitments, retrospectives. It is the only
exclusive Saberra claim with genuinely no counterpart table anywhere in `drizzle/`, so it needs no spine
migration, no source-of-truth renegotiation, no identity join-key policy, and no conflict with Orbit. It
exercises the entire adapter path (registry entry, driver, env-only credential, launch requirement, docs
contract, 503 lapse path, `forgetMember`) at the lowest possible blast radius. Everything else waits
behind the matrix rewrite.

Saberra is cheap because it is **write-mostly and fire-and-forget**: capture, extract, store, and the
platform never depends on a read to serve a page. No outbound events means no generic webhook receiver
and no event idempotency. Nothing on the platform side is keyed to a Saberra object id, so no identity
mapping table. Its stage 1 is only partially done: being a tenant and knowing the people is not
diligence, and legal entity, jurisdiction and terms URL are still owed in writing.

**Orbit: not listable, and if it ever clears diligence it is Connected, not Managed.** The village holds
its own `orb_` key, API access is a real $39/user/month purchase they make, and the key should be visible
to them as source and last4. Managed would mean reselling a product you cannot patch, from a vendor with
no legal record, into villages whose member data it touches. That is exactly the trade the Managed cap
exists to refuse. It also has no partner or reseller billing terms at all, so there is no vendor-side
machinery to bill through even if you wanted to.

**Domain: `leads` only, never `people`.** Orbit's core objects are contacts, companies, deals, notes and
pipeline stages, and it also ingests meetings and writes to Notion, all of which Saberra claims too. The
split dissolves it: Orbit gets external inbound inquiries and partner organisations who never had an
account, never receives member PII, and never receives members pushed outward, because a copy in Orbit
would survive `anonymizeMember` and be invisible to the profile export.

**Orbit is strictly more expensive than Saberra**, item by item: it is webhook-first (44 events, HMAC,
explicitly at-least-once, so it needs the generic receiver and idempotency on id plus event); it needs a
durable identity mapping table; it needs a conflict policy, because both sides mutate the same record; it
needs paginated reads and a backfill path, because webhooks get missed; and **webhook registration is
UI-only with no programmatic path**, so per-fork provisioning is a permanent manual human step.

**Two hard refusals in its write surface.** Orbit sells Quests and gamification and fires quest webhooks.
Quests is one of the four core modules that cannot be disabled, backed by its own tables with reward
payout through the token ledger. A third-party vendor selling the platform's own core loop is a
governance question, not a data question: the connector must be explicitly forbidden from writing quests,
or a village ends up with two quest systems and two reward paths. And no Orbit object may ever reach the
ledger or the capability gate.

**The thing that argues against Orbit entirely:** ReGen Civics already runs a fuller CRM than Orbit would
replace, in a different repo and deployment, with `investor_inquiries` on a six-state pipeline that maps
almost one-to-one onto Orbit's deals and pipeline stages, polymorphic contact notes and tags, an
organisations registry, applications with scoring, plus email logs and scheduled emails. Adopting Orbit
wholesale duplicates all of it and creates a fourth writer. The valuable slice is narrow: **push new
inbound inquiries out so a human can work them in a better UI, and receive status changes back.** One
entity, two directions. Not "a CRM module."

**In one line:** Saberra is a *relationship* with a named counterparty and no read dependency, so it can
be Managed and can ship first on a domain with no counterpart table. Orbit is a *category* with an
anonymous vendor and a bidirectional read dependency, so at best it is Connected, on a narrower domain
than the one it markets, after three build items Saberra does not need, and only once someone can be
named.

---

## Decisions, each with a default

1. **Is `orbitdao.io` the product?** *Default: assume yes for planning, freeze all Orbit work at stage 1
   until confirmed in writing with a named human.* Never write `orbitdao.com` into a registry entry, a doc,
   or a config default.
2. **Is `crm` one domain or two?** *Default: two.* `people` (platform SoT, no vendor driver in v1) and
   `leads` (vendor-drivable). The single highest-leverage decision in this document.
3. **How many Managed listings at once?** *Default: two, hard.* Saberra takes one. The second stays empty
   until the first has run a full quarter with a clean incident log.
4. **Are you the data controller when a vendor bills the village directly?** *Default: assume yes, joint
   controller at minimum, for every tier where member data crosses.* Require the DPA at stage 3 regardless
   of who invoices. Get this checked by counsel before the first `member-pii` listing.
5. **Is the tier federated?** *Default: no.* Keep vendor identity out of `platform/info` and
   `village.json`. Publish the tier word to members via Game Mechanics.
6. **When a tier changes, does a village keep the terms it enabled under?** *Default: yes.* Stamp tier plus
   terms version into `module_settings.config` at enable time with a `module_events` row.
7. **Do you adopt Saberra's matrix or renegotiate?** *Default: renegotiate, before Phase 2.* Phases 0 and 1
   violate nothing and can proceed now: they are pull, push-in, and read-only-outbound. Phase 2 introduces
   the first inbound writer and is the moment the treaty becomes load-bearing.
8. **Does ReGen Civics' existing CRM enter the library?** *Default: no, not in v1.* Separate repo and
   deployment; pulling it in makes the first two listings a three-way ownership problem. Revisit at vendor
   three, once the spine and deletion hooks exist.
9. **Is Managed billing a resale or an agency arrangement?** *Default: agency, you bill on the vendor's
   behalf, until counsel says otherwise*, because resale likely makes you owe the vendor's product
   warranty. For Orbit this has no answer today, which is itself the answer.
10. **Revenue split, to start the conversation.** Connected: 0%, the vendor bills and you owe only the
    connector. Managed: a margin on list price with a floor covering one support hour per village per
    month, because that is the real cost driver and it scales with villages rather than with usage. Get
    Saberra's number before building, not after the pilot.
