/**
 * Inquiry queries: investor inquiries and the general catch-all routing form.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following server/db/newsletter.ts: functions moved unchanged, re-exported
 * from db.ts so existing `import { ... } from "./db"` keeps working, typecheck
 * proves the move.
 *
 * Both inquiry kinds live together because they are one domain: inbound forms
 * that land in an admin review queue, covered by the same suite
 * (server/forms.test.ts).
 */
import { desc, eq } from "drizzle-orm";
import {
  generalInquiries,
  InsertGeneralInquiry,
  InsertInvestorInquiry,
  investorInquiries,
} from "../../drizzle/schema";
import { getDb } from "../db";

// ============================================
// Investor Inquiry Queries
// ============================================

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

// Was stranded ~2500 lines away from the rest of the domain in db.ts.
export async function getInvestorInquiryByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(investorInquiries).where(eq(investorInquiries.userId, userId)).orderBy(desc(investorInquiries.createdAt)).limit(1);
  return rows[0] ?? null;
}

// ============================================
// General Inquiry Queries (Catch-all Routing Form)
// ============================================

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
