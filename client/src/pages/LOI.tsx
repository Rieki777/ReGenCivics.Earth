/**
 * /loi: tell us you're interested in the cooperative.
 *
 * Until 2026-09-27 this page was a Letter of Intent pledge form: a pledge
 * amount against a proposed $250,000 minimum, an investor type, an
 * accreditation gate on the server (loi.submit) and a banner counting down to
 * a $20M activation threshold. Under the cooperative framing (FUNDING_ENGINE_PLAN
 * v1.2) none of that may appear anywhere, so the page now records interest and
 * nothing more, through trpc.coop.submitInterest (server/routes/coop.ts): who
 * someone is, which of the nine forms of capital they might bring, and consent
 * to be written to. The old page is in git tag archive/fund-pages-2026-09-27.
 *
 * Every sentence about the cooperative comes from COOP in shared/fund.ts.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle, Loader2, Sprout } from "lucide-react";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { analytics } from "@/lib/analytics";
import { COOP } from "@shared/fund";
import { CAPITAL_TYPES, type CapitalType } from "@shared/capitals";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { useAuth } from "@/_core/hooks/useAuth";

type InterestKind = "land_project" | "person" | "organization" | "funder";

/** The four kinds the server accepts (server/routes/coop.ts COOP_INTEREST_KINDS). */
const KIND_OPTIONS: { value: InterestKind; label: string }[] = [
  { value: "land_project", label: "A land project" },
  { value: "person", label: "A person" },
  { value: "organization", label: "An organization" },
  { value: "funder", label: "A funder or foundation" },
];

// 16px text on every screen (the global mobile rule in index.css forces it
// too) and a 44px minimum height, so nothing zooms on focus and every field
// is an easy tap.
const INPUT_CLASS =
  "w-full min-h-[44px] px-4 py-2.5 text-base border border-[#1a472a]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7dd87d] text-[#1a472a] placeholder:text-[#1a472a]/80 bg-white";
const LABEL_CLASS = "block text-sm font-medium text-[#1a472a] mb-2";
const HEADING_STYLE = { fontFamily: "var(--font-display)" } as const;

export default function LOI() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    kind: "" as InterestKind | "",
    organization: "",
    location: "",
    message: "",
  });
  const [capitalForms, setCapitalForms] = useState<CapitalType[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Signed in? Fill in name and email from the session so nothing is typed
  // twice. It never overwrites what the person has already typed.
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || (typeof user.name === "string" ? user.name : ""),
      email: prev.email || (typeof user.email === "string" ? user.email : ""),
    }));
  }, [user]);

  const toggleCapital = (capital: CapitalType) => {
    setCapitalForms((prev) =>
      prev.includes(capital) ? prev.filter((c) => c !== capital) : [...prev, capital],
    );
  };

  const submitInterest = trpc.coop.submitInterest.useMutation({
    onSuccess: () => {
      analytics.loiSubmitted();
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      // A validation failure comes back as a JSON list of issues, which reads
      // as noise. Anything else (the rate limit, an outage) is shown as sent.
      const message = err.message?.trim() ?? "";
      setError(
        message && !message.startsWith("[")
          ? message
          : "Something went wrong. Check your details and try again.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.kind) {
      setError("Choose the option that fits you best.");
      return;
    }
    if (!consent) {
      setError("Tick the consent box so we can keep your details and write to you.");
      return;
    }

    submitInterest.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      kind: form.kind,
      organization: form.organization.trim() || undefined,
      location: form.location.trim() || undefined,
      capitalForms,
      message: form.message.trim() || undefined,
      consent: true,
      source: "loi",
    });
  };

  if (submitted) {
    const firstName = form.name.trim().split(/\s+/)[0] ?? "";
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-16 px-4">
        <SEO {...pageSEO.loi} />
        <div className="container max-w-2xl mx-auto">
          <Card className="p-8 bg-white/95 backdrop-blur-sm text-center" role="status" aria-live="polite">
            <CheckCircle2 className="w-16 h-16 text-[#7dd87d] mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-[#1a472a] mb-4" style={HEADING_STYLE}>
              {firstName ? `Thank you, ${firstName}.` : "Thank you."}
            </h1>
            <p className="text-[#1a472a]/80 text-lg mb-8 safe-prose">{COOP.interestPromise}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white min-h-[44px] px-6">
                <Link href="/opportunity">Read the full design</Link>
              </Button>
              <Button
                asChild
                className="bg-transparent border-2 border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/10 min-h-[44px] px-6"
              >
                <Link href="/">Return home</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-16 px-4">
      <SEO {...pageSEO.loi} />
      <div className="container max-w-4xl mx-auto">
        {/* Where the cooperative stands, before anyone types a word. */}
        <Card className="p-6 mb-8 bg-[#d4a574]/10 border-2 border-[#d4a574]">
          <div className="flex items-start gap-4">
            <Sprout className="w-6 h-6 text-[#d4a574] flex-shrink-0 mt-1" aria-hidden="true" />
            <div>
              <span className="inline-block mb-2 px-3 py-1 rounded-full bg-[#d4a574]/20 text-[#f3d9b8] text-xs font-semibold uppercase tracking-wider">
                {COOP.statusLabel}
              </span>
              <h2 className="text-xl font-bold text-white mb-2" style={HEADING_STYLE}>
                {COOP.name}
              </h2>
              <p className="text-white/90 safe-prose">{COOP.statement}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 bg-white/95 backdrop-blur-sm min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1a472a] mb-3" style={HEADING_STYLE}>
            Tell us you're interested
          </h1>
          <p className="text-[#1a472a]/75 mb-8 safe-prose">{COOP.interestPromise}</p>

          {error && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* About you */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1a472a]" style={HEADING_STYLE}>
                About you
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="interest-name" className={LABEL_CLASS}>
                    Your name <span className="text-red-700" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="interest-name"
                    type="text"
                    required
                    maxLength={160}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={INPUT_CLASS}
                    autoComplete="name"
                    enterKeyHint="next"
                  />
                </div>

                <div>
                  <label htmlFor="interest-email" className={LABEL_CLASS}>
                    Email <span className="text-red-700" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="interest-email"
                    type="email"
                    required
                    maxLength={320}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={INPUT_CLASS}
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                  />
                </div>

                <div>
                  <label htmlFor="interest-organization" className={LABEL_CLASS}>
                    Organization or project <span className="text-[#1a472a]/80 font-normal">(optional)</span>
                  </label>
                  <input
                    id="interest-organization"
                    type="text"
                    maxLength={200}
                    value={form.organization}
                    onChange={(e) => update("organization", e.target.value)}
                    className={INPUT_CLASS}
                    autoComplete="organization"
                    enterKeyHint="next"
                  />
                </div>

                <div>
                  <label htmlFor="interest-location" className={LABEL_CLASS}>
                    Where you are <span className="text-[#1a472a]/80 font-normal">(optional)</span>
                  </label>
                  <input
                    id="interest-location"
                    type="text"
                    maxLength={200}
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Town, region or bioregion"
                    enterKeyHint="next"
                  />
                </div>
              </div>
            </div>

            {/* Kind: required, one of the four the server accepts */}
            <fieldset className="space-y-3">
              <legend className="text-xl font-bold text-[#1a472a] mb-3" style={HEADING_STYLE}>
                I'm interested as <span className="text-red-700 text-base" aria-hidden="true">*</span>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {KIND_OPTIONS.map((opt) => {
                  const selected = form.kind === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#7dd87d] ${
                        selected
                          ? "border-[#7dd87d] bg-[#7dd87d]/10"
                          : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="interest-kind"
                        value={opt.value}
                        checked={selected}
                        onChange={() => update("kind", opt.value)}
                        required
                        className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
                      />
                      <span className="text-[#1a472a] font-medium">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* The nine forms of capital: optional */}
            <fieldset className="space-y-3">
              <legend className="text-xl font-bold text-[#1a472a] mb-1" style={HEADING_STYLE}>
                What you might bring <span className="text-[#1a472a]/80 text-base font-normal">(optional)</span>
              </legend>
              <p className="text-sm text-[#1a472a]/80 safe-prose">
                The cooperative is being designed to recognize all nine forms of capital. Tick any that
                fit.{" "}
                <a
                  href="/learn/nine-forms-of-capital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#1a472a] underline underline-offset-2"
                >
                  About the nine forms<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CAPITAL_TYPES.map((capital) => {
                  const checked = capitalForms.includes(capital);
                  return (
                    <label
                      key={capital}
                      className={`flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#7dd87d] ${
                        checked
                          ? "border-[#7dd87d] bg-[#7dd87d]/10"
                          : "border-[#1a472a]/20 hover:border-[#7dd87d]/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="interest-capital"
                        value={capital}
                        checked={checked}
                        onChange={() => toggleCapital(capital)}
                        className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
                      />
                      <span className="text-[#1a472a] font-medium">{CAPITAL_LABELS[capital].label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Message: optional */}
            <div>
              <label htmlFor="interest-message" className={LABEL_CLASS}>
                Anything else you'd like us to know{" "}
                <span className="text-[#1a472a]/80 font-normal">(optional)</span>
              </label>
              <textarea
                id="interest-message"
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                rows={4}
                maxLength={4000}
                className={INPUT_CLASS}
                placeholder="Your land, your work, your questions"
              />
            </div>

            {/* Consent: required */}
            <div>
              <label
                htmlFor="interest-consent"
                className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer"
              >
                <input
                  id="interest-consent"
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 mt-0.5 flex-shrink-0 accent-[#1a472a]"
                />
                <span className="text-sm text-[#1a472a] safe-prose">
                  I agree that ReGen Civics may keep these details and email me about the cooperative. I can
                  ask to be removed at any time.{" "}
                  <span className="text-red-700" aria-hidden="true">*</span>
                </span>
              </label>
              <p className="text-xs text-[#1a472a]/80 pl-8">
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Privacy policy<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                type="submit"
                disabled={submitInterest.isPending}
                className="flex-1 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] min-h-[48px] py-3 text-lg font-semibold"
              >
                {submitInterest.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
              {/* Default variant with explicit colors: the outline variant's
                  dark:border-input wins on the dark-mode public site. */}
              <Button
                asChild
                className="flex-1 bg-transparent border-2 border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/10 min-h-[48px] py-3 text-lg"
              >
                <Link href="/opportunity">Read the full design</Link>
              </Button>
            </div>

            <p className="text-sm text-[#1a472a]/80 safe-prose">
              To talk it through first,{" "}
              <Link href="/investor/contact" className="font-semibold text-[#1a472a] underline underline-offset-2">
                write to us
              </Link>
              .
            </p>

            <p className="text-xs text-[#1a472a]/80 leading-relaxed border-t border-[#1a472a]/10 pt-4 safe-prose">
              {COOP.notAnOffer}
            </p>
          </form>
        </Card>

        {/* Outside the white card: the compact badge is white text. */}
        <DataProtectionBadge compact className="mt-4 justify-center" />
      </div>
    </div>
  );
}
