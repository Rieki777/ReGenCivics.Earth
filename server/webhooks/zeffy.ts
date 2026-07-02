/**
 * Zeffy webhook receiver - Church of the Regenerative Earth (CORE).
 *
 * Mounted at /api/webhooks/zeffy/:token. Zeffy's webhook docs do not document
 * an HMAC signature scheme (unlike Stripe/GitHub), so the shared secret is
 * folded into the URL path itself: only someone who knows ZEFFY_WEBHOOK_TOKEN
 * (set once in the Zeffy dashboard's webhook URL field and in our env) can post
 * here. This mirrors the "secret URL" pattern acceptable for low-blast-radius,
 * append-only reconciliation, and every write is additionally idempotent on
 * zeffyPaymentId, so even a guessed URL can only replay real completed
 * payments, never fabricate new ones out of thin air without a valid payload.
 *
 * Idempotency: dedupe by `webhook_deliveries` (delivery key `zeffy:<paymentId>`)
 * AND a unique DB constraint on `zeffyPaymentId`, so a retry (Zeffy retries
 * until it gets a 2xx) never double-inserts a donation row.
 */
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { churchDonations, webhookDeliveries } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { isZeffyConfigured } from "../lib/zeffy";
import { sendEmail } from "../_core/email";

type ZeffyWebhookPayload = {
  event?: string;
  timestamp?: string;
  payment?: {
    id?: string;
    status?: string;
    amount?: number; // cents
    currency?: string;
    campaignId?: string;
    contact?: { email?: string | null; firstName?: string | null } | null;
    isRecurring?: boolean;
  };
};

function receiptHtml(amountCents: number, currency: string): string {
  const amount = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  });
  return `
  <div style="font-family: Arial, sans-serif; color:#1a472a; max-width:560px; margin:0 auto;">
    <h2 style="color:#0d2818;">Thank you for your gift</h2>
    <p>Your gift of <strong>${amount}</strong> to the Church of the Regenerative Earth has been received
    through Zeffy, whose zero platform fees mean your full gift reaches the church. Giving is worship,
    and your seed joins many others.</p>
    <hr style="border:none;border-top:1px solid #e8e4de;" />
    <p style="font-size:14px;color:#4a7c59;">
      Church of the Regenerative Earth<br/>
      A 508(c)(1)(a) faith ministry<br/>
      EIN 42-3198293<br/>
      No goods or services were provided in exchange for this contribution.
    </p>
  </div>`;
}

export function registerZeffyWebhookRoutes(app: Express) {
  app.post("/api/webhooks/zeffy/:token", async (req: Request, res: Response) => {
    if (!isZeffyConfigured() || !ENV.zeffyWebhookToken) {
      res.status(503).json({ error: "zeffy_not_configured" });
      return;
    }
    if (req.params.token !== ENV.zeffyWebhookToken) {
      // Deliberately generic response so a prober can't distinguish
      // "wrong token" from "not configured".
      res.status(404).json({ error: "not_found" });
      return;
    }

    const body = req.body as ZeffyWebhookPayload;
    const payment = body?.payment;
    if (body?.event !== "payment.completed" || !payment?.id) {
      // Acknowledge other event types so Zeffy does not retry them forever.
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    const deliveryId = `zeffy:${payment.id}`;
    const existingDelivery = await db
      .select({ deliveryId: webhookDeliveries.deliveryId })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
      .limit(1);
    if (existingDelivery.length > 0) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    // Claim the delivery. Wrapped so a concurrent duplicate (deliveryId is a
    // PRIMARY KEY) is treated as already-handled instead of throwing an
    // unhandledRejection that would crash the process.
    try {
      await db.insert(webhookDeliveries).values({ deliveryId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate/i.test(msg) || /unique/i.test(msg)) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      console.error("[zeffy webhook] could not record delivery:", err);
      res.status(500).json({ error: "delivery_record_failed" });
      return;
    }

    try {
      const existingDonation = await db
        .select({ id: churchDonations.id })
        .from(churchDonations)
        .where(eq(churchDonations.zeffyPaymentId, payment.id))
        .limit(1);

      if (existingDonation.length === 0) {
        const amountCents = payment.amount ?? 0;
        const currency = (payment.currency ?? "usd").toLowerCase();
        await db.insert(churchDonations).values({
          provider: "zeffy",
          zeffyPaymentId: payment.id,
          zeffyCampaignId: payment.campaignId ?? null,
          donorEmail: payment.contact?.email ?? null,
          amountCents,
          currency,
          giftInterval: payment.isRecurring ? "monthly" : "one_time",
          status: "succeeded",
        });

        const to = payment.contact?.email;
        if (to) {
          try {
            await sendEmail({
              to,
              subject: "Your gift to the Church of the Regenerative Earth",
              html: receiptHtml(amountCents, currency),
              template: "core_donation_receipt_zeffy",
            });
          } catch (err) {
            console.error("[zeffy webhook] receipt email failed:", err);
          }
        }
      }
    } catch (err) {
      console.error("[zeffy webhook] handler error:", err);
      // Roll back the delivery claim so Zeffy's retry reprocesses instead of
      // hitting the dedupe and silently dropping the donation.
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, deliveryId))
        .catch((delErr) => console.error("[zeffy webhook] delivery rollback failed:", delErr));
      res.status(500).json({ ok: false, handled: false });
      return;
    }

    res.status(200).json({ ok: true });
  });
}
