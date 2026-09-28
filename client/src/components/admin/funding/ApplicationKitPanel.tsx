/**
 * Applications: each program's questions with every draft, its live count
 * against the portal's limit, and the same lint the draft checker runs
 * (funding engine Phase 1; server/funding/kit.ts, shared/applicationLint.mjs).
 *
 * Built to work on a phone: open a packet, read every answer, fix it, copy it
 * into the portal. The count and the lint update as you type; the server lints
 * again on save. Nothing here submits anything.
 */
import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { lintAnswer } from "@shared/applicationLint.mjs";
import { TRACK_LABELS, stageLabel } from "@shared/fundingStages";
import type { AppRouter } from "../../../../../server/routers";
import { FIELD_CLASS, SELECT_CLASS } from "./fieldClass";
import { DEADLINE_TONE_CLASS, daysLeftText, describeDeadline } from "./deadlineFormat";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Program = RouterOutputs["fundingKit"]["programs"][number];
type Packet = RouterOutputs["fundingKit"]["packet"];
type PacketQuestion = Packet["questions"][number];
type Answers = RouterOutputs["fundingKit"]["answers"]["answers"];

const VARIANT_LABEL = { short: "short", "150": "150 characters", "500": "500 characters", long: "long" } as const;
type Variant = keyof typeof VARIANT_LABEL;
const VARIANT_FIELD: Record<Variant, "bodyShort" | "body150" | "body500" | "bodyLong"> = {
  short: "bodyShort",
  "150": "body150",
  "500": "body500",
  long: "bodyLong",
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

function DeadlineChip({ value }: { value: string | Date | null | undefined }) {
  const d = describeDeadline(value);
  if (!d) return <Chip className="bg-slate-100 text-slate-800 border-slate-300">No fixed deadline</Chip>;
  return (
    <Chip className={DEADLINE_TONE_CLASS[d.tone]}>
      {d.label} · {daysLeftText(d.daysLeft)}
    </Chip>
  );
}

export function ApplicationKitPanel() {
  const [programKey, setProgramKey] = useState<string | null>(null);
  const { data: programs, isLoading } = trpc.fundingKit.programs.useQuery();

  if (programKey) return <PacketView programKey={programKey} onBack={() => setProgramKey(null)} />;
  if (isLoading) return <TaoSpinner size={48} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#1a472a]/85 max-w-3xl">
        Every program we are applying to, soonest deadline first. Open one to see each question with its draft, the
        count against the portal limit, and anything to fix before it goes in: a G5 phrase, a dash, a placeholder, or a
        number nobody has confirmed. Submitting stays with you.
      </p>
      {(programs ?? []).length === 0 ? (
        <Card className="p-4 bg-white border-[#1a472a]/15 text-sm text-[#1a472a]/85">
          No questions loaded yet. Run <code>npx tsx scripts/seed-app-questions.ts --write</code> to load them from the
          private seed file.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(programs ?? []).map((p) => (
            <ProgramCard key={p.programKey} program={p} onOpen={() => setProgramKey(p.programKey)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program, onOpen }: { program: Program; onOpen: () => void }) {
  const s = program.summary;
  const { funder } = program;
  return (
    <Card className="p-4 bg-white border-[#1a472a]/15 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-[#1a472a]">{funder.name}</h3>
        <span className="text-sm text-[#1a472a]/80">{program.cycle}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <DeadlineChip value={funder.deadlineAt} />
        {funder.track && <Chip className="bg-sky-100 text-sky-900 border-sky-400">{TRACK_LABELS[funder.track]}</Chip>}
        {funder.stage && <Chip className="bg-slate-100 text-slate-800 border-slate-300">{stageLabel(funder.track, funder.stage)}</Chip>}
      </div>
      <p className="text-sm text-[#1a472a]/90">
        {s.answered} of {s.questions} answered
        {s.required ? `, ${s.requiredMissing} required still empty` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {s.overLimit > 0 && <Chip className="bg-rose-100 text-rose-900 border-rose-400">{s.overLimit} over the limit</Chip>}
        {s.withErrors > 0 && <Chip className="bg-rose-100 text-rose-900 border-rose-400">{s.withErrors} to fix</Chip>}
        {s.withWarnings > 0 && <Chip className="bg-amber-100 text-amber-900 border-amber-400">{s.withWarnings} to check</Chip>}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        <Button onClick={onOpen} className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11">
          Open the packet
        </Button>
        {funder.link && (
          <a
            href={funder.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] underline px-2 pointer-coarse:min-h-11"
          >
            Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </Card>
  );
}

export function PacketView({ programKey, onBack }: { programKey: string; onBack: () => void }) {
  const { data, isLoading } = trpc.fundingKit.packet.useQuery({ programKey });
  const { data: bank } = trpc.fundingKit.answers.useQuery();
  const [filter, setFilter] = useState<"all" | "fix" | "empty">("all");
  const confirmed = useMemo(() => new Set(data?.confirmedNumbers ?? []), [data?.confirmedNumbers]);

  if (isLoading || !data) return <TaoSpinner size={48} />;

  const visible = data.questions.filter((q) => {
    if (filter === "empty") return !q.answerDraft;
    if (filter === "fix") return Boolean(q.lint && (q.lint.errors.length || q.lint.warnings.length)) || (q.isRequired && !q.answerDraft);
    return true;
  });
  const sections: Array<{ name: string; items: PacketQuestion[] }> = [];
  for (const q of visible) {
    const name = q.section || "Questions";
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.items.push(q);
    else sections.push({ name, items: [q] });
  }
  const s = data.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] w-fit pointer-coarse:min-h-11"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All programs
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a472a]">
            {data.funder.name} <span className="font-medium text-[#1a472a]/80">{data.cycle}</span>
          </h2>
          <DeadlineChip value={data.funder.deadlineAt} />
          {data.funder.link && (
            <a
              href={data.funder.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] underline pointer-coarse:min-h-11"
            >
              Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
        <p className="text-sm text-[#1a472a]/90">
          {s.answered} of {s.questions} answered · {s.requiredMissing} required empty · {s.overLimit} over the limit ·{" "}
          {s.withErrors} to fix · {s.withWarnings} to check
        </p>
        {confirmed.size === 0 && (
          <p className="text-xs text-[#1a472a]/80">
            No numbers are confirmed in Metrics yet, so every number in a draft shows as unconfirmed.
          </p>
        )}
      </div>

      <div role="tablist" aria-label="Show questions" className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["fix", "Needs work"],
            ["empty", "Empty"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold pointer-coarse:min-h-11 ${
              filter === id ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a] border-[#1a472a]/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sections.length === 0 && <p className="text-sm text-[#1a472a]/85">Nothing here. Every question in this view is done.</p>}
      {sections.map((section) => (
        <section key={`${section.name}-${section.items[0].id}`} className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a472a]/80">{section.name}</h3>
          {section.items.map((q) => (
            <QuestionCard key={q.id} q={q} confirmed={confirmed} programKey={programKey} bank={bank?.answers ?? []} />
          ))}
        </section>
      ))}
    </div>
  );
}

function countTone(used: number, limit: number | null): string {
  if (!limit) return "bg-slate-100 text-slate-800 border-slate-300";
  if (used > limit) return "bg-rose-100 text-rose-900 border-rose-400";
  if (used > limit * 0.9) return "bg-amber-100 text-amber-900 border-amber-400";
  return "bg-emerald-100 text-emerald-900 border-emerald-400";
}

function QuestionCard({
  q,
  confirmed,
  programKey,
  bank,
}: {
  q: PacketQuestion;
  confirmed: Set<string>;
  programKey: string;
  bank: Answers;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [text, setText] = useState(q.answerDraft ?? "");
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [pick, setPick] = useState("");

  // A save or an import elsewhere replaces the stored draft: show it.
  useEffect(() => setText(q.answerDraft ?? ""), [q.answerDraft]);

  const lint = useMemo(
    () => (text.trim() ? lintAnswer({ charLimit: q.charLimit, wordLimit: q.wordLimit }, text, confirmed) : null),
    [text, q.charLimit, q.wordLimit, confirmed],
  );
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const dirty = normalized !== (q.answerDraft ?? "");

  const refresh = () => {
    utils.fundingKit.packet.invalidate({ programKey });
    utils.fundingKit.programs.invalidate();
    utils.fundingKit.draftHistory.invalidate({ questionId: q.id });
  };
  const save = trpc.fundingKit.saveDraft.useMutation({
    onSuccess: (res) => {
      refresh();
      toast({ title: res.changed ? "Saved" : "No change" });
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });
  const applyAnswer = trpc.fundingKit.useAnswer.useMutation({
    onSuccess: () => {
      refresh();
      utils.fundingKit.answers.invalidate();
      setPick("");
      toast({ title: "Draft started from the answer bank" });
    },
    onError: (err) => toast({ title: "Could not use that answer", description: err.message, variant: "destructive" }),
  });
  const history = trpc.fundingKit.draftHistory.useQuery({ questionId: q.id }, { enabled: historyOpen });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(normalized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy blocked", description: "Your browser blocked the clipboard. Select the text by hand.", variant: "destructive" });
    }
  };

  const options = bank.flatMap((a) =>
    (Object.keys(VARIANT_FIELD) as Variant[])
      .filter((v) => (a[VARIANT_FIELD[v]] ?? "").trim())
      .map((v) => ({ value: `${a.id}:${v}`, label: `${a.slug} (${VARIANT_LABEL[v]})${a.status === "approved" ? "" : ", draft"}` })),
  );
  const applyPick = () => {
    if (!pick) return;
    const [answerId, variant] = pick.split(":");
    if (q.answerDraft && !window.confirm("Replace this draft with the answer-bank text? The current draft stays in the history.")) return;
    applyAnswer.mutate({ questionId: q.id, answerId: Number(answerId), variant: variant as Variant });
  };

  const limit = q.charLimit ?? q.wordLimit ?? null;
  const used = q.charLimit ? (lint?.chars ?? 0) : q.wordLimit ? (lint?.words ?? 0) : (lint?.chars ?? 0);
  const unit = q.charLimit ? "characters" : q.wordLimit ? "words" : "characters";
  const inputId = `q-${q.id}`;

  return (
    <Card className="p-3 md:p-4 bg-white border-[#1a472a]/15 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="font-semibold text-[#1a472a] flex-1 min-w-[12rem]">
          <span className="text-[#1a472a]/75 mr-1">{q.questionOrder}.</span>
          {q.questionText}
          {q.isRequired && <span className="text-red-700 ml-1" aria-label="required">*</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          <Chip className={countTone(used, limit)}>
            {used}
            {limit ? ` / ${limit}` : ""} {unit}
          </Chip>
          {!q.verified && <Chip className="bg-amber-100 text-amber-900 border-amber-400">Wording unverified</Chip>}
        </div>
      </div>

      {q.notes && (
        <details className="text-xs text-[#1a472a]/85">
          <summary className="cursor-pointer font-semibold">Portal notes</summary>
          <p className="mt-1 whitespace-pre-wrap">{q.notes}</p>
        </details>
      )}

      <textarea
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={q.fieldType === "long_text" ? 6 : 2}
        className={FIELD_CLASS}
        placeholder={q.fieldType === "long_text" ? "Draft the answer" : "Answer"}
      />

      {lint && (lint.errors.length > 0 || lint.warnings.length > 0) && (
        <ul className="text-sm space-y-0.5" aria-live="polite">
          {lint.errors.map((e) => (
            <li key={`e-${e}`} className="text-rose-800">
              Fix: {e}
            </li>
          ))}
          {lint.warnings.map((w) => (
            <li key={`w-${w}`} className="text-amber-900">
              Check: {w}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => save.mutate({ questionId: q.id, answerDraft: text })}
          disabled={!dirty || save.isPending}
          className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11"
        >
          {save.isPending ? "Saving" : dirty || !q.answerDraft ? "Save" : "Saved"}
        </Button>
        <Button
          variant="outline"
          onClick={copy}
          disabled={!normalized}
          className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
        >
          {copied ? <Check className="w-4 h-4 mr-1" aria-hidden="true" /> : <Copy className="w-4 h-4 mr-1" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          aria-expanded={historyOpen}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] px-1 pointer-coarse:min-h-11"
        >
          {historyOpen ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          History
        </button>
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setBankOpen((o) => !o)}
            aria-expanded={bankOpen}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a472a] px-1 pointer-coarse:min-h-11"
          >
            {bankOpen ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
            Answer bank
          </button>
        )}
      </div>

      {bankOpen && options.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor={`pick-${q.id}`}>
            Start from the answer bank
          </label>
          <select id={`pick-${q.id}`} value={pick} onChange={(e) => setPick(e.target.value)} className={`${SELECT_CLASS} sm:max-w-sm`}>
            <option value="">Start from the answer bank...</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={applyPick}
            disabled={!pick || applyAnswer.isPending}
            className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11 w-fit"
          >
            Use it
          </Button>
        </div>
      )}

      {historyOpen && (
        <div className="border-t border-[#1a472a]/10 pt-2 space-y-2">
          {history.isLoading && <TaoSpinner size={24} />}
          {history.data && history.data.length === 0 && <p className="text-sm text-[#1a472a]/80">No saved versions yet.</p>}
          {history.data?.map((v) => (
            <details key={v.id} className="text-sm">
              <summary className="cursor-pointer text-[#1a472a]">
                Version {v.version} · {v.source} · {new Date(v.createdAt).toLocaleString()}
                {v.note ? ` · ${v.note}` : ""}
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[#1a472a]/90">{v.body}</p>
              <button
                type="button"
                onClick={() => setText(v.body)}
                className="mt-1 text-xs font-semibold text-[#1a472a] underline pointer-coarse:min-h-11"
              >
                Put this version back in the editor
              </button>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
