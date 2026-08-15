/**
 * GitHub webhook receiver for the Bounty Engine.
 *
 * Handles three event types:
 *   pull_request        — qualifying merge → match bounty → pay or hold
 *   pull_request_review — track non-author approvals in memory
 *   check_suite         — track CI pass/fail by commit SHA in memory
 *   (all other events)  — return 200 immediately so GitHub marks delivery OK
 *
 * Register in Repo Settings > Webhooks. Subscribe to:
 *   Pull requests, Pull request reviews, Check suites.
 * Set GITHUB_WEBHOOK_SECRET in Railway to match the webhook secret there.
 *
 * Auto-pay gates (both must pass for auto-pay; otherwise role is held):
 *   4. CI checks on the PR head commit passed (check_suite conclusion=success).
 *   5. At least one approving review from someone other than the PR author.
 *
 * Gates are enforced here, not by branch protection. Branch protection is
 * intentionally non-disruptive: require a PR, required approvals = 0,
 * status checks only if CI exists, admin bypass on.
 *
 * In-memory state (prNonAuthorApprovals, commitCiState) is lost on process
 * restart. Conservative fallback: hold instead of auto-pay. Maintainers
 * release held roles via consentAndPay in the Admin tab.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  bounties,
  bountyRoles,
  bountyEvents,
  webhookDeliveries,
  playerProfiles,
} from "../../drizzle/schema";
import { payRole } from "../db/bounties";
import { ENV } from "../_core/env";

// Read through ENV (single validated config surface), not process.env.
const GITHUB_WEBHOOK_SECRET = ENV.githubWebhookSecret;

// ── In-memory gate state ──────────────────────────────────────────────────────
// Lost on process restart — conservative fallback is hold, not auto-pay.
// Key for prNonAuthorApprovals: "${repoFullName}/${prNumber}"
// Key for commitCiState: "${sha}"
const prNonAuthorApprovals = new Map<string, { logins: Set<string>; ts: number }>();
const commitCiState = new Map<string, { passed: boolean; ts: number }>();
const STATE_TTL_MS = 48 * 60 * 60 * 1000;

function pruneStaleState() {
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [k, v] of prNonAuthorApprovals) {
    if (v.ts < cutoff) prNonAuthorApprovals.delete(k);
  }
  for (const [k, v] of commitCiState) {
    if (v.ts < cutoff) commitCiState.delete(k);
  }
}

// ── Payload types ─────────────────────────────────────────────────────────────

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    merged: boolean;
    base: { ref: string; repo: { default_branch: string; full_name: string } };
    head: { sha: string };
    user: { id: number; login: string };
    labels: Array<{ name: string }>;
  };
  repository: {
    full_name: string;
    default_branch: string;
  };
}

interface PullRequestReviewPayload {
  action: string;
  review: {
    state: string; // "approved" | "changes_requested" | "commented" | "dismissed"
    user: { login: string; id: number };
  };
  pull_request: {
    number: number;
    user: { login: string; id: number };
  };
  repository: { full_name: string };
}

interface CheckSuitePayload {
  action: string; // "completed" | "requested" | "rerequested"
  check_suite: {
    head_sha: string;
    conclusion: string | null; // "success" | "failure" | "neutral" | "cancelled" | ...
  };
  repository: { full_name: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyGithubSignature(rawBody: Buffer | string, sigHeader: string | undefined): boolean {
  if (!GITHUB_WEBHOOK_SECRET || !sigHeader) return false;
  const computed = `sha256=${crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigHeader));
  } catch {
    return false;
  }
}

async function logEvent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  bountyId: number,
  event: string,
  opts: { roleId?: number | null; actorUserId?: number | null; detail?: unknown } = {},
) {
  await db.insert(bountyEvents).values({
    bountyId,
    roleId: opts.roleId ?? null,
    actorUserId: opts.actorUserId ?? null,
    event,
    detail: opts.detail as Record<string, unknown> | null ?? null,
  });
}

/**
 * Extract a bounty ID from the PR body or labels.
 * Matching order: `Bounty: #<id>` -> `Closes #<issue>` -> `bounty-<id>` label.
 */
function extractBountyRef(body: string | null, labels: Array<{ name: string }>): {
  type: "id" | "issue" | "label";
  value: number;
} | null {
  if (body) {
    const direct = body.match(/Bounty:\s*#(\d+)/i);
    if (direct) return { type: "id", value: parseInt(direct[1], 10) };
    const closes = body.match(/(?:Closes|Fixes|Resolves)\s+#(\d+)/i);
    if (closes) return { type: "issue", value: parseInt(closes[1], 10) };
  }
  for (const label of labels) {
    const m = label.name.match(/^bounty-(\d+)$/i);
    if (m) return { type: "label", value: parseInt(m[1], 10) };
  }
  return null;
}

async function findBountyByRef(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ref: { type: "id" | "issue" | "label"; value: number },
  repo: string,
): Promise<typeof bounties.$inferSelect | null> {
  if (ref.type === "id" || ref.type === "label") {
    const [row] = await db.select().from(bounties).where(eq(bounties.id, ref.value)).limit(1);
    return row ?? null;
  }
  const [row] = await db
    .select()
    .from(bounties)
    .where(and(eq(bounties.githubIssueNumber, ref.value), eq(bounties.githubRepo, repo)))
    .limit(1);
  return row ?? null;
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerGithubWebhookRoutes(app: Express) {
  app.post(
    "/api/webhooks/github",
    async (req: Request, res: Response) => {
      const deliveryId = req.headers["x-github-delivery"] as string | undefined;
      const sigHeader = req.headers["x-hub-signature-256"] as string | undefined;
      const event = req.headers["x-github-event"] as string | undefined;
      // The global express.json({ verify }) in server/_core/index.ts already
      // consumed the stream and captured the raw string as req.rawBody. Verify
      // the HMAC over those exact bytes. A route-level express.raw() here would
      // no-op (body already parsed) and leave req.body a parsed object, which
      // makes createHmac().update(object) throw and hang the request.
      const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);

      // ── 1. Verify HMAC signature (all event types) ────────────────────────
      // verifyGithubSignature returns false when the secret is unset, so an
      // unset secret fails closed via the invalid-signature path below.
      if (!verifyGithubSignature(rawBody, sigHeader)) {
        console.warn("[GitHub webhook] Invalid signature — rejected");
        res.status(401).json({ error: "invalid_signature" });
        return;
      }

      // ── 2a. Handle pull_request_review: track non-author approvals ────────
      if (event === "pull_request_review") {
        try {
          const rv = JSON.parse(rawBody) as PullRequestReviewPayload;
          if (rv.action === "submitted" && rv.review.state === "approved") {
            const reviewerLogin = rv.review.user.login;
            const authorLogin = rv.pull_request.user.login;
            if (reviewerLogin !== authorLogin) {
              const key = `${rv.repository.full_name}/${rv.pull_request.number}`;
              const existing = prNonAuthorApprovals.get(key);
              if (existing) {
                existing.logins.add(reviewerLogin);
                existing.ts = Date.now();
              } else {
                prNonAuthorApprovals.set(key, { logins: new Set([reviewerLogin]), ts: Date.now() });
              }
              console.log(`[GitHub webhook] Approval tracked: ${key} by ${reviewerLogin}`);
            }
          }
        } catch {
          // parse error on review event: still return 200 so GitHub doesn't retry
        }
        res.status(200).json({ ok: true, handled: "pull_request_review" });
        return;
      }

      // ── 2b. Handle check_suite: track CI conclusion by commit SHA ─────────
      if (event === "check_suite") {
        try {
          const cs = JSON.parse(rawBody) as CheckSuitePayload;
          if (cs.action === "completed" && cs.check_suite.head_sha) {
            const sha = cs.check_suite.head_sha;
            const passed =
              cs.check_suite.conclusion === "success" ||
              cs.check_suite.conclusion === "neutral" ||
              cs.check_suite.conclusion === "skipped";
            const existing = commitCiState.get(sha);
            // Don't downgrade a passing state (multiple check suites can run on one SHA)
            if (!existing?.passed || passed) {
              commitCiState.set(sha, { passed, ts: Date.now() });
            }
            console.log(`[GitHub webhook] CI state: ${sha.slice(0, 8)} → ${cs.check_suite.conclusion}`);
          }
        } catch {
          // parse error: still return 200
        }
        res.status(200).json({ ok: true, handled: "check_suite" });
        return;
      }

      // ── 2c. All other non-pull_request events ─────────────────────────────
      if (event !== "pull_request") {
        res.status(200).json({ ok: true, skipped: "unhandled_event", event });
        return;
      }

      // ── pull_request event ────────────────────────────────────────────────
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "db_unavailable" });
        return;
      }

      // ── 3. Idempotency: drop duplicate deliveries ─────────────────────────
      if (deliveryId) {
        const [existing] = await db
          .select({ deliveryId: webhookDeliveries.deliveryId })
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.deliveryId, deliveryId))
          .limit(1);
        if (existing) {
          res.status(200).json({ ok: true, skipped: "duplicate_delivery" });
          return;
        }
        await db.insert(webhookDeliveries).values({ deliveryId, receivedAt: new Date() });
      }

      let payload: PullRequestPayload;
      try {
        payload = JSON.parse(rawBody) as PullRequestPayload;
      } catch {
        res.status(400).json({ error: "invalid_json" });
        return;
      }

      // ── 4. Only act on merge into default branch ──────────────────────────
      const pr = payload.pull_request;
      const defaultBranch = payload.repository.default_branch;
      if (payload.action !== "closed" || !pr.merged || pr.base.ref !== defaultBranch) {
        res.status(200).json({ ok: true, skipped: "not_a_qualifying_merge" });
        return;
      }

      const repo = payload.repository.full_name;
      const prNumber = pr.number;

      // ── 5. Read gate state (non-author approval + CI) ─────────────────────
      // Both tracked across prior webhook events; conservative default is hold.
      pruneStaleState();
      const prKey = `${repo}/${prNumber}`;
      const hasNonAuthorApproval = (prNonAuthorApprovals.get(prKey)?.logins.size ?? 0) > 0;
      const ciCheck = commitCiState.get(pr.head.sha);
      const ciGreen = ciCheck?.passed ?? false;
      const autoPayAllowed = hasNonAuthorApproval && ciGreen;

      // ── Match PR to bounty ────────────────────────────────────────────────
      const ref = extractBountyRef(pr.body, pr.labels);
      if (!ref) {
        console.warn(`[GitHub webhook] Unmatched merge: ${repo}#${prNumber} — no bounty reference found`);
        res.status(200).json({ ok: true, status: "unmatched_merge", prNumber, repo });
        return;
      }

      const bounty = await findBountyByRef(db, ref, repo);
      if (!bounty) {
        console.warn(`[GitHub webhook] Bounty not found for ref ${JSON.stringify(ref)} in ${repo}#${prNumber}`);
        res.status(200).json({ ok: true, status: "bounty_not_found", ref, prNumber });
        return;
      }

      // ── Match PR author to a player profile ───────────────────────────────
      const prAuthorGithubId = pr.user.id;
      const [shipperProfile] = await db
        .select({ userId: playerProfiles.userId })
        .from(playerProfiles)
        .where(eq(playerProfiles.githubId, prAuthorGithubId))
        .limit(1);

      if (!shipperProfile?.userId) {
        console.warn(`[GitHub webhook] GitHub user ${pr.user.login} (id=${prAuthorGithubId}) has no linked profile`);
        await logEvent(db, bounty.id, "merged", {
          detail: { status: "no_profile", githubLogin: pr.user.login, prNumber, repo },
        });
        res.status(200).json({ ok: true, status: "no_linked_profile", githubLogin: pr.user.login });
        return;
      }

      // ── Update bounty merged PR list ──────────────────────────────────────
      const existingPrs = (bounty.mergedPrNumbers as number[] | null) ?? [];
      await db.update(bounties).set({
        workStatus: "completed",
        mergedPrNumbers: [...new Set([...existingPrs, prNumber])],
      }).where(eq(bounties.id, bounty.id));

      await logEvent(db, bounty.id, "merged", {
        detail: { prNumber, repo, githubLogin: pr.user.login, sha: pr.head.sha, hasNonAuthorApproval, ciGreen },
      });

      // ── Set shipper role payStatus and pay or hold ────────────────────────
      const [shipperRole] = await db
        .select()
        .from(bountyRoles)
        .where(and(eq(bountyRoles.bountyId, bounty.id), eq(bountyRoles.role, "shipper")))
        .limit(1);

      if (shipperRole) {
        const shipPayStatus = autoPayAllowed ? "payable" : "held";
        await db.update(bountyRoles).set({
          userId: shipperProfile.userId,
          payStatus: shipPayStatus,
          filledByLog: [
            ...(shipperRole.filledByLog as unknown[] ?? []),
            { userId: shipperProfile.userId, action: "webhook_merge", prNumber, at: new Date().toISOString() },
          ],
        }).where(eq(bountyRoles.id, shipperRole.id));

        if (autoPayAllowed) {
          const shipResult = await payRole(shipperRole.id);
          if (!shipResult.ok) {
            console.warn(`[GitHub webhook] payRole(shipper) for bounty ${bounty.id} held: ${shipResult.reason}`);
          }
        } else {
          await logEvent(db, bounty.id, "held", {
            roleId: shipperRole.id,
            detail: { reason: "pending_review_or_ci", hasNonAuthorApproval, ciGreen },
          });
        }
      }

      // ── Set proposer role payStatus and pay or hold ───────────────────────
      const [proposerRole] = await db
        .select()
        .from(bountyRoles)
        .where(and(eq(bountyRoles.bountyId, bounty.id), eq(bountyRoles.role, "proposer")))
        .limit(1);

      if (proposerRole?.userId) {
        const propPayStatus = autoPayAllowed ? "payable" : "held";
        await db.update(bountyRoles)
          .set({ payStatus: propPayStatus })
          .where(and(eq(bountyRoles.id, proposerRole.id), eq(bountyRoles.payStatus, "filled")));

        if (autoPayAllowed) {
          const propResult = await payRole(proposerRole.id);
          if (!propResult.ok) {
            console.warn(`[GitHub webhook] payRole(proposer) for bounty ${bounty.id} held: ${propResult.reason}`);
          }
        } else {
          await logEvent(db, bounty.id, "held", {
            roleId: proposerRole.id,
            detail: { reason: "pending_review_or_ci", hasNonAuthorApproval, ciGreen },
          });
        }
      }

      res.status(200).json({
        ok: true,
        bountyId: bounty.id,
        prNumber,
        repo,
        autoPayAllowed,
        hasNonAuthorApproval,
        ciGreen,
      });
    },
  );

  // ── Revert detection stub ─────────────────────────────────────────────────
  // Reverts within the settlement hold window can be handled manually via
  // reverseRole in the Admin tab. Best-effort automated detection is a future
  // improvement; this stub exists to keep the route registered.
  app.post(
    "/api/webhooks/github/revert-check",
    (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    },
  );
}
