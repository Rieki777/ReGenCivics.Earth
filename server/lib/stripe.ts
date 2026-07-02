/**
 * Stripe client for the Church of the Regenerative Earth (CORE).
 *
 * Server-side only. The secret key and webhook signing secret are never exposed
 * to the client; the donation flow uses hosted Stripe Checkout (redirect), so no
 * publishable key or Stripe.js is needed in the browser. Rye sets the keys on
 * Railway; until then donations are simply not live and getStripe() throws a
 * clear, catchable error rather than crashing the server at import time.
 */
import Stripe from "stripe";
import { ENV } from "../_core/env";

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(ENV.stripeSecretKey);
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is unset).");
  }
  if (!_stripe) {
    _stripe = new Stripe(ENV.stripeSecretKey);
  }
  return _stripe;
}
