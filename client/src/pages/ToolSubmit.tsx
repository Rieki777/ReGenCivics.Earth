/**
 * Tool Submit - Submit a new tool via URL analysis
 * Route: /tools/submit
 */
import { useState } from "react";
import { Link as LinkIcon, Loader2, CheckCircle2, ArrowLeft, Wrench, X, Plus } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const CATEGORY_OPTIONS = [
  "Land Management",
  "Governance",
  "Finance",
  "Community",
  "Mapping",
  "Education",
  "Communication",
  "Data & Research",
];

const PRICING_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Paid" },
  { value: "open_source", label: "Open Source" },
];

type Step = "url" | "analyzing" | "form" | "success";

export default function ToolSubmit() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");

  // Form fields (pre-filled after analysis)
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [pricing, setPricing] = useState("free");
  const [regions, setRegions] = useState("");
  const [problemStatements, setProblemStatements] = useState("");

  const analyzeUrl = trpc.tools.analyzeUrl.useMutation({
    onSuccess: (data) => {
      setName(data.name || "");
      setSummary(data.shortSummary || "");
      setStep("form");
      setStep("form");
    },
    onError: () => {
      // If analysis fails, still go to form so user can fill manually
      setStep("form");
    },
  });

  const submitTool = trpc.tools.submitTool.useMutation({
    onSuccess: () => {
      setStep("success");
    },
  });

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setStep("analyzing");
    analyzeUrl.mutate({ url });
  };

  const handleSubmit = () => {
    submitTool.mutate({
      websiteUrl: url,
      name,
      shortSummary: summary,
      longDescription: description,
      pricingModel: (pricing as any) || "free",
      regions: regions.split(",").map((r) => r.trim()).filter(Boolean),
      problemStatements: problemStatements.split("\n").map((p) => p.trim()).filter(Boolean),
    });
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center px-4">
        <SEO title="Submit a Tool | ReGen Civics" description="Submit a regenerative tool to the community library." url="/tools/submit" />
        <div className="text-center">
          <Wrench className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Sign in to submit a tool</h2>
          <p className="text-white/50 text-sm mb-6">You need an account to add tools to the library.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold">
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
        title="Submit a Tool | ReGen Civics"
        description="Submit a regenerative tool to the community library."
        url="/tools/submit"
      />

      {/* Back button */}
      <div className="pt-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/tools">
            <button className="flex items-center gap-2 text-white/50 hover:text-white/70 text-sm transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Tools Library
            </button>
          </Link>
        </div>
      </div>

      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-8">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Submit a Tool
              </h1>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                Share a tool that has helped your regenerative work. Paste the URL and we will pull in the details for you to review.
              </p>
            </div>

            {/* Step 1: URL Input */}
            {step === "url" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <label className="block text-white/70 text-sm font-medium mb-1">Tool website URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10"
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!url.trim()}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold"
                  >
                    Analyze
                  </Button>
                </div>
                <p className="text-white/30 text-xs">
                  We will read the page and pre-fill the submission form. You can edit everything before submitting.
                </p>
              </div>
            )}

            {/* Step 2: Analyzing */}
            {step === "analyzing" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <Loader2 className="w-10 h-10 text-[#7dd87d] animate-spin mx-auto mb-4" />
                <p className="text-white font-medium mb-1">Analyzing {url}</p>
                <p className="text-white/40 text-sm">Reading the page and extracting tool details...</p>
              </div>
            )}

            {/* Step 3: Editable Form */}
            {step === "form" && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                {analyzeUrl.isError && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-sm">
                    Could not auto-fill from the URL. Fill in the details manually below.
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">Tool name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Regen Network"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">Short summary</label>
                  <Input
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="One-line description of what this tool does"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">Full description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this tool do? Who is it for? How does it support regenerative work?"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          categories.includes(cat)
                            ? "bg-[#7dd87d] text-[#1a472a]"
                            : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {categories.includes(cat) ? (
                          <X className="w-3 h-3 inline mr-1" />
                        ) : (
                          <Plus className="w-3 h-3 inline mr-1" />
                        )}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Pricing</label>
                  <div className="flex flex-wrap gap-2">
                    {PRICING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPricing(opt.value)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          pricing === opt.value
                            ? "bg-[#7dd87d] text-[#1a472a]"
                            : "bg-white/5 text-white/50 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">Regions (comma separated)</label>
                  <Input
                    value={regions}
                    onChange={(e) => setRegions(e.target.value)}
                    placeholder="e.g., North America, Europe, Global"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                {/* Problem Statements */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1">
                    Problem statements (one per line)
                  </label>
                  <Textarea
                    value={problemStatements}
                    onChange={(e) => setProblemStatements(e.target.value)}
                    placeholder={"I need to track soil health over time\nI want to coordinate land stewardship across properties"}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                  />
                  <p className="text-white/30 text-xs mt-1">
                    These help other people find this tool when they describe their problems.
                  </p>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setStep("url")}
                    variant="outline"
                    className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!name.trim() || !summary.trim() || submitTool.isPending}
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold flex-1"
                  >
                    {submitTool.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Submit Tool"
                    )}
                  </Button>
                </div>

                {submitTool.isError && (
                  <p className="text-red-400 text-sm mt-2">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <div className="bg-white/5 border border-[#7dd87d]/20 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
                <h2 className="text-white text-xl font-semibold mb-2">Tool submitted</h2>
                <p className="text-white/60 text-sm mb-6">
                  Thank you for sharing this with the community. Your submission will be reviewed and added to the library soon.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/tools">
                    <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold">
                      Browse Tools
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      setStep("url");
                      setUrl("");
                      setName("");
                      setSummary("");
                      setDescription("");
                      setCategories([]);
                      setPricing("free");
                      setRegions("");
                      setProblemStatements("");
                    }}
                    variant="outline"
                    className="text-white/60 border-white/20 hover:text-white hover:border-white/40"
                  >
                    Submit Another
                  </Button>
                </div>
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
