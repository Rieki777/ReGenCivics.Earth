/**
 * PromotionModal
 *
 * The "Promote to decision" flow on a forum thread. Walks the proposer through:
 *   1. Readiness check (4 gates from governance.checkPromotionReadiness)
 *   2. Decision question + track + sunset + reversibility
 *   3. ReGen Guide template suggestion + draft button (optional)
 *   4. Submit -> creates a forumPromotionRequests row, waits for co-signer
 *
 * Desktop: split-screen layout (thread preview left, form right).
 * Mobile: single-column with thread context collapsed.
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md sections 1.1-1.7
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X, Vote, CheckCircle2, AlertCircle, Clock, Sparkles, ArrowRight, Loader2,
  ChevronDown, ChevronUp, PartyPopper, MessageSquare,
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

type SubmitState = "idle" | "submitting" | "success" | "error";

export function PromotionModal({ threadId, open, onClose, onSubmitted }: Props) {
  const [decisionQuestion, setDecisionQuestion] = useState("");
  const [track, setTrack] = useState<"fund" | "game" | "both">("game");
  const [reversibility, setReversibility] = useState<"reversible" | "semi_reversible" | "one_way_door">("reversible");
  const [sunsetDays, setSunsetDays] = useState<number>(0);
  const [draft, setDraft] = useState<any>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [threadExpanded, setThreadExpanded] = useState(false);

  const readinessQuery = trpc.governance.checkPromotionReadiness.useQuery({ threadId }, { enabled: open });

  // Fetch thread content for the left-side preview
  const threadQuery = trpc.forum.postById.useQuery(
    { id: threadId },
    { enabled: open, staleTime: 60_000 },
  );

  const requestMutation = trpc.governance.requestPromotion.useMutation({
    onSuccess: () => {
      setSubmitState("success");
      onSubmitted?.();
    },
    onError: () => {
      setSubmitState("error");
    },
  });
  const draftMutation = trpc.governance.draftDecision.useMutation({
    onSuccess: (data) => setDraft(data),
  });
  const templateMutation = trpc.governance.suggestTemplate.useMutation();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSubmitState("idle");
    }
  }, [open]);

  // Lock the underlying page scroll while the modal is open so the user
  // doesn't see a second browser-level scrollbar next to the modal's own
  // inner scrollbar (the "dual scrollbar" bug). Restore on close.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Preserve layout width by padding for the scrollbar we're hiding.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  const readiness = readinessQuery.data;

  // Gate the submit button: all readiness checks must pass AND question must be filled
  const readinessGatesFailed = readiness && (!readiness.ageOk || !readiness.voicesOk);
  const questionTooShort = !decisionQuestion || decisionQuestion.length < 10;
  const cannotSubmit = questionTooShort || readinessGatesFailed || requestMutation.isPending || submitState === "success";

  const handleSubmit = () => {
    setSubmitState("submitting");
    requestMutation.mutate({
      threadId,
      decisionQuestion: decisionQuestion.trim(),
      track,
      reversibility,
      suggestedTemplate: (templateMutation.data as any)?.template ?? "consent",
      sunsetAt: sunsetDays > 0 ? new Date(Date.now() + sunsetDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
    });
  };

  const handleClose = () => {
    if (submitState === "success") {
      // Already submitted, just close
      onClose();
      return;
    }
    onClose();
  };

  const thread = threadQuery.data as any;
  const replies = (thread?.replies ?? []).slice(0, 8);

  // Success view
  if (submitState === "success") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={handleClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className="relative bg-[#0d2818] border border-[#7dd87d]/40 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-8 h-8 text-[#7dd87d]" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Promotion request submitted</h2>
          <p className="text-white/65 text-sm mb-2">
            The dual-key window is now open. Another citizen has 24 hours to co-sign this promotion request.
          </p>
          <p className="text-white/50 text-xs mb-6">
            Once co-signed, the thread will be promoted to a formal decision on ReGen Gov, where all citizens can participate in the vote.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-6 text-left">
            <p className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-1">Your decision question</p>
            <p className="text-white/80 text-sm">{decisionQuestion}</p>
          </div>
          <Button onClick={handleClose} className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-6 md:pt-10 px-4 overflow-hidden"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Split-screen layout: thread left, form right on desktop.
          max-h is clamped to the viewport on all sizes so the modal
          never relies on the outer page to provide scroll (which would
          stack a second scrollbar alongside the panel's own). */}
      <div
        className="relative bg-[#0d2818] border border-[#7dd87d]/40 rounded-2xl shadow-2xl w-full max-w-5xl mb-6 flex flex-col md:flex-row max-h-[calc(100dvh-3rem)] md:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left panel: thread preview (desktop only, collapsible on mobile) */}
        <div className="md:w-[45%] md:border-r border-white/10 md:overflow-y-auto md:min-h-0 [scrollbar-gutter:stable]">
          {/* Mobile: collapsible header */}
          <button
            type="button"
            onClick={() => setThreadExpanded(!threadExpanded)}
            className="md:hidden w-full flex items-center justify-between px-5 py-3 border-b border-white/10 text-white/70 text-xs font-bold uppercase tracking-widest"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Thread context
            </span>
            {threadExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Desktop: always visible header */}
          <div className="hidden md:flex items-center gap-2 px-5 py-3 border-b border-white/10 text-white/70 text-xs font-bold uppercase tracking-widest">
            <MessageSquare className="w-3.5 h-3.5 text-[#7dd87d]" /> Thread context
          </div>

          {/* Thread content */}
          <div className={`${threadExpanded ? "block" : "hidden"} md:block p-4 space-y-3`}>
            {threadQuery.isLoading ? (
              <p className="text-white/50 text-xs">Loading thread...</p>
            ) : thread ? (
              <>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white font-bold text-sm mb-1">{thread.title}</p>
                  <p className="text-white/60 text-xs line-clamp-6 whitespace-pre-wrap">{thread.content?.slice(0, 600) ?? ""}</p>
                  {thread.authorName && (
                    <p className="text-[#7dd87d]/70 text-[10px] mt-2 font-semibold">by {thread.authorName}</p>
                  )}
                </div>
                {replies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Replies ({replies.length}{replies.length >= 8 ? "+" : ""})
                    </p>
                    {replies.map((r: any, i: number) => (
                      <div key={r.id ?? i} className="bg-white/[0.03] rounded-lg p-2.5">
                        <p className="text-white/50 text-[10px] font-bold mb-0.5">{r.authorName ?? "Citizen"}</p>
                        <p className="text-white/65 text-xs line-clamp-3 whitespace-pre-wrap">{r.content?.slice(0, 250) ?? ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-white/40 text-xs">Could not load thread.</p>
            )}
          </div>
        </div>

        {/* Right panel: promotion form.
            No overflow on this container. Scroll lives exactly ONCE on the
            inner content area below (shrink-0 header, flex-1 overflow-y-auto
            body, shrink-0 footer). Combined with the parent's overflow-hidden
            + max-h clamp, this guarantees a single scrollbar inside the modal
            and no outer page scrollbar alongside it. */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-[#7dd87d]" />
              <h2 className="text-white font-bold text-lg">Promote to a decision</h2>
            </div>
            <button onClick={handleClose} className="text-white/55 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1 overflow-y-auto [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
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
                {readinessGatesFailed && (
                  <p className="text-amber-200/80 text-[11px] mt-2 border-t border-amber-500/20 pt-2">
                    The thread needs to meet the minimum requirements above before it can be promoted. You can still draft the decision question below and come back later.
                  </p>
                )}
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

            {/* Error banner */}
            {submitState === "error" && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-200 text-sm font-bold">Submission failed</p>
                  <p className="text-red-200/70 text-xs">
                    {requestMutation.error?.message ?? "Something went wrong. Try again or check your connection."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
            <p className="text-white/55 text-xs max-w-[55%]">
              {readinessGatesFailed
                ? "Minimum requirements must be met before submitting."
                : "Submitting opens the dual-key window. Another citizen has 24h to co-sign."}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={cannotSubmit}
              className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {requestMutation.isPending ? "Submitting..." : "Open dual-key promotion"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
