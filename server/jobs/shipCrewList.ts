/**
 * shipCrewList: the crew-list trigger job (SHIP_V5_FLYWHEEL Section 4).
 *
 * Runs daily. For each confirmed crew-list signup, it checks whether a bookable
 * week now matches their interests (any week / this season / winter / year two)
 * and, if so, sends one short note in the ship's voice and stamps lastNotifiedAt.
 * A signup is emailed at most once per fortnight, so a standing opening never
 * turns into a nag. Deterministic-first: the availability is a plain enumeration,
 * no LLM. Idempotent via lastNotifiedAt. Bounded by MAX_PER_RUN.
 */
import { getDb } from "../db";
import { and, eq, isNotNull, isNull, or, lt, inArray } from "drizzle-orm";
import { shipCrewListSignups, shipBookings, shipBlackoutDates, shipPricingWindows } from "../../drizzle/schema";
import { enumerateVoyageWeeks, type VoyageWeek } from "../lib/ship-logic";
import {
  SHIP_SEASON_START_YMD, SHIP_YEAR2_START_YMD, YEAR2_PRICE_MULTIPLIER,
  SHIP_BOOKING_HORIZON_WEEKS, SHIP_SEASONAL_BANDS,
} from "../lib/ship-config";
import { ENV } from "../_core/env";

const BLOCKING_STATUSES = ["approved", "platform_pending", "confirmed", "active", "completed"] as const;
const THROTTLE_MS = 14 * 24 * 60 * 60 * 1000; // once a fortnight
const MAX_PER_RUN = 50;
const THIS_SEASON_WEEKS = 8; // "this season" = a selectable week within ~2 months

type Interest = "any_week" | "this_season" | "winter" | "year_2" | "price_change";

/** Which currently-selectable weeks match a set of interests. */
function matchingWeeks(weeks: VoyageWeek[], interests: Interest[], todayYmd: string): VoyageWeek[] {
  const open = weeks.filter((w) => w.selectable);
  const horizonDate = new Date(Date.parse(`${todayYmd}T00:00:00Z`) + THIS_SEASON_WEEKS * 7 * 86_400_000).toISOString().slice(0, 10);
  const want = new Set(interests);
  return open.filter((w) => {
    if (want.has("any_week")) return true;
    if (want.has("this_season") && w.startDate <= horizonDate) return true;
    if (want.has("winter") && /winter/i.test(w.bioregion)) return true;
    if (want.has("year_2") && w.isYear2) return true;
    // price_change is a manual/event trigger, not derivable here; skip.
    return false;
  });
}

export async function runShipCrewListJob(): Promise<{ notified: number; scanned: number }> {
  const d = await getDb();
  if (!d) return { notified: 0, scanned: 0 };

  // Build the current bookable grid once.
  const blocking = await d.select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate }).from(shipBookings).where(inArray(shipBookings.status, [...BLOCKING_STATUSES]));
  const requested = await d.select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate }).from(shipBookings).where(eq(shipBookings.status, "requested"));
  const blackouts = await d.select().from(shipBlackoutDates);
  const pricing = await d.select().from(shipPricingWindows);
  const today = new Date().toISOString().slice(0, 10);
  const weeks = enumerateVoyageWeeks({
    seasonStart: SHIP_SEASON_START_YMD,
    year2Start: SHIP_YEAR2_START_YMD,
    year2Multiplier: YEAR2_PRICE_MULTIPLIER,
    horizonWeeks: SHIP_BOOKING_HORIZON_WEEKS,
    today,
    booked: blocking.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
    requested: requested.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
    blackouts: blackouts.map((b) => ({ startDate: b.startDate, endDate: b.endDate, reason: b.reason })),
    pricingWindows: pricing.map((p) => ({ startDate: p.startDate, endDate: p.endDate, multiplier: p.multiplier, label: p.label })),
    bands: SHIP_SEASONAL_BANDS,
  });

  // Confirmed signups not notified within the throttle window.
  const cutoff = new Date(Date.now() - THROTTLE_MS);
  const due = await d.select().from(shipCrewListSignups)
    .where(and(
      isNotNull(shipCrewListSignups.confirmedAt),
      or(isNull(shipCrewListSignups.lastNotifiedAt), lt(shipCrewListSignups.lastNotifiedAt, cutoff)),
    ))
    .limit(500);

  const { sendEmail } = await import("../_core/email");
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (ymd: string) => { const dt = new Date(`${ymd}T00:00:00Z`); return `${WD[dt.getUTCDay()]} ${MO[dt.getUTCMonth()]} ${dt.getUTCDate()}`; };

  let notified = 0;
  for (const s of due) {
    if (notified >= MAX_PER_RUN) break;
    const interests = (Array.isArray(s.interests) ? (s.interests as Interest[]) : ["any_week"]) as Interest[];
    const matches = matchingWeeks(weeks, interests.length ? interests : ["any_week"], today);
    if (matches.length === 0) continue;
    const list = matches.slice(0, 3).map((w) => `Board ${fmt(w.startDate)} in ${w.bioregion}`).join("; ");
    const unsubUrl = `${ENV.appUrl}/ship/crew-list/unsubscribe?token=${encodeURIComponent(s.unsubscribeToken)}`;
    try {
      await sendEmail({
        to: s.email,
        subject: "A voyage week just opened aboard the ReGen Ship",
        html: `<h2>She has a week for you</h2><p>A voyage week you were watching is open on her calendar: ${list}.</p><p style="margin:20px 0;"><a href="${ENV.appUrl}/ship/book" style="background:#1a472a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">See open weeks</a></p><p style="color:#888;font-size:12px;">You are on the ReGen Ship crew list. <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a>.</p>`,
      });
      await d.update(shipCrewListSignups).set({ lastNotifiedAt: new Date() }).where(eq(shipCrewListSignups.id, s.id));
      notified++;
      await new Promise((r) => setTimeout(r, 150)); // gentle on the mail provider
    } catch {
      /* one bad send should not stop the run */
    }
  }
  return { notified, scanned: due.length };
}
