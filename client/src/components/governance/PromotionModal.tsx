/**
 * PromotionModal
 *
 * The "Promote to decision" flow on a forum thread. Walks the proposer through:
 *   1. Readiness check (4 gates from governance.checkPromotionReadiness)
 *   2. Decision question + track + sunset + reversibility
 *   3. ReGen Guide template suggestion + draft button (optional)
 *   4. Submit -> creates a forumPromotionRequests row, waits for co-signer
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md sections 1.1-1.7
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X, Vote, CheckCircle2, AlertCircle, Clock, Sparkles, ArrowRight, Loader2,
} from "lucide-react";

interface Props {
  threadId: number;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const TRACKS = [
  { value: "fund" as const, label: "Fund track", description: "Token-moving decisions for the regen-civics DHO" },
  { value: "game" as const, label: "Game track", description: "Game-side decisions for the regen-games DHO" },
  { value: "both" as const, label: "Both", description: "Cross-track decisions that touch both sides" },
];

const REVERSIBILITY = [
  { value: "reversible" as const, label: "Reversible", description: "Easy to undo. 1 Steward or 5 Citizens to overturn." },
  { value: "semi_reversible" as const, label: "Semi-reversible", description: "Takes effort to undo. New decision at the same threshold." },
  { value: "one_way_door" as const, label: "One-way door", description: "Effectively permanent. Higher thresholds, longer window." },
];

export function PromotionModal({ threadId, open, onClose, onSubmitted }: Props) {
  const [decisionQuestion, setDecisionQuestion] = useState("");
  const [track, setTrack] = useState<"fund" | "game" | "both">("game");
  const [reversibility, setReversibility] = useState<"reversible" | "semi_reversible" | "one_way_door">("reversible");
  const [sunsetDays, setSunsetDays] = useState<number>(0);
  const [draft, setDraft] = useState<any>(null);

  const readinessQuery = trpc.governance.checkPromotionReadiness.useQuery({ threadId }, { enabled: open });
  const requestMutation = trpc.governance.requestPromotion.useMutation({
    onSuccess: () => {
      onSubmitted?.();
      onClose();
    },
  });
  const draftMutation = trpc.governance.draftDecision.useMutation({
    onSuccess: (data) => setDraft(data),
  });
  const templateMutation = trpc.governance.suggestTemplate.useMutation();

  if (!open) return null;

  const readiness = readinessQuery.data;
  const cannotSubmit = !decisionQuestion || decisionQuestion.length < 10 || requestMutation.isPending;

  const handleSubmit = () => {
    requestMutation.mutate({
      threadId,
      decisionQuestion: decisionQuestion.trim(),
      track,
      reversibility,
      suggestedTemplate: (templateMutation.data as any)?.template ?? "consent",
      sunsetAt: sunsetDays > 0 ? new Date(Date.now() + sunsetDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 px-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d2818] border border-[#7dd87d]/40 rounded-2xl shadow-2xl w-full max-w-2xl mb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-[#7dd87d]" />
            <h2 className="text-white font-bold text-lg">Promote to a decision</h2>
          </div>
          <button onClick={onClose} className="text-white/55 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Readiness check */}
          {readinessQuery.isLoading ? (
            <div className="flex items-center gap-2 text-white/65 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking readiness...
            </div>
          ) : readiness ? (
            <div className={`rounded-xl border p-4 ${readiness.ready ? "bg-[#7dd87d]/10 border-[#7dd87d]/40" : "bg-amber-500/10 border-amber-500/40"}`}>
              <div className="flex items-center gap-2 mb-2">
                {readiness.ready ? (
                  <CheckCircle2 className="w-4 h-4 text-[#7dd87d]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-300" />
                )}
                <span className="text-white font-bold text-sm">
                  {readiness.ready ? "Ready to promote" : "Not yet ready"}
                </span>
              </div>
              <ul className="text-xs space-y-1">
                <li className={readiness.ageOk ? "text-[#7dd87d]/85" : "text-amber-200"}>
                  {readiness.ageOk ? "✓" : "○"} Thread is {readiness.ageHours}h old (needs {readiness.thresholds.minThreadAgeHours}h)
                </li>
                <li className={readiness.voicesOk ? "text-[#7dd87d]/85" : "text-amber-200"}>
                  {readiness.voicesOk ? "✓" : "○"} {readiness.uniqueVoiceCount} of {readiness.thresholds.minUniqueVoices} citizens have replied
                </li>
                <li className={decisionQuestion.length >= 10 ? "text-[#7dd87d]/85" : "text-amber-200"}>
                  {decisionQuestion.length >= 10 ? "✓" : "○"} Decision question (below)
                </li>
                <li className="text-[#7dd87d]/85">
                  ✓ Track is {track}
                </li>
              </ul>
            </div>
          ) : null}

          {/* Decision question */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Decision question</label>
            <Textarea
              value={decisionQuestion}
              onChange={(e) => setDecisionQuestion(e.target.value)}
              placeholder="What specifically is being decided? Phrase as a single yes/no, consent, or pick-one."
              rows={3}
              maxLength={500}
              className="bg-white/10 border-white/15 text-white placeholder:text-white/50 resize-none"
            />
            <p className="text-white/55 text-[11px] mt-1">{decisionQuestion.length}/500 · minimum 10 characters</p>
          </div>

          {/* Track */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Track</label>
            <div className="grid sm:grid-cols-3 gap-2">
              {TRACKS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTrack(t.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${
                    track === t.value
                      ? "bg-[#7dd87d]/15 border-[#7dd87d] text-white"
                      : "bg-white/5 border-white/15 text-white/75 hover:bg-white/8"
                  }`}
                >
                  <p className="font-bold text-sm">{t.label}</p>
                  <p className="text-[11px] opacity-75 leading-snug mt-1">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reversibility */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">Reversibility</label>
            <div className="grid sm:grid-cols-3 gap-2">
              {REVERSIBILITY.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReversibility(r.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${
                    reversibility === r.value
                      ? "bg-[#7dd87d]/15 border-[#7dd87d] text-white"
                      : "bg-white/5 border-white/15 text-white/75 hover:bg-white/8"
                  }`}
                >
                  <p className="font-bold text-sm">{r.label}</p>
                  <p className="text-[11px] opacity-75 leading-snug mt-1">{r.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sunset */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-2 block">
              Sunset (optional, in days)
            </label>
            <Input
              type="number"
              min={0}
              max={3650}
              value={sunsetDays}
              onChange={(e) => setSunsetDays(parseInt(e.target.value) || 0)}
              placeholder="0 = no sunset"
              className="bg-white/10 border-white/15 text-white"
            />
            <p className="text-white/55 text-[11px] mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {sunsetDays > 0
                ? `Will create a renewal thread 7 days before sunset (in ${sunsetDays - 7} days)`
                : "No sunset means the decision stays in effect until explicitly overturned"}
            </p>
          </div>

          {/* ReGen Guide */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-amber-200 text-sm font-bold">ReGen Guide can help</span>
            </div>
            <p className="text-white/65 text-xs mb-3">
              Have ReGen Guide read the thread and draft a structured decision page (title, background, options, concerns) for you to edit.
            </p>
            <button
              type="button"
              onClick={() => draftMutation.mutate({ threadId, template: "consent" })}
              disabled={draftMutation.isPending}
              className="text-xs font-bold text-amber-200 hover:text-amber-100 inline-flex items-center gap-1"
            >
              {draftMutation.isPending ? "Drafting..." : "Draft with ReGen Guide"}
              <ArrowRight className="w-3 h-3" />
            </button>
            {draft && (
              <div className="mt-3 bg-black/20 rounded-lg p-3 text-white/75 text-xs space-y-2 max-h-48 overflow-y-auto">
                {draft.title && <p><span className="text-amber-300/80">Title:</span> {draft.title}</p>}
                {draft.background && <p><span className="text-amber-300/80">Background:</span> {draft.background.slice(0, 200)}...</p>}
                {draft.question && <p><span className="text-amber-300/80">Question:</span> {draft.question}</p>}
                {draft.concerns?.length > 0 && (
                  <p><span className="text-amber-300/80">Concerns:</span> {draft.concerns.slice(0, 3).join("; ")}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (draft.question) setDecisionQuestion(draft.question);
                  }}
                  className="text-amber-200 hover:text-amber-100 underline"
                >
                  Use Guide's question
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <p className="text-white/55 text-xs">
            Submitting opens the dual-key window. Another citizen has 24h to co-sign.
          </p>
          <Button
            onClick={handleSubmit}
            disabled={cannotSubmit}
            className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-bold"
          >
            {requestMutation.isPending ? "Submitting..." : "Open dual-key promotion"}
          </Button>
        </div>
      </div>
    </div>
  );
}
