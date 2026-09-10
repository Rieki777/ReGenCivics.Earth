/**
 * Outbound newsletter issue send.
 *
 * Copies Harvest's confirm-token + idempotency pattern onto newsletter_issues.
 * Does not use email.sendBulk. Sends 1:1 so each letter can carry a signed
 * unsubscribe link and an email_logs row. Harvest's sender is untouched.
 */
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../db";
import { asMutationResult } from "../db/_shared";
import { newsletterIssueRecipients, newsletterIssues, type NewsletterIssue } from "../../drizzle/schema";
import {
  parseScheduleInstant,
  validateScheduleWindow,
} from "../../shared/outboundSchedule";
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
    throw new Error("This letter is already sending or sent. Open Sent for history.");
  }
  if (issue.status === "scheduled") {
    throw new Error("This letter is scheduled. Cancel it from Sent before editing.");
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
export type ScheduleOutcome = { ok: true; scheduledFor: Date; recipientCount: number };
export type DueIssueReport = {
  ok: boolean;
  scanned: number;
  sent: number;
  skipped: number;
  duplicates: number;
  errors: string[];
};

const CLAIMABLE_IMMEDIATE = ["draft", "failed", "cancelled"] as const;
const CLAIMABLE_SCHEDULED = ["scheduled"] as const;
const CAP_SKIP_RE = /Send cap/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadIssue(issueId: number): Promise<NewsletterIssue> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, issueId)).limit(1);
  if (!issue) throw new Error("Issue not found.");
  return issue;
}

function assertOwned(issue: NewsletterIssue, createdBy: number) {
  if (issue.createdBy !== createdBy) throw new Error("Issue not found.");
}

async function replayIfKeyTaken(
  idempotencyKey: string,
  issueId: number,
): Promise<SendOutcome | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existingKey = await db
    .select({
      id: newsletterIssues.id,
      sentCount: newsletterIssues.sentCount,
      failedCount: newsletterIssues.failedCount,
      status: newsletterIssues.status,
    })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existingKey.length === 0) return null;
  const row = existingKey[0];
  if (row.id !== issueId) {
    log.info(`idempotent replay for key=${idempotencyKey.slice(0, 8)}...`);
    return { ok: true, recipientCount: row.sentCount, failedCount: row.failedCount, duplicate: true };
  }
  if (row.status === "sent" || row.status === "sending") {
    log.info(`idempotent replay for key=${idempotencyKey.slice(0, 8)}...`);
    return { ok: true, recipientCount: row.sentCount, failedCount: row.failedCount, duplicate: true };
  }
  return null;
}

async function assertSendCaps(createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  const recent = await db
    .select({ sentAt: newsletterIssues.sentAt, createdAt: newsletterIssues.createdAt })
    .from(newsletterIssues)
    .where(and(
      eq(newsletterIssues.createdBy, createdBy),
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
}

function verifyPreviewBinding(issue: NewsletterIssue, confirmToken: string) {
  const payload = verifyConfirmToken(confirmToken);
  if (!payload) throw new Error("The confirm token is invalid or expired. Preview again.");
  if (payload.issueId !== issue.id) throw new Error("This token belongs to a different letter.");
  const audience = parseIssueAudience(issue.audience);
  const hash = issueBodyHash(issue.subject, issue.body, audience);
  if (hash !== payload.hash) {
    throw new Error("The letter changed since the preview. Preview again so you approve exactly what goes out.");
  }
  return { payload, audience, hash };
}

async function dispatchClaimedSend(params: {
  issue: NewsletterIssue;
  idempotencyKey: string;
  hash: string;
  recipientCount: number;
  claimFrom: ReadonlyArray<NewsletterIssue["status"]>;
}): Promise<SendOutcome> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const replay = await replayIfKeyTaken(params.idempotencyKey, params.issue.id);
  if (replay) return replay;

  await assertSendCaps(params.issue.createdBy);

  try {
    const claimed = await db.update(newsletterIssues).set({
      status: "sending",
      idempotencyKey: params.idempotencyKey,
      bodyHash: params.hash,
      recipientCount: params.recipientCount,
    }).where(and(
      eq(newsletterIssues.id, params.issue.id),
      inArray(newsletterIssues.status, [...params.claimFrom]),
    ));
    if (asMutationResult(claimed).affectedRows === 0) {
      const [again] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, params.issue.id)).limit(1);
      if (again && (again.status === "sent" || again.status === "sending")) {
        return { ok: true, recipientCount: again.sentCount, failedCount: again.failedCount, duplicate: true };
      }
      throw new Error("This letter is no longer waiting to send.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(msg)) {
      log.info(`idempotent replay for key=${params.idempotencyKey.slice(0, 8)}...`);
      return { ok: true, recipientCount: 0, failedCount: 0, duplicate: true };
    }
    throw err;
  }

  const audience = parseIssueAudience(params.issue.audience);
  const snapshot = await db
    .select()
    .from(newsletterIssueRecipients)
    .where(eq(newsletterIssueRecipients.issueId, params.issue.id));
  const live = await getNewsletterAudience({ sources: audience.sources });
  const liveActive = new Set(live.map((row) => row.email.toLowerCase()));
  const layout = asLayout(params.issue.layout);

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
      const html = emailDocumentFromMarkdown(params.issue.body, layout, {
        unsubscribeUrl: unsub,
        postalAddress: ENV.harvestPostalAddress || NEWSLETTER_POSTAL_ADDRESS,
      });
      const emailLogId = await createEmailLog({
        recipientEmail: email,
        recipientName: row.name ?? undefined,
        subject: params.issue.subject,
        template: "newsletter_issue",
      });
      const result = await sendEmail({
        to: email,
        subject: params.issue.subject,
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
      log.error(`send failed for issue=${params.issue.id}`, err instanceof Error ? err : undefined);
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
  }).where(eq(newsletterIssues.id, params.issue.id));

  log.info(`issue sent id=${params.issue.id} sent=${sentCount} failed=${failedCount} hash=${params.hash.slice(0, 12)}...`);
  return { ok: true, recipientCount: sentCount, failedCount };
}

export async function confirmAndSendIssue(params: {
  issueId: number;
  createdBy: number;
  confirmToken: string;
  idempotencyKey: string;
}): Promise<SendOutcome> {
  const issue = await loadIssue(params.issueId);
  assertOwned(issue, params.createdBy);
  if (issue.status === "sent") {
    return { ok: true, recipientCount: issue.sentCount, failedCount: issue.failedCount, duplicate: true };
  }
  const { payload, hash } = verifyPreviewBinding(issue, params.confirmToken);
  return dispatchClaimedSend({
    issue,
    idempotencyKey: params.idempotencyKey,
    hash,
    recipientCount: payload.recipients,
    claimFrom: CLAIMABLE_IMMEDIATE,
  });
}

export async function scheduleIssue(params: {
  issueId: number;
  createdBy: number;
  confirmToken: string;
  idempotencyKey: string;
  scheduledFor: string;
  now?: Date;
}): Promise<ScheduleOutcome> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const issue = await loadIssue(params.issueId);
  assertOwned(issue, params.createdBy);
  if (issue.status === "sending" || issue.status === "sent") {
    throw new Error("This letter is already sending or sent. Open Sent for history.");
  }
  if (issue.status === "scheduled") {
    throw new Error("This letter is already scheduled. Reschedule it from Sent.");
  }
  const { payload, hash } = verifyPreviewBinding(issue, params.confirmToken);
  const when = parseScheduleInstant(params.scheduledFor);
  validateScheduleWindow(when, params.now ?? new Date());

  const replay = await replayIfKeyTaken(params.idempotencyKey, issue.id);
  if (replay) {
    throw new Error("That send key was already used. Preview again.");
  }

  try {
    const claimed = await db.update(newsletterIssues).set({
      status: "scheduled",
      scheduledFor: when,
      idempotencyKey: params.idempotencyKey,
      bodyHash: hash,
      recipientCount: payload.recipients,
    }).where(and(
      eq(newsletterIssues.id, issue.id),
      inArray(newsletterIssues.status, [...CLAIMABLE_IMMEDIATE]),
    ));
    if (asMutationResult(claimed).affectedRows === 0) {
      throw new Error("This letter could not be scheduled. Preview again.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(msg)) {
      throw new Error("That send key was already used. Preview again.");
    }
    throw err;
  }

  log.info(`issue scheduled id=${issue.id} for=${when.toISOString()} recipients=${payload.recipients}`);
  return { ok: true, scheduledFor: when, recipientCount: payload.recipients };
}

export async function cancelScheduledIssue(params: {
  issueId: number;
  createdBy: number;
}): Promise<{ ok: true }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const issue = await loadIssue(params.issueId);
  assertOwned(issue, params.createdBy);
  const claimed = await db.update(newsletterIssues).set({
    status: "cancelled",
    scheduledFor: null,
  }).where(and(
    eq(newsletterIssues.id, issue.id),
    eq(newsletterIssues.status, "scheduled"),
    eq(newsletterIssues.createdBy, params.createdBy),
  ));
  if (asMutationResult(claimed).affectedRows === 0) {
    throw new Error("That letter is not waiting to send.");
  }
  log.info(`issue schedule cancelled id=${issue.id}`);
  return { ok: true };
}

export async function rescheduleIssue(params: {
  issueId: number;
  createdBy: number;
  scheduledFor: string;
  now?: Date;
}): Promise<ScheduleOutcome> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const issue = await loadIssue(params.issueId);
  assertOwned(issue, params.createdBy);
  if (issue.status !== "scheduled") {
    throw new Error("That letter is not waiting to send.");
  }
  const when = parseScheduleInstant(params.scheduledFor);
  validateScheduleWindow(when, params.now ?? new Date());
  const claimed = await db.update(newsletterIssues).set({
    scheduledFor: when,
  }).where(and(
    eq(newsletterIssues.id, issue.id),
    eq(newsletterIssues.status, "scheduled"),
  ));
  if (asMutationResult(claimed).affectedRows === 0) {
    throw new Error("That letter is not waiting to send.");
  }
  log.info(`issue rescheduled id=${issue.id} for=${when.toISOString()}`);
  return { ok: true, scheduledFor: when, recipientCount: issue.recipientCount };
}

export async function runDueNewsletterIssues(
  now = new Date(),
  opts?: { createdBy?: number },
): Promise<DueIssueReport> {
  const report: DueIssueReport = {
    ok: true,
    scanned: 0,
    sent: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  };
  const db = await getDb();
  if (!db) return { ...report, ok: false, errors: ["database unavailable"] };

  const filters = [
    eq(newsletterIssues.status, "scheduled"),
    lte(newsletterIssues.scheduledFor, now),
  ];
  if (opts?.createdBy) filters.push(eq(newsletterIssues.createdBy, opts.createdBy));

  const due = await db
    .select()
    .from(newsletterIssues)
    .where(and(...filters))
    .orderBy(newsletterIssues.scheduledFor)
    .limit(20);
  report.scanned = due.length;

  for (const issue of due) {
    const audience = parseIssueAudience(issue.audience);
    const hash = issueBodyHash(issue.subject, issue.body, audience);
    if (!issue.bodyHash || hash !== issue.bodyHash) {
      await db.update(newsletterIssues).set({ status: "failed" })
        .where(and(eq(newsletterIssues.id, issue.id), eq(newsletterIssues.status, "scheduled")));
      report.errors.push(`issue ${issue.id}: letter changed after it was scheduled`);
      continue;
    }
    const key = issue.idempotencyKey || `scheduled-issue-${issue.id}`;
    try {
      const outcome = await dispatchClaimedSend({
        issue,
        idempotencyKey: key,
        hash,
        recipientCount: issue.recipientCount || 0,
        claimFrom: CLAIMABLE_SCHEDULED,
      });
      if (outcome.duplicate) report.duplicates += 1;
      else report.sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (CAP_SKIP_RE.test(msg)) {
        report.skipped += 1;
        continue;
      }
      report.errors.push(`issue ${issue.id}: ${msg}`);
      log.error(`due issue failed id=${issue.id}`, err instanceof Error ? err : undefined);
    }
  }

  if (report.errors.length > 0) report.ok = false;
  return report;
}
