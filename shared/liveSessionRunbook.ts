/**
 * Live-session runbook — lightweight role checklist for Admin Events
 * while a session is on the air. Owners + handoff notes only; no heavy product.
 * Persists in site_settings JSON bag (no migration), same pattern as recording closeout.
 */

export const LIVE_SESSION_RUNBOOK_SETTING_KEY = "live_session_runbook.v1";

export const LIVE_SESSION_ROLES = [
  "host",
  "tech",
  "chat",
  "recording",
  "outreach_handoff",
] as const;

export type LiveSessionRoleId = (typeof LIVE_SESSION_ROLES)[number];

export const LIVE_SESSION_ROLE_LABELS: Record<LiveSessionRoleId, string> = {
  host: "Host",
  tech: "Tech",
  chat: "Chat",
  recording: "Recording",
  outreach_handoff: "Outreach handoff",
};

export const LIVE_SESSION_ROLE_HINTS: Record<LiveSessionRoleId, string> = {
  host: "Facilitates the room and holds the arc",
  tech: "Stream / AV",
  chat: "Moderates chat and Q&A",
  recording: "Confirms capture + raw land",
  outreach_handoff: "Who picks up post-session outreach",
};

export type LiveSessionRoleAssignment = {
  /** Free-text owner name or handle. */
  owner: string | null;
  /** Optional roleHolders.roleSlug when owner is a seat. */
  roleSlug: string | null;
  /** Short handoff note for the next person. */
  handoffNotes: string | null;
};

export type LiveSessionRunbookMeta = {
  roles: Partial<Record<LiveSessionRoleId, LiveSessionRoleAssignment>>;
  updatedAt?: string | null;
};

export type LiveSessionRunbookBag = Record<string, LiveSessionRunbookMeta>;

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean((value ?? "").trim());
}

export function emptyRoleAssignment(): LiveSessionRoleAssignment {
  return { owner: null, roleSlug: null, handoffNotes: null };
}

export function isLiveSessionRoleId(value: unknown): value is LiveSessionRoleId {
  return (
    typeof value === "string" &&
    (LIVE_SESSION_ROLES as readonly string[]).includes(value)
  );
}

/** Parse site_settings JSON; corrupt/empty → {}. */
export function parseLiveSessionRunbookBag(
  raw: string | null | undefined,
): LiveSessionRunbookBag {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: LiveSessionRunbookBag = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+$/.test(key)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const v = value as Record<string, unknown>;
      const rolesRaw =
        v.roles && typeof v.roles === "object" && !Array.isArray(v.roles)
          ? (v.roles as Record<string, unknown>)
          : {};
      const roles: LiveSessionRunbookMeta["roles"] = {};
      for (const roleId of LIVE_SESSION_ROLES) {
        const r = rolesRaw[roleId];
        if (!r || typeof r !== "object" || Array.isArray(r)) continue;
        const row = r as Record<string, unknown>;
        roles[roleId] = {
          owner: typeof row.owner === "string" ? row.owner : row.owner === null ? null : null,
          roleSlug:
            typeof row.roleSlug === "string"
              ? row.roleSlug
              : row.roleSlug === null
                ? null
                : null,
          handoffNotes:
            typeof row.handoffNotes === "string"
              ? row.handoffNotes
              : row.handoffNotes === null
                ? null
                : null,
        };
      }
      out[key] = {
        roles,
        updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeLiveSessionRunbookBag(bag: LiveSessionRunbookBag): string {
  return JSON.stringify(bag);
}

export function normalizeRoleAssignment(
  patch: Partial<LiveSessionRoleAssignment> | null | undefined,
): LiveSessionRoleAssignment {
  const base = emptyRoleAssignment();
  if (!patch) return base;
  return {
    owner: nonEmpty(patch.owner) ? String(patch.owner).trim() : null,
    roleSlug: nonEmpty(patch.roleSlug) ? String(patch.roleSlug).trim() : null,
    handoffNotes: nonEmpty(patch.handoffNotes)
      ? String(patch.handoffNotes).trim()
      : null,
  };
}

export function applyLiveSessionRunbookPatch(
  bag: LiveSessionRunbookBag,
  eventId: number,
  rolePatches: Partial<Record<LiveSessionRoleId, Partial<LiveSessionRoleAssignment>>>,
  updatedAt: string = new Date().toISOString(),
): LiveSessionRunbookBag {
  const key = String(eventId);
  const prev = bag[key] ?? { roles: {}, updatedAt: null };
  const nextRoles: LiveSessionRunbookMeta["roles"] = { ...prev.roles };
  for (const roleId of LIVE_SESSION_ROLES) {
    if (!(roleId in rolePatches)) continue;
    const existing = nextRoles[roleId] ?? emptyRoleAssignment();
    nextRoles[roleId] = normalizeRoleAssignment({
      ...existing,
      ...rolePatches[roleId],
    });
  }
  return {
    ...bag,
    [key]: { roles: nextRoles, updatedAt },
  };
}

export type LiveSessionChecklistItem = {
  id: LiveSessionRoleId;
  label: string;
  hint: string;
  owner: string | null;
  roleSlug: string | null;
  handoffNotes: string | null;
  assigned: boolean;
};

export function buildLiveSessionChecklist(
  meta: LiveSessionRunbookMeta | null | undefined,
): LiveSessionChecklistItem[] {
  return LIVE_SESSION_ROLES.map((id) => {
    const row = meta?.roles?.[id];
    const owner = nonEmpty(row?.owner) ? String(row!.owner).trim() : null;
    const roleSlug = nonEmpty(row?.roleSlug) ? String(row!.roleSlug).trim() : null;
    const handoffNotes = nonEmpty(row?.handoffNotes)
      ? String(row!.handoffNotes).trim()
      : null;
    return {
      id,
      label: LIVE_SESSION_ROLE_LABELS[id],
      hint: LIVE_SESSION_ROLE_HINTS[id],
      owner,
      roleSlug,
      handoffNotes,
      assigned: Boolean(owner || roleSlug),
    };
  });
}

export function liveSessionRunbookProgress(items: LiveSessionChecklistItem[]): {
  assigned: number;
  total: number;
  unassigned: number;
  complete: boolean;
} {
  const assigned = items.filter((i) => i.assigned).length;
  const total = items.length;
  return {
    assigned,
    total,
    unassigned: total - assigned,
    complete: assigned === total && total > 0,
  };
}

/** True when a live session still needs at least one owner assigned. */
export function liveSessionRunbookNeedsOwners(
  meta: LiveSessionRunbookMeta | null | undefined,
): boolean {
  const items = buildLiveSessionChecklist(meta);
  return liveSessionRunbookProgress(items).unassigned > 0;
}

export function liveSessionRunbookHref(eventId?: number | null): string {
  if (eventId != null && eventId > 0) {
    return `/admin?tab=events&filter=upcoming&open=${eventId}`;
  }
  return "/admin?tab=events&filter=upcoming";
}
