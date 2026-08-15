import { useAuth } from "@/_core/hooks/useAuth";
import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Loader2, Save, MapPin, Map as MapIcon, HelpCircle } from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { FormCompanion } from "@/components/companion";
import { getLoginUrl } from "@/const";
import { MapView } from "@/components/Map";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { BackButton } from "@/components/BackButton";
import { BannerDisplay } from "@/components/BannerDisplay";
import { NeedsOffersFields } from "@/components/NeedsOffersFields";
import { PageWrapper } from "@/components/PageWrapper";
import { analytics } from "@/lib/analytics";

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

type FormData = {
  projectName: string;
  projectType: "early_stage" | "mature" | "";
  location: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  vision: string;
  landStatus: "owned" | "leased" | "committed" | "seeking" | "";
  teamSize: number;
  teamDescription: string;
  // Project Size & Community Metrics
  projectSizeHectares: number | null;
  currentPeopleCount: number | null;
  currentHouseholdCount: number | null;
  intendedPeopleCount: number | null;
  intendedHouseholdCount: number | null;
  mixedUse: string[]; // ["residential", "commercial", "industrial"]
  meetingFrequency: "everyday" | "2_3x_week" | "weekly" | "2_3x_month" | "monthly" | "2_3x_year" | "yearly_plus" | "";
  dietaryPatterns: string[];
  // Values & Alignment
  regenerativePractices: string;
  governanceApproach: string;
  communityEngagement: string;
  timeCommitment: string;
  currentFunding: string;
  fundingNeeds: string;
  websiteUrl: string;
  videoUrl: string;
  additionalNotes: string;
  needsText: string;
  offersText: string;
  documents: UploadedFile[];
};

const LS_KEY = 'regen_apply_draft';

function loadDraft(): Partial<FormData> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const INITIAL_FORM_DATA: FormData = {
  projectName: "",
  projectType: "",
  location: "",
  latitude: null,
  longitude: null,
  country: "",
  vision: "",
  landStatus: "",
  // 0 = not answered yet. It used to default to 2, which made every draft
  // claim a team of two before anyone said so; the Gardener flow needs to
  // know which fields were actually answered.
  teamSize: 0,
  teamDescription: "",
  // Project Size & Community Metrics
  projectSizeHectares: null,
  currentPeopleCount: null,
  currentHouseholdCount: null,
  intendedPeopleCount: null,
  intendedHouseholdCount: null,
  mixedUse: [],
  meetingFrequency: "",
  dietaryPatterns: [],
  // Values & Alignment
  regenerativePractices: "",
  governanceApproach: "",
  communityEngagement: "",
  timeCommitment: "",
  currentFunding: "",
  fundingNeeds: "",
  websiteUrl: "",
  videoUrl: "",
  additionalNotes: "",
  needsText: "",
  offersText: "",
  documents: [],
};

type CompanionTurn = { role: "user" | "assistant"; content: string };

/**
 * The fields the Gardener needs a real answer for before the application is
 * ready to review. Mirrors the required fields of the land-application form
 * spec in shared/companions.ts; used for the live progress card.
 */
const GARDENER_REQUIRED: Array<{ key: keyof FormData; label: string }> = [
  { key: "projectName", label: "Project name" },
  { key: "projectType", label: "Project type" },
  { key: "location", label: "Location" },
  { key: "vision", label: "Vision" },
  { key: "landStatus", label: "Land status" },
  { key: "teamSize", label: "Team size" },
  { key: "teamDescription", label: "Team" },
  { key: "regenerativePractices", label: "Regenerative practices" },
  { key: "governanceApproach", label: "Governance" },
  { key: "communityEngagement", label: "Community" },
  { key: "timeCommitment", label: "Time commitment" },
  { key: "fundingNeeds", label: "Funding needs" },
];

/** Every field the Gardener conversation can fill (strings shown to the model). */
const GARDENER_FIELD_KEYS: Array<keyof FormData> = [
  "projectName", "projectType", "location", "vision", "landStatus",
  "projectSizeHectares", "teamSize", "teamDescription", "regenerativePractices",
  "governanceApproach", "communityEngagement", "timeCommitment",
  "currentFunding", "fundingNeeds", "additionalNotes",
];

/** Trusted grounding for the Gardener so she can answer program questions. */
const GARDENER_CONTEXT = [
  "This is the ReGen Civics land project application for the next incubator season.",
  "Facts you can share if asked: applying is free. Season 2 applications are for September 2026.",
  "Review takes roughly 4 to 8 weeks after submission, and decisions land before season kickoff.",
  "If a project is picked, the team commits about one day a week during the season.",
  "Projects at any stage are welcome: ecovillages, food forests, intentional communities, regenerative farms.",
  "After the talk, the review screen also lets them pin the land on the map, add website and video links, and attach documents.",
].join(" ");

export default function Apply() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_FORM_DATA, ...draft } : INITIAL_FORM_DATA;
  });
  const [draftRestored, setDraftRestored] = useState(() => loadDraft() !== null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showOptionalStep1, setShowOptionalStep1] = useState(false);
  const [showOptionalStep2, setShowOptionalStep2] = useState(false);

  // Chat-first: the Gardener leads, the classic wizard is the review surface.
  // "talk" is the default; "form" is either the full review (reviewAll) after
  // the conversation, or the classic 5-step wizard for people who prefer typing.
  const [mode, setMode] = useState<"talk" | "form">("talk");
  const [reviewAll, setReviewAll] = useState(false);
  const [fromGardener, setFromGardener] = useState(false);
  const [transcript, setTranscript] = useState<CompanionTurn[]>([]);
  /** Status of a pre-existing application (the server returns it instead of
   *  creating a duplicate). Pauses autosave for anything already submitted. */
  const [existingAppStatus, setExistingAppStatus] = useState<string | null>(null);

  // If the companion is not aboard (no LLM configured), fall back to the form.
  const companionFlags = trpc.companion.flags.useQuery(undefined, { staleTime: 60_000 });
  useEffect(() => {
    if (companionFlags.data && !companionFlags.data.companion) setMode("form");
  }, [companionFlags.data]);

  // Fetch the user's extended profile for pre-fill
  const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
  });

  // Pre-fill form from profile on first load (only if no draft was restored)
  useEffect(() => {
    if (!userProfile || draftRestored) return;
    setFormData(prev => ({
      ...prev,
      location: prev.location || userProfile.location || '',
      projectName: prev.projectName || userProfile.projectName || '',
    }));
  }, [userProfile]);

  // Autosave to localStorage (debounced 800ms) - docs/files excluded to avoid quota issues
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => {
      try {
        const { documents: _docs, ...rest } = formData;
        localStorage.setItem(LS_KEY, JSON.stringify(rest));
      } catch { /* storage quota exceeded - ignore */ }
    }, 800);
    return () => { if (lsTimerRef.current) clearTimeout(lsTimerRef.current); };
  }, [formData]);

  const utils = trpc.useUtils();
  const createMutation = trpc.applications.create.useMutation();
  const updateMutation = trpc.applications.update.useMutation();
  const submitMutation = trpc.applications.submit.useMutation();

  const totalSteps = 5;
  const stepTitles = [
    "Basic Information",
    "Land & Team",
    "Values & Alignment",
    "Commitment & Resources",
    "Additional Information",
  ];

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveDraft = async () => {
    if (!applicationId) {
      // Create new application. The server returns the user's existing
      // application if they already have one, so check its status: the talk
      // autosave must never silently rewrite a submitted application.
      const result = await createMutation.mutateAsync({
        projectName: formData.projectName || "Untitled Project",
        projectType: formData.projectType || "early_stage",
        location: formData.location || "TBD",
      });
      analytics.applyStarted();
      setApplicationId(result.id);
      const status = (result as any).status as string | undefined;
      if (status && status !== "draft") setExistingAppStatus(status);
      return result.id;
    } else {
      // Update existing application - filter out empty strings
      const updateData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "documents") {
          // Store documents as JSON string
          updateData.documentsUrl = JSON.stringify(value);
        } else if (key === "mixedUse") {
          // Store mixedUse as JSON string
          updateData.mixedUse = JSON.stringify(value);
        } else if (key === "dietaryPatterns") {
          updateData.dietaryPatterns = JSON.stringify(value);
        } else if (value !== "" && value !== null && value !== undefined) {
          updateData[key] = value;
        }
      });
      // Keep the Gardener conversation with the draft so reviewers can read
      // how the applicant talked about their project, not just the fields.
      if (transcript.length > 0) {
        updateData.companionTranscript = JSON.stringify(transcript).slice(0, 400_000);
      }
      await updateMutation.mutateAsync({
        id: applicationId,
        data: updateData,
      });
      return applicationId;
    }
  };

  // ── The Gardener (chat-first application) ──────────────────────────────────

  /** Values the conversation already holds, so the Gardener never re-asks. */
  const companionCollected = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of GARDENER_FIELD_KEYS) {
      const v = formData[key];
      if (typeof v === "string" && v.trim()) out[key] = v;
      else if (typeof v === "number" && v > 0) out[key] = String(v);
    }
    return out;
  }, [formData]);

  const gardenerFilledCount = GARDENER_REQUIRED.filter(({ key }) => {
    const v = formData[key];
    return typeof v === "string" ? v.trim() !== "" : typeof v === "number" && v > 0;
  }).length;

  /** Map a value the Gardener heard into typed form state. Defense in depth:
   *  enums are normalized, numbers parsed, unknown keys ignored. */
  const handleGardenerField = useCallback((key: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    switch (key) {
      case "projectType": {
        const low = v.toLowerCase();
        if (low.includes("mature")) updateField("projectType", "mature");
        else if (low.includes("early")) updateField("projectType", "early_stage");
        return;
      }
      case "landStatus": {
        const low = v.toLowerCase();
        const match = (["owned", "leased", "committed", "seeking"] as const).find((s) => low.includes(s.slice(0, 4)));
        if (match) updateField("landStatus", match);
        return;
      }
      case "teamSize": {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) updateField("teamSize", n);
        return;
      }
      case "projectSizeHectares": {
        const n = parseFloat(v);
        if (Number.isFinite(n) && n > 0) updateField("projectSizeHectares", n);
        return;
      }
      default: {
        if ((GARDENER_FIELD_KEYS as string[]).includes(key)) updateField(key as keyof FormData, v);
      }
    }
  }, []);

  /** Move from the conversation to the full review (all sections on one page). */
  const goToReview = useCallback((viaGardener: boolean) => {
    setFromGardener(viaGardener);
    setReviewAll(true);
    setMode("form");
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void saveDraft().catch(() => { /* autosave retries on next change */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, transcript, applicationId]);

  // Debounced server autosave while talking, so a closed tab loses nothing.
  const talkSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkSaveBusy = useRef(false);
  useEffect(() => {
    if (mode !== "talk") return;
    // Never autosave over an application that is already in review or beyond.
    if (existingAppStatus && !["draft", "changes_requested"].includes(existingAppStatus)) return;
    const hasContent = Object.keys(companionCollected).length > 0 || transcript.length > 1;
    if (!hasContent) return;
    if (talkSaveTimer.current) clearTimeout(talkSaveTimer.current);
    talkSaveTimer.current = setTimeout(async () => {
      if (talkSaveBusy.current) return;
      talkSaveBusy.current = true;
      try { await saveDraft(); } catch { /* transient; next change retries */ }
      finally { talkSaveBusy.current = false; }
    }, 3000);
    return () => { if (talkSaveTimer.current) clearTimeout(talkSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionCollected, transcript, mode]);

  const handleNext = async () => {
    await saveDraft();
    if (currentStep < totalSteps) {
      analytics.applyStepAdvanced(currentStep + 1);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const id = await saveDraft();
      await submitMutation.mutateAsync({ id });
      analytics.applyFormSubmitted();
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
      navigate("/apply/success");
    } catch (err: any) {
      const msg = err?.message || "Submission failed. Please try again.";
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
      <SEO {...pageSEO.apply} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Apply", url: "/apply" }]} />
      <JsonLD data={schemas.faqPage([
        { question: "Who can apply to ReGen Civics?", answer: "Any regenerative land project (ecovillages, food forests, intentional communities, regenerative farms) can apply. Projects at any stage are welcome." },
        { question: "When do applications open?", answer: "Season 2 applications are open now for September 2026. Apply to be part of the next incubator cohort." },
        { question: "Is there a fee to apply?", answer: "No. There is no fee to apply to the ReGen Civics program." },
        { question: "How long does the application process take?", answer: "The review process typically takes 4–8 weeks after submission. You will be notified by email of the decision." },
      ])} />
      <BackButton />
        <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59]" />
      </div>
    );
  }

  if (!user) {
    // Login gate for the Apply flow. Styled to match the forest theme
    // the rest of the site uses so it doesn't feel like a different
    // app pasted in. "Sign in or create account" routes straight into
    // the OAuth flow, which handles both new and returning users.
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#0a1f12] via-[#0d2818] to-[#122e1c]">
        <div className="max-w-md w-full p-8 text-center bg-[#0d2818]/80 border border-[#7dd87d]/30 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Sign in to apply
          </h2>
          <p className="text-white/70 mb-6 text-sm leading-relaxed">
            Applying for a season uses a ReGen Civics account so we can follow
            up with you. Takes about 10 seconds.
          </p>
          <Button
            onClick={() => {
              const returnTo = window.location.pathname + window.location.search;
              sessionStorage.setItem("returnTo", returnTo);
              window.location.href = getLoginUrl(returnTo);
            }}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold w-full py-6 text-base"
          >
            Sign in or create account
          </Button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="mt-3 text-white/70 text-xs hover:text-white transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || submitMutation.isPending;

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#f0ebe3] py-12">
      <BannerDisplay bannerKey="apply-banner" />
      <div className="container max-w-4xl min-w-0">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1a472a] mb-2">
            Apply for Next Season
          </h1>
          <p className="text-[#1a472a]">
            Join the ReGen Civics Alliance
          </p>
        </div>

        {/* Chat-first: the Gardener leads the application. */}
        {mode === "talk" && (
          <Card className="p-6 sm:p-8 bg-white apply-form-dark mb-8">
            {draftRestored && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a7c59]/30 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
                <span>Draft restored from your last session. The Gardener can pick up where you left off.</span>
                <button
                  type="button"
                  className="text-xs underline opacity-70 hover:opacity-100"
                  onClick={() => {
                    setFormData(INITIAL_FORM_DATA);
                    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
                    setDraftRestored(false);
                  }}
                >
                  Clear &amp; start over
                </button>
              </div>
            )}

            {existingAppStatus && !["draft", "changes_requested"].includes(existingAppStatus) && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-[#7a5a00]">
                You already have a submitted application, so nothing here saves automatically.{" "}
                <Link href="/apply/status" className="underline">Check your application status</Link>.
              </div>
            )}

            <FormCompanion
              formId="land-application"
              context={GARDENER_CONTEXT}
              collected={companionCollected}
              onField={handleGardenerField}
              onTranscript={setTranscript}
              onReadyForReview={() => goToReview(true)}
            />

            {/* Live progress: what she has written down so far. */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#1a472a]">What she's written down</p>
                <span className="text-xs text-[#1a472a]/75">{gardenerFilledCount} of {GARDENER_REQUIRED.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {GARDENER_REQUIRED.map(({ key, label }) => {
                  const v = formData[key];
                  const filled = typeof v === "string" ? v.trim() !== "" : typeof v === "number" && v > 0;
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                        filled
                          ? "border-[#7dd87d] bg-[#7dd87d]/15 text-[#1a472a]"
                          : "border-[#1a472a]/15 text-[#1a472a]/75"
                      }`}
                    >
                      {filled && <CheckCircle2 className="w-3 h-3 text-[#4a7c59]" />}
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-5 border-t border-[#1a472a]/10">
              <Button
                onClick={() => goToReview(gardenerFilledCount > 0)}
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold"
              >
                Review and submit
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                type="button"
                onClick={() => { setReviewAll(false); setFromGardener(false); setMode("form"); }}
                className="text-sm text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
              >
                I'd rather fill out the form myself
              </button>
            </div>
          </Card>
        )}

        {/* Arrived from the conversation: one green banner, then the review. */}
        {mode === "form" && fromGardener && (
          <div className="mb-6 rounded-lg border-2 border-[#7dd87d]/60 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
            The Gardener wrote this down with you. Look everything over, fix anything she misheard,
            add the map pin or documents if you have them, then submit.
          </div>
        )}

        {/* Reopener back to the conversation. */}
        {mode === "form" && companionFlags.data?.companion !== false && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setMode("talk")}
              className="text-sm text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
            >
              Talk it out with the Gardener instead
            </button>
          </div>
        )}

        {/* Step progress bar (classic wizard only; review shows everything). */}
        {mode === "form" && !reviewAll && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1a472a]/80">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-[#1a472a]">{stepTitles[currentStep - 1]}</span>
          </div>
          <div className="w-full bg-[#e8e4de] rounded-full h-1.5">
            <div
              className="bg-[#7dd87d] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        )}

        {mode === "form" && reviewAll && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1a472a]">Review your application</h2>
            <p className="text-sm text-[#1a472a]/80">Every section is on this one page. Edit anything, then submit at the bottom.</p>
          </div>
        )}

        {/* Form Steps. apply-form-dark scopes the shared Label/Input/Select
            tokens (tuned for dark surfaces) back to the forest palette so
            labels, headings, field text, and placeholders render dark enough
            to read on the parchment Card background. */}
        {mode === "form" && (
        <Card className="p-8 bg-white apply-form-dark">
          {/* Draft restored banner */}
          {draftRestored && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a7c59]/30 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
              <span>Draft restored from your last session.</span>
              <button
                type="button"
                className="text-xs underline opacity-70 hover:opacity-100"
                onClick={() => {
                  setFormData(INITIAL_FORM_DATA);
                  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
                  setDraftRestored(false);
                }}
              >
                Clear &amp; start over
              </button>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {(reviewAll || currentStep === 1) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Basic Information
              </h2>

              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => updateField("projectName", e.target.value)}
                  placeholder="Enter your project name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => updateField("projectType", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_stage">Early Stage</SelectItem>
                    <SelectItem value="mature">Mature</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-[#1a472a]/80 mt-1">
                  Early stage: Just past land acquisition. Mature: Established and ready for funding.
                </p>
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="City, Country"
                  className="mt-1"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowOptionalStep1(!showOptionalStep1)}
                className="flex items-center gap-2 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors mt-4"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalStep1 ? 'rotate-180' : ''}`} />
                {showOptionalStep1 ? 'Hide optional details' : 'Add optional details'}
              </button>

              {showOptionalStep1 && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[#1a472a]/10">

              {/* Interactive Map Pin Location - for globe map placement */}
              <div className="bg-[#f0f7f0] p-4 rounded-lg border border-[#4a7c59]/20">
                <Label className="text-[#1a472a] font-semibold flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#4a7c59]" />
                  Pin Your Project on the Map
                </Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">
                  Click on the map to place your project pin, or enter coordinates manually below.
                  Your project will appear on our interactive globe map!
                </p>
                
                {/* Place search + Interactive Google Maps Picker */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      id="place-search-input"
                      type="text"
                      placeholder="Search for a place name (e.g. 'Bali, Indonesia')..."
                      className="w-full px-4 py-2.5 border border-[#4a7c59]/30 rounded-t-lg text-sm bg-white text-[#1a472a] placeholder:text-[#1a472a]/80 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                    />
                    <MapIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7c59]/50" />
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden border border-[#4a7c59]/30 mb-3">
                  <MapView
                    className="h-[250px] sm:h-[300px] w-full"
                    initialCenter={{
                      lat: formData.latitude || 20,
                      lng: formData.longitude || 0,
                    }}
                    initialZoom={formData.latitude ? 8 : 2}
                    onMapReady={(map) => {
                      // Add a marker for the current position
                      let marker: google.maps.marker.AdvancedMarkerElement | null = null;
                      
                      const placeMarker = (lat: number, lng: number) => {
                        if (marker) marker.map = null;
                        marker = new google.maps.marker.AdvancedMarkerElement({
                          map,
                          position: { lat, lng },
                          title: "Project Location",
                        });
                      };
                      
                      // If we already have coords, place marker
                      if (formData.latitude && formData.longitude) {
                        placeMarker(formData.latitude, formData.longitude);
                      }
                      
                      // Set up Places Autocomplete on the search input
                      const searchInput = document.getElementById("place-search-input") as HTMLInputElement;
                      if (searchInput) {
                        const autocomplete = new google.maps.places.Autocomplete(searchInput, {
                          types: ["geocode", "establishment"],
                          fields: ["geometry", "address_components", "formatted_address", "name"],
                        });
                        autocomplete.bindTo("bounds", map);
                        
                        autocomplete.addListener("place_changed", () => {
                          const place = autocomplete.getPlace();
                          if (place.geometry?.location) {
                            const lat = Math.round(place.geometry.location.lat() * 10000) / 10000;
                            const lng = Math.round(place.geometry.location.lng() * 10000) / 10000;
                            updateField("latitude", lat);
                            updateField("longitude", lng);
                            placeMarker(lat, lng);
                            map.setCenter({ lat, lng });
                            map.setZoom(12);
                            
                            // Extract country and location from address components
                            if (place.address_components) {
                              const countryComp = place.address_components.find(
                                (c) => c.types.includes("country")
                              );
                              const localityComp = place.address_components.find(
                                (c) => c.types.includes("locality")
                              );
                              const adminComp = place.address_components.find(
                                (c) => c.types.includes("administrative_area_level_1")
                              );
                              if (countryComp) {
                                updateField("country", countryComp.long_name);
                              }
                              if (localityComp && countryComp) {
                                updateField("location", `${localityComp.long_name}, ${countryComp.long_name}`);
                              } else if (adminComp && countryComp) {
                                updateField("location", `${adminComp.long_name}, ${countryComp.long_name}`);
                              } else if (place.formatted_address) {
                                updateField("location", place.formatted_address);
                              }
                            }
                          }
                        });
                      }
                      
                      // Click to place marker
                      map.addListener("click", (e: google.maps.MapMouseEvent) => {
                        if (e.latLng) {
                          const lat = Math.round(e.latLng.lat() * 10000) / 10000;
                          const lng = Math.round(e.latLng.lng() * 10000) / 10000;
                          updateField("latitude", lat);
                          updateField("longitude", lng);
                          placeMarker(lat, lng);
                          
                          // Reverse geocode to get country
                          const geocoder = new google.maps.Geocoder();
                          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                            if (status === "OK" && results && results[0]) {
                              const countryComponent = results[0].address_components.find(
                                (c) => c.types.includes("country")
                              );
                              if (countryComponent) {
                                updateField("country", countryComponent.long_name);
                              }
                              const locality = results[0].address_components.find(
                                (c) => c.types.includes("locality")
                              );
                              const adminArea = results[0].address_components.find(
                                (c) => c.types.includes("administrative_area_level_1")
                              );
                              if (locality && countryComponent) {
                                updateField("location", `${locality.long_name}, ${countryComponent.long_name}`);
                              } else if (adminArea && countryComponent) {
                                updateField("location", `${adminArea.long_name}, ${countryComponent.long_name}`);
                              }
                            }
                          });
                        }
                      });
                    }}
                  />
                </div>
                
                {/* Coordinate display + manual entry */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label htmlFor="latitude" className="text-xs text-[#1a472a]">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude ?? ""}
                      onChange={(e) => updateField("latitude", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 12.4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-xs text-[#1a472a]">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude ?? ""}
                      onChange={(e) => updateField("longitude", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. -85.1234"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label htmlFor="country" className="text-xs text-[#1a472a]">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    placeholder="e.g. Costa Rica"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            updateField("latitude", Math.round(pos.coords.latitude * 10000) / 10000);
                            updateField("longitude", Math.round(pos.coords.longitude * 10000) / 10000);
                          },
                          () => alert("Could not get your location. Please enter coordinates manually.")
                        );
                      }
                    }}
                    className="text-sm text-[#4a7c59] hover:text-[#1a472a] underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Use my current location
                  </button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-[#4a7c59] mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Location pinned at {formData.latitude}, {formData.longitude}
                    {formData.country && ` (${formData.country})`}
                  </p>
                )}
              </div>

              </div>
              )}

              <div>
                <Label htmlFor="vision">Project Vision *</Label>
                <Textarea
                  id="vision"
                  value={formData.vision}
                  onChange={(e) => updateField("vision", e.target.value)}
                  placeholder="Describe your project's vision and purpose..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Land & Team */}
          {(reviewAll || currentStep === 2) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Land & Team
              </h2>

              <div>
                <Label htmlFor="landStatus">Land Status *</Label>
                <Select
                  value={formData.landStatus}
                  onValueChange={(value) => updateField("landStatus", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select land status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="leased">Leased</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                    <SelectItem value="seeking">Seeking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Size with Bidirectional Conversion */}
              <div>
                <Label className="text-base font-semibold text-[#1a472a]">Project Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-2">Enter in either hectares or acres - the other will auto-calculate.</p>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <Label htmlFor="projectSizeHectares" className="text-sm">Hectares</Label>
                    <Input
                      id="projectSizeHectares"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.projectSizeHectares || ""}
                      onChange={(e) => updateField("projectSizeHectares", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., 50"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectSizeAcres" className="text-sm">Acres</Label>
                    <Input
                      id="projectSizeAcres"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.projectSizeHectares ? (formData.projectSizeHectares * 2.471).toFixed(1) : ""}
                      onChange={(e) => {
                        const acres = e.target.value ? parseFloat(e.target.value) : null;
                        // Convert acres to hectares (1 acre = 0.4047 hectares)
                        updateField("projectSizeHectares", acres ? parseFloat((acres * 0.4047).toFixed(2)) : null);
                      }}
                      placeholder="e.g., 123.5"
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#1a472a]/80 mt-2">
                  1 hectare = 2.471 acres | 1 acre = 0.4047 hectares
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOptionalStep2(!showOptionalStep2)}
                className="flex items-center gap-2 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors mt-4"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalStep2 ? 'rotate-180' : ''}`} />
                {showOptionalStep2 ? 'Hide optional details' : 'Add optional details'}
              </button>

              {showOptionalStep2 && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[#1a472a]/10">

              {/* Current Community Size */}
              <div className="border border-[#1a472a]/20 rounded-lg p-4 bg-[#f8f5f0]">
                <Label className="text-base font-semibold text-[#1a472a]">Current Community Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">How many people and households currently live on the project?</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentPeopleCount" className="text-sm">People</Label>
                    <Input
                      id="currentPeopleCount"
                      type="number"
                      min="0"
                      value={formData.currentPeopleCount || ""}
                      onChange={(e) => updateField("currentPeopleCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of people"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentHouseholdCount" className="text-sm">Households</Label>
                    <Input
                      id="currentHouseholdCount"
                      type="number"
                      min="0"
                      value={formData.currentHouseholdCount || ""}
                      onChange={(e) => updateField("currentHouseholdCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of households"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Intended Full Community Size */}
              <div className="border border-[#1a472a]/20 rounded-lg p-4 bg-[#f8f5f0]">
                <Label className="text-base font-semibold text-[#1a472a]">Intended Full Community Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">What is your target community size at full capacity?</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="intendedPeopleCount" className="text-sm">People</Label>
                    <Input
                      id="intendedPeopleCount"
                      type="number"
                      min="0"
                      value={formData.intendedPeopleCount || ""}
                      onChange={(e) => updateField("intendedPeopleCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of people"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intendedHouseholdCount" className="text-sm">Households</Label>
                    <Input
                      id="intendedHouseholdCount"
                      type="number"
                      min="0"
                      value={formData.intendedHouseholdCount || ""}
                      onChange={(e) => updateField("intendedHouseholdCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of households"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Mixed Use Selection */}
              <div>
                <Label className="text-base">Mixed Use (Select all that apply)</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">What types of land use does your project include?</p>
                <div className="flex flex-wrap gap-3">
                  {["residential", "commercial", "industrial", "agricultural", "educational", "recreational"].map((use) => (
                    <button
                      key={use}
                      type="button"
                      onClick={() => {
                        const current = formData.mixedUse || [];
                        if (current.includes(use)) {
                          updateField("mixedUse", current.filter(u => u !== use));
                        } else {
                          updateField("mixedUse", [...current, use]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all capitalize ${
                        (formData.mixedUse || []).includes(use)
                          ? "border-[#7dd87d] bg-[#7dd87d]/20 text-[#1a472a]"
                          : "border-[#1a472a]/20 bg-white text-[#1a472a] hover:border-[#7dd87d]/50"
                      }`}
                    >
                      {use}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting Frequency */}
              <div className="space-y-2">
                <Label htmlFor="meetingFrequency" className="text-base font-semibold text-[#1a472a]">
                  Meeting Frequency
                </Label>
                <p className="text-sm text-[#1a472a]/80">How often does your core community gather in person?</p>
                <Select
                  value={formData.meetingFrequency}
                  onValueChange={(v) => updateField("meetingFrequency", v)}
                >
                  <SelectTrigger id="meetingFrequency">
                    <SelectValue placeholder="Select meeting frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyday">Everyday</SelectItem>
                    <SelectItem value="2_3x_week">2–3× per week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="2_3x_month">2–3× per month</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="2_3x_year">2–3× per year</SelectItem>
                    <SelectItem value="yearly_plus">Yearly or less</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              </div>
              )}

              <div>
                <Label htmlFor="teamSize">Core Team Size *</Label>
                <Input
                  id="teamSize"
                  type="number"
                  min="1"
                  value={formData.teamSize || ""}
                  placeholder="# of people on the core team"
                  onChange={(e) => updateField("teamSize", parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="teamDescription">Team Description *</Label>
                <Textarea
                  id="teamDescription"
                  value={formData.teamDescription}
                  onChange={(e) => updateField("teamDescription", e.target.value)}
                  placeholder="Describe your core team members, their roles, and relevant experience..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 3: Values & Alignment */}
          {(reviewAll || currentStep === 3) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Values & Alignment
              </h2>

              <div>
                <Label htmlFor="regenerativePractices">Regenerative Practices *</Label>
                <Textarea
                  id="regenerativePractices"
                  value={formData.regenerativePractices}
                  onChange={(e) => updateField("regenerativePractices", e.target.value)}
                  placeholder="Describe your regenerative practices and ecological restoration approach..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="governanceApproach">Governance Approach *</Label>
                <Textarea
                  id="governanceApproach"
                  value={formData.governanceApproach}
                  onChange={(e) => updateField("governanceApproach", e.target.value)}
                  placeholder="Describe your governance structure and decision-making processes..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="communityEngagement">Community Engagement *</Label>
                <Textarea
                  id="communityEngagement"
                  value={formData.communityEngagement}
                  onChange={(e) => updateField("communityEngagement", e.target.value)}
                  placeholder="How does your project engage with and serve the broader community?..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              {/* Dietary Patterns */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Label className="text-base font-semibold text-[#1a472a]">Dietary Patterns</Label>
                  <button
                    type="button"
                    aria-label="Dietary pattern info"
                    className="group relative cursor-help focus:outline-none"
                  >
                    <HelpCircle className="w-4 h-4 text-[#1a472a]/80 mt-0.5" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#1a472a] text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 shadow-lg pointer-events-none">
                      Dietary alignment matters for community cohesion. Shared meals are central to regenerative living. Knowing the community's dietary culture helps prospective members assess fit before applying.
                    </div>
                  </button>
                </div>
                <p className="text-sm text-[#1a472a]/80">Select all that apply to your community. This helps prospective members find aligned communities.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "vegan", label: "Vegan" },
                    { value: "vegetarian", label: "Vegetarian" },
                    { value: "plant_based", label: "Plant-Based" },
                    { value: "pescatarian", label: "Pescatarian" },
                    { value: "omnivore", label: "Omnivore" },
                    { value: "animal_based", label: "Animal-Based" },
                    { value: "keto", label: "Keto" },
                    { value: "no_shared_diets", label: "No Shared Diets" },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#1a472a]/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.dietaryPatterns.includes(value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.dietaryPatterns, value]
                            : formData.dietaryPatterns.filter(v => v !== value);
                          updateField("dietaryPatterns", next);
                        }}
                        className="w-4 h-4 accent-[#4a7c59]"
                      />
                      <span className="text-sm text-[#1a472a]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Commitment & Resources */}
          {(reviewAll || currentStep === 4) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Commitment & Resources
              </h2>

              <div>
                <Label htmlFor="timeCommitment">Time Commitment *</Label>
                <Textarea
                  id="timeCommitment"
                  value={formData.timeCommitment}
                  onChange={(e) => updateField("timeCommitment", e.target.value)}
                  placeholder="Describe your team's availability for the season (1 day/week minimum)..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="currentFunding">Current Funding</Label>
                <Textarea
                  id="currentFunding"
                  value={formData.currentFunding}
                  onChange={(e) => updateField("currentFunding", e.target.value)}
                  placeholder="Describe any current funding sources or financial resources..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="fundingNeeds">Funding Needs *</Label>
                <Textarea
                  id="fundingNeeds"
                  value={formData.fundingNeeds}
                  onChange={(e) => updateField("fundingNeeds", e.target.value)}
                  placeholder="What funding or resources do you need to move forward?..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 5: Additional Information */}
          {(reviewAll || currentStep === 5) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Additional Information
              </h2>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                  placeholder="https://yourproject.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="mt-1"
                />
                <p className="text-sm text-[#1a472a]/80 mt-1">
                  Optional: Share a video introducing your project
                </p>
              </div>

              {/* File Upload Section */}
              <FileUpload
                value={formData.documents}
                onChange={(files) => updateField("documents", files)}
                maxFiles={5}
                maxSizeMB={10}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                label="Project Documents"
                helperText="Upload supporting documents (pitch deck, photos, plans, etc.)"
              />

              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                  placeholder="Anything else you'd like us to know?..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <NeedsOffersFields
                needsText={formData.needsText}
                offersText={formData.offersText}
                onNeedsChange={(v) => updateField("needsText", v)}
                onOffersChange={(v) => updateField("offersText", v)}
                variant="light"
              />

              <div className="bg-[#f0f7f0] border-2 border-[#7dd87d]/50 rounded-lg p-4">
                <p className="text-[#1a472a] font-medium mb-2">
                  Ready to submit?
                </p>
                <p className="text-[#1a472a] text-sm safe-prose">
                  By submitting this application, you agree that, if picked, you'll participate in ReGen Civics next Season and commit to the time requirements (1 day / week) outlined in the program. Or, let us know ASAP if you're not going to be able to participate, so we can offer to another project if you were to be selected.
                </p>
              </div>
            </div>
          )}

          {/* Submit error summary */}
          {submitError && (
            <div className="mt-6 bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-400">
              {submitError}
            </div>
          )}

          {/* Navigation Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t">
            {!reviewAll && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/10 w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isLoading}
                className="border-[#7dd87d] text-[#4a7c59] w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>

              {!reviewAll && currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffed4e] hover:to-[#9de89d] text-[#1a472a] w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
            <DataProtectionBadge compact className="mt-3 justify-center" />
          </div>
        </Card>
        )}
      </div>
    </div>
    </PageWrapper>
  );
}
