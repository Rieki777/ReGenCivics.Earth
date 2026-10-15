/**
 * The Week 4 cards on screen (shared/boardCards.ts): a seat in a circle, a
 * human need of the project's own, what a circle decides, and a quest. Each
 * form saves one card into one of this person's slots for the project; a
 * saved card can be changed (same slot, replaced in place) or taken back.
 *
 * Every choice is a row of tap targets (`sb-opt`, aria-pressed) or a native
 * select, and every field has a visible label, so the forms read the same on
 * a phone as on the shared screen.
 */
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
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
import type { StageProps } from "../stages";
import { myCardId } from "../week3/answers";
import { isMyCard, nextSlot } from "./game";

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

/* ------------------------------------------------------------- pieces */

function Field({ label, children, hint }: { label: string; children: (id: string) => ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className="sb-card-field">
      <label className="sb-card-label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint ? <p className="sb-hint">{hint}</p> : null}
    </div>
  );
}

/** A row of choices, one pressed at a time. */
function Choices({ label, choices, value, onChange }: { label: string; choices: readonly Choice[]; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="sb-card-field">
      <p className="sb-card-label" id={id}>{label}</p>
      <div className="sb-opts" role="group" aria-labelledby={id}>
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

/**
 * One line of a card. A textarea that grows with its words, so a long line and
 * its example wrap on a phone instead of being cut off; Enter saves the card
 * and a pasted line break becomes a space.
 */
function Line({ id, value, onChange, max, placeholder, autoComplete = "off", autoFocus = false }: { id: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; autoComplete?: string; autoFocus?: boolean }) {
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
        e.currentTarget.form?.requestSubmit();
      }}
      enterKeyHint="done"
      maxLength={max}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
    />
  );
}

function FormFoot({ busy, ok, save, onCancel }: { busy: boolean; ok: boolean; save: string; onCancel?: () => void }) {
  return (
    <div className="sb-card-actions">
      <button type="submit" className="sb-btn sb-primary" disabled={busy || !ok}>{save}</button>
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
          {(id) => <Line id={id} value={typed} onChange={(v) => onChange(`${OWN_PREFIX}${v}`)} max={CARD_LIMITS.circleName} placeholder="Kitchen" />}
        </Field>
      ) : null}
    </>
  );
}

function NeedSelect({ label, value, onChange, needs }: { label: string; value: string; onChange: (v: string) => void; needs: readonly Choice[] }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} className="sb-field" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{CARD_COPY.pickOne}</option>
          {needs.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
      )}
    </Field>
  );
}

/* --------------------------------------------------------------- seat */

export function SeatForm({ initial, need, needs, circlesFirst, ownCircles, onSave, onCancel, focusFirst = true }: {
  /** A form opened by a tap takes focus; one that is there on arrival doesn't. */
  focusFirst?: boolean;
  initial?: SeatCard;
  need?: string;
  needs: readonly Choice[];
  circlesFirst: readonly string[];
  ownCircles: readonly string[];
  onSave: (card: SeatCard) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [circle, setCircle] = useState(initial?.circle ?? circlesFirst[0] ?? "");
  const [needKey, setNeedKey] = useState(initial?.need ?? need ?? "");
  const [aim, setAim] = useState(initial?.aim ?? "");
  const [answersFor, setAnswersFor] = useState(initial?.answersFor ?? "");
  const [heldBy, setHeldBy] = useState<HeldBy>(initial?.heldBy ?? "open");
  const [who, setWho] = useState(initial?.who ?? "");
  const [contribution, setContribution] = useState(initial?.contribution ?? "");
  const [busy, setBusy] = useState(false);
  const card = cleanCard("seat", { name, circle, need: needKey, aim, answersFor, heldBy, who, contribution });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!card || busy) return;
    setBusy(true);
    try {
      if (await onSave(card)) onCancel?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate>
      <Field label={CARD_COPY.seat.name}>
        {(id) => <Line id={id} value={name} onChange={setName} max={CARD_LIMITS.name} placeholder={CARD_COPY.seat.namePlaceholder} autoFocus={focusFirst} />}
      </Field>
      <CircleSelect value={circle} onChange={setCircle} first={circlesFirst} ownCircles={ownCircles} />
      <NeedSelect label={CARD_COPY.seat.need} value={needKey} onChange={setNeedKey} needs={needs} />
      <Field label={CARD_COPY.seat.aim}>
        {(id) => <Line id={id} value={aim} onChange={setAim} max={CARD_LIMITS.aim} placeholder={CARD_COPY.seat.aimPlaceholder} />}
      </Field>
      <Field label={CARD_COPY.seat.answersFor}>
        {(id) => <Line id={id} value={answersFor} onChange={setAnswersFor} max={CARD_LIMITS.answersFor} placeholder={CARD_COPY.seat.answersForPlaceholder} />}
      </Field>
      <Choices label={CARD_COPY.seat.heldBy} choices={HELD_BY} value={heldBy} onChange={(v) => setHeldBy(v as HeldBy)} />
      {heldBy === "team" ? (
        <Field label={CARD_COPY.seat.whoTeam} hint={CARD_COPY.seat.whoHint}>
          {(id) => <Line id={id} value={who} onChange={setWho} max={CARD_LIMITS.who} placeholder="Ana" autoComplete="name" />}
        </Field>
      ) : heldBy === "being" ? (
        <Field label={CARD_COPY.seat.whoBeing}>
          {(id) => <Line id={id} value={who} onChange={setWho} max={CARD_LIMITS.who} placeholder={CARD_COPY.seat.whoBeingPlaceholder} />}
        </Field>
      ) : (
        <p className="sb-hint">{CARD_COPY.seat.open}</p>
      )}
      <Field label={CARD_COPY.seat.contribution} hint={CARD_COPY.seat.contributionHint}>
        {(id) => <Line id={id} value={contribution} onChange={setContribution} max={CARD_LIMITS.contribution} placeholder={CARD_COPY.seat.contributionPlaceholder} />}
      </Field>
      {!card && (name || aim) ? <p className="sb-hint">{CARD_COPY.bad.seat}</p> : null}
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.seat.save} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------------------------------ own human need */

const RUNG_CHOICES: Choice[] = NEED_RUNGS.map((r) => ({ key: r.key, label: r.label }));
const BREADTH_CHOICES: Choice[] = BREADTH_STOPS.map((b) => ({ key: b.key, label: b.label }));

export function OwnNeedForm({ initial, onSave, onCancel, focusFirst = true }: { initial?: Partial<OwnNeedCard>; onSave: (card: OwnNeedCard) => Promise<boolean>; onCancel?: () => void; focusFirst?: boolean }) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [breadth, setBreadth] = useState(initial?.breadth ?? "100");
  const [busy, setBusy] = useState(false);
  const card = cleanCard("own", { label, goal, breadth });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!card || busy) return;
    setBusy(true);
    try {
      if (await onSave(card)) onCancel?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate>
      <Field label={CARD_COPY.own.label}>
        {(id) => <Line id={id} value={label} onChange={setLabel} max={CARD_LIMITS.label} placeholder={CARD_COPY.own.labelPlaceholder} autoFocus={focusFirst} />}
      </Field>
      <Choices label={CARD_COPY.own.goal} choices={RUNG_CHOICES} value={goal} onChange={setGoal} />
      <Choices label={CARD_COPY.own.breadth} choices={BREADTH_CHOICES} value={breadth} onChange={setBreadth} />
      {!card && label.trim() && goal ? <p className="sb-hint">{CARD_COPY.bad.own}</p> : null}
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.own.save} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------------------------------ what a circle decides */

export function DecideForm({ circle: fixed, initial, onSave, onCancel, circlesFirst, ownCircles, focusFirst = true }: {
  focusFirst?: boolean;
  circle?: string;
  initial?: DecideCard;
  circlesFirst: readonly string[];
  ownCircles: readonly string[];
  onSave: (card: DecideCard) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [circle, setCircle] = useState(initial?.circle ?? fixed ?? circlesFirst[0] ?? "");
  const [decidesOn, setDecidesOn] = useState(initial?.decidesOn ?? "");
  const [how, setHow] = useState<DecidesBy | "">(initial?.how ?? "");
  const [busy, setBusy] = useState(false);
  const card = cleanCard("decide", { circle, decidesOn, how: how || undefined });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!card || busy) return;
    setBusy(true);
    try {
      if (await onSave(card)) {
        setDecidesOn("");
        onCancel?.();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate>
      {fixed ? null : <CircleSelect value={circle} onChange={setCircle} first={circlesFirst} ownCircles={ownCircles} />}
      <Field label={fixed ? `What ${circleLabel(fixed)} decides on` : CARD_COPY.decide.decidesOn}>
        {(id) => <Line id={id} value={decidesOn} onChange={setDecidesOn} max={CARD_LIMITS.decidesOn} placeholder={CARD_COPY.decide.decidesOnPlaceholder} autoFocus={focusFirst} />}
      </Field>
      <Choices label={CARD_COPY.decide.how} choices={DECIDES_BY} value={how} onChange={(v) => setHow(v === how ? "" : (v as DecidesBy))} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.decide.save} onCancel={onCancel} />
    </form>
  );
}

/* --------------------------------------------------------------- quest */

export function QuestForm({ initial, needs, onSave, onCancel, focusFirst = true }: {
  focusFirst?: boolean;
  initial?: QuestCard;
  needs: readonly Choice[];
  onSave: (card: QuestCard) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [quest, setQuest] = useState(initial?.quest ?? "");
  const [need, setNeed] = useState(initial?.need ?? needs[0]?.key ?? "");
  const [busy, setBusy] = useState(false);
  // The project's human needs can arrive or change after the form opened: keep the choice one of them.
  const needKeys = needs.map((n) => n.key).join("|");
  useEffect(() => {
    if (!needs.some((n) => n.key === need)) setNeed(needs[0]?.key ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needKeys]);
  const card = cleanCard("quest", { quest, need });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!card || busy) return;
    setBusy(true);
    try {
      if (await onSave(card)) {
        setQuest("");
        onCancel?.();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-panel sb-card-form" onSubmit={submit} noValidate>
      <Field label={CARD_COPY.quest.quest}>
        {(id) => <Line id={id} value={quest} onChange={setQuest} max={CARD_LIMITS.quest} placeholder={CARD_COPY.quest.questPlaceholder} autoFocus={focusFirst} />}
      </Field>
      <NeedSelect label={CARD_COPY.quest.need} value={need} onChange={setNeed} needs={needs} />
      <FormFoot busy={busy} ok={!!card} save={CARD_COPY.quest.save} onCancel={onCancel} />
    </form>
  );
}

/* --------------------------------------------------------- a saved card */

/** One saved card: its line, and Change / Take back for its writer (and Take back for a facilitator). */
export function CardItem<K extends CardKind>({ props, kind, entry, own, edit }: {
  props: StageProps;
  kind: K;
  entry: CardEntry<K>;
  own: ReadonlyMap<string, string>;
  /** The form to change it with, given a close callback. Writers only. */
  edit?: (close: () => void) => ReactNode;
}) {
  const { mine, facilitator, actions, canWrite } = props;
  const [editing, setEditing] = useState(false);
  const yours = isMyCard(mine, entry.rowId);
  if (editing && edit) return <li className="sb-card-item">{edit(() => setEditing(false))}</li>;
  const c = entry.card as CardOf<CardKind>;
  const title = kind === "seat" ? (c as SeatCard).name : kind === "own" ? (c as OwnNeedCard).label : kind === "decide" ? circleLabel((c as DecideCard).circle) : (c as QuestCard).quest;
  const hue = kind === "seat" ? humanNeedById((c as SeatCard).need)?.hue : kind === "quest" ? humanNeedById((c as QuestCard).need)?.hue : undefined;
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
            {yours && edit ? <button type="button" className="sb-btn sb-small" onClick={() => setEditing(true)}>{kind === "seat" ? CARD_COPY.seat.edit : "Change"}</button> : null}
            <button type="button" className="sb-btn sb-small sb-ghost" aria-label={`${CARD_COPY.remove}: ${title}`} onClick={() => void actions.removeItem(entry.rowId)}>{CARD_COPY.remove}</button>
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
