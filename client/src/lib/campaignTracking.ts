/**
 * Campaign page visits, for /campaign/:id/analytics (campaigns.trackView).
 * Moved from the old campaign page when the project page became the
 * campaign page (build spec 2026-09-25, section 8.8), so the analytics keep
 * their numbers. The visitor id lives in this browser only; storage can be
 * blocked (a private window), so every read and write is guarded.
 */

export type DeviceType = "desktop" | "mobile" | "tablet";

export function getDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

const VISITOR_KEY = "regen_visitor_id";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** The trackView input for one visit to a campaign, from this page's address. */
export function campaignViewInput(campaignId: number, search: string = typeof window !== "undefined" ? window.location.search : "") {
  const params = new URLSearchParams(search);
  const visitorId = getVisitorId();
  return {
    campaignId,
    visitorId: visitorId || undefined,
    referrer: (typeof document !== "undefined" && document.referrer) || undefined,
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    deviceType: getDeviceType(),
  };
}
