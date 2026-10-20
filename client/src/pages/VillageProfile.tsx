/**
 * /apply/village: "Your Village OS 1.0", a land project's Village profile
 * (ADR-77). Everything the project has said, on its application and on every
 * weekly board, gathered into the decisions its Village OS launches with.
 *
 * Board answers are suggestions until one of the project's stewards keeps
 * them or writes their own (Rye's call 2, 2026-10-20). "Keep this" sends the
 * suggestion's stamp, so the server keeps exactly what the page showed. Only
 * what the stewards keep goes into the 1.0 file the page downloads.
 *
 * `?a=<applicationId>` opens one project: a steward with several, or an
 * admin reading any. Every decision row lives at module scope with its own
 * draft state, so typing in one field never re-renders the page.
 */
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { Check, Circle, Clock, Download, Copy, RotateCcw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { sessionBoardHref } from "@shared/sessionBoard";
import { CAP_KEEP_DEFAULT, VILLAGE_MODULES, decisionsOf, firstWeek, villageDecision, type VillageDecision } from "@shared/villageDecisions";
import { STATUS_COPY, type DecisionState } from "@shared/projectProfile";
import { villageFileName, villageFileText, type VillageFile } from "@shared/villageFile";

export const VILLAGE_PROFILE_PATH = "/apply/village";

export const VILLAGE_PROFILE_COPY = {
  title: "Your Village OS 1.0",
  lede: "Everything your project has said, on your application and on every weekly board, gathered into the decisions your Village OS launches with.",
  howKeep: "Anyone can answer for any project on a board, so board answers wait here as suggestions. \"Keep this\" makes one your stewards' own answer and puts it in your 1.0 file. \"Undo\" takes it back out.",
  ready: "{ready} of {total} launch decisions ready",
  readyHint: "These are the launch decisions your stewards make. A Village OS default counts. Your hosting team takes care of the rest of Village OS's launch list.",
  stillOpen: "Still open for launch:",
  fileTitle: "Your 1.0 file",
  fileHint: "Download it and keep it. When your Village OS is set up, your hosting team loads it for you. It carries only your stewards' own answers; everything else starts at Village OS's default.",
  download: "Download your 1.0 file",
  copy: "Copy it",
  copied: "Copied.",
  copyFailed: "Your browser didn't let us copy. Download the file instead.",
  claimTitle: "Cards from earlier weeks that may be yours",
  claimHint: "These cards have no application yet. One of your stewards wrote it, or it has your project's name and nobody owns it. Claim one and its answers come into this profile. A card someone else wrote waits for a facilitator to link it.",
  claim: "Claim it",
  claimed: "Claimed. Its answers are in your profile now.",
  claimedTitle: "Cards you claimed",
  giveBack: "Give it back",
  gaveBack: "Given back. That card's answers have left your profile.",
  claimWhy: { name: "Same name as your project", yours: "One of your stewards wrote it" },
  keep: "Keep this",
  keepNew: "Keep the new version",
  write: "Write your own",
  change: "Change",
  undo: "Undo",
  save: "Save",
  cancel: "Cancel",
  saved: "Saved.",
  changed: "The boards have moved on since you kept this.",
  gone: "This isn't on the boards any more. What you kept stays yours until you undo it.",
  kept: "What you kept:",
  nowOnBoards: "Now on the boards:",
  onBoard: "Change it on the board",
  weekAsks: "Week {week} asks this",
  keepCap: "Keep Village OS's 10,000 for now",
  capNumber: "Our own number each lunar cycle",
  wordsCount: "{n} words. Village OS asks for at least 80.",
  startTitle: "Where you started, in Week 2",
  pick: "Choose one",
  needed: "Needed to launch",
  signIn: "Sign in to see your project's Village OS 1.0.",
  none: "Your Village profile opens once your project has applied to Season 2. Each project's stewards can open theirs here.",
  apply: "Apply to Season 2",
  choose: "Your projects",
  admin: "You're reading this as an admin.",
  loading: "Loading your Village OS 1.0...",
  failed: "That didn't save. Try again.",
} as const;

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

const card = "rounded-2xl border border-[#1a472a]/20 bg-white p-5 sm:p-6";
const ink = "text-[#1a472a]";
const soft = "text-[#1a472a]/80";
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a472a] disabled:opacity-60";
const primary = `${btn} bg-[#1a472a] text-white hover:bg-[#2d5a3d]`;
const quiet = `${btn} border-2 border-[#1a472a]/70 bg-white text-[#1a472a] hover:bg-[#f0ebe3]`;
const field = "w-full rounded-lg border-2 border-[#1a472a]/60 bg-white px-3 py-2 text-[#1a472a] placeholder:text-[#1a472a]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1a472a] aria-[invalid=true]:border-[#9b1c1c]";
const alertText = "text-sm font-semibold text-[#9b1c1c]";

function queryApplicationId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("a");
  const n = raw && /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The status chip: its words and its mark, never colour alone. */
function StatusChip({ state, decision }: { state: DecisionState; decision: VillageDecision }) {
  const week = firstWeek(decision);
  const words =
    state.status === "suggested" ? `${STATUS_COPY.suggested}${state.from ? ` · ${state.from}` : ""}`
    : state.status === "open" && week != null ? `${STATUS_COPY.open} · ${fill(VILLAGE_PROFILE_COPY.weekAsks, { week })}`
    : STATUS_COPY[state.status];
  const look =
    state.status === "yours" ? "border-[#1a472a] bg-[#1a472a] text-white"
    : state.status === "suggested" ? "border-[#7a4a0c] bg-[#fdf3e3] text-[#5c3708]"
    : "border-[#1a472a]/60 bg-white text-[#1a472a]";
  const Icon = state.status === "yours" ? Check : state.status === "suggested" ? Clock : Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${look}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {words}
    </span>
  );
}

/** What a write answers: saved, or the server's own sentence. */
type Outcome = { ok: true } | { ok: false; message: string };

type Actions = {
  confirm: (key: string, seen: string) => Promise<Outcome>;
  answer: (key: string, value: string | number | string[]) => Promise<Outcome>;
  clear: (key: string) => Promise<Outcome>;
  busy: string | null;
};

function Lines({ lines }: { lines: string[] }) {
  return (
    <div className={`grid gap-1 rounded-lg bg-[#f7f4ee] px-3 py-2 text-sm ${ink}`}>
      {lines.map((l, i) => <p key={i} className="whitespace-pre-line">{l}</p>)}
    </div>
  );
}

/** The editor for a decision a steward answers in words or choices. */
function DecisionEditor({ decision, state, actions, onDone, describedBy }: { decision: VillageDecision; state: DecisionState; actions: Actions; onDone: () => void; describedBy: string }) {
  const start = state.value ?? state.suggestion;
  const [text, setText] = useState(typeof start === "string" && start !== CAP_KEEP_DEFAULT ? start : typeof start === "number" ? String(start) : "");
  const [picks, setPicks] = useState<string[]>(Array.isArray(start) ? (start as string[]) : []);
  const [keepDefault, setKeepDefault] = useState(start === CAP_KEEP_DEFAULT);
  const [error, setError] = useState("");
  const id = useId();
  const errorId = `${id}-error`;
  const countId = `${id}-count`;
  const words = decision.format === "purpose" ? text.trim().split(/\s+/).filter(Boolean).length : null;
  const described = [describedBy, words != null ? countId : "", error ? errorId : ""].filter(Boolean).join(" ");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let value: string | number | string[] = text;
    if (decision.kind === "multi") value = picks;
    if (decision.kind === "cap") value = keepDefault ? CAP_KEEP_DEFAULT : text.trim();
    if (decision.kind === "number") value = text.trim();
    const r = await actions.answer(decision.key, value);
    if (r.ok) onDone();
    else setError(r.message);
  };

  const invalid = error ? true : undefined;

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3" noValidate>
      {decision.kind === "text" && (
        <input id={id} aria-label={decision.title} aria-describedby={described} aria-invalid={invalid} className={`${field} min-h-11`} value={text} maxLength={decision.max} onChange={(e) => setText(e.target.value)} />
      )}
      {decision.kind === "longtext" && (
        <>
          <textarea id={id} aria-label={decision.title} aria-describedby={described} aria-invalid={invalid} className={`${field} min-h-40`} value={text} maxLength={decision.max} onChange={(e) => setText(e.target.value)} />
          {words != null && <p id={countId} className={`text-sm ${soft}`}>{fill(VILLAGE_PROFILE_COPY.wordsCount, { n: words })}</p>}
        </>
      )}
      {decision.kind === "choice" && (
        <select id={id} aria-label={decision.title} aria-describedby={described} aria-invalid={invalid} className={`${field} min-h-11`} value={text} onChange={(e) => setText(e.target.value)}>
          <option value="">{VILLAGE_PROFILE_COPY.pick}</option>
          {decision.options?.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      )}
      {decision.kind === "multi" && (
        <fieldset className="grid gap-2" aria-describedby={described}>
          <legend className="sr-only">{decision.title}</legend>
          {decision.options?.map((o) => {
            const on = picks.includes(o.key);
            return (
              <label key={o.key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 px-3 ${on ? "border-[#1a472a] bg-[#e3efe5]" : "border-[#1a472a]/60 bg-white"}`}>
                <input type="checkbox" className="h-5 w-5 accent-[#1a472a]" checked={on} onChange={() => setPicks(on ? picks.filter((k) => k !== o.key) : [...picks, o.key])} />
                <span className={`text-sm ${ink}`}>{o.label}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {decision.kind === "cap" && (
        <fieldset className="grid gap-2" aria-describedby={described}>
          <legend className="sr-only">{decision.title}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="radio" name={`${id}-cap`} className="h-5 w-5 accent-[#1a472a]" checked={!keepDefault} onChange={() => setKeepDefault(false)} />
            <span className={`text-sm ${ink}`}>{VILLAGE_PROFILE_COPY.capNumber}</span>
          </label>
          {!keepDefault && (
            <input id={id} aria-label={VILLAGE_PROFILE_COPY.capNumber} aria-describedby={described} aria-invalid={invalid} inputMode="numeric" className={`${field} min-h-11`} value={text} onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))} />
          )}
          <label className="flex min-h-11 items-center gap-3">
            <input type="radio" name={`${id}-cap`} className="h-5 w-5 accent-[#1a472a]" checked={keepDefault} onChange={() => setKeepDefault(true)} />
            <span className={`text-sm ${ink}`}>{VILLAGE_PROFILE_COPY.keepCap}</span>
          </label>
        </fieldset>
      )}
      {error && <p id={errorId} role="alert" className={alertText}>{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primary} disabled={actions.busy === decision.key}>{VILLAGE_PROFILE_COPY.save}</button>
        <button type="button" className={quiet} onClick={onDone}>{VILLAGE_PROFILE_COPY.cancel}</button>
      </div>
    </form>
  );
}

/** One decision: what it is, how it stands, its answer or suggestion, and what a steward can do. */
function DecisionRow({ state, actions, weeks }: { state: DecisionState; actions: Actions; weeks: number[] }) {
  const decision = villageDecision(state.key);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const opener = useRef<HTMLButtonElement | null>(null);
  if (!decision) return null;
  const closeEditor = () => {
    setEditing(false);
    // The button that opened the editor comes back with the row; focus returns to it.
    requestAnimationFrame(() => opener.current?.focus());
  };
  const headingId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isBlock = decision.kind === "block";
  const boardWeek = [...decision.weeks].reverse().find((w) => weeks.includes(w)) ?? decision.weeks[decision.weeks.length - 1];
  const busy = actions.busy === decision.key;
  const run = async (fn: () => Promise<Outcome>) => {
    setError("");
    const r = await fn();
    if (!r.ok) setError(r.message);
  };
  const keep = () => state.stamp && run(() => actions.confirm(decision.key, state.stamp!));
  const describedBy = [headingId, decision.hint ? hintId : ""].filter(Boolean).join(" ");
  return (
    <li className="grid gap-2 border-t border-[#1a472a]/15 py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className={`font-semibold ${ink}`}>
          {decision.title}
          {decision.blocksLaunch && <span className={`ml-2 text-xs font-semibold ${soft}`}>{VILLAGE_PROFILE_COPY.needed}</span>}
        </h3>
        <StatusChip state={state} decision={decision} />
      </div>
      {decision.hint && <p id={hintId} className={`text-sm ${soft}`}>{decision.hint}</p>}
      {state.changed ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-[#5c3708]">{state.suggestion == null ? VILLAGE_PROFILE_COPY.gone : VILLAGE_PROFILE_COPY.changed}</p>
          <p className={`text-sm font-semibold ${ink}`}>{VILLAGE_PROFILE_COPY.kept}</p>
          <Lines lines={state.lines} />
          {state.suggestionLines.length > 0 && (
            <>
              <p className={`text-sm font-semibold ${ink}`}>{VILLAGE_PROFILE_COPY.nowOnBoards}</p>
              <Lines lines={state.suggestionLines} />
            </>
          )}
        </div>
      ) : (
        state.lines.length > 0 && <Lines lines={state.lines} />
      )}
      {error && <p id={errorId} role="alert" className={alertText}>{error}</p>}
      {editing && !isBlock ? (
        <DecisionEditor decision={decision} state={state} actions={actions} onDone={closeEditor} describedBy={describedBy} />
      ) : (
        <div className="flex flex-wrap gap-3">
          {state.status === "suggested" && state.keepable && (
            <button type="button" className={primary} disabled={busy} aria-describedby={headingId} onClick={() => void keep()}>{VILLAGE_PROFILE_COPY.keep}</button>
          )}
          {state.changed && state.suggestion != null && state.keepable && (
            <button type="button" className={primary} disabled={busy} aria-describedby={headingId} onClick={() => void keep()}>{VILLAGE_PROFILE_COPY.keepNew}</button>
          )}
          {!isBlock && (
            <button ref={opener} type="button" className={quiet} disabled={busy} aria-describedby={headingId} onClick={() => setEditing(true)}>
              {state.status === "yours" ? VILLAGE_PROFILE_COPY.change : VILLAGE_PROFILE_COPY.write}
            </button>
          )}
          {isBlock && boardWeek != null && (
            <Link href={sessionBoardHref(Math.max(2, boardWeek))} className={quiet} aria-describedby={headingId}>{VILLAGE_PROFILE_COPY.onBoard}</Link>
          )}
          {state.status === "yours" && (
            <button type="button" className={quiet} disabled={busy} aria-describedby={headingId} onClick={() => void run(() => actions.clear(decision.key))}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {VILLAGE_PROFILE_COPY.undo}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function FileBox({ file, project }: { file: VillageFile; project: string }) {
  const [said, setSaid] = useState("");
  const text = useMemo(() => villageFileText(file), [file]);
  const download = () => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = villageFileName(project);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setSaid(VILLAGE_PROFILE_COPY.copied);
    } catch {
      setSaid(VILLAGE_PROFILE_COPY.copyFailed);
    }
  };
  return (
    <section className={card} aria-labelledby="vp-file">
      <h2 id="vp-file" className={`text-xl font-bold ${ink}`}>{VILLAGE_PROFILE_COPY.fileTitle}</h2>
      <p className={`mt-1 text-sm ${soft}`}>{VILLAGE_PROFILE_COPY.fileHint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={primary} onClick={download}><Download className="h-4 w-4" aria-hidden="true" />{VILLAGE_PROFILE_COPY.download}</button>
        <button type="button" className={quiet} onClick={() => void copy()}><Copy className="h-4 w-4" aria-hidden="true" />{VILLAGE_PROFILE_COPY.copy}</button>
        <span className={`text-sm ${soft}`} aria-live="polite">{said}</span>
      </div>
    </section>
  );
}

type ProfileData = {
  profile: { applicationId: number; name: string; weeks: number[]; decisions: DecisionState[]; launch: { total: number; ready: number; open: string[] }; start: { phase: string | null; whereNow: string | null; nextMove: string | null; pains: string[]; opps: string[] } | null; card: { from: { project: string } } };
  claimable: { cardId: number; week: number; name: string; answers: number; why: "name" | "yours" }[];
  claimed: { cardId: number; week: number; name: string }[];
  file: VillageFile;
};

/** The profile itself, for one application. Exported for the harness. */
export function VillageProfileView({ data, actions, onClaim, onGiveBack, admin }: {
  data: ProfileData;
  actions: Actions;
  onClaim: (cardId: number) => Promise<void>;
  onGiveBack: (cardId: number) => Promise<void>;
  admin: boolean;
}) {
  const { profile, claimable, claimed, file } = data;
  const byKey = new Map(profile.decisions.map((d) => [d.key, d]));
  const openTitles = profile.launch.open.map((k) => villageDecision(k)?.title ?? k);
  return (
    <div className="grid gap-6">
      <section className={card} aria-labelledby="vp-ready">
        <p className={`text-xs font-semibold uppercase tracking-widest ${soft}`}>{profile.card.from.project}</p>
        <h2 id="vp-ready" className={`mt-1 text-xl font-bold ${ink}`}>{fill(VILLAGE_PROFILE_COPY.ready, { ready: profile.launch.ready, total: profile.launch.total })}</h2>
        <p className={`mt-1 text-sm ${soft}`}>{VILLAGE_PROFILE_COPY.readyHint}</p>
        {openTitles.length > 0 && (
          <div className="mt-3">
            <p className={`text-sm font-semibold ${ink}`}>{VILLAGE_PROFILE_COPY.stillOpen}</p>
            <ul className={`mt-1 list-disc pl-5 text-sm ${ink}`}>{openTitles.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
        {admin && <p className={`mt-3 text-sm ${soft}`}>{VILLAGE_PROFILE_COPY.admin}</p>}
      </section>

      <FileBox file={file} project={profile.card.from.project} />

      {(claimable.length > 0 || claimed.length > 0) && (
        <section className={card} aria-labelledby="vp-claim">
          <h2 id="vp-claim" className={`text-xl font-bold ${ink}`}>{VILLAGE_PROFILE_COPY.claimTitle}</h2>
          <p className={`mt-1 text-sm ${soft}`}>{VILLAGE_PROFILE_COPY.claimHint}</p>
          {claimable.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {claimable.map((c) => (
                <li key={c.cardId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1a472a]/20 px-3 py-2">
                  <span id={`vp-card-${c.cardId}`} className={`text-sm ${ink}`}>
                    <b>Week {c.week}: {c.name}</b> · {c.answers} answers · {VILLAGE_PROFILE_COPY.claimWhy[c.why]}
                  </span>
                  <button type="button" className={quiet} aria-describedby={`vp-card-${c.cardId}`} onClick={() => void onClaim(c.cardId)}>{VILLAGE_PROFILE_COPY.claim}</button>
                </li>
              ))}
            </ul>
          )}
          {claimed.length > 0 && (
            <>
              <h3 className={`mt-4 font-semibold ${ink}`}>{VILLAGE_PROFILE_COPY.claimedTitle}</h3>
              <ul className="mt-2 grid gap-2">
                {claimed.map((c) => (
                  <li key={c.cardId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1a472a]/20 px-3 py-2">
                    <span id={`vp-claimed-${c.cardId}`} className={`text-sm ${ink}`}><b>Week {c.week}: {c.name}</b></span>
                    <button type="button" className={quiet} aria-describedby={`vp-claimed-${c.cardId}`} onClick={() => void onGiveBack(c.cardId)}>{VILLAGE_PROFILE_COPY.giveBack}</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {VILLAGE_MODULES.map((m) => {
        const rows = decisionsOf(m.key).map((d) => byKey.get(d.key)).filter((s): s is DecisionState => !!s);
        if (!rows.length) return null;
        return (
          <section key={m.key} className={card} aria-labelledby={`vp-${m.key}`}>
            <h2 id={`vp-${m.key}`} className={`mb-3 text-xl font-bold ${ink}`}>{m.title}</h2>
            <ul className="grid">{rows.map((s) => <DecisionRow key={s.key} state={s} actions={actions} weeks={profile.weeks} />)}</ul>
          </section>
        );
      })}

      {profile.start && (
        <section className={card} aria-labelledby="vp-start">
          <h2 id="vp-start" className={`text-xl font-bold ${ink}`}>{VILLAGE_PROFILE_COPY.startTitle}</h2>
          <div className={`mt-2 grid gap-1 text-sm ${ink}`}>
            {profile.start.whereNow && <p>{profile.start.whereNow}</p>}
            {profile.start.pains.map((p, i) => <p key={`p${i}`}>Biggest pain: {p}</p>)}
            {profile.start.opps.map((p, i) => <p key={`o${i}`}>Growth opportunity: {p}</p>)}
            {profile.start.nextMove && <p>Next move: {profile.start.nextMove}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

export default function VillageProfile() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const mine = trpc.villageProfile.mine.useQuery(undefined, { enabled: !!user });
  const asked = queryApplicationId();
  const applicationId = asked ?? mine.data?.projects[0]?.applicationId ?? null;
  const profile = trpc.villageProfile.get.useQuery({ applicationId: applicationId ?? 0 }, { enabled: !!user && !!applicationId, retry: false });
  const confirm = trpc.villageProfile.confirm.useMutation();
  const answer = trpc.villageProfile.answer.useMutation();
  const clear = trpc.villageProfile.clear.useMutation();
  const claim = trpc.villageProfile.claimCard.useMutation();
  const unclaim = trpc.villageProfile.unclaimCard.useMutation();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = () => utils.villageProfile.get.invalidate({ applicationId: applicationId ?? 0 });
  const run = async (key: string, fn: () => Promise<unknown>, said: string = VILLAGE_PROFILE_COPY.saved): Promise<Outcome> => {
    setBusy(key);
    setNotice("");
    try {
      await fn();
      await refresh();
      setNotice(said);
      return { ok: true };
    } catch (err) {
      // A changed suggestion comes back fresh, so the steward sees what's there now.
      await refresh();
      return { ok: false, message: err instanceof Error && err.message ? err.message : VILLAGE_PROFILE_COPY.failed };
    } finally {
      setBusy(null);
    }
  };
  const actions: Actions = {
    busy,
    confirm: (key, seen) => (applicationId ? run(key, () => confirm.mutateAsync({ applicationId, key, seen })) : Promise.resolve({ ok: false, message: VILLAGE_PROFILE_COPY.failed })),
    answer: (key, value) => (applicationId ? run(key, () => answer.mutateAsync({ applicationId, key, value })) : Promise.resolve({ ok: false, message: VILLAGE_PROFILE_COPY.failed })),
    clear: (key) => (applicationId ? run(key, () => clear.mutateAsync({ applicationId, key })) : Promise.resolve({ ok: false, message: VILLAGE_PROFILE_COPY.failed })),
  };
  const onClaim = async (cardId: number) => {
    if (!applicationId) return;
    const r = await run(`claim-${cardId}`, () => claim.mutateAsync({ applicationId, cardId }), VILLAGE_PROFILE_COPY.claimed);
    if (!r.ok) setNotice(r.message);
  };
  const onGiveBack = async (cardId: number) => {
    if (!applicationId) return;
    const r = await run(`unclaim-${cardId}`, () => unclaim.mutateAsync({ applicationId, cardId }), VILLAGE_PROFILE_COPY.gaveBack);
    if (!r.ok) setNotice(r.message);
  };

  const shell = (body: ReactNode) => (
    <div className="min-h-screen bg-[#f0ebe3] px-4 py-12">
      <SEO title="Your Village OS 1.0 | ReGen Civics" description="Your land project's Village OS 1.0, gathered from every Season 2 session." url={VILLAGE_PROFILE_PATH} />
      <div className="mx-auto max-w-3xl">
        <Link href="/apply/status" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#2d5a3d] underline">&larr; Your application</Link>
        <h1 className={`mb-2 text-3xl font-bold ${ink}`} style={{ fontFamily: "var(--font-display)" }}>{VILLAGE_PROFILE_COPY.title}</h1>
        <p className={`mb-2 max-w-2xl ${soft}`}>{VILLAGE_PROFILE_COPY.lede}</p>
        <p className={`mb-6 max-w-2xl ${soft}`}>{VILLAGE_PROFILE_COPY.howKeep}</p>
        {body}
      </div>
    </div>
  );

  if (loading) return shell(null);
  if (!user) {
    return shell(
      <div className={card}>
        <p className={ink}>{VILLAGE_PROFILE_COPY.signIn}</p>
        <a href={`/sign-in?returnTo=${encodeURIComponent(VILLAGE_PROFILE_PATH)}`} className={`${primary} mt-3`}>Sign in</a>
      </div>,
    );
  }
  if (mine.isLoading || (applicationId && profile.isLoading)) return shell(<p className={soft}>{VILLAGE_PROFILE_COPY.loading}</p>);
  if (!applicationId || profile.error) {
    return shell(
      <div className={card}>
        <p className={ink}>{profile.error?.message ?? VILLAGE_PROFILE_COPY.none}</p>
        <Link href="/apply" className={`${primary} mt-3`}>{VILLAGE_PROFILE_COPY.apply}</Link>
      </div>,
    );
  }
  if (!profile.data) return shell(null);

  const projects = mine.data?.projects ?? [];
  const admin = !projects.some((p) => p.applicationId === applicationId);
  return shell(
    <>
      {projects.length > 1 && (
        <nav aria-label={VILLAGE_PROFILE_COPY.choose} className="mb-4 flex flex-wrap gap-2">
          {projects.map((p) => (
            <a key={p.applicationId} href={`${VILLAGE_PROFILE_PATH}?a=${p.applicationId}`} aria-current={p.applicationId === applicationId ? "page" : undefined} className={p.applicationId === applicationId ? primary : quiet}>
              {p.projectName}
            </a>
          ))}
        </nav>
      )}
      <p className={`mb-3 min-h-6 text-sm font-semibold ${ink}`} aria-live="polite">{notice}</p>
      <VillageProfileView data={profile.data} actions={actions} onClaim={onClaim} onGiveBack={onGiveBack} admin={admin} />
    </>,
  );
}
