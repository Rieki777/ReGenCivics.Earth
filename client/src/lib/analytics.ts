/**
 * analytics.ts — first-party event tracking.
 *
 * No third-party scripts and no cookies. Events are sent fire-and-forget to
 * our own backend (`POST /api/analytics/collect`) where they are stored and
 * surfaced in the admin section. Player data stays on our infrastructure,
 * which matches the project's privacy posture.
 *
 * The existing `analytics.*` helper API is preserved exactly, so every call
 * site across the app keeps working; only the transport changed (it used to
 * call `window.umami`, which was never injected, so events went nowhere).
 *
 * The backend route + table + admin view are built by Claude Code (see the
 * handoff doc). Until that endpoint exists this module degrades silently: the
 * POST simply 404s and is ignored. Nothing here ever throws into the UI.
 */

import { getCsrfToken } from "@/hooks/useCsrfToken";

type EventProperties = Record<string, string | number | boolean | undefined>;

const ENDPOINT = "/api/analytics/collect";
const SESSION_KEY = "rc-analytics-session";

/** Anonymous session id, rotated every 30 days. No PII. */
function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; t: number };
      if (Date.now() - parsed.t < 30 * 24 * 60 * 60 * 1000) return parsed.id;
    }
  } catch { /* ignore */ }
  const id =
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, t: Date.now() }));
  } catch { /* ignore */ }
  return id;
}

/** Respect Do Not Track and Global Privacy Control. */
function optedOut(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  const dnt = nav.doNotTrack ?? win.doNotTrack;
  return dnt === "1" || dnt === "yes" || nav.globalPrivacyControl === true;
}

/**
 * Core transport. Fire-and-forget; never awaits, never throws.
 */
export function track(eventName: string, props?: EventProperties): void {
  if (typeof window === "undefined") return;
  if (optedOut()) return;

  const payload = {
    event: eventName,
    props: props ?? {},
    path: window.location.pathname,
    ref: document.referrer || undefined,
    sid: sessionId(),
    ts: Date.now(),
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const csrf = getCsrfToken();
    if (csrf) headers["x-csrf-token"] = csrf;

    // keepalive lets the request survive a navigation (CTA click -> new page).
    void fetch(ENDPOINT, {
      method: "POST",
      headers,
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => { /* endpoint not live yet, or offline: ignore */ });
  } catch { /* analytics must never break the UI */ }
}

/** Page view, called from the router. */
export function trackPageView(): void {
  track("page_view");
}

// ── Conversion events ────────────────────────────────────────────
// Stable helper API. Call sites across the app depend on these names.
export const analytics = {
  /** User submitted the land project / team / investor application form */
  applicationSubmitted: (type: "land_project" | "team" | "investor") =>
    track("application_submitted", { type }),

  /** User completed a Welcome Aboard quest */
  questCompleted: (questId: string, questTitle: string) =>
    track("quest_completed", { quest_id: questId, quest_title: questTitle }),

  /** User signed up for the newsletter */
  newsletterSignup: () => track("newsletter_signup"),

  /** User verified as investor (investor localStorage flag set) */
  investorVerified: () => track("investor_verified"),

  /** User claimed / linked an org to their profile */
  orgClaimed: (orgName: string) => track("org_claimed", { org_name: orgName }),

  /** User submitted a new community forum post */
  forumPostCreated: (categorySlug?: string) =>
    track("forum_post_created", { category: categorySlug }),

  /** User began filling out the Apply form (first draft save) */
  applyStarted: () => track("apply_started"),

  /** User advanced to a specific step in the Apply multi-step form */
  applyStepAdvanced: (step: number) => track(`apply_step_${step}`),

  /** User submitted the Apply page (land project incubator application) */
  applyFormSubmitted: () => track("apply_form_submitted"),

  /** User submitted the Letter of Intent (investor pledge form) */
  loiSubmitted: () => track("loi_submitted"),

  /** User submitted the full investor inquiry form */
  investorFormSubmitted: () => track("investor_form_submitted"),

  /** User registered / created a player profile */
  playerRegistered: (role?: string) => track("player_registered", { role }),

  /** User started an investment / crowd pooling campaign */
  campaignCreated: () => track("campaign_created"),

  /** User saved a contribution calculation */
  calculationSaved: () => track("calculation_saved"),

  /** User shared a quest on social media */
  questShared: (questId: string, platform: string) =>
    track("quest_shared", { quest_id: questId, platform }),

  /** Generic share action (Web Share or copy link) */
  shareClicked: (where: string, method: "web_share" | "copy" | string) =>
    track("share_clicked", { where, method }),

  /** User opened the SiteTour / AI guide */
  siteTourOpened: () => track("site_tour_opened"),

  /** User joined the Custom Land Game waitlist */
  customGameWaitlistJoined: () => track("custom_game_waitlist_joined"),

  /** Generic page-specific CTA click */
  ctaClick: (label: string, page?: string) =>
    track("cta_click", { label, page }),
};
