/**
 * analytics.ts. Thin wrapper around window.umami for event tracking.
 * Only fires when Umami has been injected (i.e. after cookie consent).
 * All calls are fire-and-forget; failures are silently swallowed.
 */

type EventProperties = Record<string, string | number | boolean | undefined>;

function track(eventName: string, props?: EventProperties) {
  try {
    const umami = (window as any).umami;
    if (typeof umami?.track === "function") {
      umami.track(eventName, props ?? {});
    }
  } catch {
    // Silently ignore, analytics should never break the app
  }
}

// ── Conversion events ────────────────────────────────────────────
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

  /** User opened the SiteTour / AI guide */
  siteTourOpened: () => track("site_tour_opened"),

  /** User joined the Custom Land Game waitlist */
  customGameWaitlistJoined: () => track("custom_game_waitlist_joined"),

  /** Generic page-specific CTA click */
  ctaClick: (label: string, page?: string) =>
    track("cta_click", { label, page }),
};
