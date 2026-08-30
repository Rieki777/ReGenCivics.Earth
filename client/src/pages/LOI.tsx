import { useState, useEffect } from "react";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { BackButton } from "@/components/BackButton";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { analytics } from "@/lib/analytics";
import { FUND } from "@shared/fund";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LOI() {
  // This page used to redirect to /investor?returnTo=/loi and lost that on a
  // crash fix, after which its comment said the gate lived "on the upstream
  // /opportunity page" while /opportunity's comment said it lived here. It
  // lived in neither, and the server had no accreditation check at all.
  //
  // Since 2026-08-30 the gate is real and it is on the server: loi.submit
  // refuses a pledge from an address that has not been through /investor. The
  // page still loads for everyone, which is the point. Redirecting the page
  // was what crashed twice, and it guarded the wrong moment anyway.
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
    pledgeAmount: "",
    investorType: "individual" as const,
    investmentTimeline: "flexible" as const,
    geographicPreference: "",
    sectorInterests: "",
    motivations: "",
    questionsForTeam: "",
    additionalNotes: "",
    referralSource: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [prefilledFrom, setPrefilledFrom] = useState<null | "account" | "browser">(null);

  const { user } = useAuth();

  // Rye, 2026-08-30: pre-fill so nothing is typed twice. Two sources, and
  // neither can expose one person's details to another: the server route is
  // keyed on the session, and the browser fallback only ever reads what this
  // same browser wrote on /investor.
  const { data: accountPrefill } = trpc.loi.prefill.useQuery(undefined, { enabled: !!user });

  useEffect(() => {
    if (prefilledFrom) return;

    const apply = (src: Record<string, unknown>, from: "account" | "browser") => {
      const pick = (k: string) => {
        const v = src[k];
        return typeof v === "string" && v.trim() ? v : undefined;
      };
      setFormData(prev => ({
        ...prev,
        fullName: pick("fullName") ?? prev.fullName,
        email: pick("email") ?? prev.email,
        phone: pick("phone") ?? prev.phone,
        organization: pick("organization") ?? prev.organization,
        role: pick("role") ?? prev.role,
        geographicPreference: pick("geographicPreference") ?? prev.geographicPreference,
        sectorInterests: pick("sectorInterests") ?? prev.sectorInterests,
        motivations: pick("motivations") ?? prev.motivations,
        questionsForTeam: pick("questionsForTeam") ?? prev.questionsForTeam,
        referralSource: pick("referralSource") ?? prev.referralSource,
      }));
      setPrefilledFrom(from);
    };

    if (accountPrefill) { apply(accountPrefill as Record<string, unknown>, "account"); return; }

    // Signed out, but they may have just completed /investor in this browser.
    try {
      const raw = localStorage.getItem("investor_form_draft");
      if (raw) { apply(JSON.parse(raw), "browser"); return; }
      const email = localStorage.getItem("investor_email");
      const name = localStorage.getItem("investor_name");
      if (email || name) apply({ email, fullName: name }, "browser");
    } catch {
      // A blocked or unparseable store is not an error worth showing anybody.
    }
  }, [accountPrefill, prefilledFrom]);

  const submitLOI = trpc.loi.submit.useMutation({
    onSuccess: () => {
      analytics.loiSubmitted();
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Failed to submit LOI. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pledgeAmount = parseInt(formData.pledgeAmount);
    if (isNaN(pledgeAmount) || pledgeAmount < 250000) {
      setError("The proposed minimum is $250,000. Please enter a valid pledge amount.");
      return;
    }

    submitLOI.mutate({
      ...formData,
      pledgeAmount,
      phone: formData.phone || undefined,
      organization: formData.organization || undefined,
      role: formData.role || undefined,
      geographicPreference: formData.geographicPreference || undefined,
      sectorInterests: formData.sectorInterests || undefined,
      motivations: formData.motivations || undefined,
      questionsForTeam: formData.questionsForTeam || undefined,
      additionalNotes: formData.additionalNotes || undefined,
      referralSource: formData.referralSource || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-16 px-4">
      <SEO {...pageSEO.loi} />
      <BackButton />
        <div className="container max-w-2xl mx-auto">
          <Card className="p-8 bg-white/95 backdrop-blur-sm text-center">
            <CheckCircle2 className="w-16 h-16 text-[#7dd87d] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-[#1a472a] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Thank You for Your Letter of Intent
            </h2>
            <p className="text-[#1a472a]/80 text-lg mb-6">
              We've received your LOI for <span className="font-bold text-[#7dd87d]">${parseInt(formData.pledgeAmount).toLocaleString()}</span>.
            </p>
            <p className="text-[#1a472a]/75 mb-8">
              Our team will review your submission and reach out to you within 3-5 business days to discuss next steps.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/opportunity">
                <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
                  View Investment Opportunity
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10">
                  Return Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-16 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Fund Status Notice */}
        <Card className="p-6 mb-8 bg-[#d4a574]/10 border-2 border-[#d4a574]">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[#d4a574] flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Fund in Formation
              </h2>
              <p className="text-white/90 mb-3 safe-prose">
                We are currently only accepting Letters of Intent (LOIs) from capital partners. The fund will activate once we reach:
              </p>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a574] mt-1">•</span>
                  <span><strong>$20M+ in LOIs</strong> from committed capital partners</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a574] mt-1">•</span>
                  <span><strong>Core fund governance and council</strong> established</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4a574] mt-1">•</span>
                  <span><strong>13+ ideal land projects</strong> and <strong>20+ alliance partners</strong> in our network</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-white/95 backdrop-blur-sm min-w-0">
          <h1 className="text-4xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Letter of Intent
          </h1>
          <p className="text-[#1a472a]/75 mb-8 safe-prose">
            Express your interest in becoming a capital partner for the ReGen Civics Fund. This is a non-binding way to tell us you're interested so we can plan accordingly.
          </p>

          {/* The gate refuses with a route to follow, not just a no. A refusal
              that does not say what to do next reads as a broken form. */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 text-sm">{error}</p>
                {error.includes("/investor") && (
                  <Link href="/investor">
                    <a className="inline-block mt-2 text-sm font-semibold text-[#1a472a] underline">
                      Go to the investor form
                    </a>
                  </Link>
                )}
              </div>
            </div>
          )}

          {prefilledFrom && !submitted && (
            <div className="mb-6 p-4 bg-[#f0f7f0] border border-[#1a472a]/15 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#1a472a] flex-shrink-0 mt-0.5" />
              <p className="text-[#1a472a] text-sm">
                {prefilledFrom === "account"
                  ? "Filled in from the investor form you already completed. Check it over, then all that is left is the amount."
                  : "Filled in from the investor form you completed in this browser. Check it over, then all that is left is the amount."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Contact Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="loi-full-name" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="loi-full-name"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  />
                </div>

                <div>
                  <label htmlFor="loi-email" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="loi-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                  />
                </div>

                <div>
                  <label htmlFor="loi-phone" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Phone
                  </label>
                  <input
                    id="loi-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                    autoComplete="tel"
                    inputMode="tel"
                    enterKeyHint="next"
                  />
                </div>

                <div>
                  <label htmlFor="loi-organization" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Organization
                  </label>
                  <input
                    id="loi-organization"
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="loi-role" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Role/Title
                  </label>
                  <input
                    id="loi-role"
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  />
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Investment Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="loi-pledge-amount" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Pledge Amount (USD) <span className="text-red-500">*</span>
                    <span className="text-xs text-[#1a472a]/80 ml-1">(${FUND.proposedMinimumUsd.toLocaleString()} proposed minimum)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a472a]/80">$</span>
                    <input
                      id="loi-pledge-amount"
                      type="number"
                      required
                      min="250000"
                      step="1000"
                      value={formData.pledgeAmount}
                      onChange={(e) => setFormData({ ...formData, pledgeAmount: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                      placeholder="250000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="loi-investor-type" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Investor Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="loi-investor-type"
                    required
                    value={formData.investorType}
                    onChange={(e) => setFormData({ ...formData, investorType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  >
                    <option value="individual">Individual</option>
                    <option value="family_office">Family Office</option>
                    <option value="foundation">Foundation</option>
                    <option value="impact_fund">Impact Fund</option>
                    <option value="institutional">Institutional</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="loi-investment-timeline" className="block text-sm font-medium text-[#1a472a] mb-2">
                    Investment Timeline
                  </label>
                  <select
                    id="loi-investment-timeline"
                    value={formData.investmentTimeline}
                    onChange={(e) => setFormData({ ...formData, investmentTimeline: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  >
                    <option value="immediate">Immediate (Ready to invest once fund activates)</option>
                    <option value="3_months">Within 3 months</option>
                    <option value="6_months">Within 6 months</option>
                    <option value="1_year">Within 1 year</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Investment Preferences
              </h2>

              <div>
                <label htmlFor="loi-geographic-preference" className="block text-sm font-medium text-[#1a472a] mb-2">
                  Geographic Preference
                </label>
                <input
                  id="loi-geographic-preference"
                  type="text"
                  value={formData.geographicPreference}
                  onChange={(e) => setFormData({ ...formData, geographicPreference: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="e.g., North America, Europe, Global"
                />
              </div>

              <div>
                <label htmlFor="loi-sector-interests" className="block text-sm font-medium text-[#1a472a] mb-2">
                  Sector Interests
                </label>
                <input
                  id="loi-sector-interests"
                  type="text"
                  value={formData.sectorInterests}
                  onChange={(e) => setFormData({ ...formData, sectorInterests: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="e.g., Regenerative agriculture, Ecovillages, Renewable energy"
                />
              </div>

              <div>
                <label htmlFor="loi-motivations" className="block text-sm font-medium text-[#1a472a] mb-2">
                  Motivations
                </label>
                <textarea
                  id="loi-motivations"
                  value={formData.motivations}
                  onChange={(e) => setFormData({ ...formData, motivations: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="What motivates you to invest in regenerative land projects?"
                />
              </div>

              <div>
                <label htmlFor="loi-questions-for-team" className="block text-sm font-medium text-[#1a472a] mb-2">
                  Questions for the Team
                </label>
                <textarea
                  id="loi-questions-for-team"
                  value={formData.questionsForTeam}
                  onChange={(e) => setFormData({ ...formData, questionsForTeam: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="Any questions or concerns you'd like to discuss?"
                />
              </div>

              <div>
                <label htmlFor="loi-additional-notes" className="block text-sm font-medium text-[#1a472a] mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="loi-additional-notes"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="Any other information you'd like to share"
                />
              </div>

              <div>
                <label htmlFor="loi-referral-source" className="block text-sm font-medium text-[#1a472a] mb-2">
                  How did you hear about us?
                </label>
                <input
                  id="loi-referral-source"
                  type="text"
                  value={formData.referralSource}
                  onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80"
                  placeholder="e.g., Referral, Conference, Website"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                disabled={submitLOI.isPending}
                className="flex-1 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] py-3 text-lg font-semibold"
              >
                {submitLOI.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Letter of Intent"
                )}
              </Button>
              <Link href="/opportunity">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 py-3 text-lg"
                >
                  View Investment Opportunity
                </Button>
              </Link>
            </div>
            <DataProtectionBadge compact className="mt-3 justify-center" />
          </form>
        </Card>
      </div>
    </div>
  );
}
