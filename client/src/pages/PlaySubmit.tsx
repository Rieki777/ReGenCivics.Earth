/**
 * Play Submit - Multi-step wizard for creating a new Play
 * Route: /plays/submit
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

  // 14 sections
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
      ...Object.fromEntries(
        Object.entries(sections)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => [k, v]),
      ),
    });
  };

  const filledSectionCount = Object.values(sections).filter(
    (v) => v.trim().length > 0,
  ).length;

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
          description="Submit your community's Play to the library."
          url="/plays/submit"
        />
        <div className="text-center">
          <Gamepad2 className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
          <h2 className="text-xl text-white font-bold mb-2">
            Sign in to submit a Play
          </h2>
          <p className="text-white/60 mb-4">
            You need an account to share your community's Play.
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
        description="Submit your community's Play to the library."
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
                Share how your community organizes itself. Paste your
                existing docs and we will extract the sections, or start
                from scratch.
              </p>
              {/* Step indicator */}
              {step < 5 && (
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

            {/* ── Step 1: Start ── */}
            {step === 1 && (
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[150px] mb-3"
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
              </div>
            )}

            {/* ── Step 2: Section Content ── */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-white/70 text-sm">
                    {filledSectionCount} of 14 sections filled
                  </span>
                  <div className="flex-1 mx-4 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7dd87d] rounded-full transition-all"
                      style={{
                        width: `${(filledSectionCount / 14) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[#7dd87d] text-sm font-medium">
                    {Math.round((filledSectionCount / 14) * 100)}%
                  </span>
                </div>

                {/* Section cards */}
                {PLAY_SECTIONS.map(({ key, label }) => {
                  const hasContent =
                    (sections[key] ?? "").trim().length > 0;
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
                      <p className="text-white/40 text-xs mb-2">
                        {SECTION_HELPERS[key]}
                      </p>
                      <Textarea
                        value={sections[key] ?? ""}
                        onChange={(e) =>
                          setSections((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={`Describe your ${label.toLowerCase()}...`}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                      />
                    </div>
                  );
                })}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setStep(1)}
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
            {step === 3 && (
              <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                {/* Play name */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Play name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Earthaven Ecovillage Play"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
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
                    placeholder="A brief overview of what this Play covers and what makes your community's approach distinctive."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
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
                    placeholder="Name of the community or organization"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                {/* Community type */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Community type
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
                    Community scale
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
                        <label className="block text-white/50 text-xs mb-1">
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
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 max-w-[200px]"
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 text-xs mb-1">
                          External payment URL
                        </label>
                        <Input
                          value={externalPaymentUrl}
                          onChange={(e) =>
                            setExternalPaymentUrl(e.target.value)
                          }
                          placeholder="https://buy.stripe.com/..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 text-xs mb-1">
                          Price label (shown to visitors)
                        </label>
                        <Input
                          value={externalPriceLabel}
                          onChange={(e) =>
                            setExternalPriceLabel(e.target.value)
                          }
                          placeholder="e.g., $25 / community"
                          maxLength={100}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 max-w-[250px]"
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
            {step === 4 && (
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
                      <p className="text-white/50 text-xs mb-2">
                        by {creatorProjectName}
                      </p>
                    )}
                    {summary && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-3">
                        {summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
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
                    Section completeness ({filledSectionCount} / 14)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PLAY_SECTIONS.map(({ key, label }) => {
                      const filled =
                        (sections[key] ?? "").trim().length > 0;
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
                              filled ? "text-white/80" : "text-white/40"
                            }
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
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
                  Your Play is pending review. We will notify you when it
                  goes live.
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
