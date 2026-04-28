/**
 * /investor/contact
 *
 * Dedicated follow-up form for investors who already submitted the
 * InvestorForm and got access to /opportunity. Pre-populates name +
 * email + organization from the localStorage cache the InvestorForm
 * writes on successful submit, so the investor only has to type their
 * question.
 *
 * Submits to investorInquiries.submitFollowUp which creates a new
 * investor_inquiries row tagged with referralSource = "opportunity_followup",
 * so admin sees it threaded with the investor's original inquiry by
 * email rather than as a generic Connect inquiry.
 *
 * If localStorage is missing the verified-investor markers (first-time
 * visitor or different device), we redirect them through /investor with
 * returnTo=/investor/contact so they sign the form first.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Mail, Loader2 } from "lucide-react";

const INVESTOR_LS_KEY = "investor_form_draft";

type CachedInvestorContext = {
  fullName: string;
  email: string;
  organization?: string;
  role?: string;
};

function loadCachedInvestor(): CachedInvestorContext | null {
  if (typeof window === "undefined") return null;
  const verified =
    localStorage.getItem("investor_verified") === "true" ||
    sessionStorage.getItem("investor_verified") === "true";
  if (!verified) return null;

  const email = localStorage.getItem("investor_email") ?? "";
  const fullName = localStorage.getItem("investor_name") ?? "";
  if (!email || !fullName) return null;

  // The full draft object holds organization + role too. It's keyed
  // INVESTOR_LS_KEY and may be cleared after submission, so don't
  // rely on it being there.
  let organization: string | undefined;
  let role: string | undefined;
  try {
    const raw = localStorage.getItem(INVESTOR_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.organization === "string") organization = parsed.organization;
      if (typeof parsed.role === "string") role = parsed.role;
    }
  } catch {
    /* ignore corrupt JSON */
  }

  return { fullName, email, organization, role };
}

export default function InvestorContact() {
  const [, setLocation] = useLocation();
  const [investor, setInvestor] = useState<CachedInvestorContext | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = trpc.investorInquiries.submitFollowUp.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setMessage("");
    },
    onError: (err) => {
      setSubmitError(err.message ?? "Could not send. Try again in a moment.");
    },
  });

  useEffect(() => {
    const cached = loadCachedInvestor();
    if (!cached) {
      setLocation(
        `/investor?returnTo=${encodeURIComponent("/investor/contact")}`,
      );
      return;
    }
    setInvestor(cached);
  }, [setLocation]);

  if (!investor) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#7dd87d] animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center p-4">
        <SEO title="Message sent — ReGen Civics" description="Your investor follow-up has been received." />
        <Card className="w-full max-w-lg bg-white/5 border-[#7dd87d]/30">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-14 h-14 text-[#7dd87d] mx-auto mb-3" />
            <CardTitle className="text-white text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              Message received.
            </CardTitle>
            <CardDescription className="text-white/70 mt-2">
              Our investor team has it in the queue and will follow up
              from <strong className="text-white">{investor.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-white/60 text-sm">
              Want to send another? Reload this page. Otherwise, you can
              head back to the opportunity overview.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/opportunity">
                <Button variant="outline" className="border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                  Back to Opportunity
                </Button>
              </Link>
              <Link href="/">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] py-12 px-4">
      <SEO
        title="Contact our investor team — ReGen Civics"
        description="Send a follow-up question to the ReGen Civics investor team."
      />
      <div className="max-w-2xl mx-auto">
        <Link
          href="/opportunity"
          className="inline-flex items-center gap-2 text-[#7dd87d]/80 hover:text-[#7dd87d] text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Opportunity
        </Link>

        <Card className="bg-white/5 border-[#7dd87d]/30">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-[#7dd87d]" />
              <CardTitle className="text-white text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                Contact our investor team
              </CardTitle>
            </div>
            <CardDescription className="text-white/70">
              We've already got your investor profile from your earlier
              submission. Add your question below and our team will follow
              up. Replies route to admin alongside your original inquiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Identity (locked, since they already verified) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80 text-sm">Name</Label>
                <Input
                  value={investor.fullName}
                  readOnly
                  className="bg-white/5 border-white/10 text-white mt-1 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Email</Label>
                <Input
                  value={investor.email}
                  readOnly
                  className="bg-white/5 border-white/10 text-white mt-1 cursor-not-allowed"
                />
              </div>
            </div>

            {investor.organization && (
              <div>
                <Label className="text-white/80 text-sm">Organization</Label>
                <Input
                  value={investor.organization}
                  readOnly
                  className="bg-white/5 border-white/10 text-white mt-1 cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <Label htmlFor="message" className="text-white/80 text-sm">
                Your question
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                placeholder="What would you like to know? Returns, structure, timeline, due-diligence access..."
                rows={8}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 mt-1"
                maxLength={4000}
              />
              <p className="text-white/40 text-xs mt-1 text-right">
                {message.length}/4000
              </p>
            </div>

            {submitError && (
              <p className="text-red-300 text-sm bg-red-900/20 border border-red-500/30 rounded p-3">
                {submitError}
              </p>
            )}

            <Button
              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] w-full sm:w-auto disabled:opacity-50"
              disabled={!message.trim() || submit.isPending}
              onClick={() =>
                submit.mutate({
                  fullName: investor.fullName,
                  email: investor.email,
                  message: message.trim(),
                  organization: investor.organization,
                  role: investor.role,
                })
              }
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send question"
              )}
            </Button>

            <p className="text-white/50 text-xs leading-relaxed">
              We don't respond from a personal inbox. Your message lands
              directly in our admin alongside your investor profile, and a
              team member follows up within a few business days.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
