/**
 * /investor/contact: "Talk with us", for land projects, partners, funders and
 * foundations.
 *
 * Until 2026-09-27 this was a follow-up form for "verified investors": it
 * redirected anyone without the investor_verified marker (set by the old
 * /investor accreditation form) back to /investor, then showed their name and
 * email locked. /investor now redirects to /loi and the cooperative has no
 * investors, so the gate would have sent every visitor to the interest form.
 * The gate is gone and every field is editable. The submit path is unchanged:
 * investorInquiries.submitFollowUp (server/routes/investors.ts), public and
 * rate limited, which needs no prior inquiry. The route keeps its old path
 * because other pages and emails link to it.
 *
 * Prefill, so nothing is typed twice: the signed-in account first, then what
 * this same browser saved on the old /investor form, if anything.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { COOP } from "@shared/fund";
import { ArrowLeft, CheckCircle2, Mail, Loader2 } from "lucide-react";

/** What the retired /investor form left in this browser, if anything. */
function loadSavedContact(): { fullName: string; email: string; organization: string } {
  const empty = { fullName: "", email: "", organization: "" };
  if (typeof window === "undefined") return empty;
  try {
    let organization = "";
    const raw = localStorage.getItem("investor_form_draft");
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.organization === "string") organization = parsed.organization;
    }
    return {
      fullName: localStorage.getItem("investor_name") ?? "",
      email: localStorage.getItem("investor_email") ?? "",
      organization,
    };
  } catch {
    // Blocked storage or corrupt JSON: start with empty fields.
    return empty;
  }
}

const FIELD_CLASS = "bg-white/5 border-white/15 text-white placeholder:text-white/60 mt-1";

export default function InvestorContact() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { user } = useAuth();

  // Fill empty fields once: the account, then this browser's saved details.
  // Never overwrites anything the person has typed.
  useEffect(() => {
    const saved = loadSavedContact();
    const accountName = typeof user?.name === "string" ? user.name : "";
    const accountEmail = typeof user?.email === "string" ? user.email : "";
    setFullName((prev) => prev || accountName || saved.fullName);
    setEmail((prev) => prev || accountEmail || saved.email);
    setOrganization((prev) => prev || saved.organization);
  }, [user]);

  const submit = trpc.investorInquiries.submitFollowUp.useMutation({
    onSuccess: () => {
      setSentTo(email.trim());
      setMessage("");
    },
    onError: (err) => {
      // A validation failure arrives as a JSON list of issues; show a plain
      // sentence for that and the server's own words for anything else.
      const text = err.message?.trim() ?? "";
      setSubmitError(
        text && !text.startsWith("[") ? text : "Could not send. Check your details and try again.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setSubmitError("Add your name, your email and a message, then send.");
      return;
    }
    submit.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      message: message.trim(),
      organization: organization.trim() || undefined,
    });
  };

  if (sentTo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] flex items-center justify-center p-4">
        <SEO title="Message sent | ReGen Civics" description="Your message has reached the ReGen Civics team." />
        <Card className="w-full max-w-lg bg-white/5 border-[#7dd87d]/30" role="status" aria-live="polite">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-14 h-14 text-[#7dd87d] mx-auto mb-3" aria-hidden="true" />
            <CardTitle className="text-white text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              Message received.
            </CardTitle>
            <CardDescription className="text-white/70 mt-2">
              Someone on the team will write back to <strong className="text-white">{sentTo}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-white/60 text-sm">To send another, reload this page.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                asChild
                className="bg-transparent border-2 border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10 min-h-[44px]"
              >
                <Link href="/fund">Back to the cooperative</Link>
              </Button>
              <Button asChild className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] min-h-[44px]">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a] py-12 px-4">
      <SEO
        title="Talk with us | ReGen Civics"
        description="Land projects, partners, funders and foundations can send the ReGen Civics team a message here."
      />
      <div className="max-w-2xl mx-auto">
        <Link
          href="/fund"
          className="inline-flex items-center gap-2 min-h-[44px] text-[#7dd87d]/80 hover:text-[#7dd87d] text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to the cooperative
        </Link>

        <Card className="bg-white/5 border-[#7dd87d]/30">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
              <CardTitle className="text-white text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                Talk with us
              </CardTitle>
            </div>
            <CardDescription className="text-white/70">
              For land projects, partners, funders and foundations. Tell us who you are and what you'd
              like to talk about, and someone on the team will write back.
            </CardDescription>
            <p className="text-white/70 text-sm pt-1">
              To tell us you're interested in the cooperative,{" "}
              <Link href="/loi" className="text-[#7dd87d] underline underline-offset-2 hover:text-[#9de89d]">
                use the interest form
              </Link>
              .
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name" className="text-white/80 text-sm">
                    Your name
                  </Label>
                  <Input
                    id="contact-name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    required
                    maxLength={255}
                    autoComplete="name"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email" className="text-white/80 text-sm">
                    Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    required
                    autoComplete="email"
                    inputMode="email"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact-organization" className="text-white/80 text-sm">
                  Organization or project <span className="text-white/60">(optional)</span>
                </Label>
                <Input
                  id="contact-organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  maxLength={255}
                  autoComplete="organization"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <Label htmlFor="contact-message" className="text-white/80 text-sm">
                  Your message
                </Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  required
                  placeholder="Tell us about your land project, your organization or what you'd like to talk through."
                  rows={8}
                  className={FIELD_CLASS}
                  maxLength={4000}
                />
                <p className="text-white/60 text-xs mt-1 text-right">
                  {message.length}/4000
                </p>
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="text-red-300 text-sm bg-red-900/20 border border-red-500/30 rounded p-3"
                >
                  {submitError}
                </p>
              )}

              <Button
                type="submit"
                className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] w-full sm:w-auto min-h-[44px] disabled:opacity-50"
                disabled={submit.isPending}
              >
                {submit.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Send message"
                )}
              </Button>

              <p className="text-white/70 text-xs leading-relaxed">
                Your message goes straight to the ReGen Civics team. Someone writes back within a few
                business days.
              </p>
              <p className="text-white/60 text-xs leading-relaxed">{COOP.notAnOffer}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
