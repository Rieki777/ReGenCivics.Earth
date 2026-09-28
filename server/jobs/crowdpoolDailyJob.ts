/**
 * The daily crowdpool job (build spec 2026-09-27, section 8.5).
 *
 * Runs, in order, each step in its own try/catch so one failing step never
 * stops the rest:
 *   1. closeDueCampaigns: close each real live campaign whose close date has
 *      come (complete, or `closed`: didn't complete), server/lib/campaign-close.ts;
 *   2. resumeUnnoticedCloses: finish any close whose notices did not all go out;
 *   3. retryPendingCampaignEndEmails: owed cancellation and close emails to
 *      people without an account, for 30 days (server/lib/campaign-cancel.ts);
 *   4. nudges: stewards hear when an offer has waited 2 days, and again at
 *      7, then never again; a contributor with an account hears once at 14
 *      days (Rye's ruling of 2026-09-27: "to keep things active");
 *   5. finalStretch: followers hear two weeks before the close which needs
 *      are still open (up to three), unless every need is filled.
 *
 * Every step is idempotent: conditional updates, per-row stamps claimed
 * before a send, and spine dedupe keys. Extra runs (a deploy restarts the
 * in-process timer) send nothing new. Two game variables pause parts of it
 * without a deploy, each off when missing or unreadable:
 * crowdpool.auto_close (steps 1 and 2) and crowdpool.nudges (step 4). The
 * email retry (3) and the final stretch (5) have no switch, as the spec
 * sets them; both are single sends per person, stamped.
 *
 * Where it runs: an in-process daily timer in production only
 * (server/_core/index.ts), POST /api/cron/nightly-batch, and the admin "Run
 * nightly" button (batchJobs.runNightly). People without an account get no
 * new send from here beyond the close's use of the cancellation email.
 */
import { insertNotification } from "../lib/forum-notify";
import type { sendEmail as SendEmail } from "../_core/email";
import * as db from "../db";
import {
  AUTO_CLOSE_SWITCH,
  closeDueCampaigns,
  crowdpoolSwitchOn,
  resumeUnnoticedCloses,
} from "../lib/campaign-close";
import { retryPendingCampaignEndEmails } from "../lib/campaign-cancel";
import {
  buildFinalStretch,
  buildStewardNudge,
  buildStillWaiting,
  deliver,
  stewardIdsOf,
  type NotifyCampaign,
} from "../lib/campaign-notify";
import {
  FINAL_STRETCH,
  finalStretchDue,
  nudgeStepDue,
  stillWaitingDue,
} from "../../shared/campaignClose";
import {
  campaignEndsAt,
  computeCampaignProgress,
  formatCloseDate,
  summarizeProgress,
} from "../../shared/campaignProgress";

export type CrowdpoolDailyOptions = {
  now?: Date;
  /** Only these campaigns. Tests always pass it: scratch holds a thousand old fixtures. */
  onlyCampaignIds?: number[];
  /** Report what each step would do; write nothing, tell nobody. */
  dryRun?: boolean;
  insert?: typeof insertNotification;
  sendEmail?: typeof SendEmail;
  /** Reads a crowdpool switch (game variable). Tests pass their own. */
  readSwitch?: (key: string) => Promise<number>;
  /** Minutes a close must be old before step 2 finishes it. */
  leaseMinutes?: number;
};

export type CrowdpoolDailyResult = {
  closed: number;
  completed: number;
  released: number;
  resumed: number;
  emailsRetried: number;
  stewardNudges: number;
  stillWaiting: number;
  finalStretch: number;
  errors: string[];
};

export const NUDGES_SWITCH = "crowdpool.nudges";

function campaignOf(row: {
  campaignId: number;
  campaignTitle: string;
  projectName: string | null;
  applicationId: number | null;
  ownerId: number;
  campaignStatus?: string | null;
}): NotifyCampaign {
  return {
    id: Number(row.campaignId),
    title: String(row.campaignTitle ?? ""),
    projectName: row.projectName ?? null,
    applicationId: row.applicationId != null ? Number(row.applicationId) : null,
    userId: Number(row.ownerId),
    status: row.campaignStatus ?? "active",
  };
}

/**
 * Step 4. Steward nudges at 2 and 7 days, and the contributor's note at 14.
 * Each step is claimed on the offer's row before its notices go (a
 * conditional stamp, so two runs at once send it once, and a steward added
 * later never gets an old step); when every notice of a step fails, the
 * claim is handed back for the next run.
 */
export async function runNudges(opts: CrowdpoolDailyOptions = {}): Promise<{ stewardNudges: number; stillWaiting: number; paused: boolean }> {
  if (!(await crowdpoolSwitchOn(NUDGES_SWITCH, opts))) return { stewardNudges: 0, stillWaiting: 0, paused: true };
  const now = opts.now ?? new Date();
  const rows = await db.listNudgeCandidates({ now, onlyCampaignIds: opts.onlyCampaignIds });
  const stewardCache = new Map<number, number[]>();
  let stewardNudges = 0;
  let stillWaiting = 0;
  for (const row of rows) {
    const campaign = campaignOf(row);
    const contribution = {
      id: Number(row.id),
      title: String(row.title ?? ""),
      userId: row.userId != null ? Number(row.userId) : null,
      contributorName: row.contributorName,
      isAnonymous: row.isAnonymous,
    };

    const step = nudgeStepDue(row, now);
    if (step) {
      const stewardsFor = async () => {
        let ids = stewardCache.get(campaign.id);
        if (!ids) {
          ids = await stewardIdsOf(campaign);
          stewardCache.set(campaign.id, ids);
        }
        return ids;
      };
      if (opts.dryRun) {
        stewardNudges += buildStewardNudge({ campaign, contribution, stewardIds: await stewardsFor(), step }).length;
      } else {
        const claim = await db.claimNudgeStep(contribution.id, step);
        if (claim.claimed) {
          const inputs = buildStewardNudge({ campaign, contribution, stewardIds: await stewardsFor(), step });
          const ok = await deliver(inputs, { insert: opts.insert });
          if (inputs.length > 0 && ok === 0) await db.releaseNudgeStep(contribution.id, step, claim.firstStamped);
          else stewardNudges += ok;
        }
      }
    }

    if (stillWaitingDue(row, now)) {
      if (opts.dryRun) {
        stillWaiting += buildStillWaiting({ campaign, contribution }).length;
      } else if (await db.claimWaitNote(contribution.id)) {
        const inputs = buildStillWaiting({ campaign, contribution });
        const ok = await deliver(inputs, { insert: opts.insert });
        if (inputs.length > 0 && ok === 0) await db.releaseWaitNote(contribution.id);
        else stillWaiting += ok;
      }
    }
  }
  return { stewardNudges, stillWaiting, paused: false };
}

/**
 * Step 5. Two weeks before a close, followers who have not offered hear
 * which needs are still open. Nothing is sent, and nothing stamped, while
 * every need is filled, so a need that opens again inside the window is
 * still announced. The campaign's claim (finalStretchNoticedAt) is taken
 * before the notices go and handed back when every one of them fails.
 */
export async function runFinalStretch(opts: CrowdpoolDailyOptions = {}): Promise<{ campaigns: number; notices: number }> {
  const now = opts.now ?? new Date();
  const candidates = await db.listFinalStretchCandidates({ now, onlyCampaignIds: opts.onlyCampaignIds });
  if (candidates.length === 0) return { campaigns: 0, notices: 0 };
  const inputs = await db.getCampaignProgressInputs(candidates.map((c) => c.id));
  let campaigns = 0;
  let notices = 0;
  for (const c of candidates) {
    const input = inputs.get(c.id) ?? { items: [], rows: [], lends: [], routes: [] };
    const summary = summarizeProgress(computeCampaignProgress({ campaign: c, ...input }), input.items);
    if (!finalStretchDue(c, summary.open.count, now)) continue;
    const ends = campaignEndsAt(c);
    if (!ends) continue;
    const needLines = summary.topOpen.slice(0, FINAL_STRETCH.maxNeeds).map((o) => o.line);
    if (needLines.length === 0) continue;
    const campaign: NotifyCampaign = { id: c.id, title: c.title, projectName: c.projectName, applicationId: c.applicationId, userId: c.userId, status: c.status };
    const [followerIds, stewardIds] = await Promise.all([db.getCampaignFollowerUserIds(c.id), stewardIdsOf(campaign)]);
    const candidatesIds = followerIds.filter((id) => !stewardIds.includes(id));
    const offered = await db.accountIdsWithOfferOn(c.id, candidatesIds);
    const recipientIds = candidatesIds.filter((id) => !offered.has(id));
    const built = buildFinalStretch({ campaign, recipientIds, needLines, closesOn: formatCloseDate(ends) });
    if (opts.dryRun) {
      campaigns++;
      notices += built.length;
      continue;
    }
    if (!(await db.claimFinalStretch(c.id))) continue;
    const ok = await deliver(built, { insert: opts.insert });
    if (built.length > 0 && ok === 0) {
      await db.releaseFinalStretch(c.id);
      continue;
    }
    campaigns++;
    notices += ok;
  }
  return { campaigns, notices };
}

/** The daily crowdpool job. Counts only in its log line. */
export async function runCrowdpoolDailyJob(opts: CrowdpoolDailyOptions = {}): Promise<CrowdpoolDailyResult> {
  const now = opts.now ?? new Date();
  const scoped = { ...opts, now };
  const closeDeps = {
    insert: opts.insert,
    sendEmail: opts.sendEmail,
    now: () => now,
    onlyCampaignIds: opts.onlyCampaignIds,
    dryRun: opts.dryRun,
    readSwitch: opts.readSwitch,
    leaseMinutes: opts.leaseMinutes,
  };
  const out: CrowdpoolDailyResult = {
    closed: 0, completed: 0, released: 0, resumed: 0, emailsRetried: 0,
    stewardNudges: 0, stillWaiting: 0, finalStretch: 0, errors: [],
  };

  try {
    const r = await closeDueCampaigns(closeDeps);
    out.closed = r.closed;
    out.completed = r.completed;
    out.released = r.released;
  } catch (e: any) { out.errors.push(`closeDueCampaigns: ${e?.message ?? e}`); }

  try {
    // Finishing an interrupted close is part of closing: it pauses with it.
    if (await crowdpoolSwitchOn(AUTO_CLOSE_SWITCH, opts)) out.resumed = await resumeUnnoticedCloses(closeDeps);
  } catch (e: any) { out.errors.push(`resumeUnnoticedCloses: ${e?.message ?? e}`); }

  try {
    if (!opts.dryRun) {
      const r = await retryPendingCampaignEndEmails({ sendEmail: opts.sendEmail, insert: opts.insert, onlyCampaignIds: opts.onlyCampaignIds });
      out.emailsRetried = r.sent;
    }
  } catch (e: any) { out.errors.push(`retryPendingCampaignEndEmails: ${e?.message ?? e}`); }

  try {
    const r = await runNudges(scoped);
    out.stewardNudges = r.stewardNudges;
    out.stillWaiting = r.stillWaiting;
  } catch (e: any) { out.errors.push(`nudges: ${e?.message ?? e}`); }

  try {
    out.finalStretch = (await runFinalStretch(scoped)).notices;
  } catch (e: any) { out.errors.push(`finalStretch: ${e?.message ?? e}`); }

  console.log(
    `[crowdpool-daily] closed=${out.closed} completed=${out.completed} released=${out.released} resumed=${out.resumed} emails=${out.emailsRetried} nudges=${out.stewardNudges} stillWaiting=${out.stillWaiting} finalStretch=${out.finalStretch}${opts.dryRun ? " dryRun" : ""}${out.errors.length ? ` errors=${out.errors.length}` : ""}`,
  );
  return out;
}
