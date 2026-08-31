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
 * WHY THE PROCEDURES ARE TYPED HERE RATHER THAN INFERRED
 *
 * `brain.triageNext`, `brain.triagePending` and `brain.triageAnswer` are Lane
 * E's, and they are UNCOMMITTED while this is written: they exist in the
 * working tree and not in any commit this branch has. Inferring from
 * `AppRouter` would compile today and leave this commit red on its own, so the
 * three are typed here instead and reached through one cast.
 *
 * The shapes below were read off Lane E's own router rather than guessed, and
 * they match the contract in the brief:
 *
 *     trpc.brain.triageNext.useQuery({ limit: 5 })   // -> BrainItem[]
 *     trpc.brain.triagePending.useQuery()            // -> number
 *     trpc.brain.triageAnswer.useMutation()          // { id, answer }
 *
 * The tRPC react proxy builds a path from any property name, so the call is
 * made either way; a server without the procedure answers NOT_FOUND on that one
 * entry of the batch and the section below says so in words. When the router
 * lands, delete `TriageApi` and the cast and the three hooks type themselves.
 * Nothing else in this file changes.
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

interface QueryLike {
  data?: BrainItemView[];
  isLoading: boolean;
  isError: boolean;
  error: { message: string; data?: { code?: string } | null } | null;
}

interface TriageApi {
  triageNext: {
    useQuery: (
      input: { limit: number },
      opts: { retry: boolean; refetchOnWindowFocus: boolean },
    ) => QueryLike;
  };
  triagePending: {
    useQuery: (
      input: undefined,
      opts: { retry: boolean; refetchOnWindowFocus: boolean },
    ) => { data?: number; isError: boolean };
  };
  triageAnswer: {
    useMutation: () => {
      mutateAsync: (input: { id: number; answer: TriageAnswer }) => Promise<unknown>;
    };
  };
}

/** True when the server simply has no such procedure, rather than having failed. */
export function isMissingProcedure(err: { message: string; data?: { code?: string } | null } | null): boolean {
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
  const api = trpc.brain as unknown as TriageApi;
  const queue = api.triageNext.useQuery(
    { limit },
    { retry: false, refetchOnWindowFocus: false },
  );
  // How many are left behind these five. Optional by design: if the count
  // fails or the procedure is not there, the heading simply drops the total
  // rather than the section dropping out.
  const pending = api.triagePending.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const answer = api.triageAnswer.useMutation();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const rows = queue.data ?? [];

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
