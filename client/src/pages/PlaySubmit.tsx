/**
 * Play Submit - Multi-step wizard for creating a new Play
 * Route: /plays/submit
 *
 * Two kinds of Play:
 *  - Vision Play: a designed economic system (needs-first proposal, the
 *    Design a Play quest path). Uses VISION_SECTIONS + the robustness
 *    self-test from data/playVision.ts.
 *  - Culture Play: the original 14-section packaged culture from an
 *    operating community.
 */
import { useState } from "react";
import {
  Gamepad2,
  Upload,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Users,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { PLAY_SECTIONS } from "@/pages/PlaysLibrary";
import {
  VISION_SECTIONS,
  ROBUSTNESS_DIMENSIONS,
  type RobustnessKey,
} from "@/data/playVision";
import { getLoginUrl } from "@/const";

const SECTION_HELPERS: Record<string, string> = {
  sectionIdentity: "Name, location, founding story, who this Play is for.",
  sectionGovernance:
    "How decisions are made, who leads, how governance evolves.",
  sectionEconomics:
    "Currencies, revenue, compensation, minimum viable economy.",
  sectionLegal: "Entity type, land ownership, member agreements.",
  sectionRoles: "Named roles, how assigned, circles, compensation.",
  sectionSeasons: "Seasonal rhythm, gathering cadence, ceremonies.",
  sectionLandEcology: "Land practices, food systems, non-human needs.",
  sectionAgreements: "Social agreements, values, accountability.",
  sectionConflict: "Dispute resolution, mediation, harm repair.",
  sectionHealth: "Physical, mental, spiritual wellbeing systems.",
  sectionEducation:
    "Learning, mentorship, onboarding, knowledge commons.",
  sectionCulture: "Arts, celebration, communication norms.",
  sectionExternalRelations: "Alliances, networks, visitor experience.",
  sectionScaling:
    "Growth model, version history, what you would change.",
};

const COMMUNITY_TYPES = [
  "Ecovillage",
  "Urban Community",
  "Land Trust",
  "Cooperative",
  "Transition Town",
  "Bioregional Hub",
  "Intentional Community",
  "Other",
];

const SCALE_OPTIONS = [
  { value: "small" as const, label: "Small (< 20)" },
  { value: "medium" as const, label: "Medium (20 - 100)" },
  { value: "large" as const, label: "Large (100+)" },
];

const PRICING_OPTIONS = [
  { value: "open_source" as const, label: "Open Source" },
  { value: "free" as const, label: "Free" },
  { value: "paid" as const, label: "Paid" },
];

/** Map analyzeDocument short keys to state keys */
function sectionStateKey(shortName: string): string {
  return (
    "section" +
    shortName.charAt(0).toUpperCase() +
    shortName.slice(1)
  );
}

export default function PlaySubmit() {
  const { isAuthenticated } = useAuth();

  const [kind, setKind] = useState<"vision" | "culture" | null>(null);
  const [step, setStep] = useState(1);
  const [analyzeInput, setAnalyzeInput] = useState("");

  // Metadata
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [creatorProjectName, setCreatorProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pricingModel, setPricingModel] = useState<
    "free" | "open_source" | "paid"
  >("open_source");
  const [priceRegenTokens, setPriceRegenTokens] = useState<
    number | undefined
  >();
  const [externalPaymentUrl, setExternalPaymentUrl] = useState("");
  const [externalPriceLabel, setExternalPriceLabel] = useState("");
  const [scale, setScale] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [communityType, setCommunityType] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    [],
  );

  // 14 sections (culture); vision reuses a subset of these keys
  const [sections, setSections] = useState<Record<string, string>>({
    sectionIdentity: "",
    sectionGovernance: "",
    sectionEconomics: "",
    sectionLegal: "",
    sectionRoles: "",
    sectionSeasons: "",
    sectionLandEcology: "",
    sectionAgreements: "",
    sectionConflict: "",
    sectionHealth: "",
    sectionEducation: "",
    sectionCulture: "",
    sectionExternalRelations: "",
    sectionScaling: "",
  });

  // Vision-only fields
  const [needsFramework, setNeedsFramework] = useState("");
  const [receipts, setReceipts] = useState("");
  const [robustness, setRobustness] = useState<Record<RobustnessKey, number>>({
    redundancy: 3,
    diversity: 3,
    biophilia: 3,
    rootedness: 3,
    slack: 3,
    circularity: 3,
  });
  const [robustnessNote, setRobustnessNote] = useState("");

  const isVision = kind === "vision";

  // Queries
  const categoriesQuery = trpc.plays.categories.useQuery();

  // Mutations
  const analyzeMutation = trpc.plays.analyzeDocument.useMutation({
    onSuccess: (data) => {
      if (data.sections) {
        const mapped: Record<string, string> = {};
        for (const [shortKey, content] of Object.entries(data.sections)) {
          const stateKey = sectionStateKey(shortKey);
          if (content && typeof content === "string") {
            mapped[stateKey] = content;
          }
        }
        setSections((prev) => ({ ...prev, ...mapped }));
      }
      setStep(2);
    },
    onError: () => {
      // Let the user fill in manually
      setStep(2);
    },
  });

  const submitMutation = trpc.plays.submitPlay.useMutation({
    onSuccess: () => {
      setStep(5); // success screen
    },
  });

  const handleAnalyze = () => {
    if (!analyzeInput.trim()) return;
    analyzeMutation.mutate({ content: analyzeInput });
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      name,
      summary: summary || undefined,
      creatorProjectName: creatorProjectName || undefined,
      websiteUrl: websiteUrl || undefined,
      coverImageUrl: coverImageUrl || undefined,
      pricingModel,
      priceRegenTokens,
      externalPaymentUrl: externalPaymentUrl || undefined,
      externalPriceLabel: externalPriceLabel || undefined,
      scale,
      communityType: communityType || undefined,
      categoryIds:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      kind: kind ?? "culture",
      ...(isVision
        ? {
            needsFramework: needsFramework.trim() || undefined,
            receipts: receipts.trim() || undefined,
            robustness: {
              ...robustness,
              note: robustnessNote.trim() || undefined,
            },
          }
        : {}),
      ...Object.fromEntries(
        Object.entries(sections)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => [k, v]),
      ),
    });
  };

  // Vision fields route to their own state; section keys to the shared map.
  const visionValue = (key: string): string => {
    if (key === "needsFramework") return needsFramework;
    if (key === "receipts") return receipts;
    return sections[key] ?? "";
  };
  const setVisionValue = (key: string, value: string) => {
    if (key === "needsFramework") setNeedsFramework(value);
    else if (key === "receipts") setReceipts(value);
    else setSections((prev) => ({ ...prev, [key]: value }));
  };

  const filledSectionCount = isVision
    ? VISION_SECTIONS.filter((s) => visionValue(s.key).trim().length > 0)
        .length
    : Object.values(sections).filter((v) => v.trim().length > 0).length;
  const totalSections = isVision ? VISION_SECTIONS.length : 14;

  const toggleCategory = (catId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId],
    );
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center px-4">
        <SEO
          title="Submit a Play | ReGen Civics"
          description="Submit your Play to the library."
          url="/plays/submit"
        />
        <div className="text-center">
          <Gamepad2 className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
          <h2 className="text-xl text-white font-bold mb-2">
            Sign in to submit a Play
          </h2>
          <p className="text-white/60 mb-4">
            You need an account to share your Play.
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Submit a Play | ReGen Civics"
        description="Submit your Play to the library: a designed economic system or your community's packaged culture."
        url="/plays/submit"
      />

      {/* Back link */}
      <div className="pt-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/plays">
            <button className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Plays Library
            </button>
          </Link>
        </div>
      </div>

      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            {/* Header */}
            <div className="text-center mb-8">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Submit a Play
              </h1>
              <p className="text-white/60 text-sm max-w-lg mx-auto">
                {kind === null &&
                  "Two kinds of Play live in the library. Pick the one you're bringing."}
                {isVision &&
                  "A Vision Play is a designed economic system: the needs you'd honor, how you'd measure them, and how you'd coordinate to meet them."}
                {kind === "culture" &&
                  "Share how your community organizes itself. Paste your existing docs and we will extract the sections, or start from scratch."}
              </p>
              {/* Step indicator */}
              {kind !== null && step < 5 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {[1, 2, 3, 4].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        s === step
                          ? "w-8 bg-[#7dd87d]"
                          : s < step
                            ? "w-6 bg-[#7dd87d]/40"
                            : "w-6 bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Kind chooser ── */}
            {kind === null && (
              <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setKind("vision");
                    setStep(2);
                  }}
                  className="text-left bg-white/5 border border-white/10 hover:border-[#7dd87d]/50 rounded-2xl p-6 transition-all group"
                >
                  <Lightbulb className="w-8 h-8 text-[#7dd87d] mb-3" />
                  <h3 className="text-white font-bold mb-1 group-hover:text-[#7dd87d] transition-colors">
                    Vision Play
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-3">
                    A new economic system you're designing. Needs first, then
                    the coordination that meets them, then the robustness
                    self-test. This is the Design a Play quest path.
                  </p>
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                    Envisioned
                  </Badge>
                </button>
                <button
                  onClick={() => {
                    setKind("culture");
                    setStep(1);
                  }}
                  className="text-left bg-white/5 border border-white/10 hover:border-[#7dd87d]/50 rounded-2xl p-6 transition-all group"
                >
                  <Users className="w-8 h-8 text-[#7dd87d] mb-3" />
                  <h3 className="text-white font-bold mb-1 group-hover:text-[#7dd87d] transition-colors">
                    Culture Play
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-3">
                    Your community already runs its own game. Package the full
                    culture across the 14 sections so other projects can study,
                    adopt, or remix it.
                  </p>
                  <Badge className="bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/30 text-xs">
                    Practiced
                  </Badge>
                </button>
              </div>
            )}

            {/* ── Step 1: Start (culture only) ── */}
            {kind === "culture" && step === 1 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <h2
                  className="text-lg text-white font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  How would you like to create your Play?
                </h2>

                {/* Option A: AI Analysis */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                    Paste your documents
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    Paste your governance docs, bylaws, handbook, website
                    content, or any text that describes how your community
                    works. Our AI will extract the relevant pieces into the
                    14 standard sections.
                  </p>
                  <Textarea
                    value={analyzeInput}
                    onChange={(e) => setAnalyzeInput(e.target.value)}
                    placeholder="Paste your community's documentation here..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60 min-h-[150px] mb-3"
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={
                      !analyzeInput.trim() || analyzeMutation.isPending
                    }
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Analyze and
                        Extract
                      </>
                    )}
                  </Button>
                  {analyzeMutation.isError && (
                    <p className="text-amber-400 text-sm mt-2">
                      Analysis hit an issue. You can still fill in sections
                      manually.
                    </p>
                  )}
                </div>

                {/* Option B: Start from scratch */}
                <div className="text-center">
                  <button
                    onClick={() => setStep(2)}
                    className="text-white/60 hover:text-white underline text-sm"
                  >
                    Or start from scratch
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setKind(null)}
                    className="text-white/60 hover:text-white text-xs"
                  >
                    Change play type
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Section Content ── */}
            {kind !== null && step === 2 && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-white/70 text-sm">
                    {filledSectionCount} of {totalSections} sections filled
                  </span>
                  <div className="flex-1 mx-4 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7dd87d] rounded-full transition-all"
                      style={{
                        width: `${(filledSectionCount / totalSections) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[#7dd87d] text-sm font-medium">
                    {Math.round((filledSectionCount / totalSections) * 100)}%
                  </span>
                </div>

                {/* Section cards */}
                {(isVision ? VISION_SECTIONS : PLAY_SECTIONS).map(
                  (section) => {
                    const key = section.key as string;
                    const label = section.label;
                    const helper = isVision
                      ? (section as (typeof VISION_SECTIONS)[number]).helper
                      : SECTION_HELPERS[key];
                    const value = isVision
                      ? visionValue(key)
                      : (sections[key] ?? "");
                    const hasContent = value.trim().length > 0;
                    return (
                      <div
                        key={key}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              hasContent ? "bg-[#7dd87d]" : "bg-white/20"
                            }`}
                          />
                          <h3 className="text-white font-bold text-sm">
                            {label}
                          </h3>
                        </div>
                        <p className="text-white/70 text-xs mb-2">
                          {helper}
                        </p>
                        <Textarea
                          value={value}
                          onChange={(e) =>
                            isVision
                              ? setVisionValue(key, e.target.value)
                              : setSections((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                          }
                          placeholder={`Describe ${label.toLowerCase()}...`}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/70 min-h-[80px]"
                        />
                      </div>
                    );
                  },
                )}

                {/* Robustness self-test (vision only) */}
                {isVision && (
                  <div className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold text-sm mb-1">
                      Robustness self-test
                    </h3>
                    <p className="text-white/70 text-xs mb-4">
                      Six marks of systems that endure, after biologist
                      Olivier Hamant. Score your play honestly from 1 to 5.
                      The scores publish with your play; an honest 2 reads
                      better than a decorative 5.
                    </p>
                    <div className="space-y-4">
                      {ROBUSTNESS_DIMENSIONS.map((dim) => (
                        <div key={dim.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/80 text-sm font-medium">
                              {dim.label}
                            </span>
                            <span className="text-[#7dd87d] text-sm font-bold">
                              {robustness[dim.key]}/5
                            </span>
                          </div>
                          <p className="text-white/60 text-xs mb-2">
                            {dim.helper}
                          </p>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() =>
                                  setRobustness((prev) => ({
                                    ...prev,
                                    [dim.key]: score,
                                  }))
                                }
                                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-colors ${
                                  robustness[dim.key] === score
                                    ? "bg-[#7dd87d] text-[#1a472a]"
                                    : score <= robustness[dim.key]
                                      ? "bg-[#7dd87d]/30 text-white/80"
                                      : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="block text-white/70 text-xs mb-1">
                        Notes on your scores (optional)
                      </label>
                      <Textarea
                        value={robustnessNote}
                        onChange={(e) => setRobustnessNote(e.target.value)}
                        placeholder="Where is your play fragile? What would you shore up first?"
                        maxLength={2000}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/70 min-h-[60px]"
                      />
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() =>
                      isVision ? setKind(null) : setStep(1)
                    }
                    variant="outline"
                    className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold flex-1"
                  >
                    Next: Metadata{" "}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Metadata ── */}
            {kind !== null && step === 3 && (
              <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                {/* Play name */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Play name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      isVision
                        ? "e.g., The Watershed Commons Play"
                        : "e.g., Earthaven Ecovillage Play"
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60"
                  />
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    One-paragraph summary
                  </label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={
                      isVision
                        ? "The heart of your design: which needs it serves and how it coordinates meeting them."
                        : "A brief overview of what this Play covers and what makes your community's approach distinctive."
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60 min-h-[80px]"
                    maxLength={2000}
                  />
                  <p className="text-white/30 text-xs mt-1 text-right">
                    {summary.length} / 2000
                  </p>
                </div>

                {/* Creator project name */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Creator / project name
                  </label>
                  <Input
                    value={creatorProjectName}
                    onChange={(e) =>
                      setCreatorProjectName(e.target.value)
                    }
                    placeholder={
                      isVision
                        ? "Your name, or the group designing this play"
                        : "Name of the community or organization"
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Website URL
                  </label>
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourcommunity.org"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60"
                  />
                </div>

                {/* Cover image URL */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Cover image URL
                  </label>
                  <Input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/60"
                  />
                </div>

                {/* Community type */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {isVision ? "Designed for" : "Community type"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMUNITY_TYPES.map((ct) => (
                      <button
                        key={ct}
                        onClick={() =>
                          setCommunityType(
                            communityType === ct ? "" : ct,
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          communityType === ct
                            ? "bg-[#7dd87d] text-[#1a472a]"
                            : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    {isVision
                      ? "Scale it's designed for"
                      : "Community scale"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setScale(opt.value)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          scale === opt.value
                            ? "bg-[#7dd87d] text-[#1a472a]"
                            : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing model */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Pricing model
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRICING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPricingModel(opt.value)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          pricingModel === opt.value
                            ? "bg-[#7dd87d] text-[#1a472a]"
                            : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Paid pricing fields */}
                  {pricingModel === "paid" && (
                    <div className="mt-3 space-y-3 pl-2 border-l-2 border-[#7dd87d]/30">
                      <div>
                        <label className="block text-white/70 text-xs mb-1">
                          Price in $REGEN tokens
                        </label>
                        <Input
                          type="number"
                          value={priceRegenTokens ?? ""}
                          onChange={(e) =>
                            setPriceRegenTokens(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                          placeholder="e.g., 100"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/60 max-w-[200px]"
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1">
                          External payment URL
                        </label>
                        <Input
                          value={externalPaymentUrl}
                          onChange={(e) =>
                            setExternalPaymentUrl(e.target.value)
                          }
                          placeholder="https://buy.stripe.com/..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/60"
                        />
                      </div>
                      <div>
                        <label className="block text-white/70 text-xs mb-1">
                          Price label (shown to visitors)
                        </label>
                        <Input
                          value={externalPriceLabel}
                          onChange={(e) =>
                            setExternalPriceLabel(e.target.value)
                          }
                          placeholder="e.g., $25 / community"
                          maxLength={100}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/60 max-w-[250px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Categories */}
                {categoriesQuery.data &&
                  categoriesQuery.data.length > 0 && (
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">
                        Categories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {categoriesQuery.data.map((cat: any) => (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedCategories.includes(cat.id)
                                ? "bg-[#7dd87d] text-[#1a472a]"
                                : "bg-white/5 text-white/70 border border-white/10 hover:border-white/20"
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!name.trim()}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold flex-1"
                  >
                    Review and Submit{" "}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: Review and Submit ── */}
            {kind !== null && step === 4 && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Preview card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {coverImageUrl && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3
                      className="text-white text-lg font-bold mb-1"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {name || "Untitled Play"}
                    </h3>
                    {creatorProjectName && (
                      <p className="text-white/70 text-xs mb-2">
                        by {creatorProjectName}
                      </p>
                    )}
                    {summary && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-3">
                        {summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={
                          isVision
                            ? "text-violet-300 border-violet-500/40 text-xs"
                            : "text-[#7dd87d] border-[#7dd87d]/40 text-xs"
                        }
                      >
                        {isVision ? "Vision Play" : "Culture Play"}
                      </Badge>
                      {communityType && (
                        <Badge
                          variant="outline"
                          className="text-white/60 border-white/20 text-xs"
                        >
                          {communityType}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-white/60 border-white/20 text-xs"
                      >
                        {
                          SCALE_OPTIONS.find((o) => o.value === scale)
                            ?.label
                        }
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-white/60 border-white/20 text-xs"
                      >
                        {
                          PRICING_OPTIONS.find(
                            (o) => o.value === pricingModel,
                          )?.label
                        }
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Section completeness */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-bold text-sm mb-3">
                    Section completeness ({filledSectionCount} /{" "}
                    {totalSections})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(isVision ? VISION_SECTIONS : PLAY_SECTIONS).map(
                      (section) => {
                        const key = section.key as string;
                        const filled = isVision
                          ? visionValue(key).trim().length > 0
                          : (sections[key] ?? "").trim().length > 0;
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                filled ? "bg-[#7dd87d]" : "bg-white/20"
                              }`}
                            />
                            <span
                              className={
                                filled
                                  ? "text-white/80"
                                  : "text-white/60"
                              }
                            >
                              {section.label}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                  {isVision && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-white/70 text-xs mb-2">
                        Robustness self-test
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROBUSTNESS_DIMENSIONS.map((dim) => (
                          <span
                            key={dim.key}
                            className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/70 border border-white/10"
                          >
                            {dim.label}: {robustness[dim.key]}/5
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit / back */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !name.trim() || submitMutation.isPending
                    }
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold flex-1"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" /> Submit Play
                      </>
                    )}
                  </Button>
                </div>

                {submitMutation.isError && (
                  <p className="text-red-400 text-sm text-center">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 5: Success ── */}
            {step === 5 && (
              <div className="max-w-md mx-auto bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center">
                <Check className="w-16 h-16 text-[#7dd87d] mx-auto mb-4" />
                <h2
                  className="text-white text-xl font-bold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Play submitted
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  {isVision
                    ? "Your Play is pending review against the published criteria. If it's approved into the library, the Design a Play quest reward lands in your balance, and you can pool the resources to trial it through Crowdpooling."
                    : "Your Play is pending review. We will notify you when it goes live."}
                </p>
                <Link href="/plays">
                  <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
                    Browse Plays
                  </Button>
                </Link>
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
