/**
 * ProfileCallTasksTab: the holder's view of their open + in-flight call
 * tasks. Phase 3 of the Movement Coordination Engine.
 *
 * Reads trpc.callTasks.listMine grouped by status. Each task carries the
 * sociocratic overview from the LLM extract-tasks pass plus the $ReGen
 * bounty. Open tasks expose Claim; claimed tasks expose Submit (artifact
 * URL or text); submitted / completed tasks are read-only here (a steward
 * approves + rewards from the admin queue).
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  PlayCircle,
  Send,
  Sparkles,
} from "lucide-react";

type Task = {
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
  status: "proposed" | "approved" | "open" | "claimed" | "submitted" | "completed" | "declined" | "expired";
  claimedAt: Date | string | null;
  submittedArtifactUrl: string | null;
  submittedArtifactText: string | null;
  completedAt: Date | string | null;
};

function bountyLabel(amount: number, tokenType: string): string {
  if (amount <= 0) return "no bounty";
  const t = tokenType === "rcivics" ? "$RCivics" : "$ReGen";
  return `${amount} ${t}`;
}

function deepLink(videoId: string, seconds: number | null): string {
  const t = Math.max(0, Math.floor(seconds ?? 0));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}

function SociocraticOverview({ overview }: { overview: unknown }) {
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
    <details className="mt-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-white/85 hover:text-white">
        How this one works
      </summary>
      <div className="mt-2 space-y-2 text-xs text-white/85">
        {o.purpose && <p><span className="text-[#7dd87d] font-bold">Purpose: </span>{o.purpose}</p>}
        {o.whyThisRole && <p><span className="text-[#7dd87d] font-bold">Why you: </span>{o.whyThisRole}</p>}
        {Array.isArray(o.steps) && o.steps.length > 0 && (
          <div>
            <p className="text-[#7dd87d] font-bold">Steps</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              {o.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        {o.definitionOfDone && <p><span className="text-[#7dd87d] font-bold">Done means: </span>{o.definitionOfDone}</p>}
        {o.consentCircle && <p><span className="text-[#7dd87d] font-bold">Consent circle: </span>{o.consentCircle}</p>}
      </div>
    </details>
  );
}

function TaskCard({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [artifactUrl, setArtifactUrl] = useState("");
  const [artifactText, setArtifactText] = useState("");
  const claim = trpc.callTasks.claim.useMutation({ onSuccess: onChanged });
  const submit = trpc.callTasks.submit.useMutation({ onSuccess: onChanged });

  const playLink = deepLink(task.sourceVideoId, task.evidenceTimestampSeconds);

  return (
    <article
      id={`call-task-${task.id}`}
      className="rounded-xl border border-white/15 bg-[#0d2818]/60 p-4 space-y-3"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="font-bold text-white leading-snug">{task.title}</h4>
          <p className="text-xs text-white/65 mt-0.5">
            Bounty: <span className="text-[#7dd87d] font-semibold">{bountyLabel(task.bountyAmount, task.bountyTokenType)}</span>
            <span className="mx-1.5">·</span>
            status: {task.status}
          </p>
        </div>
        <a
          href={playLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#7dd87d] hover:text-white"
        >
          <PlayCircle className="w-3.5 h-3.5" /> Listen to the moment <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {task.summary && (
        <p className="text-sm text-white/90 leading-relaxed">{task.summary}</p>
      )}

      {task.evidenceQuote && (
        <blockquote className="rounded-lg border-l-4 border-[#7dd87d] bg-[#7dd87d]/10 px-3 py-2 text-sm text-white/90 italic">
          "{task.evidenceQuote}"
        </blockquote>
      )}

      <SociocraticOverview overview={task.sociocraticOverview} />

      {task.status === "open" && (
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => claim.mutate({ id: task.id })}
            disabled={claim.isPending}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            {claim.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Claim it
          </Button>
        </div>
      )}

      {task.status === "claimed" && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/70 inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Claimed {task.claimedAt ? new Date(task.claimedAt).toLocaleDateString() : ""}
          </p>
          <Input
            value={artifactUrl}
            onChange={(e) => setArtifactUrl(e.target.value)}
            placeholder="Link to the work (optional)"
            className="text-white bg-white/5 border-white/20"
          />
          <Textarea
            value={artifactText}
            onChange={(e) => setArtifactText(e.target.value)}
            placeholder="Brief notes on what you did (optional, but one of these two is required)"
            className="text-white bg-white/5 border-white/20 min-h-[80px]"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => submit.mutate({ id: task.id, artifactUrl: artifactUrl || undefined, artifactText: artifactText || undefined })}
            disabled={submit.isPending || (!artifactUrl && !artifactText)}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            {submit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Submit for steward consent
          </Button>
        </div>
      )}

      {task.status === "submitted" && (
        <p className="text-xs text-white/70 inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Waiting on steward consent.
        </p>
      )}

      {task.status === "completed" && (
        <p className="text-xs text-[#7dd87d] inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Completed
          {task.completedAt && <> on {new Date(task.completedAt).toLocaleDateString()}</>}.
          {task.bountyAmount > 0 && <> {bountyLabel(task.bountyAmount, task.bountyTokenType)} credited to your private balance.</>}
        </p>
      )}
    </article>
  );
}

export function ProfileCallTasksTab() {
  const query = trpc.callTasks.listMine.useQuery({}, { staleTime: 30_000 });
  const tasks = (query.data ?? []) as Task[];

  const grouped = useMemo(() => {
    const buckets: Record<string, Task[]> = {
      open: [], claimed: [], submitted: [], completed: [], other: [],
    };
    for (const t of tasks) {
      if (t.status === "open" || t.status === "claimed" || t.status === "submitted" || t.status === "completed") {
        buckets[t.status].push(t);
      } else {
        buckets.other.push(t);
      }
    }
    return buckets;
  }, [tasks]);

  if (query.isLoading) {
    return (
      <p className="text-white/70 text-sm inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> loading
      </p>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/70 text-sm">
        No call tasks for you yet. They show up here when a recorded session names you or your role.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(["open", "claimed", "submitted", "completed", "other"] as const).map((bucket) => {
        const list = grouped[bucket];
        if (!list || list.length === 0) return null;
        const label =
          bucket === "open" ? "Open" :
          bucket === "claimed" ? "Claimed" :
          bucket === "submitted" ? "Submitted (awaiting consent)" :
          bucket === "completed" ? "Completed" : "Other";
        return (
          <section key={bucket} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
              {label} <span className="ml-2 text-white/50 font-medium normal-case">({list.length})</span>
            </h3>
            <div className="space-y-3">
              {list.map((t) => <TaskCard key={t.id} task={t} onChanged={() => query.refetch()} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default ProfileCallTasksTab;
