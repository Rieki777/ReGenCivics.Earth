/**
 * The steward's action dialog for one offer: accept (at hours, on an hours
 * need), decline, mark delivered, send thanks, release, or change hours.
 *
 * On an hours need the hours field is checked live with the same rule the
 * server enforces (shared/roleCapacity.ts checkAcceptHours). The server has
 * the last word: its message shows here when it refuses, for example when
 * another steward accepted someone a moment earlier.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { MAX_ROLE_HOURS, checkAcceptHours, isHoursNeed } from "@shared/roleCapacity";
import { hoursDialogNumbers, stewardActionDescription } from "@shared/stewardQueue";
import { titleForItem } from "@/lib/needDisplay";
import type { CampaignNeed, ContributionAction, OwnerContribution } from "./ContributionCard";

const TITLES: Record<ContributionAction, string> = {
  accept: "Accept this offer",
  reject: "Decline this offer",
  deliver: "Mark delivered",
  thanks: "Send thanks",
  release: "Release this place",
  hours: "Change hours",
};

const BUTTONS: Record<ContributionAction, string> = {
  accept: "Accept",
  reject: "Decline",
  deliver: "Mark delivered",
  thanks: "Send thanks",
  release: "Release",
  hours: "Save hours",
};

const DONE: Record<ContributionAction, string> = {
  accept: "Accepted. They'll hear from you.",
  reject: "Declined. They'll hear from you.",
  deliver: "Marked delivered.",
  thanks: "Thanks sent.",
  release: "Released. The place is open again.",
  hours: "Hours saved.",
};

const BUTTON_CLASSES: Record<ContributionAction, string> = {
  accept: "bg-green-600 hover:bg-green-700",
  reject: "bg-red-600 hover:bg-red-700",
  deliver: "bg-emerald-600 hover:bg-emerald-700",
  thanks: "bg-purple-600 hover:bg-purple-700",
  release: "bg-gray-700 hover:bg-gray-800",
  hours: "bg-[#4a7c59] hover:bg-[#1a472a]",
};

/** Parse a whole-hours field. Anything that is not a whole number reads NaN. */
function parseWholeHours(raw: string): number {
  const t = raw.trim();
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

export function AcceptDialog({
  contribution,
  action,
  need,
  formatCurrency,
  onClose,
  onDone,
}: {
  contribution: OwnerContribution | null;
  action: ContributionAction | null;
  need: CampaignNeed | null;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onDone: () => void;
}) {
  const open = !!contribution && !!action;
  const hoursNeed = isHoursNeed(need);
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hoursRaw, setHoursRaw] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset the form each time a new offer or action opens the dialog. Accept
  // defaults to what they offered; Change hours to what they hold now.
  useEffect(() => {
    if (!contribution || !action) return;
    setNote("");
    setImageUrl("");
    setServerError(null);
    if (action === "accept") setHoursRaw(String(contribution.hoursPerWeek ?? contribution.quantityPledged ?? ""));
    else if (action === "hours") setHoursRaw(String(contribution.quantityPledged ?? ""));
    else setHoursRaw("");
  }, [contribution?.id, action]);

  const name = decodeBasicEntities(contribution?.contributorName ?? "them");
  const roleTitle = need ? decodeBasicEntities(titleForItem(need)) : "";
  // The role's numbers, leaving out this offer's own hours when it already
  // holds a place (shared/stewardQueue.ts, tested).
  const fill = need && hoursNeed && contribution ? hoursDialogNumbers(need, contribution) : null;
  const standingExcludingThis = fill?.standingExcludingThis ?? 0;

  const asksHours = hoursNeed && (action === "accept" || action === "hours");
  const hours = parseWholeHours(hoursRaw);
  const openHours = fill?.maxHours ?? 0;
  const check = asksHours && fill
    ? checkAcceptHours({ requested: hours, neededHours: fill.needed, standingExcludingThis })
    : { ok: true as const };

  const statusMutation = trpc.campaigns.updateContributionStatus.useMutation();
  const hoursMutation = trpc.campaigns.setAcceptedHours.useMutation();
  const pending = statusMutation.isPending || hoursMutation.isPending;

  const handleError = (err: { message?: string }) => {
    const msg = err?.message || "That didn't go through. Try again.";
    setServerError(msg);
    toast.error(msg);
    // The server refused, often because someone else changed the role a
    // moment ago. Refresh the page's numbers so the open-hours line catches up.
    onDone();
  };
  const handleSuccess = () => {
    if (action) toast.success(DONE[action]);
    onDone();
    onClose();
  };

  const submit = () => {
    if (!contribution || !action) return;
    setServerError(null);
    if (asksHours && !check.ok) return;
    if (action === "thanks" && !note.trim()) {
      setServerError("A thank-you needs a note. Tell them what their contribution made possible.");
      return;
    }
    if (action === "hours") {
      hoursMutation.mutate({ contributionId: contribution.id, hours }, { onSuccess: handleSuccess, onError: handleError });
      return;
    }
    const status = ({ accept: "accepted", reject: "rejected", deliver: "fulfilled", thanks: "thanked", release: "released" } as const)[action];
    statusMutation.mutate(
      {
        contributionId: contribution.id,
        status,
        ownerNotes: action !== "thanks" ? (note.trim() || undefined) : undefined,
        acknowledgedNote: action === "thanks" ? note.trim() : undefined,
        acknowledgedImageUrl: action === "thanks" ? (imageUrl.trim() || undefined) : undefined,
        acceptedHours: action === "accept" && hoursNeed ? hours : undefined,
      },
      { onSuccess: handleSuccess, onError: handleError },
    );
  };

  // People without an account get the three direct emails (accepted,
  // declined, delivered) and nothing for thanks or release (spec 6.3), so
  // the dialog says who will hear and who the steward should tell themselves.
  const description = action
    ? stewardActionDescription({
        action,
        hoursNeed,
        hasAccount: !!contribution?.userId,
        name,
        roleTitle,
        heldHours: contribution?.quantityPledged ?? null,
      })
    : "";

  const noteLabel = action === "thanks"
    ? "Thank-you note (required)"
    : action === "hours" ? null : `A note to ${name} (optional)`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-[#1a472a] light-form-island">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a]">{action ? TITLES[action] : ""}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {contribution && action && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 min-w-0">
              <p className="font-medium text-[#1a472a] break-words">{decodeBasicEntities(contribution.title)}</p>
              <p className="text-sm text-gray-600 break-words">From {name}</p>
              {hoursNeed && (
                <p className="text-sm text-gray-600">Offered {contribution.hoursPerWeek ?? contribution.quantityPledged} hours a week</p>
              )}
              <p className="text-sm font-bold text-[#4a7c59]">Value {formatCurrency(contribution.estimatedValue)}</p>
            </div>

            {asksHours && fill && (
              <div className="space-y-2">
                <Label htmlFor="accept-hours">
                  {action === "accept" ? "Accept at how many hours a week?" : "Hours a week they hold"}
                </Label>
                <Input
                  id="accept-hours"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={hoursRaw}
                  onChange={(e) => { setHoursRaw(e.target.value.replace(/[^\d]/g, "").slice(0, String(MAX_ROLE_HOURS).length)); setServerError(null); }}
                  aria-invalid={!check.ok}
                  aria-describedby="accept-hours-help"
                />
                <p id="accept-hours-help" className="text-sm text-[#1a472a]/80">
                  {action === "hours"
                    ? `${fill.openNow} of ${fill.needed} hours a week are open now, so ${name} can hold up to ${openHours}.`
                    : `${openHours} of ${fill.needed} hours a week are still open.`}
                </p>
                {!check.ok && hoursRaw !== "" && (
                  <p className="text-sm text-red-600" role="alert">{check.message}</p>
                )}
              </div>
            )}

            {noteLabel && (
              <div className="space-y-2">
                <Label htmlFor="steward-note">{noteLabel}</Label>
                <Textarea
                  id="steward-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={
                    action === "accept" ? "Welcome aboard. We'll be in touch about the details." :
                    action === "reject" ? "Thank you for offering. Right now we..." :
                    action === "deliver" ? "Arrived in great shape, already in use." :
                    action === "release" ? "Thank you for the time you gave." :
                    "Your tractor turned the whole east field this week. Here is what that made possible."
                  }
                />
              </div>
            )}

            {action === "thanks" && (
              <div className="space-y-2">
                <Label htmlFor="thanks-image">Photo link (optional)</Label>
                <Input
                  id="thanks-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... a photo of their contribution at work"
                />
              </div>
            )}

            {serverError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>Not now</Button>
          <Button
            onClick={submit}
            disabled={pending || (asksHours && (hoursRaw === "" || !check.ok))}
            className={action ? BUTTON_CLASSES[action] : ""}
          >
            {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : action ? BUTTONS[action] : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
