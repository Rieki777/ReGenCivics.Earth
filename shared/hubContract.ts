/**
 * The hub contract version: one integer per public surface a village reads.
 *
 * village-os reads the hub's public crowdpool procedures and, until this
 * existed, could not tell which version of their MEANING it was talking to.
 * The live case: before b835c28e (2026-09-05) `pledgedTotal` summed accepted
 * pledges only, so it was a floor; since then it sums accepted, fulfilled and
 * thanked. The village carried that difference as a hand-set constant, and a
 * fork pointed at an older hub would have shown a floor as a total with nothing
 * saying so.
 *
 * Ruled by Rye on 2026-09-14: "add a version number ... going forward this
 * will be helpful as both sides will be evolving rapidly over the next months."
 *
 * THE BUMP RULE. Raise a surface's integer whenever a change alters what a
 * field a village already reads MEANS. An added field needs no bump. A changed
 * meaning always does. The history lives in docs/CROWDPOOL_HUB_CONTRACT.md
 * section 10, and a test fails if the number here is not in that table.
 *
 * Version 3 (2026-09-24): on a role need marked `capacityUnit =
 * 'hours_per_week'`, quantityWanted / quantityClaimed / quantityDelivered
 * count hours a week, not people (shared/roleCapacity.ts).
 *
 * Version 4 (2026-09-25): needs gain neededFrom, neededUntil, acceptsGift,
 * acceptsLoan and workMode; a lendable thing is kind 'item' with acceptsLoan 1
 * and new needs never use kind 'loan'; getPartnerLinks returns only verified
 * rows plus example rows on example campaigns, each with a status; getById
 * gains progress (shared/campaignProgress.ts).
 *
 * A map rather than one number, so a later surface (the feedback relay, say)
 * can version itself without bumping crowdpool. Served by `meta.contract`.
 * A hub that predates this file is, by definition, version 1 of everything.
 */
export const HUB_CONTRACT = {
  crowdpool: 4,
} as const;

export type HubContract = { [K in keyof typeof HUB_CONTRACT]: number };
