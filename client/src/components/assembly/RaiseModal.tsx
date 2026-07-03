/**
 * RaiseModal (ASSEMBLY_PAGE_SPEC.md section 2, one-door rule)
 *
 * Raises a forum thread into a forming Assembly proposal. The single
 * promotion door on a thread: title prefilled from the thread, the aim line
 * required ("This serves the Game by ___"), and a lane choice (full pipeline
 * or the minor lazy-consent lane for small changes).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { X, Landmark, Loader2, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  { value: "community", label: "Community" },
  { value: "game_variable", label: "Game variable" },
  { value: "new_quest", label: "New quest" },
  { value: "platform_feature", label: "Platform feature" },
  { value: "food_economy", label: "Food economy" },
  { value: "community_agreement", label: "Community agreement" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
] as const;

interface Props {
  threadId: number;
  threadTitle: string;
  open: boolean;
  onClose: () => void;
}

export function RaiseModal({ threadId, threadTitle, open, onClose }: Props) {
  const [title, setTitle] = useState(threadTitle);
  const [aim, setAim] = useState("");
  const [lane, setLane] = useState<"full" | "minor">("full");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("community");
  const [done, setDone] = useState(false);

  const raise = trpc.assembly.raiseFromThread.useMutation({
    onSuccess: () => setDone(true),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="raise-modal-title">
      <div className="bg-gradient-to-b from-[#0d2818] to-[#1a472a] border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#7dd87d]" />
            <h2 id="raise-modal-title" className="text-white font-bold text-lg">Raise in the Assembly</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#7dd87d] mx-auto" />
            <p className="text-white font-semibold">Raised. The proposal is now forming.</p>
            <p className="text-white/65 text-sm">
              The community can signal where it stands and the Guide will synthesize the conversation.
            </p>
            <Link href="/assembly" className="inline-block text-[#7dd87d] font-bold text-sm hover:underline" onClick={onClose}>
              See it on the Assembly
            </Link>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-1.5 block">Proposal title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-1.5 block">The aim</label>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm flex-shrink-0">This serves the Game by</span>
                <input
                  type="text"
                  value={aim}
                  onChange={(e) => setAim(e.target.value)}
                  maxLength={300}
                  placeholder="..."
                  className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40"
                />
              </div>
              <p className="text-white/50 text-[11px] mt-1">
                One sentence. Objections are weighed against this aim, so make it concrete.
              </p>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-1.5 block">Lane</label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setLane("full")}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${lane === "full" ? "bg-[#7dd87d]/15 border-[#7dd87d]/50 text-white" : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10"}`}
                >
                  <span className="font-semibold block">Full lane</span>
                  <span className="text-xs opacity-80">The complete pipeline: signals, synthesis, last call, binding vote.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLane("minor")}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${lane === "minor" ? "bg-[#7dd87d]/15 border-[#7dd87d]/50 text-white" : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10"}`}
                >
                  <span className="font-semibold block">Minor lane</span>
                  <span className="text-xs opacity-80">For small changes: wording, tweaks that keep tokens and rules where they are. Passes after 7 quiet days; any member can object it up to the full lane.</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-[#0d2818]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {raise.isError && <p className="text-red-300 text-xs">{(raise.error as any)?.message}</p>}

            <button
              type="button"
              onClick={() => raise.mutate({ forumPostId: threadId, aim: aim.trim(), lane, category, title: title.trim() || undefined })}
              disabled={raise.isPending || aim.trim().length < 10 || title.trim().length < 5}
              className="w-full flex items-center justify-center gap-2 bg-[#7dd87d] text-[#1a472a] font-bold text-sm rounded-xl py-2.5 hover:bg-[#9de89d] transition-colors disabled:opacity-50"
            >
              {raise.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Raise the proposal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
