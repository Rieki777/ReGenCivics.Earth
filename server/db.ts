import { and, desc, eq, getTableColumns, gt, inArray, isNotNull, isNull, like, ne, not, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schemaTables from "../drizzle/schema";
import * as schemaRelations from "../drizzle/relations";
import { applications, InsertUser, playerProfiles, users, savedContributions, InsertSavedContribution, SavedContribution, campaigns, Campaign, campaignItems, CampaignItem, campaignContributions, CampaignContribution, InsertCampaignContribution, campaignUpdates, CampaignUpdate, campaignFollowers, InsertCampaignFollower, userFollows, campaignAnalytics, InsertCampaignAnalytic, userNotifications, InsertUserNotification, UserNotification, notifications, Notification, forumPostTags, letterOfIntent, InsertLetterOfIntent, LetterOfIntent, notificationPreferences, NotificationPreferences, InsertNotificationPreferences, emailTemplates, EmailTemplate, InsertEmailTemplate, campaignImages, CampaignImage, InsertCampaignImage, forumCategories, ForumCategory, forumPosts, ForumPost, forumReplies, ForumReply, forumLikes, ForumLike, forumReports, ForumReport, forumModerators, ForumModerator, forumBans, ForumBan, questSuggestions, QuestSuggestion, questSuggestionVotes, QuestSuggestionVote, translationCache, TranslationCacheEntry, userProfiles, UserProfile, emailTokens, InsertEmailToken, EmailToken, projectJoinRequests, ProjectJoinRequest, InsertProjectJoinRequest, orgClaims, OrgClaim, InsertOrgClaim, projectConnections, InsertProjectConnection, ProjectConnection, digests, Digest, glossaryTerms, GlossaryTerm, InsertGlossaryTerm, knowledgeMapEntries, KnowledgeMapEntry, InsertKnowledgeMapEntry, siteSettings, questCompletions, QuestCompletion, InsertQuestCompletion, bannedEmails, adminAuditLog, InsertAdminAuditLog, eventAttendance, EventAttendance, InsertEventAttendance, regenTokenLedger, RegenTokenLedger, InsertRegenTokenLedger, communityAgreements, CommunityAgreement, communityAgreementVotes, CommunityAgreementVote } from "../drizzle/schema";
import { ENV } from './_core/env';
import { emailGrantsAdmin } from "@shared/adminRole";

// Moved to server/db/_shared.ts so the extracted domain modules can use it
// too. Imported (not re-exported) because it stays internal to server/db/.
import { asMutationResult } from "./db/_shared";

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
      // Pass tables + relations so the relational query API
      // (`db.query.<table>.findMany({ with: ... })`) is available.
      const fullSchema = { ...schemaTables, ...schemaRelations };
      _db = drizzle(pool as any, { schema: fullSchema, mode: 'default' });
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
    } else if (user.openId === ENV.ownerOpenId || emailGrantsAdmin(user.email)) {
      const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.openId, user.openId)).limit(1);
      if (!existing || existing.role === "user") {
        values.role = "admin";
        updateSet.role = "admin";
      }
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Check if email is banned before allowing sign-in/registration
    if (values.email) {
      const banned = await db.select().from(bannedEmails).where(eq(bannedEmails.email, values.email)).limit(1);
      if (banned.length > 0) {
        throw new Error("Unable to create account");
      }
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Make sure the user has a handle. Idempotent: returns early if handle already set.
    try {
      const fresh = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
      if (fresh.length && !fresh[0].handle) {
        await ensureHandleForUser(fresh[0].id);
      }
    } catch (handleErr) {
      console.warn("[Database] Failed to assign handle on upsert (non-fatal):", handleErr);
    }
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

/** Find a user by email (case-insensitive). Returns undefined when not found. */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = email.toLowerCase().trim();
  const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Link a GitHub account to the player_profiles row for a given openId.
 * Called from the GitHub OAuth callback. De-duplicates: if another profile
 * already holds this githubId, the call returns false without updating.
 */
export async function linkGithubToProfile(
  openId: string,
  github: { githubId: number; githubHandle: string; githubLinkedAt: Date },
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { playerProfiles } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  // Find the user
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
  if (!user) return false;
  // De-dup: reject if another profile already holds this githubId
  const [existing] = await db
    .select({ userId: playerProfiles.userId })
    .from(playerProfiles)
    .where(and(eq(playerProfiles.githubId, github.githubId)))
    .limit(1);
  if (existing && existing.userId !== user.id) return false;
  await db.update(playerProfiles).set({
    githubId: github.githubId,
    githubHandle: github.githubHandle,
    githubLinkedAt: github.githubLinkedAt,
  }).where(eq(playerProfiles.userId, user.id));
  return true;
}

export async function getUsersByIds(ids: number[]): Promise<Record<number, typeof users.$inferSelect>> {
  if (ids.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const unique = Array.from(new Set(ids));
  const rows = await db.select().from(users).where(inArray(users.id, unique));
  return Object.fromEntries(rows.map(u => [u.id, u]));
}

/** Generic partial update for a user row. */
export async function updateUser(userId: number, data: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data as any).where(eq(users.id, userId));
}

// ============================================
// Handle helpers
// ============================================

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function isValidHandle(h: string): boolean {
  return HANDLE_RE.test(h);
}

/** Normalize a name into a base handle slug. Returns "" if no usable chars. */
export function slugifyHandle(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 38);
}

/** Find an unused handle by appending -2, -3, ... if needed. */
export async function pickAvailableHandle(base: string, fallbackId?: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let candidate = base || (fallbackId != null ? `player-${fallbackId}` : "");
  if (!candidate || !isValidHandle(candidate)) {
    candidate = fallbackId != null ? `player-${fallbackId}` : `player-${Date.now()}`;
  }
  let suffix = 1;
  let attempt = candidate;
  // Loop until we find a free handle
  while (true) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.handle, attempt)).limit(1);
    if (existing.length === 0) return attempt;
    suffix += 1;
    attempt = `${candidate}-${suffix}`.slice(0, 40);
    if (suffix > 999) {
      // Defensive: shouldn't happen in practice
      return `${candidate}-${Date.now().toString(36)}`.slice(0, 40);
    }
  }
}

export async function getUserByHandle(handle: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.handle, handle.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Assign a handle to a user that does not yet have one. No-op if user already has a handle. */
export async function ensureHandleForUser(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing.length) return null;
  const user = existing[0];
  if (user.handle) return user.handle;
  const base = slugifyHandle(user.name) || (user.email ? slugifyHandle(user.email.split("@")[0]) : "");
  const handle = await pickAvailableHandle(base, user.id);
  await db.update(users).set({ handle }).where(eq(users.id, userId));
  return handle;
}

/** Update a user's handle. Caller is responsible for validation, uniqueness check happens at DB level. */
export async function updateUserHandle(userId: number, handle: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ handle: handle.toLowerCase(), handleLastChangedAt: new Date() }).where(eq(users.id, userId));
}

// ============================================
// Application Queries
// ============================================
// Extracted to server/db/applications.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working.
export {
  createApplication,
  updateApplication,
  getApplicationById,
  getApplicationsByUserId,
  getAllApplications,
  getDraftApplications,
  deleteStaleApplicationDrafts,
  getApplicationsByStatus,
} from "./db/applications";

// ============================================
// Review Queries (reviews + reviewer roster)
// ============================================
// Extracted to server/db/reviews.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working.
export {
  createReview,
  getReviewsByApplicationId,
  updateReview,
  createReviewerEmail,
  getReviewerEmailById,
  getAllReviewerEmails,
  getActiveReviewerEmails,
  updateReviewerEmail,
  deleteReviewerEmail,
} from "./db/reviews";

// ============================================
// Inquiry Queries (investor + general catch-all routing form)
// ============================================
// Extracted to server/db/inquiries.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working.
export {
  createInvestorInquiry,
  getInvestorInquiryById,
  getAllInvestorInquiries,
  getInvestorInquiriesByStatus,
  updateInvestorInquiry,
  getInvestorInquiryByUserId,
  createGeneralInquiry,
  getGeneralInquiryById,
  getAllGeneralInquiries,
  getGeneralInquiriesByPath,
  getGeneralInquiriesByStatus,
  updateGeneralInquiry,
} from "./db/inquiries";


// ============================================
// Newsletter Subscriber Queries
// ============================================
// Extracted to server/db/newsletter.ts (foundation audit Phase 2, first
// domain out of the god module). Re-exported so existing imports of "./db"
// keep working. Follow this pattern for the remaining domains.
export {
  createNewsletterSubscriber,
  getNewsletterSubscriberByEmail,
  getAllNewsletterSubscribers,
  getActiveNewsletterSubscribers,
  getRecordingSubscribers,
  unsubscribeNewsletter,
  activateNewsletterSubscriber,
} from "./db/newsletter";


// ============================================
// Video Suggestions Queries
// ============================================
// Extracted to server/db/videoSuggestions.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working.
export {
  createVideoSuggestion,
  getVideoSuggestionById,
  getAllVideoSuggestions,
  getApprovedVideoSuggestions,
  getPublicVideoSuggestions,
  updateVideoSuggestion,
  deleteVideoSuggestion,
} from "./db/videoSuggestions";


// ============================================
// Player Profile Queries
// ============================================
// Extracted to server/db/playerProfiles.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working. Only the profile
// CRUD moved; the many other queries that read the playerProfiles table
// (tokens, contribution scores, tiers) belong to their own domains.
//
// getPlayerProfileByUserId is imported as well as re-exported: db.ts calls it
// internally in four places, and `export ... from` alone creates no local
// binding.
import { getPlayerProfileByUserId } from "./db/playerProfiles";

export {
  createPlayerProfile,
  getPlayerProfileById,
  getPlayerProfileByUserId,
  getPlayerProfilesByUserIds,
  getPlayerProfileByBaseAccount,
  getAllPlayerProfiles,
  getVerifiedPlayerProfiles,
  updatePlayerProfile,
  deletePlayerProfile,
} from "./db/playerProfiles";


// ============================================
// Player Contributions Queries
// ============================================
// Extracted to server/db/playerContributions.ts (foundation audit Phase 2).
// Re-exported so existing imports of "./db" keep working.
export {
  createPlayerContribution,
  getPlayerContributionsByProfileId,
  deletePlayerContribution,
  updatePlayerContributionStatus,
} from "./db/playerContributions";


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
    kind?: 'item' | 'role' | 'shift' | 'loan' | 'knowledge' | 'crypto' | 'financial_link';
    capitalType?: 'intellectual' | 'social' | 'material' | 'financial' | 'living' | 'cultural' | 'spiritual' | 'experiential' | 'health';
    quantityWanted?: number;
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
      // Needs registry taxonomy: wizard sends kind + capitalType; legacy callers get sane defaults.
      kind: item.kind ?? (item.category === 'role' ? 'role' : 'item'),
      capitalType: item.capitalType ?? (item.category === 'land' ? 'living' : item.category === 'role' ? 'experiential' : 'material'),
      quantityWanted: item.quantityWanted ?? item.equipmentQuantity ?? item.resourceQuantity ?? 1,
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

export async function getCampaignImagesForMany(campaignIds: number[]): Promise<Record<number, CampaignImage[]>> {
  if (campaignIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(campaignImages)
    .where(inArray(campaignImages.campaignId, Array.from(new Set(campaignIds))))
    .orderBy(desc(campaignImages.isCover), campaignImages.sortOrder);
  const result: Record<number, CampaignImage[]> = {};
  for (const row of rows) {
    if (!result[row.campaignId]) result[row.campaignId] = [];
    result[row.campaignId].push(row);
  }
  return result;
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
  return asMutationResult(result).affectedRows > 0;
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


// ============================================
// Crowdpooling: needs, followers, updates
// (CROWDPOOLING_PLATFORM_SPEC.md Part C)
// ============================================

export async function getCampaignItemById(id: number): Promise<CampaignItem | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(campaignItems).where(eq(campaignItems.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Real contributor count for a campaign: distinct emails across every
 * contribution that made it past review (accepted, fulfilled, or thanked).
 * Replaces the hardcoded 0 on campaigns.getById.
 */
export async function getCampaignContributorsCount(campaignId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ c: sql<number>`COUNT(DISTINCT ${campaignContributions.contributorEmail})` })
    .from(campaignContributions)
    .where(and(
      eq(campaignContributions.campaignId, campaignId),
      inArray(campaignContributions.status, ['accepted', 'fulfilled', 'thanked']),
    ));
  return Number(result[0]?.c ?? 0);
}

/**
 * Email-only follower upsert. The unique key on (campaignId, email) makes a
 * duplicate a silent no-op: subscribeByEmail must never reveal whether an
 * email is already on the list.
 */
export async function upsertCampaignFollower(data: InsertCampaignFollower): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(campaignFollowers)
    .values(data)
    .onDuplicateKeyUpdate({ set: { id: sql`id` } });
}

/** Account holders following a campaign via the polymorphic user_follows table. */
export async function getCampaignFollowerUserIds(campaignId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({ userId: userFollows.userId }).from(userFollows)
    .where(and(
      eq(userFollows.targetType, 'campaign'),
      eq(userFollows.targetId, String(campaignId)),
    ));
  return rows.map(r => r.userId);
}

/**
 * Create a numbered journal entry. updateNumber is max+1 per campaign,
 * computed here so the procedure layer stays thin.
 */
export async function createCampaignUpdate(data: {
  campaignId: number;
  authorId: number;
  title: string;
  body: string;
  imageUrls?: string[];
}): Promise<{ id: number; updateNumber: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [maxRow] = await db
    .select({ maxNumber: sql<number>`COALESCE(MAX(${campaignUpdates.updateNumber}), 0)` })
    .from(campaignUpdates)
    .where(eq(campaignUpdates.campaignId, data.campaignId));
  const updateNumber = Number(maxRow?.maxNumber ?? 0) + 1;

  const result = await db.insert(campaignUpdates).values({
    campaignId: data.campaignId,
    authorId: data.authorId,
    updateNumber,
    title: data.title,
    body: data.body,
    imageUrls: data.imageUrls ?? null,
    publishedAt: new Date(),
  });

  return { id: result[0].insertId, updateNumber };
}

export async function listCampaignUpdates(campaignId: number): Promise<CampaignUpdate[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(campaignUpdates)
    .where(eq(campaignUpdates.campaignId, campaignId))
    .orderBy(desc(campaignUpdates.updateNumber));
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
// As of migration 0163, all in-app notifications live in the consolidated
// `notifications` table (user_notifications rows were back-filled there).
// These helpers keep their legacy names so existing writers (campaigns,
// hypha-bridge webhooks) work unchanged.

/** Legacy type → in-app destination, mirroring the old NotificationBell map.
 * New forum notifications set an explicit deep link instead. */
function legacyNotificationLink(type: string, campaignId?: number | null): string | null {
  switch (type) {
    case 'contribution_accepted':
    case 'contribution_rejected':
    case 'new_contribution':
      return '/profile?tab=contributions';
    case 'campaign_milestone':
      // Router paths are /campaign/:id (singular) and /crowd-pooling
      // (hyphenated); the old plural/unhyphenated forms 404ed.
      return campaignId ? `/campaign/${campaignId}` : '/crowd-pooling';
    case 'quest_complete':
      return '/quest';
    case 'claim_complete':
    case 'claim_failed':
      // These are about tokens moving to the user's wallet; the
      // Contributions tab is where balances and claim state live.
      return '/profile?tab=contributions';
    default:
      return null;
  }
}

const NOTIFICATION_TYPES = new Set(notifications.type.enumValues as readonly string[]);

export async function createUserNotification(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  campaignId?: number | null;
  contributionId?: number | null;
  link?: string | null;
}): Promise<number> {
  // Skip writing in-app notifications during test runs to prevent test data leaking to real users
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values({
    userId: data.userId,
    // Unknown types land as 'system' instead of failing the enum.
    type: (NOTIFICATION_TYPES.has(data.type) ? data.type : 'system') as typeof notifications.$inferInsert.type,
    title: data.title,
    body: data.message,
    link: data.link ?? legacyNotificationLink(data.type, data.campaignId),
    campaignId: data.campaignId ?? null,
    contributionId: data.contributionId ?? null,
  });

  // Push an SSE invalidate event so the recipient's UI updates without
  // waiting for the polling fallback. Lazy import to avoid pulling the
  // SSE broadcaster into test contexts.
  if (data.userId) {
    import('./_core/sse')
      .then(({ pushToUser }) => pushToUser(data.userId, {
        type: 'invalidate',
        keys: ['notifications', 'unreadCount'],
      }))
      .catch(() => {/* best-effort; broadcaster failure shouldn't block */});
  }

  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ c: sql<number>`COUNT(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return Number(result[0]?.c ?? 0);
}

export async function markNotificationAsRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications)
    .set({ isRead: 1 })
    .where(eq(notifications.userId, userId));
}

export async function deleteNotification(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
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

type PublicStats = {
  applications: number;
  members: number;
  landProjects: number;
  investorsCommitted: number;
  /** Distinct quest completions across all users. Public traction signal. */
  questsCompleted: number;
  /** Distinct bioregions touched by at least one user / project. */
  bioregionsTouched: number;
};

// Cache key bumped to v2 to invalidate the older 4-field shape so cached
// payloads do not surface as undefined on the new fields.
const PUBLIC_STATS_CACHE_KEY = 'stats:public:v2';
const PUBLIC_STATS_TTL = 3600; // 1 hour, churn is low and these counts are
                                // never load-bearing on a transactional path.

export async function getPublicStats(): Promise<PublicStats> {
  // Lazy import to avoid a circular dep with server/cache.ts.
  const { cacheGet, cacheSet } = await import('./cache');
  const cached = await cacheGet<PublicStats>(PUBLIC_STATS_CACHE_KEY);
  if (cached) return cached;

  const db = await getDb();
  if (!db) return { applications: 0, members: 0, landProjects: 0, investorsCommitted: 0, questsCompleted: 0, bioregionsTouched: 0 };

  // COUNT(*) on each table beats SELECT *; the previous implementation
  // streamed every row across the wire and counted in JS. Quest count and
  // bioregions count added 2026-06-18 for the TractionStrip on / and
  // /fund. Bioregions is COUNT(DISTINCT) over user_bioregions so an empty
  // bioregions table without user mappings stays at zero.
  const { bioregions: bioregionsTbl, userBioregions } = await import('../drizzle/schema');
  const [appsCount, usersCount, loisCount, projectsCount, questsCount, bioregionsCount] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)` }).from(applications),
    db.select({ c: sql<number>`COUNT(*)` }).from(users),
    db.select({ c: sql<number>`COUNT(*)` }).from(letterOfIntent).where(eq(letterOfIntent.status, 'confirmed')),
    db.select({ c: sql<number>`COUNT(*)` }).from(crowdPoolingProjects).where(eq(crowdPoolingProjects.status, 'active')),
    db.select({ c: sql<number>`COUNT(*)` }).from(questCompletions),
    db.select({ c: sql<number>`COUNT(DISTINCT ${userBioregions.bioregionId})` }).from(userBioregions),
  ]);

  // If user_bioregions is empty, fall back to total bioregions configured
  // so the strip never says "0 bioregions" while the table has rows.
  let bioregionsTouched = Number(bioregionsCount[0]?.c ?? 0);
  if (bioregionsTouched === 0) {
    const [fallback] = await db.select({ c: sql<number>`COUNT(*)` }).from(bioregionsTbl);
    bioregionsTouched = Number(fallback?.c ?? 0);
  }

  const result: PublicStats = {
    applications: Number(appsCount[0]?.c ?? 0),
    members: Number(usersCount[0]?.c ?? 0),
    landProjects: Number(projectsCount[0]?.c ?? 0),
    investorsCommitted: Number(loisCount[0]?.c ?? 0),
    questsCompleted: Number(questsCount[0]?.c ?? 0),
    bioregionsTouched,
  };
  await cacheSet(PUBLIC_STATS_CACHE_KEY, result, PUBLIC_STATS_TTL);
  return result;
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
  bodyFormat?: string;
  layout?: string | null;
  label?: string | null;
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
      bodyFormat: data.bodyFormat ?? "html",
      layout: data.layout ?? null,
      label: data.label ?? null,
    }).onDuplicateKeyUpdate({
      set: {
        customSubject: data.customSubject ?? null,
        customBody: data.customBody ?? null,
        isActive: data.isActive ?? 1,
        lastEditedBy: data.lastEditedBy ?? null,
        bodyFormat: data.bodyFormat ?? "html",
        layout: data.layout ?? null,
        label: data.label ?? null,
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

export async function createForumCategory(data: { name: string; slug: string; description?: string; icon?: string; color?: string; imageUrl?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(forumCategories).values({
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    icon: data.icon ?? null,
    color: data.color ?? null,
    imageUrl: data.imageUrl ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return asMutationResult(result).insertId;
}

export async function updateForumCategory(id: number, data: { name?: string; description?: string; icon?: string; color?: string; imageUrl?: string; sortOrder?: number; sortMode?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(forumCategories).set(data).where(eq(forumCategories.id, id));
}

export async function deleteForumCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(forumCategories).where(eq(forumCategories.id, id));
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

// Read-only fetch for the crawler content injector: no view-count increment,
// so bot traffic never inflates community stats.
export async function getForumPostSnapshot(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
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
  // Maintain the forum_post_tags query projection (the tags column is a
  // JSON string only matchable with LIKE scans; the junction is indexed).
  if (data.tags && data.tags.length > 0) {
    await db.insert(forumPostTags)
      .values(data.tags.map((tag) => ({ postId: result.insertId, tag })))
      .onDuplicateKeyUpdate({ set: { id: sql`id` } })
      .catch((err: any) => console.warn('[createForumPost] tag projection insert failed:', err?.message));
  }
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

export async function listForumPostsByChainId(chainId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumPosts)
    .where(or(eq(forumPosts.id, chainId), eq(forumPosts.chainId, chainId)))
    .orderBy(forumPosts.createdAt);
}

export async function listForumChainPosts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumPosts)
    .where(isNotNull(forumPosts.threadStage))
    .orderBy(desc(forumPosts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listForumPostsByType(postType: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumPosts)
    .where(eq(forumPosts.postType, postType))
    .orderBy(desc(forumPosts.createdAt))
    .limit(limit)
    .offset(offset);
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

  const rows = await db
    .select({ categoryId: forumPosts.categoryId, count: sql<number>`count(*)` })
    .from(forumPosts)
    .groupBy(forumPosts.categoryId);

  const counts: Record<number, number> = {};
  for (const row of rows) {
    counts[row.categoryId] = Number(row.count);
  }
  return counts;
}

export async function updateForumPost(id: number, data: { title: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumPosts).set({ title: data.title, content: data.content }).where(eq(forumPosts.id, id));
}

export async function deleteForumPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all replies and likes first
  await db.delete(forumReplies).where(eq(forumReplies.postId, id));
  await db.delete(forumLikes).where(eq(forumLikes.postId, id));
  await db.delete(forumPosts).where(eq(forumPosts.id, id));
}

export async function getForumReply(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.id, id)).limit(1);
  return reply ?? null;
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

export async function createForumReport(data: { reporterId: number; postId?: number; replyId?: number; reason: string; details?: string; severity?: "soft" | "hard" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(forumReports).values({
    reporterId: data.reporterId,
    postId: data.postId || null,
    replyId: data.replyId || null,
    reason: data.reason as any,
    details: data.details || null,
    severity: (data.severity || "soft") as any,
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
  bannerUrl?: string;
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

  // Forward-sync shared fields to playerProfiles (0169, Phase 2B). The forum
  // reads profile data from playerProfiles now, so an onboarding/settings save
  // to userProfiles must mirror across. Symmetric with the reverse sync in
  // updatePlayerProfile; both write the other table DIRECTLY (no recursion).
  const syncFields: Record<string, string | number | undefined> = {};
  if (data.avatarUrl !== undefined) syncFields.avatarUrl = data.avatarUrl;
  if (data.displayName !== undefined) syncFields.displayName = data.displayName;
  if (data.bio !== undefined) syncFields.bio = data.bio;
  if (data.bannerUrl !== undefined) syncFields.bannerUrl = data.bannerUrl;
  if (data.website !== undefined) syncFields.website = data.website;
  if (data.location !== undefined) syncFields.forumLocation = data.location;
  if (data.preferredLanguage !== undefined) syncFields.preferredLanguage = data.preferredLanguage;
  if (data.onboardingComplete !== undefined) syncFields.onboardingComplete = data.onboardingComplete;
  if (Object.keys(syncFields).length > 0) {
    try {
      const pp = await getPlayerProfileByUserId(userId);
      if (pp) {
        await db.update(playerProfiles).set(syncFields).where(eq(playerProfiles.userId, userId));
      }
    } catch (_e) {
      // Non-critical: log but don't fail the profile save
      console.warn("Failed to sync profile fields to playerProfiles:", _e);
    }
  }
}

/**
 * The forum's view of a user's profile, read from playerProfiles (the unified
 * model as of 0169). Field names match the old userProfiles shape the forum
 * client expects (location = forumLocation) so no client change is needed.
 * Returns null when the user has no playerProfiles row.
 */
export async function getForumProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const pp = await getPlayerProfileByUserId(userId);
  if (!pp) return null;
  return {
    userId,
    displayName: pp.displayName ?? null,
    bio: pp.bio ?? null,
    location: (pp as any).forumLocation ?? null,
    website: (pp as any).website ?? null,
    avatarUrl: pp.avatarUrl ?? null,
    bannerUrl: pp.bannerUrl ?? null,
    reputation: (pp as any).reputation ?? 0,
    preferredLanguage: (pp as any).preferredLanguage ?? "en",
  };
}

/**
 * Update the forum-editable profile fields on playerProfiles, mirroring to
 * userProfiles so onboarding/settings surfaces stay consistent.
 */
export async function updateForumProfile(userId: number, data: {
  bio?: string;
  location?: string;
  website?: string;
  preferredLanguage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const ppFields: Record<string, string | undefined> = {};
  if (data.bio !== undefined) ppFields.bio = data.bio;
  if (data.location !== undefined) ppFields.forumLocation = data.location;
  if (data.website !== undefined) ppFields.website = data.website;
  if (data.preferredLanguage !== undefined) ppFields.preferredLanguage = data.preferredLanguage;
  if (Object.keys(ppFields).length > 0) {
    const pp = await getPlayerProfileByUserId(userId);
    if (pp) {
      await db.update(playerProfiles).set(ppFields).where(eq(playerProfiles.userId, userId));
    }
  }
  // Mirror to userProfiles (kept alive for onboarding fields).
  await upsertUserProfile(userId, data);
}

export async function incrementUserReputation(userId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  // Reputation lives on playerProfiles now (0169). Mirror to userProfiles for
  // as long as that table is kept.
  const pp = await getPlayerProfileByUserId(userId);
  if (pp) {
    await db.update(playerProfiles)
      .set({ reputation: ((pp as any).reputation ?? 0) + amount })
      .where(eq(playerProfiles.userId, userId));
  }
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
  
  // Reputation reads from playerProfiles now (0169); post/reply counts have
  // always been computed live from the row counts below.
  const forumProfile = await getForumProfile(userId);

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
    postCount: userPosts.length,
    replyCount: userReplies.length,
    reputation: forumProfile?.reputation || 0,
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

  // Atomic consume: UPDATE ... WHERE usedAt IS NULL AND token = ? AND expiresAt > ?.
  // Two concurrent verify requests for the same token used to both pass the
  // "is unused?" check then both write usedAt, allowing a magic link to log
  // in twice. The atomic UPDATE returns affectedRows=1 only for the request
  // that won the race; the loser sees affectedRows=0 and gets null. Found in
  // 2026-04-25 deep security audit.
  const updateResult: any = await db
    .update(emailTokens)
    .set({ usedAt: now })
    .where(and(
      eq(emailTokens.token, token),
      isNull(emailTokens.usedAt),
      gt(emailTokens.expiresAt, now),
    ));

  // mysql2 returns { affectedRows } in the result header. Drizzle's mysql
  // driver wraps that as result[0].affectedRows.
  const affectedRows = updateResult?.[0]?.affectedRows ?? updateResult?.affectedRows ?? 0;
  if (affectedRows === 0) return null;

  // Now safe to fetch the row for the caller (it's marked used and locked
  // out from any concurrent consumer).
  const rows = await db
    .select()
    .from(emailTokens)
    .where(eq(emailTokens.token, token))
    .limit(1);
  return rows[0] ?? null;
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

export type OrgClaimWithClaimant = OrgClaim & {
  claimantName: string | null;
  claimantEmail: string | null;
};

export async function getAllOrgClaims(): Promise<OrgClaimWithClaimant[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      ...getTableColumns(orgClaims),
      claimantName: users.name,
      claimantEmail: users.email,
    })
    .from(orgClaims)
    .leftJoin(users, eq(users.id, orgClaims.userId))
    .orderBy(desc(orgClaims.createdAt));
}

export async function updateOrgClaimStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected',
  adminNotes?: string,
): Promise<OrgClaim | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: Record<string, unknown> = { status, reviewedAt: new Date() };
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  await db.update(orgClaims).set(updates as any).where(eq(orgClaims.id, id));
  const rows = await db.select().from(orgClaims).where(eq(orgClaims.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Ensure a forum thread exists for a land project or alliance org.
 * Called on claim approval. Idempotent, safe to call multiple times.
 * Checks by title in the relevant category, creates if missing.
 */
export async function ensureEntityForumThread(
  entityType: 'land_project' | 'alliance_org',
  entityName: string,
  authorId: number,
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const categorySlug = entityType === 'land_project' ? 'land-projects' : 'alliance-partners';
  const cats = await db.select().from(forumCategories).where(eq(forumCategories.slug, categorySlug)).limit(1);
  if (!cats.length) return null;
  const categoryId = cats[0].id;

  // Check if a thread with this title already exists in the category
  const existing = await db.select({ id: forumPosts.id })
    .from(forumPosts)
    .where(and(eq(forumPosts.categoryId, categoryId), eq(forumPosts.title, entityName)))
    .limit(1);
  if (existing.length) return existing[0].id;

  // Create the thread
  const isLandProject = entityType === 'land_project';
  const content = isLandProject
    ? `## Welcome to ${entityName}'s space in the Gathering Grove\n\nYou're the steward here. This is your project's home in the ReGen Civics community.\n\nStart by introducing yourself: who you are, what this land holds, and what you're building. People want to know the human behind the project.\n\n---\n\n*This thread was created when you claimed ${entityName}. It lives in the Land Project Spaces section of the forum.*`
    : `## Welcome to ${entityName}'s space in the Gathering Grove\n\nYou're representing this organisation here. This is your alliance partner's home in the ReGen Civics community.\n\nStart by introducing your organisation: what it does, how it connects to the regenerative mission, and how people can get involved.\n\n---\n\n*This thread was created when you claimed ${entityName}. It lives in the Alliance Organisations section of the forum.*`;

  const [result] = await db.insert(forumPosts).values({
    categoryId,
    authorId,
    title: entityName,
    content,
    isPinned: 1,
    isLocked: 0,
    viewCount: 0,
    replyCount: 0,
    lastReplyAt: new Date(),
    lastReplyBy: authorId,
  });
  return asMutationResult(result).insertId ?? null;
}

// getInvestorInquiryByUserId lives in server/db/inquiries.ts with the rest of
// the domain; it is re-exported above.

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

export async function getRecentForumPostsForDigest(): Promise<{ id: number; title: string; content: string; replyCount: number; viewCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    id: forumPosts.id,
    title: forumPosts.title,
    content: forumPosts.content,
    replyCount: forumPosts.replyCount,
    viewCount: forumPosts.viewCount,
  }).from(forumPosts)
    .where(
      and(
        gt(forumPosts.createdAt, weekAgo),
        // Exclude automated test posts from Vitest and CI runs
        not(like(forumPosts.title, 'Test%')),
        not(like(forumPosts.title, '%Vitest%')),
        not(like(forumPosts.title, '%[test]%')),
        // Exclude Assembly walkthrough threads (seed-assembly-examples.ts marks
        // every demo body with this prefix); they are fictional teaching content
        // and must not reach subscriber digests as real community activity
        not(like(forumPosts.content, '[EXAMPLE%')),
      )
    )
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
  return asMutationResult(result).insertId;
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

// ─── Site Settings ────────────────────────────────────────────────────────────

export async function getSiteSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteSettings).values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── Quest Completions ────────────────────────────────────────────────────────

export async function getQuestCompletionsForUser(userId: number): Promise<QuestCompletion[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questCompletions)
    .where(eq(questCompletions.userId, userId))
    .orderBy(desc(questCompletions.completedAt));
}

export async function createQuestCompletion(data: InsertQuestCompletion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(questCompletions).values(data);
  return asMutationResult(result).insertId;
}

export async function updateQuestCompletionNote(id: number, userId: number, note: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(questCompletions)
    .set({ artifactText: note })
    .where(and(eq(questCompletions.id, id), eq(questCompletions.userId, userId)));
}

// ============================================
// Admin Audit Log
// ============================================

/**
 * Record an admin action in the immutable audit log.
 * Fire-and-forget: never throws so it cannot disrupt the calling mutation.
 */
export async function logAdminAction(entry: {
  adminUserId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(adminAuditLog).values({
      adminUserId: entry.adminUserId,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      description: entry.description ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    console.warn("[AuditLog] Failed to write audit entry:", e);
  }
}

/**
 * Retrieve the audit log for admin display.
 * Sorted newest-first. Optionally filtered by adminUserId or entityType.
 */
export async function getAdminAuditLog(opts?: {
  adminUserId?: number;
  entityType?: string;
  limit?: number;
}): Promise<typeof adminAuditLog.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 100, adminUserId, entityType } = opts ?? {};
  const conditions = [];
  if (adminUserId) conditions.push(eq(adminAuditLog.adminUserId, adminUserId));
  if (entityType) conditions.push(eq(adminAuditLog.entityType, entityType));
  const query = db.select().from(adminAuditLog);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
  }
  return query.orderBy(desc(adminAuditLog.createdAt)).limit(limit);
}

// ─── Event Attendance ─────────────────────────────────────────────────────────

/** Mark an attendee as having attended an event. Returns the new attendance record, or null if already marked. */
export async function markEventAttendance(data: {
  eventId: number;
  email: string;
  name?: string | null;
  markedByAdminId?: number | null;
}): Promise<{ attendance: EventAttendance; alreadyExisted: boolean } | null> {
  const db = await getDb();
  if (!db) return null;

  // Check if already marked
  const [existing] = await db
    .select()
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, data.eventId), eq(eventAttendance.email, data.email)))
    .limit(1);

  if (existing) return { attendance: existing, alreadyExisted: true };

  // Attendance reward from the registry (was a 33 hardcoded in two files).
  // Lazy import: game/index.ts imports getDb from this file, so a top-level
  // import here would be a cycle.
  const { getGameVariableOr } = await import("./game");
  const attendanceReward = Math.round(await getGameVariableOr("events.attendance_reward_regen", 33));

  // Insert attendance record
  const [result] = await db.insert(eventAttendance).values({
    eventId: data.eventId,
    email: data.email,
    name: data.name ?? null,
    markedByAdminId: data.markedByAdminId ?? null,
    tokensAwarded: attendanceReward,
  });
  const insertId = asMutationResult(result).insertId;

  // Award the $ReGen, insert into ledger first
  const [ledgerResult] = await db.insert(regenTokenLedger).values({
    email: data.email,
    amount: attendanceReward,
    reason: "event_attendance",
    eventId: data.eventId,
    notes: `Attended event #${data.eventId}`,
  });
  const ledgerId = asMutationResult(ledgerResult).insertId;

  // Link ledger entry back to attendance record
  await db
    .update(eventAttendance)
    .set({ tokenLedgerEntryId: ledgerId })
    .where(eq(eventAttendance.id, insertId));

  const [attendance] = await db
    .select()
    .from(eventAttendance)
    .where(eq(eventAttendance.id, insertId))
    .limit(1);

  return { attendance, alreadyExisted: false };
}

/** Remove an attendance mark (undo). Also removes the linked token ledger entry. */
export async function removeEventAttendance(eventId: number, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [existing] = await db
    .select()
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.email, email)))
    .limit(1);

  if (!existing) return false;

  // Remove the token ledger entry if it exists
  if (existing.tokenLedgerEntryId) {
    await db.delete(regenTokenLedger).where(eq(regenTokenLedger.id, existing.tokenLedgerEntryId));
  }

  await db
    .delete(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.email, email)));

  return true;
}

/** Get all attendance records for an event, ordered by markedAt. */
export async function getEventAttendance(eventId: number): Promise<EventAttendance[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(eventAttendance)
    .where(eq(eventAttendance.eventId, eventId))
    .orderBy(eventAttendance.markedAt);
}

/** Count attendees for multiple events at once (used for social proof). Returns a map of eventId -> count. */
export async function getAttendanceCounts(eventIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || eventIds.length === 0) return {};
  const rows = await db
    .select({ eventId: eventAttendance.eventId, count: sql<number>`count(*)` })
    .from(eventAttendance)
    .where(inArray(eventAttendance.eventId, eventIds))
    .groupBy(eventAttendance.eventId);
  const result: Record<number, number> = {};
  for (const row of rows) result[row.eventId] = Number(row.count);
  return result;
}

// ─── $ReGen Token Ledger ──────────────────────────────────────────────────────

/** Get total $ReGen token balance for an email address. */
export async function getTokenBalance(email: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(regenTokenLedger)
    .where(eq(regenTokenLedger.email, email));
  return Number(row?.total ?? 0);
}

/** Get the full token ledger for an email (sorted newest first). */
export async function getTokenLedger(email: string): Promise<RegenTokenLedger[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(regenTokenLedger)
    .where(eq(regenTokenLedger.email, email))
    .orderBy(desc(regenTokenLedger.createdAt));
}

/** Add an arbitrary $ReGen award (for admin grants, quest completions, etc.). */
export async function addTokenLedgerEntry(data: {
  email: string;
  userId?: number | null;
  amount: number;
  reason: InsertRegenTokenLedger["reason"];
  eventId?: number | null;
  questId?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("No DB connection");
  const [result] = await db.insert(regenTokenLedger).values({
    email: data.email,
    userId: data.userId ?? null,
    amount: data.amount,
    reason: data.reason,
    eventId: data.eventId ?? null,
    questId: data.questId ?? null,
    notes: data.notes ?? null,
  });
  return asMutationResult(result).insertId;
}

/** Get a leaderboard of top $ReGen earners (sorted by total tokens descending). */
export async function getTokenLeaderboard(limit = 20): Promise<{ email: string; total: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      email: regenTokenLedger.email,
      total: sql<number>`SUM(amount)`,
    })
    .from(regenTokenLedger)
    .groupBy(regenTokenLedger.email)
    .orderBy(sql`SUM(amount) DESC`)
    .limit(limit);
  return rows.map(r => ({ email: r.email, total: Number(r.total) }));
}

// ─── Community Agreements ─────────────────────────────────────────────────────

export async function listCommunityAgreements(
  sortBy: 'votes' | 'newest' = 'votes',
  status?: string,
  limit = 50,
  offset = 0,
) {
  const db = await getDb();
  if (!db) return [];
  const orderCol = sortBy === 'votes'
    ? desc(communityAgreements.voteCount)
    : desc(communityAgreements.createdAt);

  if (status) {
    return db.select().from(communityAgreements)
      .where(eq(communityAgreements.status, status as any))
      .orderBy(orderCol).limit(limit).offset(offset);
  }
  return db.select().from(communityAgreements)
    .orderBy(orderCol).limit(limit).offset(offset);
}

export async function createCommunityAgreement(data: {
  authorId: number;
  title: string;
  description: string;
  category?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(communityAgreements).values({
    authorId: data.authorId,
    title: data.title,
    description: data.description,
    category: data.category || null,
  });
  return asMutationResult(result).insertId;
}

export async function toggleCommunityAgreementVote(userId: number, agreementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(communityAgreementVotes)
    .where(and(
      eq(communityAgreementVotes.userId, userId),
      eq(communityAgreementVotes.agreementId, agreementId),
    ))
    .limit(1);

  if (existing) {
    await db.delete(communityAgreementVotes).where(eq(communityAgreementVotes.id, existing.id));
    await db.update(communityAgreements)
      .set({ voteCount: sql`GREATEST(${communityAgreements.voteCount} - 1, 0)` })
      .where(eq(communityAgreements.id, agreementId));
    return false;
  } else {
    await db.insert(communityAgreementVotes).values({ userId, agreementId });
    await db.update(communityAgreements)
      .set({ voteCount: sql`${communityAgreements.voteCount} + 1` })
      .where(eq(communityAgreements.id, agreementId));
    return true;
  }
}

export async function getUserCommunityAgreementVotes(userId: number) {
  const db = await getDb();
  if (!db) return [] as number[];
  const votes = await db.select().from(communityAgreementVotes)
    .where(eq(communityAgreementVotes.userId, userId));
  return votes.map(v => v.agreementId);
}

// ─── Private token ledger (all 4 tokens) ──────────────────────────────────────
// Implementation moved to server/db/tokens.ts per FIXES_TO_MAKE_2026-04-25_
// world-class.md item 26 (split server/db.ts into domain modules). The
// re-export keeps every existing `import { creditPrivateTokens } from
// "../db"` callsite working unchanged.
export { creditPrivateTokens, getUserTokenLedger } from "./db/tokens";
export type { TokenType, CreditSource } from "./db/tokens";
