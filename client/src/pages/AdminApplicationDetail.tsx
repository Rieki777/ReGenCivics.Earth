import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Loader2, XCircle, AlertCircle, Send } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import { useToast } from "@/hooks/use-toast";
import { adminStatusChipClass } from "@/lib/adminContrast";

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

export default function AdminApplicationDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/application/:id");
  const { toast } = useToast();
  const applicationId = params?.id ? parseInt(params.id) : null;

  const [decision, setDecision] = useState<"approve" | "reject" | "request_changes" | "pending">("pending");
  const [comments, setComments] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [alignmentScore, setAlignmentScore] = useState<number>(3);
  const [readinessScore, setReadinessScore] = useState<number>(3);
  const [impactScore, setImpactScore] = useState<number>(3);
  const [teamScore, setTeamScore] = useState<number>(3);

  const utils = trpc.useUtils();
  const { data: application, isLoading } = trpc.applications.getById.useQuery(
    { id: applicationId! },
    { enabled: !!applicationId && !!user && user.role === "admin" }
  );

  const { data: reviews } = trpc.reviews.getByApplicationId.useQuery(
    { applicationId: applicationId! },
    { enabled: !!applicationId && !!user }
  );

  const createReviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.applications.getById.invalidate({ id: applicationId! });
      utils.reviews.getByApplicationId.invalidate({ applicationId: applicationId! });
      utils.applications.list.invalidate();
      toast({
        title: "Review Submitted",
        description: "Your review has been saved and the applicant will be notified.",
      });
      // Reset form
      setComments("");
      setInternalNotes("");
      setDecision("pending");
    },
  });

  if (authLoading || isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
          >
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Access Denied</h2>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Application Not Found</h2>
          <Button
            onClick={() => navigate("/admin/applications")}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
          >
            Back to Applications
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!comments.trim()) {
      toast({
        title: "Comments Required",
        description: "Please provide feedback comments for the applicant.",
        variant: "destructive",
      });
      return;
    }

    await createReviewMutation.mutateAsync({
      applicationId: applicationId!,
      decision,
      comments,
      internalNotes: internalNotes || undefined,
      alignmentScore,
      readinessScore,
      impactScore,
      teamScore,
    });
  };

  const InfoSection = ({ title, content }: { title: string; content: string | number }) => (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[#1a472a] mb-1">{title}</h3>
      <p className="text-[#1a472a]/80 whitespace-pre-wrap">{content || "Not provided"}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-12">
      <BackButton />
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/applications")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#1a472a] mb-2">
                {application.projectName}
              </h1>
              <div className="flex items-center gap-4 text-[#1a472a]/75">
                <span>{application.location}</span>
                <span>•</span>
                <span className="capitalize">{application.projectType.replace("_", " ")}</span>
                {application.submittedAt && (
                  <>
                    <span>•</span>
                    <span>Submitted {new Date(application.submittedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-[#1a472a]/80 mb-1">Status</div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold uppercase tracking-wide ${adminStatusChipClass(application.status)}`}>
                {application.status.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Application Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-white">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-6">Application Details</h2>

              <InfoSection title="Project Vision" content={application.vision} />
              <InfoSection title="Land Status" content={application.landStatus.replace("_", " ")} />
              
              {/* Project Size & Community Metrics */}
              {application.projectSizeHectares && (
                <InfoSection title="Project Size" content={`${application.projectSizeHectares} hectares`} />
              )}
              {application.currentPeopleCount && (
                <InfoSection title="Current Community Size" content={`${application.currentPeopleCount} people / ${application.currentHouseholdCount || 0} households`} />
              )}
              {application.intendedPeopleCount && (
                <InfoSection title="Intended Community Size" content={`${application.intendedPeopleCount} people / ${application.intendedHouseholdCount || 0} households`} />
              )}
              {application.mixedUse && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#1a472a] mb-1">Mixed Use Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const uses = JSON.parse(application.mixedUse);
                        return uses.map((use: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-[#f0f7f0] text-[#4a7c59] rounded text-sm capitalize">
                            {use}
                          </span>
                        ));
                      } catch {
                        return <span className="text-[#1a472a]/80">Not specified</span>;
                      }
                    })()}
                  </div>
                </div>
              )}
              <InfoSection title="Team Size" content={application.teamSize} />
              <InfoSection title="Team Description" content={application.teamDescription} />
              <InfoSection title="Regenerative Practices" content={application.regenerativePractices} />
              <InfoSection title="Governance Approach" content={application.governanceApproach} />
              <InfoSection title="Community Engagement" content={application.communityEngagement} />
              <InfoSection title="Time Commitment" content={application.timeCommitment} />
              {application.currentFunding && (
                <InfoSection title="Current Funding" content={application.currentFunding} />
              )}
              <InfoSection title="Funding Needs" content={application.fundingNeeds} />
              
              {application.websiteUrl && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#1a472a] mb-1">Website</h3>
                  <a
                    href={application.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a7c59] hover:underline"
                  >
                    {application.websiteUrl}
                  </a>
                </div>
              )}

              {application.videoUrl && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#1a472a] mb-1">Video</h3>
                  <a
                    href={application.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a7c59] hover:underline"
                  >
                    {application.videoUrl}
                  </a>
                </div>
              )}

              {application.additionalNotes && (
                <InfoSection title="Additional Notes" content={application.additionalNotes} />
              )}

              {/* File Attachments Preview */}
              {application.documentsUrl && (
                <div className="mt-6 pt-6 border-t border-[#1a472a]/10">
                  <h3 className="text-lg font-bold text-[#1a472a] mb-4">Uploaded Documents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(() => {
                      try {
                        const urls = JSON.parse(application.documentsUrl);
                        return urls.map((file: { url: string; fileName: string }, index: number) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
                          const isPdf = /\.pdf$/i.test(file.fileName);
                          return (
                            <a
                              key={index}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block p-3 bg-[#f0ebe3] rounded-lg border-2 border-transparent hover:border-[#7dd87d] transition-colors"
                            >
                              {isImage ? (
                                <div className="aspect-video mb-2 rounded overflow-hidden bg-white">
                                  <img
                                    src={file.url}
                                    alt={file.fileName}
                                    className="w-full h-full object-cover"
                                  loading="lazy" />
                                </div>
                              ) : (
                                <div className="aspect-video mb-2 rounded bg-white flex items-center justify-center">
                                  {isPdf ? (
                                    <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                                      <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
                                    </svg>
                                  ) : (
                                    <svg className="w-12 h-12 text-[#1a472a]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              <p className="text-sm text-[#1a472a] truncate group-hover:text-[#4a7c59]">
                                {file.fileName}
                              </p>
                            </a>
                          );
                        });
                      } catch {
                        return <p className="text-[#1a472a]/80 col-span-full">No documents uploaded</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </Card>

            {/* Conversation with the Gardener (chat-first /apply). Richer
                signal than the extracted fields: how the applicant actually
                talked about their project. */}
            {application.companionTranscript && (() => {
              let turns: Array<{ role: string; content: string }> = [];
              try {
                const parsed = JSON.parse(application.companionTranscript);
                if (Array.isArray(parsed)) turns = parsed;
              } catch { /* unreadable transcript, skip */ }
              if (turns.length === 0) return null;
              return (
                <Card className="p-6 bg-white">
                  <details>
                    <summary className="cursor-pointer text-2xl font-bold text-[#1a472a]">
                      Conversation with the Gardener
                      <span className="ml-2 text-sm font-normal text-[#1a472a]/75">{turns.length} turns</span>
                    </summary>
                    <div className="mt-4 space-y-2 max-h-[32rem] overflow-y-auto">
                      {turns.map((t, i) => (
                        <div key={i} className={t.role === "user" ? "text-right" : ""}>
                          <span className={`inline-block px-3 py-2 rounded-2xl text-sm max-w-[85%] text-left ${
                            t.role === "user" ? "bg-[#2f5d3a] text-white" : "bg-[#f0ebe3] text-[#1a472a]"
                          }`}>
                            {String(t.content)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </Card>
              );
            })()}

            {/* Previous Reviews */}
            {reviews && reviews.length > 0 && (
              <Card className="p-6 bg-white">
                <h2 className="text-2xl font-bold text-[#1a472a] mb-6">Previous Reviews</h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-l-4 border-[#7dd87d] pl-4 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[#1a472a]">
                          {review.decision.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-sm text-[#1a472a]/80">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[#1a472a]/80 mb-2">{review.comments}</p>
                      {review.internalNotes && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                          <p className="text-xs font-bold text-amber-900 mb-1">Internal Notes:</p>
                          <p className="text-xs text-amber-800">{review.internalNotes}</p>
                        </div>
                      )}
                      <div className="flex gap-4 mt-2 text-sm">
                        {review.alignmentScore && (
                          <span>Alignment: {review.alignmentScore}/5</span>
                        )}
                        {review.readinessScore && (
                          <span>Readiness: {review.readinessScore}/5</span>
                        )}
                        {review.impactScore && (
                          <span>Impact: {review.impactScore}/5</span>
                        )}
                        {review.teamScore && (
                          <span>Team: {review.teamScore}/5</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Review Form */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white sticky top-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-6">Submit Review</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="decision" className="text-[#1a472a] font-medium">Decision *</Label>
                  <Select value={decision} onValueChange={(value: any) => setDecision(value)}>
                    <SelectTrigger className="mt-1 bg-white text-[#1a472a] border-[#1a472a]/30">
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
                          Request Changes
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
                  <Label htmlFor="comments" className="text-[#1a472a] font-medium">Comments for Applicant *</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide feedback that will be shared with the applicant..."
                    rows={5}
                    className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/30"
                  />
                </div>

                <div>
                  <Label htmlFor="internalNotes" className="text-[#1a472a] font-medium">Internal Notes (Admin Only)</Label>
                  <Textarea
                    id="internalNotes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private notes for internal use..."
                    rows={3}
                    className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Alignment Score</Label>
                    <Select
                      value={alignmentScore.toString()}
                      onValueChange={(value) => setAlignmentScore(parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORE_OPTIONS.map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score}/5
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Readiness Score</Label>
                    <Select
                      value={readinessScore.toString()}
                      onValueChange={(value) => setReadinessScore(parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORE_OPTIONS.map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score}/5
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Impact Score</Label>
                    <Select
                      value={impactScore.toString()}
                      onValueChange={(value) => setImpactScore(parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORE_OPTIONS.map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score}/5
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Team Score</Label>
                    <Select
                      value={teamScore.toString()}
                      onValueChange={(value) => setTeamScore(parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORE_OPTIONS.map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score}/5
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitReview}
                  disabled={createReviewMutation.isPending || !comments.trim()}
                  className="w-full bg-[#4a7c59] hover:bg-[#3d6a4a] text-white"
                >
                  {createReviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Review
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
