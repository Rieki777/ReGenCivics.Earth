/**
 * "Withdraw this offer?" (build spec 2026-09-27, sections 10.4 and 10.6).
 * One dialog for the offer status page and for Your contributions, so the
 * words and the two choices are the same in both places. The caller does the
 * withdrawing; this only asks.
 */
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LINK } from "@shared/crowdpoolCopy";

export function WithdrawOfferDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
  /** A refusal from the server, shown inside the dialog. */
  error?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="max-w-md bg-white text-[#1a472a] light-form-island">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a] text-left pr-12 sm:pr-0">{LINK.withdrawTitle}</DialogTitle>
          <DialogDescription className="text-[#1a472a]/85 text-left">{LINK.withdrawBody}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3" role="alert">{error}</p>
        )}
        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="min-h-11 border-[#4a7c59] text-[#1a472a]"
          >
            {LINK.withdrawKeep}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="min-h-11 bg-[#1a472a] hover:bg-[#0f2e1a] text-white"
          >
            {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {LINK.withdrawConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
