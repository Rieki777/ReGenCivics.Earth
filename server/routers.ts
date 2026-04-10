// server/routers.ts, thin orchestrator
// All router implementations live in server/routes/*.ts
import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

import { globalSearchRouter, filesRouter, chatRouter, imagesRouter } from "./routes/global";
import { authRouter, statsRouter, userProfilesRouter } from "./routes/auth";
import { applicationsRouter, applicantsForCampaignRouter, reviewsRouter, orgClaimsRouter } from "./routes/applications";
import { investorInquiriesRouter, generalInquiriesRouter, loiRouter, reviewerEmailsRouter, contactNotesRouter, contactTagsRouter } from "./routes/investors";
import { newsletterRouter, videoSuggestionsRouter, emailRouter } from "./routes/newsletter";
import { campaignsRouter, crowdPoolingProjectsRouter, crowdPoolingProposalsRouter, savedContributionsRouter } from "./routes/campaigns";
import { forumRouter, moderationRouter, notificationsRouter, projectJoinRequestsRouter } from "./routes/forum";
import { playerProfilesRouter, playerContributionsRouter, questsRouter, questRouter, siteTourRouter } from "./routes/players";
import { adminRouter, adminAIRouter, imageStudioRouter, scheduledEmailsRouter, bannersRouter, discoveryRouter } from "./routes/admin";
import { marketplaceRouter, amasRouter, projectConnectionsRouter, communityRouter } from "./routes/community";
import { glossaryRouter, knowledgeMapRouter, translateRouter, customGameInquiriesRouter, blogRouter, rssFeedRouter } from "./routes/knowledge";
import { bioregionsRouter, userBioregionsRouter } from "./routes/geo";
import { messagesRouter } from "./routes/messages";
import { recordingsRouter } from "./routes/recordings";
import { eventsRouter } from "./routes/events";
import { agreementsRouter } from "./routes/agreements";
import { gratitudeRouter } from "./routes/gratitude";
import { hyphaBridgeRouter } from "./routes/hyphaBridge";
import { governanceRouter } from "./routes/governance";
import { walletRouter } from "./routes/wallet";
import { govProposalsRouter } from "./routes/govProposals";
import { govBioregionRouter } from "./routes/govBioregion";
import { featuresRouter } from "./routes/features";
import { sharingRouter } from "./routes/sharing";
import { gameRouter } from "./routes/game";
import { batchJobsRouter } from "./routes/batchJobs";
import { activityFeedRouter } from "./routes/activityFeed";
import { proposalsRouter } from "./routes/proposals";
import { localFoodRouter } from "./routes/localFood";
import { economicSuggestionsRouter } from "./routes/economicSuggestions";
import { orgRatingsRouter } from "./routes/orgRatings";
import { seedsClaimsRouter } from "./routes/seedsClaims";
import { toolsRouter } from "./routes/tools";
import { songsRouter } from "./routes/songs";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,

  // Global
  globalSearch: globalSearchRouter,
  files: filesRouter,
  images: imagesRouter,
  chat: chatRouter,

  // Auth / User
  auth: authRouter,
  stats: statsRouter,
  userProfiles: userProfilesRouter,

  // Applications
  applications: applicationsRouter,
  applicantsForCampaign: applicantsForCampaignRouter,
  reviews: reviewsRouter,
  orgClaims: orgClaimsRouter,

  // Investors
  investorInquiries: investorInquiriesRouter,
  generalInquiries: generalInquiriesRouter,
  loi: loiRouter,
  reviewerEmails: reviewerEmailsRouter,
  contactNotes: contactNotesRouter,
  contactTags: contactTagsRouter,

  // Newsletter
  newsletter: newsletterRouter,
  videoSuggestions: videoSuggestionsRouter,
  email: emailRouter,

  // Campaigns / Crowd Pooling
  campaigns: campaignsRouter,
  crowdPoolingProjects: crowdPoolingProjectsRouter,
  crowdPoolingProposals: crowdPoolingProposalsRouter,
  savedContributions: savedContributionsRouter,

  // Forum / Moderation
  forum: forumRouter,
  moderation: moderationRouter,
  notifications: notificationsRouter,
  projectJoinRequests: projectJoinRequestsRouter,

  // Players / Quests
  playerProfiles: playerProfilesRouter,
  playerContributions: playerContributionsRouter,
  quests: questsRouter,
  quest: questRouter,
  siteTour: siteTourRouter,

  // Admin
  admin: adminRouter,
  adminAI: adminAIRouter,
  imageStudio: imageStudioRouter,
  scheduledEmails: scheduledEmailsRouter,
  banners: bannersRouter,
  discovery: discoveryRouter,

  // Community
  marketplace: marketplaceRouter,
  amas: amasRouter,
  projectConnections: projectConnectionsRouter,
  community: communityRouter,

  // Knowledge
  glossary: glossaryRouter,
  knowledgeMap: knowledgeMapRouter,
  translate: translateRouter,
  customGameInquiries: customGameInquiriesRouter,
  blog: blogRouter,
  rssFeed: rssFeedRouter,

  // Geo
  bioregions: bioregionsRouter,
  userBioregions: userBioregionsRouter,

  // Direct Messaging
  messages: messagesRouter,

  // Recordings (Riverside.fm)
  recordings: recordingsRouter,

  // Events + per-event reminders
  events: eventsRouter,

  // Community Agreements
  agreements: agreementsRouter,

  // Gratitude (forum + command palette surface)
  gratitude: gratitudeRouter,

  // Hypha Bridge (every ReGen Civics -> Hypha handoff goes through here)
  hyphaBridge: hyphaBridgeRouter,

  // Governance pipeline (Stage 1: forum readiness + promotion patterns)
  governance: governanceRouter,

  // Wallet on-chain balance reads
  wallet: walletRouter,

  // Gov App: proposal lifecycle (Sprint 2)
  govProposals: govProposalsRouter,

  // Gov App: bioregion health + doughnut economics (Sprint 3)
  govBioregion: govBioregionRouter,

  // Feature Suggestions
  features: featuresRouter,

  // Sharing + Referrals
  sharing: sharingRouter,

  // Game System
  game: gameRouter,
  batchJobs: batchJobsRouter,
  activityFeed: activityFeedRouter,
  proposals: proposalsRouter,
  localFood: localFoodRouter,
  economicSuggestions: economicSuggestionsRouter,
  orgRatings: orgRatingsRouter,

  // SEEDS Token Claims
  seedsClaims: seedsClaimsRouter,

  // Tools Library
  tools: toolsRouter,

  // Hymn Book community song submissions
  songs: songsRouter,
});

export type AppRouter = typeof appRouter;
