/**
 * Rules a need must meet before it is listed. Pure, shared by the campaign
 * wizard (client/src/pages/CreateCampaign.tsx), db.createCampaign and the
 * admin review dialog.
 *
 * Ruling 2026-09-27: an in-kind need cannot be listed at 0. A need at 0 adds
 * nothing to the in-kind ask, so while it is open the confirmed value could
 * reach the ask with a need still unfilled. With every need above 0,
 * "confirmed value reaches 100% of the in-kind ask" and "every need filled"
 * always agree. Existing needs at 0 are left as they are: the progress helper
 * keeps the in-kind half short of landing until they fill
 * (shared/campaignProgress.ts, "the stricter reading").
 *
 * Words for these rules live in shared/crowdpoolCopy.ts (ZERO_VALUE).
 */

/**
 * A need is listed only with a value above 0 (ruling 2026-09-27), so
 * "confirmed value reaches the in-kind ask" and "every need filled" agree.
 *
 * Tested at the cent: campaign_items.estimatedValue is DECIMAL(18,2), and
 * MySQL and MariaDB round 0.004 to 0.00 with a note, not an error, even in
 * strict mode. So anything under half a cent would pass a plain "> 0" and
 * be stored as a need at 0 (review 2026-09-28).
 */
export function isListableValue(v: unknown): boolean {
  if (v == null || v === "" || typeof v === "boolean") return false;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && Math.round(n * 100) > 0;
}

/**
 * The most needs campaigns.updateDraft takes in one save. The steward's Edit
 * campaign sheet stops offering "Add a need" at this many and says so.
 */
export const MAX_DRAFT_NEEDS = 60;

/**
 * Length caps on a need's text, matching the campaign_items columns (names
 * and region varchar(255), videoUrl varchar(500), equipmentCategory
 * varchar(100), resourceUnit varchar(50)). Descriptions are TEXT; the cap
 * keeps them well inside it. campaigns.create and campaigns.updateDraft both
 * check them (CAMPAIGN_ITEM_INPUT).
 */
export const NEED_TEXT_MAX = { name: 255, videoUrl: 500, category: 100, unit: 50, description: 10_000 } as const;

/** The cap on a campaign's "what this campaign is for" text in campaigns.updateDraft (a TEXT column). */
export const CAMPAIGN_DESCRIPTION_MAX = 20_000;

/** The indexes of the needs whose value is not listable, in order. */
export function zeroValueNeedIndexes(items: Array<{ estimatedValue: unknown }>): number[] {
  const out: number[] = [];
  items.forEach((item, i) => {
    if (!isListableValue(item?.estimatedValue)) out.push(i);
  });
  return out;
}
