/**
 * /loi: sign a letter of intent to the cooperative treasury, or tell us you're
 * interested.
 *
 * History. Until 2026-09-27 this page was the fund's pledge form, with a
 * proposed $250,000 minimum and an accreditation gate. ADR-62 turned it into
 * a no-amount interest form. On 2026-10-21 (ADR-78) Rye brought letters of
 * intent back so people can commit financial capital: the network treasury
 * launches when $20 million in letters of intent are signed, and it will be
 * formed to meet the legal and regulatory needs of the funders. So the letter
 * asks for an amount (no minimum), who is signing, where they are and,
 * optionally, whether they are a US accredited investor. That answer helps
 * choose the legal form and never limits who can sign.
 *
 * Two paths on one page:
 *   - "letter": a non-binding letter of intent with an amount, through
 *     trpc.loi.submit (server/routes/investors.ts, table letter_of_intent).
 *   - "interest": land projects, people and organizations bringing land,
 *     skills, tools or time, through trpc.coop.submitInterest (unchanged).
 * /loi?path=interest opens the second one.
 *
 * Every sentence about the cooperative comes from COOP in shared/fund.ts.
 * The page never says what anyone gets back (gate G5).
 */
import { useEffect, useId, useState } from "react";
import { Link } from "wouter";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle, Loader2, Sprout, FileSignature, HandHeart } from "lucide-react";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { analytics } from "@/lib/analytics";
import { COOP } from "@shared/fund";
import { CAPITAL_TYPES, type CapitalType } from "@shared/capitals";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import {
  LOI_MAX_PLEDGE_USD,
  type LoiAccreditedStatus,
  type LoiInvestorType,
  type LoiTimeline,
} from "@shared/loiFields";
import { useAuth } from "@/_core/hooks/useAuth";

type Path = "letter" | "interest";
type InterestKind = "land_project" | "person" | "organization" | "funder";

const CALL_URL = "https://calendly.com/rieki-cordon/30min";

/** Who is signing. Values are shared/loiFields.ts LOI_INVESTOR_TYPES. */
const SIGNER_OPTIONS: { value: LoiInvestorType; label: string }[] = [
  { value: "individual", label: "A person" },
  { value: "land_project", label: "A land project" },
  { value: "family_office", label: "A family office" },
  { value: "foundation", label: "A foundation" },
  { value: "impact_fund", label: "An impact fund" },
  { value: "institutional", label: "An institution" },
  { value: "other", label: "A business or other organization" },
];

const TIMELINE_OPTIONS: { value: LoiTimeline; label: string }[] = [
  { value: "immediate", label: "As soon as it forms" },
  { value: "3_months", label: "Within 3 months of forming" },
  { value: "6_months", label: "Within 6 months of forming" },
  { value: "1_year", label: "Within a year of forming" },
  { value: "flexible", label: "Flexible" },
];

const ACCREDITED_OPTIONS: { value: LoiAccreditedStatus; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
  { value: "not_us", label: "I'm not in the US" },
];

/** The four kinds the interest form accepts (server/routes/coop.ts COOP_INTEREST_KINDS). */
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
  "w-full min-h-[44px] px-4 py-2.5 text-base border border-[#1a472a]/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a472a] text-[#1a472a] placeholder:text-[#1a472a]/80 bg-white";
const LABEL_CLASS = "block text-sm font-medium text-[#1a472a] mb-2";
const LEGEND_CLASS = "text-xl font-bold text-[#1a472a] mb-1";
const OPTIONAL = <span className="text-[#1a472a]/80 font-normal">(optional)</span>;
const REQUIRED = <span className="text-red-700" aria-hidden="true">*</span>;
const HEADING_STYLE = { fontFamily: "var(--font-display)" } as const;

function choiceClass(selected: boolean): string {
  return `flex items-center gap-3 min-h-[44px] px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#1a472a] ${
    selected ? "border-[#1a472a] bg-[#7dd87d]/15" : "border-[#1a472a]/25 hover:border-[#1a472a]/60"
  }`;
}

/** "250000" or "$250,000" to 250000; anything without a digit to null. */
function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

function formatAmount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Which path the page opens on. */
function initialPath(): Path {
  if (typeof window === "undefined") return "letter";
  return new URLSearchParams(window.location.search).get("path") === "interest" ? "interest" : "letter";
}

/** Shared fields: who someone is. */
type Contact = { name: string; email: string; organization: string; location: string };

function useContactPrefill(setContact: (fn: (prev: Contact) => Contact) => void) {
  // Signed in? Fill in name and email from the session so nothing is typed
  // twice. It never overwrites what the person has already typed.
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    setContact((prev) => ({
      ...prev,
      name: prev.name || (typeof user.name === "string" ? user.name : ""),
      email: prev.email || (typeof user.email === "string" ? user.email : ""),
    }));
  }, [user, setContact]);
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-red-800 text-sm">{message}</p>
    </div>
  );
}

/** A validation failure comes back as a JSON list of issues, which reads as noise. */
function readableError(message: string | undefined): string {
  const m = message?.trim() ?? "";
  return m && !m.startsWith("[") ? m : "Something went wrong. Check your details and try again.";
}

function ContactFields({
  idPrefix,
  contact,
  update,
  locationLabel,
  locationPlaceholder,
}: {
  idPrefix: string;
  contact: Contact;
  update: (key: keyof Contact, value: string) => void;
  locationLabel: string;
  locationPlaceholder: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLASS}>
          Your name {REQUIRED}
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          maxLength={160}
          value={contact.name}
          onChange={(e) => update("name", e.target.value)}
          className={INPUT_CLASS}
          autoComplete="name"
          enterKeyHint="next"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-email`} className={LABEL_CLASS}>
          Email {REQUIRED}
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          required
          maxLength={320}
          value={contact.email}
          onChange={(e) => update("email", e.target.value)}
          className={INPUT_CLASS}
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-organization`} className={LABEL_CLASS}>
          Organization or project {OPTIONAL}
        </label>
        <input
          id={`${idPrefix}-organization`}
          type="text"
          maxLength={200}
          value={contact.organization}
          onChange={(e) => update("organization", e.target.value)}
          className={INPUT_CLASS}
          autoComplete="organization"
          enterKeyHint="next"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-location`} className={LABEL_CLASS}>
          {locationLabel} {OPTIONAL}
        </label>
        <input
          id={`${idPrefix}-location`}
          type="text"
          maxLength={120}
          value={contact.location}
          onChange={(e) => update("location", e.target.value)}
          className={INPUT_CLASS}
          placeholder={locationPlaceholder}
          enterKeyHint="next"
        />
      </div>
    </div>
  );
}

function CapitalCheckboxes({
  name,
  selected,
  toggle,
}: {
  name: string;
  selected: CapitalType[];
  toggle: (capital: CapitalType) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {CAPITAL_TYPES.map((capital) => {
        const checked = selected.includes(capital);
        return (
          <label key={capital} className={choiceClass(checked)}>
            <input
              type="checkbox"
              name={name}
              value={capital}
              checked={checked}
              onChange={() => toggle(capital)}
              className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
            />
            <span className="text-[#1a472a] font-medium">{CAPITAL_LABELS[capital].label}</span>
          </label>
        );
      })}
    </div>
  );
}

function NineFormsLink() {
  return (
    <a
      href="/learn/nine-forms-of-capital"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#1a472a] underline underline-offset-2"
    >
      About the nine forms<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function PrivacyLink() {
  return (
    <p className="text-xs text-[#1a472a]/80 pl-8">
      <a
        href="/privacy-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center min-h-6 pointer-coarse:min-h-11 underline underline-offset-2"
      >
        Privacy policy<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}

// =============================================
// LETTER OF INTENT
// =============================================

function LetterForm({ onDone }: { onDone: (firstName: string, amount: number) => void }) {
  const [contact, setContact] = useState<Contact>({ name: "", email: "", organization: "", location: "" });
  const [phone, setPhone] = useState("");
  const [signer, setSigner] = useState<LoiInvestorType | "">("");
  const [amountText, setAmountText] = useState("");
  const [timeline, setTimeline] = useState<LoiTimeline>("flexible");
  const [accredited, setAccredited] = useState<LoiAccreditedStatus | "">("");
  const [capitalForms, setCapitalForms] = useState<CapitalType[]>([]);
  const [motivations, setMotivations] = useState("");
  const [questions, setQuestions] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const amountHelpId = useId();
  const accreditedHelpId = useId();

  useContactPrefill(setContact);
  const update = (key: keyof Contact, value: string) => setContact((prev) => ({ ...prev, [key]: value }));
  const toggleCapital = (capital: CapitalType) =>
    setCapitalForms((prev) => (prev.includes(capital) ? prev.filter((c) => c !== capital) : [...prev, capital]));

  const amount = parseAmount(amountText);

  const submit = trpc.loi.submit.useMutation({
    onSuccess: () => {
      analytics.loiSubmitted();
      setError("");
      onDone(contact.name.trim().split(/\s+/)[0] ?? "", amount ?? 0);
    },
    onError: (err) => setError(readableError(err.message)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!signer) {
      setError("Choose who is signing the letter.");
      return;
    }
    if (amount == null || amount < 1) {
      setError("Enter the amount you'd commit, in US dollars. Any amount is welcome.");
      return;
    }
    if (amount > LOI_MAX_PLEDGE_USD) {
      setError(`For an amount over $${formatAmount(LOI_MAX_PLEDGE_USD)}, write to us and we'll talk it through.`);
      return;
    }
    if (!consent) {
      setError("Tick the box to confirm you've read what the letter means.");
      return;
    }
    submit.mutate({
      fullName: contact.name.trim(),
      email: contact.email.trim(),
      phone: phone.trim() || undefined,
      organization: contact.organization.trim() || undefined,
      country: contact.location.trim() || undefined,
      pledgeAmount: amount,
      investorType: signer,
      investmentTimeline: timeline,
      accreditedStatus: accredited || undefined,
      capitalForms,
      motivations: motivations.trim() || undefined,
      questionsForTeam: questions.trim() || undefined,
      consent: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-labelledby="loi-heading">
      <div>
        <h2 id="loi-heading" className="text-2xl sm:text-3xl font-bold text-[#1a472a] mb-3" style={HEADING_STYLE}>
          Sign a letter of intent
        </h2>
        <p className="text-[#1a472a]/80 safe-prose">{COOP.loiPromise}</p>
      </div>

      <ErrorBox message={error} />

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#1a472a]" style={HEADING_STYLE}>
          About you
        </h3>
        <ContactFields
          idPrefix="loi"
          contact={contact}
          update={update}
          locationLabel="Country"
          locationPlaceholder="Where you're based"
        />
        <div className="md:w-1/2 md:pr-2">
          <label htmlFor="loi-phone" className={LABEL_CLASS}>
            Phone {OPTIONAL}
          </label>
          <input
            id="loi-phone"
            type="tel"
            maxLength={50}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={INPUT_CLASS}
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="next"
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className={`${LEGEND_CLASS} mb-3`} style={HEADING_STYLE}>
          I'm signing as {REQUIRED}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIGNER_OPTIONS.map((opt) => (
            <label key={opt.value} className={choiceClass(signer === opt.value)}>
              <input
                type="radio"
                name="loi-signer"
                value={opt.value}
                checked={signer === opt.value}
                onChange={() => setSigner(opt.value)}
                required
                className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
              />
              <span className="text-[#1a472a] font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#1a472a]" style={HEADING_STYLE}>
          Your commitment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="loi-amount" className={LABEL_CLASS}>
              Amount you'd commit, in US dollars {REQUIRED}
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1a472a] text-base font-semibold"
                aria-hidden="true"
              >
                $
              </span>
              <input
                id="loi-amount"
                type="text"
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={16}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                onBlur={() => {
                  const n = parseAmount(amountText);
                  if (n != null) setAmountText(formatAmount(n));
                }}
                aria-describedby={amountHelpId}
                className={`${INPUT_CLASS} pl-8`}
                placeholder="50,000"
                enterKeyHint="next"
              />
            </div>
            <p id={amountHelpId} className="text-sm text-[#1a472a]/80 mt-2">
              No minimum. You can change it before anything is final.
            </p>
          </div>
          <div>
            <label htmlFor="loi-timeline" className={LABEL_CLASS}>
              When you could commit
            </label>
            <select
              id="loi-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value as LoiTimeline)}
              className={INPUT_CLASS}
            >
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="space-y-3" aria-describedby={accreditedHelpId}>
        <legend className={LEGEND_CLASS} style={HEADING_STYLE}>
          {/* fund-claims-allow: an optional question that shapes the legal form, never a gate (ADR-78) */}
          Are you a US accredited investor? <span className="text-[#1a472a]/80 text-base font-normal">(optional)</span>
        </legend>
        <p id={accreditedHelpId} className="text-sm text-[#1a472a]/80 safe-prose">
          The treasury will be formed to meet the legal and regulatory needs of the people who sign. Your answer helps
          us choose that form. Anyone can sign, whatever the answer.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACCREDITED_OPTIONS.map((opt) => (
            <label key={opt.value} className={choiceClass(accredited === opt.value)}>
              <input
                type="radio"
                name="loi-accredited"
                value={opt.value}
                checked={accredited === opt.value}
                onChange={() => setAccredited(opt.value)}
                className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
              />
              <span className="text-[#1a472a] font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={LEGEND_CLASS} style={HEADING_STYLE}>
          Anything else you'd bring <span className="text-[#1a472a]/80 text-base font-normal">(optional)</span>
        </legend>
        <p className="text-sm text-[#1a472a]/80 safe-prose">
          Money is one of nine forms of capital, and the cooperative is being designed to recognize all nine. Tick any
          others you'd bring. <NineFormsLink />
        </p>
        <CapitalCheckboxes name="loi-capital" selected={capitalForms} toggle={toggleCapital} />
      </fieldset>

      <div className="space-y-4">
        <div>
          <label htmlFor="loi-motivations" className={LABEL_CLASS}>
            Why this matters to you {OPTIONAL}
          </label>
          <textarea
            id="loi-motivations"
            value={motivations}
            onChange={(e) => setMotivations(e.target.value)}
            rows={3}
            maxLength={4000}
            className={INPUT_CLASS}
            placeholder="The land, the people or the work that brought you here"
          />
        </div>
        <div>
          <label htmlFor="loi-questions" className={LABEL_CLASS}>
            Questions for the team {OPTIONAL}
          </label>
          <textarea
            id="loi-questions"
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            rows={3}
            maxLength={4000}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="loi-consent" className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
          <input
            id="loi-consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-5 h-5 mt-0.5 flex-shrink-0 accent-[#1a472a]"
          />
          <span className="text-sm text-[#1a472a] safe-prose">
            I understand this letter is not binding and no money moves when I sign it. ReGen Civics may keep these
            details and email me about the cooperative treasury. I can ask to be removed at any time. {REQUIRED}
          </span>
        </label>
        <PrivacyLink />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          type="submit"
          disabled={submit.isPending}
          className="flex-1 bg-[#1a472a] hover:bg-[#2d5a3d] text-white min-h-[48px] py-3 text-lg font-semibold"
        >
          {submit.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : (
            "Sign the letter of intent"
          )}
        </Button>
        {/* Default variant with explicit colors: the outline variant's
            dark:border-input wins on the dark-mode public site. */}
        <Button
          asChild
          className="flex-1 bg-transparent border-2 border-[#1a472a]/50 text-[#1a472a] hover:bg-[#1a472a]/10 min-h-[48px] py-3 text-lg"
        >
          <Link href="/opportunity">Read the full picture</Link>
        </Button>
      </div>
    </form>
  );
}

// =============================================
// INTEREST (land, skills, tools, time)
// =============================================

function InterestForm({ onDone }: { onDone: (firstName: string) => void }) {
  const [contact, setContact] = useState<Contact>({ name: "", email: "", organization: "", location: "" });
  const [kind, setKind] = useState<InterestKind | "">("");
  const [message, setMessage] = useState("");
  const [capitalForms, setCapitalForms] = useState<CapitalType[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  useContactPrefill(setContact);
  const update = (key: keyof Contact, value: string) => setContact((prev) => ({ ...prev, [key]: value }));
  const toggleCapital = (capital: CapitalType) =>
    setCapitalForms((prev) => (prev.includes(capital) ? prev.filter((c) => c !== capital) : [...prev, capital]));

  const submitInterest = trpc.coop.submitInterest.useMutation({
    onSuccess: () => {
      analytics.loiSubmitted();
      setError("");
      onDone(contact.name.trim().split(/\s+/)[0] ?? "");
    },
    onError: (err) => setError(readableError(err.message)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!kind) {
      setError("Choose the option that fits you best.");
      return;
    }
    if (!consent) {
      setError("Tick the consent box so we can keep your details and write to you.");
      return;
    }
    submitInterest.mutate({
      name: contact.name.trim(),
      email: contact.email.trim(),
      kind,
      organization: contact.organization.trim() || undefined,
      location: contact.location.trim() || undefined,
      capitalForms,
      message: message.trim() || undefined,
      consent: true,
      source: "loi",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-labelledby="interest-heading">
      <div>
        <h2 id="interest-heading" className="text-2xl sm:text-3xl font-bold text-[#1a472a] mb-3" style={HEADING_STYLE}>
          Tell us you're interested
        </h2>
        <p className="text-[#1a472a]/80 safe-prose">{COOP.interestPromise}</p>
      </div>

      <ErrorBox message={error} />

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#1a472a]" style={HEADING_STYLE}>
          About you
        </h3>
        <ContactFields
          idPrefix="interest"
          contact={contact}
          update={update}
          locationLabel="Where you are"
          locationPlaceholder="Town, region or bioregion"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className={`${LEGEND_CLASS} mb-3`} style={HEADING_STYLE}>
          I'm interested as {REQUIRED}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KIND_OPTIONS.map((opt) => (
            <label key={opt.value} className={choiceClass(kind === opt.value)}>
              <input
                type="radio"
                name="interest-kind"
                value={opt.value}
                checked={kind === opt.value}
                onChange={() => setKind(opt.value)}
                required
                className="w-5 h-5 flex-shrink-0 accent-[#1a472a]"
              />
              <span className="text-[#1a472a] font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={LEGEND_CLASS} style={HEADING_STYLE}>
          What you might bring <span className="text-[#1a472a]/80 text-base font-normal">(optional)</span>
        </legend>
        <p className="text-sm text-[#1a472a]/80 safe-prose">
          The cooperative is being designed to recognize all nine forms of capital. Tick any that fit.{" "}
          <NineFormsLink />
        </p>
        <CapitalCheckboxes name="interest-capital" selected={capitalForms} toggle={toggleCapital} />
      </fieldset>

      <div>
        <label htmlFor="interest-message" className={LABEL_CLASS}>
          Anything else you'd like us to know {OPTIONAL}
        </label>
        <textarea
          id="interest-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={4000}
          className={INPUT_CLASS}
          placeholder="Your land, your work, your questions"
        />
      </div>

      <div>
        <label htmlFor="interest-consent" className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
          <input
            id="interest-consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-5 h-5 mt-0.5 flex-shrink-0 accent-[#1a472a]"
          />
          <span className="text-sm text-[#1a472a] safe-prose">
            I agree that ReGen Civics may keep these details and email me about the cooperative. I can ask to be
            removed at any time. {REQUIRED}
          </span>
        </label>
        <PrivacyLink />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          type="submit"
          disabled={submitInterest.isPending}
          className="flex-1 bg-[#1a472a] hover:bg-[#2d5a3d] text-white min-h-[48px] py-3 text-lg font-semibold"
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
        <Button
          asChild
          className="flex-1 bg-transparent border-2 border-[#1a472a]/50 text-[#1a472a] hover:bg-[#1a472a]/10 min-h-[48px] py-3 text-lg"
        >
          <Link href="/opportunity">Read the full picture</Link>
        </Button>
      </div>
    </form>
  );
}

// =============================================
// PAGE
// =============================================

type Done = { path: "letter"; firstName: string; amount: number } | { path: "interest"; firstName: string };

const PATHS: { value: Path; title: string; body: string; icon: typeof Sprout }[] = [
  {
    value: "letter",
    title: "Sign a letter of intent",
    body: "Commit financial capital to the network treasury. Any amount, not binding.",
    icon: FileSignature,
  },
  {
    value: "interest",
    title: "Bring land, skills or time",
    body: "For land projects and people bringing other forms of capital.",
    icon: HandHeart,
  },
];

export default function LOI() {
  const [path, setPath] = useState<Path>(initialPath);
  const [done, setDone] = useState<Done | null>(null);

  // The thank-you replaces a long form; without this it opened scrolled to
  // the footer, with the confirmation off screen (found in the 2026-10-21 run).
  useEffect(() => {
    if (done) window.scrollTo({ top: 0 });
  }, [done]);

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818] py-16 px-4">
        <SEO {...pageSEO.loi} />
        <div className="container max-w-2xl mx-auto">
          <Card className="p-8 bg-white/95 backdrop-blur-sm text-center" role="status" aria-live="polite">
            <CheckCircle2 className="w-16 h-16 text-[#1a472a] mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-[#1a472a] mb-4" style={HEADING_STYLE}>
              {done.firstName ? `Thank you, ${done.firstName}.` : "Thank you."}
            </h1>
            {done.path === "letter" ? (
              <>
                <p className="text-[#1a472a] text-lg mb-4 safe-prose">
                  Your letter of intent for ${formatAmount(done.amount)} is signed. We'll write within a few days to
                  set up a call.
                </p>
                <p className="text-[#1a472a]/80 mb-8 safe-prose">{COOP.loiPromise}</p>
              </>
            ) : (
              <p className="text-[#1a472a]/80 text-lg mb-8 safe-prose">{COOP.interestPromise}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white min-h-[44px] px-6">
                <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
                  Book a call<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Button>
              <Button
                asChild
                className="bg-transparent border-2 border-[#1a472a]/50 text-[#1a472a] hover:bg-[#1a472a]/10 min-h-[44px] px-6"
              >
                <Link href="/opportunity">Read the full picture</Link>
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
        {/* Where the treasury stands, before anyone types a word. */}
        <Card className="p-6 mb-8 bg-[#d4a574]/10 border-2 border-[#d4a574]">
          <div className="flex items-start gap-4">
            <Sprout className="w-6 h-6 text-[#d4a574] flex-shrink-0 mt-1" aria-hidden="true" />
            <div>
              <span className="inline-block mb-2 px-3 py-1 rounded-full bg-[#d4a574]/20 text-[#f3d9b8] text-xs font-semibold uppercase tracking-wider">
                {COOP.statusLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={HEADING_STYLE}>
                {COOP.name}: the {COOP.treasuryName}
              </h1>
              <p className="text-white/90 safe-prose">{COOP.statement}</p>
            </div>
          </div>
        </Card>

        {/* Two paths. Radios, so the choice reads by shape as well as colour. */}
        <fieldset className="mb-6">
          <legend className="text-lg font-bold text-white mb-3" style={HEADING_STYLE}>
            How would you like to take part?
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PATHS.map((opt) => {
              const selected = path === opt.value;
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 min-h-[44px] p-4 rounded-xl border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#ffd700] ${
                    selected ? "border-[#ffd700] bg-white/15" : "border-white/40 bg-white/5 hover:border-white/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="loi-path"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setPath(opt.value)}
                    className="w-5 h-5 mt-0.5 flex-shrink-0 accent-[#ffd700]"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-bold text-white">
                      <Icon className="w-4 h-4 text-[#ffd700] flex-shrink-0" aria-hidden="true" />
                      {opt.title}
                    </span>
                    <span className="block text-sm text-white/85 mt-1">{opt.body}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Card className="p-6 sm:p-8 bg-white/95 backdrop-blur-sm min-w-0">
          {path === "letter" ? (
            <LetterForm onDone={(firstName, amount) => setDone({ path: "letter", firstName, amount })} />
          ) : (
            <InterestForm onDone={(firstName) => setDone({ path: "interest", firstName })} />
          )}

          <p className="text-sm text-[#1a472a]/80 safe-prose mt-6">
            To talk it through first,{" "}
            <Link href="/investor/contact" className="font-semibold text-[#1a472a] underline underline-offset-2">
              write to us
            </Link>{" "}
            or{" "}
            <a
              href={CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#1a472a] underline underline-offset-2"
            >
              book a call<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>

          <p className="text-xs text-[#1a472a]/80 leading-relaxed border-t border-[#1a472a]/10 pt-4 mt-6 safe-prose">
            {COOP.notAnOffer}
          </p>
        </Card>

        {/* Outside the white card: the compact badge is white text. */}
        <DataProtectionBadge compact className="mt-4 justify-center" />
      </div>
    </div>
  );
}
