/**
 * Call intelligence at /admin/calls (Stage 7).
 *
 * The ops view over community-call insights: per-call decisions, commitments,
 * role changes, and strategic moves as SUGGESTIONS with accept/dismiss (never
 * auto-tasks), plus the wisdom and ideas the call seeded. An open-suggestions
 * strip up top shows what awaits judgment, oldest first, so commitments
 * cannot quietly go stale.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Phone, Check, X, ExternalLink,
  Lightbulb, Sparkles, Gavel, HandHeart, UserCog, Compass,
} from "lucide-react";

const KIND_META: Record<string, { label: string; icon: typeof Lightbulb; tone: string }> = {
  wisdom: { label: "Wisdom", icon: Lightbulb, tone: "bg-[#7dd87d]/15 text-[#1a472a]" },
  idea: { label: "Idea", icon: Sparkles, tone: "bg-[#7dd87d]/15 text-[#1a472a]" },
  decision: { label: "Decision", icon: Gavel, tone: "bg-blue-50 text-blue-900" },
  commitment: { label: "Commitment", icon: HandHeart, tone: "bg-amber-50 text-amber-900" },
  role_change: { label: "Role", icon: UserCog, tone: "bg-purple-50 text-purple-900" },
  strategic_move: { label: "Strategy", icon: Compass, tone: "bg-rose-50 text-rose-900" },
};

const OPS_KINDS = new Set(["decision", "commitment", "role_change", "strategic_move"]);

function timeAgo(date: string | Date | null): string {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function timestampLabel(secs: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return ` @ ${m}:${String(s).padStart(2, "0")}`;
}

function InsightRow({ insight, onChanged }: {
  insight: { id: number; kind: string; content: string; speaker: string | null; timestampSecs: number | null; status: string; createdAt: string | Date };
  onChanged: () => void;
}) {
  const setStatus = trpc.callIntelligence.setStatus.useMutation();
  const meta = KIND_META[insight.kind] ?? KIND_META.idea;
  const Icon = meta.icon;
  const isOps = OPS_KINDS.has(insight.kind);

  return (
    <div className={`rounded-xl px-3 py-2 ${meta.tone} ${insight.status === "dismissed" ? "opacity-45" : ""}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">{insight.content}</p>
          <p className="text-[10px] opacity-70 mt-0.5">
            {meta.label}{insight.speaker ? ` · ${insight.speaker}` : ""}{timestampLabel(insight.timestampSecs)}
            {insight.status !== "suggested" && ` · ${insight.status}`}
          </p>
        </div>
        {isOps && insight.status === "suggested" && (
          <span className="flex gap-1 flex-shrink-0">
            <button title="Accept" className="p-1 rounded hover:bg-white/60" disabled={setStatus.isPending}
              onClick={async () => { await setStatus.mutateAsync({ insightId: insight.id, status: "accepted" }); onChanged(); }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button title="Dismiss" className="p-1 rounded hover:bg-white/60" disabled={setStatus.isPending}
              onClick={async () => { await setStatus.mutateAsync({ insightId: insight.id, status: "dismissed" }); onChanged(); }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
        {isOps && insight.status === "accepted" && (
          <button title="Back to suggested" className="text-[10px] underline opacity-60 flex-shrink-0" disabled={setStatus.isPending}
            onClick={async () => { await setStatus.mutateAsync({ insightId: insight.id, status: "suggested" }); onChanged(); }}>
            undo
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminCalls() {
  const [filter, setFilter] = useState<"all" | "suggested" | "accepted">("all");
  const list = trpc.callIntelligence.list.useQuery({ status: filter === "all" ? "all" : filter, limit: 15 }, { retry: false, refetchOnWindowFocus: false });
  const open = trpc.callIntelligence.openSuggestions.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const onChanged = () => {
    void utils.callIntelligence.list.invalidate();
    void utils.callIntelligence.openSuggestions.invalidate();
  };

  if (list.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]"><Loader2 className="w-6 h-6 animate-spin text-[#1a472a]" /></div>;
  }
  if (list.isError || !list.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] p-6 text-center">
        <div>
          <p className="text-[#1a472a] font-semibold">Call intelligence is for the team.</p>
          <Link href="/admin" className="text-sm text-[#4a7c59] hover:underline">Back to admin</Link>
        </div>
      </div>
    );
  }

  const openSuggestions = open.data?.suggestions ?? [];

  return (
    <div className="min-h-screen bg-[#f8f5f0] pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin" className="text-xs text-[#4a7c59] hover:underline inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-3 h-3" /> Admin</Link>
            <h1 className="text-2xl font-bold text-[#1a472a] flex items-center gap-2"><Phone className="w-6 h-6 text-[#4a7c59]" /> Call intelligence</h1>
            <p className="text-xs text-[#1a472a]/60 mt-1">
              {list.data.ready
                ? "What our community calls decided, committed to, and taught. Accepting records the team's judgment; nothing turns into a task on its own."
                : "The call_insights table is not migrated yet."}
            </p>
          </div>
          <div className="flex gap-1.5">
            {(["all", "suggested", "accepted"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filter === f ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a]/70 border-[#1a472a]/25 hover:border-[#1a472a]/50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {openSuggestions.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Awaiting review ({openSuggestions.length}, oldest first)</h2>
            {openSuggestions.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-[10px] text-[#1a472a]/40 w-16 flex-shrink-0">{timeAgo(s.createdAt)}</span>
                <div className="flex-1 min-w-0"><InsightRow insight={s} onChanged={onChanged} /></div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[#1a472a]/70 uppercase tracking-wide">By call ({list.data.calls.length})</h2>
          {list.data.calls.length === 0 && (
            <p className="text-sm text-[#1a472a]/50">Nothing extracted yet. Insights appear within an hour of a call's transcript landing.</p>
          )}
          {list.data.calls.map((call) => (
            <div key={call.recordingId} className="rounded-2xl border border-[#4a7c59]/25 bg-white p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[#1a472a]">{call.title}</p>
                <Badge variant="outline" className="text-[10px] border-[#4a7c59]/40 text-[#4a7c59]">
                  {call.date ? new Date(call.date).toLocaleDateString() : "undated"}
                </Badge>
                {call.link && (
                  <a href={call.link} target="_blank" rel="noreferrer" className="text-xs text-[#4a7c59] hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> watch
                  </a>
                )}
              </div>
              <div className="space-y-1.5">
                {call.insights.map((insight) => <InsightRow key={insight.id} insight={insight} onChanged={onChanged} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
