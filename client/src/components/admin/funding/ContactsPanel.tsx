/**
 * Contacts: log a conversation on a phone in under a minute, and work the
 * follow-ups as Open in Gmail links (funding engine Phase 4;
 * server/funding/contacts.ts). Bookmark /admin/funding?view=contacts at an
 * event.
 *
 * Nothing here sends. A Gmail link opens a draft with the address and a
 * starting note; Rye edits it and sends it himself. Nothing touches LinkedIn
 * beyond keeping the profile link Rye pasted.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { ExternalLink, Mail, Search } from "lucide-react";
import { FIELD_CLASS } from "./fieldClass";

const WARMTH = ["Cold", "Met", "Warm", "Champion"] as const;
const SOURCE_KEY = "funding.contacts.source";

function readSource(): string {
  try {
    return window.localStorage.getItem(SOURCE_KEY) ?? "The Gathering 2026";
  } catch {
    return "The Gathering 2026";
  }
}

function saveSource(value: string) {
  try {
    window.localStorage.setItem(SOURCE_KEY, value);
  } catch {
    // Private windows can refuse storage; the field still works.
  }
}

/** YYYY-MM-DD in Pacific time, some days from today. */
function pacificDayPlus(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const FOLLOW_UP_CHIPS: Array<[string, number | null]> = [
  ["No follow-up", null],
  ["In 3 days", 3],
  ["Next week", 7],
  ["In 2 weeks", 14],
];

export function ContactsPanel() {
  return (
    <div className="space-y-5">
      <QuickAdd />
      <FollowUps />
      <RecentContacts />
    </div>
  );
}

function QuickAdd() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [summary, setSummary] = useState("");
  const [warmth, setWarmth] = useState(1);
  const [followIn, setFollowIn] = useState<number | null>(7);
  const [nextStep, setNextStep] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState(readSource);
  const [more, setMore] = useState(false);

  const add = trpc.fundingContacts.quickAdd.useMutation({
    onSuccess: (res) => {
      utils.fundingContacts.list.invalidate();
      utils.fundingContacts.followUps.invalidate();
      toast({ title: res.matchedExisting ? "Added to their record" : "Saved" });
      setName("");
      setOrganization("");
      setSummary("");
      setWarmth(1);
      setFollowIn(7);
      setNextStep("");
      setEmail("");
      setLinkedinUrl("");
      setMore(false);
    },
    onError: (err) => toast({ title: "Not saved", description: err.message, variant: "destructive" }),
  });

  const submit = () => {
    saveSource(source);
    add.mutate({
      name,
      organization: organization || undefined,
      summary,
      warmth,
      followUpAt: followIn === null ? null : pacificDayPlus(followIn),
      nextStep: nextStep || undefined,
      email: email || undefined,
      linkedinUrl: linkedinUrl || undefined,
      source: source || undefined,
      channel: "event",
    });
  };

  return (
    <Card className="p-4 bg-white border-[#1a472a]/15 space-y-3">
      <h3 className="text-lg font-bold text-[#1a472a]">Log a conversation</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} autoComplete="off" />
        <input aria-label="Organization" placeholder="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className={FIELD_CLASS} autoComplete="off" />
      </div>
      <textarea
        aria-label="What you talked about"
        placeholder="What you talked about, and what they fund or care about"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        className={FIELD_CLASS}
      />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How warm">
        {WARMTH.map((w, i) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={warmth === i}
            onClick={() => setWarmth(i)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold pointer-coarse:min-h-11 ${
              warmth === i ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a] border-[#1a472a]/30"
            }`}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Follow up">
        {FOLLOW_UP_CHIPS.map(([label, days]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={followIn === days}
            onClick={() => setFollowIn(days)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold pointer-coarse:min-h-11 ${
              followIn === days ? "bg-[#4a7c59] text-white border-[#4a7c59]" : "bg-white text-[#1a472a] border-[#1a472a]/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {followIn !== null && (
        <input
          aria-label="Next step"
          placeholder="Next step (goes into the follow-up email)"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          className={FIELD_CLASS}
        />
      )}
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="text-sm font-semibold text-[#1a472a] underline pointer-coarse:min-h-11">
        {more ? "Fewer fields" : "Email, LinkedIn, where you met"}
      </button>
      {more && (
        <div className="grid gap-2 sm:grid-cols-3">
          <input aria-label="Email" type="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
          <input aria-label="LinkedIn link" inputMode="url" placeholder="linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={FIELD_CLASS} />
          <input aria-label="Where you met" placeholder="Where you met" value={source} onChange={(e) => setSource(e.target.value)} className={FIELD_CLASS} />
        </div>
      )}
      <Button
        onClick={submit}
        disabled={!name.trim() || !summary.trim() || add.isPending}
        className="w-full sm:w-auto bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11"
      >
        {add.isPending ? "Saving" : "Save"}
      </Button>
    </Card>
  );
}

function FollowUps() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.fundingContacts.followUps.useQuery();
  const done = trpc.fundingContacts.doneFollowUp.useMutation({
    onSuccess: () => utils.fundingContacts.followUps.invalidate(),
    onError: (err) => toast({ title: "Could not update", description: err.message, variant: "destructive" }),
  });
  if (isLoading) return <TaoSpinner size={32} />;
  const items = data ?? [];
  return (
    <Card className="p-4 bg-white border-[#1a472a]/15 space-y-3">
      <h3 className="text-lg font-bold text-[#1a472a]">Follow-ups due ({items.length})</h3>
      {items.length === 0 && <p className="text-sm text-[#1a472a]/85">Nothing due today.</p>}
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.touchId} className="rounded-lg border border-[#1a472a]/15 p-3">
            <p className="font-semibold text-[#1a472a]">
              {f.contact.name}
              {f.contact.organization ? <span className="font-normal text-[#1a472a]/80">, {f.contact.organization}</span> : null}
            </p>
            <p className="text-sm text-[#1a472a]/85">Due {f.followUpAt}{f.nextStep ? `: ${f.nextStep}` : ""}</p>
            <p className="text-xs text-[#1a472a]/75 mt-1 line-clamp-2">{f.summary}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {f.gmailUrl ? (
                <a
                  href={f.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-[#1a472a] text-white px-3 py-1.5 text-sm font-semibold pointer-coarse:min-h-11"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" /> Open in Gmail
                </a>
              ) : (
                <span className="text-sm text-[#1a472a]/80">No email yet{f.contact.linkedinUrl ? ": reach them on LinkedIn yourself" : ""}</span>
              )}
              {f.contact.linkedinUrl && (
                <a href={f.contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] underline pointer-coarse:min-h-11">
                  LinkedIn <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
              <Button variant="outline" onClick={() => done.mutate({ touchId: f.touchId })} className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11">
                Done
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentContacts() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.fundingContacts.list.useQuery(search.trim() ? { search: search.trim() } : undefined);
  const items = data ?? [];
  return (
    <Card className="p-4 bg-white border-[#1a472a]/15 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-[#1a472a]">People</h3>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search people</span>
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#1a472a]/60" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={`${FIELD_CLASS} pl-8`} />
        </label>
      </div>
      {isLoading && <TaoSpinner size={24} />}
      {!isLoading && items.length === 0 && <p className="text-sm text-[#1a472a]/85">No one logged yet.</p>}
      <ul className="divide-y divide-[#1a472a]/10">
        {items.map((c) => (
          <li key={c.id} className="py-2">
            <p className="font-semibold text-[#1a472a]">
              {c.name}
              {c.organization ? <span className="font-normal text-[#1a472a]/80">, {c.organization}</span> : null}
              <span className="ml-2 text-xs font-semibold text-[#4a7c59]">{WARMTH[c.warmth] ?? ""}</span>
              {c.doNotContact && <span className="ml-2 text-xs font-semibold text-rose-800">Do not contact</span>}
            </p>
            {c.lastTouch && <p className="text-sm text-[#1a472a]/85 line-clamp-2">{c.lastTouch.summary}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
