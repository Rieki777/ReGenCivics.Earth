import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, tinyint, double } from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  
  // Token tracking (cached from blockchain - will be verified on-chain)
  rvoiceBalance: int("rvoiceBalance").default(0).notNull(), // RVOICE token balance
  rgenBalance: int("rgenBalance").default(0).notNull(), // RGEN token balance
  lastTokenSync: timestamp("lastTokenSync"), // Last blockchain sync timestamp
  
  // Status
  isVerified: int("isVerified").default(0).notNull(), // Verified via Hypha/blockchain
  isActive: int("isActive").default(1).notNull(),

  // Email digest preferences
  emailDigestFrequency: mysqlEnum("emailDigestFrequency", ["never", "weekly", "monthly", "seasonal"]).default("monthly").notNull(),

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

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = typeof playerProfiles.$inferInsert;

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
});

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
});

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  categoryIdIdx: index("forumPosts_categoryId_idx").on(t.categoryId),
  authorIdIdx: index("forumPosts_authorId_idx").on(t.authorId),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
  orgId: varchar("orgId", { length: 100 }).notNull().unique(), // short slug, e.g. "hypha", "seeds"
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }),
  description: text("description"),
  // forumPostId links to the forum thread in the active-organisations category
  forumPostId: int("forumPostId"),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
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
  // Visibility: public shows in community feed, private stays in journal
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActiveQuestSignal = typeof activeQuestSignals.$inferSelect;
export type InsertActiveQuestSignal = typeof activeQuestSignals.$inferInsert;

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

