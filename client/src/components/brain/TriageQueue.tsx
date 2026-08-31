/**
 * The done-triage queue on Today (ADDENDUM-1 item 2).
 *
 * This is the section that actually shrinks 219 open items. Nine of the ten
 * items Rye archived in his calibration sample were "this work was already
 * done": the June export predates the August triage, so for old build and todo
 * rows the dominant open question is not what to do about them, it is whether
 * they are still real. He answers that in seconds, which is why it is three
 * buttons and not a form.
 *
 * The three procedures are inferred from `AppRouter` rather than cast, and that
 * is a deliberate second choice. They were written in parallel with this file
 * and were uncommitted for most of it, so this shipped against a hand-typed
 * copy of the contract; once 5f9498b landed the hand copy became the worse
 * option, because a cast cannot notice `answer` being renamed and a typecheck
 * can.
 *
 * `isMissingProcedure` stays regardless. It is not about the build, it is about
 * the deploy: a client that reaches a server without these procedures gets
 * NOT_FOUND on that one entry of the batch, and "not wired yet" is a truer
 * sentence there than a red failure box on Today.
 *
 * Titles are UNTRUSTED TEXT (transcripts, forwarded messages). Rendered as
 * text, never as markup.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { BrainItemView } from "./BrainList";

export const TRIAGE_ANSWERS = [
  { key: "done", label: "Done", tone: "primary" },
  { key: "open", label: "Still open", tone: "quiet" },
  { key: "unsure", label: "Not sure", tone: "quiet" },
] as const;

export type TriageAnswer = (typeof TRIAGE_ANSWERS)[number]["key"];

/** True when the server simply has no such procedure, rather than having failed. */
export function isMissingProcedure(
  err: { message: string; data?: { code?: string } | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.data?.code === "NOT_FOUND") return true;
  return /no procedure|not_found/i.test(err.message ?? "");
}

export interface TriageQueueProps {
  /** How many to ask about at once. Five a day is the morning-message budget. */
  limit?: number;
  /** Refresh whatever else on the screen just changed (counts, week metric). */
  onAnswered?: () => void;
}

export function TriageQueue({ limit = 5, onAnswered }: TriageQueueProps) {
  const queue = trpc.brain.triageNext.useQuery(
    { limit },
    { retry: false, refetchOnWindowFocus: false },
  );
  // How many are left behind these five. Optional by design: if the count
  // fails or the procedure is not there, the heading simply drops the total
  // rather than the section dropping out.
  const pending = trpc.brain.triagePending.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const answer = trpc.brain.triageAnswer.useMutation();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const rows = (queue.data ?? []) as BrainItemView[];

  const send = async (id: number, value: TriageAnswer) => {
    setRefusal(null);
    setBusyId(id);
    try {
      await answer.mutateAsync({ id, answer: value });
      onAnswered?.();
    } catch (err) {
      setRefusal(err instanceof Error && err.message ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-2" data-testid="brain-triage">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1a472a]">
        Probably done
        {rows.length
          ? // "5 of 37" rather than "5", so answering five does not look like
            // finishing the queue when it is the morning's ration of it.
            !pending.isError && typeof pending.data === "number" && pending.data > rows.length
            ? ` (${rows.length} of ${pending.data})`
            : ` (${rows.length})`
          : ""}
      </h2>

      {queue.isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" aria-label="Loading the triage queue" />
        </div>
      ) : null}

      {queue.isError ? (
        <p data-testid="brain-triage-error" className="text-sm text-[#2d5a3d]">
          {isMissingProcedure(queue.error)
            ? "The done-triage queue is not wired on the server yet, so nothing can be asked here today."
            : `The triage queue could not load. ${queue.error?.message ?? ""}`}
        </p>
      ) : null}

      {!queue.isLoading && !queue.isError && rows.length === 0 ? (
        <p data-testid="brain-triage-empty" className="text-sm text-[#2d5a3d]">
          Nothing waiting a done-check. Old build and to-do items land here when the importer thinks
          they may already have shipped.
        </p>
      ) : null}

      {rows.length ? (
        <p className="text-xs text-[#2d5a3d]">
          These are old enough that the question is whether they still exist. Answering is the
          fastest way the backlog shrinks.
        </p>
      ) : null}

      {refusal ? (
        <p
          data-testid="brain-triage-refusal"
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          {refusal}
        </p>
      ) : null}

      <div className="space-y-2">
        {rows.map((item) => (
          <div
            key={item.id}
            data-testid={`brain-triage-${item.id}`}
            className="rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2.5"
          >
            <p className="text-sm font-medium leading-snug text-[#1a472a]">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-[#2d5a3d]">
              {item.repo ? `${item.repo} · ` : ""}
              {item.source}
            </p>
            <div className="mt-2 flex gap-2">
              {TRIAGE_ANSWERS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  disabled={busyId !== null}
                  data-testid={`brain-triage-${item.id}-${a.key}`}
                  onClick={() => void send(item.id, a.key)}
                  className={`min-h-11 flex-1 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                    a.tone === "primary"
                      ? "bg-[#1a472a] text-white"
                      : "border border-[#1a472a]/30 bg-white text-[#1a472a]"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TriageQueue;
