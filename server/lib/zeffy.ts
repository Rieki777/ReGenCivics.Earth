/**
 * Zeffy integration for the Church of the Regenerative Earth (CORE).
 *
 * Zeffy is the PREFERRED donation processor: zero platform fees for
 * nonprofits (they fund themselves through an optional donor tip at checkout,
 * never deducted from the gift). Stripe remains a secondary fallback (ADR-19).
 *
 * Unlike Stripe, Zeffy does not offer a "create checkout session" API. A
 * donation form (amounts, one-time/monthly toggle, campaign branding) is built
 * once in the Zeffy dashboard (Campaigns), then embedded on the site via the
 * dashboard-generated embed URL. Our server's job is just to know whether that
 * URL is configured, and to reconcile completed payments via Zeffy's webhook
 * into the same `church_donations` ledger Stripe writes to (see
 * server/webhooks/zeffy.ts).
 *
 * Zeffy's public API (https://api.zeffy.com/api/v1/) is READ-ONLY (Payments,
 * Contacts, Campaigns; Bearer token auth). It is not used to create payments,
 * only optionally to reconcile/audit (see scripts/reconcile-zeffy.ts).
 */
import { ENV } from "../_core/env";

export function isZeffyConfigured(): boolean {
  return Boolean(ENV.zeffyEmbedUrl);
}

export function getZeffyEmbedUrl(): string {
  if (!isZeffyConfigured()) {
    throw new Error("Zeffy is not configured (ZEFFY_EMBED_URL is unset).");
  }
  return ENV.zeffyEmbedUrl;
}

export const ZEFFY_API_BASE = "https://api.zeffy.com/api/v1";

export function isZeffyApiConfigured(): boolean {
  return Boolean(ENV.zeffyApiKey);
}

/** Minimal typed shape of the fields we read from a Zeffy payment record. */
export type ZeffyPayment = {
  id: string;
  status?: string;
  amount?: number; // cents, per Zeffy API docs
  currency?: string;
  campaignId?: string;
  contact?: { email?: string | null } | null;
  createdAt?: string;
};

/** GET a page of recent payments from the read-only Zeffy API, for reconciliation. */
export async function fetchZeffyPayments(params: { since?: string } = {}): Promise<ZeffyPayment[]> {
  if (!isZeffyApiConfigured()) throw new Error("ZEFFY_API_KEY is not configured");
  const url = new URL(`${ZEFFY_API_BASE}/payments`);
  if (params.since) url.searchParams.set("since", params.since);

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ENV.zeffyApiKey}` },
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Zeffy payments fetch failed: ${resp.status} ${detail.slice(0, 300)}`);
  }
  const json = (await resp.json()) as { data?: ZeffyPayment[] } | ZeffyPayment[];
  return Array.isArray(json) ? json : (json.data ?? []);
}
