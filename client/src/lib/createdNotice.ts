/**
 * The "campaign created" confirmation, carried across the wizard's full page
 * load to the project page.
 *
 * The wizard sends a new campaign's steward to the project page with
 * window.location, a full load, so a toast raised before it was lost with
 * the old page. The wizard now leaves the new campaign's id in
 * sessionStorage and StewardTools shows the notice once, for that campaign.
 * Storage can be blocked or empty (a private window): then there is simply
 * no notice.
 */
const KEY = "crowdpool:campaign-created";

export function rememberCreatedCampaign(campaignId: number): void {
  try {
    window.sessionStorage.setItem(KEY, String(campaignId));
  } catch {
    /* storage blocked: no notice */
  }
}

/** True once, for the campaign the wizard just made; clears the note. */
export function takeCreatedCampaign(campaignId: number): boolean {
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored !== String(campaignId)) return false;
    window.sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
