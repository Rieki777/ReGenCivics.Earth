/**
 * Stripe webhook receiver - Church of the Regenerative Earth (CORE).
 *
 * Mounted at /api/webhooks/stripe so the global express.json({ verify }) hook
 * captures req.rawBody (needed for signature verification). Follows the webhook
 * checklist in .ai/docs/security/BUILD-PLAYBOOK.md:
 *   1. Verify the signature with STRIPE_WEBHOOK_SECRET (reject otherwise).
 *   2. Idempotency: record event.id in webhook_deliveries; skip duplicates.
 *   3. Do not trust client-reported success; the webhook is the source of truth.
 *      Recurring charge amounts are read from Stripe's invoice, not from us.
 *
 * Stripe keys are set by Rye on Railway. Until STRIPE_WEBHOOK_SECRET is present
 * the endpoint returns 503 rather than processing anything.
 */
import type { Express, Request, Response } from "express";
import type Stripe from "stripe";
import { getDb } from "../db";
import { churchDonations, webhookDeliveries } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { sendEmail } from "../_core/email";

function receiptHtml(amountCents: number, currency: string, monthly: boolean): string {
  const amount = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  });
  return `
  <div style="font-family: Arial, sans-serif; color:#1a472a; max-width:560px; margin:0 auto;">
    <h2 style="color:#0d2818;">Thank you for your gift</h2>
    <p>Your ${monthly ? "monthly gift" : "gift"} of <strong>${amount}</strong> to the Church of the
    Regenerative Earth has been received. Giving is worship, and your seed joins many others.</p>
    <p>This is your receipt for tax purposes.</p>
    <hr style="border:none;border-top:1px solid #e8e4de;" />
    <p style="font-size:14px;color:#4a7c59;">
      Church of the Regenerative Earth<br/>
      A 508(c)(1)(a) faith ministry<br/>
      EIN 42-3198293<br/>
      No goods or services were provided in exchange for this contribution.
    </p>
    <p style="font-size:14px;">With gratitude, come and gather with us at
      <a href="https://regencivics.earth" style="color:#4a7c59;">regencivics.earth</a>.</p>
  </div>`;
}

async function safeSendReceipt(to: string | null | undefined, amountCents: number, currency: string, monthly: boolean) {
  if (!to) return;
  try {
    await sendEmail({
      to,
      subject: "Your gift to the Church of the Regenerative Earth",
      html: receiptHtml(amountCents, currency, monthly),
      template: "core_donation_receipt",
    });
  } catch (err) {
    console.error("[stripe webhook] receipt email failed:", err);
  }
}

export function registerStripeWebhookRoutes(app: Express) {
  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    if (!isStripeConfigured() || !ENV.stripeWebhookSecret) {
      res.status(503).json({ error: "stripe_not_configured" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string | undefined;
    const rawBody: string = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

    // 1. Verify signature.
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig ?? "", ENV.stripeWebhookSecret);
    } catch (err) {
      console.warn("[stripe webhook] signature verification failed:", (err as Error).message);
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    const db = await getDb();
    if (!db) {
      // Return 500 so Stripe retries later rather than dropping the event.
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    // 2. Idempotency: skip if we've already recorded this event id. The
    // insert doubles as a lock — it must land BEFORE processing so two
    // concurrent deliveries can't both process (deliveryId is a PRIMARY KEY).
    // Wrap it: a concurrent delivery losing the race throws a duplicate-key
    // error, which we treat as "already handled" rather than letting it bubble
    // into an unhandledRejection (which the process-level handler turns into
    // process.exit, crashing the whole server on a mere duplicate webhook).
    const existing = await db
      .select({ deliveryId: webhookDeliveries.deliveryId })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, event.id))
      .limit(1);
    if (existing.length > 0) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    try {
      await db.insert(webhookDeliveries).values({ deliveryId: event.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate/i.test(msg) || /unique/i.test(msg)) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      // Real DB error claiming the delivery: 500 so Stripe retries.
      console.error("[stripe webhook] could not record delivery:", err);
      res.status(500).json({ error: "delivery_record_failed" });
      return;
    }

    // 3. Handle the events we care about.
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
          await db
            .update(churchDonations)
            .set({ status: "succeeded", stripePaymentIntent: paymentIntent, stripeSubscriptionId: subscriptionId })
            .where(eq(churchDonations.stripeSessionId, session.id));

          const [row] = await db
            .select()
            .from(churchDonations)
            .where(eq(churchDonations.stripeSessionId, session.id))
            .limit(1);
          const to = session.customer_details?.email ?? row?.donorEmail ?? null;
          if (row) await safeSendReceipt(to, row.amountCents, row.currency, row.giftInterval === "monthly");
          break;
        }

        case "invoice.paid": {
          // Recurring monthly renewals. The first cycle is already recorded by
          // checkout.session.completed, so only act on later cycles here. Stripe
          // has moved subscription / payment_intent around across API versions,
          // so read those defensively; amount_paid / currency / email are stable.
          const invoice = event.data.object as Stripe.Invoice;
          const inv = invoice as unknown as {
            billing_reason?: string;
            subscription?: unknown;
            payment_intent?: unknown;
          };
          if (inv.billing_reason === "subscription_cycle") {
            const subscriptionId = typeof inv.subscription === "string" ? inv.subscription : null;
            const paymentIntent = typeof inv.payment_intent === "string" ? inv.payment_intent : null;
            const amount = invoice.amount_paid ?? 0;
            const currency = invoice.currency ?? "usd";
            await db.insert(churchDonations).values({
              stripeSessionId: null,
              stripePaymentIntent: paymentIntent,
              stripeSubscriptionId: subscriptionId,
              donorEmail: invoice.customer_email ?? null,
              amountCents: amount,
              currency,
              giftInterval: "monthly",
              status: "succeeded",
            });
            await safeSendReceipt(invoice.customer_email, amount, currency, true);
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await db
            .update(churchDonations)
            .set({ status: "failed" })
            .where(eq(churchDonations.stripePaymentIntent, pi.id));
          break;
        }

        default:
          // Ignore other event types.
          break;
      }
    } catch (err) {
      console.error("[stripe webhook] handler error:", err);
      // Roll back the delivery claim so Stripe's retry actually reprocesses.
      // Previously this returned 200 after recording the id, which silently
      // dropped the donation on any transient handler failure (deadlock,
      // deploy restart) because the retry hit the dedupe and skipped it.
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, event.id))
        .catch((delErr) => console.error("[stripe webhook] delivery rollback failed:", delErr));
      res.status(500).json({ ok: false, handled: false });
      return;
    }

    res.status(200).json({ ok: true });
  });
}
