import { useState } from "react";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { BackButton } from "@/components/BackButton";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { analytics } from "@/lib/analytics";

export default function LOI() {
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
      setError("Minimum investment is $250,000. Please enter a valid pledge amount.");
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
            <h1 className="text-3xl font-bold text-[#1a472a] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Thank You for Your Letter of Intent
            </h1>
            <p className="text-[#1a472a]/80 text-lg mb-6">
              We've received your LOI for <span className="font-bold text-[#7dd87d]">${parseInt(formData.pledgeAmount).toLocaleString()}</span>.
            </p>
            <p className="text-[#1a472a]/70 mb-8">
              Our team will review your submission and reach out to you within 3-5 business days to discuss next steps.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/investor">
                <Button className="bg-[#7dd87d] hover:bg-[#6bc76b] text-[#1a472a]">
                  View Investment Thesis
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
                Fund Not Yet Active
              </h2>
              <p className="text-white/90 mb-3">
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

        <Card className="p-8 bg-white/95 backdrop-blur-sm">
          <h1 className="text-4xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Letter of Intent
          </h1>
          <p className="text-[#1a472a]/70 mb-8">
            Express your interest in becoming a capital partner for the ReGen Civics Fund. This is not a binding commitment, but helps us understand the level of interest and plan accordingly.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Role/Title
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  />
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Investment Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Pledge Amount (USD) <span className="text-red-500">*</span>
                    <span className="text-xs text-[#1a472a]/50 ml-1">($250,000 minimum)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a472a]/60">$</span>
                    <input
                      type="number"
                      required
                      min="250000"
                      step="1000"
                      value={formData.pledgeAmount}
                      onChange={(e) => setFormData({ ...formData, pledgeAmount: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                      placeholder="250000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Investor Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.investorType}
                    onChange={(e) => setFormData({ ...formData, investorType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
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
                  <label className="block text-sm font-medium text-[#1a472a] mb-2">
                    Investment Timeline
                  </label>
                  <select
                    value={formData.investmentTimeline}
                    onChange={(e) => setFormData({ ...formData, investmentTimeline: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
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
              <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Investment Preferences
              </h3>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  Geographic Preference
                </label>
                <input
                  type="text"
                  value={formData.geographicPreference}
                  onChange={(e) => setFormData({ ...formData, geographicPreference: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="e.g., North America, Europe, Global"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  Sector Interests
                </label>
                <input
                  type="text"
                  value={formData.sectorInterests}
                  onChange={(e) => setFormData({ ...formData, sectorInterests: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="e.g., Regenerative agriculture, Ecovillages, Renewable energy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  Motivations
                </label>
                <textarea
                  value={formData.motivations}
                  onChange={(e) => setFormData({ ...formData, motivations: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="What motivates you to invest in regenerative land projects?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  Questions for the Team
                </label>
                <textarea
                  value={formData.questionsForTeam}
                  onChange={(e) => setFormData({ ...formData, questionsForTeam: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="Any questions or concerns you'd like to discuss?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="Any other information you'd like to share"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-2">
                  How did you hear about us?
                </label>
                <input
                  type="text"
                  value={formData.referralSource}
                  onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                  className="w-full px-4 py-2 border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d]"
                  placeholder="e.g., Referral, Conference, Website"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                disabled={submitLOI.isPending}
                className="flex-1 bg-[#7dd87d] hover:bg-[#6bc76b] text-[#1a472a] py-3 text-lg font-semibold"
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
              <Link href="/investor">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 py-3 text-lg"
                >
                  View Investment Thesis
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
