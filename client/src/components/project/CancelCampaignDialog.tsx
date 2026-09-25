/**
 * Cancel a campaign. Stewards cancel their own (draft, in review or live);
 * campaigns.cancel checks on the server and server/lib/campaign-cancel.ts
 * closes open offers, tells everyone involved and suggests other campaigns.
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";

export function cancelSuccessMessage(r: { notified: number; emailQueued: number }): string {
  return `Cancelled. We told ${r.notified} ${r.notified === 1 ? "person" : "people"} in their notifications and are emailing ${r.emailQueued} more. Email followers hear from the ReGen Civics team.`;
}

export function CancelCampaignDialog({
  campaignId,
  campaignTitle,
  onCancelled,
}: {
  campaignId: number;
  campaignTitle: string;
  /** Called with the message to show; the page keeps it after this section goes away. */
  onCancelled: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const mutation = trpc.campaigns.cancel.useMutation({
    onSuccess: (r) => {
      const msg = r.alreadyCancelled ? "This campaign was already cancelled." : cancelSuccessMessage(r);
      setDone(msg);
      toast.success(msg);
      setOpen(false);
      onCancelled(msg);
    },
    onError: (err) => setError(err.message || "That didn't go through. Try again."),
  });

  return (
    <div>
      <p className="text-sm text-[#1a472a]/80 mb-3">
        Cancelling closes every offer that is waiting or accepted and tells everyone involved. Delivered contributions stay on the record. This can't be undone.
      </p>
      {done && <p className="text-sm text-[#1a472a] bg-[#f0f7f0] rounded-lg p-3 mb-3" role="status">{done}</p>}
      <Button
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50"
        onClick={() => { setError(null); setUnderstood(false); setOpen(true); }}
      >
        Cancel this campaign
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!mutation.isPending) setOpen(o); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-[#1a472a] light-form-island">
          <DialogHeader>
            <DialogTitle className="text-red-700">Cancel {campaignTitle}?</DialogTitle>
            <DialogDescription>
              Cancelling closes every offer that is waiting or accepted and tells everyone involved. Delivered contributions stay on the record. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-message">A message for everyone involved (optional)</Label>
              <Textarea
                id="cancel-message"
                value={message}
                maxLength={2000}
                rows={4}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, and where people could put their energy now."
              />
              <p className="text-xs text-[#1a472a]/70">
                It goes to everyone involved and stays on the project page as the campaign's last update. Email followers hear from the ReGen Civics team.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cancel-understood" checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} />
              <Label htmlFor="cancel-understood" className="text-sm font-normal leading-snug">
                I understand this can't be undone
              </Label>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Keep the campaign</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!understood || mutation.isPending}
              onClick={() => { setError(null); mutation.mutate({ id: campaignId, message: message.trim() || undefined }); }}
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</> : "Cancel campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
