/**
 * Weekly steward digest (CROWDPOOLING_PLATFORM_SPEC.md Part C, cron job 4).
 *
 * Once a week, every steward of every active campaign gets one short, warm
 * email: needs still open, claims to deliver in the next few days, new
 * followers, and contributions waiting on their review. "Steward" is the
 * whole set from server/lib/project-steward.ts (creator, applicant,
 * stewardUserId, approved land_project claim holders). Each section links to
 * the project page's steward tools (/project/:key#review, #claims, #needs,
 * #followers). Demo campaigns send nothing. A campaign with nothing to report
 * sends nothing.
 *
 * It piggybacks the existing weekly slot (server/jobs/digestJob.ts runDigestJob),
 * which already carries a 7-day interval guard and a 2-hour duplicate guard, so
 * a steward is nudged at most once a week. Sending goes through sendEmail, which
 * honors the EMAIL_HOLD kill switch and the outbound rate limiter; the digest
 * frequency preference is checked here so a steward set to "never" is skipped.
 *
 * The composition is pure and the db reads + send are injectable, so it is unit
 * tested (server/steward-digest.test.ts) with no database or network.
 */

import { sendEmail, APP_BASE_URL } from "../_core/email";
import { sql } from "drizzle-orm";
import { projectPathForCampaign, projectPathForCampaignFocus } from "../../shared/projectKey";
import { isHoursNeed } from "../../shared/roleCapacity";
import { getCampaignStewardIds } from "../lib/project-steward";

export interface StewardDigestNeed {
  title: string;
  wanted: number;
  claimed: number;
  /** 'hours_per_week' on an hours need: wanted and claimed are hours a week. */
  unit?: "count" | "hours_per_week";
}
export interface StewardDigestClaim {
  title: string;
  contributorName: string;
  whenLabel: string;
}
export interface StewardDigestPending {
  title: string;
  contributorName: string;
}
export interface StewardDigestData {
  campaignId: number;
  campaignTitle: string;
  /** The project page path (/project/:key). Falls back to the campaign key. */
  projectPath?: string;
  stewardName: string | null;
  unfilledNeeds: StewardDigestNeed[];
  expiringClaims: StewardDigestClaim[];
  newFollowers: number;
  pendingReviews: StewardDigestPending[];
}
export interface StewardCampaignRow {
  id: number;
  title: string;
  applicationId?: number | null;
  projectName?: string | null;
  /** The steward this row emails (one row per campaign and steward). */
  userId: number;
  email: string;
  name: string | null;
  digestFrequency: string;
}

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Cap a list for the email and note the remainder in plain words. */
function capList<T>(items: T[], max: number): { shown: T[]; more: number } {
  return { shown: items.slice(0, max), more: Math.max(0, items.length - max) };
}

function section(title: string, manageUrl: string, bodyRows: string): string {
  return `
    <div style="margin-top: 26px;">
      <h2 style="color: #1a472a; font-size: 16px; margin: 0 0 10px;">${title}</h2>
      ${bodyRows}
      <div style="margin-top: 10px;">
        <a href="${manageUrl}" style="font-size: 13px; color: #1a472a; font-weight: bold; text-decoration: underline;">Open the steward page</a>
      </div>
    </div>`;
}

/**
 * Compose one steward's digest, or null when the campaign has nothing worth an
 * email this week. Copy stays plain and direct, no em-dashes.
 */
export function composeStewardDigest(data: StewardDigestData): { subject: string; html: string } | null {
  const hasContent =
    data.unfilledNeeds.length > 0 ||
    data.expiringClaims.length > 0 ||
    data.newFollowers > 0 ||
    data.pendingReviews.length > 0;
  if (!hasContent) return null;

  const path = data.projectPath
    ?? projectPathForCampaign({ id: data.campaignId, applicationId: null, title: data.campaignTitle });
  const base = `${APP_BASE_URL}${path}`;
  const utm = "utm_source=email&utm_medium=steward-digest&utm_campaign=weekly";
  const manage = (anchor: string) => `${base}${base.includes("?") ? "&" : "?"}${utm}#${anchor}`;

  const li = (text: string) =>
    `<p style="margin: 4px 0; font-size: 14px; color: #2d3748; line-height: 1.5;">${text}</p>`;
  const andMore = (n: number) => (n > 0 ? li(`<span style="color:#4a5568;">and ${n} more.</span>`) : "");

  const sections: string[] = [];

  if (data.pendingReviews.length > 0) {
    const { shown, more } = capList(data.pendingReviews, 6);
    const rows =
      shown.map((p) => li(`<strong>${esc(p.contributorName)}</strong> offered ${esc(p.title)}.`)).join("") +
      andMore(more);
    sections.push(
      section(
        `${data.pendingReviews.length} ${data.pendingReviews.length === 1 ? "contribution is" : "contributions are"} waiting on you`,
        manage("review"),
        rows,
      ),
    );
  }

  if (data.expiringClaims.length > 0) {
    const { shown, more } = capList(data.expiringClaims, 6);
    const rows =
      shown.map((c) => li(`<strong>${esc(c.contributorName)}</strong> on ${esc(c.title)}, ${esc(c.whenLabel)}.`)).join("") +
      andMore(more);
    sections.push(
      section(
        "Claims to deliver soon",
        manage("claims"),
        li(`<span style="color:#4a5568;">These accepted claims reach their delivery window in the next three days. Mark them delivered once they land, or they reopen for someone else.</span>`) + rows,
      ),
    );
  }

  if (data.unfilledNeeds.length > 0) {
    const { shown, more } = capList(data.unfilledNeeds, 8);
    const rows =
      shown.map((n) => li(n.unit === "hours_per_week"
        ? `${esc(n.title)}: ${n.claimed} of ${n.wanted} hours a week filled.`
        : `${esc(n.title)}: ${n.claimed} of ${n.wanted} filled.`)).join("") + andMore(more);
    sections.push(section("Needs still open", manage("needs"), rows));
  }

  if (data.newFollowers > 0) {
    const word = data.newFollowers === 1 ? "person" : "people";
    sections.push(
      section(
        "New followers",
        manage("followers"),
        li(`${data.newFollowers} ${word} started following this campaign this week. They see your updates.`),
      ),
    );
  }

  const greetingName = data.stewardName ? esc(data.stewardName.split(" ")[0]) : "there";
  const subject = `${data.campaignTitle}: your pool this week`;

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; background: #fff;">
      <div style="background-color: #1a472a; background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 28px 40px;">
        <p style="color: #7dd87d; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Steward digest</p>
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-family: Georgia, serif;">${esc(data.campaignTitle)}</h1>
      </div>
      <div style="padding: 28px 40px;">
        <p style="font-size: 15px; color: #2d3748; line-height: 1.6; margin: 0 0 4px;">Hi ${greetingName}, here is where your pool stands this week.</p>
        ${sections.join("")}
        <div style="text-align: center; margin-top: 32px;">
          <a href="${manage("steward-tools")}"
             style="display: inline-block; background: #7dd87d; color: #1a472a; padding: 12px 32px; border-radius: 9999px; font-weight: bold; text-decoration: none; font-size: 15px;">
            Open your project page
          </a>
        </div>
      </div>
      <div style="padding: 22px 40px; background: #f8f5f0; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0 0 6px;">You get this because you steward a land project with a live campaign on ReGen Civics.</p>
        <p style="margin: 0;"><a href="${APP_BASE_URL}/profile?${utm}" style="color: #1a472a;">Update email preferences</a></p>
      </div>
    </div>`;

  return { subject, html };
}

// ─── Default db loaders (raw SQL, matches the batch-job style) ──────────────

function needTitle(row: any): string {
  const kind = String(row.kind ?? "");
  const category = String(row.category ?? "");
  if (kind === "role" || category === "role") return String(row.roleTitle || "A role");
  if (category === "equipment") return String(row.equipmentName || "Equipment");
  if (category === "resource") return String(row.resourceName || "A resource");
  if (category === "land") return String(row.landDescription || "Land");
  return String(row.roleTitle || row.equipmentName || row.resourceName || "A need");
}

function whenLabel(due: any): string {
  const d = due instanceof Date ? due : new Date(due);
  if (isNaN(d.getTime())) return "due soon";
  return `due ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

/**
 * One row per steward of every active, non-demo campaign. Stewards come from
 * getCampaignStewardIds (server/lib/project-steward.ts); admins are not
 * stewards unless they are one of those people.
 */
async function defaultLoadCampaigns(db: any, onlyCampaignId?: number): Promise<StewardCampaignRow[]> {
  const [campaignRows] = await db.execute(sql`
    SELECT c.id, c.title, c.userId, c.applicationId, c.projectName
    FROM campaigns c
    WHERE c.status = 'active' AND COALESCE(c.isDemo, 0) = 0
      ${onlyCampaignId != null ? sql`AND c.id = ${onlyCampaignId}` : sql``}
  `);
  const out: StewardCampaignRow[] = [];
  for (const c of ((campaignRows as any[]) ?? [])) {
    const stewardIds = await getCampaignStewardIds({
      userId: Number(c.userId),
      applicationId: c.applicationId != null ? Number(c.applicationId) : null,
    });
    if (stewardIds.length === 0) continue;
    const [userRows] = await db.execute(sql`
      SELECT u.id, u.email, u.name, COALESCE(pp.emailDigestFrequency, 'monthly') AS digestFrequency
      FROM users u
      LEFT JOIN player_profiles pp ON pp.userId = u.id
      WHERE u.id IN (${sql.join(stewardIds.map((id) => sql`${id}`), sql`, `)})
        AND u.email IS NOT NULL AND u.email <> ''
    `);
    for (const u of ((userRows as any[]) ?? [])) {
      out.push({
        id: Number(c.id),
        title: String(c.title ?? "Your campaign"),
        applicationId: c.applicationId != null ? Number(c.applicationId) : null,
        projectName: c.projectName != null ? String(c.projectName) : null,
        userId: Number(u.id),
        email: String(u.email),
        name: u.name != null ? String(u.name) : null,
        digestFrequency: String(u.digestFrequency ?? "monthly"),
      });
    }
  }
  return out;
}

async function defaultLoadDigestData(db: any, campaign: StewardCampaignRow): Promise<StewardDigestData> {
  const cid = campaign.id;

  const [needRows] = await db.execute(sql`
    SELECT id, category, kind, capacityUnit, roleTitle, equipmentName, resourceName, landDescription,
           quantityWanted, quantityClaimed
    FROM campaign_items
    WHERE campaignId = ${cid}
      AND kind <> 'financial_link'
      AND quantityClaimed < quantityWanted
    ORDER BY priorityPinned DESC, id ASC
  `);

  const [expRows] = await db.execute(sql`
    SELECT id, title, contributorName, claimExpiresAt
    FROM campaign_contributions
    WHERE campaignId = ${cid}
      AND status = 'accepted'
      AND claimExpiresAt IS NOT NULL
      AND claimExpiresAt > NOW()
      AND claimExpiresAt < DATE_ADD(NOW(), INTERVAL 3 DAY)
    ORDER BY claimExpiresAt ASC
  `);

  const [followerRows] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM campaign_followers
        WHERE campaignId = ${cid} AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY))
      +
      (SELECT COUNT(*) FROM user_follows
        WHERE targetType = 'campaign' AND targetId = ${String(cid)}
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS cnt
  `);

  const [pendRows] = await db.execute(sql`
    SELECT id, title, contributorName
    FROM campaign_contributions
    WHERE campaignId = ${cid} AND status = 'pending'
    ORDER BY createdAt ASC
  `);

  return {
    campaignId: cid,
    campaignTitle: campaign.title,
    projectPath: projectPathForCampaignFocus({
      id: cid,
      applicationId: campaign.applicationId ?? null,
      projectName: campaign.projectName ?? null,
      title: campaign.title,
    }),
    stewardName: campaign.name,
    unfilledNeeds: ((needRows as any[]) ?? []).map((r) => ({
      title: needTitle(r),
      wanted: Number(r.quantityWanted ?? 1),
      claimed: Number(r.quantityClaimed ?? 0),
      unit: isHoursNeed({ kind: String(r.kind ?? ""), capacityUnit: r.capacityUnit ?? null }) ? "hours_per_week" as const : "count" as const,
    })),
    expiringClaims: ((expRows as any[]) ?? []).map((r) => ({
      title: String(r.title ?? "a claim"),
      contributorName: String(r.contributorName ?? "A contributor"),
      whenLabel: whenLabel(r.claimExpiresAt),
    })),
    newFollowers: Number((followerRows as any[])?.[0]?.cnt ?? 0),
    pendingReviews: ((pendRows as any[]) ?? []).map((r) => ({
      title: String(r.title ?? "a contribution"),
      contributorName: String(r.contributorName ?? "A contributor"),
    })),
  };
}

export interface StewardDigestOptions {
  dryRun?: boolean;
  onlyCampaignId?: number;
  loadCampaigns?: (db: any, onlyCampaignId?: number) => Promise<StewardCampaignRow[]>;
  loadDigestData?: (db: any, campaign: StewardCampaignRow) => Promise<StewardDigestData>;
  sendEmailImpl?: (p: { to: string; subject: string; html: string }) => Promise<any>;
}

export async function sendStewardWeeklyDigest(
  db: any,
  opts: StewardDigestOptions = {},
): Promise<{
  campaigns: number;
  composed: number;
  sent: number;
  skippedQuiet: number;
  skippedFrequency: number;
  digests: Array<{ campaignId: number; subject: string; html: string }>;
}> {
  const loadCampaigns = opts.loadCampaigns ?? defaultLoadCampaigns;
  const loadDigestData = opts.loadDigestData ?? defaultLoadDigestData;
  const sendEmailImpl = opts.sendEmailImpl ?? ((p) => sendEmail(p));

  let campaigns = await loadCampaigns(db, opts.onlyCampaignId);
  if (opts.onlyCampaignId != null) campaigns = campaigns.filter((c) => c.id === opts.onlyCampaignId);

  let composed = 0;
  let sent = 0;
  let skippedQuiet = 0;
  let skippedFrequency = 0;
  const digests: Array<{ campaignId: number; subject: string; html: string }> = [];

  // Several stewards can share one campaign: load its data once.
  const dataCache = new Map<number, StewardDigestData>();
  for (const campaign of campaigns) {
    if (campaign.digestFrequency === "never") {
      skippedFrequency++;
      continue;
    }
    let data = dataCache.get(campaign.id);
    if (!data) {
      data = await loadDigestData(db, campaign);
      dataCache.set(campaign.id, data);
    }
    data = { ...data, stewardName: campaign.name };
    const email = composeStewardDigest(data);
    if (!email) {
      skippedQuiet++;
      continue;
    }
    composed++;
    if (opts.dryRun) {
      digests.push({ campaignId: campaign.id, subject: email.subject, html: email.html });
      continue;
    }
    try {
      await sendEmailImpl({ to: campaign.email, subject: email.subject, html: email.html });
      sent++;
    } catch (err) {
      console.warn(`[steward-digest] send failed for campaign ${campaign.id}:`, err);
    }
  }

  return { campaigns: campaigns.length, composed, sent, skippedQuiet, skippedFrequency, digests };
}
