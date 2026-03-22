// server/routers.ts — thin orchestrator
// All router implementations live in server/routes/*.ts
import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

import { globalSearchRouter, filesRouter, chatRouter } from "./routes/global";
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

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,

  // Global
  globalSearch: globalSearchRouter,
  files: filesRouter,
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
});

export type AppRouter = typeof appRouter;
