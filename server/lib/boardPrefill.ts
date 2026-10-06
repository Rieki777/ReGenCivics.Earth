/**
 * Fill empty presenter-card fields from the Season 2 application a project
 * is linked to, or from the one application whose name matches exactly.
 * A value already stored on the card is not replaced.
 */
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import {
  applications,
  campaignReadinessTicks,
  campaigns,
  sessionBoardItems,
  sessionBoardProjects,
  type SessionBoardProject,
} from "../../drizzle/schema";
import {
  PREFILL_ITEM_NAME,
  boardProjectNameKey,
  dropPrefillFields,
  formatPrefillFields,
  parsePrefillFields,
  prefillWrites,
  suggestBoardPrefill,
  writtenPrefillFields,
  type BoardPrefill,
  type PrefillField,
} from "@shared/boardPrefill";
import { parseReadyList } from "@shared/sessionBoard";
import { READY_KEYS, bumpVersion, type Db } from "./sessionBoard";

export type AppliedPrefill = {
  projectId: number;
  applicationId: number | null;
  place?: string;
  url?: string;
  phase?: string;
  whereNow?: string;
  ready?: string[];
  pain?: { id: number; text: string };
  prefillFields: PrefillField[];
};

const APP_STATUSES = ["approved", "active"] as const;

async function loadApplication(db: Db, id: number) {
  const [row] = await db
    .select({
      id: applications.id,
      projectName: applications.projectName,
      location: applications.location,
      country: applications.country,
      landStatus: applications.landStatus,
      projectSizeHectares: applications.projectSizeHectares,
      currentPeopleCount: applications.currentPeopleCount,
      currentHouseholdCount: applications.currentHouseholdCount,
      teamSize: applications.teamSize,
      teamDescription: applications.teamDescription,
      regenerativePractices: applications.regenerativePractices,
      websiteUrl: applications.websiteUrl,
      status: applications.status,
      season: applications.season,
    })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return row ?? null;
}

async function matchApplicationId(db: Db, projectName: string): Promise<number | null> {
  const rows = await db
    .select({ id: applications.id, projectName: applications.projectName })
    .from(applications)
    .where(and(eq(applications.season, 2), inArray(applications.status, [...APP_STATUSES])));
  const key = boardProjectNameKey(projectName);
  const hits = rows.filter((row) => boardProjectNameKey(row.projectName) === key);
  return hits.length === 1 ? hits[0].id : null;
}

async function loadCampaign(db: Db, applicationId: number) {
  const rows = await db
    .select({
      id: campaigns.id,
      status: campaigns.status,
      isDemo: campaigns.isDemo,
      updatedAt: campaigns.updatedAt,
      currentPhase: campaigns.currentPhase,
      legalStructure: campaigns.legalStructure,
      landStatus: campaigns.landStatus,
      landSize: campaigns.landSize,
      housingPlans: campaigns.housingPlans,
      foodSystems: campaigns.foodSystems,
      waterSystems: campaigns.waterSystems,
      energySystems: campaigns.energySystems,
      challenges: campaigns.challenges,
      teamSize: campaigns.teamSize,
      teamDescription: campaigns.teamDescription,
      regenerativePractices: campaigns.regenerativePractices,
      websiteUrl: campaigns.websiteUrl,
    })
    .from(campaigns)
    .where(eq(campaigns.applicationId, applicationId))
    .orderBy(desc(campaigns.updatedAt));
  const usable = rows.filter((row) => row.status !== "cancelled" && row.status !== "rejected");
  if (!usable.length) return null;
  const ticks = await db
    .select({ campaignId: campaignReadinessTicks.campaignId, itemKey: campaignReadinessTicks.itemKey })
    .from(campaignReadinessTicks)
    .where(inArray(campaignReadinessTicks.campaignId, usable.map((row) => row.id)));
  const byCampaign = new Map<number, string[]>();
  for (const tick of ticks) {
    const list = byCampaign.get(tick.campaignId) ?? [];
    list.push(tick.itemKey);
    byCampaign.set(tick.campaignId, list);
  }
  const picked = [...usable].sort((a, b) => {
    const score = (byCampaign.get(b.id)?.length ?? 0) - (byCampaign.get(a.id)?.length ?? 0);
    if (score !== 0) return score;
    if (!!a.isDemo !== !!b.isDemo) return a.isDemo ? 1 : -1;
    return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
  })[0];
  return { campaign: picked, ticks: byCampaign.get(picked.id) ?? [] };
}

async function writeIfEmpty(
  db: Db,
  projectId: number,
  column: "place" | "url" | "phase" | "whereNow" | "ready",
  value: string,
): Promise<void> {
  const col = sessionBoardProjects[column];
  await db
    .update(sessionBoardProjects)
    .set({ [column]: value })
    .where(and(
      eq(sessionBoardProjects.id, projectId),
      or(isNull(col), eq(col, "")),
    ));
}

/**
 * Fill this project's empty card fields. Returns what landed, or null when
 * there is no single application to read.
 */
export async function prefillBoardProject(
  db: Db,
  boardId: number,
  project: SessionBoardProject,
  authorKey: string | null,
): Promise<AppliedPrefill | null> {
  const applicationId = project.applicationId ?? await matchApplicationId(db, project.name);
  if (!applicationId) return null;
  const app = await loadApplication(db, applicationId);
  if (!app) return null;
  const linked = await loadCampaign(db, app.id);
  const suggestion = suggestBoardPrefill({
    application: app,
    campaign: linked?.campaign ?? null,
    readinessTicks: linked?.ticks ?? [],
  });
  const [painRow] = await db
    .select({ id: sessionBoardItems.id })
    .from(sessionBoardItems)
    .where(and(
      eq(sessionBoardItems.boardId, boardId),
      eq(sessionBoardItems.projectId, project.id),
      eq(sessionBoardItems.kind, "pain"),
    ))
    .limit(1);
  const writes = prefillWrites(
    {
      place: project.place,
      url: project.url,
      phase: project.phase,
      whereNow: project.whereNow,
      ready: parseReadyList(project.ready, READY_KEYS),
      painCount: painRow ? 1 : 0,
    },
    suggestion,
  );

  if (writes.place) await writeIfEmpty(db, project.id, "place", writes.place);
  if (writes.url) await writeIfEmpty(db, project.id, "url", writes.url);
  if (writes.phase) await writeIfEmpty(db, project.id, "phase", writes.phase);
  if (writes.whereNow) await writeIfEmpty(db, project.id, "whereNow", writes.whereNow);
  if (writes.ready) await writeIfEmpty(db, project.id, "ready", writes.ready.join(","));

  let pain: AppliedPrefill["pain"];
  if (writes.pain) {
    const [again] = await db
      .select({ id: sessionBoardItems.id })
      .from(sessionBoardItems)
      .where(and(
        eq(sessionBoardItems.boardId, boardId),
        eq(sessionBoardItems.projectId, project.id),
        eq(sessionBoardItems.kind, "pain"),
      ))
      .limit(1);
    if (!again) {
      const [res] = await db.insert(sessionBoardItems).values({
        boardId,
        kind: "pain",
        text: writes.pain,
        projectId: project.id,
        authorKey: project.authorKey || authorKey,
        displayName: PREFILL_ITEM_NAME,
      });
      const id = Number((res as { insertId?: number }).insertId ?? 0);
      if (id) pain = { id, text: writes.pain };
    }
  }

  const [after] = await db
    .select()
    .from(sessionBoardProjects)
    .where(eq(sessionBoardProjects.id, project.id))
    .limit(1);
  if (!after) return null;

  const landed: BoardPrefill = {};
  if (writes.place && after.place === writes.place) landed.place = writes.place;
  if (writes.url && after.url === writes.url) landed.url = writes.url;
  if (writes.phase && after.phase === writes.phase) landed.phase = writes.phase;
  if (writes.whereNow && after.whereNow === writes.whereNow) landed.whereNow = writes.whereNow;
  if (writes.ready && after.ready === writes.ready.join(",")) landed.ready = writes.ready;
  if (pain) landed.pain = pain.text;

  const marks = writtenPrefillFields(landed);
  const prefillFields = parsePrefillFields(formatPrefillFields([...parsePrefillFields(after.prefillFields), ...marks]));
  const linkChanged = project.applicationId == null && applicationId != null;
  const fieldsChanged = marks.length > 0 || linkChanged || formatPrefillFields(prefillFields) !== (after.prefillFields ?? null);
  if (fieldsChanged) {
    await db
      .update(sessionBoardProjects)
      .set({
        prefillFields: formatPrefillFields(prefillFields),
        ...(linkChanged ? { applicationId } : {}),
      })
      .where(eq(sessionBoardProjects.id, project.id));
    await bumpVersion(db, boardId);
  }
  if (!fieldsChanged && !pain) return null;

  const applied: AppliedPrefill = {
    projectId: project.id,
    applicationId,
    prefillFields,
  };
  if (landed.place) applied.place = landed.place;
  if (landed.url) applied.url = landed.url;
  if (landed.phase) applied.phase = landed.phase;
  if (landed.whereNow) applied.whereNow = landed.whereNow;
  if (landed.ready) applied.ready = landed.ready;
  if (pain) applied.pain = pain;
  return applied;
}

export async function clearPrefillOnItem(db: Db, item: { displayName: string | null; projectId: number | null; kind: string }) {
  if (item.kind !== "pain" || item.displayName !== PREFILL_ITEM_NAME || item.projectId == null) return;
  const [project] = await db
    .select({ id: sessionBoardProjects.id, prefillFields: sessionBoardProjects.prefillFields })
    .from(sessionBoardProjects)
    .where(eq(sessionBoardProjects.id, item.projectId))
    .limit(1);
  if (!project?.prefillFields) return;
  const next = dropPrefillFields(project.prefillFields, ["pain"]);
  if (next === project.prefillFields) return;
  await db.update(sessionBoardProjects).set({ prefillFields: next }).where(eq(sessionBoardProjects.id, project.id));
}
