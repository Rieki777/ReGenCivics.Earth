/**
 * Ask us to host your village (/village-os/host, ADR-69).
 *
 * A signed-in founder picks their accepted Season 2 application, tells us a
 * few things about the village, and gives the two consents the draft and the
 * hosting need. The server re-checks that the application is theirs and
 * accepted (server/routes/villageOs.ts); this page only shows what the
 * eligibility query already decided.
 *
 * What a person sees:
 *   - signed out: how to sign in, landing back here;
 *   - signed in, nothing accepted for Season 2 yet: notEligibleCopy(), with
 *     any Season 2 applications still waiting marked "not accepted yet". The
 *     "Apply to Season 2" buttons show only while Season 2 takes rolling
 *     applications (showApply);
 *   - signed in with an accepted application: the form, then the thank-you.
 * The thank-you mentions membership only when VILLAGE_OS_MEMBERSHIP_URL is
 * set, with "Become a member of CORE" and "Not now" weighted the same. Hosting
 * never depends on giving (HOSTING_DEPENDS_ON_GIFT), and no money moves here.
 *
 * Admins also get a plain queue of every request below the page, with the
 * first-draft seed built from the application's DRAFT_FIELDS only.
 */

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowRight, CheckCircle2, ClipboardList, ExternalLink, Loader2, LogIn, Mail, Server, Sprout } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { AnimatedSection } from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import type { AppRouter } from "../../../server/routers";
import {
  CONSENT_DRAFT_LINE,
  CONSENT_HOSTING_LINE,
  HOSTING_REQUEST_STATUSES,
  HOSTING_STATUS_LABEL,
  VILLAGE_OS_HOST_PATH,
  VILLAGE_OS_OFFER,
  VILLAGE_OS_PATH,
  hostingRequestInput,
  notEligibleCopy,
  type HostingRequestStatus,
  type VillageSeed,
} from "@shared/villageOsOffer";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Eligibility = RouterOutputs["villageOs"]["eligibility"];
type EligibleApplication = Eligibility["applications"][number];
type HostingRequestRow = Eligibility["requests"][number];
type AdminQueueRow = RouterOutputs["villageOs"]["adminQueue"][number];

const display = { fontFamily: "var(--font-display)" } as const;
const o = VILLAGE_OS_OFFER;

/** hostingRequestInput caps villageName at 120 characters. */
const VILLAGE_NAME_MAX = 120;

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-60 aria-disabled:opacity-60";
const BUTTON_GREEN = `${BUTTON_BASE} bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]`;
const BUTTON_QUIET = `${BUTTON_BASE} bg-white/10 hover:bg-white/20 text-white border border-white/20`;
const FIELD =
  "w-full min-h-11 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:border-[#7dd87d] aria-[invalid=true]:border-red-300";
const PANEL = "bg-white/5 backdrop-blur-sm rounded-2xl border p-6 md:p-8 mb-8";
const NEW_TAB_NOTE = " (opens in a new tab)";

/** The server already vets this; this keeps a bad value from ever becoming a link. */
function httpsOnly(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function asStatus(value: string): HostingRequestStatus {
  return (HOSTING_REQUEST_STATUSES as readonly string[]).includes(value) ? (value as HostingRequestStatus) : "requested";
}

function statusLabel(value: string): string {
  return HOSTING_STATUS_LABEL[asStatus(value)];
}

function browserTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return zone.length <= 64 ? zone : "";
  } catch {
    return "";
  }
}

export default function VillageOsHost() {
  const utils = trpc.useUtils();
  const eligibility = trpc.villageOs.eligibility.useQuery();
  const offerQuery = trpc.villageOs.offer.useQuery(undefined, { staleTime: 5 * 60_000 });
  const membershipUrl = httpsOnly(offerQuery.data?.membershipUrl);
  const data = eligibility.data;
  const isAdmin = data?.isAdmin ?? false;
  const accepted = (data?.applications ?? []).filter((a) => a.accepted);
  const waiting = (data?.applications ?? []).filter((a) => !a.accepted);
  const requests = data?.requests ?? [];

  let body: ReactNode;
  if (!data) {
    // Only a first load can fail here. A failed background refetch keeps the
    // data it already has, so the form or the thank-you stays on screen.
    body = eligibility.isError ? (
      <p className="text-red-300 mb-8" role="alert">
        This page did not load. Try again in a minute.
      </p>
    ) : (
      <p className="inline-flex items-center gap-2 text-white/70 mb-8" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Loading your applications.
      </p>
    );
  } else if (!data.signedIn) {
    body = <SignedOut />;
  } else if (accepted.length === 0) {
    body = <NotEligible waiting={waiting} />;
  } else {
    body = (
      <HostingForm
        accepted={accepted}
        requests={requests}
        membershipUrl={membershipUrl}
        onSent={() => {
          void eligibility.refetch();
          // An admin asking on their own page sees the new row in the queue below.
          if (isAdmin) void utils.villageOs.adminQueue.invalidate();
        }}
      />
    );
  }

  return (
    <PageWrapper>
      <SEO
        title="Ask us to host your village | ReGen Civics"
        description="Accepted Season 2 projects can ask the ReGen Civics team to host their village on Village OS, free. We draft a first version from the application, and the founders choose what goes live."
        url="https://regencivics.earth/village-os/host"
        noIndex
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          <AnimatedSection>
            <header className="mt-6 mb-10">
              <Link
                href={VILLAGE_OS_PATH}
                className="inline-flex items-center min-h-11 text-[#7dd87d] hover:text-[#9de89d] text-xs font-semibold tracking-[0.2em] uppercase"
              >
                {o.title}
              </Link>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3" style={display}>
                {o.hostedButton}
              </h1>
              <p className="text-[#7dd87d] font-semibold mb-4">{o.hosted.tag}</p>
              <ul className="space-y-2 text-white/75">
                {o.hosted.lines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7dd87d]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </header>
          </AnimatedSection>

          {body}

          {data?.signedIn && requests.length > 0 && <YourRequests requests={requests} />}

          {isAdmin && <AdminQueue enabled={isAdmin} />}
        </div>
      </div>
    </PageWrapper>
  );
}

/* --------------------------------------------------------------- signed out */

function SignedOut() {
  const emailSignIn = `/sign-in?returnTo=${encodeURIComponent(VILLAGE_OS_HOST_PATH)}`;
  const { showApply } = notEligibleCopy();
  return (
    <section className={`${PANEL} border-[#7dd87d]/30`}>
      <div className="flex items-center gap-3 mb-3">
        <LogIn className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-white">Sign in to ask</h2>
      </div>
      <p className="text-white/75 mb-6">
        Sign in with the account you used for your Season 2 application. Your applications show up here, and you pick
        the one to host.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href={getLoginUrl(VILLAGE_OS_HOST_PATH)} className={BUTTON_GREEN}>
          <LogIn className="w-4 h-4" aria-hidden="true" />
          Sign in with Google
        </a>
        <Link href={emailSignIn} className={BUTTON_QUIET}>
          <Mail className="w-4 h-4" aria-hidden="true" />
          Sign in with email
        </Link>
        {showApply && (
          <Link href="/apply" className={BUTTON_QUIET}>
            <Sprout className="w-4 h-4" aria-hidden="true" />
            {o.notEligible.applyButton}
          </Link>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- not eligible */

function NotEligible({ waiting }: { waiting: EligibleApplication[] }) {
  const copy = notEligibleCopy();
  return (
    <section className={`${PANEL} border-[#e3ac4f]/30`}>
      <div className="flex items-center gap-3 mb-3">
        <Sprout className="w-5 h-5 text-[#e3ac4f]" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-white">{copy.title}</h2>
      </div>
      <p className="text-white/75 mb-6">{copy.body}</p>
      <div className="flex flex-wrap gap-3">
        {copy.showApply && (
          <Link href="/apply" className={BUTTON_GREEN}>
            <Sprout className="w-4 h-4" aria-hidden="true" />
            {o.notEligible.applyButton}
          </Link>
        )}
        <Link href={VILLAGE_OS_PATH} className={copy.showApply ? BUTTON_QUIET : BUTTON_GREEN}>
          {o.self.title}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {waiting.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="text-white font-bold text-lg mb-3">Your Season 2 applications</h3>
          <ul className="divide-y divide-white/10">
            {waiting.map((app) => (
              <li key={app.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-white font-medium">{app.projectName}</span>
                <span className="text-white/70 border border-white/25 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Not accepted yet
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------- form */

type FieldKey =
  | "applicationId"
  | "villageName"
  | "preferredAddress"
  | "ownDomain"
  | "country"
  | "timeZone"
  | "language"
  | "memberWord"
  | "currencyName"
  | "tagline"
  | "consentDraft"
  | "consentHosting";

/** What to say when a field does not pass hostingRequestInput. */
const FIELD_HELP: Record<FieldKey, string> = {
  applicationId: "Pick your accepted Season 2 application.",
  villageName: `Give your village a name between 2 and ${VILLAGE_NAME_MAX} characters.`,
  preferredAddress: "For the web address, use letters, numbers and hyphens, like riverbend.",
  ownDomain: "Shorten your own web address to 253 characters or fewer.",
  country: "Shorten the country to 80 characters or fewer.",
  timeZone: "Shorten the time zone to 64 characters or fewer.",
  language: "Shorten the language to 40 characters or fewer.",
  memberWord: "Shorten what members are called to 40 characters or fewer.",
  currencyName: "Shorten what your gratitude or credits are called to 40 characters or fewer.",
  tagline: "Shorten the welcome line to 160 characters or fewer.",
  consentDraft: "Check the box that lets us draft your village from your application.",
  consentHosting: "Check the box about hosting so we can run your village.",
};

const fieldId = (key: FieldKey) => `vos-${key}`;

/** The ids a control's aria-describedby lists, error first. */
function describedBy(id: string, hint: boolean, error: boolean): string | undefined {
  const ids = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** "(required)" or "(optional)" after a label, the same on every field. */
function FieldMark({ required }: { required?: boolean }) {
  return <span className="font-normal">{required ? " (required)" : " (optional)"}</span>;
}

function FieldError({ id, message, className = "" }: { id: string; message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className={`text-red-300 text-sm mt-1.5 ${className}`}>
      {message}
    </p>
  );
}

function TextField({
  field,
  label,
  hint,
  value,
  onChange,
  maxLength,
  error,
  required,
  placeholder,
  inputMode,
  autoComplete,
  autoCapitalize,
  autoCorrect,
  spellCheck,
}: {
  field: FieldKey;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  /** The message shown under the control when this is the field that failed. */
  error?: string | null;
  /** Required fields say "(required)"; every other field says "(optional)". */
  required?: boolean;
  placeholder?: string;
  inputMode?: "text" | "url";
  autoComplete?: string;
  autoCapitalize?: "none" | "off" | "on" | "sentences" | "words" | "characters";
  autoCorrect?: "on" | "off";
  spellCheck?: boolean;
}) {
  const id = fieldId(field);
  return (
    <div>
      <label htmlFor={id} className="block text-white/80 text-sm font-medium mb-1.5">
        {label}
        <FieldMark required={required} />
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete ?? "off"}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        className={FIELD}
      />
      <FieldError id={id} message={error} />
      {hint && (
        <p id={`${id}-hint`} className="text-white/65 text-xs mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

function CheckField({
  field,
  checked,
  onChange,
  error,
  required,
  children,
}: {
  field: FieldKey | "circleInterest";
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  required?: boolean;
  children: string;
}) {
  const id = `vos-${field}`;
  return (
    <div>
      <div className="flex items-start gap-3 min-h-11">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, false, Boolean(error))}
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#7dd87d] cursor-pointer"
        />
        <label htmlFor={id} className="text-white/80 text-sm leading-relaxed cursor-pointer py-0.5">
          {children}
          {required && <span> (required)</span>}
        </label>
      </div>
      {/* ml-8 lines the message up under the label: the box is w-5, the gap is gap-3. */}
      <FieldError id={id} message={error} className="ml-8" />
    </div>
  );
}

function HostingForm({
  accepted,
  requests,
  membershipUrl,
  onSent,
}: {
  accepted: EligibleApplication[];
  requests: HostingRequestRow[];
  membershipUrl: string | null;
  onSent: () => void;
}) {
  /**
   * The name a village starts with: its earlier request's, else the project's.
   * A project name can run to 255 characters; the request takes 120.
   */
  const startingName = (appId: number): string =>
    (
      requests.find((r) => r.applicationId === appId)?.villageName ??
      accepted.find((a) => a.id === appId)?.projectName ??
      ""
    ).slice(0, VILLAGE_NAME_MAX);

  const [applicationId, setApplicationId] = useState<number>(accepted[0].id);
  const [villageName, setVillageName] = useState(() => startingName(accepted[0].id));
  const [preferredAddress, setPreferredAddress] = useState("");
  const [ownDomain, setOwnDomain] = useState("");
  const [country, setCountry] = useState("");
  const [timeZone, setTimeZone] = useState(browserTimeZone);
  const [language, setLanguage] = useState("");
  const [memberWord, setMemberWord] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [circleInterest, setCircleInterest] = useState(false);
  const [consentDraft, setConsentDraft] = useState(false);
  const [consentHosting, setConsentHosting] = useState(false);
  const [problem, setProblem] = useState<{ field: FieldKey | null; message: string } | null>(null);
  /** Counts failed submits, so a repeat of the same problem is announced and focused again. */
  const [attempt, setAttempt] = useState(0);
  const [sent, setSent] = useState(false);
  const [giftDismissed, setGiftDismissed] = useState(false);
  const thanksHeading = useRef<HTMLHeadingElement>(null);
  const wasSent = useRef(sent);

  const request = trpc.villageOs.request.useMutation({
    onSuccess: () => {
      setSent(true);
      setGiftDismissed(false);
      onSent();
    },
  });

  // After a failed submit commits, the field carries aria-invalid and its
  // error, so moving focus now reads the reason along with the field.
  useEffect(() => {
    if (attempt > 0 && problem?.field) document.getElementById(fieldId(problem.field))?.focus();
  }, [attempt, problem]);

  // The thank-you replaces the form, focused submit button and all. Move focus
  // to its heading so the confirmation is read out and in view; going back to
  // the form lands on the village name.
  useEffect(() => {
    if (sent === wasSent.current) return;
    wasSent.current = sent;
    if (sent) {
      const heading = thanksHeading.current;
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    } else {
      document.getElementById(fieldId("villageName"))?.focus();
    }
  }, [sent]);

  function pickApplication(next: number) {
    // Keep a name the founder typed; swap one that only came from the old pick.
    if (!villageName.trim() || villageName === startingName(applicationId)) {
      setVillageName(startingName(next));
    }
    setApplicationId(next);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (request.isPending) return;
    setProblem(null);
    const parsed = hostingRequestInput.safeParse({
      applicationId,
      villageName,
      preferredAddress,
      ownDomain,
      country,
      timeZone,
      language,
      memberWord,
      currencyName,
      tagline,
      circleInterest,
      consentDraft,
      consentHosting,
    });
    if (!parsed.success) {
      const key = String(parsed.error.issues[0]?.path[0] ?? "");
      const field = key in FIELD_HELP ? (key as FieldKey) : null;
      setProblem({ field, message: field ? FIELD_HELP[field] : "Check the form and try again." });
      setAttempt((n) => n + 1);
      return;
    }
    request.mutate(parsed.data);
  }

  if (sent) {
    return (
      <section className={`${PANEL} border-[#7dd87d]/40`}>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="w-6 h-6 text-[#7dd87d]" aria-hidden="true" />
          <h2 ref={thanksHeading} tabIndex={-1} className="text-2xl font-bold text-white scroll-mt-24 focus:outline-none">
            {o.thankYou.title}
          </h2>
        </div>
        <p className="text-white/75 mb-6">{o.thankYou.body}</p>

        {membershipUrl && !giftDismissed && (
          <div className="rounded-xl border border-[#d4a574]/40 bg-[#d4a574]/10 p-5 mb-6">
            <p className="text-white/80 mb-4">{o.thankYou.giftLine}</p>
            {/* The same size and look for both, so neither answer is the expected one. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={membershipUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_QUIET}>
                {o.circle.button}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">{NEW_TAB_NOTE}</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  // This button leaves with the gift block; keep focus on the thank-you.
                  thanksHeading.current?.focus();
                  setGiftDismissed(true);
                }}
                className={BUTTON_QUIET}
              >
                {o.thankYou.notNow}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href={VILLAGE_OS_PATH} className={BUTTON_QUIET}>
            Back to Village OS
          </Link>
          <button type="button" onClick={() => setSent(false)} className={BUTTON_QUIET}>
            Change your request
          </button>
        </div>
      </section>
    );
  }

  const errorFor = (field: FieldKey) => (problem?.field === field ? problem.message : null);
  const applicationError = errorFor("applicationId");

  return (
    <section className={`${PANEL} border-[#7dd87d]/30`}>
      <div className="flex items-center gap-3 mb-3">
        <Server className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-white">Tell us about your village</h2>
      </div>
      <p className="text-white/70 mb-6">
        Only the village name and the two boxes at the end are needed. Leave anything else blank and we work it
        out with you.
      </p>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label htmlFor={fieldId("applicationId")} className="block text-white/80 text-sm font-medium mb-1.5">
            Your accepted Season 2 application
          </label>
          <select
            id={fieldId("applicationId")}
            value={applicationId}
            onChange={(e) => pickApplication(Number(e.target.value))}
            aria-invalid={applicationError ? true : undefined}
            aria-describedby={describedBy(fieldId("applicationId"), false, Boolean(applicationError))}
            className={`${FIELD} [&>option]:text-[#1a472a]`}
          >
            {accepted.map((app) => (
              <option key={app.id} value={app.id}>
                {app.projectName}
              </option>
            ))}
          </select>
          <FieldError id={fieldId("applicationId")} message={applicationError} />
        </div>

        <TextField
          field="villageName"
          label="Village name"
          value={villageName}
          onChange={setVillageName}
          maxLength={VILLAGE_NAME_MAX}
          error={errorFor("villageName")}
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            field="preferredAddress"
            label="A name for its web address"
            hint="Letters, numbers and hyphens, like riverbend."
            value={preferredAddress}
            onChange={setPreferredAddress}
            maxLength={63}
            error={errorFor("preferredAddress")}
            placeholder="riverbend"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <TextField
            field="ownDomain"
            label="Your own web address"
            hint="If you already have one, like riverbend.org."
            value={ownDomain}
            onChange={setOwnDomain}
            maxLength={253}
            error={errorFor("ownDomain")}
            inputMode="url"
            placeholder="riverbend.org"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <TextField
            field="country"
            label="Country"
            value={country}
            onChange={setCountry}
            maxLength={80}
            error={errorFor("country")}
            autoComplete="country-name"
          />
          <TextField
            field="timeZone"
            label="Time zone"
            hint="We filled in the one your device uses."
            value={timeZone}
            onChange={setTimeZone}
            maxLength={64}
            error={errorFor("timeZone")}
          />
          <TextField
            field="language"
            label="Your village's main language"
            hint="The software is in English today."
            value={language}
            onChange={setLanguage}
            maxLength={40}
            error={errorFor("language")}
          />
          <TextField
            field="memberWord"
            label="What members are called"
            hint="Like members, neighbors or villagers."
            value={memberWord}
            onChange={setMemberWord}
            maxLength={40}
            error={errorFor("memberWord")}
          />
          <TextField
            field="currencyName"
            label="What your gratitude or credits are called"
            hint="Like gratitude, seeds or hours."
            value={currencyName}
            onChange={setCurrencyName}
            maxLength={40}
            error={errorFor("currencyName")}
          />
        </div>

        <TextField
          field="tagline"
          label="A one-line welcome"
          hint="The first line a visitor reads."
          value={tagline}
          onChange={setTagline}
          maxLength={160}
          error={errorFor("tagline")}
        />

        <CheckField field="circleInterest" checked={circleInterest} onChange={setCircleInterest}>
          {"I'd like to hear about the founders circles"}
        </CheckField>

        <fieldset className="space-y-3 rounded-xl border border-white/15 p-4">
          <legend className="px-1 text-white/80 text-sm font-medium">Both are needed to draft and host your village</legend>
          <CheckField
            field="consentDraft"
            checked={consentDraft}
            onChange={setConsentDraft}
            error={errorFor("consentDraft")}
            required
          >
            {CONSENT_DRAFT_LINE}
          </CheckField>
          <CheckField
            field="consentHosting"
            checked={consentHosting}
            onChange={setConsentHosting}
            error={errorFor("consentHosting")}
            required
          >
            {CONSENT_HOSTING_LINE}
          </CheckField>
        </fieldset>

        {/* One summary by the button. The key remounts it on every failed
            submit, so the same message is announced again. */}
        {problem && (
          <p key={attempt} className="text-red-300 text-sm" role="alert">
            {problem.message}
          </p>
        )}
        {request.isError && (
          <p className="text-red-300 text-sm" role="alert">
            {request.error.message}
          </p>
        )}

        {/* aria-disabled, so the button keeps focus while the request is sending. */}
        <button type="submit" aria-disabled={request.isPending || undefined} className={BUTTON_GREEN}>
          {request.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : (
            <>
              {o.hostedButton}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </section>
  );
}

/* ----------------------------------------------------------- your requests */

function YourRequests({ requests }: { requests: HostingRequestRow[] }) {
  return (
    <section className={`${PANEL} border-white/10`}>
      <div className="flex items-center gap-3 mb-4">
        <ClipboardList className="w-5 h-5 text-[#e3ac4f]" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Your requests</h2>
      </div>
      <ul className="divide-y divide-white/10">
        {requests.map((r) => (
          <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <span className="flex flex-col">
              <span className="text-white font-medium">{r.villageName}</span>
              <span className="text-white/65 text-xs">Asked {formatDay(r.createdAt)}</span>
            </span>
            <span className="self-start sm:self-auto text-[#1a472a] bg-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">
              {statusLabel(r.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- the admin */

function AdminQueue({ enabled }: { enabled: boolean }) {
  const queue = trpc.villageOs.adminQueue.useQuery(undefined, { enabled });
  const rows = queue.data ?? [];
  return (
    <section className={`${PANEL} border-[#e3ac4f]/40`}>
      <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Admin</p>
      <h2 className="text-2xl font-bold text-white mb-1">Hosting requests</h2>
      <p className="text-white/65 text-sm mb-6">Newest first. Seeds read only the application fields named in the consent.</p>
      {queue.isLoading ? (
        <p className="text-white/60">Loading requests.</p>
      ) : queue.isError ? (
        <p className="text-red-300">{queue.error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-white/60">No requests yet.</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => (
            <AdminRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

const SEED_LABELS: [Exclude<keyof VillageSeed, "gaps">, string][] = [
  ["villageName", "Name"],
  ["place", "Place"],
  ["purpose", "Purpose"],
  ["land", "Land"],
  ["teamSize", "Team size"],
  ["governance", "How it decides"],
  ["practices", "Practices"],
  ["community", "Community"],
  ["rhythm", "Meeting rhythm"],
  ["memberWord", "Members are called"],
  ["currencyName", "Gratitude is called"],
  ["tagline", "Welcome line"],
];

function AdminRow({ row }: { row: AdminQueueRow }) {
  const utils = trpc.useUtils();
  const uid = useId();
  const status = asStatus(row.status);
  const [note, setNote] = useState(row.adminNote ?? "");
  // The select only picks; "Save status" sends it. Arrow keys on a closed
  // select fire a change per step, so saving on change would save every step.
  const [chosen, setChosen] = useState<HostingRequestStatus>(status);
  useEffect(() => {
    setChosen(status);
  }, [status]);
  const save = trpc.villageOs.adminSetStatus.useMutation({
    onSuccess: () => {
      void utils.villageOs.adminQueue.invalidate();
    },
  });
  const seed: VillageSeed = row.seed;
  const statusUnsaved = chosen !== status;

  function saveStatus() {
    if (!statusUnsaved || save.isPending) return;
    save.mutate({ id: row.id, status: chosen, adminNote: note });
  }

  const requestFacts: [string, string | null | undefined][] = [
    ["Web address name", row.preferredAddress],
    ["Own web address", row.ownDomain],
    ["Country", row.country],
    ["Time zone", row.timeZone],
    ["Language", row.language],
  ];

  return (
    <li className="rounded-xl border border-white/15 bg-white/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="text-white font-bold text-lg">{row.villageName}</h3>
        <span className="text-white/65 text-xs">Asked {formatDay(row.createdAt)}</span>
      </div>
      <p className="text-white/65 text-sm mb-4">
        {row.projectName ?? "Application not found"} · application {row.applicationId} · user {row.userId}
        {row.circleInterest ? " · wants to hear about the founders circles" : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] mb-4" aria-busy={save.isPending || undefined}>
        <div>
          <label htmlFor={`${uid}-status`} className="block text-white/70 text-sm mb-1.5">
            Status
          </label>
          <select
            id={`${uid}-status`}
            value={chosen}
            onChange={(e) => setChosen(asStatus(e.target.value))}
            className={`${FIELD} [&>option]:text-[#1a472a]`}
          >
            {HOSTING_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {HOSTING_STATUS_LABEL[s]} ({s})
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveStatus}
              aria-disabled={!statusUnsaved || save.isPending || undefined}
              className={BUTTON_QUIET}
            >
              Save status
            </button>
            <p role="status" className="text-white/70 text-sm">
              {save.isPending ? "Saving." : save.isSuccess ? "Saved." : ""}
            </p>
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-note`} className="block text-white/70 text-sm mb-1.5">
            Team note (saves when you leave the box)
          </label>
          <textarea
            id={`${uid}-note`}
            value={note}
            maxLength={2000}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== (row.adminNote ?? "")) save.mutate({ id: row.id, status, adminNote: note });
            }}
            className={`${FIELD} py-3`}
          />
        </div>
      </div>
      {save.isError && <p className="text-red-300 text-sm mb-3">{save.error.message}</p>}

      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr] text-sm mb-3">
        {requestFacts
          .filter(([, v]) => v)
          .map(([label, v]) => (
            <div key={label} className="contents">
              <dt className="text-white/65">{label}</dt>
              <dd className="text-white/85 break-words">{v}</dd>
            </div>
          ))}
      </dl>

      <details className="rounded-lg border border-white/10 bg-black/10 p-3">
        <summary className="cursor-pointer min-h-11 flex items-center text-white/80 text-sm font-semibold">
          First-draft seed
        </summary>
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr] text-sm mt-2">
          {SEED_LABELS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="text-white/65">{label}</dt>
              <dd className={seed[key] ? "text-white/85 whitespace-pre-wrap break-words" : "text-white/60 italic"}>
                {seed[key] ?? "Not given"}
              </dd>
            </div>
          ))}
        </dl>
        {seed.gaps.length > 0 && (
          <p className="text-[#e3ac4f] text-sm mt-3">Still needed: {seed.gaps.join(", ")}.</p>
        )}
      </details>
    </li>
  );
}
