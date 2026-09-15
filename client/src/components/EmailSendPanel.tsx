/**
 * The hardened Harvest email send: preview shows subject + live recipient
 * count and carries a signed token bound to the exact text; Confirm returns
 * that token with an idempotency key, so a double-click is a no-op and any
 * text change since preview is rejected server-side.
 *
 * Mounted on newsletter Drafts cards and on the PublicationReview email
 * target. Same harvest.sendPreview / confirmSend path. Zero new sender.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Send } from "lucide-react";

export function EmailSendPanel({ itemId, onSent }: { itemId: number; onSent: () => void }) {
  const [preview, setPreview] = useState<{ subject: string; recipientCount: number; confirmToken: string } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<string | null>(null);
  const sendPreview = trpc.harvest.sendPreview.useMutation();
  const confirmSend = trpc.harvest.confirmSend.useMutation();

  if (result) return <p className="text-xs text-[#2d5a3d] font-medium py-1">{result}</p>;

  if (!preview) {
    return (
      <div className="flex items-center gap-2 py-1 flex-wrap">
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-[#1a472a]/30 text-[#1a472a]" disabled={sendPreview.isPending}
          onClick={async () => {
            try {
              const p = await sendPreview.mutateAsync({ itemId });
              setPreview({ subject: p.subject, recipientCount: p.recipientCount, confirmToken: p.confirmToken });
            } catch {
              // Message renders below via isError.
            }
          }}>
          {sendPreview.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
          Preview email send
        </Button>
        {sendPreview.isError && <p className="text-xs text-red-700">{sendPreview.error.message}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
      <p className="text-xs text-amber-900">
        <span className="font-semibold">Subject:</span> {preview.subject}
      </p>
      <p className="text-xs text-amber-900">
        This sends to <span className="font-semibold">{preview.recipientCount} subscriber{preview.recipientCount === 1 ? "" : "s"}</span> and cannot be unsent. The confirm is bound to this exact text; if you edit again, preview again.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]" disabled={confirmSend.isPending}
          onClick={async () => {
            try {
              const r = await confirmSend.mutateAsync({ itemId, confirmToken: preview.confirmToken, idempotencyKey });
              setResult(r.duplicate ? "Already sent (double-click caught, nothing re-sent)." : `Sent to ${r.recipientCount} subscribers.`);
              onSent();
            } catch {
              // Message renders below via isError.
            }
          }}>
          {confirmSend.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
          Confirm send to {preview.recipientCount}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#2d5a3d]" onClick={() => setPreview(null)}>Cancel</Button>
      </div>
      {confirmSend.isError && <p className="text-xs text-red-700">{confirmSend.error.message}</p>}
    </div>
  );
}
