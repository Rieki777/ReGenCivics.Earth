/**
 * Assembly governance notifications (ASSEMBLY_PAGE_SPEC.md section 8).
 *
 * Subscribers are players with the "Governance updates" toggle on
 * (player_profiles.notificationPrefs.governanceUpdates). Batched hard:
 * at most one governance email per person per day, enforced against
 * email_logs before every send.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export async function notifyGovernanceSubscribers(subject: string, html: string): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const [subs] = await db.execute(
      sql`SELECT u.email, u.name FROM player_profiles pp
          JOIN users u ON u.id = pp.userId
          WHERE u.email IS NOT NULL
            AND pp.notificationPrefs LIKE '%"governanceUpdates":true%'
          LIMIT 500`
    );
    const { sendEmail } = await import("../_core/email");
    const dbHelpers: any = await import("../db");
    let sent = 0;
    for (const s of subs as unknown as any[]) {
      if (!s.email) continue;
      const [already] = await db.execute(
        sql`SELECT COUNT(*) AS c FROM email_logs
            WHERE recipientEmail = ${s.email} AND template = 'governance-update' AND sentAt >= CURDATE()`
      );
      if (Number((already as any)?.[0]?.c ?? 0) > 0) continue;
      const res = await sendEmail({ to: s.email, subject, html, template: "governance-update", recipientName: s.name ?? undefined });
      if (res.id) {
        sent += 1;
        try {
          await dbHelpers.createEmailLog?.({
            recipientEmail: s.email,
            recipientName: s.name ?? null,
            subject,
            template: "governance-update",
            status: "sent",
            resendEmailId: res.id,
          });
        } catch { /* log row is best-effort; the daily batch guard degrades to rate limits */ }
      }
    }
    return sent;
  } catch (err) {
    console.error("[assembly] governance notification failed", err);
    return 0;
  }
}

export async function notifySubscribersOfReadyProposals(rows: { id: number; title: string; aim: string | null }[]): Promise<void> {
  if (rows.length === 0) return;
  const items = rows
    .map((p) => `<li><strong>${p.title}</strong>${p.aim ? ` (aim: ${p.aim})` : ""}</li>`)
    .join("");
  await notifyGovernanceSubscribers(
    rows.length === 1 ? `Ready to launch: ${rows[0].title}` : `${rows.length} proposals are ready to launch`,
    `<p>Last call passed quietly. ${rows.length === 1 ? "This proposal is" : "These proposals are"} ready for the binding vote on Hypha:</p>
     <ul>${items}</ul>
     <p><a href="https://regencivics.earth/assembly">Open the Assembly</a> to launch or read the full trail.</p>
     <p>After you launch a vote on Hypha, paste the Hypha proposal link back into the Assembly. That link is how the result finds its way home and applies itself when the vote closes. Without it, a human has to relay the outcome by hand.</p>`
  );
}
