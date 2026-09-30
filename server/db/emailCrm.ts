/**
* Email CRM domain queries: email logs, contact notes/tags, scheduled emails.
* Extracted from server/db.ts (E1 Phase 1). Re-exported via db.ts barrel.
 */
import { eq, and, desc, gt } from "drizzle-orm";
import { getDb } from "../db";
import {
  emailLogs,
  InsertEmailLog,
  contactNotes,
  InsertContactNote,
  contactTags,
  InsertContactTag,
  scheduledEmails,
  InsertScheduledEmail,
} from "../../drizzle/schema";

// Email log helpers
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

  const now = new Date();
  const [row] = await db
    .select({ status: emailLogs.status, deliveredAt: emailLogs.deliveredAt })
    .from(emailLogs)
    .where(eq(emailLogs.id, id))
    .limit(1);
  const updates: Record<string, unknown> = { openedAt: now };
  if (row?.status === "sent") {
    updates.status = "delivered";
    if (!row.deliveredAt) updates.deliveredAt = now;
  }
  await db.update(emailLogs).set(updates).where(eq(emailLogs.id, id));
}

export async function markEmailClicked(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const [row] = await db
    .select({ status: emailLogs.status, deliveredAt: emailLogs.deliveredAt })
    .from(emailLogs)
    .where(eq(emailLogs.id, id))
    .limit(1);
  const updates: Record<string, unknown> = { clickedAt: now };
  if (row?.status === "sent") {
    updates.status = "delivered";
    if (!row.deliveredAt) updates.deliveredAt = now;
  }
  await db.update(emailLogs).set(updates).where(eq(emailLogs.id, id));
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


