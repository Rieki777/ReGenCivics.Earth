/**
 * Live-session runbook on Admin Events cards while a session is on air.
 * Lightweight owners + handoff notes — mirrors AfterSessionChecklist tone.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  LIVE_SESSION_ROLE_HINTS,
  LIVE_SESSION_ROLE_LABELS,
  LIVE_SESSION_ROLES,
  liveSessionRunbookProgress,
  type LiveSessionChecklistItem,
  type LiveSessionRoleId,
} from "@shared/liveSessionRunbook";

type DraftRow = {
  owner: string;
  roleSlug: string;
  handoffNotes: string;
};

function draftsFromItems(items: LiveSessionChecklistItem[]): Record<LiveSessionRoleId, DraftRow> {
  const out = {} as Record<LiveSessionRoleId, DraftRow>;
  for (const id of LIVE_SESSION_ROLES) {
    const row = items.find((i) => i.id === id);
    out[id] = {
      owner: row?.owner ?? "",
      roleSlug: row?.roleSlug ?? "",
      handoffNotes: row?.handoffNotes ?? "",
    };
  }
  return out;
}

export function LiveSessionRunbook({
  eventId,
  eventTitle,
}: {
  eventId: number;
  eventTitle?: string | null;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.liveSessionRunbook.useQuery(
    { eventId },
    { staleTime: 30_000 },
  );
  const saveMutation = trpc.admin.setLiveSessionRunbookRole.useMutation({
    onSuccess: async () => {
      await utils.admin.liveSessionRunbook.invalidate({ eventId });
      await utils.admin.operatorPulse.invalidate();
    },
  });

  const items = data?.items ?? [];
  const [drafts, setDrafts] = useState<Record<LiveSessionRoleId, DraftRow>>(() =>
    draftsFromItems([]),
  );
  const [savingRole, setSavingRole] = useState<LiveSessionRoleId | null>(null);

  useEffect(() => {
    if (data?.items) setDrafts(draftsFromItems(data.items));
  }, [data?.items]);

  const progress = useMemo(() => liveSessionRunbookProgress(items), [items]);

  const saveRole = useCallback(
    async (roleId: LiveSessionRoleId) => {
      const d = drafts[roleId];
      setSavingRole(roleId);
      try {
        await saveMutation.mutateAsync({
          eventId,
          roleId,
          owner: d.owner.trim() || null,
          roleSlug: d.roleSlug.trim() || null,
          handoffNotes: d.handoffNotes.trim() || null,
        });
        toast.success(`${LIVE_SESSION_ROLE_LABELS[roleId]} saved`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save runbook role");
      } finally {
        setSavingRole(null);
      }
    },
    [drafts, eventId, saveMutation],
  );

  if (isLoading && !data) {
    return (
      <div
        className="border-t border-white/10 px-4 py-3 animate-pulse"
        data-testid="admin-live-session-runbook-loading"
      >
        <div className="h-4 w-48 bg-white/10 rounded mb-2" />
        <div className="h-16 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className="border-t border-[#7dd87d]/25 bg-[#7dd87d]/[0.04] px-4 py-3 space-y-3"
      data-testid="admin-live-session-runbook"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-[#7dd87d]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9de89d]">
          Live session runbook
        </p>
        <span className="text-[11px] text-white/55 tabular-nums">
          {progress.assigned}/{progress.total} owners
        </span>
        {progress.complete ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        ) : (
          <span className="text-[11px] text-amber-200/90">
            {progress.unassigned} role{progress.unassigned === 1 ? "" : "s"} need an owner
          </span>
        )}
        {eventTitle ? (
          <span className="text-[11px] text-white/40 truncate ml-auto max-w-[40%]" title={eventTitle}>
            {eventTitle}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] text-white/55 leading-relaxed">
        Assign host / tech / chat / recording / outreach handoff while the room is live. Notes
        carry into closeout — nothing auto-sends.
      </p>

      <ul className="space-y-2.5">
        {LIVE_SESSION_ROLES.map((roleId) => {
          const d = drafts[roleId];
          const assigned = Boolean(d.owner.trim() || d.roleSlug.trim());
          return (
            <li
              key={roleId}
              className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
              data-testid={`admin-live-runbook-role-${roleId}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Users className="w-3.5 h-3.5 text-white/50" />
                <span className="text-sm font-semibold text-white">
                  {LIVE_SESSION_ROLE_LABELS[roleId]}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${
                    assigned
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-200 border-amber-500/30"
                  }`}
                >
                  {assigned ? "Assigned" : "Needs owner"}
                </span>
                <span className="text-[11px] text-white/45">{LIVE_SESSION_ROLE_HINTS[roleId]}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/50 uppercase tracking-wide">Owner</label>
                  <Input
                    value={d.owner}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [roleId]: { ...prev[roleId], owner: e.target.value },
                      }))
                    }
                    placeholder="Name or handle"
                    className="mt-0.5 h-8 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm"
                    data-testid={`admin-live-runbook-owner-${roleId}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 uppercase tracking-wide">
                    Role seat (optional)
                  </label>
                  <Input
                    value={d.roleSlug}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [roleId]: { ...prev[roleId], roleSlug: e.target.value },
                      }))
                    }
                    placeholder="roleHolders slug"
                    className="mt-0.5 h-8 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm font-mono"
                    data-testid={`admin-live-runbook-slug-${roleId}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-wide">
                  Handoff notes
                </label>
                <Textarea
                  value={d.handoffNotes}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [roleId]: { ...prev[roleId], handoffNotes: e.target.value },
                    }))
                  }
                  rows={2}
                  placeholder="What the next person needs to know"
                  className="mt-0.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm resize-none"
                  data-testid={`admin-live-runbook-notes-${roleId}`}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={savingRole === roleId || saveMutation.isPending}
                  onClick={() => void saveRole(roleId)}
                  className="h-7 px-2 text-xs text-[#9de89d] hover:text-white hover:bg-[#7dd87d]/15"
                  data-testid={`admin-live-runbook-save-${roleId}`}
                >
                  {savingRole === roleId ? "Saving…" : "Save"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default LiveSessionRunbook;
