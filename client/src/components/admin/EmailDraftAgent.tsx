/**
 * Writing partner for admin emails. Back-and-forth chat that proposes
 * markdown drafts. Never sends. Recipients stay as a count + status label.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { EMAIL_FIELD_CLASS } from "@/components/admin/EmailMarkdownComposer";
import type { LetterLayout } from "@shared/letterLayout";

const STARTERS = [
  "Write a warmer version of this draft.",
  "Shorten this. Keep the next steps.",
  "Turn the next steps into a numbered list.",
  "Use announcement layout. Put each link on its own line so they become buttons.",
];

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  proposedSubject?: string;
  proposedBody?: string;
  proposedLayout?: LetterLayout;
}

interface Props {
  currentSubject: string;
  currentBody: string;
  currentLayout?: LetterLayout;
  statusLabel: string;
  recipientCount: number;
  onApply: (draft: { subject: string; body: string; layout?: LetterLayout }) => void;
}

export function EmailDraftAgent({
  currentSubject,
  currentBody,
  currentLayout = "plain",
  statusLabel,
  recipientCount,
  onApply,
}: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const draft = trpc.email.draftWithAgent.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, draft.isPending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || draft.isPending) return;
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(nextTurns);
    setInput("");
    try {
      const result = await draft.mutateAsync({
        messages: nextTurns.map((t) => ({ role: t.role, content: t.content })),
        currentSubject,
        currentBody,
        currentLayout,
        statusLabel,
        recipientCount,
      });
      setTurns([
        ...nextTurns,
        {
          role: "assistant",
          content: result.reply,
          proposedSubject: result.subject || undefined,
          proposedBody: result.body || undefined,
          proposedLayout: result.layout || undefined,
        },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "The writing partner could not finish that turn.";
      toast.error(message);
      setTurns(nextTurns.slice(0, -1));
      setInput(trimmed);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[240px] border border-[#4a7c59]/20 rounded-lg bg-[#f8faf8] apply-form-dark">
      <div className="px-3 py-2 border-b border-[#4a7c59]/20">
        <p className="text-sm font-semibold text-[#1a472a] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Write with me
        </p>
        <p className="text-xs text-[#1a472a]/75">
          Talk through the draft. Apply a version when it feels right, then send it yourself.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[140px] max-h-[40vh] md:max-h-[52vh]" aria-live="polite">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => send(starter)}
                className="text-left text-xs px-2 py-1 rounded-full border border-[#4a7c59]/30 text-[#1a472a] bg-white hover:bg-[#f0f7f0] pointer-coarse:min-h-11"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={`${turn.role}-${i}`} className={turn.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[95%] rounded-lg px-2.5 py-1.5 text-sm whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-[#1a472a] text-white"
                  : "bg-white text-[#1a472a] border border-[#4a7c59]/20"
              }`}
            >
              {turn.content}
            </div>
            {turn.role === "assistant" && (turn.proposedSubject || turn.proposedBody || turn.proposedLayout) && (
              <div className="mt-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    onApply({
                      subject: turn.proposedSubject || currentSubject,
                      body: turn.proposedBody || currentBody,
                      layout: turn.proposedLayout,
                    })
                  }
                  className="bg-[#4a7c59] hover:bg-[#3d6849] text-white h-8"
                >
                  Apply to draft
                </Button>
              </div>
            )}
          </div>
        ))}
        {draft.isPending && (
          <p className="text-xs text-[#1a472a]/75 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Drafting...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-2 border-t border-[#4a7c59]/20 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Tell me what to change..."
          className={`${EMAIL_FIELD_CLASS} min-h-[44px] max-h-24 text-sm`}
          rows={2}
          disabled={draft.isPending}
        />
        <Button
          type="submit"
          disabled={draft.isPending || !input.trim()}
          className="bg-[#4a7c59] hover:bg-[#3d6849] text-white self-end h-11"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
