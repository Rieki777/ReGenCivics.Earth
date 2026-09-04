# The crowdpool hub contract

**What this is:** regen-civics is the hub. `village-os` reads five of its public tRPC
procedures to render a bridge page inside a village's living map. That contract is
live today and, until this file existed, was written down only on the village side.
This is the hub's half.

**Date:** 2026-09-04. Agreed directly with the village-os economics session, which
measured its half from its own code rather than from its documentation.

---

## 1. Who owns what

**regen-civics owns the fund, the pooling, the index and the campaign.** Every pledge
is created here. Every money column lives here. Every steward decision happens here.

**village-os owns what a village sees.** Its crowdpool module is a read-only bridge,
in its own words "a bridge page, never a second ledger". It proxies, caches and
renders. Measured five ways on its side: `server/lib/crowdpool.ts` has no import
statements at all, it appears in none of the 38 sites that can write the village
ledger, no economics file there names a campaign or a pledge or a need, no mint rule
has a trigger a campaign could attach to, and the only crowdpool setting is a hub URL.

**A pledge issues no Gratitude, mints no Credits and moves no Voice.** The two
economies do not touch. A reader of either document will assume they do, so both
documents now say they do not.

---

## 2. The stable set

These five procedures are contract. They are `publicProcedure`, no auth, and they do
not change without a message to the village-os session first.

| Procedure | Input | Used for |
|---|---|---|
| `campaigns.list` | `{}` | resolving a slug to an id |
| `campaigns.getById` | `{id}` | the campaign record, with items, images, coverImage and contributorsCount embedded |
| `campaigns.getItems` | `{campaignId}` | the needs |
| `campaigns.getActivity` | `{campaignId}` | the public Pool Ledger |
| `campaigns.getPartnerLinks` | `{campaignId}` | partner funders and their cached numbers |

**Stable fields.** On a need: `id`, `name`, `kind`, `category`, `capitalType`,
`description`, `estimatedValue`, `quantityWanted`, `quantityClaimed`,
`quantityDelivered`, `needDeadline`, `priorityPinned`, `groupClaimable`. On a
campaign: the `items` / `images` / `coverImage` / `contributorsCount` embedding, plus
`startedAt` and `durationDays`, from which the village derives `endsAt` because the
hub stores no end column.

**The nine capital types and the wanted/claimed/delivered meter are hub-owned and are
not changing.** Both are load-bearing here too: `player_contributions.capitalType`
feeds the Living Tree.

**Internal, and free to change without notice:** anything behind a `protectedProcedure`,
anything PII-bearing (`getContributionsForOwner`), and the `crowdPoolingProjects` and
`crowdPoolingProposals` routers, which are legacy and slated to retire. The village
side reads none of these.

**One asymmetry worth knowing:** `campaigns.list` is read only to resolve a slug to an
id. If `getById` ever accepts a slug, that call disappears and four procedures are
load-bearing instead of five.

---

## 3. What breaks on the other side when this side changes

**Read this before renaming any field above.**

A rename here does not break the village build, does not fail its tests, and does not
error at runtime. The bridge normalises optimistically, so a missing field becomes an
absent value.

**On most surfaces that means an empty panel:** the living map draws a campaign with
no needs, or a meter at zero, and nothing anywhere says why. A village looks
abandoned. Nobody is told; somebody eventually notices.

**On the activity feed it is worse, and this is the sharpest consequence.** The verb
normaliser ends `return t || "pledged"` (`village-os server/lib/crowdpool.ts:229`).
A renamed or missing verb field does not empty the feed, it **falls through to a
default label**. A delivery or a thank-you is then shown to a member as a pledge. An
empty panel is a visible absence that gets reported. A confidently wrong word does
not.

So: an unannounced rename here shows a village a quietly false story about itself.

---

## 4. Two live hub defects that reach the village

Both are recorded in `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` and both are ours to
fix.

**The village's gold ring collapses when a pledge is delivered.** `percentPledged` on
the village side is `pledgedTotal / totalValue`
(`village-os server/lib/crowdpool.ts:330`). The hub's `pledgedTotal` counts only
`status = 'accepted'` (`server/db.ts:1200-1203`), so confirming a delivery removes
that value from the number the ring divides. Measured: $10,000 delivered then $5,000
accepted reports $5,000. The village ring shrinks at the moment a village succeeds.

**The village is NOT exposed to the hub's double-count.** The hub stores a financial
pledge in both `pledgedTotal` and `pledgedFinancial`, and three hub surfaces add the
two together and show double. The village reads them as separate fields and divides
using `pledgedTotal` alone, so its ring is correct where the hub's own gallery is not.
Worth stating so nobody "fixes" the village side to match the hub.

---

## 5. What a pledge actually does on the hub

For the village document, in the hub's own terms.

`campaigns.submitContribution` is a `publicProcedure` on purpose: a person with no
account can pledge against a need. It writes a `campaign_contributions` row at status
`pending`.

- **accepted** reserves `quantityClaimed`. It is a promise. It counts for nothing.
- **fulfilled** is the payoff, on delivery: `quantityDelivered` moves, a score event
  fires, a `verified` `player_contributions` row is written carrying the need's
  `capitalType`, and the contribution becomes eligible for Hypha formalisation.
- **thanked** closes the loop with a required note from the steward.

The village reading of accepted as the gold ring and delivered as the walls is
correct.

---

## 6. The money half, and why it does not cross this boundary

Rye specified the money mechanic on 2026-09-04. Cash does not go to a project. It goes
to ReGen Civics and buys a share of all thirteen projects at once, which is the index
fund. The contributor receives 80% of their contribution back as tokens to place
across the cohort, movable until a project closes, and 20% goes to a community
treasury. Projects give ReGen Civics a minimum 10% non-dilutive stake, after the
community says yes. None of it is built yet.

**The boundary sentence, agreed with the village-os session and carried in both
documents:** crowdpool money is raised by the hub into a fund; the village side reads
campaign progress and never sees, holds, or moves any of it.

The in-kind half stays per-project, and that is the half the bridge shows.

If placement ever needs a village-side read, most likely a per-project earmark total,
the field shape goes to the village-os session **before** it ships, not after.

---

## 7. A flag from the village-os session, recorded

Their economics session raised this and it belongs in the record:

> A contributor getting most of their money back as tokens to place across projects,
> movable until a project closes, is a signalling instrument that looks a great deal
> like a vote. If placement is non-binding it is fine; the day it influences an
> allocation it is a franchise, and it will want the same treatment as anything else
> carrying weight: say whose weight it is, snapshot it when it counts, and refuse to
> be moved after the moment it decides.

Rye has ruled placement non-binding and movable until close. The moment that changes,
this paragraph becomes a requirement.

---

## 8. Housekeeping

The count of procedures was written as "four" in three places while five were listed
directly beneath: `village-os docs/modules/crowdpool.md`, `village-os
server/lib/crowdpool.ts:5`, and nearly in its economics document. Five is correct.
The village side is fixing its copies. Recorded here because the failure mode, prose
disagreeing with the table under it, has now happened three times in one day across
these two repositories.
