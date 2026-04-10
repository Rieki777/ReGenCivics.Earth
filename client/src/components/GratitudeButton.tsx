/**
 * GratitudeButton: small inline button for sending a "thank you" message
 * to another user. Lives next to forum reactions and on profile pages.
 *
 * If the recipient is the current user, the button is hidden.
 * If the user is signed out, the button prompts sign-in.
 */
import { useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Props = {
  recipientHandle?: string | null;
  sourceType?: "forum_post" | "forum_reply" | "profile" | "command_center";
  sourceId?: number;
  /** Compact icon-only button. Default false (icon + label). */
  compact?: boolean;
};

export function GratitudeButton({ recipientHandle, sourceType, sourceId, compact = false }: Props) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const sendMutation = trpc.gratitude.send.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1500);
    },
  });

  // Don't show on yourself, system accounts, or when there's no handle to send to
  const SYSTEM_HANDLES = ["regen-civics-team", "regen-guide", "regen-guide-system", "system", "admin"];
  if (!recipientHandle) return null;
  if (SYSTEM_HANDLES.includes(recipientHandle.toLowerCase())) return null;
  if (user && user.handle === recipientHandle) return null;

  const handleClick = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setOpen((s) => !s);
  };

  const handleSubmit = () => {
    if (message.trim().length < 3) return;
    sendMutation.mutate({
      recipientHandle,
      message: message.trim(),
      sourceType,
      sourceId,
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-500/90 to-amber-400/90 hover:from-amber-400 hover:to-amber-300 text-[#1a472a] shadow-lg shadow-amber-500/20 hover:shadow-amber-400/40 ring-1 ring-amber-300/40 hover:ring-amber-200 transition-all"
        aria-label="Send gratitude"
      >
        <Sparkles className="w-4 h-4" />
        {!compact && (
          <span className="inline-flex items-center gap-1">
            Gratitude
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        )}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-[#0f2a1a] border border-amber-300/30 px-3 py-2 text-[11px] leading-snug text-amber-100 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 shadow-xl"
        >
          Sending gratitude is your way of distributing a shared budget to people you think should get it.
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 bg-[#1a472a] border border-[#7dd87d]/30 rounded-xl shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#7dd87d] font-medium">Send gratitude to @{recipientHandle}</span>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white" aria-label="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {sent ? (
            <div className="text-amber-300 text-sm py-3 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-1" />
              Sent!
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are you grateful for?"
                rows={3}
                maxLength={500}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/55 outline-none focus:border-[#7dd87d]/50 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/65">{message.length}/500</span>
                <button
                  onClick={handleSubmit}
                  disabled={message.trim().length < 3 || sendMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/80 hover:bg-amber-500 text-[#1a472a] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3" />
                  {sendMutation.isPending ? "Sending..." : "Send"}
                </button>
              </div>
              {sendMutation.error && (
                <p className="text-red-400 text-[11px] mt-2">{sendMutation.error.message}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
