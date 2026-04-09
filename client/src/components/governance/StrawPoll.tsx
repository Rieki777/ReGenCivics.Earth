/**
 * StrawPoll
 *
 * Lightweight in-thread temperature check. Non-binding. Maximum 5 per thread.
 * Closes after 7 days or when the creator clicks close. When consensus crosses
 * 66% with at least 5 votes, a green "Promote to formal decision" button appears
 * inviting the creator to open the PromotionModal.
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md section 2.8
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  strawPollId: number;
  onPromote?: () => void;
}

export function StrawPoll({ strawPollId, onPromote }: Props) {
  const { isAuthenticated } = useAuth();
  const [chosen, setChosen] = useState<string | null>(null);
  const utils = trpc.useContext();
  const resultsQuery = trpc.governance.getStrawPollResults.useQuery({ strawPollId });
  const voteMutation = trpc.governance.voteStrawPoll.useMutation({
    onSuccess: () => {
      utils.governance.getStrawPollResults.invalidate({ strawPollId });
    },
  });

  const data = resultsQuery.data;
  if (!data) return null;
  const poll: any = data.poll;
  const options: string[] = (() => {
    try {
      return typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
    } catch {
      return [];
    }
  })();

  const handleVote = (choice: string) => {
    if (!isAuthenticated) return;
    setChosen(choice);
    voteMutation.mutate({ strawPollId, choice });
  };

  const closed = poll.closedAt || new Date(poll.closesAt).getTime() < Date.now();

  return (
    <div className="bg-white/5 border border-white/15 rounded-xl p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-3.5 h-3.5 text-[#7dd87d]" />
        <span className="text-white text-xs font-bold">Straw poll</span>
        <span className="text-[10px] uppercase tracking-wider text-white/45 px-2 py-0.5 rounded-full bg-white/10">
          non-binding
        </span>
        {closed && <span className="text-[10px] text-white/55 ml-auto">closed</span>}
      </div>
      <p className="text-white/85 text-sm mb-3">{poll.question}</p>

      <div className="space-y-1.5">
        {options.map((opt) => {
          const count = data.tally[opt] ?? 0;
          const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
          const isMine = chosen === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => !closed && handleVote(opt)}
              disabled={closed || voteMutation.isPending || !isAuthenticated}
              className={`w-full relative text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                isMine
                  ? "border-[#7dd87d]/50 bg-[#7dd87d]/15 text-white"
                  : "border-white/10 bg-white/5 text-white/85 hover:bg-white/8"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="absolute inset-y-0 left-0 bg-[#7dd87d]/15 rounded-lg" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between">
                <span className="font-semibold">{opt}</span>
                <span className="text-[11px] text-white/65">{count} · {pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-white/45 text-[10px] mt-2">{data.total} total votes</p>

      {data.readyToPromote && (
        <button
          type="button"
          onClick={onPromote}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold text-xs py-2 rounded-lg transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Strong consensus. Promote to a formal decision?
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
