/**
 * AdminTasksTab: the call-task review queue (Phase 3, Movement
 * Coordination Engine).
 *
 * Shows every proposed task with its evidence quote, a timestamped
 * deep-link to the source YouTube video, the resolved assignee (if a
 * holder was matched on roleSlug), and a suggested bounty. Admin can:
 *   - approve (stamps approvedBy + flips status to open)
 *   - edit the bounty inline before approving
 *   - reassign the holder (e.g. pick a different userId, or unassign
 *     so the task surfaces on Opportunity)
 *   - decline (terminal)
 *   - bulk approve / decline selected rows
 *
 * Approve fires the in-app notification automatically (server-side, see
 * server/routes/callTasks.ts deliverApproval). Email notifications are
 * intentionally deferred to a follow-up; in-app is the Phase 3 surface.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCheck,
  ExternalLink,
  Loader2,
  PlayCircle,
  Quote,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UserCheck,
  UserMinus,
} from "lucide-react";

type QueueRow = {
  id: number;
  recordingId: number;
  sourceVideoId: string;
  roleSlug: string | null;
  assigneeUserId: number | null;
  title: string;
  summary: string | null;
  sociocraticOverview: unknown;
  bountyTokenType: string;
  bountyAmount: number;
  evidenceQuote: string | null;
  evidenceTimestampSeconds: number | null;
  status: string;
  createdByAgent: string;
  createdAt: Date | string;
  recordingTitle: string | null;
  recordingYoutubeVideoId: string | null;
  roleTitle: string | null;
  roleHolderUserId: number | null;
};

const STATUS_TABS: Array<{ value: "proposed" | "open" | "claimed" | "submitted" | "completed" | "declined"; label: string }> = [
  { value: "proposed", label: "Proposed (gate)" },
  { value: "open", label: "Open" },
  { value: "claimed", label: "Claimed" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

function youTubeDeepLink(videoId: string | null, seconds: number | null): string | null {
  if (!videoId) return null;
  const t = Math.max(0, Math.floor(seconds ?? 0));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}

function relativeTime(value: Date | string): string {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

function SociocraticOverviewBlock({ overview }: { overview: unknown }) {
  if (!overview || typeof overview !== "object") return null;
  const o = overview as {
    purpose?: string;
    whyThisRole?: string;
    steps?: string[];
    definitionOfDone?: string;
    consentCircle?: string;
  };
  if (!o.purpose && !o.steps && !o.definitionOfDone) return null;
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-xs font-semibold text-[#1a472a]/80 hover:text-[#1a472a]">
        Sociocratic overview
      </summary>
      <div className="mt-2 space-y-2 text-xs text-[#1a472a]/85 pl-3 border-l-2 border-[#7dd87d]/40">
        {o.purpose && <p><span className="font-bold">Purpose:</span> {o.purpose}</p>}
        {o.whyThisRole && <p><span className="font-bold">Why this role:</span> {o.whyThisRole}</p>}
        {Array.isArray(o.steps) && o.steps.length > 0 && (
          <div>
            <p className="font-bold">Steps:</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              {o.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        {o.definitionOfDone && <p><span className="font-bold">Definition of done:</span> {o.definitionOfDone}</p>}
        {o.consentCircle && <p><span className="font-bold">Consent circle:</span> {o.consentCircle}</p>}
      </div>
    </details>
  );
}

function QueueRowCard({ row, onChanged }: { row: QueueRow; onChanged: () => void }) {
  const [bounty, setBounty] = useState<number>(row.bountyAmount);
  const [reassigning, setReassigning] = useState(false);
  const [search, setSearch] = useState("");

  const lookup = trpc.roleHolders.findUsers.useQuery(
    { q: search },
    { enabled: reassigning && search.length >= 2, staleTime: 30_000 },
  );
  const approve = trpc.callTasks.approve.useMutation({ onSuccess: onChanged });
  const decline = trpc.callTasks.decline.useMutation({ onSuccess: onChanged });

  const deepLink = youTubeDeepLink(row.recordingYoutubeVideoId, row.evidenceTimestampSeconds);
  const assigneeLabel = row.assigneeUserId
    ? `User #${row.assigneeUserId}${row.roleTitle ? ` (${row.roleTitle})` : ""}`
    : row.roleSlug
    ? `Open to circle (${row.roleTitle ?? row.roleSlug})`
    : "Open to circle";

  return (
    <div className="rounded-xl border border-[#1a472a]/15 bg-white p-4 space-y-3">
      {/* Title + meta */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-bold text-[#1a472a] leading-snug">{row.title}</p>
          <p className="text-xs text-[#1a472a]/70 mt-1">
            from <span className="font-semibold">{row.recordingTitle ?? "session"}</span>
            <span className="mx-1.5">·</span>
            <Sparkles className="inline w-3 h-3 mr-1" />
            {row.createdByAgent}
            <span className="mx-1.5">·</span>
            {relativeTime(row.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
          <UserCheck className="w-3 h-3" /> {assigneeLabel}
        </span>
      </div>

      {row.summary && (
        <p className="text-sm text-[#1a472a] leading-relaxed">{row.summary}</p>
      )}

      {/* Evidence quote + deep link */}
      {row.evidenceQuote && (
        <blockquote className="rounded-lg border-l-4 border-[#7dd87d] bg-[#7dd87d]/10 px-3 py-2 text-sm text-[#1a472a]">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#1a472a]/70 mb-1">
            <Quote className="w-3 h-3" /> Evidence from the call
          </span>
          <p className="italic">"{row.evidenceQuote}"</p>
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a472a] hover:underline"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Play at {Math.floor((row.evidenceTimestampSeconds ?? 0) / 60)}:{String((row.evidenceTimestampSeconds ?? 0) % 60).padStart(2, "0")}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </blockquote>
      )}

      <SociocraticOverviewBlock overview={row.sociocraticOverview} />

      {/* Action row */}
      {row.status === "proposed" ? (
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <label className="inline-flex items-center gap-1.5 text-xs text-[#1a472a]/85">
            Bounty
            <Input
              type="number"
              min={0}
              max={1_000_000}
              value={bounty}
              onChange={(e) => setBounty(Number(e.target.value) || 0)}
              className="w-24 h-8 text-[#1a472a] text-sm"
            />
            <span>{row.bountyTokenType === "rcivics" ? "$RCivics" : "$ReGen"}</span>
          </label>

          <Button
            type="button"
            size="sm"
            disabled={approve.isPending}
            onClick={() => approve.mutate({ id: row.id, bountyAmount: bounty })}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={decline.isPending}
            onClick={() => decline.mutate({ id: row.id })}
          >
            <ShieldX className="w-3.5 h-3.5 mr-1" /> Decline
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReassigning((v) => !v)}
          >
            <UserCheck className="w-3.5 h-3.5 mr-1" /> {reassigning ? "Cancel" : "Reassign"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[#1a472a]/60">
          status: {row.status}{row.bountyAmount > 0 && <> · {row.bountyAmount} {row.bountyTokenType === "rcivics" ? "$RCivics" : "$ReGen"}</>}
        </p>
      )}

      {reassigning && row.status === "proposed" && (
        <div className="space-y-2 rounded-lg border border-dashed border-[#1a472a]/20 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holder by email or handle"
              className="text-[#1a472a] text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                approve.mutate({ id: row.id, bountyAmount: bounty, assigneeUserId: null });
                setReassigning(false);
              }}
              title="Approve as open-to-circle"
            >
              <UserMinus className="w-3.5 h-3.5 mr-1" /> Open to circle
            </Button>
          </div>
          {search.length >= 2 && (
            <div className="rounded-md border border-[#1a472a]/10 max-h-40 overflow-y-auto">
              {lookup.isLoading ? (
                <p className="p-2 text-xs text-[#1a472a]/70 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> searching
                </p>
              ) : (lookup.data ?? []).length === 0 ? (
                <p className="p-2 text-xs text-[#1a472a]/70">No matches.</p>
              ) : (
                (lookup.data ?? []).map((u: { id: number; name: string | null; email: string | null; handle: string | null }) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-[#1a472a] hover:bg-[#7dd87d]/15"
                    onClick={() => {
                      approve.mutate({ id: row.id, bountyAmount: bounty, assigneeUserId: u.id });
                      setReassigning(false);
                    }}
                  >
                    <span className="font-semibold">{u.name ?? u.handle ?? `User ${u.id}`}</span>
                    {u.email && <span className="text-[#1a472a]/70 ml-2">{u.email}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminTasksTab() {
  const [activeStatus, setActiveStatus] = useState<typeof STATUS_TABS[number]["value"]>("proposed");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const queue = trpc.callTasks.adminQueue.useQuery({ status: activeStatus, limit: 100 }, { staleTime: 30_000 });
  const approveBulk = trpc.callTasks.approveBulk.useMutation({
    onSuccess: () => { setSelected(new Set()); queue.refetch(); },
  });
  const declineBulk = trpc.callTasks.declineBulk.useMutation({
    onSuccess: () => { setSelected(new Set()); queue.refetch(); },
  });
  const runNow = trpc.callTasks.runPipelineNow.useMutation({ onSuccess: () => queue.refetch() });

  const rows = (queue.data ?? []) as QueueRow[];
  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [rows, selected],
  );

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCheck className="w-4 h-4" /> Call Tasks Queue
        </CardTitle>
        <CardDescription>
          Proposed tasks land here from the coordination pipeline. Approve, edit bounty, reassign, or decline. Approval fires the in-app notification automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setActiveStatus(tab.value); setSelected(new Set()); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeStatus === tab.value
                  ? "bg-[#1a472a] text-white"
                  : "bg-[#1a472a]/10 text-[#1a472a] hover:bg-[#1a472a]/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#1a472a]/70">
            {queue.isLoading ? "loading…" : `${rows.length} ${activeStatus}`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runNow.mutate({ maxNew: 5 })}
            disabled={runNow.isPending}
          >
            {runNow.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Run pipeline now
          </Button>
        </div>

        {/* Bulk row, only for proposed */}
        {activeStatus === "proposed" && rows.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a472a]/5">
            <label className="inline-flex items-center gap-2 text-xs text-[#1a472a]">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all on screen
            </label>
            <span className="text-xs text-[#1a472a]/60">{selected.size} selected</span>
            <Button
              type="button"
              size="sm"
              disabled={selected.size === 0 || approveBulk.isPending}
              onClick={() => approveBulk.mutate({ ids: Array.from(selected) })}
              className="ml-auto bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || declineBulk.isPending}
              onClick={() => declineBulk.mutate({ ids: Array.from(selected) })}
            >
              <ShieldX className="w-3.5 h-3.5 mr-1" /> Decline selected
            </Button>
          </div>
        )}

        {/* Rows */}
        {queue.isLoading ? (
          <div className="text-sm text-[#1a472a]/70 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> loading
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#1a472a]/70 py-6 text-center">
            No tasks at this status. The pipeline writes proposed rows as new recordings come in; try "Run pipeline now" or check back after the next cron tick.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="flex gap-2">
                {activeStatus === "proposed" && (
                  <input
                    type="checkbox"
                    className="mt-5"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.title}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <QueueRowCard row={row} onChanged={() => queue.refetch()} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminTasksTab;
