/**
 * Assembly lifecycle controls (ASSEMBLY_PAGE_SPEC.md sections 2, 3.2, 3.3)
 *
 * MoveToDecideButton: owner-only, unlocked when every gate passes; the
 * disabled state lists exactly which gates are unmet. An open objection can
 * be overridden with a recorded note.
 *
 * MinorLaneRow: the lazy-consent countdown plus the one-click objection that
 * bumps a minor proposal to the full lane.
 *
 * LastCallSection: proposals in their 48h window (with objection control)
 * and proposals ready to launch on Hypha (owner-initiated bridge handoff).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Hourglass, Rocket, ShieldAlert, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

function daysUntil(date: string | Date): string {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return "any moment now";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)} days`;
}

export function MoveToDecideButton({ proposal }: { proposal: any }) {
  const utils = trpc.useUtils();
  const [overriding, setOverriding] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");

  const move = trpc.assembly.moveToDecide.useMutation({
    onSuccess: (res: any) => {
      toast.success(`In last call for the next ${res.lastCallHours} hours.`);
      utils.assembly.forming.invalidate();
      utils.assembly.lastCall.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!proposal.isOwner || proposal.lastCallStartedAt) return null;

  const gates = proposal.gates ?? {};
  const unmet: string[] = [];
  if (gates.readiness && !gates.readiness.met) unmet.push(`${gates.readiness.voices}/${gates.readiness.neededVoices} voices, ${gates.readiness.ageHours}/${gates.readiness.neededHours}h old`);
  if (gates.points && !gates.points.met) unmet.push(`${gates.points.value}/${gates.points.needed} net points`);
  if (gates.avg && !gates.avg.met) unmet.push(`average ${gates.avg.value?.toFixed(1) ?? "0"} under the ${gates.avg.needed} floor`);
  const objectionOpen = gates.objection && !gates.objection.met;

  if (unmet.length > 0) {
    return (
      <p className="text-white/60 text-[11px] mt-2" title="Move to Decide unlocks when every gate passes.">
        Move to Decide needs: {unmet.join(" · ")}
      </p>
    );
  }

  if (objectionOpen && !overriding) {
    return (
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <p className="text-amber-300/90 text-[11px]">The strongest objection is unaddressed.</p>
        <button type="button" onClick={() => setOverriding(true)} className="text-[11px] font-bold text-amber-300 hover:text-amber-200">
          Override with a recorded note
        </button>
      </div>
    );
  }

  if (objectionOpen && overriding) {
    return (
      <div className="mt-2 space-y-1.5">
        <input
          type="text"
          value={overrideNote}
          onChange={(e) => setOverrideNote(e.target.value)}
          maxLength={500}
          placeholder="Why the proposal moves forward despite the objection (recorded publicly)"
          className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/60"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => move.mutate({ proposalId: proposal.id, overrideObjection: true, overrideNote: overrideNote.trim() })}
            disabled={move.isPending || overrideNote.trim().length < 10}
            className="text-[11px] font-bold text-[#7dd87d] hover:text-[#9de89d]"
          >
            {move.isPending ? "Moving..." : "Move to Decide with override"}
          </button>
          <button type="button" onClick={() => setOverriding(false)} className="text-[11px] text-white/60 hover:text-white/80">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => move.mutate({ proposalId: proposal.id })}
      disabled={move.isPending}
      className="mt-2 inline-flex items-center gap-1.5 bg-[#7dd87d] text-[#1a472a] font-bold text-xs rounded-lg px-3 py-1.5 hover:bg-[#9de89d] transition-colors disabled:opacity-50"
    >
      {move.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
      Move to Decide
    </button>
  );
}

export function MinorLaneRow({ proposal }: { proposal: any }) {
  const utils = trpc.useUtils();
  const [objecting, setObjecting] = useState(false);
  const [reason, setReason] = useState("");

  const object = trpc.assembly.objectMinor.useMutation({
    onSuccess: () => {
      toast.success("Bumped to the full lane. It now goes through the complete pipeline.");
      utils.assembly.forming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (proposal.lane !== "minor") return null;

  return (
    <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px]">
      <span className="text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
        Minor lane · passes in {proposal.minorPassesAt ? daysUntil(proposal.minorPassesAt) : "a few days"} if no one objects
      </span>
      {objecting ? (
        <span className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Why this deserves the full pipeline"
            className="bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] placeholder:text-white/60 w-64 max-w-full"
          />
          <button
            type="button"
            onClick={() => object.mutate({ proposalId: proposal.id, reason: reason.trim() })}
            disabled={object.isPending || reason.trim().length < 5}
            className="font-bold text-amber-300 hover:text-amber-200"
          >
            Object
          </button>
          <button type="button" onClick={() => setObjecting(false)} className="text-white/60 hover:text-white/80">
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setObjecting(true)} className="text-amber-300/90 hover:text-amber-200 underline">
          I object
        </button>
      )}
    </div>
  );
}

export function LastCallSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const { data } = trpc.assembly.lastCall.useQuery(undefined, { staleTime: 30_000, refetchInterval: 60_000 });
  const [objectingId, setObjectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const object = trpc.assembly.objectLastCall.useMutation({
    onSuccess: () => {
      setObjectingId(null);
      setReason("");
      toast.success("Objection recorded. The proposal returns to forming.");
      utils.assembly.lastCall.invalidate();
      utils.assembly.forming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const launch = trpc.assembly.launchOnHypha.useMutation({
    onSuccess: (res: any) => {
      toast.success("Bridge ready. Hypha opens to finish the launch.");
      window.location.href = res.bridgeUrl;
    },
    onError: (err) => toast.error(err.message),
  });

  const inWindow = data?.inWindow ?? [];
  const ready = data?.readyToLaunch ?? [];

  if (inWindow.length === 0 && ready.length === 0) {
    return (
      <p className="text-white/65 text-sm safe-prose">
        Proposals about to move to a binding vote pause here for a final window, one last chance for
        a late objection before the vote opens. When a proposal reaches this stage it appears here
        with its countdown.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {inWindow.map((p: any) => (
        <li key={p.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25">
          <div className="flex items-center gap-3 flex-wrap">
            <Hourglass className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <div className="flex-1 min-w-[200px] safe-prose">
              <p className="text-white text-sm font-semibold">{p.title}</p>
              {p.aim && <p className="text-white/60 text-[11px]">This serves the Game by {p.aim}</p>}
            </div>
            <span className="text-amber-200 text-xs font-semibold">closes in {daysUntil(p.endsAt)}</span>
            {p.forumThreadId && (
              <Link href={`/community/post/${p.forumThreadId}`} className="text-[#7dd87d] text-[11px] hover:underline inline-flex items-center gap-1">
                <MessageCircle className="w-2.5 h-2.5" /> Conversation
              </Link>
            )}
            {isAuthenticated && (
              objectingId === p.id ? (
                <span className="flex items-center gap-2 flex-wrap w-full">
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    placeholder="The harm to the aim, in one or two sentences"
                    className="flex-1 min-w-[220px] bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/60"
                  />
                  <button
                    type="button"
                    onClick={() => object.mutate({ proposalId: p.id, reason: reason.trim() })}
                    disabled={object.isPending || reason.trim().length < 10}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200"
                  >
                    Raise it
                  </button>
                  <button type="button" onClick={() => setObjectingId(null)} className="text-[11px] text-white/60 hover:text-white/80">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setObjectingId(p.id); setReason(""); }}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 underline"
                  title="A reasoned objection pulls the proposal back to forming. The standard: harm to the aim, preference stays a signal."
                >
                  <ShieldAlert className="w-3 h-3" /> Raise an objection
                </button>
              )
            )}
          </div>
        </li>
      ))}
      {ready.map((p: any) => (
        <li key={`ready-${p.id}`} className="p-3 rounded-xl bg-[#7dd87d]/8 border border-[#7dd87d]/30">
          <div className="flex items-center gap-3 flex-wrap">
            <Rocket className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
            <div className="flex-1 min-w-[200px] safe-prose">
              <p className="text-white text-sm font-semibold">{p.title}</p>
              <p className="text-white/60 text-[11px]">Last call passed quietly. Ready for the binding vote.</p>
            </div>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => launch.mutate({ proposalId: p.id })}
                disabled={launch.isPending}
                className="inline-flex items-center gap-1.5 bg-[#7dd87d] text-[#1a472a] font-bold text-xs rounded-lg px-3 py-1.5 hover:bg-[#9de89d] transition-colors disabled:opacity-50"
                title="Opens the Hypha Bridge. You confirm the proposal on Hypha; that creates the binding vote."
              >
                {launch.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Launch the vote on Hypha
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RestingStrip({ resting }: { resting: any[] }) {
  const utils = trpc.useUtils();
  const revive = trpc.assembly.revive.useMutation({
    onSuccess: () => {
      toast.success("Revived. Back in Forming.");
      utils.assembly.forming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (resting.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <p className="text-white/60 text-[11px] uppercase tracking-wider font-bold mb-2">Resting</p>
      <ul className="space-y-1.5">
        {resting.map((p: any) => (
          <li key={p.id} className="flex items-center gap-3 text-xs">
            <span className="text-white/60 flex-1 min-w-0 truncate">{p.title}</span>
            <button
              type="button"
              onClick={() => revive.mutate({ proposalId: p.id })}
              disabled={revive.isPending}
              className="text-[#7dd87d] font-semibold hover:underline flex-shrink-0"
            >
              Revive
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
