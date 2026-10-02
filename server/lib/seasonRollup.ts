/**
 * Season wrap letters go out one address at a time.
 * A shared To header showed every recipient to every other recipient.
 */
import { sendEmail } from "../_core/email";
import { providerAccepted } from "./emailAttempt";
import { emailsAcceptedForInquiry } from "../emailTracking";

export function seasonRollupInquiryType(season: string): string {
  return `season:${season}`.slice(0, 50);
}

export async function sendSeasonRollupEmails(opts: {
  season: string;
  emails: string[];
  subject: string;
  html: string;
}): Promise<{ accepted: number; dropped: number }> {
  const inquiryType = seasonRollupInquiryType(opts.season);
  let already = new Set<string>();
  try {
    already = await emailsAcceptedForInquiry("season_rollup", inquiryType, 0);
  } catch {
    already = new Set();
  }

  let accepted = 0;
  let dropped = 0;
  let stop = false;
  for (const raw of opts.emails) {
    const email = raw.trim();
    if (!email) continue;
    if (already.has(email.toLowerCase())) continue;
    if (stop) {
      dropped += 1;
      continue;
    }
    const result = await sendEmail({
      to: [email],
      subject: opts.subject,
      html: opts.html,
      template: "season_rollup",
      inquiryType,
      inquiryId: 0,
    });
    if (providerAccepted(result)) accepted += 1;
    else {
      dropped += 1;
      if (result.status === "rate_limited" || result.status === "held") stop = true;
    }
  }
  return { accepted, dropped };
}
