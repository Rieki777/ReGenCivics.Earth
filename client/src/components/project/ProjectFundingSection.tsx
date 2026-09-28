/**
 * Grants this project can apply to: the steward's funding profile and the
 * programs it matches (funding engine Phase 5; shared/grantMatcher.ts,
 * server/routes/projectFunding.ts).
 *
 * Only the project's stewards see this section, and the server checks again.
 * The project owns its applications: this shows what it can apply to and, for
 * a near miss, the one thing it would take. Deciding and applying stay with
 * the project. The eligibility flags are opt-in and never shown publicly.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Sprout } from "lucide-react";
import {
  ACTIVITIES,
  ADVISOR_OPTIONS,
  ELIGIBILITY_FLAGS,
  FLAG_LABELS,
  LEGAL_WRAPPERS,
  MATCH_CAPACITY,
  WRAPPER_LABELS,
  type Activity,
  type AdvisorOption,
  type EligibilityFlag,
  type LegalWrapper,
  type MatchCapacity,
} from "@shared/grantMatcher";

const card = "bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24";
const heading = "text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2";
const field =
  "[color-scheme:light] w-full rounded-md border border-[#1a472a]/30 bg-white text-[#1a472a] px-2.5 py-2 text-base md:text-sm pointer-coarse:min-h-11 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40";
const label = "block text-sm font-semibold text-[#1a472a] mb-1";

const ACTIVITY_LABELS: Record<Activity, string> = {
  agriculture: "Farming or ranching",
  agroforestry: "Agroforestry",
  forestry: "Forestry",
  housing: "Housing",
  education: "Education",
  energy: "Energy",
  food_hub: "A food hub",
  conservation: "Conservation",
};
const MATCH_LABELS: Record<MatchCapacity, string> = {
  none: "No match right now",
  under_10k: "Under $10,000",
  "10k_50k": "$10,000 to $50,000",
  over_50k: "Over $50,000",
};
const ADVISOR_LABELS: Record<AdvisorOption, string> = {
  none: "No",
  independent: "Yes, independent of the project",
  not_independent: "Yes, but connected to the project",
};
const COUNTRIES: Array<[string, string]> = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["MX", "Mexico"],
  ["CR", "Costa Rica"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
];
const US_STATES = (
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI AS MP"
).split(" ");
const STATUS_LABELS = {
  suggested: "Not decided",
  pursuing: "Pursuing",
  drafting: "Drafting",
  submitted: "Submitted",
  awarded: "Awarded",
  declined: "Declined",
  passed: "Passing on it",
} as const;
type MatchStatus = keyof typeof STATUS_LABELS;

type FormState = {
  legalWrapper: LegalWrapper;
  faithBased: boolean;
  isProducer: boolean;
  country: string;
  region: string;
  activities: Activity[];
  matchCapacity: MatchCapacity;
  technicalAdvisor: AdvisorOption;
  partnerCount: number;
  eligibilityFlags: EligibilityFlag[];
};

const EMPTY: FormState = {
  legalWrapper: "llc",
  faithBased: false,
  isProducer: false,
  country: "US",
  region: "",
  activities: [],
  matchCapacity: "none",
  technicalAdvisor: "none",
  partnerCount: 0,
  eligibilityFlags: [],
};

function deadlineLabel(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" }).format(d);
}

function money(min: number | null, max: number | null, currency: string | null): string | null {
  const cur = currency && currency !== "USD" ? `${currency} ` : "$";
  const f = (n: number) => `${cur}${n.toLocaleString("en-US")}`;
  if (min && max) return `${f(min)} to ${f(max)}`;
  if (max) return `Up to ${f(max)}`;
  if (min) return `From ${f(min)}`;
  return null;
}

export function ProjectFundingSection({ applicationId, projectName }: { applicationId: number; projectName: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.projectFunding.get.useQuery({ applicationId });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setForm({
      legalWrapper: p.legalWrapper as LegalWrapper,
      faithBased: p.faithBased,
      isProducer: p.isProducer,
      country: p.country,
      region: p.region ?? "",
      activities: p.activities as Activity[],
      matchCapacity: p.matchCapacity as MatchCapacity,
      technicalAdvisor: p.technicalAdvisor as AdvisorOption,
      partnerCount: p.partnerCount,
      eligibilityFlags: p.eligibilityFlags as EligibilityFlag[],
    });
  }, [data?.profile]);

  const refresh = () => utils.projectFunding.get.invalidate({ applicationId });
  const save = trpc.projectFunding.save.useMutation({
    onSuccess: (res) => {
      refresh();
      setEditing(false);
      setConsent(false);
      const open = res.matches.filter((m) => m.outcome === "match").length;
      toast({ title: "Saved", description: `${open} program${open === 1 ? "" : "s"} this project can apply to now.` });
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });
  const setStatus = trpc.projectFunding.setStatus.useMutation({
    onSuccess: refresh,
    onError: (err) => toast({ title: "Could not update", description: err.message, variant: "destructive" }),
  });
  const remove = trpc.projectFunding.remove.useMutation({
    onSuccess: () => {
      refresh();
      setForm(EMPTY);
      toast({ title: "The funding profile and its matches are deleted" });
    },
    onError: (err) => toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
  });

  const hasProfile = Boolean(data?.profile);
  const showForm = !hasProfile || editing;
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const submit = () => {
    if (form.country === "US" && !form.region) {
      toast({ title: "Add the state", description: "Many US programs are open only in some states.", variant: "destructive" });
      return;
    }
    save.mutate({
      applicationId,
      ...form,
      country: form.country.trim().toUpperCase(),
      region: form.country === "US" ? form.region : null,
      consent: true,
    });
  };

  const matches = data?.matches ?? [];
  const open = matches.filter((m) => m.outcome === "match" || m.status !== "suggested");
  const near = matches.filter((m) => m.outcome === "near" && m.status === "suggested");

  return (
    <section id="grants" className={card} aria-labelledby="grants-heading">
      <h2 id="grants-heading" className={heading} style={{ fontFamily: "var(--font-display)" }}>
        <Sprout className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        Grants {projectName} can apply to
      </h2>
      <p className="text-sm text-[#1a472a]/85 mb-4">
        Tell us who would apply and where the land is. We check it against the grant programs we track and show each one
        this project can apply to, and for a near miss, the one thing it would take. You decide what to pursue, and the
        project applies. Only this project's stewards and ReGen Civics admins see these answers.
      </p>

      {isLoading && <p className="text-sm text-[#1a472a]/80">Loading...</p>}

      {!isLoading && showForm && (
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="fp-wrapper">1. Who would apply?</label>
            <select
              id="fp-wrapper"
              className={field}
              value={form.legalWrapper}
              onChange={(e) => setForm({ ...form, legalWrapper: e.target.value as LegalWrapper })}
            >
              {LEGAL_WRAPPERS.map((w) => (
                <option key={w} value={w}>
                  {WRAPPER_LABELS[w].charAt(0).toUpperCase() + WRAPPER_LABELS[w].slice(1)}
                </option>
              ))}
            </select>
            <label className="mt-2 flex items-start gap-2 text-sm text-[#1a472a]">
              <input
                type="checkbox"
                checked={form.faithBased}
                onChange={(e) => setForm({ ...form, faithBased: e.target.checked })}
                className="mt-1"
              />
              It is a church or other religious organization, or sponsored by one. (A few funders exclude them.)
            </label>
          </div>

          <fieldset>
            <legend className={label}>2. Does the project sell farm or ranch products?</legend>
            <div className="flex gap-4 text-sm text-[#1a472a]">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-2 pointer-coarse:min-h-11">
                  <input type="radio" name="fp-producer" checked={form.isProducer === v} onChange={() => setForm({ ...form, isProducer: v })} />
                  {v ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="fp-country">3. Where is the land?</label>
              <select
                id="fp-country"
                className={field}
                value={COUNTRIES.some(([c]) => c === form.country) ? form.country : "other"}
                onChange={(e) => setForm({ ...form, country: e.target.value === "other" ? "" : e.target.value, region: "" })}
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
                <option value="other">Another country</option>
              </select>
              {!COUNTRIES.some(([c]) => c === form.country) && (
                <input
                  aria-label="Two-letter country code"
                  className={`${field} mt-2`}
                  maxLength={2}
                  placeholder="Two-letter code, like FR"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
                />
              )}
            </div>
            {form.country === "US" && (
              <div>
                <label className={label} htmlFor="fp-state">State</label>
                <select id="fp-state" className={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                  <option value="">Choose the state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <fieldset>
            <legend className={label}>4. What does the project do?</legend>
            <div className="grid grid-cols-2 gap-1 text-sm text-[#1a472a]">
              {ACTIVITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 pointer-coarse:min-h-11">
                  <input type="checkbox" checked={form.activities.includes(a)} onChange={() => setForm({ ...form, activities: toggle(form.activities, a) })} />
                  {ACTIVITY_LABELS[a]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="fp-match">5. Could the project bring a cost match?</label>
              <select id="fp-match" className={field} value={form.matchCapacity} onChange={(e) => setForm({ ...form, matchCapacity: e.target.value as MatchCapacity })}>
                {MATCH_CAPACITY.map((m) => (
                  <option key={m} value={m}>
                    {MATCH_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="fp-advisor">6. Does the project have a technical advisor?</label>
              <select
                id="fp-advisor"
                className={field}
                value={form.technicalAdvisor}
                onChange={(e) => setForm({ ...form, technicalAdvisor: e.target.value as AdvisorOption })}
              >
                {ADVISOR_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ADVISOR_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="fp-partners">7. How many partner farms or ranches work with the project?</label>
            <input
              id="fp-partners"
              type="number"
              min={0}
              max={1000}
              className={`${field} max-w-[10rem]`}
              value={form.partnerCount}
              onChange={(e) => setForm({ ...form, partnerCount: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })}
            />
          </div>

          <details className="text-sm text-[#1a472a]">
            <summary className="cursor-pointer font-semibold pointer-coarse:min-h-11">Optional: programs for specific groups</summary>
            <p className="mt-2 text-[#1a472a]/85">
              A few programs are only for certain groups. Tick any that fit if you want them used for matching. They stay
              private to this project's stewards and ReGen Civics admins.
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              {ELIGIBILITY_FLAGS.map((f) => (
                <label key={f} className="flex items-center gap-2 pointer-coarse:min-h-11">
                  <input
                    type="checkbox"
                    checked={form.eligibilityFlags.includes(f)}
                    onChange={() => setForm({ ...form, eligibilityFlags: toggle(form.eligibilityFlags, f) })}
                  />
                  {FLAG_LABELS[f].charAt(0).toUpperCase() + FLAG_LABELS[f].slice(1)}
                </label>
              ))}
            </div>
          </details>

          <label className="flex items-start gap-2 text-sm text-[#1a472a]">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            Use these answers to match this project to grant programs. You can delete them at any time.
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={submit}
              disabled={!consent || save.isPending || !/^[A-Z]{2}$/.test(form.country)}
              className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11"
            >
              {save.isPending ? "Saving" : "Save and show matches"}
            </Button>
            {hasProfile && (
              <Button variant="outline" onClick={() => setEditing(false)} className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11">
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLoading && hasProfile && !showForm && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)} className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11">
              Edit the answers
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("Delete this project's funding answers and every match? This cannot be undone.")) remove.mutate({ applicationId });
              }}
              className="border-rose-700/40 text-rose-800 pointer-coarse:min-h-11"
            >
              Delete this data
            </Button>
          </div>

          <div>
            <h3 className="text-base font-bold text-[#1a472a] mb-2">Programs this project can apply to ({open.length})</h3>
            {open.length === 0 && <p className="text-sm text-[#1a472a]/85">None yet. The near misses below show what would open more.</p>}
            <ul className="space-y-3">
              {open.map((m) => (
                <MatchItem key={m.pipelineId} m={m} onStatus={(status) => setStatus.mutate({ applicationId, pipelineId: m.pipelineId, status })} />
              ))}
            </ul>
          </div>

          {near.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#1a472a] mb-2">One step away ({near.length})</h3>
              <ul className="space-y-3">
                {near.map((m) => (
                  <MatchItem key={m.pipelineId} m={m} onStatus={(status) => setStatus.mutate({ applicationId, pipelineId: m.pipelineId, status })} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

type MatchView = {
  pipelineId: number;
  status: string;
  outcome: string;
  unmetCriterion: string | null;
  met: string[];
  program: {
    name: string;
    link: string | null;
    deadlineAt: string | Date | null;
    deadline: string | null;
    callOpen: boolean | null;
    amountMin: number | null;
    amountMax: number | null;
    currency: string | null;
  };
};

function MatchItem({ m, onStatus }: { m: MatchView; onStatus: (status: MatchStatus) => void }) {
  const due = deadlineLabel(m.program.deadlineAt);
  const amount = money(m.program.amountMin, m.program.amountMax, m.program.currency);
  return (
    <li className="rounded-xl border border-[#1a472a]/15 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#1a472a]">
            {m.program.link ? (
              <a href={m.program.link} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                {m.program.name} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            ) : (
              m.program.name
            )}
          </p>
          <p className="text-sm text-[#1a472a]/85">
            {[due ? `Due ${due}` : m.program.callOpen === false ? "Next call not posted yet" : null, amount].filter(Boolean).join(" · ")}
          </p>
        </div>
        <select
          aria-label={`Where the project is with ${m.program.name}`}
          className={`${field} w-auto`}
          value={m.status}
          onChange={(e) => onStatus(e.target.value as MatchStatus)}
        >
          {(Object.keys(STATUS_LABELS) as MatchStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {m.outcome === "near" && m.unmetCriterion && <p className="mt-2 text-sm font-semibold text-amber-900">What it would take: {m.unmetCriterion}</p>}
      {m.outcome !== "match" && m.outcome !== "near" && (
        <p className="mt-2 text-sm text-[#1a472a]/85">This program no longer matches the answers above, and your decision is kept.</p>
      )}
      {m.met.length > 0 && (
        <ul className="mt-2 text-xs text-[#1a472a]/80 list-disc pl-5">
          {m.met.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
