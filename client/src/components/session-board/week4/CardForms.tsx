/**
 * The Week 4 cards on screen (shared/boardCards.ts): a seat in a circle, a
 * human need of the project's own, what a circle decides, and a quest. Each
 * form saves one card into one of this person's slots for the project; a
 * saved card can be changed (same slot, replaced in place) or taken back.
 *
 * Every choice is a row of tap targets (`sb-opt`, aria-pressed) or a native
 * select, and every field has a visible label, so the forms read the same on
 * a phone as on the shared screen.
 *
 * A half-written card is kept in the page's memory (week3/drafts.ts) under
 * its form's own key, so it survives the room moving on, the rail, the
 * arrows and opening another form; while one is unsaved the form carries
 * `data-unsaved` and the screen holds instead of following the room
 * (pages/SessionBoard.tsx typingOnStage). Enter moves to the next field, the
 * way a phone's Next key does; only Save, or Enter on a form's last line,
 * saves.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CARD_COPY,
  CARD_LIMITS,
  DECIDES_BY,
  HELD_BY,
  cardLine,
  cardText,
  circleLabel,
  cleanCard,
  needKeyLabel,
  type CardEntry,
  type CardKind,
  type CardOf,
  type DecideCard,
  type DecidesBy,
  type HeldBy,
  type OwnNeedCard,
  type QuestCard,
  type SeatCard,
} from "@shared/boardCards";
import { BREADTH_STOPS, CIRCLES, NEED_RUNGS, humanNeedById } from "@shared/humanNeeds";
import { fillCopy } from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { myCardId } from "../week3/answers";
import { dropDraft, readDraft, writeDraft } from "../week3/drafts";
import { isMyCard, nextSlot } from "./game";
import { useSay } from "./say";

export type Choice = { key: string; label: string };

const OWN_PREFIX = "own:";
const NEW_OWN = "__own__";

/** Save a card into its slot (a new card takes the next free one). Resolves true when it saved. */
export async function saveCard<K extends CardKind>(props: StageProps, kind: K, card: CardOf<K>, slot: string | null): Promise<boolean> {
  const pid = myCardId(props.myProject);
  const key = slot ?? nextSlot(props.board.items, props.mine, kind, pid);
  if (!key) {
    toast(CARD_COPY[kind].full);
    return false;
  }
  // A new card is "fresh": the server picks the free slot, so it never lands on a card saved elsewhere.
  const r = await props.actions.answerNote({ key, text: cardText(kind, card), projectId: pid, fresh: slot == null });
  return r != null;
}

/** The draft key of a new card's form: one per project, kind and place it was opened from. */
export function newCardDraftKey(kind: CardKind, pid: number | null, place = ""): string {
  return `card:${kind}:${pid ?? "room"}:new${place ? `:${place}` : ""}`;
}

/** Whether a form for this draft key has words waiting, so the stage reopens it. */
export function hasCardDraft(key: string): boolean {
  return readDraft(key) != null;
}

/**
 * Remembers the button a form was opened from, so focus goes back to it when
 * the form closes (saved or cancelled) instead of dropping to the page.
 */
export function useFocusBack() {
  const refs = useRef(new Map<string, HTMLElement>());
  return {
    ref: (key: string) => (el: HTMLElement | null) => {
      if (el) refs.current.set(key, el);
      else refs.current.delete(key);
    },
    back: (key: string) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => refs.current.get(key)?.focus());
    },
  };
}

/**
 * A card form's fields. While they differ from where the form started they
 * are kept under `draftKey`; `unsaved` says so, and `drop` forgets them once
 * the card is saved or the form is cancelled.
 */
function useCardFields<T extends Record<string, string>>(draftKey: string | undefined, start: T) {
  const [origin] = useState(start);
  const [fields, setFields] = useState<T>(() => {
    const saved = draftKey ? readDraft(draftKey) : undefined;
    if (saved) {
      try {
        return { ...origin, ...(JSON.parse(saved) as Partial<T>) };
      } catch {
        // A draft that doesn't read is left behind.
      }
    }
    return origin;
  });
  const originText = JSON.stringify(origin);
  const set = (patch: Partial<T>) =>
    setFields((prev) => {
      const next = { ...prev, ...patch };
      const text = JSON.stringify(next);
      if (draftKey) writeDraft(draftKey, text === originText ? "" : text);
      return next;
    });
  const drop = () => {
    if (draftKey) dropDraft(draftKey);
  };
  return { fields, set, drop, unsaved: JSON.stringify(fields) !== originText };
}

/** The first required field still empty in a form, or its first required field. */
function firstMissing(form: HTMLFormElement | null): HTMLElement | null {
  if (!form) return null;
  const all = Array.from(form.querySelectorAll<HTMLElement>("[data-required]"));
  const empty = all.find((el) => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLInputElement) return !el.value.trim();
    return !el.querySelector("[aria-pressed='true']");
  });
  const at = empty ?? all[0] ?? null;
  if (!at) return null;
  return at instanceof HTMLTextAreaElement || at instanceof HTMLSelectElement || at instanceof HTMLInputElement ? at : at.querySelector<HTMLElement>("button");
}

/**
 * The shared save step: a card that isn't whole yet shows why and moves to
 * the first field it still needs; a whole one saves, is said aloud, forgets
 * its draft and closes.
 */
function useSubmit<C>({ card, title, onSave, done, drop }: { card: C | null; title: (c: C) => string; onSave: (card: C) => Promise<boolean>; done?: () => void; drop: () => void }) {
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const say = useSay();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!card) {
      setTried(true);
      firstMissing(e.currentTarget)?.focus();
      return;
    }
    setBusy(true);
    try {
      if (await onSave(card)) {
        drop();
        say(fillCopy(CARD_COPY.saved, { title: title(card) }));
        done?.();
      }
    } finally {
      setBusy(false);
    }
  };
  return { busy, tried, submit };
}

/* ------------------------------------------------------------- pieces */

/** A labelled field; a hint under it is tied to the control, so a screen reader reads it with the label. */
function Field({ label, children, hint }: { label: string; children: (id: string, describedBy?: string) => ReactNode; hint?: string }) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="sb-card-field">
      <label className="sb-card-label" htmlFor={id}>{label}</label>
      {children(id, hint ? hintId : undefined)}
      {hint ? <p id={hintId} className="sb-hint">{hint}</p> : null}
    </div>
  );
}

/** A row of choices, one pressed at a time. */
function Choices({ label, choices, value, onChange, required = false }: { label: string; choices: readonly Choice[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  const id = useId();
  return (
    <div className="sb-card-field">
      <p className="sb-card-label" id={id}>{label}</p>
      <div className="sb-opts" role="group" aria-labelledby={id} data-required={required || undefined}>
        {choices.map((c) => (
          <button key={c.key} type="button" className="sb-opt" aria-pressed={value === c.key} onClick={() => onChange(c.key)}>
            <span className="sb-opt-t">{c.label}</span>
            {/* A tick, so the choice reads without its colour (WCAG 1.4.1). */}
            {value === c.key ? <span className="sb-opt-tick" aria-hidden="true">✓</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The field after this one in its form: a line, a select or a row of choices; never Save or Cancel. */
function nextField(el: HTMLElement): HTMLElement | null {
  const form = (el as HTMLTextAreaElement).form;
  if (!form) return null;
  const fields = Array.from(form.querySelectorAll<HTMLElement>(".sb-card-field textarea, .sb-card-field select, .sb-card-field input, .sb-card-field .sb-opt"));
  return fields.slice(fields.indexOf(el) + 1).find((x) => !(x as HTMLButtonElement).disabled) ?? null;
}

/**
 * One line of a card. A textarea that grows with its words, so a long line and
 * its example wrap on a phone instead of being cut off; a pasted line break
 * becomes a space. Enter moves to the next field (the phone's key reads
 * Next); on the form's last line (`enter="save"`) it saves.
 */
function Line({ id, value, onChange, max, placeholder, autoComplete = "off", autoFocus = false, enter = "next", describedBy, required = false }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  enter?: "next" | "save";
  describedBy?: string;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      className="sb-field sb-card-text"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, " "))}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        const el = e.currentTarget;
        if (enter === "save") {
          el.form?.requestSubmit();
          return;
        }
        const next = nextField(el);
        if (next) next.focus();
        else el.blur();
      }}
      enterKeyHint={enter === "save" ? "done" : "next"}
      maxLength={max}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      aria-describedby={describedBy}
      aria-required={required || undefined}
      data-required={required || undefined}
    />
  );
}

/**
 * Why a card can't be saved yet, in a live region that is always there, so
 * the words are read when they appear. Shown once someone has started the
 * card or tried to save it.
 */
function Refusal({ id, show, text }: { id: string; show: boolean; text: string }) {
  return <div role="status">{show ? <p id={id} className="sb-hint">{text}</p> : null}</div>;
}

/**
 * Save and Cancel. Save stays focusable while the card isn't whole
 * (aria-disabled, not disabled), so Enter or a tap says why and moves to the
 * field it still needs instead of doing nothing.
 */
function FormFoot({ busy, ok, save, onCancel, describedBy }: { busy: boolean; ok: boolean; save: string; onCancel?: () => void; describedBy?: string }) {
  return (
    <div className="sb-card-actions">
      <button type="submit" className="sb-btn sb-primary" aria-disabled={busy || !ok} aria-describedby={describedBy}>{save}</button>
      {onCancel ? <button type="button" className="sb-btn sb-ghost" onClick={onCancel}>{CARD_COPY.cancel}</button> : null}
    </div>
  );
}

/** The circle select: the circles offered first, the rest of the nine, the project's own, and a new one of its own. */
function CircleSelect({ value, onChange, first, ownCircles }: { value: string; onChange: (v: string) => void; first: readonly string[]; ownCircles: readonly string[] }) {
  const [typing, setTyping] = useState(value.startsWith(OWN_PREFIX) && !ownCircles.includes(value.slice(OWN_PREFIX.length)));
  const typed = value.startsWith(OWN_PREFIX) ? value.slice(OWN_PREFIX.length) : "";
  const nine = CIRCLES.map((c) => c.key as string);
  const ordered = [...first.filter((k) => nine.includes(k)), ...nine.filter((k) => !first.includes(k))];
  const selectValue = typing ? NEW_OWN : value;
  return (
    <>
      <Field label={CARD_COPY.seat.circle}>
        {(id) => (
          <select
            id={id}
            className="sb-field"
            value={selectValue}
            aria-required="true"
            data-required
            onChange={(e) => {
              const v = e.target.value;
              if (v === NEW_OWN) {
                setTyping(true);
                onChange(OWN_PREFIX);
              } else {
                setTyping(false);
                onChange(v);
              }
            }}
          >
            <option value="">{CARD_COPY.pickOne}</option>
            {ordered.map((k) => <option key={k} value={k}>{circleLabel(k)}</option>)}
            {ownCircles.map((name) => <option key={name} value={`${OWN_PREFIX}${name}`}>{name}</option>)}
            <option value={NEW_OWN}>{CARD_COPY.ownCircle}</option>
          </select>
        )}
      </Field>
      {typing ? (
        <Field label={CARD_COPY.ownCircleName}>
          {(id) => <Line id={id} value={typed} onChange={(v) => onChange(`${OWN_PREFIX}${v}`)} max={CARD_LIMITS.circleName} placeholder="Kitchen" required />}
        </Field>
      ) : null}
    </>
  );
}

function NeedSelect({ label, value, onChange, needs }: { label: string; value: string; onChange: (v: string) => void; needs: readonly Choice[] }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} className="sb-field" value={value} onChange={(e) => onChange(e.target.value)} aria-required="true" data-required>
          <option value="">{CARD_COPY.pickOne}</option>
          {needs.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
      )}
    </Field>
  );
}

/* --------------------------------------------------------------- seat */

export function SeatForm({ initial, need, needs, circlesFirst, ownCircles, onSave, onCancel, onSaved, draftKey, focusFirst = true }: {
  /** A form opened by a tap takes focus; one that is there on arrival doesn't. */
  focusFirst?: boolean;
  initial?: SeatCard;
  need?: string;
  needs: readonly Choice[];
  circlesFirst: readonly string[];
  ownCircles: readonly string[];
  onSave: (card: SeatCard) => Promise<boolean>;
  onCancel?: () => void;
  /** After a save; the form's close by default. */
  onSaved?: () => void;
  /** Where its half-written words are kept (week3/drafts.ts). */
  draftKey?: string;
}) {
  const { fields: f, set, drop, unsaved } = useCardFields<Record<"name" | "circle" | "need" | "aim" | "answersFor" | "heldBy" | "who" | "contribution", string>>(draftKey, {
    name: initial?.name ?? "",
    circle: initial?.circle ?? circlesFirst[0] ?? "",
    need: initial?.need ?? need ?? "",
    aim: initial?.aim ?? "",
    answersFor: initial?.answersFor ?? "",
    heldBy: initial?.heldBy ?? "open",
    who: initial?.who ?? "",
    contribution: initial?.contribution ?? "",
  });
  const card = cleanCard("seat", { ...f, heldBy: f.heldBy as HeldBy });
  const { busy, tried, submit } = useSubmit({ card, title: (c) => c.name, onSave, done: onSaved ?? onCancel, drop });
  const refusalId = useId();
  const refused = !card && (tried || !!(f.name || f.aim));
  const cancel = onCancel ? () => { drop(); onCancel(); } : undefined;
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate data-unsaved={unsaved || undefined}>
      <Field label={CARD_COPY.seat.name}>
        {(id) => <Line id={id} value={f.name} onChange={(v) => set({ name: v })} max={CARD_LIMITS.name} placeholder={CARD_COPY.seat.namePlaceholder} autoFocus={focusFirst} required />}
      </Field>
      <CircleSelect value={f.circle} onChange={(v) => set({ circle: v })} first={circlesFirst} ownCircles={ownCircles} />
      <NeedSelect label={CARD_COPY.seat.need} value={f.need} onChange={(v) => set({ need: v })} needs={needs} />
      <Field label={CARD_COPY.seat.aim}>
        {(id) => <Line id={id} value={f.aim} onChange={(v) => set({ aim: v })} max={CARD_LIMITS.aim} placeholder={CARD_COPY.seat.aimPlaceholder} />}
      </Field>
      <Field label={CARD_COPY.seat.answersFor}>
        {(id) => <Line id={id} value={f.answersFor} onChange={(v) => set({ answersFor: v })} max={CARD_LIMITS.answersFor} placeholder={CARD_COPY.seat.answersForPlaceholder} />}
      </Field>
      <Choices label={CARD_COPY.seat.heldBy} choices={HELD_BY} value={f.heldBy} onChange={(v) => set({ heldBy: v })} />
      {f.heldBy === "team" ? (
        <Field label={CARD_COPY.seat.whoTeam} hint={CARD_COPY.seat.whoHint}>
          {(id, d) => <Line id={id} describedBy={d} value={f.who} onChange={(v) => set({ who: v })} max={CARD_LIMITS.who} placeholder="Ana" autoComplete="name" />}
        </Field>
      ) : f.heldBy === "being" ? (
        <Field label={CARD_COPY.seat.whoBeing}>
          {(id) => <Line id={id} value={f.who} onChange={(v) => set({ who: v })} max={CARD_LIMITS.who} placeholder={CARD_COPY.seat.whoBeingPlaceholder} />}
        </Field>
      ) : (
        <p className="sb-hint">{CARD_COPY.seat.open}</p>
      )}
      <Field label={CARD_COPY.seat.contribution} hint={CARD_COPY.seat.contributionHint}>
        {(id, d) => <Line id={id} describedBy={d} value={f.contribution} onChange={(v) => set({ contribution: v })} max={CARD_LIMITS.contribution} placeholder={CARD_COPY.seat.contributionPlaceholder} enter="save" />}
      </Field>
      <Refusal id={refusalId} show={refused} text={CARD_COPY.bad.seat} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.seat.save} onCancel={cancel} describedBy={refused ? refusalId : undefined} />
    </form>
  );
}

/* ------------------------------------------------------ own human need */

const RUNG_CHOICES: Choice[] = NEED_RUNGS.map((r) => ({ key: r.key, label: r.label }));
const BREADTH_CHOICES: Choice[] = BREADTH_STOPS.map((b) => ({ key: b.key, label: b.label }));

export function OwnNeedForm({ initial, onSave, onCancel, onSaved, draftKey, focusFirst = true }: {
  initial?: Partial<OwnNeedCard>;
  onSave: (card: OwnNeedCard) => Promise<boolean>;
  onCancel?: () => void;
  onSaved?: () => void;
  draftKey?: string;
  focusFirst?: boolean;
}) {
  const { fields: f, set, drop, unsaved } = useCardFields<Record<"label" | "goal" | "breadth", string>>(draftKey, {
    label: initial?.label ?? "",
    goal: initial?.goal ?? "",
    breadth: initial?.breadth ?? "100",
  });
  const card = cleanCard("own", f);
  const { busy, tried, submit } = useSubmit({ card, title: (c) => c.label, onSave, done: onSaved ?? onCancel, drop });
  const refusalId = useId();
  const refused = !card && (tried || !!(f.label.trim() && f.goal));
  const cancel = onCancel ? () => { drop(); onCancel(); } : undefined;
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate data-unsaved={unsaved || undefined}>
      <Field label={CARD_COPY.own.label}>
        {(id) => <Line id={id} value={f.label} onChange={(v) => set({ label: v })} max={CARD_LIMITS.label} placeholder={CARD_COPY.own.labelPlaceholder} autoFocus={focusFirst} required />}
      </Field>
      <Choices label={CARD_COPY.own.goal} choices={RUNG_CHOICES} value={f.goal} onChange={(v) => set({ goal: v })} required />
      <Choices label={CARD_COPY.own.breadth} choices={BREADTH_CHOICES} value={f.breadth} onChange={(v) => set({ breadth: v })} />
      <Refusal id={refusalId} show={refused} text={CARD_COPY.bad.own} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.own.save} onCancel={cancel} describedBy={refused ? refusalId : undefined} />
    </form>
  );
}

/* ------------------------------------------------------ what a circle decides */

export function DecideForm({ circle: fixed, initial, onSave, onCancel, onSaved, draftKey, circlesFirst, ownCircles, focusFirst = true }: {
  focusFirst?: boolean;
  circle?: string;
  initial?: DecideCard;
  circlesFirst: readonly string[];
  ownCircles: readonly string[];
  onSave: (card: DecideCard) => Promise<boolean>;
  onCancel?: () => void;
  onSaved?: () => void;
  draftKey?: string;
}) {
  const { fields: f, set, drop, unsaved } = useCardFields<Record<"circle" | "decidesOn" | "how" | "gloss", string>>(draftKey, {
    circle: initial?.circle ?? fixed ?? circlesFirst[0] ?? "",
    decidesOn: initial?.decidesOn ?? "",
    how: initial?.how ?? "",
    gloss: initial?.gloss ?? "",
  });
  // "Another way" takes a line saying what it is: Village OS refuses it without one.
  const other = f.how === "other";
  const card = cleanCard("decide", { circle: f.circle, decidesOn: f.decidesOn, how: (f.how || undefined) as DecidesBy | undefined, gloss: other ? f.gloss : undefined });
  const { busy, tried, submit } = useSubmit({ card, title: (c) => circleLabel(c.circle), onSave, done: onSaved ?? onCancel, drop });
  const refusalId = useId();
  const refused = !card && tried;
  const cancel = onCancel ? () => { drop(); onCancel(); } : undefined;
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate data-unsaved={unsaved || undefined}>
      {fixed ? null : <CircleSelect value={f.circle} onChange={(v) => set({ circle: v })} first={circlesFirst} ownCircles={ownCircles} />}
      <Field label={fixed ? `What ${circleLabel(fixed)} decides on` : CARD_COPY.decide.decidesOn}>
        {(id) => <Line id={id} value={f.decidesOn} onChange={(v) => set({ decidesOn: v })} max={CARD_LIMITS.decidesOn} placeholder={CARD_COPY.decide.decidesOnPlaceholder} autoFocus={focusFirst} enter="save" required />}
      </Field>
      <Choices label={CARD_COPY.decide.how} choices={DECIDES_BY} value={f.how} onChange={(v) => set({ how: v === f.how ? "" : v })} />
      {other ? (
        <Field label={CARD_COPY.decide.gloss}>
          {(id) => <Line id={id} value={f.gloss} onChange={(v) => set({ gloss: v })} max={CARD_LIMITS.gloss} placeholder={CARD_COPY.decide.glossPlaceholder} enter="save" required />}
        </Field>
      ) : null}
      <Refusal id={refusalId} show={refused} text={other && f.circle && f.decidesOn.trim() && !f.gloss.trim() ? CARD_COPY.bad.gloss : CARD_COPY.bad.decide} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.decide.save} onCancel={cancel} describedBy={refused ? refusalId : undefined} />
    </form>
  );
}

/* --------------------------------------------------------------- quest */

export function QuestForm({ initial, needs, onSave, onCancel, onSaved, draftKey, focusFirst = true }: {
  focusFirst?: boolean;
  initial?: QuestCard;
  needs: readonly Choice[];
  onSave: (card: QuestCard) => Promise<boolean>;
  onCancel?: () => void;
  onSaved?: () => void;
  draftKey?: string;
}) {
  const { fields: f, set, drop, unsaved } = useCardFields<Record<"quest" | "need", string>>(draftKey, {
    quest: initial?.quest ?? "",
    need: initial?.need ?? needs[0]?.key ?? "",
  });
  // The project's human needs can arrive or change after the form opened: keep the choice one of them.
  const needKeys = needs.map((n) => n.key).join("|");
  useEffect(() => {
    if (!needs.some((n) => n.key === f.need)) set({ need: needs[0]?.key ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needKeys]);
  const card = cleanCard("quest", f);
  const { busy, tried, submit } = useSubmit({
    card,
    title: (c) => c.quest,
    onSave,
    done: () => {
      set({ quest: "" });
      drop();
      (onSaved ?? onCancel)?.();
    },
    drop,
  });
  const refusalId = useId();
  const refused = !card && tried;
  const cancel = onCancel ? () => { drop(); onCancel(); } : undefined;
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate data-unsaved={unsaved || undefined}>
      <Field label={CARD_COPY.quest.quest}>
        {(id) => <Line id={id} value={f.quest} onChange={(v) => set({ quest: v })} max={CARD_LIMITS.quest} placeholder={CARD_COPY.quest.questPlaceholder} autoFocus={focusFirst} required />}
      </Field>
      <NeedSelect label={CARD_COPY.quest.need} value={f.need} onChange={(v) => set({ need: v })} needs={needs} />
      <Refusal id={refusalId} show={refused} text={CARD_COPY.bad.quest} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.quest.save} onCancel={cancel} describedBy={refused ? refusalId : undefined} />
    </form>
  );
}

/* --------------------------------------------------------- a saved card */

const titleOf = (kind: CardKind, c: CardOf<CardKind>) =>
  kind === "seat" ? (c as SeatCard).name : kind === "own" ? (c as OwnNeedCard).label : kind === "decide" ? circleLabel((c as DecideCard).circle) : (c as QuestCard).quest;

/**
 * One saved card: its line, and Change / Take back for its writer (and Take
 * back for a facilitator). A Change form left half-written reopens with its
 * words; closing it puts focus back on Change, and taking a card back moves
 * focus to the card beside it.
 */
export function CardItem<K extends CardKind>({ props, kind, entry, own, edit }: {
  props: StageProps;
  kind: K;
  entry: CardEntry<K>;
  own: ReadonlyMap<string, string>;
  /** The form to change it with, given a close callback and its draft key. Writers only. */
  edit?: (close: () => void, draftKey: string) => ReactNode;
}) {
  const { mine, facilitator, actions, canWrite, myProject } = props;
  const editKey = `card:${kind}:${myCardId(myProject) ?? "room"}:${entry.key}`;
  const [editing, setEditing] = useState(() => hasCardDraft(editKey));
  const changeRef = useRef<HTMLButtonElement>(null);
  const say = useSay();
  const yours = isMyCard(mine, entry.rowId);
  const c = entry.card as CardOf<CardKind>;
  const title = titleOf(kind, c);
  if (editing && edit) {
    const close = () => {
      setEditing(false);
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => changeRef.current?.focus());
    };
    return <li className="sb-card-item">{edit(close, editKey)}</li>;
  }
  const hue = kind === "seat" ? humanNeedById((c as SeatCard).need)?.hue : kind === "quest" ? humanNeedById((c as QuestCard).need)?.hue : undefined;
  const takeBack = (ev: { currentTarget: HTMLElement }) => {
    // Where focus goes once the card is gone: the next card's first button, the
    // one before, else (the last card) the section's heading or what's left in it.
    const li = ev.currentTarget.closest("li");
    const section = li?.closest("section") ?? null;
    const next = li?.nextElementSibling?.querySelector<HTMLElement>("button") ?? li?.previousElementSibling?.querySelector<HTMLElement>("button") ?? null;
    // The card leaves the screen at once (the write paints first), so focus moves then, not when the server answers.
    void actions.removeItem(entry.rowId).then((ok) => {
      if (!ok) return;
      dropDraft(editKey);
      say(fillCopy(CARD_COPY.takenBack, { title }));
    });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        const to = next?.isConnected ? next : section?.querySelector<HTMLElement>("h3[tabindex], button, textarea, select");
        to?.focus();
      });
    }
  };
  return (
    <li className="sb-card-item" style={hue ? { ["--sb-hue" as string]: hue } : undefined}>
      <article className="sb-card">
        <h4 className="sb-card-title">{title}</h4>
        {kind === "seat" ? (
          <SeatFacts seat={c as SeatCard} own={own} />
        ) : (
          <p className="sb-card-line">{kind === "own" ? ownNeedDetail(c as OwnNeedCard) : cardLine(kind, c, own)}</p>
        )}
        {canWrite && (yours || facilitator) ? (
          <div className="sb-card-actions">
            {yours && edit ? <button ref={changeRef} type="button" className="sb-btn sb-small" onClick={() => setEditing(true)}>{kind === "seat" ? CARD_COPY.seat.edit : "Change"}</button> : null}
            <button type="button" className="sb-btn sb-small sb-ghost" aria-label={`${CARD_COPY.remove}: ${title}`} onClick={takeBack}>{CARD_COPY.remove}</button>
          </div>
        ) : null}
      </article>
    </li>
  );
}

/** "Thriving in three years, for most of us": an own human need's card under its name. */
function ownNeedDetail(card: OwnNeedCard): string {
  const goal = NEED_RUNGS.find((r) => r.key === card.goal)?.label ?? card.goal;
  const breadth = BREADTH_STOPS.find((b) => b.key === card.breadth)?.phrase;
  return [`${goal} in three years`, breadth].filter(Boolean).join(", ");
}

function SeatFacts({ seat, own }: { seat: SeatCard; own: ReadonlyMap<string, string> }) {
  const held = HELD_BY.find((h) => h.key === seat.heldBy);
  const facts: [string, string][] = [
    ["Circle", circleLabel(seat.circle)],
    ["Meets", needKeyLabel(seat.need, own)],
    ...(seat.aim ? [["Works toward", seat.aim] as [string, string]] : []),
    ...(seat.answersFor ? [["Answers for", seat.answersFor] as [string, string]] : []),
    seat.heldBy === "open"
      ? ["Held by", HELD_BY[1].label]
      : [held?.short ?? "Held by", seat.who || (seat.heldBy === "being" ? "A being" : "Someone on the team")],
    ...(seat.contribution ? [["Asks", seat.contribution] as [string, string]] : []),
  ];
  return (
    <dl className="sb-card-facts">
      {facts.map(([t, v]) => (
        <div key={t}>
          <dt>{t}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
