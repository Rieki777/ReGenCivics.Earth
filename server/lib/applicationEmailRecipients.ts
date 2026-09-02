/**
 * Map land-project applications to bulk-email recipients.
 * Contact email/name come from the applicant's user account (applications.userId),
 * not from a column on the applications table.
 */

export const APPLICATION_EMAIL_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "changes_requested",
] as const;

export type ApplicationEmailStatus = (typeof APPLICATION_EMAIL_STATUSES)[number];

export type ApplicationEmailSourceRow = {
  contactEmail?: string | null;
  contactName?: string | null;
  projectName: string;
};

export type ApplicationEmailRecipient = {
  email: string;
  name: string;
  projectName: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapApplicationEmailRecipients(
  rows: ApplicationEmailSourceRow[],
): ApplicationEmailRecipient[] {
  const seen = new Set<string>();
  const out: ApplicationEmailRecipient[] = [];

  for (const row of rows) {
    const email = (row.contactEmail ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);

    const name =
      (row.contactName ?? "").trim() ||
      (row.projectName ?? "").trim() ||
      email.split("@")[0];

    out.push({
      email,
      name,
      projectName: (row.projectName ?? "").trim() || name,
    });
  }

  return out;
}

export function applyRecipientMergeFields(
  text: string,
  recipient: { email: string; name: string; projectName?: string },
): string {
  const name = recipient.name || "Friend";
  const projectName = recipient.projectName || name || "your project";
  return text
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{email\}\}/g, recipient.email)
    .replace(/\{\{projectName\}\}/g, projectName);
}
