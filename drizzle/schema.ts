import { bigint, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, tinyint, double, unique, uniqueIndex } from "drizzle-orm/mysql-core";

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
  additionalNotes: text("additionalNotes"),
  
  // Metadata
  submittedAt: timestamp("submittedAt"),
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
  
  // Contribution Type
  contributionType: mysqlEnum("contributionType", [
    "land",
    "equipment",
    "role",
    "resource",
    "financial"
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
  
  // Status
  status: mysqlEnum("status", [
    "pending",      // Submitted, awaiting campaign owner review
    "accepted",     // Accepted by campaign owner
    "rejected",     // Rejected by campaign owner
    "withdrawn",    // Withdrawn by contributor
    "fulfilled"     // Contribution has been delivered/completed
  ]).default("pending").notNull(),
  
  // Communication
  contributorNotes: text("contributorNotes"), // Notes from contributor
  ownerNotes: text("ownerNotes"), // Notes from campaign owner
  
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
    "system"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
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
  // Dialogue governance lifecycle (2026-06-25 dialogue process)
  governanceStage: mysqlEnum("governanceStage", ["dialogue", "sensing", "proposal", "decided"]).default("dialogue"),
  sensingStartedAt: timestamp("sensingStartedAt"),
  sensingStartedBy: int("sensingStartedBy"),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GratitudeLog = typeof gratitudeLog.$inferSelect;

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

// Notifications (A.7)
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  type: mysqlEnum("type", ["forum_reply", "quest_complete", "fund_update", "vouch", "mention"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 500 }),
  isRead: tinyint("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ([
  index("notifications_player_unread_idx").on(t.playerId, t.isRead, t.createdAt),
]));
export type Notification = typeof notifications.$inferSelect;

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