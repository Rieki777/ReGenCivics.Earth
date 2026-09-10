/**
 * Outbound History data: newsletter_issues joined to email_logs via
 * newsletter_issue_recipients. Stats come from columns Resend webhooks and
 * the existing tracking pixel already write. No new ESP.
 */
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { emailLogs, newsletterIssueRecipients } from "../../drizzle/schema";
import type { DeliveryLogRow } from "../../shared/outboundHistory";

export async function loadRecipientLogs(issueIds: number[]): Promise<{
  recipients: Array<{
    issueId: number;
    email: string;
    status: string;
    emailLogId: number | null;
  }>;
  logs: DeliveryLogRow[];
}> {
  if (issueIds.length === 0) return { recipients: [], logs: [] };
  const db = await getDb();
  if (!db) return { recipients: [], logs: [] };

  const recipients = await db
    .select({
      issueId: newsletterIssueRecipients.issueId,
      email: newsletterIssueRecipients.email,
      status: newsletterIssueRecipients.status,
      emailLogId: newsletterIssueRecipients.emailLogId,
    })
    .from(newsletterIssueRecipients)
    .where(inArray(newsletterIssueRecipients.issueId, issueIds));

  const logIds = [...new Set(
    recipients
      .map((row) => row.emailLogId)
      .filter((id): id is number => id != null),
  )];
  if (logIds.length === 0) return { recipients, logs: [] };

  const logs = await db
    .select({
      id: emailLogs.id,
      status: emailLogs.status,
      openedAt: emailLogs.openedAt,
      clickedAt: emailLogs.clickedAt,
      bounceReason: emailLogs.bounceReason,
      deliveredAt: emailLogs.deliveredAt,
      sentAt: emailLogs.sentAt,
    })
    .from(emailLogs)
    .where(inArray(emailLogs.id, logIds));

  return { recipients, logs };
}
