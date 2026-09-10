/**
 * Outbound newsletter issue send.
 *
 * Copies Harvest's confirm-token + idempotency pattern onto newsletter_issues.
 * Does not use email.sendBulk. Sends 1:1 so each letter can carry a signed
 * unsubscribe link and an email_logs row. Harvest's sender is untouched.
 */
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { newsletterIssueRecipients, newsletterIssues } from "../../drizzle/schema";
import { getNewsletterAudience } from "../db/newsletter";
import { sendEmail } from "../_core/email";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import { emailDocumentFromMarkdown } from "./emailHtml";
import { createEmailLog } from "../emailTracking";
import { isLetterLayout, NEWSLETTER_POSTAL_ADDRESS, type LetterLayout } from "../../shared/letterLayout";

const log = logger("newsletter-issue-email");

export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const MIN_SEND_GAP_MS = 10 * 60 * 1000;
export const MAX_SENDS_PER_DAY = 5;
const SEND_GAP_MS = 150;

export type IssueAudience = { sources: string[]; activeOnly: boolean };

export function parseIssueAudience(raw: unknown): IssueAudience {
  if (!raw || typeof raw !== "object") return { sources: [], activeOnly: true };
  const rec = raw as Record<string, unknown>;
  const sources = Array.isArray(rec.sources)
    ? rec.sources.filter((s): s is string => typeof s === "string" && s.length > 0 && s !== "all")
    : [];
  return { sources, activeOnly: rec.activeOnly !== false };
}

export function issueBodyHash(subject: string, body: string, audience: IssueAudience): string {
  return crypto
    .createHash("sha256")
    .update(`${subject}\n\n${body}\n\n${JSON.stringify(audience)}`, "utf8")
    .digest("hex");
}

type TokenPayload = { issueId: number; hash: string; recipients: number; exp: number };

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", ENV.cookieSecret).update(payloadB64).digest("base64url");
}

export function buildConfirmToken(payload: TokenPayload): string {
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyConfirmToken(token: string): TokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.issueId !== "number" || typeof payload.hash !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function buildUnsubscribeToken(email: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ email, purpose: "newsletter-unsubscribe" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(secret);
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== "newsletter-unsubscribe" || typeof payload.email !== "string") return null;
    return payload.email;
  } catch {
    return null;
  }
}

export function previewUnsubscribeUrl(): string {
  return `${ENV.appUrl}/preferences`;
}

export async function signedUnsubscribeUrl(email: string): Promise<string> {
  const token = await buildUnsubscribeToken(email);
  return `${ENV.appUrl}/preferences?token=${encodeURIComponent(token)}`;
}

function asLayout(value: string | null | undefined): LetterLayout {
  return isLetterLayout(value) ? value : "plain";
}

export type PreviewResult = {
  issueId: number;
  subject: string;
  html: string;
  recipientCount: number;
  confirmToken: string;
  expiresAt: number;
};

async function snapshotRecipients(issueId: number, audience: IssueAudience) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const subscribers = await getNewsletterAudience({ sources: audience.sources });
  await db.delete(newsletterIssueRecipients).where(eq(newsletterIssueRecipients.issueId, issueId));
  if (subscribers.length === 0) {
    return [] as Array<{ email: string; name: string | null; source: string | null }>;
  }
  await db.insert(newsletterIssueRecipients).values(
    subscribers.map((row) => ({
      issueId,
      email: row.email,
      name: row.name,
      source: row.source,
      status: "pending" as const,
    })),
  );
  return subscribers.map((row) => ({ email: row.email, name: row.name, source: row.source }));
}

export async function buildIssuePreview(params: {
  issueId: number;
  createdBy: number;
}): Promise<PreviewResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, params.issueId)).limit(1);
  if (!issue || issue.createdBy !== params.createdBy) throw new Error("Issue not found.");
  if (issue.status === "sending" || issue.status === "sent") {
    throw new Error("This letter is already sending or sent. Open History.");
  }
  if (!issue.subject.trim() || !issue.body?.trim()) throw new Error("Write a subject and body first.");

  const audience = parseIssueAudience(issue.audience);
  const recipients = await snapshotRecipients(issue.id, audience);
  if (recipients.length === 0) throw new Error("No active subscribers match this audience.");

  const layout = asLayout(issue.layout);
  const html = emailDocumentFromMarkdown(issue.body, layout, {
    unsubscribeUrl: previewUnsubscribeUrl(),
    postalAddress: ENV.harvestPostalAddress || NEWSLETTER_POSTAL_ADDRESS,
  });
  const hash = issueBodyHash(issue.subject, issue.body, audience);
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  await db.update(newsletterIssues).set({
    bodyHash: hash,
    recipientCount: recipients.length,
  }).where(eq(newsletterIssues.id, issue.id));

  return {
    issueId: issue.id,
    subject: issue.subject,
    html,
    recipientCount: recipients.length,
    confirmToken: buildConfirmToken({
      issueId: issue.id,
      hash,
      recipients: recipients.length,
      exp: expiresAt,
    }),
    expiresAt,
  };
}

export type SendOutcome = { ok: true; recipientCount: number; failedCount: number; duplicate?: boolean };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function confirmAndSendIssue(params: {
  issueId: number;
  createdBy: number;
  confirmToken: string;
  idempotencyKey: string;
}): Promise<SendOutcome> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const payload = verifyConfirmToken(params.confirmToken);
  if (!payload) throw new Error("The confirm token is invalid or expired. Preview again.");
  if (payload.issueId !== params.issueId) throw new Error("This token belongs to a different letter.");

  const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, params.issueId)).limit(1);
  if (!issue || issue.createdBy !== params.createdBy) throw new Error("Issue not found.");
  if (issue.status === "sent") {
    return { ok: true, recipientCount: issue.sentCount, failedCount: issue.failedCount, duplicate: true };
  }

  const audience = parseIssueAudience(issue.audience);
  const hash = issueBodyHash(issue.subject, issue.body, audience);
  if (hash !== payload.hash) {
    throw new Error("The letter changed since the preview. Preview again so you approve exactly what goes out.");
  }

  const existingKey = await db
    .select({ id: newsletterIssues.id, sentCount: newsletterIssues.sentCount, failedCount: newsletterIssues.failedCount, status: newsletterIssues.status })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.idempotencyKey, params.idempotencyKey))
    .limit(1);
  if (existingKey.length > 0) {
    log.info(`idempotent replay for key=${params.idempotencyKey.slice(0, 8)}...`);
    return {
      ok: true,
      recipientCount: existingKey[0].sentCount,
      failedCount: existingKey[0].failedCount,
      duplicate: true,
    };
  }

  const now = Date.now();
  const recent = await db
    .select({ sentAt: newsletterIssues.sentAt, createdAt: newsletterIssues.createdAt })
    .from(newsletterIssues)
    .where(and(
      eq(newsletterIssues.createdBy, params.createdBy),
      inArray(newsletterIssues.status, ["sent", "sending"]),
      gte(newsletterIssues.createdAt, new Date(now - 24 * 60 * 60 * 1000)),
    ))
    .orderBy(desc(newsletterIssues.createdAt));
  const sentRecently = recent.filter((row) => row.sentAt || row.createdAt);
  if (sentRecently.length >= MAX_SENDS_PER_DAY) {
    throw new Error(`Send cap reached: ${MAX_SENDS_PER_DAY} letters per day.`);
  }
  const lastAt = sentRecently[0]?.sentAt ?? sentRecently[0]?.createdAt;
  if (lastAt && now - lastAt.getTime() < MIN_SEND_GAP_MS) {
    throw new Error("Send cap: one letter per ten minutes. Preview again shortly.");
  }

  try {
    const claimed = await db.update(newsletterIssues).set({
      status: "sending",
      idempotencyKey: params.idempotencyKey,
      bodyHash: hash,
      recipientCount: payload.recipients,
    }).where(and(
      eq(newsletterIssues.id, issue.id),
      inArray(newsletterIssues.status, ["draft", "failed", "cancelled"]),
    ));
    void claimed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(msg)) {
      log.info(`idempotent replay for key=${params.idempotencyKey.slice(0, 8)}...`);
      return { ok: true, recipientCount: 0, failedCount: 0, duplicate: true };
    }
    throw err;
  }

  const snapshot = await db
    .select()
    .from(newsletterIssueRecipients)
    .where(eq(newsletterIssueRecipients.issueId, issue.id));
  const live = await getNewsletterAudience({ sources: audience.sources });
  const liveActive = new Set(live.map((row) => row.email.toLowerCase()));

  const layout = asLayout(issue.layout);

  let sentCount = 0;
  let failedCount = 0;
  for (const row of snapshot) {
    const email = row.email;
    if (!liveActive.has(email.toLowerCase())) {
      await db.update(newsletterIssueRecipients).set({ status: "skipped_unsub" })
        .where(eq(newsletterIssueRecipients.id, row.id));
      continue;
    }
    try {
      const unsub = await signedUnsubscribeUrl(email);
      const html = emailDocumentFromMarkdown(issue.body, layout, {
        unsubscribeUrl: unsub,
        postalAddress: ENV.harvestPostalAddress || NEWSLETTER_POSTAL_ADDRESS,
      });
      const emailLogId = await createEmailLog({
        recipientEmail: email,
        recipientName: row.name ?? undefined,
        subject: issue.subject,
        template: "newsletter_issue",
      });
      const result = await sendEmail({
        to: email,
        subject: issue.subject,
        html,
        template: "newsletter_issue",
        emailLogId,
        skipBrandedWrap: true,
      });
      if (!result.id && process.env.EMAIL_HOLD !== "true") {
        failedCount += 1;
        await db.update(newsletterIssueRecipients).set({ status: "failed", emailLogId })
          .where(eq(newsletterIssueRecipients.id, row.id));
      } else {
        sentCount += 1;
        await db.update(newsletterIssueRecipients).set({ status: "sent", emailLogId })
          .where(eq(newsletterIssueRecipients.id, row.id));
      }
    } catch (err) {
      failedCount += 1;
      log.error(`send failed for issue=${issue.id}`, err instanceof Error ? err : undefined);
      await db.update(newsletterIssueRecipients).set({ status: "failed" })
        .where(eq(newsletterIssueRecipients.id, row.id));
    }
    await sleep(SEND_GAP_MS);
  }

  const status = failedCount > 0 && sentCount === 0 ? "failed" : "sent";
  await db.update(newsletterIssues).set({
    status,
    sentCount,
    failedCount,
    recipientCount: snapshot.length,
    sentAt: new Date(),
  }).where(eq(newsletterIssues.id, issue.id));

  log.info(`issue sent id=${issue.id} sent=${sentCount} failed=${failedCount} hash=${hash.slice(0, 12)}...`);
  return { ok: true, recipientCount: sentCount, failedCount };
}
