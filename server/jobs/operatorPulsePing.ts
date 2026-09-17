/**
 * Morning Operator Pulse ping.
 *
 * Railway cron: POST /api/cron/operator-pulse-ping (hourly is fine).
 * Gates on ~08:00 America/Los_Angeles once per Pacific day. When
 * admin.operatorPulse has items, sends a short summary via Telegram +
 * WhatsApp (notify.ts) and a fail-soft owner email (notifyOwner).
 *
 * Idempotent via site_settings key operator_pulse_ping.last_day (PT date).
 * Empty pulse → mark the day handled, no message (quiet mornings stay quiet).
 */
import { getSiteSetting, setSiteSetting } from "../db";
import { computeOperatorPulse } from "../routes/admin";
import { notifyOperatorPulse } from "../_core/notify";
import { notifyOwner } from "../_core/notification";
import { APP_BASE_URL } from "../_core/email";
import { logger } from "../_core/logger";
import {
  OPERATOR_PULSE_PING_HOUR_PT,
  OPERATOR_PULSE_PING_LAST_DAY_KEY,
  formatOperatorPulsePingMessage,
  operatorPulseMorningDue,
  operatorPulsePtDayHour,
} from "../../shared/operatorPulse";

const log = logger("operator-pulse-ping");

export type OperatorPulsePingReport = {
  skipped: boolean;
  reason?: string;
  day?: string;
  itemCount?: number;
  notified?: boolean;
};

export async function runOperatorPulsePing(now: Date = new Date()): Promise<OperatorPulsePingReport> {
  try {
    const lastDay = await getSiteSetting(OPERATOR_PULSE_PING_LAST_DAY_KEY);
    if (!operatorPulseMorningDue(now, lastDay)) {
      const here = operatorPulsePtDayHour(now);
      return {
        skipped: true,
        reason: here.hour < OPERATOR_PULSE_PING_HOUR_PT ? "before_window" : "already_ran_today",
        day: here.day,
      };
    }

    const day = operatorPulsePtDayHour(now).day;
    const pulse = await computeOperatorPulse(now.getTime());
    const itemCount = pulse.items.length;

    // Mark the day first so a send failure cannot spam hourly retries into
    // afternoon. Failures surface in logs; Overview still shows live counts.
    await setSiteSetting(OPERATOR_PULSE_PING_LAST_DAY_KEY, day);

    if (itemCount === 0) {
      log.info(`clear morning ${day} — no ping`);
      return { skipped: true, reason: "clear", day, itemCount: 0, notified: false };
    }

    const { title, body } = formatOperatorPulsePingMessage(pulse.items, APP_BASE_URL);

    let notified = false;
    try {
      await notifyOperatorPulse(body);
      notified = true;
    } catch (err) {
      log.error("channel notify failed", err);
    }

    try {
      await notifyOwner({ title, content: body.replace(/\*/g, "") });
    } catch (err) {
      log.error("owner email notify failed", err);
    }

    log.info(`pinged ${day}: ${itemCount} items`);
    return { skipped: false, day, itemCount, notified };
  } catch (err) {
    log.error("operator pulse ping failed", err);
    return { skipped: true, reason: "error" };
  }
}
