import { bigint, char, date, decimal, index, int, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, tinyint, double, unique, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** Unique human-readable handle (3-40 chars, lowercase, [a-z0-9-]). Used for @mentions, gratitude, /profile/{handle}. */
  handle: varchar("handle", { length: 40 }).unique(),
  /** When the user last changed their handle (for rate limiting handle changes). */
  handleLastChangedAt: timestamp("handleLastChangedAt"),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  /** Bioregion slugs the user is registered in. Used for governance scoping. */
  bioregions: json("bioregions"),
  /** Voice weight on Fund-track decisions. Drives Loomio stance weighting. */
  rcVoiceWeight: int("rcVoiceWeight").default(1).notNull(),
  /** Voice weight on Game-track decisions. */
  rgVoiceWeight: int("rgVoiceWeight").default(1).notNull(),
  /** Whether this user opted in to be assigned as a storyteller for high-stakes decisions. */
  availableAsStoryteller: tinyint("availableAsStoryteller").default(0).notNull(),
  /** Deprecated: was used for Privy auth integration. Column kept for data preservation. */
  privyDid: varchar("privyDid", { length: 120 }),
  /** Base chain wallet address for receiving Hypha proposal payouts. */
  baseWalletAddress: varchar("baseWalletAddress", { length: 60 }),
  /** Deprecated: was used for Privy session binding. Column kept for data preservation. */
  privyAccessTokenHash: varchar("privyAccessTokenHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Project Applications table
 * Stores land project applications for ReGen Civics seasons
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Application Status
  status: mysqlEnum("status", [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "active",
    "inactive",
    "rejected",
    "changes_requested"
  ]).default("draft").notNull(),
  
  // Basic Project Information
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectType: mysqlEnum("projectType", [
    "early_stage",
    "mature"
  ]).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  latitude: double("latitude"),  // GPS latitude for map placement
  longitude: double("longitude"), // GPS longitude for map placement
  country: varchar("country", { length: 100 }), // Country name for filtering
  
  // Project Details
  vision: text("vision").notNull(),
  landStatus: mysqlEnum("landStatus", [
    "owned",
    "leased",
    "committed",
    "seeking"
  ]).notNull(),
  teamSize: int("teamSize").notNull(),
  teamDescription: text("teamDescription").notNull(),
  
  // Project Size & Community Metrics
  projectSizeHectares: int("projectSizeHectares"), // Size in hectares
  currentPeopleCount: int("currentPeopleCount"), // Current number of people
  currentHouseholdCount: int("currentHouseholdCount"), // Current number of households
  intendedPeopleCount: int("intendedPeopleCount"), // Intended full community size (people)
  intendedHouseholdCount: int("intendedHouseholdCount"), // Intended full community size (households)
  mixedUse: text("mixedUse"), // JSON array: ["residential", "commercial", "industrial"]
  meetingFrequency: mysqlEnum("meetingFrequency", [
    "everyday",
    "2_3x_week",
    "weekly",
    "2_3x_month",
    "monthly",
    "2_3x_year",
    "yearly_plus"
  ]),
  dietaryPatterns: text("dietaryPatterns"), // JSON array: ["vegan","vegetarian","plant_based","pescatarian","omnivore","animal_based","keto","no_shared_diets"]

  // Alignment & Values
  regenerativePractices: text("regenerativePractices").notNull(),
  governanceApproach: text("governanceApproach").notNull(),
  communityEngagement: text("communityEngagement").notNull(),
  
  // Commitment & Resources
  timeCommitment: text("timeCommitment").notNull(),
  currentFunding: text("currentFunding"),
  fundingNeeds: text("fundingNeeds").notNull(),
  
  // Additional Information
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  videoUrl: varchar("videoUrl", { length: 512 }),
  documentsUrl: text("documentsUrl"), // JSON array of S3 URLs

  // ReGen Ship quest referral attribution (Free Passage Quest action #3).
  // Set from /apply?ref=<handle>. When this application reaches a shortlisted
  // status, the matching ship_quest_completions row auto-verifies. Nullable so
  // ordinary applications are unaffected.
  shipReferralHandle: varchar("shipReferralHandle", { length: 40 }),
  shipReferralUserId: int("shipReferralUserId"),
  additionalNotes: text("additionalNotes"),

  // Conversation record from the Gardener (the /apply Conversational Companion).
  // JSON array of { role: "user" | "assistant", content } turns, saved with the
  // draft so reviewers can read how the applicant talked about their project.
  // MEDIUMTEXT in the database (migration 0188); nullable, typed apps unaffected.
  companionTranscript: text("companionTranscript"),
  
  // Metadata
  submittedAt: timestamp("submittedAt"),
  // Incubator season cohort (1, 2, ...). Stamped at submit time from
  // shared/incubatorSeason.ts; migration 0219 backfilled existing rows.
  // The admin season filter reads this tag, never dates (the Season 1
  // batch was seeded with submittedAt later than real Season 2 apps).
  season: int("season").default(2),
  adminSeeded: tinyint("adminSeeded").default(0).notNull(),
  stewardUserId: int("stewardUserId"),

  // Land project status progression
  projectStatus: mysqlEnum("projectStatus", ["applied", "accepted", "active", "established", "anchor"]).default("applied"),
  projectStatusUpdatedAt: timestamp("projectStatusUpdatedAt"),
  endorsementCount: int("endorsementCount").default(0),
  contributionCount: int("contributionCount").default(0),
  fundedCampaignCount: int("fundedCampaignCount").default(0),
  seasonsActive: int("seasonsActive").default(0),
  // Land Project Steward criterion (spec section 3.3, migration 0135).
  // seasonsCompleted increments at season-end review; gameLaunchedAt
  // set when the project's community game ships. Both must be truthy
  // for steward_earned to fire on the land_project path.
  seasonsCompleted: int("seasonsCompleted").default(0).notNull(),
  gameLaunchedAt: timestamp("gameLaunchedAt"),

  // Optional needs/offers capture (Phase B2): mirrored to project_needs /
  // player_offers on submit, tagged source "incubator_application".
  needsText: text("needsText"),
  offersText: text("offersText"),

  // The ReGen impact schema (Phase C1): validated against shared/impact.ts
  // impactDataSchema on every write; admin-edited, publicly summarized only
  // through publicImpactSummary().
  impactData: json("impact_data"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdIdx: index("applications_userId_idx").on(t.userId),
  statusIdx: index("applications_status_idx").on(t.status),
}));

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Application Reviews table
 * Stores reviews and feedback for project applications
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  
  // Review Content
  decision: mysqlEnum("decision", [
    "approve",
    "reject",
    "request_changes",
    "pending"
  ]).default("pending").notNull(),
  comments: text("comments").notNull(),
  internalNotes: text("internalNotes"), // Only visible to admins
  
  // Review Criteria Scores (1-5 scale)
  alignmentScore: int("alignmentScore"), // Values alignment
  readinessScore: int("readinessScore"), // Project readiness
  impactScore: int("impactScore"), // Potential impact
  teamScore: int("teamScore"), // Team strength
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Investor Inquiries table
 * Stores investor journey form submissions
 */
export const investorInquiries = mysqlTable("investor_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Optional - can be submitted without login
  
  // Status
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "in_discussion",
    "committed",
    "declined",
    "archived"
  ]).default("new").notNull(),
  
  // Contact Information
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  organization: varchar("organization", { length: 255 }),
  role: varchar("role", { length: 255 }),
  location: varchar("location", { length: 255 }),
  
  // Investment Profile (all optional)
  investorType: mysqlEnum("investorType", [
    "individual",
    "family_office",
    "foundation",
    "impact_fund",
    "institutional",
    "other"
  ]),
  investmentRange: mysqlEnum("investmentRange", [
    "under_250k",
    "250k_1m",
    "1m_5m",
    "5m_10m",
    "over_10m",
    // Legacy values for backward compatibility
    "under_10k",
    "10k_50k",
    "50k_100k",
    "100k_500k",
    "500k_1m",
    "over_1m"
  ]),
  investmentTimeline: mysqlEnum("investmentTimeline", [
    "immediate",
    "3_months",
    "6_months",
    "1_year",
    "exploring"
  ]),
  
  // Investment Interests (optional)
  primaryInterest: mysqlEnum("primaryInterest", [
    "land_projects",
    "alliance_fund",
    "both"
  ]),
  geographicPreference: text("geographicPreference"),
  sectorInterests: text("sectorInterests"), // JSON array
  
  // Background & Motivation
  investmentExperience: text("investmentExperience"),
  motivations: text("motivations"),
  impactGoals: text("impactGoals"),
  questionsForTeam: text("questionsForTeam"),
  
  // How They Found Us
  referralSource: varchar("referralSource", { length: 255 }),
  
  // Additional
  documentsUrl: text("documentsUrl"), // JSON array of S3 URLs
  additionalNotes: text("additionalNotes"),
  
  // Preferences
  preferredContact: mysqlEnum("preferredContact", [
    "email",
    "phone",
    "video_call"
  ]).default("email").notNull(),
  newsletterOptIn: int("newsletterOptIn").default(0).notNull(),
  needsText: text("needsText"),
  offersText: text("offersText"),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InvestorInquiry = typeof investorInquiries.$inferSelect;
export type InsertInvestorInquiry = typeof investorInquiries.$inferInsert;


/**
 * General Inquiries table
 * Catch-all routing form for all 7 pathways
 */
export const generalInquiries = mysqlTable("general_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Optional - can be submitted without login
  
  // Status
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "in_progress",
    "completed",
    "archived"
  ]).default("new").notNull(),
  
  // Routing Path
  pathType: mysqlEnum("pathType", [
    "land_partner",
    "create_with_regens",
    "alliance",
    "finance",
    "live",
    "role",
    "something_else"
  ]).notNull(),
  
  // Contact Information (common to all paths)
  email: varchar("email", { length: 320 }).notNull(),
  fullName: varchar("fullName", { length: 255 }),
  
  // Path 1: Land Partner specific fields
  projectUrl: varchar("projectUrl", { length: 512 }),
  projectInspiration: text("projectInspiration"),
  projectProgress: text("projectProgress"), // JSON array of checkboxes
  
  // Path 2: Create with ReGens specific fields
  allianceOrganizations: text("allianceOrganizations"), // JSON array of selected orgs
  otherOrganization: varchar("otherOrganization", { length: 255 }),
  
  // Path 3: Alliance specific fields
  organizationUrl: varchar("organizationUrl", { length: 512 }),
  organizationRole: text("organizationRole"), // JSON array of role tags: Coordination, Bioregional Econ, etc.
  organizationScope: varchar("organizationScope", { length: 50 }), // "local" or "global"
  organizationLatitude: double("organizationLatitude"),
  organizationLongitude: double("organizationLongitude"),
  organizationCountry: varchar("organizationCountry", { length: 100 }),
  partnershipDescription: text("partnershipDescription"),
  
  // Path 5: Live specific fields
  landProjects: text("landProjects"), // JSON array of selected projects
  otherProject: varchar("otherProject", { length: 255 }),
  
  // Path 6: Role specific fields
  roleArchetypes: text("roleArchetypes"), // JSON array: Builder, Connector, etc.
  roleInterest: text("roleInterest"),
  whyIdeal: text("whyIdeal"), // Why applicant is ideal for the role
  seasonDeliverables: text("seasonDeliverables"), // What they intend to deliver next season
  videoPitchUrl: varchar("videoPitchUrl", { length: 512 }), // 3-minute video pitch link
  cvWebsite: varchar("cvWebsite", { length: 512 }), // CV/Portfolio/Website link
  
  // Path 7: Something else specific fields
  uniqueContribution: text("uniqueContribution"),
  
  // New enhanced fields
  capitalTypes: text("capitalTypes"), // JSON array of 9 forms of capital
  allianceSupportCategories: text("allianceSupportCategories"), // JSON array of support categories
  otherAllianceSupport: varchar("otherAllianceSupport", { length: 255 }),
  allianceSupportDescription: text("allianceSupportDescription"),
  valueContribution: text("valueContribution"),
  whyIdealFit: text("whyIdealFit"),
  organizationalCapital: text("organizationalCapital"), // JSON array of org capital types
  
  // General fields
  additionalNotes: text("additionalNotes"),
  referralSource: varchar("referralSource", { length: 255 }),
  newsletterOptIn: int("newsletterOptIn").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneralInquiry = typeof generalInquiries.$inferSelect;
export type InsertGeneralInquiry = typeof generalInquiries.$inferInsert;

/**
 * Reviewer Emails table
 * Stores email addresses for reviewers who receive automated notifications
 */
export const reviewerEmails = mysqlTable("reviewer_emails", {
  id: int("id").autoincrement().primaryKey(),
  
  // Email and name
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  
  // Notification preferences - which types of submissions to notify about
  notifyApplications: int("notifyApplications").default(1).notNull(),
  notifyInvestors: int("notifyInvestors").default(1).notNull(),
  notifyInquiries: int("notifyInquiries").default(1).notNull(),
  
  // Specific inquiry types to notify about (JSON array of pathTypes)
  inquiryTypes: text("inquiryTypes"), // e.g., ["alliance", "land_partner", "role"]
  
  // Status
  isActive: int("isActive").default(1).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewerEmail = typeof reviewerEmails.$inferSelect;
export type InsertReviewerEmail = typeof reviewerEmails.$inferInsert;


/**
 * Newsletter Subscribers table
 * Stores email addresses for newsletter signups from all forms
 */
export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  
  // Email
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  
  // Source tracking - where did they sign up from
  source: mysqlEnum("source", [
    "homepage",
    "investor_form",
    "connect_form",
    "apply_form",
    "footer",
    "exit_intent",
    "other"
  ]).default("other").notNull(),
  
  // Status
  isActive: int("isActive").default(1).notNull(),

  // Email preferences
  notifyRecordings: tinyint("notifyRecordings").default(0).notNull(),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;


/**
 * Video Suggestions table
 * Stores community suggestions for How-To videos with voting
 */
export const videoSuggestions = mysqlTable("video_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  
  // Suggestion content
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "how_to_play",
    "how_to_participate",
    "how_to_invest",
    "how_to_apply",
    "how_to_contribute",
    "other"
  ]).default("other").notNull(),
  
  // Submitter info
  submitterEmail: varchar("submitterEmail", { length: 320 }),
  submitterName: varchar("submitterName", { length: 255 }),
  
  // Voting
  voteCount: int("voteCount").default(0).notNull(),
  voterEmails: text("voterEmails"), // JSON array of emails who voted
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "approved",
    "in_production",
    "completed",
    "rejected"
  ]).default("pending").notNull(),
  
  // If completed, link to the video
  completedVideoUrl: varchar("completedVideoUrl", { length: 512 }),
  completedBlogSlug: varchar("completedBlogSlug", { length: 255 }),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoSuggestion = typeof videoSuggestions.$inferSelect;
export type InsertVideoSuggestion = typeof videoSuggestions.$inferInsert;

/**
 * Player Profiles table
 * Stores game player profiles with Base blockchain account linking
 * 
 * Blockchain Integration Notes:
 * - baseAccountName: The user's Base blockchain account address (e.g., 0xaAaF...354e)
 * - hyphaProfileUrl: Link to their Hypha profile for identity verification
 * - walletAddress: Full Ethereum/Base wallet address for token verification
 * 
 * Future Token Verification:
 * - RVOICE and RGEN token balances will be verified on-chain
 * - lastTokenSync tracks when balances were last fetched from blockchain
 * - isVerified indicates successful on-chain identity verification
 */
export const playerProfiles = mysqlTable("player_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Optional - linked to auth user
  
  // Player info
  displayName: varchar("displayName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  bannerUrl: varchar("bannerUrl", { length: 512 }),

  // Base blockchain account linking
  // This is the primary blockchain identifier from Hypha (e.g., 0xaAaF...354e)
  baseAccountName: varchar("baseAccountName", { length: 255 }), // Base blockchain account address
  hyphaProfileUrl: varchar("hyphaProfileUrl", { length: 512 }), // Hypha profile for identity verification
  walletAddress: varchar("walletAddress", { length: 255 }), // Full Ethereum/Base wallet address
  
  // Blockchain verification status
  blockchainVerifiedAt: timestamp("blockchainVerifiedAt"), // When account was verified on-chain
  verificationTxHash: varchar("verificationTxHash", { length: 66 }), // Transaction hash of verification
  
  // Game stats (non-blockchain elements)
  badges: text("badges"), // JSON array of badge IDs
  questsCompleted: text("questsCompleted"), // JSON array of quest IDs
  totalContributionValue: int("totalContributionValue").default(0).notNull(),
  
  // Token tracking.
  // Public columns are cached from Base blockchain reads. Private columns
  // are our internal ledger (tokens earned via SEEDS claims, gratitude,
  // quest completions, etc) that have not yet been claimed on Hypha and
  // moved on-chain. Profile UI shows public + private as the total.
  rvoiceBalance: int("rvoiceBalance").default(0).notNull(),        // RGVoice public (Base)
  rgenBalance: int("rgenBalance").default(0).notNull(),            // $ReGen public (Base)
  rcvoicePublic: int("rcvoicePublic").default(0).notNull(),        // RCVoice public (Base)
  rcivicsPublic: int("rcivicsPublic").default(0).notNull(),        // $RCivics public (Base)
  rgvoicePrivate: int("rgvoicePrivate").default(0).notNull(),      // RGVoice private ledger
  regenPrivate: int("regenPrivate").default(0).notNull(),          // $ReGen private ledger
  rcvoicePrivate: int("rcvoicePrivate").default(0).notNull(),      // RCVoice private ledger
  rcivicsPrivate: int("rcivicsPrivate").default(0).notNull(),      // $RCivics private ledger
  lastTokenSync: timestamp("lastTokenSync"), // Last blockchain sync timestamp
  
  // Status
  isVerified: int("isVerified").default(0).notNull(), // Verified via Hypha/blockchain
  isActive: int("isActive").default(1).notNull(),

  // Email digest preferences
  emailDigestFrequency: mysqlEnum("emailDigestFrequency", ["never", "weekly", "monthly", "seasonal", "newsletter"]).default("monthly").notNull(),
  // User notification preferences (JSON: { communityUpdates, questAnnouncements })
  notificationPrefs: json("notificationPrefs"),

  // Consent-based player memory opt-in (Phase D2, improvement 13). Default
  // OFF; the Guide writes and reads journey facts only when this is 1.
  companionMemoryOptIn: tinyint("companionMemoryOptIn").default(0).notNull(),

  // Forum profile fields folded in from userProfiles (0169, Phase 2B). The
  // forum reads these from playerProfiles now; userProfiles keeps its
  // onboarding-only fields and is kept in symmetric sync via upsertUserProfile.
  website: varchar("website", { length: 500 }),
  forumLocation: varchar("forumLocation", { length: 255 }),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en"),
  reputation: int("reputation").default(0).notNull(),
  onboardingComplete: tinyint("onboardingComplete").default(0).notNull(),
  forumLastActiveAt: timestamp("forumLastActiveAt"),

  // Profile layer (Phase 3)
  collaborationStatus: text("collaborationStatus"), // null | "seeking_collaborators" | "looking_to_join"
  dreamingOf: text("dreamingOf"),                  // Open text: what are you dreaming of building?
  bioregionId: int("bioregionId"),                 // References bioregions(id)

  // Location (Phase 4 — coordinate-based with privacy controls)
  locationLat: double("locationLat"),
  locationLng: double("locationLng"),
  locationPrecision: mysqlEnum("locationPrecision", ["exact", "city", "region", "hidden"]).default("region"),
  locationLabel: varchar("locationLabel", { length: 255 }),
  locationNomadic: tinyint("locationNomadic").default(0).notNull(),
  locationEarth: tinyint("locationEarth").default(0).notNull(),

  // Lunar streak tracking
  lunarStreak: int("lunarStreak").default(0).notNull(),
  lastQuestCompletedAt: timestamp("lastQuestCompletedAt"),
  currentLunarCycleStart: timestamp("currentLunarCycleStart"),

  // Status line
  currentlyWorkingOn: varchar("currentlyWorkingOn", { length: 200 }),

  // Citizenship tier system
  citizenshipTier: mysqlEnum("citizenshipTier", ["explorer", "co_creator", "steward", "sage"]).default("explorer"),
  citizenshipTierUpdatedAt: timestamp("citizenshipTierUpdatedAt"),
  graceStartedAt: timestamp("graceStartedAt"),

  // Contribution scoring
  contributionScore: double("contributionScore").default(0),
  contributionScoreRaw: int("contributionScoreRaw").default(0),
  currentTier: varchar("currentTier", { length: 50 }).default("Seedling"),
  trustScore: double("trustScore").default(1.0),
  trustScoreRaw: int("trustScoreRaw").default(0).notNull(),
  trustLastCalculatedAt: timestamp("trustLastCalculatedAt"),
  scoreLastCalculatedAt: timestamp("scoreLastCalculatedAt"),
  seasonsCompleted: int("seasonsCompleted").default(0),

  // Capital scores cache (9 percentile values 0-100, refreshed nightly)
  capitalScoresJson: json("capitalScoresJson"),
  capitalScoresUpdatedAt: timestamp("capitalScoresUpdatedAt"),

  // GitHub identity (linked during bounty contribution flow)
  githubHandle: varchar("githubHandle", { length: 255 }),
  githubId: int("githubId"),
  githubLinkedAt: timestamp("githubLinkedAt"),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Used by leaderboard ordering and voice-weight lookups.
  contributionScoreIdx: index("player_profiles_contributionScore_idx").on(t.contributionScore),
}));

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = typeof playerProfiles.$inferInsert;

/**
 * user_token_ledger — audit trail for every credit or debit against a
 * player's private (off-chain) token balance. Each row represents a
 * single movement sourced from a game event (seeds_claim,
 * gratitude_received, quest_completion, etc) or a debit from claiming
 * the tokens on-chain via Hypha (claimed_to_base).
 */
export const userTokenLedger = mysqlTable("user_token_ledger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenType: mysqlEnum("tokenType", ["rcvoice", "rgvoice", "rcivics", "regen"]).notNull(),
  // Signed amount. Positive = credit to private ledger, negative = debit
  // (e.g., when tokens are claimed on Hypha and move on-chain).
  amount: int("amount").notNull(),
  // Source tag. Known values: 'seeds_claim', 'gratitude_received',
  // 'quest_completion', 'harvest', 'grant', 'expense', 'adjustment',
  // 'claimed_to_base', 'manual', 'migrated_from_*'. Left as varchar so
  // new sources can be added without an ALTER.
  source: varchar("source", { length: 64 }).notNull(),
  // Optional foreign key into the source row (seedsClaims.id, etc).
  sourceId: int("sourceId"),
  // Tenant scope this credit belongs to. Null means platform-wide.
  // Carried over from the superseded governanceTokenLedger so tenant-
  // scoped governance (bioregion / land project) keeps working.
  tenantId: int("tenantId"),
  // Set when this ledger entry has been claimed on Hypha and moved
  // on-chain. Null = still private, claimable when the per-token
  // threshold is met.
  claimedAt: timestamp("claimedAt"),
  // Set after a Hypha bridge run that carried this entry on-chain.
  hyphaBridgeId: int("hyphaBridgeId"),
  // Free-form sourceRef string (e.g., "gratitude:123", "quest:abc") that
  // the old ledger used to cross-reference external systems. Kept so
  // the Hypha bridge prefill and admin tools can keep using it.
  sourceRef: varchar("sourceRef", { length: 120 }),
  description: text("description"),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("user_token_ledger_userId_idx").on(table.userId),
  index("user_token_ledger_tokenType_idx").on(table.tokenType),
  index("user_token_ledger_source_idx").on(table.source),
  index("user_token_ledger_tenantId_idx").on(table.tenantId),
  index("user_token_ledger_claimedAt_idx").on(table.claimedAt),
  // Claim/webhook/refund lookups scan by (sourceRef, source).
  index("user_token_ledger_sourceRef_source_idx").on(table.sourceRef, table.source),
  // Private-balance cache recompute sums by (userId, tokenType).
  index("user_token_ledger_user_token_idx").on(table.userId, table.tokenType),
  // UNIQUE: makes duplicate credits (bounty payouts, claim refunds) physically
  // impossible even if application logic races. Added in migration 0145; also
  // declared here so a fresh env built from schema.ts keeps the guard.
  uniqueIndex("user_token_ledger_idempotencyKey_idx").on(table.idempotencyKey),
]));

export type UserTokenLedgerEntry = typeof userTokenLedger.$inferSelect;
export type InsertUserTokenLedgerEntry = typeof userTokenLedger.$inferInsert;

/**
 * Player Paths — per-user-per-path tier progression state.
 *
 * One row per (user, path). Created when the player declares a path
 * (auto on relevant action, or via explicit Add a Path button in
 * Profile). Tracks earned + claimed timestamps for Co-Creator and
 * Steward tiers. Sage is cross-path and lives in tier_events only.
 *
 * See QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md sections 3, 6.
 */
export const playerPaths = mysqlTable("player_paths", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  path: mysqlEnum("path", ["investor", "land_project", "ally", "player"]).notNull(),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
  /** Set by tier detector when Co-Creator criteria for this path are first met. */
  coCreatorEarnedAt: timestamp("coCreatorEarnedAt"),
  /** Set by tier detector when Steward criteria for this path are first met. */
  stewardEarnedAt: timestamp("stewardEarnedAt"),
  /** Set when the 77 RGVoice bonus has been claimed on Hypha (on-chain redemption confirmed). */
  coCreatorBonusClaimedAt: timestamp("coCreatorBonusClaimedAt"),
  /** Set when the 144 RGVoice bonus has been claimed on Hypha. */
  stewardBonusClaimedAt: timestamp("stewardBonusClaimedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
}, (table) => ([
  unique("player_paths_user_path_uniq").on(table.userId, table.path),
  index("player_paths_userId_idx").on(table.userId),
  index("player_paths_path_idx").on(table.path),
]));

export type PlayerPath = typeof playerPaths.$inferSelect;
export type InsertPlayerPath = typeof playerPaths.$inferInsert;

/**
 * Tier Events — audit log of tier-progression events.
 *
 * Used for:
 *   - Detector idempotency: detector checks for existing rows of the
 *     matching (userId, eventType, path) before crediting bonuses.
 *   - Profile timeline: render tier-earned history.
 *   - Reconciliation: bonus_claimed events reference the original
 *     earned event via details.originalEventId.
 *
 * Sage events have null path (cross-path). Bonus-claimed events
 * reference the path of the original earned event in their details.
 */
export const tierEvents = mysqlTable("tier_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", [
    "co_creator_earned",
    "steward_earned",
    "sage_earned",
    "bonus_claimed",
  ]).notNull(),
  path: mysqlEnum("path", ["investor", "land_project", "ally", "player"]),
  /** RGVoice bonus credited to private ledger: 77, 144, or 233. */
  amountCredited: int("amountCredited"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  /** Free-form context: { originalEventId, ledgerEntryId, criterionDetail, ... } */
  details: json("details"),
}, (table) => ([
  index("tier_events_userId_idx").on(table.userId),
  index("tier_events_eventType_idx").on(table.eventType),
  index("tier_events_path_idx").on(table.path),
  index("tier_events_occurredAt_idx").on(table.occurredAt),
]));

export type TierEvent = typeof tierEvents.$inferSelect;
export type InsertTierEvent = typeof tierEvents.$inferInsert;

/**
 * Crowd Pooling Projects table
 * Stores land projects that are actively crowd pooling resources
 */
export const crowdPoolingProjects = mysqlTable("crowd_pooling_projects", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId"), // Optional link to applications table
  
  // Project info
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectDescription: text("projectDescription"),
  location: varchar("location", { length: 255 }),
  projectImageUrl: varchar("projectImageUrl", { length: 512 }),
  projectUrl: varchar("projectUrl", { length: 512 }),
  
  // Crowd pooling details
  targetCurrency: varchar("targetCurrency", { length: 10 }).default("USD").notNull(), // USD, EUR, GBP, etc.
  targetAmount: int("targetAmount").notNull(), // Target funding amount
  currentAmount: int("currentAmount").default(0).notNull(), // Current pooled amount
  contributorCount: int("contributorCount").default(0).notNull(), // Number of contributors
  
  // Timeline
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  
  // Status
  status: mysqlEnum("status", [
    "upcoming",
    "active",
    "completed",
    "paused"
  ]).default("upcoming").notNull(),
  isVisible: int("isVisible").default(1).notNull(), // Show on public page
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrowdPoolingProject = typeof crowdPoolingProjects.$inferSelect;
export type InsertCrowdPoolingProject = typeof crowdPoolingProjects.$inferInsert;

/**
 * Crowd Pooling Proposals table
 * Stores proposals submitted by contributors to projects
 */
export const crowdPoolingProposals = mysqlTable("crowd_pooling_proposals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // Reference to crowd_pooling_projects
  userId: int("userId"), // Optional - can submit without login
  
  // Contributor info
  contributorName: varchar("contributorName", { length: 255 }).notNull(),
  contributorEmail: varchar("contributorEmail", { length: 320 }).notNull(),
  
  // Proposal data (JSON from the Crowd Pooling Tool)
  proposalData: text("proposalData").notNull(), // JSON with all contribution details
  
  // Financial summary
  totalContribution: int("totalContribution").default(0).notNull(), // Total value in target currency
  financialContribution: int("financialContribution").default(0).notNull(), // Cash/financial only
  futureValueContribution: int("futureValueContribution").default(0).notNull(), // Future value/roles
  
  // Status
  status: mysqlEnum("status", [
    "pending",      // Submitted, awaiting review
    "accepted",     // Accepted by project
    "rejected",     // Rejected by project
    "withdrawn"     // Withdrawn by contributor
  ]).default("pending").notNull(),
  
  // Notes
  contributorNotes: text("contributorNotes"), // Notes from contributor
  reviewNotes: text("reviewNotes"), // Notes from project reviewer
  
  // Metadata
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrowdPoolingProposal = typeof crowdPoolingProposals.$inferSelect;
export type InsertCrowdPoolingProposal = typeof crowdPoolingProposals.$inferInsert;

// Email tracking for analytics
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").primaryKey().autoincrement(),
  recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  template: varchar("template", { length: 100 }),
  inquiryType: varchar("inquiryType", { length: 50 }), // project, investor, alliance, etc.
  inquiryId: int("inquiryId"), // Reference to the inquiry
  status: mysqlEnum("status", ["sent", "delivered", "bounced", "failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  bounceReason: text("bounceReason"),
  // Resend message id, stamped after send so the delivery webhook can match
  // the exact row instead of guessing by recipient.
  resendEmailId: varchar("resendEmailId", { length: 255 }),
}, (table) => [
  index("email_logs_resendEmailId_idx").on(table.resendEmailId),
]);

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;


/**
 * Contact Notes table
 * Internal admin notes per contact (investor, inquiry, application)
 */
export const contactNotes = mysqlTable("contact_notes", {
  id: int("id").primaryKey().autoincrement(),
  contactType: varchar("contactType", { length: 50 }).notNull(), // investor | inquiry | application
  contactId: int("contactId").notNull(),
  note: text("note").notNull(),
  authorName: varchar("authorName", { length: 255 }).default("Admin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactNote = typeof contactNotes.$inferSelect;
export type InsertContactNote = typeof contactNotes.$inferInsert;

/**
 * Contact Tags table
 * Freeform labels per contact (investor, inquiry, application)
 */
export const contactTags = mysqlTable("contact_tags", {
  id: int("id").primaryKey().autoincrement(),
  contactType: varchar("contactType", { length: 50 }).notNull(),
  contactId: int("contactId").notNull(),
  tag: varchar("tag", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactTag = typeof contactTags.$inferSelect;
export type InsertContactTag = typeof contactTags.$inferInsert;

/**
 * Scheduled Emails table
 * Stores emails scheduled to be sent at a future time
 */
export const scheduledEmails = mysqlTable("scheduled_emails", {
  id: int("id").primaryKey().autoincrement(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  inquiryType: varchar("inquiryType", { length: 50 }).default("general"),
  scheduledFor: timestamp("scheduledFor").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "cancelled", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type InsertScheduledEmail = typeof scheduledEmails.$inferInsert;

/**
 * Saved Contributions table
 * Stores user's saved contribution forms for reuse across projects
 */
export const savedContributions = mysqlTable("saved_contributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Form metadata
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name for this saved form
  isDefault: boolean("isDefault").default(false).notNull(), // Whether this is the user's default form
  
  // Project context (optional - can be generic)
  projectName: varchar("projectName", { length: 255 }),
  targetAmount: int("targetAmount"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Contributor info
  contributorName: varchar("contributorName", { length: 255 }),
  contributorEmail: varchar("contributorEmail", { length: 320 }),
  
  // Contributions data (JSON)
  immediateContributions: text("immediateContributions"), // JSON array of immediate contributions
  futureContributions: text("futureContributions"), // JSON array of future value contributions
  
  // Totals (cached for quick display)
  totalImmediateValue: int("totalImmediateValue").default(0),
  totalFutureValue: int("totalFutureValue").default(0),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedContribution = typeof savedContributions.$inferSelect;
export type InsertSavedContribution = typeof savedContributions.$inferInsert;

/**
 * Player Contributions table
 * Structured log of contributions a player has made, categorised by the 8 forms of capital.
 * Each row is one logged contribution entry on a player's profile.
 */
export const playerContributions = mysqlTable("player_contributions", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(), // FK → player_profiles.id
  userId: int("userId").notNull(),       // Denormalised for fast per-user queries

  // What kind of capital was contributed
  capitalType: mysqlEnum("capitalType", [
    "financial",
    "social",
    "cultural",
    "living",
    "intellectual",
    "experiential",
    "material",
    "spiritual",
    "health",
  ]).notNull(),

  // What was contributed
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  // Estimated USD value (player self-reported, optional)
  estimatedValue: int("estimatedValue"),

  // Which project / org received the contribution (optional free-text)
  projectName: varchar("projectName", { length: 255 }),

  // Link to evidence / proof (optional URL)
  evidenceUrl: varchar("evidenceUrl", { length: 512 }),

  // Verification status (admin can verify self-reported entries)
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).default("pending").notNull(),
  verifiedAt: timestamp("verifiedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerContribution = typeof playerContributions.$inferSelect;
export type InsertPlayerContribution = typeof playerContributions.$inferInsert;

/**
 * Campaigns table
 * Stores crowd pooling campaigns created by projects
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Creator of the campaign
  
  // Campaign Status
  status: mysqlEnum("status", [
    "draft",
    "pending_review",
    "active",
    "funded",
    "completed",
    "cancelled",
    "rejected"
  ]).default("draft").notNull(),
  
  // Campaign Duration
  durationDays: int("durationDays").default(90).notNull(), // 1-365 days
  startedAt: timestamp("startedAt"), // When admin approves and campaign goes live
  
  // Basic Campaign Information
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  
  // Link to application
  applicationId: int("applicationId"), // Optional link to applications table
  
  // Financial Target
  financialTarget: int("financialTarget").default(0).notNull(), // How much money they actually need
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Project Details (from application)
  vision: text("vision"),
  landStatus: varchar("landStatus", { length: 50 }),
  landSize: varchar("landSize", { length: 100 }),
  currentPhase: varchar("currentPhase", { length: 255 }),
  timeline: varchar("timeline", { length: 255 }),
  legalStructure: varchar("legalStructure", { length: 255 }),
  governanceModel: text("governanceModel"),
  membershipModel: text("membershipModel"),
  housingPlans: text("housingPlans"),
  foodSystems: text("foodSystems"),
  waterSystems: text("waterSystems"),
  energySystems: text("energySystems"),
  educationPrograms: text("educationPrograms"),
  communityEngagement: text("communityEngagement"),
  impactMetrics: text("impactMetrics"),
  challenges: text("challenges"),
  teamSize: int("teamSize"),
  teamDescription: text("teamDescription"),
  regenerativePractices: text("regenerativePractices"),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  videoUrl: varchar("videoUrl", { length: 512 }),
  projectImageUrl: varchar("projectImageUrl", { length: 512 }),
  daoLink: varchar("daoLink", { length: 512 }),
  
  // Progress Tracking
  totalValue: int("totalValue").default(0).notNull(), // Total value of all needs
  landValue: int("landValue").default(0).notNull(),
  equipmentValue: int("equipmentValue").default(0).notNull(),
  rolesValue: int("rolesValue").default(0).notNull(),
  resourcesValue: int("resourcesValue").default(0).notNull(),
  
  // Contribution tracking (how much has been pledged)
  pledgedTotal: int("pledgedTotal").default(0).notNull(),
  pledgedLand: int("pledgedLand").default(0).notNull(),
  pledgedEquipment: int("pledgedEquipment").default(0).notNull(),
  pledgedRoles: int("pledgedRoles").default(0).notNull(),
  pledgedResources: int("pledgedResources").default(0).notNull(),
  pledgedFinancial: int("pledgedFinancial").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  completedAt: timestamp("completedAt"),
  adminNotes: text("adminNotes"), // Admin review notes
  reviewedBy: int("reviewedBy"), // Admin who reviewed
  reviewedAt: timestamp("reviewedAt"),
  generatedImageUrl: varchar("generatedImageUrl", { length: 512 }), // AI-generated card image

  // Crowdpooling flags (0205). isDemo labels seeded example campaigns: they
  // render with the Example badge and never count in the gallery impact strip.
  isDemo: tinyint("isDemo").default(0).notNull(),
  forumPostId: int("forumPostId"), // Campaign discussion thread
  seasonId: int("seasonId"), // Which season this campaign belongs to
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign Items table
 * Stores individual needs for each campaign (land, equipment, roles, resources)
 */
export const campaignItems = mysqlTable("campaign_items", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  
  // Item Type
  category: mysqlEnum("category", [
    "land",
    "equipment",
    "role",
    "resource"
  ]).notNull(),
  
  // Land-specific fields
  hectares: int("hectares"),
  region: varchar("region", { length: 255 }),
  features: text("features"), // JSON array of required features
  videoUrl: varchar("videoUrl", { length: 500 }),
  landDescription: text("landDescription"),
  
  // Equipment-specific fields
  equipmentName: varchar("equipmentName", { length: 255 }),
  equipmentQuantity: int("equipmentQuantity").default(1),
  equipmentCategory: varchar("equipmentCategory", { length: 100 }),
  
  // Role-specific fields
  roleTitle: varchar("roleTitle", { length: 255 }),
  hoursPerWeek: int("hoursPerWeek"),
  durationMonths: int("durationMonths"),
  roleDescription: text("roleDescription"),
  
  // Resource-specific fields
  resourceName: varchar("resourceName", { length: 255 }),
  resourceQuantity: int("resourceQuantity").default(1),
  resourceUnit: varchar("resourceUnit", { length: 50 }),
  resourceDescription: text("resourceDescription"),
  
  // Common fields
  estimatedValue: int("estimatedValue").default(0).notNull(),
  pledgedValue: int("pledgedValue").default(0).notNull(), // How much has been pledged for this item

  // Needs registry (0202, CROWDPOOLING_PLATFORM_SPEC.md Part B Migration A).
  // kind is what shape the need takes. 'crypto' is trackable money on-platform
  // (decision 7); fiat renders only as 'financial_link' partner CTAs.
  kind: mysqlEnum("kind", [
    "item",
    "role",
    "shift",
    "loan",
    "knowledge",
    "crypto",
    "financial_link",
  ]).default("item").notNull(),
  // Which of the 9 capitals this need feeds (decision 8). NULL for legacy roles
  // until a steward sets it.
  capitalType: mysqlEnum("capitalType", [
    "intellectual",
    "social",
    "material",
    "financial",
    "living",
    "cultural",
    "spiritual",
    "experiential",
    "health",
  ]),
  // Slot tracking: accepted claims reserve quantityClaimed (ghost progress),
  // delivery confirms quantityDelivered (solid progress, decision 4).
  quantityWanted: int("quantityWanted").default(1).notNull(),
  quantityClaimed: int("quantityClaimed").default(0).notNull(),
  quantityDelivered: int("quantityDelivered").default(0).notNull(),
  needDeadline: timestamp("needDeadline"),
  // Shift needs: the dated work-party window
  shiftStartsAt: timestamp("shiftStartsAt"),
  shiftEndsAt: timestamp("shiftEndsAt"),
  // Loan needs: the custody window (project is custodian, never P2P)
  loanWindowStart: timestamp("loanWindowStart"),
  loanWindowEnd: timestamp("loanWindowEnd"),
  groupClaimable: tinyint("groupClaimable").default(0).notNull(), // Partial claims allowed
  priorityPinned: tinyint("priorityPinned").default(0).notNull(), // Sorts first in the registry
  imageUrl: varchar("imageUrl", { length: 512 }),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignItem = typeof campaignItems.$inferSelect;
export type InsertCampaignItem = typeof campaignItems.$inferInsert;


/**
 * Campaign Contributions table
 * Stores pledges/contributions made by users to campaigns
 */
export const campaignContributions = mysqlTable("campaign_contributions", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(), // Reference to campaigns
  campaignItemId: int("campaignItemId"), // Optional - specific item being contributed to
  userId: int("userId"), // Optional - can contribute without login
  
  // Contributor Information
  contributorName: varchar("contributorName", { length: 255 }).notNull(),
  contributorEmail: varchar("contributorEmail", { length: 320 }).notNull(),
  contributorPhone: varchar("contributorPhone", { length: 50 }),
  contributorBio: text("contributorBio"), // Short bio about the contributor
  
  // Contribution Type (0203). 'financial' means crypto pledges only, decision 7:
  // fiat routes to partner links and never touches us.
  contributionType: mysqlEnum("contributionType", [
    "land",
    "equipment",
    "role",
    "resource",
    "financial",
    "knowledge"
  ]).notNull(),
  
  // Contribution Details (varies by type)
  title: varchar("title", { length: 255 }).notNull(), // What they're contributing
  description: text("description"), // Details about the contribution
  
  // Land-specific
  landHectares: int("landHectares"),
  landRegion: varchar("landRegion", { length: 255 }),
  landFeatures: text("landFeatures"), // JSON array of features
  
  // Equipment-specific
  equipmentName: varchar("equipmentName", { length: 255 }),
  equipmentQuantity: int("equipmentQuantity"),
  equipmentCondition: varchar("equipmentCondition", { length: 50 }), // new, used, refurbished
  
  // Role-specific
  roleTitle: varchar("roleTitle", { length: 255 }),
  hoursPerWeek: int("hoursPerWeek"),
  durationMonths: int("durationMonths"),
  skills: text("skills"), // JSON array of skills
  
  // Resource-specific
  resourceName: varchar("resourceName", { length: 255 }),
  resourceQuantity: int("resourceQuantity"),
  resourceUnit: varchar("resourceUnit", { length: 50 }),
  
  // Financial-specific
  financialAmount: int("financialAmount"),
  financialCurrency: varchar("financialCurrency", { length: 10 }).default("USD"),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // cash, crypto, wire, etc.
  
  // Value
  estimatedValue: int("estimatedValue").default(0).notNull(), // Estimated value in campaign currency
  
  // Status (0203). accepted reserves quantity (ghost progress), fulfilled is
  // the payoff moment (decision 4), thanked closes the loop, expired is
  // terminal and set by the nightly sweep.
  status: mysqlEnum("status", [
    "pending",      // Submitted, awaiting campaign owner review
    "accepted",     // Accepted by campaign owner
    "rejected",     // Rejected by campaign owner
    "withdrawn",    // Withdrawn by contributor
    "fulfilled",    // Contribution has been delivered/completed
    "expired",      // Claim window passed, quantity released (nightly sweep)
    "thanked"       // Steward attached an impact note/photo after fulfillment
  ]).default("pending").notNull(),

  // Communication
  contributorNotes: text("contributorNotes"), // Notes from contributor
  ownerNotes: text("ownerNotes"), // Notes from campaign owner

  // Claims upgrade (0203, CROWDPOOLING_PLATFORM_SPEC.md Part B Migration B)
  quantityPledged: int("quantityPledged").default(1).notNull(), // Slots claimed on the need
  claimExpiresAt: timestamp("claimExpiresAt"), // From crowdpool.claim_expiry_days_* by need kind
  acknowledgedAt: timestamp("acknowledgedAt"), // When the steward sent thanks
  acknowledgedNote: text("acknowledgedNote"), // Required for the thanked status
  acknowledgedImageUrl: varchar("acknowledgedImageUrl", { length: 512 }),
  referredBy: varchar("referredBy", { length: 16 }), // Share token from ?ref=
  isAnonymous: tinyint("isAnonymous").default(0).notNull(), // Renders as "A contributor" publicly
  hyphaBridgeKey: varchar("hyphaBridgeKey", { length: 16 }), // Set by formalizeOnHypha
  hyphaConfirmedAt: timestamp("hyphaConfirmedAt"), // Stamped by cascadeCrowdpoolPassed when the DHO proposal passes on chain
  playerContributionId: int("playerContributionId"), // Living Tree row created on fulfilled

  // Metadata
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  fulfilledAt: timestamp("fulfilledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignContribution = typeof campaignContributions.$inferSelect;
export type InsertCampaignContribution = typeof campaignContributions.$inferInsert;

/**
 * Campaign Updates (0204). The numbered public journal: short letters from the
 * land. updateNumber auto-increments per campaign in the procedure layer.
 * Publishing fans out campaign_update notifications to followers.
 */
export const campaignUpdates = mysqlTable("campaign_updates", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  authorId: int("authorId").notNull(),
  updateNumber: int("updateNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  imageUrls: json("imageUrls"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("campaign_updates_campaign_idx").on(t.campaignId),
]));
export type CampaignUpdate = typeof campaignUpdates.$inferSelect;
export type InsertCampaignUpdate = typeof campaignUpdates.$inferInsert;

/**
 * Campaign Partner Links (0204). Ma Earth / GoSteward / grant CTAs with
 * nightly-hydrated cached numbers. Money never touches us (decisions 2 + 7):
 * these are read-only display links, contributors complete on the partner site.
 */
export const campaignPartnerLinks = mysqlTable("campaign_partner_links", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  partner: mysqlEnum("partner", ["maearth", "gosteward", "grant", "other"]).notNull(),
  label: varchar("label", { length: 255 }),
  url: varchar("url", { length: 512 }).notNull(),
  cachedRaised: int("cachedRaised"),
  cachedContributorCount: int("cachedContributorCount"),
  cachedPercent: int("cachedPercent"),
  lastFetchedAt: timestamp("lastFetchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("campaign_partner_links_campaign_idx").on(t.campaignId),
]));
export type CampaignPartnerLink = typeof campaignPartnerLinks.$inferSelect;
export type InsertCampaignPartnerLink = typeof campaignPartnerLinks.$inferInsert;

/**
 * Campaign Followers (0205). Email-only followers from the GetNotified form,
 * no account required. Account holders follow via user_follows with
 * targetType 'campaign'. unsubscribeToken goes into every email.
 * The unique key doubles as the campaignId lookup index (leftmost prefix).
 */
export const campaignFollowers = mysqlTable("campaign_followers", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  unsubscribeToken: varchar("unsubscribeToken", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("campaign_followers_campaign_email_uq").on(t.campaignId, t.email),
]));
export type CampaignFollower = typeof campaignFollowers.$inferSelect;
export type InsertCampaignFollower = typeof campaignFollowers.$inferInsert;

/**
 * Campaign Images table
 * Stores photos uploaded by projects for their campaigns (land, team, progress)
 */
export const campaignImages = mysqlTable("campaign_images", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  
  // Image info
  url: varchar("url", { length: 1024 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  
  // Categorization
  category: mysqlEnum("category", [
    "land",
    "team",
    "progress",
    "infrastructure",
    "community",
    "other"
  ]).default("other").notNull(),
  caption: varchar("caption", { length: 500 }),
  
  // Display
  isCover: tinyint("isCover").default(0).notNull(), // 1 = used as campaign cover image
  sortOrder: int("sortOrder").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignImage = typeof campaignImages.$inferSelect;
export type InsertCampaignImage = typeof campaignImages.$inferInsert;

/**
 * Campaign Analytics table
 * Tracks page views and visitor stats for campaigns
 */
export const campaignAnalytics = mysqlTable("campaign_analytics", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  
  // View tracking
  viewDate: timestamp("viewDate").defaultNow().notNull(),
  visitorId: varchar("visitorId", { length: 64 }), // Anonymous visitor identifier
  userId: int("userId"), // If logged in
  
  // Source tracking
  referrer: varchar("referrer", { length: 512 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  
  // Device info
  userAgent: varchar("userAgent", { length: 512 }),
  deviceType: mysqlEnum("deviceType", ["desktop", "mobile", "tablet"]).default("desktop"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignAnalytic = typeof campaignAnalytics.$inferSelect;
export type InsertCampaignAnalytic = typeof campaignAnalytics.$inferInsert;


/**
 * User Notifications table
 * Stores in-app notifications for users
 */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Notification content
  type: mysqlEnum("type", [
    "contribution_accepted",
    "contribution_rejected",
    "campaign_milestone",
    "new_contribution",
    "system",
    "quest_complete",
    "gratitude"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  // Optional deep link the bell navigates to directly (0163). Preferred over
  // the client-side type map when present.
  link: varchar("link", { length: 500 }),

  // Related entities
  campaignId: int("campaignId"),
  contributionId: int("contributionId"),
  
  // Status
  read: boolean("read").default(false).notNull(),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  // Unread-count query runs on nearly every authenticated page load.
  index("user_notifications_user_read_created_idx").on(table.userId, table.read, table.createdAt),
]);

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

/**
 * Letter of Intent (LOI) table
 * Stores investor LOI pledges before fund activation
 */
export const letterOfIntent = mysqlTable("letter_of_intent", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Optional - can submit without login
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "withdrawn",
    "converted" // Converted to actual investment
  ]).default("pending").notNull(),
  
  // Contact Information
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  organization: varchar("organization", { length: 255 }),
  role: varchar("role", { length: 255 }),
  
  // Investment Details
  pledgeAmount: int("pledgeAmount").notNull(), // Amount in USD
  investorType: mysqlEnum("investorType", [
    "individual",
    "family_office",
    "foundation",
    "impact_fund",
    "institutional",
    "other"
  ]).notNull(),
  
  // Timeline & Preferences
  investmentTimeline: mysqlEnum("investmentTimeline", [
    "immediate",
    "3_months",
    "6_months",
    "1_year",
    "flexible"
  ]).default("flexible").notNull(),
  
  geographicPreference: text("geographicPreference"),
  sectorInterests: text("sectorInterests"), // JSON array
  
  // Additional Information
  motivations: text("motivations"),
  questionsForTeam: text("questionsForTeam"),
  additionalNotes: text("additionalNotes"),
  
  // How They Found Us
  referralSource: varchar("referralSource", { length: 255 }),
  
  // Metadata
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LetterOfIntent = typeof letterOfIntent.$inferSelect;
export type InsertLetterOfIntent = typeof letterOfIntent.$inferInsert;

/**
 * Admin Notification Preferences table
 * Controls which types of notifications the admin receives
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  
  // Notification Types (1 = enabled, 0 = disabled)
  applicationSubmissions: tinyint("applicationSubmissions").default(1).notNull(),
  investorInquiries: tinyint("investorInquiries").default(1).notNull(),
  allianceRequests: tinyint("allianceRequests").default(1).notNull(),
  workWithRegens: tinyint("workWithRegens").default(1).notNull(),
  roleRequests: tinyint("roleRequests").default(1).notNull(),
  loiSubmissions: tinyint("loiSubmissions").default(1).notNull(),
  campaignContributions: tinyint("campaignContributions").default(1).notNull(),
  newsletterSignups: tinyint("newsletterSignups").default(0).notNull(),
  
  // Email Routing - comma-separated email addresses for each event type
  applicationEmails: text("applicationEmails"), // defaults to reviewer emails if null
  investorEmails: text("investorEmails"),
  allianceEmails: text("allianceEmails"),
  workWithRegensEmails: text("workWithRegensEmails"),
  roleRequestEmails: text("roleRequestEmails"),
  loiEmails: text("loiEmails"),
  campaignEmails: text("campaignEmails"),
  newsletterEmails: text("newsletterEmails"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;


/**
 * Custom Email Templates table
 * Stores customized versions of email templates that persist across sessions
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  
  // Template identifier (matches the key in emailTemplates object, e.g. "newsletter_welcome")
  templateKey: varchar("templateKey", { length: 100 }).notNull().unique(),
  
  // Custom subject line (null = use default)
  customSubject: varchar("customSubject", { length: 500 }),
  
  // Custom HTML body content (null = use default)
  customBody: text("customBody"),
  
  // Whether this custom template is active (1 = use custom, 0 = use default)
  isActive: tinyint("isActive").default(1).notNull(),
  
  // Who last edited this template
  lastEditedBy: varchar("lastEditedBy", { length: 255 }),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;


/**
 * Forum Categories table
 * Organizes forum discussions into themed categories
 */
export const forumCategories = mysqlTable("forumCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // lucide icon name
  color: varchar("color", { length: 20 }), // hex color for category badge
  imageUrl: varchar("imageUrl", { length: 500 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  // How this board orders its threads: "activity" = latest reply first (default),
  // "numerical" = by each post's sortOrder ascending (quest number order).
  sortMode: varchar("sortMode", { length: 20 }).default("activity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumCategory = typeof forumCategories.$inferSelect;

/**
 * Forum Posts (threads) table
 * Top-level discussion threads within categories
 */
export const forumPosts = mysqlTable("forumPosts", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  isPinned: tinyint("isPinned").default(0).notNull(),
  isLocked: tinyint("isLocked").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  lastReplyAt: timestamp("lastReplyAt"),
  lastReplyBy: int("lastReplyBy"),
  generatedImageUrl: varchar("generatedImageUrl", { length: 512 }), // AI-generated banner image
  tags: text("tags"), // JSON array: ["lesson", "seeking-support", "offering-support"]
  postType: text("postType"), // "discussion" | "case_study" | "seeking_team"
  // C8: Thread chain fields
  threadStage: varchar("threadStage", { length: 32 }), // "idea" | "experiment" | "result"
  chainId: int("chainId"), // links posts in same chain (ID of the original "idea" post)
  // C17: Bioregional tagging
  bioregionId: int("bioregionId"),
  // Link preview OG data (cached after post creation)
  linkPreviews: json("linkPreviews"),
  // Seed post flag (B.3)
  isSeed: tinyint("isSeed").default(0).notNull(),
  // Explicit ascending position for boards in "numerical" sortMode (lower shows first).
  sortOrder: int("sortOrder").default(0).notNull(),
  // Dialogue governance lifecycle (2026-06-25 dialogue process)
  governanceStage: mysqlEnum("governanceStage", ["dialogue", "sensing", "proposal", "decided"]).default("dialogue"),
  sensingStartedAt: timestamp("sensingStartedAt"),
  sensingStartedBy: int("sensingStartedBy"),
  // Optional Root-of-Capital a seeking-support post declares (0168). Feeds
  // the capitals-matching boost once the composer picker ships (Phase 3.3).
  capital: mysqlEnum("capital", ["intellectual", "social", "material", "financial", "living", "cultural", "spiritual", "experiential", "health"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Compound index used by the listing query (replaces the single-column
  // categoryId index). Order matches the WHERE / ORDER BY: filter by
  // category, then sort pinned-first by lastReply.
  listingIdx: index("forumPosts_listing_idx").on(t.categoryId, t.isPinned, t.lastReplyAt),
  authorIdIdx: index("forumPosts_authorId_idx").on(t.authorId),
  bioregionIdIdx: index("forumPosts_bioregionId_idx").on(t.bioregionId),
}));
export type ForumPost = typeof forumPosts.$inferSelect;

/**
 * Forum Replies table
 * Replies to forum threads
 */
export const forumReplies = mysqlTable("forumReplies", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  parentReplyId: int("parentReplyId"), // for nested replies
  triedThis: tinyint("triedThis").default(0).notNull(), // "I tried this" follow-up flag
  isOpenQuestion: tinyint("isOpenQuestion").default(0).notNull(), // moderator/author flag for sensing summary
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  postIdIdx: index("forumReplies_postId_idx").on(t.postId),
  authorIdIdx: index("forumReplies_authorId_idx").on(t.authorId),
}));
export type ForumReply = typeof forumReplies.$inferSelect;

/**
 * Forum Likes table
 * Tracks likes on posts and replies
 */
export const forumLikes = mysqlTable("forumLikes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId"),
  replyId: int("replyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumLike = typeof forumLikes.$inferSelect;

/**
 * Post Reactions table
 * Emoji reactions on forum posts and replies
 */
export const postReactions = mysqlTable('postReactions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('userId').notNull(),
  postId: int('postId'),
  replyId: int('replyId'),
  emoji: varchar('emoji', { length: 8 }).notNull(),
  reactionWeight: double('reactionWeight').default(1.0),
  createdAt: timestamp('createdAt').defaultNow(),
}, (table) => ({
  uniqueReaction: unique('unique_reaction').on(table.userId, table.postId, table.replyId, table.emoji),
}));
export type PostReaction = typeof postReactions.$inferSelect;

/**
 * Forum Reports table
 * Tracks user reports on posts and replies for moderation
 */
export const forumReports = mysqlTable("forumReports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  postId: int("postId"),
  replyId: int("replyId"),
  reason: mysqlEnum("reason", ["spam", "harassment", "inappropriate", "misinformation", "other"]).notNull(),
  details: text("details"),
  // Two-level flagging: soft = community majority can hide; hard = requires admin review
  severity: mysqlEnum("severity", ["soft", "hard"]).default("soft").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "dismissed", "actioned"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumReport = typeof forumReports.$inferSelect;
export type InsertForumReport = typeof forumReports.$inferInsert;

/**
 * Forum Moderators table
 * Tracks users with moderator privileges
 */
export const forumModerators = mysqlTable("forumModerators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  addedBy: int("addedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumModerator = typeof forumModerators.$inferSelect;

/**
 * Forum Bans table
 * Tracks banned users
 */
export const forumBans = mysqlTable("forumBans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bannedBy: int("bannedBy").notNull(),
  reason: text("reason"),
  expiresAt: timestamp("expiresAt"), // null = permanent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumBan = typeof forumBans.$inferSelect;

/**
 * Quest Suggestions table
 * User-submitted quest ideas with voting
 */
export const questSuggestions = mysqlTable("questSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }), // e.g. "regeneration", "community", "governance"
  status: mysqlEnum("status", ["open", "planned", "in_progress", "completed", "declined"]).default("open").notNull(),
  voteCount: int("voteCount").default(0).notNull(),
  questForumThreadId: int("questForumThreadId"), // nullable: ID of the auto-created forum thread for this quest
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestSuggestion = typeof questSuggestions.$inferSelect;

/**
 * Quest Suggestion Votes table
 * Tracks user votes on quest suggestions
 */
export const questSuggestionVotes = mysqlTable("questSuggestionVotes", {
  id: int("id").autoincrement().primaryKey(),
  suggestionId: int("suggestionId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestSuggestionVote = typeof questSuggestionVotes.$inferSelect;

/**
 * Community Agreements table
 * Propose-and-vote system for community norms
 */
export const communityAgreements = mysqlTable("communityAgreements", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["open", "ratified", "in_review", "declined"]).default("open").notNull(),
  voteCount: int("voteCount").default(0).notNull(),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CommunityAgreement = typeof communityAgreements.$inferSelect;

export const communityAgreementVotes = mysqlTable("communityAgreementVotes", {
  id: int("id").autoincrement().primaryKey(),
  agreementId: int("agreementId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CommunityAgreementVote = typeof communityAgreementVotes.$inferSelect;

/**
 * Gratitude Log
 * Simple record of "thank you" messages between users. The lunar-cycle gratitude
 * budget and $ReGen distribution batch jobs come later (see GRATITUDE_SYSTEM_SPEC.md).
 */
export const gratitudeLog = mysqlTable("gratitudeLog", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  sourceType: varchar("sourceType", { length: 32 }),
  sourceId: int("sourceId"),
  // Lunar-cycle acknowledgment model (0163). Legacy flat-5 rows keep NULL.
  cycleId: int("cycleId"),
  // Sender's per-person budget share, written at cycle close.
  weight: double("weight"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("idx_grat_cycle_recipient").on(t.cycleId, t.recipientId),
  index("idx_grat_cycle_sender").on(t.cycleId, t.senderId),
  // One acknowledgment per (sender, recipient, cycle). NULL cycleId rows
  // (legacy) are exempt because MySQL composite UNIQUE ignores NULLs.
  uniqueIndex("uniq_ack_per_cycle").on(t.senderId, t.recipientId, t.cycleId),
]));
export type GratitudeLog = typeof gratitudeLog.$inferSelect;

/**
 * Gratitude Cycles — one row per lunation (new moon to new moon).
 * cycleNumber is the lunation count since the 2000-01-06 reference new moon
 * (shared/lunar.ts), so every environment derives the same key.
 * Lifecycle: open -> distributing -> closed.
 */
export const gratitudeCycles = mysqlTable("gratitude_cycles", {
  id: int("id").autoincrement().primaryKey(),
  cycleNumber: int("cycleNumber").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  poolPerCycle: int("poolPerCycle").default(10000).notNull(),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  distributedAt: timestamp("distributedAt"),
  totalWeight: double("totalWeight"),
}, (t) => ([
  uniqueIndex("uniq_cycle_number").on(t.cycleNumber),
  index("idx_gratitude_cycle_status").on(t.status),
]));
export type GratitudeCycle = typeof gratitudeCycles.$inferSelect;

/**
 * Per-user per-cycle gratitude budget, snapshotted at first send of the
 * cycle: tier, multiplier, streak bonus, and the resulting effective budget
 * that gets split across unique recipients.
 */
export const gratitudeCycleBudgets = mysqlTable("gratitude_cycle_budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cycleId: int("cycleId").notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  baseBudget: int("baseBudget").notNull(),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull(),
  streakCycles: int("streakCycles").default(0).notNull(),
  streakBonus: decimal("streakBonus", { precision: 4, scale: 3 }).default("0").notNull(),
  effectiveBudget: int("effectiveBudget").notNull(),
  uniqueRecipients: int("uniqueRecipients").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  uniqueIndex("uniq_user_cycle").on(t.userId, t.cycleId),
  index("idx_grat_budget_cycle").on(t.cycleId),
]));
export type GratitudeCycleBudget = typeof gratitudeCycleBudgets.$inferSelect;

/**
 * End-of-cycle $ReGen distribution ledger. One row per recipient per cycle;
 * uniq_dist + a user_token_ledger idempotencyKey make re-running the close
 * job a no-op. creditedAmount is the whole-token amount actually credited
 * (user_token_ledger.amount is INT); poolShare keeps the exact figure.
 */
export const gratitudeDistributions = mysqlTable("gratitude_distributions", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  userId: int("userId").notNull(),
  weightReceived: double("weightReceived").notNull(),
  poolShare: decimal("poolShare", { precision: 18, scale: 6 }).notNull(),
  creditedAmount: int("creditedAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  uniqueIndex("uniq_dist").on(t.cycleId, t.userId),
  index("idx_grat_dist_user").on(t.userId),
]));
export type GratitudeDistribution = typeof gratitudeDistributions.$inferSelect;

/**
 * Season Snapshots
 * Frozen state of all game variables at the end of each season. Powers the
 * "ghost curve" comparison line in the Game Mechanics simulator and any
 * other historical-trend visualization.
 */
export const seasonSnapshots = mysqlTable("seasonSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  seasonName: varchar("seasonName", { length: 100 }),
  variables: json("variables").notNull(),
  snapshotAt: timestamp("snapshotAt").defaultNow().notNull(),
});
export type SeasonSnapshot = typeof seasonSnapshots.$inferSelect;

/**
 * Feature Suggestions table
 * Community-driven propose-and-vote for site features
 */
export const featureSuggestions = mysqlTable("featureSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["open", "planned", "building", "shipped", "declined"]).default("open").notNull(),
  voteCount: int("voteCount").default(0).notNull(),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const featureSuggestionVotes = mysqlTable("featureSuggestionVotes", {
  id: int("id").autoincrement().primaryKey(),
  suggestionId: int("suggestionId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Referral tracking
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerUserId: int("referrerUserId").notNull(),
  referredUserId: int("referredUserId"),
  referralCode: varchar("referralCode", { length: 100 }),
  source: varchar("source", { length: 50 }),
  context: varchar("context", { length: 100 }),
  landingUrl: varchar("landingUrl", { length: 500 }),
  signedUpAt: timestamp("signedUpAt"),
  firstQuestAt: timestamp("firstQuestAt"),
  firstContributionAt: timestamp("firstContributionAt"),
  rewardsPaid: int("rewardsPaid").default(0).notNull(),
  rewardsEarned: double("rewardsEarned").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shareEvents = mysqlTable("share_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  contentType: varchar("contentType", { length: 50 }).notNull(),
  contentId: varchar("contentId", { length: 100 }),
  platform: varchar("platform", { length: 50 }).notNull(),
  sharedUrl: varchar("sharedUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Translation Cache table
 * Caches LLM translations of forum content
 */
export const translationCache = mysqlTable("translationCache", {
  id: int("id").autoincrement().primaryKey(),
  contentType: mysqlEnum("contentType", ["post", "reply", "quest_suggestion"]).notNull(),
  contentId: int("contentId").notNull(),
  sourceLang: varchar("sourceLang", { length: 10 }).notNull(),
  targetLang: varchar("targetLang", { length: 10 }).notNull(),
  translatedTitle: text("translatedTitle"),
  translatedContent: text("translatedContent").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TranslationCacheEntry = typeof translationCache.$inferSelect;

/**
 * User Profiles extension table
 * Extended profile data for forum users
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  bio: text("bio"),
  location: varchar("location", { length: 255 }),
  website: varchar("website", { length: 500 }),
  preferredLanguage: varchar("preferredLanguage", { length: 10 }).default("en"),
  reputation: int("reputation").default(0).notNull(),
  postCount: int("postCount").default(0).notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  // Path-aware onboarding fields
  path: mysqlEnum("path", ["investor", "land_project", "ally", "player"]),
  onboardingComplete: tinyint("onboardingComplete").default(0).notNull(),
  investmentRange: varchar("investmentRange", { length: 255 }),
  projectName: varchar("projectName", { length: 255 }),
  projectUrl: varchar("projectUrl", { length: 500 }),
  organizationName: varchar("organizationName", { length: 255 }),
  questInterests: text("questInterests"),
  displayName: varchar("displayName", { length: 255 }),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  bannerUrl: varchar("bannerUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt"),
});
export type UserProfile = typeof userProfiles.$inferSelect;

// Display-field disagreements found during the Phase 2B back-fill (0169).
// Empty in the current data; kept so future reconciliations are inspectable.
export const profileMergeConflicts = mysqlTable("profile_merge_conflicts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  field: varchar("field", { length: 64 }).notNull(),
  playerProfilesValue: text("playerProfilesValue"),
  userProfilesValue: text("userProfilesValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfileMergeConflict = typeof profileMergeConflicts.$inferSelect;

/**
 * Site Banner Configuration
 * Stores editable banner content for homepage and return visitor page
 */
export const siteBanners = mysqlTable("siteBanners", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(), // e.g., "main-banner", "return-banner"
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Markdown content
  isActive: boolean("isActive").default(true).notNull(),
  displayStartDate: timestamp("displayStartDate"),
  displayEndDate: timestamp("displayEndDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteBanner = typeof siteBanners.$inferSelect;
export type InsertSiteBanner = typeof siteBanners.$inferInsert;

// ─── Email Magic Link Tokens ──────────────────────────────────────────────────
export const emailTokens = mysqlTable("email_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailToken = typeof emailTokens.$inferSelect;

// ─── Project Join Requests ────────────────────────────────────────────────────
// Created when someone submits a "live" (join land project) or "alliance"
// (join org) form in /connect. Routed to the steward of that project/org.
export const projectJoinRequests = mysqlTable("project_join_requests", {
  id: int("id").autoincrement().primaryKey(),
  // Who is requesting
  submitterName: varchar("submitterName", { length: 255 }).notNull(),
  submitterEmail: varchar("submitterEmail", { length: 320 }).notNull(),
  submitterMessage: text("submitterMessage"),
  // What they want to join
  targetType: mysqlEnum("targetType", ["land_project", "alliance_org"]).notNull(),
  targetId: varchar("targetId", { length: 255 }).notNull(),
  targetName: varchar("targetName", { length: 255 }).notNull(),
  // Steward routing (null until someone claims the org)
  stewardUserId: int("stewardUserId"),
  // Processing status
  status: mysqlEnum("status", ["pending", "reviewed", "accepted", "rejected"]).default("pending").notNull(),
  // Link back to the general inquiry for context
  connectInquiryId: int("connectInquiryId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectJoinRequest = typeof projectJoinRequests.$inferSelect;
export type InsertProjectJoinRequest = typeof projectJoinRequests.$inferInsert;

// ─── Org Claims ───────────────────────────────────────────────────────────────
// Users can claim stewardship of a land project or alliance org.
// Once approved (by admin), join requests for that org are routed to them.
export const orgClaims = mysqlTable("org_claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgType: mysqlEnum("orgType", ["land_project", "alliance_org"]).notNull(),
  orgId: varchar("orgId", { length: 255 }).notNull(),
  orgName: varchar("orgName", { length: 255 }).notNull(),
  // Detailed form data from the claim submission (land project fields or org fields)
  formData: json("formData"),
  // Admin notes written during review
  adminNotes: text("adminNotes"),
  // Admin approves/rejects claim
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Tracks whether the steward has dismissed the one-time RSS setup popup
  rssPromptDismissed: tinyint("rssPromptDismissed").default(0).notNull(),
});

export type OrgClaim = typeof orgClaims.$inferSelect;
export type InsertOrgClaim = typeof orgClaims.$inferInsert;
export type InsertEmailToken = typeof emailTokens.$inferInsert;

// ─── Bioregions ───────────────────────────────────────────────────────────────
export const bioregions = mysqlTable("bioregions", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  realm: text("realm"),
  subrealm: text("subrealm"),
  source: varchar("source", { length: 64 }), // "one_earth" | "community"
  approved: tinyint("approved").default(1).notNull(),
  submittedBy: int("submittedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bioregion = typeof bioregions.$inferSelect;
export type InsertBioregion = typeof bioregions.$inferInsert;

// ─── User Bioregions ──────────────────────────────────────────────────────────
export const userBioregions = mysqlTable("user_bioregions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),       // References playerProfiles(userId)
  bioregionId: int("bioregionId").notNull(), // References bioregions(id)
  isPrimary: tinyint("isPrimary").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBioregion = typeof userBioregions.$inferSelect;
export type InsertUserBioregion = typeof userBioregions.$inferInsert;

// ─── Gifts ────────────────────────────────────────────────────────────────────
export const gifts = mysqlTable("gifts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // "skill" | "resource" | "time" | "knowledge" | "land" | "capital"
  description: text("description").notNull(),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Gift = typeof gifts.$inferSelect;
export type InsertGift = typeof gifts.$inferInsert;

// ─── Needs ────────────────────────────────────────────────────────────────────
export const needs = mysqlTable("needs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // "skill" | "resource" | "time" | "knowledge" | "land" | "capital"
  description: text("description").notNull(),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Need = typeof needs.$inferSelect;
export type InsertNeed = typeof needs.$inferInsert;

// ─── Upcoming AMAs ────────────────────────────────────────────────────────────
export const upcomingAmas = mysqlTable("upcoming_amas", {
  id: int("id").autoincrement().primaryKey(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  hostName: varchar("hostName", { length: 255 }).notNull(),
  date: varchar("date", { length: 32 }).notNull(),        // "2026-04-26"
  time: varchar("time", { length: 64 }).notNull(),        // "11:00 AM EST"
  timezone: varchar("timezone", { length: 64 }).notNull(),
  forumThreadUrl: text("forumThreadUrl"),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UpcomingAma = typeof upcomingAmas.$inferSelect;
export type InsertUpcomingAma = typeof upcomingAmas.$inferInsert;

// ─── C15: Project Connections ─────────────────────────────────────────────────
export const projectConnections = mysqlTable("project_connections", {
  id: int("id").autoincrement().primaryKey(),
  postAId: int("postAId").notNull(),
  postBId: int("postBId").notNull(),
  connectionType: varchar("connectionType", { length: 32 }).notNull(), // "needs_each_other" | "similar"
  note: text("note"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectConnection = typeof projectConnections.$inferSelect;
export type InsertProjectConnection = typeof projectConnections.$inferInsert;

// ─── C12: Digests ─────────────────────────────────────────────────────────────
export const digests = mysqlTable("digests", {
  id: int("id").autoincrement().primaryKey(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  periodStart: varchar("periodStart", { length: 32 }).notNull(),
  periodEnd: varchar("periodEnd", { length: 32 }).notNull(),
  contentMd: text("contentMd").notNull(),
  forumPostId: int("forumPostId"),
  sentAt: timestamp("sentAt"),
});
export type Digest = typeof digests.$inferSelect;

// ─── C13: Glossary Terms ──────────────────────────────────────────────────────
export const glossaryTerms = mysqlTable("glossary_terms", {
  id: int("id").autoincrement().primaryKey(),
  term: varchar("term", { length: 255 }).notNull().unique(),
  definition: text("definition").notNull(),
  sourceThreadUrl: text("sourceThreadUrl"),
  proposedAt: timestamp("proposedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  status: varchar("status", { length: 32 }).default("proposed").notNull(), // "proposed" | "approved" | "rejected"
});
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type InsertGlossaryTerm = typeof glossaryTerms.$inferInsert;

// ─── C9: Knowledge Map ────────────────────────────────────────────────────────
export const knowledgeMapEntries = mysqlTable("knowledge_map_entries", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  postId: int("postId"),                                   // optional link to forum post
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  url: varchar("url", { length: 500 }),                    // fallback if not a post
  sortOrder: int("sortOrder").default(0).notNull(),
  suggestedByAI: tinyint("suggestedByAI").default(0).notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type KnowledgeMapEntry = typeof knowledgeMapEntries.$inferSelect;
export type InsertKnowledgeMapEntry = typeof knowledgeMapEntries.$inferInsert;

// ─── Site Settings (admin-updatable key/value store) ─────────────────────────
export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SiteSetting = typeof siteSettings.$inferSelect;

// ─── Custom Game Inquiries (waitlist form for /custom-games) ──────────────────
export const customGameInquiries = mysqlTable("custom_game_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  websiteOrSocial: varchar("website_or_social", { length: 500 }),
  landStatus: varchar("land_status", { length: 100 }).notNull(),
  communityStage: varchar("community_stage", { length: 100 }).notNull(),
  primaryGoal: text("primary_goal").notNull(),
  timeline: varchar("timeline", { length: 100 }).notNull(),
  budgetConfirmed: tinyint("budget_confirmed").default(0).notNull(),
  referralSource: varchar("referral_source", { length: 255 }),
  additionalNotes: text("additional_notes"),
  status: varchar("status", { length: 50 }).default("waitlist").notNull(),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomGameInquiry = typeof customGameInquiries.$inferSelect;
export type InsertCustomGameInquiry = typeof customGameInquiries.$inferInsert;

// ─── Custom Game Applications (Sylva intake on /custom-games/apply) ───────────
// One row per Custom Games application. blueprintDraft is the progressive
// blueprint.json v0.3 (shared/customGameBlueprint.ts); transcript is the full
// Sylva conversation (MEDIUMTEXT in SQL; a 60-turn talk can pass 64KB). score
// is the auto-qualification score computed at submit.
export const customGameApplications = mysqlTable("custom_game_applications", {
  id: int("id").autoincrement().primaryKey(),
  applicantName: varchar("applicant_name", { length: 255 }).notNull(),
  applicantEmail: varchar("applicant_email", { length: 255 }).notNull(),
  applicantRole: varchar("applicant_role", { length: 50 }).notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "reviewing", "in_conversation", "accepted", "declined"]).default("submitted").notNull(),
  blueprintDraft: json("blueprint_draft"),
  transcript: text("transcript"),
  score: int("score").default(0).notNull(),
  internalNotes: text("internal_notes"),
  needsText: text("needsText"),
  offersText: text("offersText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomGameApplication = typeof customGameApplications.$inferSelect;
export type InsertCustomGameApplication = typeof customGameApplications.$inferInsert;

// ─── Alliance Organisations ────────────────────────────────────────────────────
// Registry of alliance partner organisations. Mirrors the hardcoded list in
// Connect.tsx but stored in DB so they can have forum threads, status, etc.
export const organisations = mysqlTable("organisations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }),
  description: text("description"),
  forumPostId: int("forumPostId"),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  regenerativeScore: double("regenerativeScore"),
  regenerativeTier: mysqlEnum("regenerativeTier", ["regular", "reputable", "sustainable", "regenerative", "thriving"]),
  communityRatingsCount: int("communityRatingsCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Organisation = typeof organisations.$inferSelect;
export type InsertOrganisation = typeof organisations.$inferInsert;

// ─── Quest Completions ────────────────────────────────────────────────────────
// Records when a player completes a quest and submits an artifact.
export const questCompletions = mysqlTable("quest_completions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),   // e.g. "quest-0"
  questTitle: varchar("questTitle", { length: 255 }).notNull(),
  // Artifact submitted by the player (photo URL, written reflection, etc.)
  artifactType: mysqlEnum("artifactType", ["photo", "text", "link", "video"]).default("text").notNull(),
  artifactUrl: varchar("artifactUrl", { length: 1000 }),
  artifactText: text("artifactText"),
  caption: varchar("caption", { length: 500 }),
  // Video-specific metadata (only populated when artifactType = "video")
  videoThumbnailUrl: varchar("videoThumbnailUrl", { length: 1000 }),
  videoDurationSeconds: int("videoDurationSeconds"),
  // Visibility: public shows in community feed, private stays in journal
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  // Tier/rite counting selects all completions for a user.
  index("quest_completions_userId_idx").on(table.userId),
  // Public completion feeds order by completedAt within a visibility.
  index("quest_completions_visibility_completedAt_idx").on(table.visibility, table.completedAt),
]);
export type QuestCompletion = typeof questCompletions.$inferSelect;
export type InsertQuestCompletion = typeof questCompletions.$inferInsert;

// ─── Active Quest Signals ─────────────────────────────────────────────────────
// "I'm doing this" — a lightweight signal that a player is currently on a quest.
// Expires after 90 days or when the user removes it.
export const activeQuestSignals = mysqlTable("active_quest_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  questTitle: varchar("questTitle", { length: 255 }).notNull(),
  note: varchar("note", { length: 500 }),                   // optional short note
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),               // default: startedAt + 90 days
  isActive: tinyint("isActive").default(1).notNull(),
  lookingForParty: tinyint("lookingForParty").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActiveQuestSignal = typeof activeQuestSignals.$inferSelect;
export type InsertActiveQuestSignal = typeof activeQuestSignals.$inferInsert;

// ─── Player Capital Scores ─────────────────────────────────────────────────────
// Per-user scores across the nine forms of capital. Quest completions contribute
// to one or more capitals via the `capitalContributions` field on each quest.
// The Living Tree visualization reads this row to render the player's tree.
export const playerCapitalScores = mysqlTable("player_capital_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  intellectual: int("intellectual").default(0).notNull(),
  social: int("social").default(0).notNull(),
  material: int("material").default(0).notNull(),
  financial: int("financial").default(0).notNull(),
  living: int("living").default(0).notNull(),
  cultural: int("cultural").default(0).notNull(),
  spiritual: int("spiritual").default(0).notNull(),
  experiential: int("experiential").default(0).notNull(),
  healthVital: int("healthVital").default(0).notNull(),
  totalScore: int("totalScore").default(0).notNull(),
  seasonsCompleted: int("seasonsCompleted").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlayerCapitalScore = typeof playerCapitalScores.$inferSelect;
export type InsertPlayerCapitalScore = typeof playerCapitalScores.$inferInsert;

// ─── Entity RSS Feeds ─────────────────────────────────────────────────────────
// RSS / Atom feeds associated with a land project or organisation.
export const entityRssFeeds = mysqlTable("entity_rss_feeds", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["land_project", "organisation"]).notNull(),
  entityId: varchar("entityId", { length: 100 }).notNull(), // project slug or orgId
  feedUrl: varchar("feedUrl", { length: 1000 }).notNull(),
  label: varchar("label", { length: 255 }),                 // e.g. "Blog", "Newsletter"
  lastFetchedAt: timestamp("lastFetchedAt"),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EntityRssFeed = typeof entityRssFeeds.$inferSelect;
export type InsertEntityRssFeed = typeof entityRssFeeds.$inferInsert;

// ─── Quest Endorsements ───────────────────────────────────────────────────────
// Stewards can mark quests as recommended or required for applicants to their org.
export const questEndorsements = mysqlTable("questEndorsements", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 255 }).notNull(),
  orgType: mysqlEnum("orgType", ["land_project", "alliance_org"]).notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  endorsementType: mysqlEnum("endorsementType", ["recommended", "required"]).default("recommended").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestEndorsement = typeof questEndorsements.$inferSelect;
export type InsertQuestEndorsement = typeof questEndorsements.$inferInsert;

// ─── Blog Post Edits ──────────────────────────────────────────────────────────
// Superadmin content overrides for static blog posts (keyed by slug).
export const blogEdits = mysqlTable("blogEdits", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BlogEdit = typeof blogEdits.$inferSelect;
export type InsertBlogEdit = typeof blogEdits.$inferInsert;

// ─── Banned Emails ────────────────────────────────────────────────────────────
export const bannedEmails = mysqlTable('bannedEmails', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  reason: text('reason'),
  bannedBy: int('bannedBy'),
  bannedAt: timestamp('bannedAt').defaultNow(),
});
export type BannedEmail = typeof bannedEmails.$inferSelect;
export type InsertBannedEmail = typeof bannedEmails.$inferInsert;

// ─── Application Events ───────────────────────────────────────────────────────
export const applicationEvents = mysqlTable('applicationEvents', {
  id: int('id').primaryKey().autoincrement(),
  applicationId: int('applicationId').notNull(),
  eventType: mysqlEnum('eventType', ['status_change', 'email_sent', 'note_added', 'admin_action']).notNull(),
  description: text('description').notNull(),
  adminUserId: int('adminUserId'),
  createdAt: timestamp('createdAt').defaultNow(),
});
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type InsertApplicationEvent = typeof applicationEvents.$inferInsert;

// ─── Admin Notifications ──────────────────────────────────────────────────────
export const adminNotifications = mysqlTable('adminNotifications', {
  id: int('id').primaryKey().autoincrement(),
  type: varchar('type', { length: 50 }).notNull(),
  entityId: int('entityId'),
  entityType: varchar('entityType', { length: 50 }),
  message: text('message').notNull(),
  snoozedUntil: timestamp('snoozedUntil'),
  handledAt: timestamp('handledAt'),
  createdAt: timestamp('createdAt').defaultNow(),
});
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;

/**
 * Admin audit log — immutable record of every admin action taken on the platform.
 * Rows are append-only (never updated or deleted) to provide a tamper-evident trail.
 */
export const adminAuditLog = mysqlTable('adminAuditLog', {
  id: int('id').primaryKey().autoincrement(),
  /** Admin user who performed the action */
  adminUserId: int('adminUserId').notNull(),
  /** High-level action category, e.g. "application.status_change", "user.ban" */
  action: varchar('action', { length: 100 }).notNull(),
  /** Type of entity affected, e.g. "application", "user", "forum_post" */
  entityType: varchar('entityType', { length: 50 }),
  /** ID of the entity affected */
  entityId: int('entityId'),
  /** Human-readable description of what changed */
  description: text('description'),
  /** JSON snapshot of before/after values (optional) */
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ([
  index('adminAuditLog_adminUserId_idx').on(table.adminUserId),
  index('adminAuditLog_action_idx').on(table.action),
  index('adminAuditLog_entityType_entityId_idx').on(table.entityType, table.entityId),
  index('adminAuditLog_createdAt_idx').on(table.createdAt),
]));
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;

// ─── Direct Messaging ────────────────────────────────────────────────────────

export const conversations = mysqlTable('conversations', {
  id: int('id').primaryKey().autoincrement(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ([
  index('conversations_createdAt_idx').on(table.createdAt),
]));
export type Conversation = typeof conversations.$inferSelect;

export const conversationParticipants = mysqlTable('conversationParticipants', {
  id: int('id').primaryKey().autoincrement(),
  conversationId: int('conversationId').notNull(),
  userId: int('userId').notNull(),
  lastReadAt: timestamp('lastReadAt'),
  joinedAt: timestamp('joinedAt').defaultNow().notNull(),
}, (table) => ([
  index('convParticipants_conversationId_idx').on(table.conversationId),
  index('convParticipants_userId_idx').on(table.userId),
  index('convParticipants_userId_convId_idx').on(table.userId, table.conversationId),
]));
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export const directMessages = mysqlTable('directMessages', {
  id: int('id').primaryKey().autoincrement(),
  conversationId: int('conversationId').notNull(),
  senderId: int('senderId').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  deletedAt: timestamp('deletedAt'),
}, (table) => ([
  index('directMessages_conversationId_idx').on(table.conversationId),
  index('directMessages_senderId_idx').on(table.senderId),
  index('directMessages_createdAt_idx').on(table.createdAt),
]));
export type DirectMessage = typeof directMessages.$inferSelect;



/**
 * Recordings table
 * Stores Riverside.fm recording metadata received via webhook
 */
export const recordings = mysqlTable("recordings", {
  id: int("id").autoincrement().primaryKey(),

  // Riverside identifiers
  riversideId: varchar("riversideId", { length: 255 }).notNull().unique(),
  riversideUrl: varchar("riversideUrl", { length: 512 }),

  // Content
  title: varchar("title", { length: 255 }).notNull(),
  sessionDate: timestamp("sessionDate"),
  durationSeconds: int("durationSeconds"),
  youtubeUrl: varchar("youtubeUrl", { length: 512 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }),

  // AI-generated content (may arrive via second webhook after transcription)
  transcript: text("transcript"),
  aiSummary: text("aiSummary"),

  // Admin controls
  emailSent: tinyint("emailSent").default(0).notNull(),  // 1 once summary email has been sent
  forumPostId: int("forumPostId"),                        // linked forum post if created
  featured: tinyint("featured").default(0).notNull(),    // pin to top of recordings list

  // Raw webhook payload for debugging
  rawWebhook: json("rawWebhook"),

  // Movement Coordination Engine columns (migration 0142). Old rows
  // read as recordingKind='raw' with all other coordination fields null.
  youtubeVideoId: varchar("youtubeVideoId", { length: 32 }),
  recordingKind: mysqlEnum("recordingKind", ["raw", "edited"]).default("raw").notNull(),
  editedYoutubeUrl: varchar("editedYoutubeUrl", { length: 512 }),
  overview: text("overview"),
  decisionsJson: json("decisionsJson"),
  actionItemsJson: json("actionItemsJson"),
  chaptersJson: json("chaptersJson"),         // [{ tSeconds, title }] from the synthesize pass
  transcriptJson: json("transcriptJson"),     // [{ start, text }] timestamped transcript segments

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("recordings_riversideId_idx").on(table.riversideId),
  index("recordings_sessionDate_idx").on(table.sessionDate),
  index("recordings_featured_idx").on(table.featured),
  index("recordings_youtubeVideoId_idx").on(table.youtubeVideoId),
]));

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = typeof recordings.$inferInsert;

/**
 * Community-call intelligence (Stage 7). One cached extraction pass per
 * recording emits typed insights: wisdom/idea flow to the vault and feed;
 * decision/commitment/role_change/strategic_move surface in /admin/calls as
 * SUGGESTIONS (accept/dismiss, never auto-tasks). speaker keeps attribution;
 * the voice learning loop never trains on call material.
 */
export const callInsights = mysqlTable("call_insights", {
  id: int("id").autoincrement().primaryKey(),
  recordingId: int("recording_id").notNull(),
  kind: mysqlEnum("kind", ["wisdom", "idea", "decision", "commitment", "role_change", "strategic_move"]).notNull(),
  content: varchar("content", { length: 1000 }).notNull(),
  speaker: varchar("speaker", { length: 120 }),
  timestampSecs: int("timestamp_secs"),
  status: mysqlEnum("status", ["suggested", "accepted", "dismissed"]).default("suggested").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  recordingIdx: index("call_insights_recording_idx").on(t.recordingId, t.kind),
  statusIdx: index("call_insights_status_idx").on(t.status, t.kind, t.createdAt),
}));
export type CallInsight = typeof callInsights.$inferSelect;

/**
 * roleHolders: closes Gap A in the Movement Coordination Engine spec.
 * One row per sociocratic role from `client/src/data/gameRoles.ts`. A
 * filled `userId` ties a real human to a role so a task mentioned in a
 * call can route to a profile. Null `userId` means the role is open and
 * any task targeting it lands on the Opportunity board.
 *
 * `aliases` stores name + handle variants the LLM may hear in a
 * transcript ("the Gardener", first name, nickname). The extract-tasks
 * pass matches these alongside `roleSlug` so role attribution survives
 * loose spoken language.
 */
export const roleHolders = mysqlTable("roleHolders", {
  id: int("id").autoincrement().primaryKey(),
  roleSlug: varchar("roleSlug", { length: 64 }).notNull(),
  roleTitle: varchar("roleTitle", { length: 128 }).notNull(),
  kind: mysqlEnum("kind", ["game", "fund"]).default("game").notNull(),
  circle: varchar("circle", { length: 128 }),
  userId: int("userId"),
  pendingMemberId: int("pendingMemberId"),
  season: varchar("season", { length: 50 }),
  isActive: tinyint("isActive").default(1).notNull(),
  notifyEmail: tinyint("notifyEmail").default(1).notNull(),
  notifyInApp: tinyint("notifyInApp").default(1).notNull(),
  aliases: json("aliases"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  bySlug: index("roleHolders_roleSlug_idx").on(t.roleSlug),
  byUser: index("roleHolders_userId_idx").on(t.userId),
}));
export type RoleHolder = typeof roleHolders.$inferSelect;
export type InsertRoleHolder = typeof roleHolders.$inferInsert;

// Canonical role catalog. Source of truth for the 20 sociocratic roles,
// seeded once from client/src/data/gameRoles.ts (migration + seed-roles.ts),
// then edited directly from admin. slug matches roleHolders.roleSlug so the
// person-to-role mapping joins cleanly. The Team page + pipeline read here.
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 128 }).notNull(),
  characterName: varchar("characterName", { length: 128 }),
  tagline: varchar("tagline", { length: 500 }),
  emoji: varchar("emoji", { length: 16 }),
  characterImage: varchar("characterImage", { length: 512 }),
  sceneImage: varchar("sceneImage", { length: 512 }),
  purpose: text("purpose"),
  circle: varchar("circle", { length: 128 }),
  powers: json("powers"),
  rights: json("rights"),
  responsibilities: json("responsibilities"),
  domains: text("domains"),
  band: int("band"),
  tokenAward: varchar("tokenAward", { length: 128 }),
  maxTokenAward: varchar("maxTokenAward", { length: 128 }),
  hoursPerWeek: int("hoursPerWeek"),
  deliverables: json("deliverables"),
  seed: text("seed"),
  harvest: text("harvest"),
  seasons: json("seasons"),
  assignment: varchar("assignment", { length: 255 }),
  color: varchar("color", { length: 32 }),
  cardImagePosition: varchar("cardImagePosition", { length: 64 }),
  kind: mysqlEnum("kind", ["game", "fund"]).notNull().default("game"),
  specialContent: json("specialContent"),
  aliases: json("aliases"),
  active: tinyint("active").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  byKind: index("roles_kind_idx").on(t.kind),
}));
export type RoleRow = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// Invited members who do not yet have a user account. Assignable to a role
// immediately; linked to the real user on magic-link acceptance.
export const pendingMembers = mysqlTable("pending_members", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted"]).notNull().default("pending"),
  userId: int("userId"),
  invitedBy: int("invitedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
}, (t) => ({
  byToken: index("pending_members_token_idx").on(t.inviteToken),
  byEmail: index("pending_members_email_idx").on(t.email),
}));
export type PendingMember = typeof pendingMembers.$inferSelect;

// Audit trail for role-holder assignments (who assigned/removed/invited, when).
export const roleAssignmentLog = mysqlTable("role_assignment_log", {
  id: int("id").autoincrement().primaryKey(),
  roleSlug: varchar("roleSlug", { length: 64 }).notNull(),
  action: mysqlEnum("action", ["assigned", "removed", "invited"]).notNull(),
  targetUserId: int("targetUserId"),
  targetPendingId: int("targetPendingId"),
  targetLabel: varchar("targetLabel", { length: 200 }),
  actorUserId: int("actorUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  bySlug: index("role_assignment_log_slug_idx").on(t.roleSlug),
}));
export type RoleAssignmentLog = typeof roleAssignmentLog.$inferSelect;

/**
 * Events table
 * Stores scheduled community sessions, incubator episodes, and special events.
 * This is the source of truth for the Schedule page.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),

  // Content
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["open", "episode", "special"]).default("open").notNull(),

  // Timing (stored in UTC)
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),

  // Display hint for the UI (e.g., "EST", "EDT")
  timezone: varchar("timezone", { length: 10 }).default("UTC"),

  // Links
  zoomUrl: varchar("zoomUrl", { length: 512 }),
  riversideRoomUrl: varchar("riversideRoomUrl", { length: 512 }),
  youtubeUrl: varchar("youtubeUrl", { length: 512 }), // livestream or premiere

  // Linked recording once session is done
  recordingId: int("recordingId"),

  // Status lifecycle
  status: mysqlEnum("status", ["upcoming", "live", "completed", "cancelled"]).default("upcoming").notNull(),

  // Season info
  season: varchar("season", { length: 50 }),
  episodeNumber: int("episodeNumber"),

  // Capacity (#11 — waitlist)
  maxAttendees: int("maxAttendees"), // null = unlimited

  // Pre-event forum discussion thread (#6)
  forumThreadId: int("forumThreadId"), // ID of the forum post created when this event is added

  // Reminder tracking
  reminderSent: tinyint("reminderSent").default(0).notNull(), // 1 once 24h reminder has been sent

  // Durable admin-scheduled custom reminder (replaces an in-memory setTimeout).
  // When reminderScheduledFor is set and due, the event-reminders cron sends it.
  reminderScheduledFor: timestamp("reminderScheduledFor"),
  reminderCustomSubject: varchar("reminderCustomSubject", { length: 200 }),
  reminderCustomBody: text("reminderCustomBody"),

  // #16 — Self-service check-in QR code token
  checkinToken: varchar("checkinToken", { length: 64 }),

  // #25 — Guest speaker fields
  guestSpeakerName: varchar("guestSpeakerName", { length: 255 }),
  guestSpeakerBio: text("guestSpeakerBio"),
  guestSpeakerTopic: varchar("guestSpeakerTopic", { length: 500 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("events_type_idx").on(table.type),
  index("events_startTime_idx").on(table.startTime),
  index("events_status_idx").on(table.status),
  index("events_season_idx").on(table.season),
]));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event Signups table
 * Per-event reminder subscribers. Separate from newsletter subscribers.
 * Unique per (eventId, email) — no double-signups.
 */
export const eventSignups = mysqlTable("event_signups", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  // #4 — SMS reminders
  phone: varchar("phone", { length: 30 }),
  // #11 — waitlist vs. reminder
  signupType: mysqlEnum("signupType", ["reminder", "waitlist"]).default("reminder").notNull(),
  // #18 — per-event unsubscribe
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  unique("eventSignups_eventId_email_unique").on(table.eventId, table.email),
  index("eventSignups_eventId_idx").on(table.eventId),
  index("eventSignups_email_idx").on(table.email),
]));

export type EventSignup = typeof eventSignups.$inferSelect;
export type InsertEventSignup = typeof eventSignups.$inferInsert;

/**
 * Agenda Suggestions table (#9)
 * Community members can suggest topics for upcoming episodes.
 * Admin can approve or reject from the Events tab.
 */
export const agendaSuggestions = mysqlTable("agenda_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  authorEmail: varchar("authorEmail", { length: 320 }).notNull(),
  authorName: varchar("authorName", { length: 255 }),
  suggestion: text("suggestion").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("agendaSuggestions_eventId_idx").on(table.eventId),
  index("agendaSuggestions_status_idx").on(table.status),
]));

export type AgendaSuggestion = typeof agendaSuggestions.$inferSelect;
export type InsertAgendaSuggestion = typeof agendaSuggestions.$inferInsert;

/**
 * Event Attendance table (#8 revised)
 * Tracks who actually attended each event (marked by admin after the call).
 * Each confirmed attendee earns 33 $ReGen tokens, recorded in the token ledger.
 * Unique per (eventId, email) to prevent duplicate awards.
 */
export const eventAttendance = mysqlTable("event_attendance", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  // Admin who marked attendance (null if marked via self-check-in in future)
  markedByAdminId: int("markedByAdminId"),
  markedAt: timestamp("markedAt").defaultNow().notNull(),
  // Tokens awarded for attending this event
  tokensAwarded: int("tokensAwarded").default(33).notNull(),
  tokenLedgerEntryId: int("tokenLedgerEntryId"), // FK to regenTokenLedger
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  unique("eventAttendance_eventId_email_unique").on(table.eventId, table.email),
  index("eventAttendance_eventId_idx").on(table.eventId),
  index("eventAttendance_email_idx").on(table.email),
]));

export type EventAttendance = typeof eventAttendance.$inferSelect;
export type InsertEventAttendance = typeof eventAttendance.$inferInsert;

/**
 * $ReGen Token Ledger
 * Append-only ledger of all $ReGen token awards.
 * Balances are computed by summing entries per email.
 * This feeds into future token distribution and contribution tracking.
 */
export const regenTokenLedger = mysqlTable("regen_token_ledger", {
  id: int("id").autoincrement().primaryKey(),
  // Email is the primary identity key (users may not have accounts yet)
  email: varchar("email", { length: 320 }).notNull(),
  // Linked user account if they've signed up (nullable)
  userId: int("userId"),
  // Token amount (positive = award, negative = spend/deduct)
  amount: int("amount").notNull(),
  // Reason for the award
  reason: mysqlEnum("reason", [
    "event_attendance",
    "quest_completion",
    "community_contribution",
    "referral",
    "admin_grant",
    "adjustment",
  ]).notNull(),
  // Optional references to what triggered this award
  eventId: int("eventId"),
  questId: varchar("questId", { length: 100 }),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("regenTokenLedger_email_idx").on(table.email),
  index("regenTokenLedger_reason_idx").on(table.reason),
  index("regenTokenLedger_eventId_idx").on(table.eventId),
]));

export type RegenTokenLedger = typeof regenTokenLedger.$inferSelect;
export type InsertRegenTokenLedger = typeof regenTokenLedger.$inferInsert;

// Notifications (A.7) — the single notification spine as of 0162.
// user_notifications rows were back-filled here and its writers repointed;
// `link` is always a canonical in-app URL (forum events deep-link to
// /community/post/:id#reply-:replyId). `dedupeKey` + INSERT IGNORE makes
// fire-and-forget fan-out idempotent under retries/restarts.
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "forum_reply",
    "quest_complete",
    "fund_update",
    "vouch",
    "mention",
    "gratitude",
    "reaction_milestone",
    "guide_reply",
    "elder_reply",
    "thread_followed_activity",
    "governance_stage",
    "system",
    "contribution_accepted",
    "contribution_rejected",
    "campaign_milestone",
    "new_contribution",
    "claim_complete",
    "claim_failed",
    "campaign_update",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 500 }),
  isRead: tinyint("isRead").default(0).notNull(),
  // Who did the thing (for the avatar in the bell)
  actorId: int("actorId"),
  // Denormalized forum source (grouping: "3 new replies on X")
  postId: int("postId"),
  replyId: int("replyId"),
  // Legacy campaign/contribution relations (carried over from user_notifications)
  campaignId: int("campaignId"),
  contributionId: int("contributionId"),
  // Delivery stamps: set when the email/push copy went out (dedupe per channel)
  emailedAt: timestamp("emailedAt"),
  pushedAt: timestamp("pushedAt"),
  // Idempotency key, e.g. "mention:reply:8821:u42". Unique; inserts use
  // ON DUPLICATE KEY so double-fired hooks are no-ops.
  dedupeKey: varchar("dedupeKey", { length: 191 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("notifications_player_unread_idx").on(t.userId, t.isRead, t.createdAt),
  unique("notifications_dedupe_uq").on(t.dedupeKey),
]));
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Forum @mentions. The unique key makes re-parsing on edit idempotent:
// only handles not already recorded for a source produce notifications.
export const forumMentions = mysqlTable("forum_mentions", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["post", "reply"]).notNull(),
  sourceId: int("sourceId").notNull(),
  mentionedUserId: int("mentionedUserId").notNull(),
  mentionerUserId: int("mentionerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("forum_mentions_source_user_uq").on(t.sourceType, t.sourceId, t.mentionedUserId),
  index("forum_mentions_mentioned_idx").on(t.mentionedUserId),
]));
export type ForumMention = typeof forumMentions.$inferSelect;

// Thread-level follows. Auto-created on author/reply/mention; `muted` stops
// thread_followed_activity for that thread (direct mentions still notify).
export const forumSubscriptions = mysqlTable("forum_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  reason: mysqlEnum("reason", ["authored", "replied", "mentioned", "manual"]).notNull(),
  muted: tinyint("muted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("forum_subscriptions_user_post_uq").on(t.userId, t.postId),
  index("forum_subscriptions_post_idx").on(t.postId),
]));
export type ForumSubscription = typeof forumSubscriptions.$inferSelect;

// Unread state per user per thread (0168). lastSeenReplyCount powers the
// "N new" pill; a row missing entirely means never read.
export const forumPostReads = mysqlTable("forum_post_reads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
  lastSeenReplyCount: int("lastSeenReplyCount").default(0).notNull(),
}, (t) => ([
  unique("forum_post_reads_user_post_uq").on(t.userId, t.postId),
  index("forum_post_reads_user_read_idx").on(t.userId, t.lastReadAt),
]));
export type ForumPostRead = typeof forumPostReads.$inferSelect;

// One polymorphic follow table (0168): users, categories, bioregions, tags,
// and campaigns (0205). targetId is VARCHAR so tag slugs and numeric ids
// share one column.
export const userFollows = mysqlTable("user_follows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetType: mysqlEnum("targetType", ["user", "category", "bioregion", "tag", "campaign"]).notNull(),
  targetId: varchar("targetId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("user_follows_uq").on(t.userId, t.targetType, t.targetId),
  index("user_follows_target_idx").on(t.targetType, t.targetId),
]));
export type UserFollow = typeof userFollows.$inferSelect;

// Nightly-computed relevance scores (0168), written by forumAffinityJob.
// Read-optimized: the feed query joins these, never recomputes them.
export const userForumAffinity = mysqlTable("user_forum_affinity", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dimension: mysqlEnum("dimension", ["category", "user", "tag"]).notNull(),
  targetId: varchar("targetId", { length: 64 }).notNull(),
  score: decimal("score", { precision: 8, scale: 4 }).default("0").notNull(),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (t) => ([
  unique("user_forum_affinity_uq").on(t.userId, t.dimension, t.targetId),
  index("user_forum_affinity_user_idx").on(t.userId, t.dimension),
]));
export type UserForumAffinity = typeof userForumAffinity.$inferSelect;

// Query projection of forumPosts.tags (a TEXT column holding a JSON string,
// otherwise only matchable via LIKE scans). Maintained on createPost.
export const forumPostTags = mysqlTable("forum_post_tags", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  tag: varchar("tag", { length: 64 }).notNull(),
}, (t) => ([
  unique("forum_post_tags_uq").on(t.postId, t.tag),
  index("forum_post_tags_tag_idx").on(t.tag),
]));
export type ForumPostTag = typeof forumPostTags.$inferSelect;

// Web push subscriptions (0164). One row per browser endpoint; endpoint is
// unique so re-subscribing upserts. Pruned on 410/404 or repeated failures.
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userAgent: varchar("userAgent", { length: 255 }),
  failureCount: int("failureCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
}, (t) => ([
  unique("push_subscriptions_endpoint_uq").on(t.endpoint),
  index("push_subscriptions_user_idx").on(t.userId),
]));
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Person-level mute. scope 'notifications': their mentions/replies never
// notify or email you. scope 'feed': reserved for the Phase 2 feed ranking.
export const forumUserMutes = mysqlTable("forum_user_mutes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mutedUserId: int("mutedUserId").notNull(),
  scope: mysqlEnum("scope", ["notifications", "feed", "both"]).default("both").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("forum_user_mutes_user_muted_uq").on(t.userId, t.mutedUserId),
]));
export type ForumUserMute = typeof forumUserMutes.$inferSelect;

// Quest Journal (C.3)
export const questJournal = mysqlTable("quest_journal", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  questId: int("questId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  reflection: text("reflection"),
  forumPostId: int("forumPostId"),
}, (t) => ([
  index("quest_journal_player_date_idx").on(t.playerId, t.completedAt),
]));
export type QuestJournalEntry = typeof questJournal.$inferSelect;

// Player Alliances (C.5)
export const playerAlliances = mysqlTable("player_alliances", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  allianceType: mysqlEnum("allianceType", ["land_project", "investor", "partner"]).notNull(),
  allianceName: varchar("allianceName", { length: 200 }).notNull(),
  allianceId: int("allianceId"),
  role: varchar("role", { length: 100 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (t) => ([
  index("player_alliances_player_idx").on(t.playerId),
]));
export type PlayerAlliance = typeof playerAlliances.$inferSelect;

// Vouches (C.9) - trust layer between players
export const vouches = mysqlTable("vouches", {
  id: int("id").autoincrement().primaryKey(),
  voucherId: int("voucherId").notNull(),
  vouchedForId: int("vouchedForId").notNull(),
  vouchedAt: timestamp("vouchedAt").defaultNow().notNull(),
  // Optional context: "worked together at Cascadia Commons"
  note: varchar("note", { length: 200 }),
}, (t) => ([
  unique("unique_vouch").on(t.voucherId, t.vouchedForId),
  index("vouches_vouched_for_idx").on(t.vouchedForId),
]));
export type Vouch = typeof vouches.$inferSelect;

// Seasonal Intentions (C.10)
export const seasonalIntentions = mysqlTable("seasonal_intentions", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  season: varchar("season", { length: 20 }).notNull(),
  year: int("year").notNull(),
  intention: varchar("intention", { length: 300 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("unique_season").on(t.playerId, t.season, t.year),
  index("seasonal_intentions_season_idx").on(t.season, t.year),
]));
export type SeasonalIntention = typeof seasonalIntentions.$inferSelect;

// ─── Citizenship Tier History ──────────────────────────────────────────────
export const citizenshipTierHistory = mysqlTable("citizenship_tier_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromTier: mysqlEnum("fromTier", ["explorer", "co_creator", "steward", "sage"]).notNull(),
  toTier: mysqlEnum("toTier", ["explorer", "co_creator", "steward", "sage"]).notNull(),
  reason: mysqlEnum("reason", ["automatic", "admin_override", "nomination", "grace_period_expired"]).notNull(),
  promotedBy: int("promotedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CitizenshipTierHistoryEntry = typeof citizenshipTierHistory.$inferSelect;

// ─── Seasonal Councils ────────────────────────────────────────────────────
export const seasonalCouncils = mysqlTable("seasonal_councils", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  status: mysqlEnum("status", ["upcoming", "active", "completed"]).default("upcoming"),
  meetingDate: timestamp("meetingDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeasonalCouncil = typeof seasonalCouncils.$inferSelect;

export const seasonalCouncilMembers = mysqlTable("seasonal_council_members", {
  id: int("id").autoincrement().primaryKey(),
  councilId: int("councilId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["top_contributor", "core_team", "elected"]).notNull(),
  attendedAt: timestamp("attendedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeasonalCouncilMember = typeof seasonalCouncilMembers.$inferSelect;

// ─── Lunar Cycles ─────────────────────────────────────────────────────────
export const lunarCycles = mysqlTable("lunar_cycles", {
  id: int("id").autoincrement().primaryKey(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  seasonId: int("seasonId"),
  name: varchar("name", { length: 100 }),
  status: mysqlEnum("status", ["upcoming", "active", "completed"]).default("upcoming"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LunarCycle = typeof lunarCycles.$inferSelect;

// ─── Batch Job Runs ───────────────────────────────────────────────────────
export const batchJobRuns = mysqlTable("batch_job_runs", {
  id: int("id").autoincrement().primaryKey(),
  jobType: varchar("jobType", { length: 50 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["running", "success", "partial_failure", "failed"]).default("running"),
  promotions: int("promotions").default(0),
  demotions: int("demotions").default(0),
  playersProcessed: int("playersProcessed").default(0),
  errors: json("errors"),
  triggeredBy: varchar("triggeredBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BatchJobRun = typeof batchJobRuns.$inferSelect;

// ─── Proposals (standalone signaling system) ──────────────────────────────
export const proposals = mysqlTable("proposals", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "fund_allocation", "game_variable", "new_quest", "food_economy",
    "platform_feature", "community", "bff_initiative", "partnership",
    "community_agreement", "other"
  ]).notNull(),
  status: mysqlEnum("status", [
    "idea", "draft", "signaling", "threshold_reached",
    "in_governance", "passed", "implemented", "declined"
  ]).default("idea"),
  templateType: varchar("templateType", { length: 50 }),
  forumThreadId: int("forumThreadId"),
  signalVoteCount: int("signalVoteCount").default(0),
  bioregionId: int("bioregionId"),
  // Assembly lifecycle (0165): aim line, lanes, last call, resting, launch
  aim: varchar("aim", { length: 300 }),
  lane: mysqlEnum("lane", ["full", "minor"]).default("full").notNull(),
  lastCallStartedAt: timestamp("lastCallStartedAt"),
  restingSince: timestamp("restingSince"),
  readyToLaunchAt: timestamp("readyToLaunchAt"),
  hyphaBridgeKey: varchar("hyphaBridgeKey", { length: 32 }),
  executionPayload: json("executionPayload"),
  objectionLog: json("objectionLog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Proposal = typeof proposals.$inferSelect;

export const proposalVotes = mysqlTable("proposal_votes", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("unique_proposal_vote").on(t.proposalId, t.userId),
]));
export type ProposalVote = typeof proposalVotes.$inferSelect;

// ─── Assembly: the Signal + AI synthesis cache (ASSEMBLY_PAGE_SPEC.md) ─────
// One adjustable -3..+3 signal per member per proposal. Aggregate-only:
// individual scores are never shown to anyone. moveNote is stored only for
// negative scores ("what would move you") and surfaces unattributed.
export const proposalSignals = mysqlTable("proposal_signals", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  userId: int("userId").notNull(),
  score: tinyint("score").notNull(),
  moveNote: varchar("moveNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ([
  unique("unique_proposal_signal").on(t.proposalId, t.userId),
  index("idx_signal_proposal").on(t.proposalId),
]));
export type ProposalSignal = typeof proposalSignals.$inferSelect;

export const proposalSynthesis = mysqlTable("proposal_synthesis", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  pros: json("pros"),
  cons: json("cons"),
  steelman: text("steelman"),
  steelmanAddressed: json("steelmanAddressed"),
  summary: text("summary"),
  sourceReplyCount: int("sourceReplyCount").default(0).notNull(),
  changelog: json("changelog"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ([
  unique("unique_synthesis_proposal").on(t.proposalId),
]));
export type ProposalSynthesis = typeof proposalSynthesis.$inferSelect;

// Append-only record of Evolution Engine executions (0167). Rows only ever
// transition status/detail/executedAt, never disappear.
export const governanceExecutions = mysqlTable("governance_executions", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  kind: mysqlEnum("kind", ["variable_change", "bounds_change", "content", "feature"]).notNull(),
  payload: json("payload").notNull(),
  status: mysqlEnum("status", ["pending", "applied", "shipping", "shipped", "paused", "failed", "rolled_back"]).default("pending").notNull(),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  executedAt: timestamp("executedAt"),
}, (t) => ([
  unique("idx_execution_proposal").on(t.proposalId), // 0172: one execution per proposal, DB-enforced
]));
export type GovernanceExecution = typeof governanceExecutions.$inferSelect;

export const proposalUpdates = mysqlTable("proposal_updates", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProposalUpdate = typeof proposalUpdates.$inferSelect;

// ─── Organisation Ratings ─────────────────────────────────────────────────
export const organisationRatings = mysqlTable("organisation_ratings", {
  id: int("id").autoincrement().primaryKey(),
  raterId: int("raterId").notNull(),
  organisationId: int("organisationId").notNull(),
  soilScore: tinyint("soilScore"),
  biodiversityScore: tinyint("biodiversityScore"),
  waterScore: tinyint("waterScore"),
  chemicalFreeScore: tinyint("chemicalFreeScore"),
  communityScore: tinyint("communityScore"),
  workerWellbeingScore: tinyint("workerWellbeingScore"),
  overallScore: double("overallScore"),
  note: text("note"),
  seasonId: int("seasonId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrganisationRating = typeof organisationRatings.$inferSelect;

// ─── Local Food Applications ──────────────────────────────────────────────
export const localFoodApplications = mysqlTable("local_food_applications", {
  id: int("id").autoincrement().primaryKey(),
  producerName: varchar("producerName", { length: 200 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 200 }).notNull(),
  contactName: varchar("contactName", { length: 200 }).notNull(),
  bioregionId: int("bioregionId"),
  locationLat: double("locationLat"),
  locationLng: double("locationLng"),
  description: text("description"),
  productsOffered: json("productsOffered"),
  regenerativePractices: text("regenerativePractices"),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  localScaleProfileUrl: varchar("localScaleProfileUrl", { length: 500 }),
  needsText: text("needsText"),
  offersText: text("offersText"),
  status: mysqlEnum("status", ["submitted", "under_review", "approved", "active", "declined"]).default("submitted"),
  communityRatingsCount: int("communityRatingsCount").default(0),
  regenerativeScore: double("regenerativeScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LocalFoodApplication = typeof localFoodApplications.$inferSelect;

// ─── Economic Suggestions ─────────────────────────────────────────────────
export const economicSuggestions = mysqlTable("economic_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["open", "in_review", "accepted", "declined"]).default("open"),
  voteCount: int("voteCount").default(0),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EconomicSuggestion = typeof economicSuggestions.$inferSelect;

export const economicSuggestionVotes = mysqlTable("economic_suggestion_votes", {
  id: int("id").autoincrement().primaryKey(),
  suggestionId: int("suggestionId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  unique("unique_suggestion_vote").on(t.suggestionId, t.userId),
]));
export type EconomicSuggestionVote = typeof economicSuggestionVotes.$inferSelect;

// ─── Activity Feed Events ─────────────────────────────────────────────────
export const activityFeedEvents = mysqlTable("activity_feed_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  actorType: varchar("actorType", { length: 20 }).notNull(),
  actorId: int("actorId"),
  targetType: varchar("targetType", { length: 20 }),
  targetId: int("targetId"),
  metadata: json("metadata"),
  visibility: mysqlEnum("visibility", ["public", "community", "admin"]).default("community"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActivityFeedEvent = typeof activityFeedEvents.$inferSelect;

// ─── Quest Unlock Tiers ───────────────────────────────────────────────────
export const questUnlockTiers = mysqlTable("quest_unlock_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  minimumPercentile: int("minimumPercentile").notNull(),
  requiresRitesComplete: boolean("requiresRitesComplete").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestUnlockTier = typeof questUnlockTiers.$inferSelect;

export const questTierAssignments = mysqlTable("quest_tier_assignments", {
  id: int("id").autoincrement().primaryKey(),
  tierId: int("tierId").notNull(),
  questId: int("questId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestTierAssignment = typeof questTierAssignments.$inferSelect;

// ─── SEEDS Token Claims ──────────────────────────────────────────────────

/**
 * Pre-loaded SEEDS purchase transactions from the tlosto.seeds contract on Telos.
 * Imported once from CSV. Read-only lookup table.
 */
export const seedsContributions = mysqlTable("seeds_contributions", {
  id: int("id").autoincrement().primaryKey(),
  recipientAccount: varchar("recipientAccount", { length: 12 }).notNull(),
  transactionId: varchar("transactionId", { length: 16 }).notNull(),
  date: timestamp("date").notNull(),
  usdValueRaw: int("usdValueRaw").notNull(), // Raw value from CSV (divide by 10000 for USD)
  usdValue: double("usdValue").notNull(), // Actual USD value
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("seeds_contributions_account_idx").on(table.recipientAccount),
]);
export type SeedsContribution = typeof seedsContributions.$inferSelect;
export type InsertSeedsContribution = typeof seedsContributions.$inferInsert;

/**
 * User-submitted claims for SEEDS -> $ReGen token conversion.
 * One claim per SEEDS account. Editable until September equinox 2026.
 */
export const seedsClaims = mysqlTable("seeds_claims", {
  id: int("id").autoincrement().primaryKey(),
  seedsAccount: varchar("seedsAccount", { length: 12 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  originalUsdTotal: double("originalUsdTotal").notNull(), // Total USD from our records
  spentUsdAmount: double("spentUsdAmount").default(0).notNull(), // USD they say they spent/sold
  claimedUsdAmount: double("claimedUsdAmount").notNull(), // Final USD claim (original - spent, or custom)
  regenAmount: double("regenAmount").notNull(), // $ReGen = claimedUsdAmount * SEEDS_REGEN_PER_USD (server-derived)
  baseWalletAddress: varchar("baseWalletAddress", { length: 42 }).notNull(), // 0x + 40 hex chars
  isDispute: boolean("isDispute").default(false).notNull(), // True if claiming different amount
  disputeReason: text("disputeReason"), // Why their claim differs (dispute only)
  evidenceUrls: text("evidenceUrls"), // JSON array of uploaded file URLs (dispute only)
  status: mysqlEnum("status", ["pending", "approved", "denied", "flagged"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"), // Admin user ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("seeds_claims_status_idx").on(table.status),
]);
export type SeedsClaim = typeof seedsClaims.$inferSelect;
export type InsertSeedsClaim = typeof seedsClaims.$inferInsert;

// ─── Seasonal Harvests ────────────────────────────────────────────────────
export const seasonalHarvests = mysqlTable("seasonal_harvests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  seasonId: int("seasonId").notNull(),
  questsCompleted: int("questsCompleted").default(0),
  tokensEarned: double("tokensEarned").default(0),
  referralSignups: int("referralSignups").default(0),
  newTier: varchar("newTier", { length: 50 }),
  scoreAtEnd: double("scoreAtEnd").default(0),
  percentileAtEnd: int("percentileAtEnd").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Regen Civilization Tools Library ─────────────────────────────────────

export const regenToolCategories = mysqlTable("regen_tool_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type RegenToolCategory = typeof regenToolCategories.$inferSelect;

export const regenTools = mysqlTable("regen_tools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  websiteUrl: varchar("websiteUrl", { length: 500 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  cardImageUrl: varchar("cardImageUrl", { length: 500 }),
  shortSummary: text("shortSummary"),
  longDescription: text("longDescription"),
  pricingModel: mysqlEnum("pricingModel", ["free", "freemium", "paid", "open_source"]).default("free"),
  gettingStartedUrl: varchar("gettingStartedUrl", { length: 500 }),
  contactEmail: varchar("contactEmail", { length: 255 }),
  isOpenSource: boolean("isOpenSource").default(false),
  isPhysical: boolean("isPhysical").default(false),
  regions: json("regions"),
  integrations: json("integrations"),
  problemStatements: json("problemStatements"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  submittedBy: int("submittedBy"),
  approvedBy: int("approvedBy"),
  totalClicks: int("totalClicks").default(0),
  seasonSpotlight: int("seasonSpotlight"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RegenTool = typeof regenTools.$inferSelect;

export const regenToolCategoryMap = mysqlTable("regen_tool_category_map", {
  toolId: int("toolId").notNull(),
  categoryId: int("categoryId").notNull(),
});

export const regenToolClicks = mysqlTable("regen_tool_clicks", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  userId: int("userId"),
  referrer: varchar("referrer", { length: 255 }),
  clickedAt: timestamp("clickedAt").defaultNow(),
});

export const regenToolEndorsements = mysqlTable("regen_tool_endorsements", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  userId: int("userId").notNull(),
  questId: int("questId"),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const regenToolMentions = mysqlTable("regen_tool_mentions", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("toolId").notNull(),
  postId: int("postId"),
  detectedAt: timestamp("detectedAt").defaultNow(),
});

/**
 * Community song submissions for the Hymn Book.
 * One submission per player per season; community vote elects the winner.
 */
export const songSubmissions = mysqlTable("song_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  seasonId: int("seasonId"),
  title: varchar("title", { length: 200 }).notNull(),
  artist: varchar("artist", { length: 200 }),
  audioUrl: varchar("audioUrl", { length: 500 }).notNull(),
  description: text("description"),
  voteCount: int("voteCount").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | winner | archived
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});
export type SongSubmission = typeof songSubmissions.$inferSelect;

/** One vote per user per season across all submissions for that season. */
export const songSubmissionVotes = mysqlTable("song_submission_votes", {
  id: int("id").autoincrement().primaryKey(),
  songSubmissionId: int("songSubmissionId").notNull(),
  userId: int("userId").notNull(),
  seasonId: int("seasonId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SongSubmissionVote = typeof songSubmissionVotes.$inferSelect;

/* ════════════════════════════════════════════════════════════════════
 * Governance Pipeline (Forum -> ReGen Gov -> Hypha)
 * Migration: 0109_governance_pipeline.sql
 * ════════════════════════════════════════════════════════════════════ */

/** Computed readiness fields per forum thread. Persisted so the gate checks
 * stay cheap and so the green Ready-to-promote button can be derived from
 * a single column read. Recomputed when the thread changes. */
export const forumThreadReadiness = mysqlTable("forumThreadReadiness", {
  forumPostId: int("forumPostId").primaryKey().notNull(),
  ageHours: int("ageHours").default(0).notNull(),
  uniqueVoiceCount: int("uniqueVoiceCount").default(0).notNull(),
  hasDecisionQuestion: tinyint("hasDecisionQuestion").default(0).notNull(),
  trackTagged: mysqlEnum("trackTagged", ["fund", "game", "both"]),
  heatScore: int("heatScore").default(0).notNull(),
  isReadyToPromote: tinyint("isReadyToPromote").default(0).notNull(),
  computedAt: timestamp("computedAt").defaultNow().onUpdateNow().notNull(),
});
export type ForumThreadReadiness = typeof forumThreadReadiness.$inferSelect;

/** Watchers waiting for a thread's promotion gates to all pass so they can be notified. */
export const forumThreadWatchers = mysqlTable("forumThreadWatchers", {
  id: int("id").autoincrement().primaryKey(),
  forumPostId: int("forumPostId").notNull(),
  userId: int("userId").notNull(),
  watchType: mysqlEnum("watchType", ["promotion_ready", "decision_open", "decision_closed"]).default("promotion_ready").notNull(),
  notifiedAt: timestamp("notifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumThreadWatcher = typeof forumThreadWatchers.$inferSelect;

/** Dual-key promotion requests. A proposer files one, a co-signer either signs
 * within the cosigner_window_hours or it expires. */
export const forumPromotionRequests = mysqlTable("forumPromotionRequests", {
  id: int("id").autoincrement().primaryKey(),
  forumPostId: int("forumPostId").notNull(),
  proposerId: int("proposerId").notNull(),
  coSignerId: int("coSignerId"),
  decisionTrack: mysqlEnum("decisionTrack", ["fund", "game", "both"]).notNull(),
  decisionQuestion: varchar("decisionQuestion", { length: 500 }).notNull(),
  suggestedTemplate: varchar("suggestedTemplate", { length: 40 }).default("consent").notNull(),
  reversibility: mysqlEnum("reversibility", ["reversible", "semi_reversible", "one_way_door"]).default("reversible").notNull(),
  bioregionScope: json("bioregionScope"),
  sunsetAt: timestamp("sunsetAt"),
  status: mysqlEnum("status", ["pending", "signed", "expired", "cancelled"]).default("pending").notNull(),
  coSignedAt: timestamp("coSignedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumPromotionRequest = typeof forumPromotionRequests.$inferSelect;

/** Governance perspective signal — one row per (threadId, userId), updated in place.
 *  Records where a member stands on a thread in Sensing or Proposal stage. */
export const forumPerspectives = mysqlTable("forumPerspectives", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  userId: int("userId").notNull(),
  perspective: mysqlEnum("perspective", [
    "support",
    "can_live_with",
    "see_differently",
    "need_to_understand",
    "serious_concern",
  ]).notNull(),
  weight: double("weight").notNull().default(1.0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  threadUserUnique: unique("forumPerspectives_thread_user").on(t.threadId, t.userId),
  threadIdIdx: index("forumPerspectives_threadId_idx").on(t.threadId),
  userIdIdx: index("forumPerspectives_userId_idx").on(t.userId),
}));
export type ForumPerspective = typeof forumPerspectives.$inferSelect;

/** Decisions that originated from a forum thread. One row per (thread, decision) pair. */
export const forumPostDecisions = mysqlTable("forumPostDecisions", {
  id: int("id").autoincrement().primaryKey(),
  forumPostId: int("forumPostId").notNull(),
  track: mysqlEnum("track", ["fund", "game", "both"]).default("game").notNull(),
  reversibility: mysqlEnum("reversibility", ["reversible", "semi_reversible", "one_way_door"]).default("reversible").notNull(),
  bioregionScope: json("bioregionScope"),
  sunsetAt: timestamp("sunsetAt"),
  status: mysqlEnum("status", ["draft", "open", "closing_soon", "closed", "ratified", "declined", "cancelled"]).default("draft").notNull(),
  closesAt: timestamp("closesAt"),
  closedAt: timestamp("closedAt"),
  outcomeSummary: text("outcomeSummary"),
  outcomeReasoning: text("outcomeReasoning"),
  stanceCount: int("stanceCount").default(0).notNull(),
  weightedStanceSummary: json("weightedStanceSummary"),
  hyphaBridgeId: int("hyphaBridgeId"),
  storytellerId: int("storytellerId"),
  storytellerNarrativeId: int("storytellerNarrativeId"),
  proposerId: int("proposerId").notNull(),
  coSignerId: int("coSignerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ForumPostDecision = typeof forumPostDecisions.$inferSelect;

/** Multi-tenant governance: bioregions, land projects, organizations, and the platform itself. */
export const governanceTenants = mysqlTable("governanceTenants", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  tenantType: mysqlEnum("tenantType", ["platform", "bioregion", "land_project", "organization"]).notNull(),
  displayName: varchar("displayName", { length: 200 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logoUrl", { length: 400 }),
  bannerUrl: varchar("bannerUrl", { length: 400 }),
  accentColor: varchar("accentColor", { length: 20 }),
  hyphaDhoSlug: varchar("hyphaDhoSlug", { length: 80 }),
  parentTenantId: int("parentTenantId"),
  ownerUserId: int("ownerUserId").notNull(),
  allowedBioregions: json("allowedBioregions"),
  config: json("config"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GovernanceTenant = typeof governanceTenants.$inferSelect;

export const governanceTenantMembers = mysqlTable("governanceTenantMembers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["member", "moderator", "steward", "admin"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});
export type GovernanceTenantMember = typeof governanceTenantMembers.$inferSelect;

/** Internal token ledger. Per-tenant, per-user. Tokens accumulate here and
 * are claimed to Hypha on Base when the user crosses the claim threshold. */
export const governanceTokenLedger = mysqlTable("governanceTokenLedger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId").notNull(),
  amount: double("amount").notNull(),
  type: mysqlEnum("type", ["harvest", "gratitude", "grant", "expense", "adjustment", "claim"]).notNull(),
  sourceRef: varchar("sourceRef", { length: 120 }),
  description: varchar("description", { length: 400 }),
  claimedAt: timestamp("claimedAt"),
  hyphaBridgeId: int("hyphaBridgeId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GovernanceTokenLedger = typeof governanceTokenLedger.$inferSelect;

/** Ratified agreements that came out of a governance decision. The living rule book per tenant. */
export const governanceAgreements = mysqlTable("governanceAgreements", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  forumPostDecisionId: int("forumPostDecisionId"),
  title: varchar("title", { length: 300 }).notNull(),
  text: text("text").notNull(),
  ratifiedAt: timestamp("ratifiedAt").defaultNow().notNull(),
  sunsetAt: timestamp("sunsetAt"),
  renewalThreadId: int("renewalThreadId"),
  status: mysqlEnum("status", ["active", "sunsetted", "superseded", "withdrawn"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GovernanceAgreement = typeof governanceAgreements.$inferSelect;

/** The Hypha Bridge: every handoff from ReGen Civics to Hypha on Base goes through here.
 * One source of truth for forum decisions, crowdpool, contribution claims, expenses, exits. */
export const hyphaBridges = mysqlTable("hyphaBridges", {
  id: int("id").autoincrement().primaryKey(),
  bridgeKey: varchar("bridgeKey", { length: 16 }).notNull().unique(),
  source: mysqlEnum("source", ["loomio_decision", "crowdpool", "contribution_claim", "fund_grant", "expense", "exit", "redeem_tokens", "quest_completion", "other"]).notNull(),
  sourceId: varchar("sourceId", { length: 80 }).notNull(),
  targetDhoSlug: varchar("targetDhoSlug", { length: 80 }).notNull(),
  formKind: mysqlEnum("formKind", [
    "propose_contribution",
    "deploy_funds",
    "pay_for_expenses",
    "membership_exit",
    "buy_hypha_tokens",
    "redeem_tokens",
    "activate_spaces",
    "change_entry_method",
    "change_voting_method",
    "space_settings_transparency",
    "space_to_space_membership",
  ]).notNull(),
  initiatorUserId: int("initiatorUserId").notNull(),
  payload: json("payload").notNull(),
  status: mysqlEnum("status", ["created", "handoff_sent", "on_chain_detected", "passed", "failed", "cancelled"]).default("created").notNull(),
  hyphaProposalId: varchar("hyphaProposalId", { length: 80 }),
  hyphaTxHash: varchar("hyphaTxHash", { length: 80 }),
  hyphaPassedAt: timestamp("hyphaPassedAt"),
  hyphaTokenAmount: double("hyphaTokenAmount"),
  hyphaTokenSymbol: varchar("hyphaTokenSymbol", { length: 20 }),
  hyphaRecipientWallet: varchar("hyphaRecipientWallet", { length: 60 }),
  basescanUrl: varchar("basescanUrl", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type HyphaBridge = typeof hyphaBridges.$inferSelect;

/* ════════════════════════════════════════════════════════════════════
 * Governance Phase 2 (lineage, back field, straw polls, storytellers, delegations)
 * Migration: 0110_governance_phase2.sql
 * ════════════════════════════════════════════════════════════════════ */

export const decisionLineage = mysqlTable("decisionLineage", {
  id: int("id").autoincrement().primaryKey(),
  childDecisionId: int("childDecisionId").notNull(),
  parentDecisionId: int("parentDecisionId").notNull(),
  relationship: mysqlEnum("relationship", ["builds_on", "supersedes", "references"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DecisionLineage = typeof decisionLineage.$inferSelect;

/** The Back Field. Good ideas resting until they're ready. Renamed from
 * "parking lot" per Rye, echoing fallow agricultural fields. */
export const governanceBackField = mysqlTable("governanceBackField", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  forumPostId: int("forumPostId"),
  proposerId: int("proposerId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  summary: text("summary").notNull(),
  reason: varchar("reason", { length: 500 }),
  status: mysqlEnum("status", ["parked", "reviewing", "promoted", "retired"]).default("parked").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"),
  promotedToDecisionId: int("promotedToDecisionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GovernanceBackField = typeof governanceBackField.$inferSelect;

export const decisionStorytellerNarratives = mysqlTable("decisionStorytellerNarratives", {
  id: int("id").autoincrement().primaryKey(),
  forumPostDecisionId: int("forumPostDecisionId").notNull(),
  storytellerId: int("storytellerId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  narrativeBody: text("narrativeBody").notNull(),
  wordCount: int("wordCount").default(0).notNull(),
  publishedAt: timestamp("publishedAt"),
  status: mysqlEnum("status", ["drafting", "submitted", "published"]).default("drafting").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DecisionStorytellerNarrative = typeof decisionStorytellerNarratives.$inferSelect;

/** Lightweight in-thread polls. Non-binding temperature checks. */
export const forumStrawPolls = mysqlTable("forumStrawPolls", {
  id: int("id").autoincrement().primaryKey(),
  forumPostId: int("forumPostId").notNull(),
  forumReplyId: int("forumReplyId"),
  creatorId: int("creatorId").notNull(),
  question: varchar("question", { length: 300 }).notNull(),
  options: json("options").notNull(),
  closesAt: timestamp("closesAt").notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumStrawPoll = typeof forumStrawPolls.$inferSelect;

export const forumStrawPollVotes = mysqlTable("forumStrawPollVotes", {
  id: int("id").autoincrement().primaryKey(),
  strawPollId: int("strawPollId").notNull(),
  userId: int("userId").notNull(),
  choice: varchar("choice", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ForumStrawPollVote = typeof forumStrawPollVotes.$inferSelect;

/** Proxy delegation: a citizen delegates their stance on specific topic tags
 * to another citizen. Revocable per-decision. Max hop count enforced in code. */
export const governanceDelegations = mysqlTable("governanceDelegations", {
  id: int("id").autoincrement().primaryKey(),
  delegatorId: int("delegatorId").notNull(),
  delegateId: int("delegateId").notNull(),
  topicTags: json("topicTags").notNull(),
  tenantId: int("tenantId"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GovernanceDelegation = typeof governanceDelegations.$inferSelect;

/** Pre-mortem concerns posted on the companion sub-poll. The proposer has to
 * write a brief response to the top-N before the main decision can close. */
export const governancePreMortemConcerns = mysqlTable("governancePreMortemConcerns", {
  id: int("id").autoincrement().primaryKey(),
  forumPostDecisionId: int("forumPostDecisionId").notNull(),
  authorId: int("authorId").notNull(),
  concernText: varchar("concernText", { length: 800 }).notNull(),
  agreeCount: int("agreeCount").default(0).notNull(),
  proposerResponse: text("proposerResponse"),
  proposerRespondedAt: timestamp("proposerRespondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GovernancePreMortemConcern = typeof governancePreMortemConcerns.$inferSelect;

/* ════════════════════════════════════════════════════════════════════
 * Gov App Sprint 2: Proposals, Comments, Votes
 * Migration: 0114_gov_proposals.sql
 * ════════════════════════════════════════════════════════════════════ */

export const govProposals = mysqlTable("govProposals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "discussion", "polling", "staged", "sent_to_hypha", "ratified", "declined", "withdrawn"]).default("draft"),
  decisionMethod: mysqlEnum("decisionMethod", ["consent", "advice", "consensus", "mandate"]).default("consent"),
  track: mysqlEnum("track", ["fund", "game", "operational"]).default("game"),
  urgentTag: tinyint("urgentTag").default(0),
  bioregionId: int("bioregionId"),
  seasonId: int("seasonId"),
  sourceForumThreadId: int("sourceForumThreadId"),
  minDiscussionDays: int("minDiscussionDays").default(3),
  pollingDurationDays: int("pollingDurationDays").default(5),
  discussionOpenedAt: timestamp("discussionOpenedAt"),
  pollingOpenedAt: timestamp("pollingOpenedAt"),
  pollingClosesAt: timestamp("pollingClosesAt"),
  outcomeText: text("outcomeText"),
  outcomeAuthorId: int("outcomeAuthorId"),
  hyphaProposalId: varchar("hyphaProposalId", { length: 255 }),
  hyphaBridgeKey: varchar("hyphaBridgeKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GovProposal = typeof govProposals.$inferSelect;

export const govComments = mysqlTable("govComments", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  authorId: int("authorId").notNull(),
  parentId: int("parentId"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GovComment = typeof govComments.$inferSelect;

export const govVotes = mysqlTable("govVotes", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  voterId: int("voterId").notNull(),
  stance: mysqlEnum("stance", ["agree", "disagree", "abstain", "block"]).notNull(),
  reason: text("reason"),
  delegatedFromId: int("delegatedFromId"),
  weight: int("weight").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GovVote = typeof govVotes.$inferSelect;

export const govDashboardPrefs = mysqlTable("govDashboardPrefs", {
  userId: int("userId").primaryKey().notNull(),
  primaryBioregionId: int("primaryBioregionId"),
  dashboardLayout: mysqlEnum("dashboardLayout", ["compact", "full"]).default("compact"),
  notificationPrefs: json("notificationPrefs"),
  hasSeenWelcome: tinyint("hasSeenWelcome").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/* ════════════════════════════════════════════════════════════════════
 * Gov App Sprint 7: Historical Contribution Claim Flow
 * Migration: 0117_historical_claims.sql
 * ════════════════════════════════════════════════════════════════════ */

export const historicalClaims = mysqlTable("historicalClaims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  claimType: mysqlEnum("claimType", ["individual", "organization"]).notNull(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  orgDescription: text("orgDescription"),

  formsOfCapital: json("formsOfCapital").notNull(),
  duration: mysqlEnum("duration", ["under_1_year", "1_3_years", "3_5_years", "5_10_years", "10_plus_years"]),
  reach: varchar("reach", { length: 50 }),
  tangibleOutputs: json("tangibleOutputs").notNull(),
  description: text("description"),
  evidenceLinks: json("evidenceLinks").notNull(),
  whatsAlive: text("whatsAlive"),

  suggestedTier: varchar("suggestedTier", { length: 50 }),
  suggestedTierUsd: int("suggestedTierUsd"),
  suggestedTierTokens: bigint("suggestedTierTokens", { mode: "number" }),
  contributorOverride: mysqlEnum("contributorOverride", ["accept", "higher", "lower"]).default("accept"),
  overrideReason: text("overrideReason"),

  routeToToolsLibrary: tinyint("routeToToolsLibrary").default(0),
  routeToLocalScale: tinyint("routeToLocalScale").default(0),
  routeToGovernance: tinyint("routeToGovernance").default(0),
  routeToMentoring: tinyint("routeToMentoring").default(0),
  routeToFundPathway: tinyint("routeToFundPathway").default(0),

  status: mysqlEnum("status", ["draft", "submitted", "under_review", "approved", "adjusted", "flagged", "ratified", "published"]).notNull().default("draft"),
  currentStep: int("currentStep").notNull().default(1),

  reviewerId: int("reviewerId"),
  reviewedAt: timestamp("reviewedAt"),
  reviewDecision: mysqlEnum("reviewDecision", ["confirmed", "adjusted", "flagged"]),
  reviewNote: text("reviewNote"),
  adjustedTier: varchar("adjustedTier", { length: 50 }),
  adjustedTierUsd: int("adjustedTierUsd"),
  adjustedTierTokens: bigint("adjustedTierTokens", { mode: "number" }),

  finalTier: varchar("finalTier", { length: 50 }),
  finalTierUsd: int("finalTierUsd"),
  finalTierTokens: bigint("finalTierTokens", { mode: "number" }),
  ratifiedAt: timestamp("ratifiedAt"),
  proposalPartyId: int("proposalPartyId"),

  improvementSuggestion: text("improvementSuggestion"),
  improvementPostedToForum: tinyint("improvementPostedToForum").default(0),
  improvementForumPostId: int("improvementForumPostId"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  publishedAt: timestamp("publishedAt"),
});
export type HistoricalClaim = typeof historicalClaims.$inferSelect;

export const toolsLibraryEntries = mysqlTable("toolsLibraryEntries", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  contributorUserId: int("contributorUserId").notNull(),
  toolName: varchar("toolName", { length: 255 }).notNull(),
  toolDescription: text("toolDescription").notNull(),
  toolType: mysqlEnum("toolType", [
    "tool_software",
    "curriculum_course",
    "methodology_framework",
    "templates_guides",
    "physical_space",
    "network_community",
    "publications_research",
    "art_media",
    "financial_infrastructure",
    "other",
  ]).notNull(),
  capitalForm: varchar("capitalForm", { length: 50 }),
  accessLink: text("accessLink"),
  usageNotes: text("usageNotes"),
  status: mysqlEnum("status", ["pending", "published"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ToolsLibraryEntry = typeof toolsLibraryEntries.$inferSelect;

/**
 * Analytics events sink (first-party).
 *
 * Stores events posted by `client/src/lib/analytics.ts` through the public
 * `POST /api/analytics/collect` route. IP is hashed before insert so we can
 * rate-limit and run abuse forensics without storing raw IPs. Mirrors
 * migration 0136_analytics_events.sql.
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  event: varchar("event", { length: 64 }).notNull(),
  props: json("props"),
  path: varchar("path", { length: 255 }),
  ref: varchar("ref", { length: 512 }),
  sid: varchar("sid", { length: 64 }),
  userId: int("userId"),
  ipHash: varchar("ipHash", { length: 64 }),
  ua: varchar("ua", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// ── Plays (community culture franchise packages) ──────────────────────

export const plays = mysqlTable("plays", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  creatorProjectName: varchar("creatorProjectName", { length: 300 }),
  creatorUserId: int("creatorUserId"),
  summary: text("summary"),
  coverImageUrl: varchar("coverImageUrl", { length: 500 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  pricingModel: mysqlEnum("pricingModel", ["free", "open_source", "paid"]).default("open_source"),
  priceRegenTokens: int("priceRegenTokens"),
  externalPaymentUrl: varchar("externalPaymentUrl", { length: 500 }),
  externalPriceLabel: varchar("externalPriceLabel", { length: 100 }),
  scale: mysqlEnum("scale", ["small", "medium", "large"]).default("medium"),
  communityType: varchar("communityType", { length: 100 }),
  sectionIdentity: text("sectionIdentity"),
  sectionGovernance: text("sectionGovernance"),
  sectionEconomics: text("sectionEconomics"),
  sectionLegal: text("sectionLegal"),
  sectionRoles: text("sectionRoles"),
  sectionSeasons: text("sectionSeasons"),
  sectionLandEcology: text("sectionLandEcology"),
  sectionAgreements: text("sectionAgreements"),
  sectionConflict: text("sectionConflict"),
  sectionHealth: text("sectionHealth"),
  sectionEducation: text("sectionEducation"),
  sectionCulture: text("sectionCulture"),
  sectionExternalRelations: text("sectionExternalRelations"),
  sectionScaling: text("sectionScaling"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  submittedBy: int("submittedBy"),
  approvedBy: int("approvedBy"),
  totalViews: int("totalViews").default(0),
  totalAdoptions: int("totalAdoptions").default(0),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Play = typeof plays.$inferSelect;

export const playCategories = mysqlTable("play_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
});
export type PlayCategory = typeof playCategories.$inferSelect;

export const playCategoryMap = mysqlTable("play_category_map", {
  playId: int("playId").notNull(),
  categoryId: int("categoryId").notNull(),
});

export const playEndorsements = mysqlTable("play_endorsements", {
  id: int("id").autoincrement().primaryKey(),
  playId: int("playId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const playAdoptions = mysqlTable("play_adoptions", {
  id: int("id").autoincrement().primaryKey(),
  playId: int("playId").notNull(),
  userId: int("userId").notNull(),
  projectName: varchar("projectName", { length: 300 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const playViews = mysqlTable("play_views", {
  id: int("id").autoincrement().primaryKey(),
  playId: int("playId").notNull(),
  userId: int("userId"),
  referrer: varchar("referrer", { length: 500 }),
  viewedAt: timestamp("viewedAt").defaultNow(),
});

/**
 * Standing admin automations: scheduled routines the executive-assistant layer
 * runs for the CEO. v1 routines are read-only digests (briefing_digest,
 * attention_digest) so nothing mutates on a timer. The actionId/actionInput
 * columns exist so a future "run a registry action on a schedule" routine can
 * reuse the same table once a reversible, criteria-based action is designed.
 */
export const adminAutomations = mysqlTable("admin_automations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  type: mysqlEnum("type", ["briefing_digest", "attention_digest", "registry_action"]).notNull(),
  cadence: mysqlEnum("cadence", ["hourly", "daily", "every_other_day", "weekly"]).default("daily").notNull(),
  enabled: tinyint("enabled").default(1).notNull(),
  /** Optional registry action id + input for type=registry_action (future). */
  actionId: varchar("actionId", { length: 80 }),
  actionInput: json("actionInput"),
  createdBy: int("createdBy").notNull(),
  lastRunAt: timestamp("lastRunAt"),
  lastResult: text("lastResult"),
  runCount: int("runCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// proposalParties: live community proposal-review sessions consumed by
// server/routes/claims.ts. Restored after the Plays batch accidentally
// dropped it during the schema rewrite.
export const proposalParties = mysqlTable("proposalParties", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  season: int("season").notNull().default(1),
  videoLink: text("videoLink"),
  recordingLink: text("recordingLink"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed"]).notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProposalParty = typeof proposalParties.$inferSelect;

// ── Bounty Engine ─────────────────────────────────────────────────────────────

export const bounties = mysqlTable("bounties", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["call_task", "contribution"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  tokenType: varchar("tokenType", { length: 16 }).notNull().default("regen"),
  tier: mysqlEnum("tier", ["trivial", "small", "medium", "large"]),
  workStatus: mysqlEnum("workStatus", ["proposed", "accepted", "open", "claimed", "in_review", "completed", "declined", "expired"]).notNull().default("proposed"),
  approvedBy: int("approvedBy"),
  declinedReason: text("declinedReason"),
  completionChecklist: json("completionChecklist"),
  expiresAt: timestamp("expiresAt"),
  kind: mysqlEnum("kind", ["fix", "feature"]),
  sourceForumPostId: int("sourceForumPostId"),
  githubRepo: varchar("githubRepo", { length: 255 }),
  githubIssueNumber: int("githubIssueNumber"),
  mergedPrNumbers: json("mergedPrNumbers"),
  recordingId: int("recordingId"),
  roleSlug: varchar("roleSlug", { length: 64 }),
  evidenceQuote: text("evidenceQuote"),
  evidenceTs: int("evidenceTs"),
  // Valuation engine (migration 0153). The full breakdown that produced the
  // amount (base/impact/priority/demand/anchor/precedentMedian/token), stored
  // so every reward is explainable; the sociocratic overview the extract-tasks
  // pass generates (purpose/whyThisRole/steps/definitionOfDone/consentCircle);
  // and the hard-to-fill flag the priority factor reads.
  valuationBreakdown: json("valuationBreakdown"),
  sociocraticOverviewJson: json("sociocraticOverviewJson"),
  priorityBoost: boolean("priorityBoost").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("bounties_status_type_idx").on(table.workStatus, table.sourceType),
]));
export type Bounty = typeof bounties.$inferSelect;

export const bountyRoles = mysqlTable("bounty_roles", {
  id: int("id").autoincrement().primaryKey(),
  bountyId: int("bountyId").notNull(),
  role: mysqlEnum("role", ["doer", "proposer", "shipper", "reviewer", "booster"]).notNull(),
  userId: int("userId"),
  amount: int("amount").notNull().default(0),
  payStatus: mysqlEnum("payStatus", ["unfilled", "filled", "payable", "held", "paid", "reversed", "void"]).notNull().default("unfilled"),
  ledgerId: int("ledgerId"),
  filledByLog: json("filledByLog"),
  paidAt: timestamp("paidAt"),
  claimableAt: timestamp("claimableAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("bounty_roles_bountyId_idx").on(table.bountyId),
  index("bounty_roles_user_pay_idx").on(table.userId, table.payStatus),
]));
export type BountyRole = typeof bountyRoles.$inferSelect;

export const bountyEvents = mysqlTable("bounty_events", {
  id: int("id").autoincrement().primaryKey(),
  bountyId: int("bountyId").notNull(),
  roleId: int("roleId"),
  actorUserId: int("actorUserId"),
  event: varchar("event", { length: 48 }).notNull(),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("bounty_events_bountyId_createdAt_idx").on(table.bountyId, table.createdAt),
]));
export type BountyEvent = typeof bountyEvents.$inferSelect;

// Learned per (circle, scopeTier) by the daily coordination flywheel
// (migration 0153). `factor` is the bounded demand multiplier that rises when
// bounties of this kind go unclaimed and falls gently when they are claimed
// fast; `precedentMedian` is the median amount of completed bounties in the
// rolling window. computeBountyAmount reads both. See
// BOUNTY_VALUATION_ENGINE_SPEC.md, "the self-learning loop".
export const bountyDemandFactors = mysqlTable("bounty_demand_factors", {
  id: int("id").autoincrement().primaryKey(),
  circle: varchar("circle", { length: 128 }).notNull(),
  scopeTier: mysqlEnum("scopeTier", ["trivial", "small", "medium", "large"]).notNull(),
  factor: double("factor").notNull().default(1),
  precedentMedian: double("precedentMedian"),
  sampleSize: int("sampleSize").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  unique("bounty_demand_factors_circle_tier").on(table.circle, table.scopeTier),
]));
export type BountyDemandFactor = typeof bountyDemandFactors.$inferSelect;

// Proof-of-work a call-task doer submits before a maintainer completes + pays.
// Mirrors the quest_completions artifact shape. Keyed to the bounty + submitter.
export const bountyArtifacts = mysqlTable("bounty_artifacts", {
  id: int("id").autoincrement().primaryKey(),
  bountyId: int("bountyId").notNull(),
  roleId: int("roleId"),
  userId: int("userId").notNull(),
  artifactType: mysqlEnum("artifactType", ["photo", "text", "link", "video"]).notNull().default("text"),
  artifactUrl: varchar("artifactUrl", { length: 1000 }),
  artifactText: text("artifactText"),
  caption: varchar("caption", { length: 500 }),
  videoThumbnailUrl: varchar("videoThumbnailUrl", { length: 1000 }),
  videoDurationSeconds: int("videoDurationSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("bounty_artifacts_bountyId_idx").on(table.bountyId),
]));
export type BountyArtifact = typeof bountyArtifacts.$inferSelect;

export const webhookDeliveries = mysqlTable("webhook_deliveries", {
  deliveryId: varchar("deliveryId", { length: 64 }).primaryKey(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

export const bountyPermissions = mysqlTable("bounty_permissions", {
  userId: int("userId").primaryKey(),
  canAccept: tinyint("canAccept").notNull().default(0),
  canReverse: tinyint("canReverse").notNull().default(0),
  grantedBy: int("grantedBy"),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
});
export type BountyPermission = typeof bountyPermissions.$inferSelect;

// ---------------------------------------------------------------------------
// Church of the Regenerative Earth (CORE) - core.regencivics.earth
// Tables for the church subdomain: data-driven Steward payment rights,
// donations + payouts ledger, elder chat log, and the elder retrieval corpus.
// DDL applied by drizzle/0153_core_church.sql (Rye runs the migration); the
// role enum was renamed priest/priestess -> steward by drizzle/0155_core_steward_rename.sql
// (ADR-20). ADR-18 in .ai/docs/DECISIONS.md.
// ---------------------------------------------------------------------------

// Who may accept and make payments on behalf of the church (the church's
// Stewards). The role check is DATA-DRIVEN (this table), never hardcoded
// names or user IDs, so governance can grant and revoke through the
// community tools without a code change. A holder is active when revokedAt
// IS NULL. The two initial holders are seeded by Rye after deploy (see
// handoff), not committed to source.
export const churchRoleHolders = mysqlTable("church_role_holders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["steward"]).notNull(),
  canAcceptPayments: tinyint("canAcceptPayments").notNull().default(0),
  canMakePayments: tinyint("canMakePayments").notNull().default(0),
  grantedBy: int("grantedBy"),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => ([
  index("church_role_holders_userId_idx").on(table.userId),
  index("church_role_holders_active_idx").on(table.userId, table.revokedAt),
]));
export type ChurchRoleHolder = typeof churchRoleHolders.$inferSelect;

// Donations and tithes through Zeffy (preferred, zero platform fees) or Stripe
// (secondary fallback). Append-only in spirit: once a row is `succeeded`, never
// mutate amountCents. Giving can be anonymous (donorUserId and donorEmail both
// nullable). `giftInterval` avoids the MySQL reserved word `interval`. See
// ADR-19 for the provider decision.
export const churchDonations = mysqlTable("church_donations", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["stripe", "zeffy"]).notNull().default("stripe"),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  stripePaymentIntent: varchar("stripePaymentIntent", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  zeffyPaymentId: varchar("zeffyPaymentId", { length: 255 }),
  zeffyCampaignId: varchar("zeffyCampaignId", { length: 255 }),
  donorUserId: int("donorUserId"),
  donorEmail: varchar("donorEmail", { length: 320 }),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("usd"),
  giftInterval: mysqlEnum("giftInterval", ["one_time", "monthly"]).notNull().default("one_time"),
  status: mysqlEnum("status", ["pending", "succeeded", "failed", "refunded"]).notNull().default("pending"),
  // Program tag (e.g. regen_ship_gift) + optional crew profile ref so ship-gift
  // revenue is segmentable by crew in Reconciliation/Transparency.
  program: varchar("program", { length: 64 }),
  crewProfileId: int("crewProfileId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  unique("church_donations_session_uq").on(table.stripeSessionId),
  unique("church_donations_zeffy_payment_uq").on(table.zeffyPaymentId),
  index("church_donations_donor_idx").on(table.donorUserId),
  index("church_donations_status_idx").on(table.status),
  index("church_donations_provider_idx").on(table.provider, table.status),
]));
export type ChurchDonation = typeof churchDonations.$inferSelect;

// Ledger of payments MADE by the church. This records intent and reconciliation
// only; actual money movement happens through the church bank account and Stripe
// balance as a human action by a Steward. Guarded by
// assertCanMakePayments. No autonomous external transfer is ever initiated here.
export const churchPayouts = mysqlTable("church_payouts", {
  id: int("id").autoincrement().primaryKey(),
  initiatedByUserId: int("initiatedByUserId").notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("usd"),
  purpose: varchar("purpose", { length: 500 }).notNull(),
  destinationRef: varchar("destinationRef", { length: 500 }),
  status: mysqlEnum("status", ["recorded", "reconciled", "void"]).notNull().default("recorded"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("church_payouts_initiator_idx").on(table.initiatedByUserId),
]));
export type ChurchPayout = typeof churchPayouts.$inferSelect;

// Ask Anastasia transcript log, for moderation, rate limiting, and retrieval
// tuning. Stores only what the user types plus the model reply; no PII beyond
// that. `elder` defaults to anastasia so a second elder is just another value.
export const elderChatMessages = mysqlTable("elder_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  elder: varchar("elder", { length: 64 }).notNull().default("anastasia"),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  retrievedChunkIds: json("retrievedChunkIds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("elder_chat_session_idx").on(table.sessionId, table.createdAt),
  index("elder_chat_elder_idx").on(table.elder, table.createdAt),
]));
export type ElderChatMessage = typeof elderChatMessages.$inferSelect;

// The elder retrieval corpus. Chunks of anastasia_canon.md with metadata.
// `embedding` holds a Voyage vector (Option A) and is null until the corpus
// script runs with VOYAGE_API_KEY; a MySQL FULLTEXT index on `content` (added
// in the SQL migration) powers the keyword fallback (Option B). Retrieval
// prefers embeddings when present and falls back to FULLTEXT otherwise.
export const elderCorpusChunks = mysqlTable("elder_corpus_chunks", {
  id: int("id").autoincrement().primaryKey(),
  elder: varchar("elder", { length: 64 }).notNull().default("anastasia"),
  book: varchar("book", { length: 255 }),
  section: varchar("section", { length: 512 }),
  chunkIndex: int("chunkIndex").notNull(),
  content: text("content").notNull(),
  contentTokens: int("contentTokens"),
  embedding: json("embedding"),
  embeddingModel: varchar("embeddingModel", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("elder_corpus_elder_idx").on(table.elder, table.chunkIndex),
]));
export type ElderCorpusChunk = typeof elderCorpusChunks.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// ReGen Ship (CORE program). The regenerative pirate ship + ReGen Fleet.
// See CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md and ADR entries for
// ReGen Ship. Loose-FK convention: nullable int columns reference other tables
// by id without an enforced constraint, matching the rest of this schema.
// ─────────────────────────────────────────────────────────────────────────────

// Treasure-map locations: land projects, springs, waterfalls, food forests,
// seed sites, boondocks, event venues. Verified rows render on the public map.
export const shipLocations = mysqlTable("ship_locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  type: mysqlEnum("type", [
    "land_project", "spring", "waterfall", "lake", "geology",
    "forest", "food_forest", "seed_site", "boondock", "event_venue",
    "commercial_boondock",
  ]).notNull(),
  // Provenance (ADR-35). NULL for hand-suggested crew pins. Bulk imports stamp
  // where each pin came from and under what license; the detail drawer shows it.
  source: varchar("source", { length: 40 }),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  sourceLicense: varchar("sourceLicense", { length: 40 }),
  externalId: varchar("externalId", { length: 128 }),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),
  bioregion: varchar("bioregion", { length: 64 }).notNull().default("cascadia"),
  region: varchar("region", { length: 64 }),
  description: text("description"),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  imageUrl: varchar("imageUrl", { length: 512 }),
  // Field-verifiable columns (boondocks + springs). maxRigLengthFt drives the
  // "fits 40 ft" filter; waterQualityUrl links spring test results.
  maxRigLengthFt: int("maxRigLengthFt"),
  accessNotes: text("accessNotes"),
  waterQualityUrl: varchar("waterQualityUrl", { length: 512 }),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  verifiedCount: int("verifiedCount").notNull().default(0),
  isVerified: boolean("isVerified").notNull().default(false),
  addedByUserId: int("addedByUserId"),
  linkedEventId: int("linkedEventId"),
  linkedApplicationId: int("linkedApplicationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("ship_locations_type_idx").on(table.type),
  index("ship_locations_verified_idx").on(table.isVerified),
  index("ship_locations_bioregion_idx").on(table.bioregion),
  index("ship_locations_source_idx").on(table.source),
  uniqueIndex("ship_locations_source_external_idx").on(table.source, table.externalId),
]));
export type ShipLocation = typeof shipLocations.$inferSelect;
export type InsertShipLocation = typeof shipLocations.$inferInsert;

// Field-verification flags: a crew reports a problem with a pin (gate locked,
// spring dry, rig no longer fits). Feeds the admin queue. See ADR-35.
export const shipLocationFlags = mysqlTable("ship_location_flags", {
  id: int("id").autoincrement().primaryKey(),
  locationId: int("locationId").notNull(),
  userId: int("userId"),
  reason: varchar("reason", { length: 500 }).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedByUserId: int("resolvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_location_flags_location_idx").on(table.locationId),
  index("ship_location_flags_open_idx").on(table.resolvedAt),
]));
export type ShipLocationFlag = typeof shipLocationFlags.$inferSelect;

// Voyage bookings. Our calendar is the source of truth; the platform rental is
// a separate legal charge. Dates are YYYY-MM-DD strings for easy comparison.
export const shipBookings = mysqlTable("ship_bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }).notNull(),
  guests: int("guests").notNull().default(1),
  /** How many of the crew are children (the fifth berth opens only for a family). */
  children: int("children").notNull().default(0),
  status: mysqlEnum("status", [
    "requested", "approved", "platform_pending", "confirmed",
    "active", "completed", "cancelled",
  ]).notNull().default("requested"),
  /** Keeper-run orientation gate: set when the 2-hour walkthrough is complete. */
  orientationCompletedAt: timestamp("orientationCompletedAt"),
  orientationKeeperId: int("orientationKeeperId"),
  /** Crew roles for this voyage: { captain, navigator, quartermaster, bosun, seedKeeper }. */
  crewRoles: json("crewRoles"),
  /** Pre-sail checklist completions, one per drive: [{ at, byName }]. */
  preSailLog: json("preSailLog"),
  /** Public slug for the Homecoming recap page, minted when the voyage completes. */
  publicSlug: varchar("publicSlug", { length: 80 }),
  /** Crew can hide the whole Homecoming page. */
  homecomingHidden: boolean("homecomingHidden").notNull().default(false),
  platformBookingRef: varchar("platformBookingRef", { length: 255 }),
  dietCommitmentAt: timestamp("dietCommitmentAt"),
  waterDoctrineCommitmentAt: timestamp("waterDoctrineCommitmentAt"),
  /** Voyage Covenant acceptance, recorded at booking with the version accepted
   *  (see shared/shipTerms.ts SHIP_TERMS_VERSION) so old acceptances stay auditable. */
  agreementAcceptedAt: timestamp("agreementAcceptedAt"),
  agreementVersion: varchar("agreementVersion", { length: 16 }),
  offeringDonationId: int("offeringDonationId"),
  referredByUserId: int("referredByUserId"),
  isWinnerVoyage: boolean("isWinnerVoyage").notNull().default(false),
  isGifted: boolean("isGifted").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("ship_bookings_status_idx").on(table.status),
  index("ship_bookings_start_idx").on(table.startDate),
  index("ship_bookings_user_idx").on(table.userId),
]));
export type ShipBooking = typeof shipBookings.$inferSelect;
export type InsertShipBooking = typeof shipBookings.$inferInsert;

// Admin-managed date ranges the ship is unavailable (maintenance, holds, the
// platform's own bookings mirrored in).
export const shipBlackoutDates = mysqlTable("ship_blackout_dates", {
  id: int("id").autoincrement().primaryKey(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }).notNull(),
  reason: varchar("reason", { length: 255 }),
  // Who wrote this row: "manual" for the admin panel, "outdoorsy" for the
  // inbound sync. The outbound iCal feed must exclude the synced ones or we
  // hand the channel its own bookings back as blocks (migration 0224).
  source: varchar("source", { length: 24 }).notNull().default("manual"),
  /** The channel's own VEVENT UID. Unique, and NULL on every hand-written row. */
  externalUid: varchar("externalUid", { length: 255 }),
  externalUpdatedAt: timestamp("externalUpdatedAt"),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_blackout_start_idx").on(table.startDate),
  unique("ship_blackout_external_uid_idx").on(table.externalUid),
  index("ship_blackout_source_idx").on(table.source),
]));
export type ShipBlackoutDate = typeof shipBlackoutDates.$inferSelect;

// Seasonal pricing multipliers over date ranges (peak +25%, shoulder -20%, etc).
export const shipPricingWindows = mysqlTable("ship_pricing_windows", {
  id: int("id").autoincrement().primaryKey(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }).notNull(),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_pricing_start_idx").on(table.startDate),
]));
export type ShipPricingWindow = typeof shipPricingWindows.$inferSelect;

// The Free Passage Quest checklist definitions (seeded, admin-editable order).
export const shipQuestActions = mysqlTable("ship_quest_actions", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  points: int("points").notNull().default(0),
  isRequired: boolean("isRequired").notNull().default(true),
  proofType: mysqlEnum("proofType", [
    "link", "photo", "referral_shortlisted", "game_quest", "forum",
  ]).notNull().default("link"),
  // References quest_completions.questId (a varchar slug like "quest-3"), e.g.
  // the existing Food Foresting quest, for auto-verification.
  linkedQuestId: varchar("linkedQuestId", { length: 100 }),
  forumPostId: int("forumPostId"),
  // Item 16: how the action verifies. "auto" awards on a forum post (writing
  // quests) or a system event; "crew" awards when the reviewer approves.
  verificationType: mysqlEnum("verificationType", ["auto", "crew"]).notNull().default("crew"),
  // How many times one player can complete this action (item 14b / item 11).
  maxSubmissions: int("maxSubmissions").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_quest_actions_sort_idx").on(table.sortOrder),
]));
export type ShipQuestAction = typeof shipQuestActions.$inferSelect;

// A player's submission/completion of a quest action. Unique per (user, action).
export const shipQuestCompletions = mysqlTable("ship_quest_completions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actionId: int("actionId").notNull(),
  proofUrl: varchar("proofUrl", { length: 512 }),
  note: text("note"),
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).notNull().default("pending"),
  verifiedByUserId: int("verifiedByUserId"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  unique("ship_quest_completion_uq").on(table.userId, table.actionId),
  index("ship_quest_completion_user_idx").on(table.userId),
  index("ship_quest_completion_status_idx").on(table.status),
]));
export type ShipQuestCompletion = typeof shipQuestCompletions.$inferSelect;

// Item 13: crew pooling. A qualified player (150+ points) can pool with others
// into a crew (cap 4, or 5 for a family), matched by overlapping open weeks.
export const shipQuestCrews = mysqlTable("ship_quest_crews", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  isFamily: tinyint("isFamily").notNull().default(0),
  status: mysqlEnum("status", ["forming", "matched", "drawn"]).notNull().default("forming"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("ship_quest_crews_creator_idx").on(t.createdByUserId),
]));
export type ShipQuestCrew = typeof shipQuestCrews.$inferSelect;

export const shipQuestCrewMembers = mysqlTable("ship_quest_crew_members", {
  id: int("id").autoincrement().primaryKey(),
  crewId: int("crewId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (t) => ([
  unique("ship_quest_crew_member_user_uq").on(t.userId),
  index("ship_quest_crew_member_crew_idx").on(t.crewId),
]));
export type ShipQuestCrewMember = typeof shipQuestCrewMembers.$inferSelect;

// Per-player availability: the weeks they cannot sail + whether they want matching.
export const shipQuestAvailability = mysqlTable("ship_quest_availability", {
  userId: int("userId").primaryKey(),
  blockedWeeks: json("blockedWeeks"),
  seekingCrew: tinyint("seekingCrew").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShipQuestAvailability = typeof shipQuestAvailability.$inferSelect;

// Nomination track: anyone can nominate anyone (including self) for a bonus slot.
export const shipNominations = mysqlTable("ship_nominations", {
  id: int("id").autoincrement().primaryKey(),
  nominatorUserId: int("nominatorUserId"),
  nomineeName: varchar("nomineeName", { length: 200 }).notNull(),
  nomineeContact: varchar("nomineeContact", { length: 320 }),
  reason: text("reason").notNull(),
  isSelfNomination: boolean("isSelfNomination").notNull().default(false),
  status: mysqlEnum("status", ["submitted", "shortlisted", "selected", "approved_for_draw"]).notNull().default("submitted"),
  // Set once the nominee has an account: an approved nomination becomes a live,
  // winnable draw entry only when the nominee is reachable.
  nomineeUserId: int("nomineeUserId"),
  inviteEmailSentAt: timestamp("inviteEmailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_nominations_status_idx").on(table.status),
]));
export type ShipNomination = typeof shipNominations.$inferSelect;

// Crew profile: the sponsorable card a crew fills in on entering the draw
// (threshold reached or nomination approved). Linked to a user or a nomination.
export const shipCrewProfiles = mysqlTable("ship_crew_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  nominationId: int("nominationId"),
  displayName: varchar("displayName", { length: 200 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 512 }),
  bio: text("bio"),
  intent: text("intent"),
  videoUrl: varchar("videoUrl", { length: 512 }),
  isPublic: boolean("isPublic").notNull().default(false),
  sponsorGoalCents: int("sponsorGoalCents").notNull().default(210000),
  sponsoredCents: int("sponsoredCents").notNull().default(0),
  status: mysqlEnum("status", ["draft", "published", "sponsored", "sailed"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  unique("ship_crew_user_uq").on(table.userId),
  unique("ship_crew_nomination_uq").on(table.nominationId),
  index("ship_crew_status_idx").on(table.status),
  index("ship_crew_public_idx").on(table.isPublic),
]));
export type ShipCrewProfile = typeof shipCrewProfiles.$inferSelect;
export type InsertShipCrewProfile = typeof shipCrewProfiles.$inferInsert;

// Audit log of each free-voyage drawing: the eligible set, weights, seed, roll,
// and winner. A drawing is weighted-random by tickets; storing the seed + audit
// makes every draw reproducible and checkable.
export const shipGiveawayDrawings = mysqlTable("ship_giveaway_drawings", {
  id: int("id").autoincrement().primaryKey(),
  drawnByUserId: int("drawnByUserId"),
  seed: bigint("seed", { mode: "number" }).notNull(),
  totalTickets: int("totalTickets").notNull(),
  roll: decimal("roll", { precision: 20, scale: 4 }).notNull(),
  eligibleCount: int("eligibleCount").notNull().default(0),
  winnerUserId: int("winnerUserId"),
  winnerNominationId: int("winnerNominationId"),
  winnerLabel: varchar("winnerLabel", { length: 200 }),
  // Set when a public entry (ship_giveaway_entries) wins: lets a prior public
  // winner be excluded from later draws and be notified at their entry email.
  winnerEntryId: int("winnerEntryId"),
  // The threshold-ticket cap chosen at draw time (null = uncapped). Recorded so
  // the counsel decision and the exact weights used are on the audit row.
  thresholdCap: int("thresholdCap"),
  audit: json("audit"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_giveaway_created_idx").on(table.createdAt),
]));
export type ShipGiveawayDrawing = typeof shipGiveawayDrawings.$inferSelect;

// The public entry layer for the Free Voyage Giveaway. A zero-effort base entry
// (email only) for the public sweepstakes; verified entries feed the SAME draw as
// quest threshold entrants and approved nominations. bonusTickets holds the
// credited bonus entries; referrals is capped at 40 (the referral credit ceiling)
// and the draw weight of an entry is 1 + referrals + nomination + quest + ig + yt
// (publicEntryTickets in server/lib/ship-logic.ts). funnelTag routes the entrant
// to the right post-campaign list. No "raffle"/"tickets" wording ever reaches a
// public surface; those are internal names only.
export const shipGiveawayEntries = mysqlTable("ship_giveaway_entries", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  userId: int("userId"),
  verifiedAt: timestamp("verifiedAt"),
  verifyToken: varchar("verifyToken", { length: 64 }).notNull(),
  verifyEmailSentAt: timestamp("verifyEmailSentAt"),
  verifyResentAt: timestamp("verifyResentAt"),
  welcomeEmailSentAt: timestamp("welcomeEmailSentAt"),
  funnelTag: mysqlEnum("funnelTag", ["land", "voyage", "support", "curious"]),
  referralCode: varchar("referralCode", { length: 16 }).notNull(),
  referredBy: varchar("referredBy", { length: 16 }),
  bonusTickets: json("bonusTickets").$type<{ referrals: number; nomination: number; quest: number; ig: number; yt: number }>(),
  nominationText: text("nominationText"),
  nominationId: int("nominationId"),
  src: varchar("src", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  unique("ship_giveaway_entry_email_uq").on(table.email),
  unique("ship_giveaway_entry_code_uq").on(table.referralCode),
  unique("ship_giveaway_entry_token_uq").on(table.verifyToken),
  index("ship_giveaway_entry_referredby_idx").on(table.referredBy),
  index("ship_giveaway_entry_verified_idx").on(table.verifiedAt),
  index("ship_giveaway_entry_user_idx").on(table.userId),
]));
export type ShipGiveawayEntry = typeof shipGiveawayEntries.$inferSelect;
export type InsertShipGiveawayEntry = typeof shipGiveawayEntries.$inferInsert;

// Ship Keeper role applications ($200 per turnover).
export const shipKeeperApplications = mysqlTable("ship_keeper_applications", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  location: varchar("location", { length: 255 }),
  experience: text("experience"),
  availability: text("availability"),
  needsText: text("needsText"),
  offersText: text("offersText"),
  status: mysqlEnum("status", ["submitted", "interviewing", "accepted", "declined"]).notNull().default("submitted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_keeper_status_idx").on(table.status),
]));
export type ShipKeeperApplication = typeof shipKeeperApplications.$inferSelect;

// Raise-your-flag: RV owners applying to add a ship to the ReGen Fleet.
export const shipFleetApplications = mysqlTable("ship_fleet_applications", {
  id: int("id").autoincrement().primaryKey(),
  ownerName: varchar("ownerName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  rvYearMakeModel: varchar("rvYearMakeModel", { length: 255 }),
  location: varchar("location", { length: 255 }),
  message: text("message"),
  needsText: text("needsText"),
  offersText: text("offersText"),
  // The Flagkeeper's qualification story (0197): why regeneration matters to
  // them, their vision for the fleet, and the full conversation record.
  whyRegeneration: text("whyRegeneration"),
  fleetVision: text("fleetVision"),
  companionTranscript: text("companionTranscript"),
  status: mysqlEnum("status", ["submitted", "in_conversation", "joined"]).notNull().default("submitted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_fleet_status_idx").on(table.status),
]));
export type ShipFleetApplication = typeof shipFleetApplications.$inferSelect;

// Winter Anchorage: land projects applying to host the ship off-season.
export const shipWinterHostApplications = mysqlTable("ship_winter_host_applications", {
  id: int("id").autoincrement().primaryKey(),
  projectName: varchar("projectName", { length: 200 }).notNull(),
  contactName: varchar("contactName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  location: varchar("location", { length: 255 }),
  powerHookup: boolean("powerHookup").notNull().default(false),
  freezeProtectionPlan: text("freezeProtectionPlan"),
  siteDescription: text("siteDescription"),
  proposedShare: varchar("proposedShare", { length: 120 }),
  needsText: text("needsText"),
  offersText: text("offersText"),
  status: mysqlEnum("status", ["submitted", "in_conversation", "accepted", "declined"]).notNull().default("submitted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_winter_host_status_idx").on(table.status),
]));
export type ShipWinterHostApplication = typeof shipWinterHostApplications.$inferSelect;

// The dataset door: a project or network offers a dataset of places for the
// treasure map. Accepted offers flow through the source-stamped importer (source
// = org slug, sourceUrl, sourceLicense) and are credited on the pins.
export const shipDatasetOffers = mysqlTable("ship_dataset_offers", {
  id: int("id").autoincrement().primaryKey(),
  orgName: varchar("orgName", { length: 200 }).notNull(),
  contactName: varchar("contactName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  description: text("description").notNull(),
  approxCount: int("approxCount"),
  dataUrl: varchar("dataUrl", { length: 512 }),
  licenseNote: varchar("licenseNote", { length: 500 }),
  status: mysqlEnum("status", ["submitted", "reviewing", "imported", "declined"]).notNull().default("submitted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_dataset_offers_status_idx").on(table.status),
]));
export type ShipDatasetOffer = typeof shipDatasetOffers.$inferSelect;

// AI concierge sessions: intake answers, generated itinerary, chat transcript.
export const shipConciergeSessions = mysqlTable("ship_concierge_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  bookingId: int("bookingId"),
  profileAnswers: json("profileAnswers"),
  itinerary: json("itinerary"),
  messages: json("messages"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("ship_concierge_user_idx").on(table.userId),
]));
export type ShipConciergeSession = typeof shipConciergeSessions.$inferSelect;

// Seed plantings logged via the one-QR chest card. Verified rows appear on the map.
export const shipSeedPlantings = mysqlTable("ship_seed_plantings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookingId: int("bookingId"),
  locationId: int("locationId"),
  lat: double("lat"),
  lng: double("lng"),
  species: varchar("species", { length: 200 }),
  photoUrl: varchar("photoUrl", { length: 512 }),
  notes: text("notes"),
  isVerified: boolean("isVerified").notNull().default(false),
  plantedAt: timestamp("plantedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_seed_plantings_user_idx").on(table.userId),
  index("ship_seed_plantings_verified_idx").on(table.isVerified),
]));
export type ShipSeedPlanting = typeof shipSeedPlantings.$inferSelect;

// Public voyage log: daily/bi-daily crew entries.
export const shipLogEntries = mysqlTable("ship_log_entries", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  userId: int("userId").notNull(),
  dayNumber: int("dayNumber"),
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  photoUrl: varchar("photoUrl", { length: 512 }),
  isPublic: boolean("isPublic").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_log_booking_idx").on(table.bookingId),
  index("ship_log_public_idx").on(table.isPublic),
]));
export type ShipLogEntry = typeof shipLogEntries.$inferSelect;

// Digital passport: one stamp per (user, location).
export const shipPassportStamps = mysqlTable("ship_passport_stamps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  locationId: int("locationId").notNull(),
  bookingId: int("bookingId"),
  photoUrl: varchar("photoUrl", { length: 512 }),
  stampedAt: timestamp("stampedAt").defaultNow().notNull(),
}, (table) => ([
  unique("ship_passport_uq").on(table.userId, table.locationId),
  index("ship_passport_user_idx").on(table.userId),
]));
export type ShipPassportStamp = typeof shipPassportStamps.$inferSelect;

// Live ship position pings (manual v1, GPS tracker v2). Latest row is "she sails here".
export const shipPositionPings = mysqlTable("ship_position_pings", {
  id: int("id").autoincrement().primaryKey(),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),
  source: mysqlEnum("source", ["manual", "tracker"]).notNull().default("manual"),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_position_created_idx").on(table.createdAt),
]));
export type ShipPositionPing = typeof shipPositionPings.$inferSelect;

// ── Ship's Inventory (the bag) ────────────────────────────────────────────────
// Everything she carries, as game-style item slots (SHIP_MAINTAINER_INVENTORY
// Section 2). Public read of visible items; admin CRUD. Icons come from the
// locked-style pipeline (scripts/generate-ship-item-icon.ts).
export const shipInventoryItems = mysqlTable("ship_inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  category: mysqlEnum("category", [
    "adventure", "galley", "water", "power", "connectivity", "tools", "magic", "comfort", "safety",
  ]).notNull().default("comfort"),
  description: text("description"),
  lore: text("lore"),
  iconUrl: varchar("iconUrl", { length: 512 }),
  photoUrl: varchar("photoUrl", { length: 512 }),
  quantity: int("quantity").notNull().default(1),
  storagePlace: varchar("storagePlace", { length: 200 }),
  activityTags: json("activityTags"),
  isVisible: boolean("isVisible").notNull().default(true),
  /** Flagged for the boarding/return gear check (V5 gear manifest). */
  isGearChecked: boolean("isGearChecked").notNull().default(false),
  /** True for gear that is not aboard yet and arrives in year two (shown with a badge). */
  comingYear2: boolean("comingYear2").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(0),
  // ── Nested tree + physical-manifest merge (0210_ship_inventory_nesting.sql) ──
  /** Self-reference -> ship_inventory_items(id). Nullable = top-level (a hero card).
   *  No .references() by house convention; integrity is enforced in the procedure layer. */
  parentId: int("parentId"),
  /** True for hero cards that hold child items (drillable on /ship/inventory). */
  isContainer: boolean("isContainer").notNull().default(false),
  /** Where the row came from: the hand-authored bag, the transcribed manifest, or a curator-added container. */
  provenance: mysqlEnum("provenance", ["curated", "transcribed", "curator_added"]).notNull().default("curated"),
  zone: varchar("zone", { length: 40 }),
  unit: varchar("unit", { length: 40 }),
  itemCondition: varchar("itemCondition", { length: 60 }),
  confidence: varchar("confidence", { length: 12 }),
  sourceVideo: varchar("sourceVideo", { length: 120 }),
  sourceTimestamp: varchar("sourceTimestamp", { length: 12 }),
  /** Real photo pulled from the walkthrough video (detail view; the overview uses iconUrl). */
  frameUrl: varchar("frameUrl", { length: 512 }),
  /** The manifest taxonomy value, kept verbatim (not remapped into the 9-value `category` enum). */
  manifestCategory: varchar("manifestCategory", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("ship_inventory_category_idx").on(table.category),
  index("ship_inventory_sort_idx").on(table.sortOrder),
  index("ship_inventory_visible_idx").on(table.isVisible),
  index("ship_inventory_parent_idx").on(table.parentId),
]));
export type ShipInventoryItem = typeof shipInventoryItems.$inferSelect;
export type InsertShipInventoryItem = typeof shipInventoryItems.$inferInsert;

// ── The Shipwright: maintainer knowledge base + case log ──────────────────────
// Retrieval, not training (SHIP_MAINTAINER_INVENTORY Section 1). Approved chunks
// answer questions; resolved cases can be drafted into new chunks after human
// approval so bad advice never compounds automatically.
export const shipKnowledgeChunks = mysqlTable("ship_knowledge_chunks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  system: mysqlEnum("system", [
    "chassis", "engine", "propane", "electrical", "plumbing", "slides", "generator",
    "appliances", "starlink", "water_filtration", "tires_brakes", "hvac", "general",
  ]).notNull().default("general"),
  sourceType: mysqlEnum("sourceType", ["manual", "service_bulletin", "forum_wisdom", "resolved_case"]).notNull().default("manual"),
  sourceRef: varchar("sourceRef", { length: 512 }),
  tags: json("tags"),
  isApproved: boolean("isApproved").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_knowledge_system_idx").on(table.system),
  index("ship_knowledge_approved_idx").on(table.isApproved),
]));
export type ShipKnowledgeChunk = typeof shipKnowledgeChunks.$inferSelect;

export const shipMaintenanceCases = mysqlTable("ship_maintenance_cases", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId"),
  reportedByUserId: int("reportedByUserId").notNull(),
  system: mysqlEnum("system", [
    "chassis", "engine", "propane", "electrical", "plumbing", "slides", "generator",
    "appliances", "starlink", "water_filtration", "tires_brakes", "hvac", "general",
  ]).notNull().default("general"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  photoUrls: json("photoUrls"),
  conversation: json("conversation"),
  status: mysqlEnum("status", ["open", "advised", "resolved", "escalated"]).notNull().default("open"),
  isEscalation: boolean("isEscalation").notNull().default(false),
  resolution: text("resolution"),
  whatWorked: text("whatWorked"),
  approvedIntoKb: boolean("approvedIntoKb").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => ([
  index("ship_case_status_idx").on(table.status),
  index("ship_case_booking_idx").on(table.bookingId),
]));
export type ShipMaintenanceCase = typeof shipMaintenanceCases.$inferSelect;

// ── Gear manifest checks (V5 Section 1) ───────────────────────────────────────
// Boarding + return photo-verified checklist of high-value gear.
export const shipGearChecks = mysqlTable("ship_gear_checks", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  phase: mysqlEnum("phase", ["boarding", "return"]).notNull(),
  items: json("items"),
  completedByUserId: int("completedByUserId"),
  witnessedByKeeperId: int("witnessedByKeeperId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_gear_booking_idx").on(table.bookingId),
]));
export type ShipGearCheck = typeof shipGearChecks.$inferSelect;

// ── The Galley (food experience) ──────────────────────────────────────────────
// A crew logs what they gathered (market haul + what is aboard), then remixes it
// into dishes that follow the ship's diet. Two engines: the deterministic remix
// (server/lib/galley-remix.ts) and the Ship's Cook AI. Hauls and remixes save to
// the crew's account and, when a voyage is active, link to that booking. Photos
// mirror the ship_maintenance_cases pattern (json photoUrls, json conversation).
export const galleyHauls = mysqlTable("galley_hauls", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId"),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }),
  visibility: mysqlEnum("visibility", ["crew", "public"]).notNull().default("crew"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  index("galley_hauls_booking_idx").on(table.bookingId),
  index("galley_hauls_user_idx").on(table.userId),
  index("galley_hauls_visibility_idx").on(table.visibility),
]));
export type GalleyHaul = typeof galleyHauls.$inferSelect;
export type InsertGalleyHaul = typeof galleyHauls.$inferInsert;

export const galleyHaulItems = mysqlTable("galley_haul_items", {
  id: int("id").autoincrement().primaryKey(),
  haulId: int("haulId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  note: varchar("note", { length: 500 }),
  photoUrl: varchar("photoUrl", { length: 512 }),
  category: mysqlEnum("category", ["produce", "pantry", "protein", "sauce", "other"]).notNull().default("produce"),
  source: mysqlEnum("source", ["market", "ship", "forage", "store"]).notNull().default("market"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("galley_haul_items_haul_idx").on(table.haulId),
]));
export type GalleyHaulItem = typeof galleyHaulItems.$inferSelect;
export type InsertGalleyHaulItem = typeof galleyHaulItems.$inferInsert;

export const galleyRemixes = mysqlTable("galley_remixes", {
  id: int("id").autoincrement().primaryKey(),
  haulId: int("haulId"),
  bookingId: int("bookingId"),
  userId: int("userId").notNull(),
  dishName: varchar("dishName", { length: 200 }).notNull(),
  engine: mysqlEnum("engine", ["deterministic", "cook"]).notNull().default("deterministic"),
  cardSlugs: json("cardSlugs"),
  /** The composed dish: { base, fillings, toppings, sauce, method, why }. */
  recipe: json("recipe"),
  /** The Cook thread, when engine = cook. */
  conversation: json("conversation"),
  photoUrls: json("photoUrls"),
  visibility: mysqlEnum("visibility", ["crew", "public"]).notNull().default("crew"),
  /** Admin-approved into the public "From the Crews" cookbook. */
  publishedToCookbook: boolean("publishedToCookbook").notNull().default(false),
  /** Moderation state for a crew submission to the shared cookbook. */
  cookbookStatus: mysqlEnum("cookbookStatus", ["none", "pending", "approved", "rejected"]).notNull().default("none"),
  submittedToCookbookAt: timestamp("submittedToCookbookAt"),
  approvedByUserId: int("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("galley_remixes_haul_idx").on(table.haulId),
  index("galley_remixes_user_idx").on(table.userId),
  index("galley_remixes_published_idx").on(table.publishedToCookbook),
  index("galley_remixes_visibility_idx").on(table.visibility),
]));
export type GalleyRemix = typeof galleyRemixes.$inferSelect;
export type InsertGalleyRemix = typeof galleyRemixes.$inferInsert;

// ── Crew list (V5 Section 4) ──────────────────────────────────────────────────
// Email capture on non-open week cards. Double-opt-in, one-click unsubscribe.
export const shipCrewListSignups = mysqlTable("ship_crew_list_signups", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  userId: int("userId"),
  interests: json("interests"),
  source: varchar("source", { length: 120 }),
  confirmedAt: timestamp("confirmedAt"),
  /** Last time the nightly job emailed this signup about an opening (throttle). */
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("ship_crewlist_email_idx").on(table.email),
]));
export type ShipCrewListSignup = typeof shipCrewListSignups.$inferSelect;

/**
 * user_guide_preferences: each member's personally designed ReGen Guide (the
 * general companion). Name, chosen face, tone, and whether voice is on. One row
 * per user. The Guide's forum/governance behavior (ADR-23) is unrelated and
 * unchanged; this only personalizes the general assistant.
 */
export const userGuidePreferences = mysqlTable("user_guide_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  guideName: varchar("guideName", { length: 60 }).notNull(),
  portraitKey: varchar("portraitKey", { length: 32 }).notNull().default("guide-archetype-1"),
  tone: varchar("tone", { length: 16 }).notNull().default("gentle"),
  voiceEnabled: boolean("voiceEnabled").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserGuidePreferences = typeof userGuidePreferences.$inferSelect;

// ─── The Harvest: quick_notes capture inbox (Phase 1) ─────────────────────────
/**
 * Rye's private idea captures from the admin FAB (voice or text). `id` is the
 * bridge sync cursor; `captureId` is the stable UUID the local second brain
 * dedupes by. `audioKey` points at the private R2 prefix (harvest/voice/...),
 * never a public URL. Owner-gated everywhere via ownerProcedure; owner_id is
 * always derived from ctx.user.id, never from input.
 */
export const quickNotes = mysqlTable("quick_notes", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  captureId: char("capture_id", { length: 36 }).notNull().unique(),
  ownerId: int("owner_id").notNull(),
  body: text("body").notNull(),
  source: mysqlEnum("source", ["text", "voice"]).default("text").notNull(),
  audioKey: varchar("audio_key", { length: 512 }),
  themes: json("themes"),
  status: mysqlEnum("status", ["inbox", "processed"]).default("inbox").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (t) => ({
  ownerStatusIdIdx: index("quick_notes_owner_status_id_idx").on(t.ownerId, t.status, t.id),
}));
export type QuickNote = typeof quickNotes.$inferSelect;
export type InsertQuickNote = typeof quickNotes.$inferInsert;

// ─── The Harvest: feed + provenance (Phase 2) ─────────────────────────────────
/**
 * The ripe-ideas tier. The vault computes ripeness components locally; the
 * bridge pushes curated idea text + components; the generation worker composes
 * the score and drafts on 0.6 transitions. idea_ref = vault note ref or
 * capture UUID. All access owner-gated (ownerProcedure / bridge token).
 */
export const harvestIdeas = mysqlTable("harvest_ideas", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  ideaRef: varchar("idea_ref", { length: 191 }).notNull(),
  /** As the vault sends it: the first ~45 raw characters, usually cut mid-word. */
  title: varchar("title", { length: 300 }).notNull(),
  /**
   * A real title generated from the summary (server/lib/harvest-titles.ts).
   * What the UI shows. Kept separate so re-syncing the bridge never clobbers it.
   */
  displayTitle: varchar("display_title", { length: 300 }),
  summary: text("summary"),
  themes: json("themes"),
  ripeness: double("ripeness").notNull().default(0),
  scoreComponents: json("score_components"),
  whyNow: varchar("why_now", { length: 500 }),
  sourceRefs: json("source_refs"),
  status: mysqlEnum("status", ["ripe", "snoozed", "suppressed", "developed"]).default("ripe").notNull(),
  snoozedUntil: timestamp("snoozed_until"),
  steer: text("steer"),
  crossedAt: timestamp("crossed_at"),
  draftedAt: timestamp("drafted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerRefUnique: uniqueIndex("harvest_ideas_owner_ref_unique").on(t.ownerId, t.ideaRef),
  ownerStatusRipenessIdx: index("harvest_ideas_owner_status_ripeness_idx").on(t.ownerId, t.status, t.ripeness),
}));
export type HarvestIdea = typeof harvestIdeas.$inferSelect;
export type InsertHarvestIdea = typeof harvestIdeas.$inferInsert;

/**
 * Drafted copy per (owner, idea, channel). ai_body keeps the untouched AI
 * draft; body is the live text. Once status leaves 'ready' the worker never
 * overwrites the row (write-once), so (ai_body, body) is Phase 3's edit pair.
 */
export const creationItems = mysqlTable("creation_items", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  ideaId: int("idea_id"),
  captureId: varchar("capture_id", { length: 191 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  ripeness: double("ripeness").notNull().default(0),
  angle: varchar("angle", { length: 200 }),
  aiBody: text("ai_body"),
  body: text("body"),
  sourceRefs: json("source_refs"),
  status: mysqlEnum("status", ["ready", "edited", "shipped"]).default("ready").notNull(),
  postedText: text("posted_text"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerCaptureChannelUnique: uniqueIndex("creation_items_owner_capture_channel_unique").on(t.ownerId, t.captureId, t.channel),
  ownerStatusIdx: index("creation_items_owner_status_idx").on(t.ownerId, t.status),
}));
export type CreationItem = typeof creationItems.$inferSelect;
export type InsertCreationItem = typeof creationItems.$inferInsert;

/** Addressable provenance store: the raw message/capture rows cards trace to. */
export const sourceIndex = mysqlTable("source_index", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  refId: varchar("ref_id", { length: 64 }).notNull(),
  date: timestamp("date"),
  text: text("text"),
  links: json("links"),
  forwardedFrom: varchar("forwarded_from", { length: 300 }),
  media: varchar("media", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  ownerRefUnique: uniqueIndex("source_index_owner_ref_unique").on(t.ownerId, t.refId),
}));
export type SourceIndexRow = typeof sourceIndex.$inferSelect;

/**
 * One row per saved draft edit: the (ai_version, edited_version) pair plus
 * Rye's style/content call. Bodies are nulled after rule extraction (plan s6
 * storage rule); the row survives as extraction bookkeeping only.
 */
export const voiceEdits = mysqlTable("voice_edits", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  itemId: int("item_id").notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  editKind: mysqlEnum("edit_kind", ["style", "content"]).default("content").notNull(),
  aiVersion: text("ai_version"),
  editedVersion: text("edited_version"),
  extractedAt: timestamp("extracted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  ownerKindIdx: index("voice_edits_owner_kind_idx").on(t.ownerId, t.editKind, t.extractedAt),
}));
export type VoiceEdit = typeof voiceEdits.$inferSelect;

/** Derived, taxonomy-constrained style rules with weight + recurrence. */
export const voiceRules = mysqlTable("voice_rules", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  category: mysqlEnum("category", ["word_swap", "sentence_length", "opener", "closer", "punctuation", "formatting", "aside"]).notNull(),
  rule: varchar("rule", { length: 500 }).notNull(),
  weight: double("weight").notNull().default(1),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
}, (t) => ({
  ownerWeightIdx: index("voice_rules_owner_weight_idx").on(t.ownerId, t.weight),
}));
export type VoiceRule = typeof voiceRules.$inferSelect;

/**
 * Audit trail for the hardened one-button email send. body_hash binds the
 * confirm token to the exact previewed text; idempotency_key makes a
 * double-click a no-op; ai_body/sent_body persist the ai-vs-shipped pair.
 * No recipient PII, only the count.
 */
export const harvestEmailSends = mysqlTable("harvest_email_sends", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  itemId: int("item_id").notNull(),
  bodyHash: char("body_hash", { length: 64 }).notNull(),
  recipientCount: int("recipient_count").notNull().default(0),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["sent", "failed"]).default("sent").notNull(),
  subject: varchar("subject", { length: 300 }),
  aiBody: text("ai_body"),
  sentBody: text("sent_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  ownerCreatedIdx: index("harvest_email_sends_owner_created_idx").on(t.ownerId, t.createdAt),
}));
export type HarvestEmailSend = typeof harvestEmailSends.$inferSelect;

// ─── The Harvest: Compose to Publish (Phase 5) ────────────────────────────────
/** One composed idea; groups the article, per-channel posts, images, email. */
export const publications = mysqlTable("publications", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  ideaId: int("idea_id"),
  title: varchar("title", { length: 300 }).notNull(),
  sourceRefs: json("source_refs"),
  status: mysqlEnum("status", ["draft", "partially_published", "published"]).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  ownerIdx: index("publications_owner_idx").on(t.ownerId, t.createdAt),
}));
export type Publication = typeof publications.$inferSelect;

/** Per-surface state so publishing is staged and idempotent. */
export const publicationTargets = mysqlTable("publication_targets", {
  id: int("id").autoincrement().primaryKey(),
  publicationId: int("publication_id").notNull(),
  surface: mysqlEnum("surface", ["site", "linkedin", "facebook", "instagram", "threads_x", "email"]).notNull(),
  itemId: int("item_id"),
  status: mysqlEnum("status", ["draft", "approved", "scheduled", "published", "failed"]).default("draft").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  externalUrl: varchar("external_url", { length: 600 }),
  publishedAt: timestamp("published_at"),
  /**
   * Fact-check state (server/lib/content-verify.ts), separate from `status`:
   * this is the machine's verdict on whether the copy is TRUE, while `status`
   * stays the human/workflow state. approveTarget refuses while a block-level
   * flag is unresolved; editing the draft resets this to 'unverified'.
   */
  verificationStatus: mysqlEnum("verification_status", ["unverified", "passed", "flagged"]).default("unverified").notNull(),
  verificationFlags: json("verification_flags"),
  verifiedAt: timestamp("verified_at"),
  /**
   * Where the link goes. A raw URL in the body suppresses reach on LinkedIn and
   * Instagram, so the post carries the idea and this carries the link. Verified
   * alongside the body, because it is published text too.
   */
  firstComment: text("first_comment"),
  /**
   * The honest replacement for analytics: one sentence after the fact on
   * whether it landed, written on the harvest-digest cron's weekly rhythm.
   */
  weeklyNote: text("weekly_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  pubSurfaceUnique: uniqueIndex("publication_targets_pub_surface_unique").on(t.publicationId, t.surface),
}));
export type PublicationTarget = typeof publicationTargets.$inferSelect;

/** Generated image options per slot. alt_text is required (accessibility rule). */
export const publicationImages = mysqlTable("images", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  publicationId: int("publication_id").notNull(),
  slot: mysqlEnum("slot", ["hero", "inline"]).notNull(),
  r2Key: varchar("r2_key", { length: 512 }).notNull(),
  url: varchar("url", { length: 600 }).notNull(),
  altText: varchar("alt_text", { length: 500 }).notNull(),
  prompt: text("prompt"),
  chosen: tinyint("chosen").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  publicationSlotIdx: index("images_publication_slot_idx").on(t.publicationId, t.slot),
}));
export type PublicationImage = typeof publicationImages.$inferSelect;

/**
 * Runtime blog surface for composed articles: hidden preview first (private
 * URL via preview_token), then public. Static blogPosts.ts stays canonical
 * for pre-existing posts; the blog pages merge both.
 */
export const publishedArticles = mysqlTable("published_articles", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  publicationId: int("publication_id"),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  excerpt: varchar("excerpt", { length: 600 }),
  content: text("content").notNull(),
  author: varchar("author", { length: 120 }).default("Rieki Cordon").notNull(),
  heroImageUrl: varchar("hero_image_url", { length: 600 }),
  heroImageAlt: varchar("hero_image_alt", { length: 500 }),
  tags: json("tags"),
  previewToken: char("preview_token", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["preview", "public", "unpublished"]).default("preview").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PublishedArticle = typeof publishedArticles.$inferSelect;

/** Append-only run stats for the /admin-create status line. */
export const harvestRuns = mysqlTable("harvest_runs", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["bridge", "generation", "seed", "digest"]).notNull(),
  ranAt: timestamp("ran_at").defaultNow().notNull(),
  stats: json("stats"),
}, (t) => ({
  kindRanIdx: index("harvest_runs_kind_ran_idx").on(t.kind, t.ranAt),
}));
export type HarvestRun = typeof harvestRuns.$inferSelect;

// ─── Multiplayer Mode: quest crews (Phase A, improvement 1) ──────────────────
/**
 * Crews of 3 to 7 players form around a multiplayer quest in a bioregion.
 * Quest definitions are file-based (shared/multiplayerQuests.ts), so questId is
 * the same varchar quest key quest_completions uses, with no SQL FK. bioregionId
 * references bioregions(id); integrity is enforced in the procedure layer.
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */
export const questCrews = mysqlTable("quest_crews", {
  id: int("id").autoincrement().primaryKey(),
  questId: varchar("questId", { length: 100 }).notNull(),
  bioregionId: int("bioregionId").notNull(),
  crewSize: tinyint("crewSize").notNull(),
  status: mysqlEnum("status", ["forming", "ready", "active", "complete", "disbanded"]).default("forming").notNull(),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  activatedAt: timestamp("activatedAt"),
}, (t) => ({
  questBioregionStatusIdx: index("quest_crews_questId_bioregionId_status_idx").on(t.questId, t.bioregionId, t.status),
}));
export type QuestCrew = typeof questCrews.$inferSelect;
export type InsertQuestCrew = typeof questCrews.$inferInsert;

export const questCrewMembers = mysqlTable("quest_crew_members", {
  id: int("id").autoincrement().primaryKey(),
  crewId: int("crewId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 100 }),
  status: mysqlEnum("status", ["joined", "left", "completed"]).default("joined").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  // Formation-email idempotency key: one email per member per crew, ever.
  formationEmailSentAt: timestamp("formationEmailSentAt"),
}, (t) => ({
  crewUserUnique: uniqueIndex("quest_crew_members_crewId_userId_unique").on(t.crewId, t.userId),
  userIdx: index("quest_crew_members_userId_idx").on(t.userId),
}));
export type QuestCrewMember = typeof questCrewMembers.$inferSelect;
export type InsertQuestCrewMember = typeof questCrewMembers.$inferInsert;

export const questCrewSignups = mysqlTable("quest_crew_signups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  bioregionId: int("bioregionId").notNull(),
  note: varchar("note", { length: 500 }),
  status: mysqlEnum("status", ["open", "crewed", "cancelled"]).default("open").notNull(),
  crewId: int("crewId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  questBioregionStatusIdx: index("quest_crew_signups_questId_bioregionId_status_idx").on(t.questId, t.bioregionId, t.status),
  userIdx: index("quest_crew_signups_userId_idx").on(t.userId),
}));
export type QuestCrewSignup = typeof questCrewSignups.$inferSelect;
export type InsertQuestCrewSignup = typeof questCrewSignups.$inferInsert;

// ─── Needs and Offers board (Phase B2, improvement 10) ───────────────────────
/**
 * Two boards fed by /board and by optional needs/offers fields on every
 * application form (source tags the form family). Posters are signed-in
 * players (ownerId) or form applicants (contactEmail); the procedure layer
 * requires one of the two. needs_offers_matches is the deterministic
 * matcher's ledger: one row per (need, offer) pair, so the introduction
 * email can never send twice. Spec:
 * CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */
export const projectNeeds = mysqlTable("project_needs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId"),
  contactName: varchar("contactName", { length: 200 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  tags: json("tags"),
  bioregionId: int("bioregionId"),
  timeWindow: varchar("timeWindow", { length: 200 }),
  status: mysqlEnum("status", ["open", "matched", "closed"]).default("open").notNull(),
  source: varchar("source", { length: 50 }).default("board").notNull(),
  sourceId: int("sourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  statusBioregionIdx: index("project_needs_status_bioregionId_idx").on(t.status, t.bioregionId),
  ownerIdx: index("project_needs_ownerId_idx").on(t.ownerId),
}));
export type ProjectNeed = typeof projectNeeds.$inferSelect;
export type InsertProjectNeed = typeof projectNeeds.$inferInsert;

export const playerOffers = mysqlTable("player_offers", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId"),
  contactName: varchar("contactName", { length: 200 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  tags: json("tags"),
  bioregionId: int("bioregionId"),
  timeWindow: varchar("timeWindow", { length: 200 }),
  status: mysqlEnum("status", ["open", "matched", "closed"]).default("open").notNull(),
  source: varchar("source", { length: 50 }).default("board").notNull(),
  sourceId: int("sourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  statusBioregionIdx: index("player_offers_status_bioregionId_idx").on(t.status, t.bioregionId),
  ownerIdx: index("player_offers_ownerId_idx").on(t.ownerId),
}));
export type PlayerOffer = typeof playerOffers.$inferSelect;
export type InsertPlayerOffer = typeof playerOffers.$inferInsert;

export const needsOffersMatches = mysqlTable("needs_offers_matches", {
  id: int("id").autoincrement().primaryKey(),
  needId: int("needId").notNull(),
  offerId: int("offerId").notNull(),
  matchedAt: timestamp("matchedAt").defaultNow().notNull(),
  emailSentAt: timestamp("emailSentAt"),
}, (t) => ({
  pairUnique: uniqueIndex("needs_offers_matches_needId_offerId_unique").on(t.needId, t.offerId),
}));
export type NeedsOffersMatch = typeof needsOffersMatches.$inferSelect;
export type InsertNeedsOffersMatch = typeof needsOffersMatches.$inferInsert;

// ─── Consent-based player memory (Phase D2, improvement 13) ──────────────────
/**
 * Small game-journey facts the Guide remembers, opt-in per player (default OFF
 * via player_profiles.companionMemoryOptIn), fully visible, deletable, and
 * exportable on the settings surface. Written deterministically from events
 * (no LLM extraction); loaded read-only into companion context framed as
 * untrusted prior notes. No health, conflict, or finance facts, by schema and
 * by the writer's construction. sourceRef is the per-surface idempotency key.
 */
export const playerCompanionMemory = mysqlTable("player_companion_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  surface: varchar("surface", { length: 50 }).notNull(),
  fact: text("fact").notNull(),
  sourceRef: varchar("sourceRef", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  supersededAt: timestamp("supersededAt"),
}, (t) => ({
  userSourceUnique: uniqueIndex("player_companion_memory_userId_sourceRef_unique").on(t.userId, t.sourceRef),
  userIdx: index("player_companion_memory_userId_idx").on(t.userId),
}));
export type PlayerCompanionMemory = typeof playerCompanionMemory.$inferSelect;

// ─── Peer attestation, verification ladder rung 2 (Phase D3, ADR-42) ─────────
/**
 * A crewmate attests a member's quest completion. One attestation per member
 * per quest (unique key); the attester must be a co-crew member (procedure
 * layer). Earns the rung-2 multiplier as PRIVATE internal credit only (source
 * tag quest_attested_bonus); public tokens stay gated by Hypha voting.
 */
export const questCompletionAttestations = mysqlTable("quest_completion_attestations", {
  id: int("id").autoincrement().primaryKey(),
  questId: varchar("questId", { length: 100 }).notNull(),
  crewId: int("crewId").notNull(),
  memberUserId: int("memberUserId").notNull(),
  attesterUserId: int("attesterUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  questMemberUnique: uniqueIndex("quest_completion_attestations_questId_memberUserId_unique").on(t.questId, t.memberUserId),
  attesterIdx: index("quest_completion_attestations_attesterUserId_idx").on(t.attesterUserId),
}));
export type QuestCompletionAttestation = typeof questCompletionAttestations.$inferSelect;

// ── The Ship's Inventory: physical manifest (RV walkthrough) — RETIRED ─────────
// The standalone `ship_inventory` table + shipManifest router were retired on
// 2026-07-18. The 118-item physical manifest (data/rv_inventory.json) is now
// merged into `ship_inventory_items` above as a nested tree (parentId /
// isContainer / provenance='transcribed' + zone/unit/itemCondition/confidence/
// sourceVideo/sourceTimestamp/frameUrl/manifestCategory), seeded by
// scripts/seed-ship-inventory-manifest.ts and surfaced via ship.inventory.*.
// The old DB table still exists in Railway; Rye may DROP it separately (no
// destructive migration is emitted here).

// ── Funding pipeline portal + application engine ────────────────────────────
/**
 * The funder pipeline: 117 sources researched and verified against their own
 * sites on 2026-07-24 (data/funding-pipeline-seed.json). Two column groups
 * with different owners. The research columns (category through notes) are the
 * compiled record and get re-upserted by scripts/seed-funding-pipeline.ts on
 * `name`. The tracking columns (appStatus, owner, nextAction, nextActionDate,
 * lastTouch, sortOrder) belong to Rye in /admin/funding, so the seed sets them
 * on first insert only and never overwrites a later edit. `priority` ships with
 * the research and stays editable.
 *
 * appStatus is the funnel. `cultivating` covers the invitation-only funders
 * (Kalliopeia, Fetzer, Hidden Leaf) that need a months-long relationship before
 * an application exists; `parked` is the off-ramp for a real row that is not
 * now (closed round, wrong entity, geography we have not landed in).
 */
export const fundingPipeline = mysqlTable("funding_pipeline", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  capitalType: varchar("capitalType", { length: 255 }),
  whatItFunds: text("whatItFunds"),
  typicalSize: varchar("typicalSize", { length: 160 }),
  geography: varchar("geography", { length: 160 }),
  eligibility: text("eligibility"),
  accessStatus: varchar("accessStatus", { length: 255 }),
  deadline: varchar("deadline", { length: 160 }),
  fit: varchar("fit", { length: 120 }),
  /** Which ReGen vehicle applies here. Never the Fund where funds are excluded. */
  regenEntity: varchar("regenEntity", { length: 255 }),
  link: varchar("link", { length: 500 }),
  notes: text("notes"),
  priority: mysqlEnum("priority", ["P1", "P2", "P3", "ADV", "ALLY"]).notNull().default("P2"),
  appStatus: mysqlEnum("appStatus", [
    "not_started",
    "researching",
    "preparing",
    "cultivating",
    "submitted",
    "in_review",
    "awarded",
    "declined",
    "parked",
  ]).notNull().default("not_started"),
  owner: varchar("owner", { length: 120 }),
  nextAction: varchar("nextAction", { length: 500 }),
  nextActionDate: date("nextActionDate"),
  lastTouch: timestamp("lastTouch"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ([
  unique("funding_pipeline_name_uq").on(table.name),
  index("funding_pipeline_priority_idx").on(table.priority),
  index("funding_pipeline_status_idx").on(table.appStatus),
  index("funding_pipeline_category_idx").on(table.category),
  index("funding_pipeline_next_action_date_idx").on(table.nextActionDate),
]));
export type FundingPipelineRow = typeof fundingPipeline.$inferSelect;
export type InsertFundingPipelineRow = typeof fundingPipeline.$inferInsert;

/**
 * One row per positioning run from the application engine
 * (adminFunding.generateApplication). Regenerating adds a row instead of
 * replacing one: the history is how Rye compares a re-run against what the
 * kernel said last time.
 *
 * When the model returns output that fails schema validation twice, the raw
 * text lands in positioningSummary and flags carries "generation_unvalidated",
 * so a bad generation is visible rather than lost.
 */
export const fundingApplications = mysqlTable("funding_applications", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipelineId").notNull(),
  positioningSummary: text("positioningSummary"),
  keyPoints: json("keyPoints").$type<string[]>(),
  entityToUse: varchar("entityToUse", { length: 255 }),
  flags: json("flags").$type<string[]>(),
  coworkPrompt: mediumtext("coworkPrompt"),
  modelUsed: varchar("modelUsed", { length: 120 }),
  /** Admin user who ran the generation. */
  generatedBy: int("generatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  index("funding_applications_pipeline_idx").on(table.pipelineId),
]));
export type FundingApplication = typeof fundingApplications.$inferSelect;
export type InsertFundingApplication = typeof fundingApplications.$inferInsert;

/* ════════════════════════════════════════════════════════════════════
 * Governance fork relay (ADR-46): the hub runs ONE Alchemy listener for
 * every fork of the village platform. When an on-chain proposal carrying a
 * fork's [gm:<id>] mechanics marker executes, the outcome is relayed to
 * each registered fork's callback with that fork's shared secret. Forks
 * discard markers that are not theirs, so delivery is broadcast and
 * at-least-once; the fork-side receiver is idempotent by contract.
 * Migration: 0220_governance_fork_relay.sql
 * ════════════════════════════════════════════════════════════════════ */

export const governanceForkRelays = mysqlTable("governanceForkRelays", {
  id: int("id").autoincrement().primaryKey(),
  /** The fork's platform instance id (from its /api/platform/info), for the directory. */
  instanceId: varchar("instanceId", { length: 80 }),
  name: varchar("name", { length: 120 }).notNull(),
  /** The fork's receiver: POST <callbackUrl> with x-governance-hub-secret. */
  callbackUrl: varchar("callbackUrl", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 200 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastRelayAt: timestamp("lastRelayAt"),
  lastStatus: varchar("lastStatus", { length: 200 }),
});
export type GovernanceForkRelay = typeof governanceForkRelays.$inferSelect;

export const governanceRelayDeliveries = mysqlTable("governanceRelayDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  forkId: int("forkId").notNull(),
  /** The [gm:<id>] marker's id — the fork resolves it to its proposal. */
  marker: varchar("marker", { length: 80 }).notNull(),
  outcome: mysqlEnum("outcome", ["passed", "failed"]).notNull(),
  txHash: varchar("txHash", { length: 80 }),
  hyphaProposalId: varchar("hyphaProposalId", { length: 80 }),
  basescanUrl: varchar("basescanUrl", { length: 200 }),
  attempts: int("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastError: varchar("lastError", { length: 300 }),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  uniqueIndex("gov_relay_once_idx").on(table.forkId, table.marker, table.outcome),
  index("gov_relay_pending_idx").on(table.deliveredAt, table.lastAttemptAt),
]));
export type GovernanceRelayDelivery = typeof governanceRelayDeliveries.$inferSelect;

/**
 * Marker links (ADR-46 production path): "fork F's marker M is on-chain
 * proposal N". Real decoded governance logs carry only the numeric
 * proposalId — never the title — so the fork registers this mapping when its
 * founder pastes the Hypha proposal URL back into the proposal page. Unique
 * per (fork, marker); re-linking upserts the id/url.
 */
export const governanceForkMarkerLinks = mysqlTable("governanceForkMarkerLinks", {
  id: int("id").autoincrement().primaryKey(),
  forkId: int("forkId").notNull(),
  marker: varchar("marker", { length: 80 }).notNull(),
  hyphaProposalId: varchar("hyphaProposalId", { length: 80 }).notNull(),
  proposalUrl: varchar("proposalUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ([
  uniqueIndex("gov_marker_link_once_idx").on(table.forkId, table.marker),
  index("gov_marker_link_pid_idx").on(table.hyphaProposalId),
]));
export type GovernanceForkMarkerLink = typeof governanceForkMarkerLinks.$inferSelect;
