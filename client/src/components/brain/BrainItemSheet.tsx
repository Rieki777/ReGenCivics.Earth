/**
 * One item, full height, on a phone.
 *
 * The load-bearing behaviour is the Ready button. `brain.promote` is the only
 * door to the `ready` state, and when it refuses it returns its reasons as one
 * string: "missing ask; missing done_when". That string is rendered here
 * verbatim (response doc section 12). It is not translated, summarised, or
 * swallowed, and the gate's rules are NOT re-implemented on the client, because
 * a second copy of the rules is a copy that drifts and then lies.
 *
 * Every other refusal is shown the same way, including the state machine's
 * ("Cannot move raw to done"). Rye reading why beats Rye guessing why.
 *
 * The body, the ask and the attachment keys are UNTRUSTED TEXT. They render as
 * text; nothing here executes or re-prompts on them.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BRAIN_KIND_KEYS, KIND_LABEL, STATE_LABEL } from "./BrainList";
import type { BrainItemView, BrainKindKey } from "./BrainList";

/** Known repos until `brain_repos` exists (response doc 17.17). A datalist, not an enum. */
const REPO_SUGGESTIONS = ["regen-civics", "game-amora", "custom-games", "core-site", "ship"];

/** Local calendar day, so an item due "today" is today where Rye is standing. */
function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** R2 keys carry slashes. Encode each segment, keep the separators. */
export function assetUrl(key: string): string {
  return `/api/brain/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function errText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

interface Draft {
  kind: BrainKindKey;
  ask: string;
  doneWhen: string;
  repo: string;
  surface: string;
  due: string;
  effort: "" | "S" | "M" | "L";
  priority: "now" | "soon" | "someday";
  blockedOn: string;
}

function draftFrom(item: BrainItemView): Draft {
  return {
    kind: item.kind as BrainKindKey,
    ask: item.ask ?? "",
    doneWhen: item.doneWhen ?? "",
    repo: item.repo ?? "",
    surface: item.surface ?? "",
    due: toDateInput(item.due as Date | null),
    effort: (item.effort ?? "") as Draft["effort"],
    priority: (item.priority ?? "soon") as Draft["priority"],
    blockedOn: item.blockedOn ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#2d5a3d]">{label}</span>
      {children}
    </label>
  );
}

const inputSkin =
  "min-h-11 w-full rounded-lg border border-[#1a472a]/20 bg-white px-3 text-sm text-[#1a472a]";

function Attachment({ k }: { k: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="block truncate rounded-lg border border-[#1a472a]/15 bg-[#f0ebe3] px-2 py-3 text-[11px] text-[#2d5a3d]">
        {k}
      </span>
    );
  }
  return (
    <img
      src={assetUrl(k)}
      alt={`Attachment ${k}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-28 w-full rounded-lg border border-[#1a472a]/15 object-cover"
    />
  );
}

export interface BrainItemSheetProps {
  id: number;
  onClose: () => void;
  onChanged?: () => void;
}

export function BrainItemSheet({ id, onClose, onChanged }: BrainItemSheetProps) {
  const item = trpc.brain.get.useQuery({ id }, { retry: false, refetchOnWindowFocus: false });
  const update = trpc.brain.update.useMutation();
  const setState = trpc.brain.setState.useMutation();
  const promote = trpc.brain.promote.useMutation();
  const split = trpc.brain.split.useMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [splitBody, setSplitBody] = useState<string | null>(null);
  const [followsOpen, setFollowsOpen] = useState(false);

  const data = item.data as BrainItemView | undefined;

  // Seed the editable copy once the row lands, and re-seed when the server's
  // copy changes underneath (a promote demotes, a split rewrites).
  useEffect(() => {
    if (data) setDraft(draftFrom(data));
  }, [data]);

  const followsCandidates = trpc.brain.list.useQuery(
    { limit: 50 },
    { enabled: followsOpen, retry: false, refetchOnWindowFocus: false },
  );

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const base = draftFrom(data);
    return (Object.keys(base) as Array<keyof Draft>).some((k) => base[k] !== draft[k]);
  }, [data, draft]);

  const busy =
    update.isPending || setState.isPending || promote.isPending || split.isPending;

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    setRefusal(null);
    setNotice(null);
    try {
      await fn();
      await item.refetch();
      onChanged?.();
      setNotice(label);
    } catch (err) {
      setRefusal(errText(err));
    }
  }

  /**
   * Only what changed. Sending the whole draft every time would be wrong in a
   * way that is easy to miss: `updateItem` moves a `raw` item to `shaped` when
   * the payload carries a `kind`, so a save that filled in nothing would still
   * report the item as shaped. "Shaped" has to mean it has a shape.
   *
   * An emptied text field sends `null`, not `""`, so it clears the column.
   */
  const save = () => {
    if (!data || !draft) return;
    const base = draftFrom(data);
    const changed = (Object.keys(base) as Array<keyof Draft>).filter((k) => base[k] !== draft[k]);
    if (changed.length === 0) return;

    const payload: Record<string, unknown> = { id };
    for (const k of changed) {
      if (k === "priority") payload.priority = draft.priority;
      else if (k === "kind") payload.kind = draft.kind;
      else if (k === "due") payload.due = draft.due || null;
      else if (k === "effort") payload.effort = draft.effort || null;
      else payload[k] = (draft[k] as string).trim() || null;
    }
    void run("Saved.", () => update.mutateAsync(payload as never));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#f8f5f0]"
      role="dialog"
      aria-modal="true"
      aria-label="Item detail"
      data-testid="brain-item-sheet"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#1a472a]/15 bg-white px-3 py-2">
        <span className="truncate text-sm font-semibold text-[#1a472a]">
          {data ? data.title : `Item #${id}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close item"
          data-testid="brain-sheet-close"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1a472a]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom,0px))]"
      >
        {item.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" aria-label="Loading item" />
          </div>
        ) : null}

        {item.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            This item could not load. {item.error.message}
          </p>
        ) : null}

        {data && draft ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#2d5a3d]">
              <span className="rounded-full border border-[#1a472a]/40 bg-[#f0ebe3] px-2 py-0.5">
                {STATE_LABEL[data.state] ?? data.state}
              </span>
              <span className="rounded-full border border-[#4a7c59]/35 px-2 py-0.5">
                {KIND_LABEL[data.kind] ?? data.kind}
              </span>
              {data.trust === "external" ? (
                <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-amber-900">
                  external source
                </span>
              ) : null}
              <span className="truncate">{data.source}</span>
            </div>

            <p className="whitespace-pre-wrap rounded-xl border border-[#1a472a]/15 bg-white px-3 py-2.5 text-sm leading-relaxed text-[#1a472a]">
              {data.body}
            </p>

            {(data.attachments as string[] | null)?.length ? (
              <div className="grid grid-cols-2 gap-2" data-testid="brain-attachments">
                {(data.attachments as string[]).map((k) => (
                  <Attachment key={k} k={k} />
                ))}
              </div>
            ) : null}

            <Field label="Ask (one sentence, what is wanted)">
              <textarea
                value={draft.ask}
                onChange={(e) => set("ask", e.target.value)}
                rows={2}
                data-testid="brain-field-ask"
                className="w-full rounded-lg border border-[#1a472a]/20 bg-white p-3 text-sm text-[#1a472a]"
              />
            </Field>

            <Field label="Done when (how anyone would know)">
              <textarea
                value={draft.doneWhen}
                onChange={(e) => set("doneWhen", e.target.value)}
                rows={2}
                data-testid="brain-field-donewhen"
                className="w-full rounded-lg border border-[#1a472a]/20 bg-white p-3 text-sm text-[#1a472a]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Kind">
                <select
                  value={draft.kind}
                  onChange={(e) => set("kind", e.target.value as BrainKindKey)}
                  data-testid="brain-field-kind"
                  className={inputSkin}
                >
                  {BRAIN_KIND_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={draft.priority}
                  onChange={(e) => set("priority", e.target.value as Draft["priority"])}
                  data-testid="brain-field-priority"
                  className={inputSkin}
                >
                  <option value="now">now</option>
                  <option value="soon">soon</option>
                  <option value="someday">someday</option>
                </select>
              </Field>
              <Field label="Repo">
                <input
                  value={draft.repo}
                  onChange={(e) => set("repo", e.target.value)}
                  list="brain-repos"
                  data-testid="brain-field-repo"
                  className={inputSkin}
                />
                <datalist id="brain-repos">
                  {REPO_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
              <Field label="Surface (page / route / module)">
                <input
                  value={draft.surface}
                  onChange={(e) => set("surface", e.target.value)}
                  data-testid="brain-field-surface"
                  className={inputSkin}
                />
              </Field>
              <Field label="Due">
                <input
                  type="date"
                  value={draft.due}
                  onChange={(e) => set("due", e.target.value)}
                  data-testid="brain-field-due"
                  className={inputSkin}
                />
              </Field>
              <Field label="Effort">
                <select
                  value={draft.effort}
                  onChange={(e) => set("effort", e.target.value as Draft["effort"])}
                  data-testid="brain-field-effort"
                  className={inputSkin}
                >
                  <option value="">unset</option>
                  <option value="S">S (one session)</option>
                  <option value="M">M</option>
                  <option value="L">L (needs a spec first)</option>
                </select>
              </Field>
            </div>

            <Field label="Blocked on">
              <input
                value={draft.blockedOn}
                onChange={(e) => set("blockedOn", e.target.value)}
                placeholder="a person, a decision, a thing"
                data-testid="brain-field-blockedon"
                className={inputSkin}
              />
            </Field>

            {refusal ? (
              <p
                data-testid="brain-refusal"
                className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
              >
                {refusal}
              </p>
            ) : null}
            {notice ? (
              <p data-testid="brain-notice" className="text-sm text-[#2d5a3d]">
                {notice}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy || !dirty}
                data-testid="brain-save"
                className="min-h-11 rounded-lg border border-[#1a472a]/30 bg-white text-sm font-semibold text-[#1a472a] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => void run("Promoted to ready.", () => promote.mutateAsync({ id }))}
                disabled={busy}
                data-testid="brain-promote"
                className="min-h-11 rounded-lg bg-[#1a472a] text-sm font-semibold text-white disabled:opacity-50"
              >
                Ready
              </button>
              <button
                type="button"
                onClick={() =>
                  void run("Parked.", () => setState.mutateAsync({ id, state: "parked" }))
                }
                disabled={busy}
                data-testid="brain-park"
                className="min-h-11 rounded-lg border border-[#1a472a]/30 bg-white text-sm font-semibold text-[#1a472a] disabled:opacity-50"
              >
                Park
              </button>
              <button
                type="button"
                onClick={() => void run("Done.", () => setState.mutateAsync({ id, state: "done" }))}
                disabled={busy}
                data-testid="brain-done"
                className="min-h-11 rounded-lg border border-[#1a472a]/30 bg-white text-sm font-semibold text-[#1a472a] disabled:opacity-50"
              >
                Done
              </button>
            </div>

            <div className="space-y-2 border-t border-[#1a472a]/15 pt-3">
              {splitBody === null ? (
                <button
                  type="button"
                  onClick={() => setSplitBody("")}
                  data-testid="brain-split-open"
                  className="min-h-11 w-full rounded-lg border border-[#1a472a]/30 bg-white text-sm font-semibold text-[#1a472a]"
                >
                  Split into two items
                </button>
              ) : (
                <>
                  <textarea
                    value={splitBody}
                    onChange={(e) => setSplitBody(e.target.value)}
                    rows={3}
                    placeholder="The second item, in your words"
                    aria-label="Second item"
                    data-testid="brain-split-body"
                    className="w-full rounded-lg border border-[#1a472a]/20 bg-white p-3 text-sm text-[#1a472a]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitBody(null)}
                      className="min-h-11 rounded-lg border border-[#1a472a]/30 bg-white text-sm text-[#1a472a]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !splitBody.trim()}
                      data-testid="brain-split-confirm"
                      onClick={() => {
                        const body = splitBody.trim();
                        void run("Split. The second item is raw and follows this one.", async () => {
                          await split.mutateAsync({ id, secondBody: body });
                          setSplitBody(null);
                        });
                      }}
                      className="min-h-11 rounded-lg bg-[#2d5a3d] text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Split
                    </button>
                  </div>
                </>
              )}

              {!followsOpen ? (
                <button
                  type="button"
                  onClick={() => setFollowsOpen(true)}
                  data-testid="brain-follows-open"
                  className="min-h-11 w-full rounded-lg border border-[#1a472a]/30 bg-white text-sm font-semibold text-[#1a472a]"
                >
                  {data.followsId ? `Follows #${data.followsId} — change` : "Follows a previous item"}
                </button>
              ) : (
                <select
                  aria-label="Follows which item"
                  data-testid="brain-follows-select"
                  value={data.followsId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    void run("Linked.", () =>
                      update.mutateAsync({ id, followsId: v ? Number(v) : null }),
                    );
                  }}
                  className={inputSkin}
                >
                  <option value="">nothing</option>
                  {(followsCandidates.data ?? [])
                    .filter((c) => c.id !== id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} {c.title}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {data.readyAt ? (
              <p className="text-xs text-[#2d5a3d]">
                Ready receipt {String(data.readyHash ?? "").slice(0, 12)} written{" "}
                {new Date(data.readyAt as unknown as string).toLocaleString()}.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default BrainItemSheet;
