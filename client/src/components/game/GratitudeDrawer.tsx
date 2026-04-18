/**
 * GratitudeDrawer - Send gratitude tokens to another player.
 * Leaf-shaped tokens, message field, budget display.
 */
import { useState } from "react";
import { X, Send, Leaf } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  recipientId: number;
  recipientName: string;
  onClose: () => void;
}

export function GratitudeDrawer({ recipientId, recipientName, onClose }: Props) {
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { data: budget } = trpc.game.myGratitudeBudget.useQuery();
  const sendMutation = trpc.game.sendGratitude.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success(`Gratitude sent to ${recipientName}`);
      setTimeout(onClose, 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const remaining = budget ? budget.remaining : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#faf8f3] rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-xl" style={{ maxHeight: "60vh" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[#2d2a26] font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Send Gratitude
          </h3>
          <button onClick={onClose} className="text-[#1a472a]/40 hover:text-[#1a472a]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#1a472a]/70">to {recipientName}</p>

        {/* Leaf token selector */}
        <div className="flex gap-2 justify-center py-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setAmount(n)}
              disabled={n > remaining}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                n <= amount
                  ? "bg-[#7c9a7e] text-white scale-110"
                  : n > remaining
                  ? "bg-[#1a472a]/5 text-[#1a472a]/20 cursor-not-allowed"
                  : "bg-[#7c9a7e]/10 text-[#7c9a7e] hover:bg-[#7c9a7e]/20"
              }`}
            >
              <Leaf className="w-5 h-5" />
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-[#1a472a]/40">{remaining} of {budget?.total ?? 0} remaining this season</p>

        {/* Message */}
        <div className="relative">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What are you grateful for?"
            maxLength={280}
            rows={3}
            className="w-full bg-white border border-[#1a472a]/10 rounded-xl px-3 py-2.5 text-sm text-[#2d2a26] placeholder:text-[#1a472a]/30 outline-none focus:ring-1 focus:ring-[#7c9a7e]/50 resize-none"
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-[#1a472a]/30">{message.length}/280</span>
        </div>

        <button
          onClick={() => sendMutation.mutate({ receiverId: recipientId, amount, message })}
          disabled={!message.trim() || sendMutation.isPending || sent || remaining < amount}
          className="w-full py-3 rounded-xl bg-[#7c9a7e] text-white font-semibold text-sm hover:bg-[#6a8a6e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {sent ? "Sent" : sendMutation.isPending ? "Sending..." : <><Send className="w-4 h-4" /> Send Gratitude</>}
        </button>
      </div>
    </div>
  );
}
