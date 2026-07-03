/**
 * ProsConsPanel (ASSEMBLY_PAGE_SPEC.md section 5)
 *
 * The AI-synthesized picture of a forming proposal's conversation: pros and
 * cons with voice counts, the strongest unresolved objection (steelman) with
 * the owner's mark-addressed loop, a refresh button with "synced Xh ago",
 * and the last changelog. Carries an AI provenance line; synthesis text is
 * rendered as plain text only.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Sparkles, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function timeAgoShort(date: string | Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface SynthesisData {
  pros: { point: string; voiceCount: number }[] | null;
  cons: { point: string; voiceCount: number }[] | null;
  steelman: string | null;
  steelmanAddressed: { replyUrl: string; note: string | null; at: string } | null;
  summary: string | null;
  changelog: { at: string; text: string; newVoices?: number; reopenedObjection?: boolean } | null;
  lastSyncedAt: string | Date | null;
}

interface Props {
  proposalId: number;
  synthesis: SynthesisData | null;
  isOwner: boolean;
  isAuthenticated: boolean;
}

export function ProsConsPanel({ proposalId, synthesis, isOwner, isAuthenticated }: Props) {
  const utils = trpc.useUtils();
  const [addressing, setAddressing] = useState(false);
  const [replyUrl, setReplyUrl] = useState("");
  const [note, setNote] = useState("");

  const refresh = trpc.assembly.refreshSynthesis.useMutation({
    onSuccess: (res: any) => {
      if (res.upToDate) {
        toast.info(res.reason ?? "Already up to date.");
      } else if (res.changelog?.text) {
        toast.success(res.changelog.text);
      }
      utils.assembly.forming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markAddressed = trpc.assembly.markObjectionAddressed.useMutation({
    onSuccess: () => {
      setAddressing(false);
      setReplyUrl("");
      setNote("");
      toast.success("Marked addressed. The next refresh re-checks it against the conversation.");
      utils.assembly.forming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const pros = synthesis?.pros ?? [];
  const cons = synthesis?.cons ?? [];

  return (
    <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-3.5 h-3.5 text-[#7dd87d]" />
        <span className="text-white/80 text-xs font-semibold">The conversation, synthesized</span>
        <span className="text-white/45 text-[10px]">by ReGen Guide, from the forum thread</span>
        <span className="ml-auto flex items-center gap-2">
          {synthesis?.lastSyncedAt && (
            <span className="text-white/50 text-[10px]">synced {timeAgoShort(synthesis.lastSyncedAt)}</span>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => refresh.mutate({ proposalId })}
              disabled={refresh.isPending}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7dd87d] hover:text-[#9de89d] transition-colors"
              title="Re-read the conversation and update this summary."
            >
              {refresh.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </button>
          )}
        </span>
      </div>

      {!synthesis ? (
        <p className="text-white/55 text-xs mt-2">
          {isAuthenticated
            ? "No synthesis yet. Refresh to have the Guide read the conversation and lay out the pros, cons, and strongest objection."
            : "No synthesis yet. Signed-in members can generate one from the conversation."}
        </p>
      ) : (
        <>
          {synthesis.summary && (
            <p className="text-white/70 text-xs mt-2 leading-relaxed">{synthesis.summary}</p>
          )}

          {(pros.length > 0 || cons.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-[#7dd87d] text-[10px] font-bold uppercase tracking-wider mb-1.5">For</p>
                <ul className="space-y-1">
                  {pros.map((p, i) => (
                    <li key={i} className="text-white/70 text-xs leading-snug flex gap-2">
                      <span className="text-[#7dd87d]/70 flex-shrink-0">{p.voiceCount}×</span>
                      <span>{p.point}</span>
                    </li>
                  ))}
                  {pros.length === 0 && <li className="text-white/45 text-xs">Nothing yet</li>}
                </ul>
              </div>
              <div>
                <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">Against</p>
                <ul className="space-y-1">
                  {cons.map((c, i) => (
                    <li key={i} className="text-white/70 text-xs leading-snug flex gap-2">
                      <span className="text-amber-300/70 flex-shrink-0">{c.voiceCount}×</span>
                      <span>{c.point}</span>
                    </li>
                  ))}
                  {cons.length === 0 && <li className="text-white/45 text-xs">Nothing yet</li>}
                </ul>
              </div>
            </div>
          )}

          {synthesis.steelman && (
            <div className={`mt-3 rounded-lg border p-2.5 ${synthesis.steelmanAddressed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
              <div className="flex items-start gap-2">
                {synthesis.steelmanAddressed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-white/80">
                    Strongest objection{synthesis.steelmanAddressed ? " · marked addressed" : ""}
                  </p>
                  <p className="text-white/70 text-xs leading-snug">{synthesis.steelman}</p>
                  {synthesis.steelmanAddressed?.note && (
                    <p className="text-emerald-200/80 text-[11px] mt-1">Owner: {synthesis.steelmanAddressed.note}</p>
                  )}
                  {isOwner && !synthesis.steelmanAddressed && (
                    addressing ? (
                      <div className="mt-2 space-y-1.5">
                        <input
                          type="text"
                          value={replyUrl}
                          onChange={(e) => setReplyUrl(e.target.value)}
                          placeholder="/community/post/123 (the reply that resolves it)"
                          className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/40"
                        />
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={300}
                          placeholder="How it was addressed (optional)"
                          className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/40"
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => markAddressed.mutate({ proposalId, replyUrl: replyUrl.trim(), note: note.trim() || undefined })}
                            disabled={markAddressed.isPending || !replyUrl.trim()}
                            className="text-[11px] font-bold text-[#7dd87d] hover:text-[#9de89d] transition-colors"
                          >
                            {markAddressed.isPending ? "Saving..." : "Mark addressed"}
                          </button>
                          <button type="button" onClick={() => setAddressing(false)} className="text-[11px] text-white/60 hover:text-white/80">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddressing(true)}
                        className="mt-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors"
                      >
                        Mark addressed
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {synthesis.changelog?.text && (
            <p className="text-white/45 text-[10px] mt-2">
              Last sync: {synthesis.changelog.text}
              {synthesis.changelog.reopenedObjection && " (the objection re-opened)"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
