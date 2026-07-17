/**
 * The hardened one-button email send (Harvest Phase 4; plan s5).
 *
 * The threat model: an injected note must never silently become an email, and
 * a fat finger must never double-send. So:
 *
 *  1. Only an EDITED-and-saved newsletter item can be sent, never a raw draft.
 *     Rye's own hands on the text are the human gate.
 *  2. Preview returns a signed confirm token bound to the exact body hash and
 *     recipient count. The send requires that token back; if the body changed
 *     since preview (any re-render, any injection), the hash mismatches and
 *     the send is rejected.
 *  3. Hard caps: one send per 10 minutes, three per day, enforced against the
 *     audit table (not the in-memory limiter, so restarts cannot reset them).
 *  4. An idempotency key makes a double-click a no-op.
 *  5. CAN-SPAM: unsubscribe link on the existing newsletter mechanism, postal
 *     address in the footer, Resend's suppression list applies at delivery.
 *  6. Audit row per attempt: who, when, recipient COUNT (never the list),
 *     body hash, and the ai-vs-shipped pair.
 */
import crypto from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { creationItems, harvestEmailSends } from "../../drizzle/schema";
import { getActiveNewsletterSubscribers } from "../db/newsletter";
import { sendEmail } from "../_core/email";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

const log = logger("harvest-email");

export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const MIN_SEND_GAP_MS = 10 * 60 * 1000;
export const MAX_SENDS_PER_DAY = 3;

export function bodyHash(subject: string, body: string): string {
  return crypto.createHash("sha256").update(`${subject}\n\n${body}`, "utf8").digest("hex");
}

type TokenPayload = { itemId: number; hash: string; recipients: number; exp: number };

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
    if (typeof payload.itemId !== "number" || typeof payload.hash !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Subject = the first line; body = the rest. One item, one announcement. */
export function splitSubject(body: string): { subject: string; text: string } {
  const lines = body.trim().split("\n");
  const subject = (lines[0] ?? "").replace(/^#+\s*/, "").trim().slice(0, 200) || "A note from ReGen Civics";
  const text = lines.slice(1).join("\n").trim() || body.trim();
  return { subject, text };
}

function renderHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n{2,}/).map((p) => `<p style="color:#2d3a2d;line-height:1.7;margin:0 0 16px 0;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const unsubUrl = `${ENV.appUrl}/unsubscribe`;
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 26px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #7dd87d; margin: 0; font-size: 22px;">ReGen Civics</h1>
    </div>
    <div style="padding: 26px 22px; background: #ffffff; border: 1px solid #e8e4de; border-top: none;">
      ${paragraphs}
    </div>
    <div style="padding: 14px 22px; background: #f8f5f0; border-radius: 0 0 8px 8px; border: 1px solid #e8e4de; border-top: none;">
      <p style="color:#8a8a8a;font-size:11px;margin:0;line-height:1.6;">
        You are receiving this because you subscribed to the ReGen Civics newsletter.
        <a href="${unsubUrl}" style="color:#8a8a8a;">Unsubscribe</a> any time.<br/>
        ${ENV.harvestPostalAddress}
      </p>
    </div>
  </div>`;
}

export type PreviewResult = {
  subject: string;
  html: string;
  recipientCount: number;
  confirmToken: string;
  expiresAt: number;
};

/**
 * Build the preview + signed confirm token for one item. Refuses raw drafts:
 * only an item Rye edited and saved (status 'edited') qualifies.
 */
export async function buildSendPreview(item: { id: number; channel: string; status: string; body: string | null }): Promise<PreviewResult> {
  if (item.channel !== "newsletter") throw new Error("Only the newsletter item of a piece can be emailed.");
  if (item.status !== "edited") throw new Error("Only an edited-and-saved item can be sent. Edit it first, even lightly; the send gate requires your hands on the text.");
  if (!item.body?.trim()) throw new Error("The item is empty.");

  const { subject, text } = splitSubject(item.body);
  const recipients = await getActiveNewsletterSubscribers();
  if (recipients.length === 0) throw new Error("No active newsletter subscribers to send to.");

  const hash = bodyHash(subject, text);
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return {
    subject,
    html: renderHtml(text),
    recipientCount: recipients.length,
    confirmToken: buildConfirmToken({ itemId: item.id, hash, recipients: recipients.length, exp: expiresAt }),
    expiresAt,
  };
}

export type SendOutcome = { ok: true; recipientCount: number; duplicate?: boolean };

/**
 * The confirmed send. Enforces, in order: token validity and binding, hash
 * match against the CURRENT body, hard caps from the audit table, then the
 * idempotency claim, then the batched send.
 */
export async function confirmAndSend(params: {
  ownerId: number;
  item: { id: number; channel: string; status: string; body: string | null; aiBody: string | null };
  confirmToken: string;
  idempotencyKey: string;
}): Promise<SendOutcome> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { item } = params;

  const payload = verifyConfirmToken(params.confirmToken);
  if (!payload) throw new Error("The confirm token is invalid or expired. Preview again.");
  if (payload.itemId !== item.id) throw new Error("This token belongs to a different item.");

  if (item.channel !== "newsletter" || item.status !== "edited" || !item.body?.trim()) {
    throw new Error("Only an edited-and-saved newsletter item can be sent.");
  }
  const { subject, text } = splitSubject(item.body);
  if (bodyHash(subject, text) !== payload.hash) {
    throw new Error("The text changed since the preview. Preview again so you approve exactly what goes out.");
  }

  // Idempotency FIRST: a double-click replays the same key seconds after the
  // real send, which is inside the 10-minute gap by construction. The replay
  // must be a graceful no-op, never a cap error.
  const existing = await db
    .select({ id: harvestEmailSends.id })
    .from(harvestEmailSends)
    .where(eq(harvestEmailSends.idempotencyKey, params.idempotencyKey))
    .limit(1);
  if (existing.length > 0) {
    log.info(`idempotent replay for key=${params.idempotencyKey.slice(0, 8)}...`);
    return { ok: true, recipientCount: 0, duplicate: true };
  }

  // Hard caps against the durable audit table.
  const now = Date.now();
  const recent = await db
    .select({ createdAt: harvestEmailSends.createdAt })
    .from(harvestEmailSends)
    .where(and(
      eq(harvestEmailSends.ownerId, params.ownerId),
      eq(harvestEmailSends.status, "sent"),
      gte(harvestEmailSends.createdAt, new Date(now - 24 * 60 * 60 * 1000)),
    ))
    .orderBy(desc(harvestEmailSends.createdAt));
  if (recent.length >= MAX_SENDS_PER_DAY) throw new Error(`Send cap reached: ${MAX_SENDS_PER_DAY} per day.`);
  if (recent[0] && now - recent[0].createdAt.getTime() < MIN_SEND_GAP_MS) {
    throw new Error("Send cap: one email per ten minutes. Take a breath and try again shortly.");
  }

  // Idempotency claim BEFORE sending: a double-click loses the insert race
  // and returns the earlier outcome as a no-op.
  try {
    await db.insert(harvestEmailSends).values({
      ownerId: params.ownerId,
      itemId: item.id,
      bodyHash: payload.hash,
      recipientCount: 0,
      idempotencyKey: params.idempotencyKey,
      status: "sent",
      subject,
      aiBody: item.aiBody,
      sentBody: text,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(msg)) {
      log.info(`idempotent replay for key=${params.idempotencyKey.slice(0, 8)}...`);
      return { ok: true, recipientCount: 0, duplicate: true };
    }
    throw err;
  }

  const recipients = await getActiveNewsletterSubscribers();
  const html = renderHtml(text);
  const emails = recipients.map((s) => s.email);
  const BATCH = 50;
  let sent = 0;
  try {
    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH);
      await sendEmail({ to: batch, subject, html, template: "harvest_announcement" });
      sent += batch.length;
    }
  } catch (err) {
    await db.update(harvestEmailSends)
      .set({ status: "failed", recipientCount: sent })
      .where(eq(harvestEmailSends.idempotencyKey, params.idempotencyKey));
    log.error(`send failed after ${sent} recipients`, err instanceof Error ? err : undefined);
    throw new Error(`Send failed after ${sent} of ${emails.length} recipients. Check the Resend dashboard before retrying.`);
  }

  await db.update(harvestEmailSends)
    .set({ recipientCount: sent })
    .where(eq(harvestEmailSends.idempotencyKey, params.idempotencyKey));
  await db.update(creationItems)
    .set({ status: "shipped", postedAt: new Date(), postedText: item.body })
    .where(eq(creationItems.id, item.id));

  log.info(`announcement sent item=${item.id} recipients=${sent} hash=${payload.hash.slice(0, 12)}...`);
  return { ok: true, recipientCount: sent };
}
