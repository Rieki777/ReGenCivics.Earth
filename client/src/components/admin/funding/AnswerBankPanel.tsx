/**
 * Answer bank: the canonical answers every application draws from, each in up
 * to four lengths (funding engine Phase 1; server/funding/kit.ts).
 *
 * Every answer starts as a draft. Approving is refused while a body still
 * breaks a hard rule (a G5 phrase, a dash, a [VERIFY] or [DECIDE] placeholder),
 * and editing an approved answer sends it back to draft, because an approval
 * covers the words that were approved.
 */
import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { lintAnswer } from "@shared/applicationLint.mjs";
import type { AppRouter } from "../../../../../server/routers";
import { FIELD_CLASS } from "./fieldClass";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Answer = RouterOutputs["fundingKit"]["answers"]["answers"][number];

const VARIANTS = [
  { key: "short", field: "bodyShort", label: "Short (about 50 characters)", target: 50, rows: 1 },
  { key: "150", field: "body150", label: "One or two sentences (about 150 characters)", target: 150, rows: 2 },
  { key: "500", field: "body500", label: "Paragraph (about 500 characters)", target: 500, rows: 4 },
  { key: "long", field: "bodyLong", label: "Long", target: null, rows: 8 },
] as const;
type VariantKey = (typeof VARIANTS)[number]["key"];

const STATUS_CLASS: Record<Answer["status"], string> = {
  draft: "bg-amber-100 text-amber-900 border-amber-400",
  approved: "bg-emerald-100 text-emerald-900 border-emerald-400",
  stale: "bg-slate-100 text-slate-800 border-slate-300",
};

function isLengthError(e: string) {
  return /\blimit \d+ \(cut \d+\)/.test(e);
}

export function AnswerBankPanel() {
  const { data, isLoading } = trpc.fundingKit.answers.useQuery();
  const confirmed = useMemo(() => new Set(data?.confirmedNumbers ?? []), [data?.confirmedNumbers]);
  if (isLoading) return <TaoSpinner size={48} />;
  const answers = data?.answers ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#1a472a]/85 max-w-3xl">
        The answers every application draws from. Edit them here, then approve each one when it is true and ready. An
        answer still holding a [VERIFY] or [DECIDE] note, a dash, or a G5 phrase cannot be approved. The lengths are
        guides: the packet checks each draft against the portal&apos;s real limit.
      </p>
      <NewAnswer />
      {answers.length === 0 ? (
        <Card className="p-4 bg-white border-[#1a472a]/15 text-sm text-[#1a472a]/85">
          No answers yet. Run <code>npx tsx scripts/seed-answer-bank.ts --write</code> to load the starter set, or add one
          above.
        </Card>
      ) : (
        answers.map((a) => <AnswerCard key={a.id} answer={a} confirmed={confirmed} />)
      )}
    </div>
  );
}

function NewAnswer() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [question, setQuestion] = useState("");
  const create = trpc.fundingKit.saveAnswer.useMutation({
    onSuccess: () => {
      utils.fundingKit.answers.invalidate();
      setSlug("");
      setQuestion("");
      setOpen(false);
      toast({ title: "Answer added as a draft" });
    },
    onError: (err) => toast({ title: "Could not add it", description: err.message, variant: "destructive" }),
  });
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11">
        Add an answer
      </Button>
    );
  }
  return (
    <Card className="p-4 bg-white border-[#1a472a]/15 space-y-2">
      <label className="block text-sm font-semibold text-[#1a472a]" htmlFor="new-answer-question">
        The question it answers
      </label>
      <input id="new-answer-question" value={question} onChange={(e) => setQuestion(e.target.value)} className={FIELD_CLASS} />
      <label className="block text-sm font-semibold text-[#1a472a]" htmlFor="new-answer-slug">
        Short name (lowercase, dashes)
      </label>
      <input
        id="new-answer-slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
        className={FIELD_CLASS}
        placeholder="impact-measurement"
      />
      <div className="flex gap-2">
        <Button
          onClick={() => create.mutate({ slug, canonicalQuestion: question, bodies: {} })}
          disabled={!slug || !question.trim() || create.isPending}
          className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11"
        >
          Add
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11">
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function AnswerCard({ answer, confirmed }: { answer: Answer; confirmed: Set<string> }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const initial = useMemo(
    () => Object.fromEntries(VARIANTS.map((v) => [v.key, answer[v.field] ?? ""])) as Record<VariantKey, string>,
    [answer],
  );
  const [bodies, setBodies] = useState(initial);
  const [question, setQuestion] = useState(answer.canonicalQuestion);
  const [historyOpen, setHistoryOpen] = useState(false);
  useEffect(() => {
    setBodies(initial);
    setQuestion(answer.canonicalQuestion);
  }, [initial, answer.canonicalQuestion]);

  const lints = useMemo(
    () =>
      Object.fromEntries(
        VARIANTS.map((v) => [v.key, bodies[v.key].trim() ? lintAnswer({ charLimit: v.target }, bodies[v.key], confirmed) : null]),
      ) as Record<VariantKey, ReturnType<typeof lintAnswer> | null>,
    [bodies, confirmed],
  );
  const changed = VARIANTS.filter((v) => bodies[v.key].replace(/\r\n?/g, "\n").trim() !== (initial[v.key] ?? ""));
  const dirty = changed.length > 0 || question.trim() !== answer.canonicalQuestion;
  const blocking = VARIANTS.flatMap((v) => (lints[v.key]?.errors ?? []).filter((e) => !isLengthError(e)));
  const hasBody = VARIANTS.some((v) => bodies[v.key].trim());

  const refresh = () => {
    utils.fundingKit.answers.invalidate();
    utils.fundingKit.answerHistory.invalidate({ answerId: answer.id });
  };
  const save = trpc.fundingKit.saveAnswer.useMutation({
    onSuccess: (row) => {
      refresh();
      toast({ title: row.status === "draft" && answer.status === "approved" ? "Saved: back to draft until you approve it again" : "Saved" });
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });
  const approve = trpc.fundingKit.approveAnswer.useMutation({
    onSuccess: () => {
      refresh();
      toast({ title: "Approved" });
    },
    onError: (err) => toast({ title: "Not approved", description: err.message, variant: "destructive" }),
  });
  const history = trpc.fundingKit.answerHistory.useQuery({ answerId: answer.id }, { enabled: historyOpen });

  const onSave = () =>
    save.mutate({
      id: answer.id,
      projectId: answer.projectId,
      slug: answer.slug,
      canonicalQuestion: question.trim(),
      bodies: Object.fromEntries(changed.map((v) => [v.key, bodies[v.key]])),
    });

  return (
    <Card className="p-3 md:p-4 bg-white border-[#1a472a]/15 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[answer.status]}`}>
          {answer.status === "approved" ? "Approved" : answer.status === "stale" ? "Stale" : "Draft"}
        </span>
        <span className="text-xs text-[#1a472a]/80">
          {answer.slug} · used {answer.usedCount} time{answer.usedCount === 1 ? "" : "s"}
        </span>
      </div>
      <label className="block">
        <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Question</span>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} className={`${FIELD_CLASS} font-semibold`} />
      </label>
      {answer.notes && <p className="text-xs text-[#1a472a]/85 whitespace-pre-wrap">{answer.notes}</p>}

      {VARIANTS.map((v) => {
        const lint = lints[v.key];
        const chars = lint?.chars ?? 0;
        const over = v.target !== null && chars > v.target;
        return (
          <div key={v.key}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label htmlFor={`a-${answer.id}-${v.key}`} className="text-xs font-bold text-[#1a472a]/80">
                {v.label}
              </label>
              <span className={`text-xs font-semibold ${over ? "text-amber-900" : "text-[#1a472a]/80"}`}>
                {chars}
                {v.target ? ` / ${v.target}` : ""} characters
              </span>
            </div>
            <textarea
              id={`a-${answer.id}-${v.key}`}
              value={bodies[v.key]}
              onChange={(e) => setBodies((b) => ({ ...b, [v.key]: e.target.value }))}
              rows={v.rows}
              className={FIELD_CLASS}
            />
            {lint && (lint.errors.length > 0 || lint.warnings.length > 0) && (
              <ul className="text-sm mt-1 space-y-0.5">
                {lint.errors.map((e) => (
                  <li key={`e-${e}`} className={isLengthError(e) ? "text-amber-900" : "text-rose-800"}>
                    {isLengthError(e) ? "Check" : "Fix"}: {e}
                  </li>
                ))}
                {lint.warnings.map((w) => (
                  <li key={`w-${w}`} className="text-amber-900">
                    Check: {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onSave}
          disabled={!dirty || save.isPending}
          className="bg-[#1a472a] hover:bg-[#1a472a]/90 text-white pointer-coarse:min-h-11"
        >
          {save.isPending ? "Saving" : dirty ? "Save" : "Saved"}
        </Button>
        <Button
          variant="outline"
          onClick={() => approve.mutate({ id: answer.id })}
          disabled={dirty || blocking.length > 0 || !hasBody || answer.status === "approved" || approve.isPending}
          className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
          title={dirty ? "Save first" : blocking.length ? "Fix the items marked Fix first" : undefined}
        >
          {answer.status === "approved" ? "Approved" : "Approve"}
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
      </div>

      {historyOpen && (
        <div className="border-t border-[#1a472a]/10 pt-2 space-y-2">
          {history.isLoading && <TaoSpinner size={24} />}
          {history.data?.map((v) => (
            <details key={v.id} className="text-sm">
              <summary className="cursor-pointer text-[#1a472a]">
                {v.field} · version {v.version} · {v.source} · {new Date(v.createdAt).toLocaleString()}
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[#1a472a]/90">{v.body}</p>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
