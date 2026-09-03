import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

export function AdminApplicationReviewForm({
  applicationId,
  onSaved,
}: {
  applicationId: number;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [decision, setDecision] = useState<"approve" | "reject" | "request_changes" | "pending">("pending");
  const [comments, setComments] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [alignmentScore, setAlignmentScore] = useState(3);
  const [readinessScore, setReadinessScore] = useState(3);
  const [impactScore, setImpactScore] = useState(3);
  const [teamScore, setTeamScore] = useState(3);

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.applications.getById.invalidate({ id: applicationId });
      utils.reviews.getByApplicationId.invalidate({ applicationId });
      utils.applications.list.invalidate();
      setComments("");
      setInternalNotes("");
      setDecision("pending");
      toast({
        title: "Review saved",
        description: "The applicant will be notified.",
      });
      onSaved?.();
    },
    onError: (err) => {
      toast({ title: "Could not save review", description: err.message, variant: "destructive" });
    },
  });

  const scoreSelect = (label: string, value: number, set: (n: number) => void) => (
    <div>
      <Label className="text-[#1a472a]">{label}</Label>
      <Select value={String(value)} onValueChange={(v) => set(parseInt(v, 10))}>
        <SelectTrigger className="mt-1 bg-white text-[#1a472a] border-[#1a472a]/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCORE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!comments.trim()) {
          toast({
            title: "Comments required",
            description: "Write the note the applicant will see.",
            variant: "destructive",
          });
          return;
        }
        createReview.mutate({
          applicationId,
          decision,
          comments,
          internalNotes: internalNotes || undefined,
          alignmentScore,
          readinessScore,
          impactScore,
          teamScore,
        });
      }}
    >
      <div>
        <Label htmlFor="decision" className="text-[#1a472a] font-medium">Decision</Label>
        <Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)}>
          <SelectTrigger id="decision" className="mt-1 bg-white text-[#1a472a] border-[#1a472a]/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approve">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Approve
              </span>
            </SelectItem>
            <SelectItem value="request_changes">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                Request changes
              </span>
            </SelectItem>
            <SelectItem value="reject">
              <span className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Reject
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="comments" className="text-[#1a472a] font-medium">Comments for the applicant</Label>
        <Textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Feedback the applicant will read"
          rows={5}
          className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/30"
        />
      </div>
      <div>
        <Label htmlFor="internalNotes" className="text-[#1a472a] font-medium">Internal notes</Label>
        <Textarea
          id="internalNotes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Private, admin only"
          rows={3}
          className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/30"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {scoreSelect("Alignment", alignmentScore, setAlignmentScore)}
        {scoreSelect("Readiness", readinessScore, setReadinessScore)}
        {scoreSelect("Impact", impactScore, setImpactScore)}
        {scoreSelect("Team", teamScore, setTeamScore)}
      </div>
      <Button
        type="submit"
        disabled={createReview.isPending}
        className="w-full min-h-11 bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
      >
        {createReview.isPending ? "Saving" : "Save review"}
      </Button>
    </form>
  );
}
