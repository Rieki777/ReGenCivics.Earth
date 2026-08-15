/**
 * SignalControl + SignalReadout (ASSEMBLY_PAGE_SPEC.md section 4)
 *
 * The Signal: one adjustable -3..+3 score per signed-in member per proposal.
 * A 7-segment pill row; one tap sets, tapping another moves. Optimistic for
 * the actor, ~15s refetch for everyone else (no websockets in V1).
 *
 * When someone sets a negative score, an optional one-line prompt appears:
 * "What would need to change for this to be a +1?" The note rides on the
 * signal row and feeds the next synthesis as improvement fuel, unattributed.
 *
 * Aggregate-only: the readout shows net points (headline), average + count
 * (context), and a 7-bucket histogram so consensus and split look different.
 * Individual scores are never shown.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const SCORE_LABELS: Record<number, string> = {
  3: "I absolutely love this",
  2: "I'm for this",
  1: "I can live with this",
  0: "No strong feeling either way",
  [-1]: "Needs some changes first",
  [-2]: "I'm against this as it stands",
  [-3]: "Absolutely not, not in any form",
};

const SCORES = [-3, -2, -1, 0, 1, 2, 3];

function pillClasses(score: number, isActive: boolean): string {
  const base = "flex-1 min-w-[38px] py-2 rounded-lg border text-center text-sm font-bold transition-all";
  if (!isActive) {
    return `${base} bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white`;
  }
  if (score > 0) return `${base} bg-[#7dd87d]/25 border-[#7dd87d]/60 text-[#7dd87d]`;
  if (score < 0) return `${base} bg-red-500/20 border-red-500/50 text-red-300`;
  return `${base} bg-white/15 border-white/40 text-white`;
}

interface Aggregates {
  netPoints: number;
  avg: number | null;
  count: number;
  histogram: number[];
}

export function SignalReadout({ signal }: { signal: Aggregates }) {
  const maxBucket = Math.max(1, ...signal.histogram);
  return (
    <div className="flex items-end gap-4">
      <div>
        <p className="text-white text-xl font-bold leading-none">
          {signal.netPoints > 0 ? `+${signal.netPoints}` : signal.netPoints}
          <span className="text-white/60 text-xs font-normal ml-1.5">net points</span>
        </p>
        <p className="text-white/60 text-[11px] mt-1">
          {signal.count === 0
            ? "No signals yet"
            : `${signal.count} ${signal.count === 1 ? "signal" : "signals"} · average ${signal.avg !== null ? signal.avg.toFixed(1) : "0.0"}`}
        </p>
      </div>
      {signal.count > 0 && (
        <div className="flex items-end gap-0.5 h-7" aria-label="Signal distribution from -3 to +3">
          {signal.histogram.map((n, i) => (
            <div
              key={i}
              className={`w-2 rounded-sm ${i < 3 ? "bg-red-400/70" : i === 3 ? "bg-white/40" : "bg-[#7dd87d]/80"}`}
              style={{ height: `${Math.max(8, (n / maxBucket) * 100)}%`, opacity: n === 0 ? 0.25 : 1 }}
              title={`${i - 3 > 0 ? "+" : ""}${i - 3}: ${n}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SignalControlProps {
  proposalId: number;
  signal: Aggregates & { mySignal: number | null; mySignalStale: boolean };
}

export function SignalControl({ proposalId, signal }: SignalControlProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [pendingNoteFor, setPendingNoteFor] = useState<number | null>(null);
  const [moveNote, setMoveNote] = useState("");

  const setSignal = trpc.assembly.signal.useMutation({
    onMutate: async ({ score }) => {
      await utils.assembly.forming.cancel();
      const prev = utils.assembly.forming.getData();
      utils.assembly.forming.setData(undefined, (old: any) =>
        old?.map((c: any) => (c.id === proposalId ? { ...c, signal: { ...c.signal, mySignal: score } } : c))
      );
      return { prev };
    },
    onError: (_e, _v, ctxData) => {
      if (ctxData?.prev) utils.assembly.forming.setData(undefined, ctxData.prev);
    },
    onSettled: () => {
      utils.assembly.forming.invalidate();
    },
  });

  const tap = (score: number) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (score < 0) {
      setPendingNoteFor(score);
      setSignal.mutate({ proposalId, score });
    } else {
      setPendingNoteFor(null);
      setMoveNote("");
      setSignal.mutate({ proposalId, score });
    }
  };

  const submitNote = () => {
    if (pendingNoteFor === null) return;
    setSignal.mutate({ proposalId, score: pendingNoteFor, moveNote: moveNote.trim() || undefined });
    setPendingNoteFor(null);
    setMoveNote("");
  };

  const active = signal.mySignal;

  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Your signal, from minus three to plus three">
        {SCORES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active === s}
            onClick={() => tap(s)}
            disabled={setSignal.isPending}
            className={pillClasses(s, active === s)}
            title={SCORE_LABELS[s]}
          >
            {s > 0 ? `+${s}` : s}
          </button>
        ))}
      </div>
      {active !== null && (
        <p className="text-white/60 text-[11px] mt-1.5">{SCORE_LABELS[active]}</p>
      )}
      {signal.mySignalStale && (
        <p className="text-amber-300/90 text-[11px] mt-1">
          Cast before the latest changes. The proposal summary has been refreshed since you signaled.
        </p>
      )}
      {pendingNoteFor !== null && (
        <div className="mt-2">
          <label className="text-white/70 text-[11px] block mb-1">
            What would need to change for this to be a +1? (optional, shared without your name)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={moveNote}
              onChange={(e) => setMoveNote(e.target.value)}
              maxLength={500}
              className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/60"
              placeholder="One line is plenty"
            />
            <button
              type="button"
              onClick={submitNote}
              className="text-xs font-bold text-[#7dd87d] hover:text-[#9de89d] transition-colors flex-shrink-0"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => { setPendingNoteFor(null); setMoveNote(""); }}
              className="text-xs text-white/60 hover:text-white/80 transition-colors flex-shrink-0"
            >
              Skip
            </button>
          </div>
        </div>
      )}
      {setSignal.isError && (
        <p className="text-red-300 text-[11px] mt-1">{(setSignal.error as any)?.message ?? "Could not save your signal"}</p>
      )}
    </div>
  );
}
