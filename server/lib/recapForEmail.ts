/**
 * Read the digest for one recording at send time.
 * A missing table or a failed read leaves the letter with whatever
 * summary the caller already has. This path never writes.
 */
import { and, eq, inArray } from "drizzle-orm";
import { bounties, callInsights, recordings } from "../../drizzle/schema";
import {
  gistBullets,
  insightItems,
  nextSteps,
  type RecapItem,
} from "../../shared/recapDigest";
import { logger } from "../_core/logger";
import { getDb } from "../db";

const log = logger("recap-email");

const OPEN_TASK = ["proposed", "accepted", "open"] as const;

export type RecapDigest = {
  gist: string[];
  insights: RecapItem[];
  steps: RecapItem[];
};

export async function loadRecapDigest(input: {
  recordingId: number;
  summary?: string | null;
  videoId?: string | null;
  weekBoardHref?: string | null;
  origin: string;
  actionItems?: unknown;
}): Promise<RecapDigest> {
  let summary = (input.summary ?? "").trim();
  let actionItems = input.actionItems;
  const empty: RecapDigest = {
    gist: gistBullets(summary),
    insights: [],
    steps: nextSteps({
      actionItems,
      weekBoardHref: input.weekBoardHref,
      origin: input.origin,
    }),
  };

  const db = await getDb();
  if (!db) return empty;

  try {
    if (!summary || actionItems == null) {
      const [row] = await db
        .select({
          aiSummary: recordings.aiSummary,
          overview: recordings.overview,
          actionItemsJson: recordings.actionItemsJson,
        })
        .from(recordings)
        .where(eq(recordings.id, input.recordingId))
        .limit(1);
      if (!summary) summary = (row?.aiSummary || row?.overview || "").trim();
      if (actionItems == null) actionItems = row?.actionItemsJson ?? null;
    }

    const insightRows = await db
      .select({
        kind: callInsights.kind,
        content: callInsights.content,
        speaker: callInsights.speaker,
        timestampSecs: callInsights.timestampSecs,
        status: callInsights.status,
      })
      .from(callInsights)
      .where(eq(callInsights.recordingId, input.recordingId));

    const taskRows = await db
      .select({
        id: bounties.id,
        title: bounties.title,
        workStatus: bounties.workStatus,
      })
      .from(bounties)
      .where(and(
        eq(bounties.recordingId, input.recordingId),
        eq(bounties.sourceType, "call_task"),
        inArray(bounties.workStatus, [...OPEN_TASK]),
      ));

    return {
      gist: gistBullets(summary),
      insights: insightItems(insightRows, input.videoId ?? null),
      steps: nextSteps({
        tasks: taskRows,
        actionItems,
        weekBoardHref: input.weekBoardHref,
        origin: input.origin,
      }),
    };
  } catch (err) {
    log.warn("recap digest read failed", {
      recordingId: input.recordingId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return {
      gist: gistBullets(summary),
      insights: [],
      steps: nextSteps({ actionItems, weekBoardHref: input.weekBoardHref, origin: input.origin }),
    };
  }
}
