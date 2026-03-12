import { and, desc, eq, gt, isNull, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { applications, InsertApplication, InsertReview, InsertUser, reviews, users, savedContributions, InsertSavedContribution, SavedContribution, campaigns, Campaign, campaignItems, CampaignItem, campaignContributions, CampaignContribution, InsertCampaignContribution, campaignAnalytics, InsertCampaignAnalytic, userNotifications, InsertUserNotification, UserNotification, letterOfIntent, InsertLetterOfIntent, LetterOfIntent, notificationPreferences, NotificationPreferences, InsertNotificationPreferences, emailTemplates, EmailTemplate, InsertEmailTemplate, campaignImages, CampaignImage, InsertCampaignImage, forumCategories, ForumCategory, forumPosts, ForumPost, forumReplies, ForumReply, forumLikes, ForumLike, forumReports, ForumReport, forumModerators, ForumModerator, forumBans, ForumBan, questSuggestions, QuestSuggestion, questSuggestionVotes, QuestSuggestionVote, translationCache, TranslationCacheEntry, userProfiles, UserProfile, emailTokens, InsertEmailToken, EmailToken, projectJoinRequests, ProjectJoinRequest, InsertProjectJoinRequest, orgClaims, OrgClaim, InsertOrgClaim, projectConnections, InsertProjectConnection, ProjectConnection, digests, Digest, glossaryTerms, GlossaryTerm, InsertGlossaryTerm, knowledgeMapEntries, KnowledgeMapEntry, InsertKnowledgeMapEntry } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance with a connection pool.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
      });
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Application Queries
// ============================================

export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(applications).values(data);
  return result[0].insertId;
}

export async function updateApplication(id: number, data: Partial<InsertApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(applications).set(data).where(eq(applications.id, id));
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  
  if (result.length === 0) return undefined;
  
  // Get user email separately
  const app = result[0];
  const userResult = await db.select({ email: users.email })
    .from(users)
    .where(eq(users.id, app.userId))
    .limit(1);
  
  return {
    ...app,
    contactEmail: userResult.length > 0 ? userResult[0].email : null,
  };
}

export async function getApplicationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));
}

export async function getAllApplications() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(applications)
    .orderBy(desc(applications.submittedAt));
}

export async function getApplicationsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(applications)
    .where(eq(applications.status, status as any))
    .orderBy(desc(applications.submittedAt));
}

// ============================================
// Review Queries
// ============================================

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

export async function getReviewsByApplicationId(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(reviews)
    .where(eq(reviews.applicationId, applicationId))
    .orderBy(desc(reviews.createdAt));
}

export async function updateReview(id: number, data: Partial<InsertReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(reviews).set(data).where(eq(reviews.id, id));
}

// ============================================
// Investor Inquiry Queries
// ============================================

import { InsertInvestorInquiry, investorInquiries } from "../drizzle/schema";

export async function createInvestorInquiry(data: InsertInvestorInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(investorInquiries).values(data);
  return result[0].insertId;
}

export async function getInvestorInquiryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(investorInquiries).where(eq(investorInquiries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllInvestorInquiries() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(investorInquiries)
    .orderBy(desc(investorInquiries.createdAt));
}

export async function getInvestorInquiriesByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(investorInquiries)
    .where(eq(investorInquiries.status, status as any))
    .orderBy(desc(investorInquiries.createdAt));
}

export async function updateInvestorInquiry(id: number, data: Partial<InsertInvestorInquiry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(investorInquiries).set(data).where(eq(investorInquiries.id, id));
}


// ============================================
// General Inquiry Queries (Catch-all Routing Form)
// ============================================

import { InsertGeneralInquiry, generalInquiries } from "../drizzle/schema";

export async function createGeneralInquiry(data: InsertGeneralInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generalInquiries).values(data);
  return result[0].insertId;
}

export async function getGeneralInquiryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(generalInquiries).where(eq(generalInquiries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllGeneralInquiries() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(generalInquiries)
    .orderBy(desc(generalInquiries.createdAt));
}

export async function getGeneralInquiriesByPath(pathType: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(generalInquiries)
    .where(eq(generalInquiries.pathType, pathType as any))
    .orderBy(desc(generalInquiries.createdAt));
}

export async function getGeneralInquiriesByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(generalInquiries)
    .where(eq(generalInquiries.status, status as any))
    .orderBy(desc(generalInquiries.createdAt));
}

export async function updateGeneralInquiry(id: number, data: Partial<InsertGeneralInquiry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(generalInquiries).set(data).where(eq(generalInquiries.id, id));
}


// ============================================
// Reviewer Email Queries
// ============================================

import { InsertReviewerEmail, reviewerEmails } from "../drizzle/schema";

export async function createReviewerEmail(data: InsertReviewerEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reviewerEmails).values(data);
  return result[0].insertId;
}

export async function getReviewerEmailById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(reviewerEmails).where(eq(reviewerEmails.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllReviewerEmails() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(reviewerEmails)
    .orderBy(desc(reviewerEmails.createdAt));
}

export async function getActiveReviewerEmails() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(reviewerEmails)
    .where(eq(reviewerEmails.isActive, 1))
    .orderBy(desc(reviewerEmails.createdAt));
}

export async function updateReviewerEmail(id: number, data: Partial<InsertReviewerEmail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(reviewerEmails).set(data).where(eq(reviewerEmails.id, id));
}

export async function deleteReviewerEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(reviewerEmails).where(eq(reviewerEmails.id, id));
}


// ============================================
// Newsletter Subscriber Queries
// ============================================

import { InsertNewsletterSubscriber, newsletterSubscribers } from "../drizzle/schema";

export async function createNewsletterSubscriber(data: InsertNewsletterSubscriber) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if email already exists
  const existing = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, data.email))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing subscriber to active if they were inactive
    if (existing[0].isActive === 0) {
      await db.update(newsletterSubscribers)
        .set({ isActive: 1, source: data.source })
        .where(eq(newsletterSubscribers.id, existing[0].id));
    }
    return existing[0].id;
  }
  
  const result = await db.insert(newsletterSubscribers).values(data);
  return result[0].insertId;
}

export async function getNewsletterSubscriberByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function getActiveNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, 1))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(newsletterSubscribers)
    .set({ isActive: 0 })
    .where(eq(newsletterSubscribers.email, email));
}


// ============================================
// Video Suggestions Queries
// ============================================

import { InsertVideoSuggestion, videoSuggestions } from "../drizzle/schema";

export async function createVideoSuggestion(data: InsertVideoSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(videoSuggestions).values(data);
  return result[0].insertId;
}

export async function getVideoSuggestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(videoSuggestions).where(eq(videoSuggestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllVideoSuggestions() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(videoSuggestions)
    .orderBy(desc(videoSuggestions.voteCount));
}

export async function getApprovedVideoSuggestions() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(videoSuggestions)
    .where(eq(videoSuggestions.status, "approved"))
    .orderBy(desc(videoSuggestions.voteCount));
}

export async function updateVideoSuggestion(id: number, data: Partial<InsertVideoSuggestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(videoSuggestions).set(data).where(eq(videoSuggestions.id, id));
}

export async function deleteVideoSuggestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(videoSuggestions).where(eq(videoSuggestions.id, id));
}


// ============================================
// Player Profile Queries
// ============================================

import { InsertPlayerProfile, playerProfiles } from "../drizzle/schema";

export async function createPlayerProfile(data: InsertPlayerProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(playerProfiles).values(data);
  return result[0].insertId;
}

export async function getPlayerProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlayerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlayerProfileByBaseAccount(baseAccountName: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(playerProfiles)
    .where(eq(playerProfiles.baseAccountName, baseAccountName))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPlayerProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(playerProfiles)
    .where(eq(playerProfiles.isActive, 1))
    .orderBy(desc(playerProfiles.createdAt));
}

export async function getVerifiedPlayerProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(playerProfiles)
    .where(and(eq(playerProfiles.isVerified, 1), eq(playerProfiles.isActive, 1)))
    .orderBy(desc(playerProfiles.totalContributionValue));
}

export async function updatePlayerProfile(id: number, data: Partial<InsertPlayerProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(playerProfiles).set(data).where(eq(playerProfiles.id, id));
}

export async function deletePlayerProfile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete by setting isActive to 0
  await db.update(playerProfiles).set({ isActive: 0 }).where(eq(playerProfiles.id, id));
}


// ============================================
// Player Contributions Queries
// ============================================
import { InsertPlayerContribution, playerContributions } from "../drizzle/schema";

export async function createPlayerContribution(data: InsertPlayerContribution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(playerContributions).values(data);
  return result.insertId;
}

export async function getPlayerContributionsByProfileId(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(playerContributions)
    .where(eq(playerContributions.profileId, profileId))
    .orderBy(playerContributions.createdAt);
}

export async function deletePlayerContribution(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(playerContributions)
    .where(and(eq(playerContributions.id, id), eq(playerContributions.userId, userId)));
}

export async function updatePlayerContributionStatus(
  id: number,
  status: "pending" | "verified" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(playerContributions)
    .set({ status, verifiedAt: status === "verified" ? new Date() : null })
    .where(eq(playerContributions.id, id));
}


// ============================================
// Crowd Pooling Projects Queries
// ============================================

import { InsertCrowdPoolingProject, crowdPoolingProjects } from "../drizzle/schema";

export async function createCrowdPoolingProject(data: InsertCrowdPoolingProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(crowdPoolingProjects).values(data);
  return result[0].insertId;
}

export async function getCrowdPoolingProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(crowdPoolingProjects).where(eq(crowdPoolingProjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCrowdPoolingProjects() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(crowdPoolingProjects)
    .where(eq(crowdPoolingProjects.isVisible, 1))
    .orderBy(desc(crowdPoolingProjects.createdAt));
}

export async function getActiveCrowdPoolingProjects() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(crowdPoolingProjects)
    .where(and(eq(crowdPoolingProjects.isVisible, 1), eq(crowdPoolingProjects.status, "active")))
    .orderBy(desc(crowdPoolingProjects.createdAt));
}

export async function updateCrowdPoolingProject(id: number, data: Partial<InsertCrowdPoolingProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(crowdPoolingProjects).set(data).where(eq(crowdPoolingProjects.id, id));
}

export async function deleteCrowdPoolingProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete by setting isVisible to 0
  await db.update(crowdPoolingProjects).set({ isVisible: 0 }).where(eq(crowdPoolingProjects.id, id));
}


// Email log helpers
import { emailLogs, InsertEmailLog } from "../drizzle/schema";

export async function createEmailLog(data: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emailLogs).values(data);
  return result[0].insertId;
}

export async function getAllEmailLogs() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
}

export async function getEmailLogsByInquiry(inquiryType: string, inquiryId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(emailLogs)
    .where(and(eq(emailLogs.inquiryType, inquiryType), eq(emailLogs.inquiryId, inquiryId)))
    .orderBy(desc(emailLogs.sentAt));
}

export async function updateEmailLogStatus(id: number, status: "sent" | "delivered" | "bounced" | "failed", reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (status === "delivered") updateData.deliveredAt = new Date();
  if (status === "bounced" && reason) updateData.bounceReason = reason;
  
  await db.update(emailLogs).set(updateData).where(eq(emailLogs.id, id));
}

export async function markEmailOpened(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(emailLogs).set({ openedAt: new Date() }).where(eq(emailLogs.id, id));
}

export async function markEmailClicked(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(emailLogs).set({ clickedAt: new Date() }).where(eq(emailLogs.id, id));
}

export async function getEmailLogsByEmail(recipientEmail: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailLogs)
    .where(eq(emailLogs.recipientEmail, recipientEmail))
    .orderBy(desc(emailLogs.sentAt))
    .limit(50);
}


// ============================================
// Contact Notes Queries
// ============================================

import { contactNotes, InsertContactNote, contactTags, InsertContactTag, scheduledEmails, InsertScheduledEmail } from "../drizzle/schema";

export async function getContactNotes(contactType: string, contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactNotes)
    .where(and(eq(contactNotes.contactType, contactType), eq(contactNotes.contactId, contactId)))
    .orderBy(desc(contactNotes.createdAt));
}

export async function createContactNote(data: InsertContactNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contactNotes).values(data);
  return result[0].insertId;
}

export async function deleteContactNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contactNotes).where(eq(contactNotes.id, id));
}

// ============================================
// Contact Tags Queries
// ============================================

export async function getContactTags(contactType: string, contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contactTags)
    .where(and(eq(contactTags.contactType, contactType), eq(contactTags.contactId, contactId)))
    .orderBy(contactTags.createdAt);
}

export async function addContactTag(data: InsertContactTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contactTags).values(data);
  return result[0].insertId;
}

export async function removeContactTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contactTags).where(eq(contactTags.id, id));
}

// ============================================
// Scheduled Emails Queries
// ============================================

export async function createScheduledEmail(data: InsertScheduledEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scheduledEmails).values(data);
  return result[0].insertId;
}

export async function getScheduledEmails() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scheduledEmails).orderBy(scheduledEmails.scheduledFor);
}

export async function getPendingScheduledEmails() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select().from(scheduledEmails)
    .where(and(eq(scheduledEmails.status, 'pending'), gt(scheduledEmails.scheduledFor, now)));
}

export async function getDueScheduledEmails() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select().from(scheduledEmails)
    .where(and(eq(scheduledEmails.status, 'pending')));
}

export async function updateScheduledEmailStatus(id: number, status: 'sent' | 'cancelled' | 'failed', sentAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledEmails).set({ status, sentAt: sentAt || undefined }).where(eq(scheduledEmails.id, id));
}


// ============================================
// Crowd Pooling Proposal Queries
// ============================================

import { crowdPoolingProposals, InsertCrowdPoolingProposal } from "../drizzle/schema";

export async function createProposal(data: InsertCrowdPoolingProposal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(crowdPoolingProposals).values(data);
  return result[0].insertId;
}

export async function getProposalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(crowdPoolingProposals).where(eq(crowdPoolingProposals.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProposalsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(crowdPoolingProposals)
    .where(eq(crowdPoolingProposals.projectId, projectId))
    .orderBy(desc(crowdPoolingProposals.submittedAt));
}

export async function getProposalsByStatus(projectId: number, status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(crowdPoolingProposals)
    .where(and(
      eq(crowdPoolingProposals.projectId, projectId),
      eq(crowdPoolingProposals.status, status as any)
    ))
    .orderBy(desc(crowdPoolingProposals.submittedAt));
}

export async function updateProposalStatus(id: number, status: string, reviewNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(crowdPoolingProposals).set({ 
    status: status as any,
    reviewNotes: reviewNotes || null,
    reviewedAt: new Date()
  }).where(eq(crowdPoolingProposals.id, id));
}

export async function getProjectProposalStats(projectId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, accepted: 0, rejected: 0, totalValue: 0, financialValue: 0, acceptedValue: 0, acceptedFinancial: 0 };
  
  const proposals = await db.select().from(crowdPoolingProposals)
    .where(eq(crowdPoolingProposals.projectId, projectId));
  
  const pending = proposals.filter(p => p.status === 'pending');
  const accepted = proposals.filter(p => p.status === 'accepted');
  const rejected = proposals.filter(p => p.status === 'rejected');
  
  return {
    total: proposals.length,
    pending: pending.length,
    accepted: accepted.length,
    rejected: rejected.length,
    totalValue: proposals.reduce((sum, p) => sum + (p.totalContribution || 0), 0),
    financialValue: proposals.reduce((sum, p) => sum + (p.financialContribution || 0), 0),
    acceptedValue: accepted.reduce((sum, p) => sum + (p.totalContribution || 0), 0),
    acceptedFinancial: accepted.reduce((sum, p) => sum + (p.financialContribution || 0), 0)
  };
}

// Note: getCrowdPoolingProjects and getCrowdPoolingProjectById already defined above

export async function updateProjectContributions(projectId: number, totalAmount: number, financialAmount: number, contributorCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(crowdPoolingProjects).set({
    currentAmount: totalAmount,
    contributorCount: contributorCount
  }).where(eq(crowdPoolingProjects.id, projectId));
}


// ============ Saved Contributions Functions ============

export async function createSavedContribution(data: InsertSavedContribution): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(savedContributions).values(data);
  return result[0].insertId;
}

export async function getSavedContributionsByUser(userId: number): Promise<SavedContribution[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(savedContributions)
    .where(eq(savedContributions.userId, userId))
    .orderBy(desc(savedContributions.updatedAt));
}

export async function getSavedContributionById(id: number, userId: number): Promise<SavedContribution | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(savedContributions)
    .where(and(eq(savedContributions.id, id), eq(savedContributions.userId, userId)));
  
  return results[0] || null;
}

export async function getDefaultSavedContribution(userId: number): Promise<SavedContribution | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(savedContributions)
    .where(and(eq(savedContributions.userId, userId), eq(savedContributions.isDefault, true)));
  
  return results[0] || null;
}

export async function updateSavedContribution(id: number, userId: number, data: Partial<InsertSavedContribution>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(savedContributions)
    .set(data)
    .where(and(eq(savedContributions.id, id), eq(savedContributions.userId, userId)));
}

export async function deleteSavedContribution(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(savedContributions)
    .where(and(eq(savedContributions.id, id), eq(savedContributions.userId, userId)));
}

export async function setDefaultSavedContribution(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First, unset all defaults for this user
  await db.update(savedContributions)
    .set({ isDefault: false })
    .where(eq(savedContributions.userId, userId));
  
  // Then set the new default
  await db.update(savedContributions)
    .set({ isDefault: true })
    .where(and(eq(savedContributions.id, id), eq(savedContributions.userId, userId)));
}


// ============ Campaigns Functions ============

export async function listCampaigns(status?: string, search?: string): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(campaigns);
  
  const conditions = [];
  if (status) {
    conditions.push(eq(campaigns.status, status as any));
  }
  if (search) {
    conditions.push(
      or(
        like(campaigns.title, `%${search}%`),
        like(campaigns.description, `%${search}%`),
        like(campaigns.projectName, `%${search}%`),
        like(campaigns.location, `%${search}%`)
      )
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(campaigns)
    .where(eq(campaigns.id, id));
  
  return results[0] || null;
}

export async function getCampaignItems(campaignId: number): Promise<CampaignItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(campaignItems)
    .where(eq(campaignItems.campaignId, campaignId))
    .orderBy(campaignItems.category, campaignItems.createdAt);
}

export async function createCampaign(userId: number, data: {
  title: string;
  description: string;
  projectName: string;
  location?: string;
  financialTarget: number;
  currency?: string;
  // Link to application
  applicationId?: number;
  // Rich project data
  vision?: string;
  landStatus?: string;
  landSize?: string;
  currentPhase?: string;
  timeline?: string;
  legalStructure?: string;
  governanceModel?: string;
  membershipModel?: string;
  housingPlans?: string;
  foodSystems?: string;
  waterSystems?: string;
  energySystems?: string;
  educationPrograms?: string;
  communityEngagement?: string;
  impactMetrics?: string;
  challenges?: string;
  teamSize?: number;
  teamDescription?: string;
  regenerativePractices?: string;
  websiteUrl?: string;
  videoUrl?: string;
  projectImageUrl?: string;
  daoLink?: string;
  durationDays?: number;
  items: Array<{
    category: 'land' | 'equipment' | 'role' | 'resource';
    hectares?: number;
    region?: string;
    features?: string[];
    videoUrl?: string;
    landDescription?: string;
    equipmentName?: string;
    equipmentQuantity?: number;
    equipmentCategory?: string;
    roleTitle?: string;
    hoursPerWeek?: number;
    durationMonths?: number;
    roleDescription?: string;
    resourceName?: string;
    resourceQuantity?: number;
    resourceUnit?: string;
    resourceDescription?: string;
    estimatedValue: number;
  }>;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Calculate category totals
  const landValue = data.items
    .filter(i => i.category === 'land')
    .reduce((sum, i) => sum + i.estimatedValue, 0);
  const equipmentValue = data.items
    .filter(i => i.category === 'equipment')
    .reduce((sum, i) => sum + i.estimatedValue, 0);
  const rolesValue = data.items
    .filter(i => i.category === 'role')
    .reduce((sum, i) => sum + i.estimatedValue, 0);
  const resourcesValue = data.items
    .filter(i => i.category === 'resource')
    .reduce((sum, i) => sum + i.estimatedValue, 0);
  const totalValue = landValue + equipmentValue + rolesValue + resourcesValue;
  
  // Create campaign
  const campaignResult = await db.insert(campaigns).values({
    userId,
    title: data.title,
    description: data.description,
    projectName: data.projectName,
    location: data.location,
    financialTarget: data.financialTarget,
    currency: data.currency || 'USD',
    // Link to application
    applicationId: data.applicationId,
    // Rich project data
    vision: data.vision,
    landStatus: data.landStatus,
    landSize: data.landSize,
    currentPhase: data.currentPhase,
    timeline: data.timeline,
    legalStructure: data.legalStructure,
    governanceModel: data.governanceModel,
    membershipModel: data.membershipModel,
    housingPlans: data.housingPlans,
    foodSystems: data.foodSystems,
    waterSystems: data.waterSystems,
    energySystems: data.energySystems,
    educationPrograms: data.educationPrograms,
    communityEngagement: data.communityEngagement,
    impactMetrics: data.impactMetrics,
    challenges: data.challenges,
    teamSize: data.teamSize,
    teamDescription: data.teamDescription,
    regenerativePractices: data.regenerativePractices,
    websiteUrl: data.websiteUrl,
    videoUrl: data.videoUrl,
    projectImageUrl: data.projectImageUrl,
    daoLink: data.daoLink,
    durationDays: data.durationDays || 90,
    // Totals
    totalValue,
    landValue,
    equipmentValue,
    rolesValue,
    resourcesValue,
    status: 'pending_review',
  });
  
  const campaignId = campaignResult[0].insertId;
  
  // Create campaign items
  for (const item of data.items) {
    await db.insert(campaignItems).values({
      campaignId,
      category: item.category,
      hectares: item.hectares,
      region: item.region,
      features: item.features ? JSON.stringify(item.features) : null,
      videoUrl: item.videoUrl,
      landDescription: item.landDescription,
      equipmentName: item.equipmentName,
      equipmentQuantity: item.equipmentQuantity,
      equipmentCategory: item.equipmentCategory,
      roleTitle: item.roleTitle,
      hoursPerWeek: item.hoursPerWeek,
      durationMonths: item.durationMonths,
      roleDescription: item.roleDescription,
      resourceName: item.resourceName,
      resourceQuantity: item.resourceQuantity,
      resourceUnit: item.resourceUnit,
      resourceDescription: item.resourceDescription,
      estimatedValue: item.estimatedValue,
    });
  }
  
  return campaignId;
}


// ============ Campaign Images Functions ============

export async function addCampaignImage(data: {
  campaignId: number;
  uploadedByUserId: number;
  url: string;
  fileKey: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  category: 'land' | 'team' | 'progress' | 'infrastructure' | 'community' | 'other';
  caption?: string;
  isCover?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If setting as cover, unset any existing cover for this campaign
  if (data.isCover) {
    await db.update(campaignImages)
      .set({ isCover: 0 })
      .where(eq(campaignImages.campaignId, data.campaignId));
  }
  
  // Get next sort order
  const existing = await db.select().from(campaignImages)
    .where(eq(campaignImages.campaignId, data.campaignId));
  const nextOrder = existing.length;
  
  const result = await db.insert(campaignImages).values({
    campaignId: data.campaignId,
    uploadedByUserId: data.uploadedByUserId,
    url: data.url,
    fileKey: data.fileKey,
    fileName: data.fileName || null,
    mimeType: data.mimeType || null,
    fileSize: data.fileSize || null,
    category: data.category,
    caption: data.caption || null,
    isCover: data.isCover ? 1 : 0,
    sortOrder: nextOrder,
  });
  return result[0].insertId;
}

export async function getCampaignImages(campaignId: number): Promise<CampaignImage[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(campaignImages)
    .where(eq(campaignImages.campaignId, campaignId))
    .orderBy(desc(campaignImages.isCover), campaignImages.sortOrder);
}

export async function getCampaignCoverImage(campaignId: number): Promise<CampaignImage | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db.select().from(campaignImages)
    .where(and(
      eq(campaignImages.campaignId, campaignId),
      eq(campaignImages.isCover, 1)
    ))
    .limit(1);
  return results[0] || null;
}

export async function deleteCampaignImage(imageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.delete(campaignImages)
    .where(and(
      eq(campaignImages.id, imageId),
      eq(campaignImages.uploadedByUserId, userId)
    ));
  return (result[0] as any).affectedRows > 0;
}

export async function setCampaignCoverImage(campaignId: number, imageId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Unset all covers for this campaign
  await db.update(campaignImages)
    .set({ isCover: 0 })
    .where(eq(campaignImages.campaignId, campaignId));
  
  // Set the new cover
  await db.update(campaignImages)
    .set({ isCover: 1 })
    .where(and(
      eq(campaignImages.id, imageId),
      eq(campaignImages.campaignId, campaignId)
    ));
}

// ============================================
// Campaign Contribution Queries
// ============================================

export async function createContribution(data: InsertCampaignContribution): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(campaignContributions).values(data);
  return result[0].insertId;
}

export async function getContributionById(id: number): Promise<CampaignContribution | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(campaignContributions).where(eq(campaignContributions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getContributionsByCampaign(campaignId: number): Promise<CampaignContribution[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(campaignContributions)
    .where(eq(campaignContributions.campaignId, campaignId))
    .orderBy(desc(campaignContributions.submittedAt));
}

export async function getContributionsByCampaignAndStatus(campaignId: number, status: string): Promise<CampaignContribution[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaignId),
      eq(campaignContributions.status, status as any)
    ))
    .orderBy(desc(campaignContributions.submittedAt));
}

export async function getContributionsByUser(userId: number): Promise<CampaignContribution[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(campaignContributions)
    .where(eq(campaignContributions.userId, userId))
    .orderBy(desc(campaignContributions.submittedAt));
}

export async function updateContribution(id: number, data: Partial<InsertCampaignContribution>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(campaignContributions).set(data).where(eq(campaignContributions.id, id));
}

export async function updateContributionStatus(
  id: number, 
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'fulfilled',
  ownerNotes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: Partial<InsertCampaignContribution> = {
    status,
    reviewedAt: new Date(),
  };
  
  if (ownerNotes !== undefined) {
    updateData.ownerNotes = ownerNotes;
  }
  
  await db.update(campaignContributions).set(updateData).where(eq(campaignContributions.id, id));
}

export async function getCampaignContributorCount(campaignId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const contributions = await db.select()
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaignId),
      eq(campaignContributions.status, 'accepted')
    ));
  
  // Count unique contributors by email
  const uniqueEmails = new Set(contributions.map(c => c.contributorEmail));
  return uniqueEmails.size;
}

export async function getCampaignPledgedTotals(campaignId: number): Promise<{
  total: number;
  land: number;
  equipment: number;
  roles: number;
  resources: number;
  financial: number;
}> {
  const db = await getDb();
  if (!db) return { total: 0, land: 0, equipment: 0, roles: 0, resources: 0, financial: 0 };
  
  const contributions = await db.select()
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaignId),
      eq(campaignContributions.status, 'accepted')
    ));
  
  const totals = {
    total: 0,
    land: 0,
    equipment: 0,
    roles: 0,
    resources: 0,
    financial: 0,
  };
  
  for (const c of contributions) {
    totals.total += c.estimatedValue;
    switch (c.contributionType) {
      case 'land':
        totals.land += c.estimatedValue;
        break;
      case 'equipment':
        totals.equipment += c.estimatedValue;
        break;
      case 'role':
        totals.roles += c.estimatedValue;
        break;
      case 'resource':
        totals.resources += c.estimatedValue;
        break;
      case 'financial':
        totals.financial += c.financialAmount || c.estimatedValue;
        break;
    }
  }
  
  return totals;
}

export async function updateCampaignPledgedTotals(campaignId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const totals = await getCampaignPledgedTotals(campaignId);
  
  await db.update(campaigns).set({
    pledgedTotal: totals.total,
    pledgedLand: totals.land,
    pledgedEquipment: totals.equipment,
    pledgedRoles: totals.roles,
    pledgedResources: totals.resources,
    pledgedFinancial: totals.financial,
  }).where(eq(campaigns.id, campaignId));
}


export async function updateCampaignStatus(
  campaignId: number,
  status: 'draft' | 'pending_review' | 'active' | 'funded' | 'completed' | 'cancelled' | 'rejected'
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(campaigns).set({
    status,
    updatedAt: new Date(),
  }).where(eq(campaigns.id, campaignId));
}


// Campaign Analytics Functions

export async function trackCampaignView(data: {
  campaignId: number;
  visitorId?: string;
  userId?: number;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(campaignAnalytics).values({
    campaignId: data.campaignId,
    visitorId: data.visitorId,
    userId: data.userId,
    referrer: data.referrer,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    userAgent: data.userAgent,
    deviceType: data.deviceType || 'desktop',
  });
  
  return result[0].insertId;
}

export async function getCampaignAnalytics(campaignId: number): Promise<{
  totalViews: number;
  uniqueVisitors: number;
  viewsByDate: { date: string; views: number }[];
  viewsByDevice: { device: string; views: number }[];
  viewsBySource: { source: string; views: number }[];
  recentViews: { date: Date; visitorId: string | null; referrer: string | null }[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all analytics for this campaign
  const analytics = await db.select()
    .from(campaignAnalytics)
    .where(eq(campaignAnalytics.campaignId, campaignId))
    .orderBy(desc(campaignAnalytics.viewDate));
  
  // Calculate total views
  const totalViews = analytics.length;
  
  // Calculate unique visitors (by visitorId)
  const uniqueVisitorIds = new Set(analytics.map(a => a.visitorId).filter(Boolean));
  const uniqueVisitors = uniqueVisitorIds.size || totalViews; // Fall back to total if no visitor IDs
  
  // Group views by date (last 30 days)
  const viewsByDateMap = new Map<string, number>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  analytics.forEach(a => {
    if (a.viewDate >= thirtyDaysAgo) {
      const dateStr = a.viewDate.toISOString().split('T')[0];
      viewsByDateMap.set(dateStr, (viewsByDateMap.get(dateStr) || 0) + 1);
    }
  });
  
  const viewsByDate = Array.from(viewsByDateMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Group views by device type
  const viewsByDeviceMap = new Map<string, number>();
  analytics.forEach(a => {
    const device = a.deviceType || 'unknown';
    viewsByDeviceMap.set(device, (viewsByDeviceMap.get(device) || 0) + 1);
  });
  
  const viewsByDevice = Array.from(viewsByDeviceMap.entries())
    .map(([device, views]) => ({ device, views }))
    .sort((a, b) => b.views - a.views);
  
  // Group views by source (UTM source or referrer domain)
  const viewsBySourceMap = new Map<string, number>();
  analytics.forEach(a => {
    let source = a.utmSource || 'direct';
    if (!a.utmSource && a.referrer) {
      try {
        const url = new URL(a.referrer);
        source = url.hostname;
      } catch {
        source = 'direct';
      }
    }
    viewsBySourceMap.set(source, (viewsBySourceMap.get(source) || 0) + 1);
  });
  
  const viewsBySource = Array.from(viewsBySourceMap.entries())
    .map(([source, views]) => ({ source, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10); // Top 10 sources
  
  // Get recent views (last 20)
  const recentViews = analytics.slice(0, 20).map(a => ({
    date: a.viewDate,
    visitorId: a.visitorId,
    referrer: a.referrer,
  }));
  
  return {
    totalViews,
    uniqueVisitors,
    viewsByDate,
    viewsByDevice,
    viewsBySource,
    recentViews,
  };
}

export async function getCampaignConversionRate(campaignId: number): Promise<{
  views: number;
  contributions: number;
  conversionRate: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get view count
  const analytics = await db.select()
    .from(campaignAnalytics)
    .where(eq(campaignAnalytics.campaignId, campaignId));
  const views = analytics.length;
  
  // Get contribution count
  const contributions = await db.select()
    .from(campaignContributions)
    .where(eq(campaignContributions.campaignId, campaignId));
  const contributionCount = contributions.length;
  
  // Calculate conversion rate
  const conversionRate = views > 0 ? (contributionCount / views) * 100 : 0;
  
  return {
    views,
    contributions: contributionCount,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
  };
}


// ============================================
// User Notifications Queries
// ============================================

export async function createUserNotification(data: InsertUserNotification): Promise<number> {
  // Skip writing in-app notifications during test runs to prevent test data leaking to real users
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userNotifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 50): Promise<UserNotification[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.read, false)));
  return result.length;
}

export async function markNotificationAsRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userNotifications)
    .set({ read: true })
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userNotifications)
    .set({ read: true })
    .where(eq(userNotifications.userId, userId));
}

export async function deleteNotification(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(userNotifications)
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}


// ============================================
// Letter of Intent (LOI) Queries
// ============================================

export async function createLetterOfIntent(data: InsertLetterOfIntent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(letterOfIntent).values(data);
  return result[0].insertId;
}

export async function getAllLettersOfIntent() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(letterOfIntent).orderBy(desc(letterOfIntent.submittedAt));
}

export async function getLetterOfIntentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(letterOfIntent).where(eq(letterOfIntent.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLetterOfIntentStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(letterOfIntent)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(letterOfIntent.id, id));
}

export async function getTotalPledgedAmount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(letterOfIntent);
  const total = result
    .filter(loi => loi.status !== 'withdrawn')
    .reduce((sum, loi) => sum + (loi.pledgeAmount || 0), 0);
  
  return total;
}

export async function getLetterOfIntentStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allLois = await db.select().from(letterOfIntent);
  
  const total = allLois
    .filter(loi => loi.status !== 'withdrawn')
    .reduce((sum, loi) => sum + (loi.pledgeAmount || 0), 0);
  
  const count = allLois.filter(loi => loi.status !== 'withdrawn').length;
  
  return {
    totalAmount: total,
    count: count,
    pending: allLois.filter(loi => loi.status === 'pending').length,
    confirmed: allLois.filter(loi => loi.status === 'confirmed').length,
    withdrawn: allLois.filter(loi => loi.status === 'withdrawn').length,
    converted: allLois.filter(loi => loi.status === 'converted').length,
  };
}


// ============================================================================
// Public Stats
// ============================================================================

export async function getPublicStats(): Promise<{
  applications: number;
  members: number;
  landProjects: number;
  investorsCommitted: number;
}> {
  const db = await getDb();
  if (!db) return { applications: 0, members: 0, landProjects: 0, investorsCommitted: 0 };

  const [appsRows, usersRows, loisRows, projectsRows] = await Promise.all([
    db.select().from(applications),
    db.select().from(users),
    db.select().from(letterOfIntent).where(eq(letterOfIntent.status, 'confirmed')),
    db.select().from(crowdPoolingProjects).where(eq(crowdPoolingProjects.status, 'active')),
  ]);

  return {
    applications: appsRows.length,
    members: usersRows.length,
    landProjects: projectsRows.length,
    investorsCommitted: loisRows.length,
  };
}

// ============================================================================
// Notification Preferences Functions
// ============================================================================

/**
 * Get notification preferences (creates default if doesn't exist)
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prefs = await db.select().from(notificationPreferences).limit(1);
  
  if (prefs.length === 0) {
    // Create default preferences
    const [newPrefs] = await db.insert(notificationPreferences).values({
      applicationSubmissions: 1,
      investorInquiries: 1,
      allianceRequests: 1,
      workWithRegens: 1,
      roleRequests: 1,
      loiSubmissions: 1,
      campaignContributions: 1,
      newsletterSignups: 0,
    });
    
    const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.id, Number(newPrefs.insertId)));
    return created[0];
  }
  
  return prefs[0];
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getNotificationPreferences();
  
  await db
    .update(notificationPreferences)
    .set(preferences)
    .where(eq(notificationPreferences.id, existing.id));
}

/**
 * Check if a specific notification type is enabled
 */
export async function isNotificationEnabled(type: keyof Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const prefs = await getNotificationPreferences();
  const val = prefs[type];
  if (typeof val === 'number') return val === 1;
  return !!val;
}

/**
 * Get email recipients for a specific notification type.
 * Returns the custom email list if configured, otherwise returns null (use default owner notification).
 */
export async function getNotificationEmails(type: string): Promise<string[] | null> {
  const prefs = await getNotificationPreferences();
  const emailField = `${type}Emails` as keyof NotificationPreferences;
  const emailValue = prefs[emailField];
  if (typeof emailValue === 'string' && emailValue.trim().length > 0) {
    return emailValue.split(',').map(e => e.trim()).filter(e => e.length > 0);
  }
  return null;
}


// ─── Email Template Persistence ───────────────────────────────────────

/**
 * Get all custom email templates
 */
export async function getAllCustomTemplates(): Promise<EmailTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.templateKey);
  } catch (error) {
    console.error("[Database] Failed to get custom templates:", error);
    return [];
  }
}

/**
 * Get a single custom email template by key
 */
export async function getCustomTemplate(templateKey: string): Promise<EmailTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.templateKey, templateKey)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[Database] Failed to get custom template:", error);
    return null;
  }
}

/**
 * Save or update a custom email template
 */
export async function upsertCustomTemplate(data: {
  templateKey: string;
  customSubject?: string | null;
  customBody?: string | null;
  isActive?: number;
  lastEditedBy?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(emailTemplates).values({
      templateKey: data.templateKey,
      customSubject: data.customSubject ?? null,
      customBody: data.customBody ?? null,
      isActive: data.isActive ?? 1,
      lastEditedBy: data.lastEditedBy ?? null,
    }).onDuplicateKeyUpdate({
      set: {
        customSubject: data.customSubject ?? null,
        customBody: data.customBody ?? null,
        isActive: data.isActive ?? 1,
        lastEditedBy: data.lastEditedBy ?? null,
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert custom template:", error);
    throw error;
  }
}

/**
 * Delete a custom email template (reverts to default)
 */
export async function deleteCustomTemplate(templateKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(emailTemplates).where(eq(emailTemplates.templateKey, templateKey));
  } catch (error) {
    console.error("[Database] Failed to delete custom template:", error);
    throw error;
  }
}


// ==========================================
// Forum Helpers
// ==========================================

export async function createForumCategory(data: { name: string; slug: string; description?: string; icon?: string; color?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(forumCategories).values({
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    icon: data.icon ?? null,
    color: data.color ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return (result as any).insertId as number;
}

export async function listForumCategories() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(forumCategories).orderBy(forumCategories.sortOrder);
  return rows;
}

export async function getForumCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(forumCategories).where(eq(forumCategories.slug, slug)).limit(1);
  return row || null;
}

export async function listForumPosts(categoryId?: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const query = categoryId
    ? db.select().from(forumPosts).where(eq(forumPosts.categoryId, categoryId))
    : db.select().from(forumPosts);
  const rows = await query.orderBy(desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt), desc(forumPosts.createdAt)).limit(limit).offset(offset);
  return rows;
}

export async function getForumPost(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
  if (row) {
    // Increment view count
    await db.update(forumPosts).set({ viewCount: row.viewCount + 1 }).where(eq(forumPosts.id, id));
  }
  return row || null;
}

export async function createForumPost(data: { categoryId: number; authorId: number; title: string; content: string; tags?: string[]; postType?: string; isPinned?: number; threadStage?: string; chainId?: number; bioregionId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(forumPosts).values({
    categoryId: data.categoryId,
    authorId: data.authorId,
    title: data.title,
    content: data.content,
    tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
    postType: data.postType || null,
    isPinned: data.isPinned ?? 0,
    lastReplyAt: new Date(),
    lastReplyBy: data.authorId,
    threadStage: data.threadStage || null,
    chainId: data.chainId || null,
    bioregionId: data.bioregionId || null,
  });
  return result.insertId;
}

export async function listForumPostsByTag(tag: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(forumPosts)
    .where(like(forumPosts.tags, `%${tag}%`))
    .orderBy(desc(forumPosts.createdAt))
    .limit(limit)
    .offset(offset);
  // Filter accurately since LIKE may over-match
  return rows.filter(row => {
    if (!row.tags) return false;
    try {
      const tags = JSON.parse(row.tags);
      return Array.isArray(tags) && tags.includes(tag);
    } catch {
      return false;
    }
  });
}

export async function listForumReplies(postId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(forumReplies).where(eq(forumReplies.postId, postId)).orderBy(forumReplies.createdAt);
  return rows;
}

export async function createForumReply(data: { postId: number; authorId: number; content: string; parentReplyId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(forumReplies).values({
    postId: data.postId,
    authorId: data.authorId,
    content: data.content,
    parentReplyId: data.parentReplyId || null,
  });
  // Update post reply count and last reply info
  const post = await getForumPost(data.postId);
  if (post) {
    await db.update(forumPosts).set({
      replyCount: post.replyCount + 1,
      lastReplyAt: new Date(),
      lastReplyBy: data.authorId,
    }).where(eq(forumPosts.id, data.postId));
  }
  return result.insertId;
}

export async function toggleForumLike(userId: number, postId?: number, replyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(forumLikes.userId, userId)];
  if (postId) conditions.push(eq(forumLikes.postId, postId));
  if (replyId) conditions.push(eq(forumLikes.replyId, replyId));
  
  const existing = await db.select().from(forumLikes).where(and(...conditions)).limit(1);
  
  if (existing.length > 0) {
    await db.delete(forumLikes).where(eq(forumLikes.id, existing[0].id));
    return false; // unliked
  } else {
    await db.insert(forumLikes).values({ userId, postId: postId || null, replyId: replyId || null });
    return true; // liked
  }
}

export async function getForumLikeCounts(postId: number) {
  const db = await getDb();
  if (!db) return { postLikes: 0, replyLikes: {} as Record<number, number> };
  
  const postLikes = await db.select().from(forumLikes).where(eq(forumLikes.postId, postId));
  const replies = await listForumReplies(postId);
  const replyLikes: Record<number, number> = {};
  
  for (const reply of replies) {
    const likes = await db.select().from(forumLikes).where(eq(forumLikes.replyId, reply.id));
    replyLikes[reply.id] = likes.length;
  }
  
  return { postLikes: postLikes.length, replyLikes };
}

export async function getUserForumLikes(userId: number, postId: number) {
  const db = await getDb();
  if (!db) return { likedPost: false, likedReplies: [] as number[] };
  
  const likes = await db.select().from(forumLikes).where(eq(forumLikes.userId, userId));
  const likedPost = likes.some(l => l.postId === postId && !l.replyId);
  const likedReplies = likes.filter(l => l.replyId).map(l => l.replyId!);
  
  return { likedPost, likedReplies };
}

export async function getForumCategoryPostCounts() {
  const db = await getDb();
  if (!db) return {} as Record<number, number>;
  
  const posts = await db.select().from(forumPosts);
  const counts: Record<number, number> = {};
  for (const post of posts) {
    counts[post.categoryId] = (counts[post.categoryId] || 0) + 1;
  }
  return counts;
}

export async function deleteForumPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all replies and likes first
  await db.delete(forumReplies).where(eq(forumReplies.postId, id));
  await db.delete(forumLikes).where(eq(forumLikes.postId, id));
  await db.delete(forumPosts).where(eq(forumPosts.id, id));
}

export async function deleteForumReply(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.id, id)).limit(1);
  if (reply) {
    await db.delete(forumLikes).where(eq(forumLikes.replyId, id));
    await db.delete(forumReplies).where(eq(forumReplies.id, id));
    // Decrement post reply count
    const post = await getForumPost(reply.postId);
    if (post && post.replyCount > 0) {
      await db.update(forumPosts).set({ replyCount: post.replyCount - 1 }).where(eq(forumPosts.id, reply.postId));
    }
  }
}

export async function incrementReplyTriedThis(replyId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumReplies)
    .set({ triedThis: sql`${forumReplies.triedThis} + 1` })
    .where(eq(forumReplies.id, replyId));
  const [updated] = await db.select({ triedThis: forumReplies.triedThis }).from(forumReplies).where(eq(forumReplies.id, replyId)).limit(1);
  return updated?.triedThis ?? 0;
}

// ==========================================
// Forum Moderation Helpers
// ==========================================

export async function createForumReport(data: { reporterId: number; postId?: number; replyId?: number; reason: string; details?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(forumReports).values({
    reporterId: data.reporterId,
    postId: data.postId || null,
    replyId: data.replyId || null,
    reason: data.reason as any,
    details: data.details || null,
  });
  return result.insertId;
}

export async function listForumReports(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = status
    ? db.select().from(forumReports).where(eq(forumReports.status, status as any))
    : db.select().from(forumReports);
  return query.orderBy(desc(forumReports.createdAt));
}

export async function updateReportStatus(id: number, status: string, reviewedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumReports).set({
    status: status as any,
    reviewedBy,
    reviewedAt: new Date(),
  }).where(eq(forumReports.id, id));
}

export async function isForumModerator(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select().from(forumModerators).where(eq(forumModerators.userId, userId)).limit(1);
  return !!row;
}

export async function listForumModerators() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumModerators).orderBy(forumModerators.createdAt);
}

export async function addForumModerator(userId: number, addedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already a moderator
  const existing = await isForumModerator(userId);
  if (existing) return;
  await db.insert(forumModerators).values({ userId, addedBy });
}

export async function removeForumModerator(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(forumModerators).where(eq(forumModerators.userId, userId));
}

export async function isUserBanned(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const bans = await db.select().from(forumBans).where(eq(forumBans.userId, userId));
  // Check for active bans (permanent or not yet expired)
  return bans.some(ban => !ban.expiresAt || ban.expiresAt > new Date());
}

export async function banUser(userId: number, bannedBy: number, reason?: string, expiresAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(forumBans).values({
    userId,
    bannedBy,
    reason: reason || null,
    expiresAt: expiresAt || null,
  });
}

export async function unbanUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(forumBans).where(eq(forumBans.userId, userId));
}

export async function listBannedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumBans).orderBy(desc(forumBans.createdAt));
}

// Pin/Unpin and Lock/Unlock posts
export async function togglePinPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
  if (!post) return;
  await db.update(forumPosts).set({ isPinned: post.isPinned ? 0 : 1 }).where(eq(forumPosts.id, postId));
  return !post.isPinned;
}

export async function toggleLockPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
  if (!post) return;
  await db.update(forumPosts).set({ isLocked: post.isLocked ? 0 : 1 }).where(eq(forumPosts.id, postId));
  return !post.isLocked;
}

// ==========================================
// Quest Suggestion Helpers
// ==========================================

export async function listQuestSuggestions(sortBy: 'votes' | 'newest' = 'votes', limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const orderCol = sortBy === 'votes' ? desc(questSuggestions.voteCount) : desc(questSuggestions.createdAt);
  return db.select().from(questSuggestions).orderBy(orderCol).limit(limit).offset(offset);
}

export async function getQuestSuggestion(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(questSuggestions).where(eq(questSuggestions.id, id)).limit(1);
  return row || null;
}

export async function createQuestSuggestion(data: { authorId: number; title: string; description: string; category?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(questSuggestions).values({
    authorId: data.authorId,
    title: data.title,
    description: data.description,
    category: data.category || null,
  });
  return result.insertId;
}

export async function toggleQuestVote(userId: number, suggestionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [existing] = await db.select().from(questSuggestionVotes)
    .where(and(eq(questSuggestionVotes.userId, userId), eq(questSuggestionVotes.suggestionId, suggestionId)))
    .limit(1);
  
  if (existing) {
    await db.delete(questSuggestionVotes).where(eq(questSuggestionVotes.id, existing.id));
    // Decrement vote count
    const suggestion = await getQuestSuggestion(suggestionId);
    if (suggestion && suggestion.voteCount > 0) {
      await db.update(questSuggestions).set({ voteCount: suggestion.voteCount - 1 }).where(eq(questSuggestions.id, suggestionId));
    }
    return false; // unvoted
  } else {
    await db.insert(questSuggestionVotes).values({ userId, suggestionId });
    // Increment vote count
    const suggestion = await getQuestSuggestion(suggestionId);
    if (suggestion) {
      await db.update(questSuggestions).set({ voteCount: suggestion.voteCount + 1 }).where(eq(questSuggestions.id, suggestionId));
    }
    return true; // voted
  }
}

export async function getUserQuestVotes(userId: number) {
  const db = await getDb();
  if (!db) return [] as number[];
  const votes = await db.select().from(questSuggestionVotes).where(eq(questSuggestionVotes.userId, userId));
  return votes.map(v => v.suggestionId);
}

// ==========================================
// Translation Cache Helpers
// ==========================================

export async function getCachedTranslation(contentType: string, contentId: number, targetLang: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(translationCache)
    .where(and(
      eq(translationCache.contentType, contentType as any),
      eq(translationCache.contentId, contentId),
      eq(translationCache.targetLang, targetLang)
    ))
    .limit(1);
  return row || null;
}

export async function saveCachedTranslation(data: {
  contentType: string;
  contentId: number;
  sourceLang: string;
  targetLang: string;
  translatedTitle?: string;
  translatedContent: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Upsert: delete existing then insert
  await db.delete(translationCache).where(and(
    eq(translationCache.contentType, data.contentType as any),
    eq(translationCache.contentId, data.contentId),
    eq(translationCache.targetLang, data.targetLang)
  ));
  await db.insert(translationCache).values({
    contentType: data.contentType as any,
    contentId: data.contentId,
    sourceLang: data.sourceLang,
    targetLang: data.targetLang,
    translatedTitle: data.translatedTitle || null,
    translatedContent: data.translatedContent,
  });
}

// ==========================================
// User Profile Helpers
// ==========================================

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return row || null;
}

export async function upsertUserProfile(userId: number, data: {
  bio?: string;
  location?: string;
  website?: string;
  preferredLanguage?: string;
  path?: "investor" | "land_project" | "ally" | "player";
  onboardingComplete?: number;
  investmentRange?: string;
  projectName?: string;
  projectUrl?: string;
  organizationName?: string;
  questInterests?: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set({
      ...data,
    }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      userId,
      ...data,
    });
  }
}

export async function incrementUserReputation(userId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  const profile = await getUserProfile(userId);
  if (profile) {
    await db.update(userProfiles).set({ reputation: profile.reputation + amount }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, reputation: amount });
  }
}

export async function incrementUserPostCount(userId: number) {
  const db = await getDb();
  if (!db) return;
  const profile = await getUserProfile(userId);
  if (profile) {
    await db.update(userProfiles).set({ postCount: profile.postCount + 1 }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, postCount: 1 });
  }
}

export async function incrementUserReplyCount(userId: number) {
  const db = await getDb();
  if (!db) return;
  const profile = await getUserProfile(userId);
  if (profile) {
    await db.update(userProfiles).set({ replyCount: profile.replyCount + 1 }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, replyCount: 1 });
  }
}

// Get user's forum stats
export async function getUserForumStats(userId: number) {
  const db = await getDb();
  if (!db) return { postCount: 0, replyCount: 0, reputation: 0, likesReceived: 0 };
  
  const profile = await getUserProfile(userId);
  
  // Count likes received on user's posts and replies
  const userPosts = await db.select().from(forumPosts).where(eq(forumPosts.authorId, userId));
  const userReplies = await db.select().from(forumReplies).where(eq(forumReplies.authorId, userId));
  
  let likesReceived = 0;
  for (const post of userPosts) {
    const likes = await db.select().from(forumLikes).where(eq(forumLikes.postId, post.id));
    likesReceived += likes.length;
  }
  for (const reply of userReplies) {
    const likes = await db.select().from(forumLikes).where(eq(forumLikes.replyId, reply.id));
    likesReceived += likes.length;
  }
  
  return {
    postCount: profile?.postCount || userPosts.length,
    replyCount: profile?.replyCount || userReplies.length,
    reputation: profile?.reputation || 0,
    likesReceived,
  };
}

// Get user's recent posts
export async function getUserRecentPosts(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumPosts).where(eq(forumPosts.authorId, userId)).orderBy(desc(forumPosts.createdAt)).limit(limit);
}

// Get user's recent replies
export async function getUserRecentReplies(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumReplies).where(eq(forumReplies.authorId, userId)).orderBy(desc(forumReplies.createdAt)).limit(limit);
}

// Create notification for forum activity
export async function createForumNotification(data: { userId: number; type: string; title: string; message: string; postId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userNotifications).values({
    userId: data.userId,
    type: 'system' as any, // Using system type for forum notifications
    title: data.title,
    message: data.message,
    campaignId: data.postId || null, // Reuse campaignId field to store postId for linking
  });
}

// ─── Email Magic Link Token Functions ────────────────────────────────────────

export async function createEmailToken(data: { email: string; token: string; expiresAt: Date }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Clean up old unused tokens for this email before creating a new one
  await db.delete(emailTokens).where(and(eq(emailTokens.email, data.email), isNull(emailTokens.usedAt)));
  await db.insert(emailTokens).values(data);
}

export async function findAndConsumeEmailToken(token: string): Promise<EmailToken | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const rows = await db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.token, token), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Mark as used
  await db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id));
  return row;
}

// ─── Project Join Requests ───────────────────────────────────────────────────
export async function createProjectJoinRequest(data: InsertProjectJoinRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectJoinRequests).values(data);
  return (result[0] as any).insertId;
}

export async function getJoinRequestsForSteward(stewardUserId: number): Promise<ProjectJoinRequest[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectJoinRequests)
    .where(eq(projectJoinRequests.stewardUserId, stewardUserId))
    .orderBy(desc(projectJoinRequests.createdAt));
}

export async function getAllJoinRequests(): Promise<ProjectJoinRequest[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectJoinRequests).orderBy(desc(projectJoinRequests.createdAt));
}

export async function updateJoinRequestStatus(id: number, status: 'pending' | 'reviewed' | 'accepted' | 'rejected'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectJoinRequests).set({ status }).where(eq(projectJoinRequests.id, id));
}

// Route pending join requests to a newly approved steward
export async function routeJoinRequestsToSteward(orgId: string, stewardUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projectJoinRequests)
    .set({ stewardUserId })
    .where(and(eq(projectJoinRequests.targetId, orgId), isNull(projectJoinRequests.stewardUserId)));
}

// ─── Org Claims ──────────────────────────────────────────────────────────────
export async function createOrgClaim(data: InsertOrgClaim): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orgClaims).values(data);
  return (result[0] as any).insertId;
}

export async function getOrgClaimsByUser(userId: number): Promise<OrgClaim[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orgClaims).where(eq(orgClaims.userId, userId));
}

export async function getAllOrgClaims(): Promise<OrgClaim[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orgClaims).orderBy(desc(orgClaims.createdAt));
}

export async function updateOrgClaimStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<OrgClaim | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgClaims).set({ status }).where(eq(orgClaims.id, id));
  const rows = await db.select().from(orgClaims).where(eq(orgClaims.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getInvestorInquiryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(investorInquiries).where(eq(investorInquiries.userId, userId)).orderBy(desc(investorInquiries.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function searchApplications(query: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: applications.id,
    projectName: applications.projectName,
    location: applications.location,
    country: applications.country,
  }).from(applications)
    .where(
      and(
        ne(applications.status, "draft"),
        or(like(applications.projectName, `%${query}%`), like(applications.location, `%${query}%`))
      )
    )
    .limit(20);
  return rows;
}

// ─── C15: Project Connections ─────────────────────────────────────────────────

export async function getConnectionsForPost(postId: number): Promise<ProjectConnection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectConnections)
    .where(or(eq(projectConnections.postAId, postId), eq(projectConnections.postBId, postId)));
}

export async function getAllProjectConnections(): Promise<ProjectConnection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectConnections).orderBy(desc(projectConnections.createdAt));
}

export async function createProjectConnection(data: InsertProjectConnection): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectConnections).values(data);
  return result.insertId;
}

export async function deleteProjectConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectConnections).where(eq(projectConnections.id, id));
}

// ─── C13: Glossary Terms ──────────────────────────────────────────────────────

export async function getApprovedGlossaryTerms(): Promise<GlossaryTerm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(glossaryTerms).where(eq(glossaryTerms.status, "approved")).orderBy(glossaryTerms.term);
}

export async function getAllGlossaryTerms(): Promise<GlossaryTerm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(glossaryTerms).orderBy(glossaryTerms.term);
}

export async function approveGlossaryTerm(id: number, approvedBy: number, definition?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(glossaryTerms).set({
    status: "approved",
    approvedAt: new Date(),
    approvedBy,
    ...(definition ? { definition } : {}),
  }).where(eq(glossaryTerms.id, id));
}

export async function rejectGlossaryTerm(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(glossaryTerms).set({ status: "rejected" }).where(eq(glossaryTerms.id, id));
}

export async function addGlossaryTerm(data: InsertGlossaryTerm): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(glossaryTerms).values(data);
  return result.insertId;
}

export async function getGlossaryTermByName(term: string): Promise<GlossaryTerm | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(glossaryTerms).where(eq(glossaryTerms.term, term)).limit(1);
  return rows[0] || null;
}

// ─── C12: Digests ─────────────────────────────────────────────────────────────

export async function saveDigest(data: { periodStart: string; periodEnd: string; contentMd: string; forumPostId?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(digests).values({
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    contentMd: data.contentMd,
    forumPostId: data.forumPostId || null,
  });
  return result.insertId;
}

export async function getLatestDigest(): Promise<Digest | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(digests).orderBy(desc(digests.generatedAt)).limit(1);
  return rows[0] || null;
}

export async function getRecentForumPostsForDigest(): Promise<{ title: string; content: string; replyCount: number; viewCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    title: forumPosts.title,
    content: forumPosts.content,
    replyCount: forumPosts.replyCount,
    viewCount: forumPosts.viewCount,
  }).from(forumPosts)
    .where(gt(forumPosts.createdAt, weekAgo))
    .orderBy(desc(forumPosts.replyCount))
    .limit(10);
  return rows;
}

// ─── C9: Knowledge Map ────────────────────────────────────────────────────────
export async function listKnowledgeMapEntries(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = categoryId
    ? db.select().from(knowledgeMapEntries).where(eq(knowledgeMapEntries.categoryId, categoryId))
    : db.select().from(knowledgeMapEntries);
  return query.orderBy(knowledgeMapEntries.sortOrder, knowledgeMapEntries.createdAt);
}

export async function listPendingKnowledgeMapSuggestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeMapEntries)
    .where(eq(knowledgeMapEntries.suggestedByAI, 1))
    .orderBy(knowledgeMapEntries.createdAt);
}

export async function addKnowledgeMapEntry(data: InsertKnowledgeMapEntry) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(knowledgeMapEntries).values(data);
  return (result as any).insertId as number;
}

export async function approveKnowledgeMapEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(knowledgeMapEntries).set({ approvedAt: new Date() }).where(eq(knowledgeMapEntries.id, id));
}

export async function deleteKnowledgeMapEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(knowledgeMapEntries).where(eq(knowledgeMapEntries.id, id));
}

export async function reorderKnowledgeMapEntry(id: number, sortOrder: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(knowledgeMapEntries).set({ sortOrder }).where(eq(knowledgeMapEntries.id, id));
}
