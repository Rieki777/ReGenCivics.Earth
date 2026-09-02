/**
 * AdminAutomationsPanel: manage standing routines the EA runs on a schedule.
 *
 * v1 routines are read-only digests (briefing / attention) that prepare an
 * update for the CEO on a cadence; nothing mutates on a timer. The admin can
 * add a routine, toggle it, run it now, see its last result, and remove it.
 */
import { trpc } from "@/lib/trpc";
import { Clock, Play, Trash2, Plus, Power, Loader2, CalendarClock } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  briefing_digest: "Briefing digest",
  attention_digest: "Attention digest",
  registry_action: "Action",
};

export function AdminAutomationsPanel() {
  const utils = trpc.useUtils();
  const list = trpc.adminAutomations.list.useQuery(undefined, { staleTime: 60_000 });
  const invalidate = () => utils.adminAutomations.list.invalidate();

  const create = trpc.adminAutomations.create.useMutation({ onSuccess: invalidate });
  const toggle = trpc.adminAutomations.toggle.useMutation({ onSuccess: invalidate });
  const remove = trpc.adminAutomations.remove.useMutation({ onSuccess: invalidate });
  const runNow = trpc.adminAutomations.runNow.useMutation({ onSuccess: invalidate });

  const rows = list.data ?? [];

  return (
    <div className="rounded-2xl border border-[#1a472a]/12 bg-white p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#1a472a]" />
          <h3 className="text-[#1a472a] font-bold text-sm">Standing routines</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => create.mutate({ name: "Daily briefing", type: "briefing_digest", cadence: "daily" })}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1a472a]/20 bg-[#1a472a]/5 hover:bg-[#1a472a]/10 text-[#1a472a] text-xs font-semibold px-3 py-2 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" /> Daily briefing
          </button>
          <button
            type="button"
            onClick={() => create.mutate({ name: "Every-other-day briefing", type: "briefing_digest", cadence: "every_other_day" })}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1a472a]/20 bg-[#1a472a]/5 hover:bg-[#1a472a]/10 text-[#1a472a] text-xs font-semibold px-3 py-2 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" /> Every-other-day briefing
          </button>
          <button
            type="button"
            onClick={() => create.mutate({ name: "Weekly attention digest", type: "attention_digest", cadence: "weekly" })}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1a472a]/20 bg-[#1a472a]/5 hover:bg-[#1a472a]/10 text-[#1a472a] text-xs font-semibold px-3 py-2 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" /> Weekly attention
          </button>
        </div>
      </div>
      <p className="text-[#1a472a]/75 text-xs mb-3">Updates your assistants prepare for you on a schedule. Read-only, never auto-changes data.</p>

      {rows.length === 0 ? (
        <p className="text-[#1a472a] text-sm py-4 text-center">No routines yet. Add one above and it runs on its cadence.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-xl border border-[#1a472a]/10 p-3 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${a.enabled ? "text-[#1a472a]" : "text-[#1a472a]/75"}`}>{a.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[#1a472a]/75 bg-[#1a472a]/5 rounded-full px-2 py-0.5">{TYPE_LABEL[a.type] ?? a.type}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#1a472a]/75"><Clock className="w-3 h-3" />{a.cadence}</span>
                  </div>
                  {a.lastResult && <p className="text-[#1a472a]/75 text-xs mt-1 break-words">{a.lastResult}</p>}
                  {a.lastRunAt && <p className="text-[#1a472a]/75 text-[11px] mt-0.5">Last run {new Date(a.lastRunAt as unknown as string).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" title="Run now" onClick={() => runNow.mutate({ id: a.id })} disabled={runNow.isPending} className="w-9 h-9 rounded-full hover:bg-[#7dd87d]/15 text-[#1a472a] flex items-center justify-center">
                    {runNow.isPending && runNow.variables?.id === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button type="button" title={a.enabled ? "Disable" : "Enable"} onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })} className={`w-9 h-9 rounded-full flex items-center justify-center ${a.enabled ? "text-[#7dd87d] hover:bg-[#7dd87d]/15" : "text-[#1a472a]/75 hover:bg-[#1a472a]/5"}`}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button type="button" title="Remove" onClick={() => remove.mutate({ id: a.id })} className="w-9 h-9 rounded-full hover:bg-red-50 text-red-500/80 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminAutomationsPanel;
