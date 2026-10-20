/**
 * One question on a Week 3 stage, drawn by its mode (shared/sessionBoard.ts
 * `BoardPrompt`): a pick, a note, a question for the wall, or the private
 * card. Plus the pieces every prompt and needs stage shares: the "For <project>
 * · Change" chip, the quote and notes, and the "Questions any time" foot line.
 *
 * Every write goes through the hook's actions (API_CONTRACT.md section 4),
 * which paint first and save behind, and show the server's sentence on a
 * refusal. Nothing here sends the private card anywhere.
 */
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import {
  BOARD_LIMITS,
  CHECKIN_COPY,
  PROMPT_COPY,
  canAskFrom,
  fillCopy,
  promptMax,
  type BoardPrompt,
  type BoardStage,
} from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { foldSpokenPunctuation } from "../spokenStage";
import {
  answerRows,
  cardName,
  isMineRow,
  myAnswerRows,
  myCardId,
  newestFirst,
  projectIdFor,
  shownRows,
  stageIndexOf,
} from "./answers";
import { BoardMic, NEW_TAB, QuickAdd, speakLabel } from "./parts";
import { PrivateCard } from "./PrivateCard";
import { dropDraft, readDraft, writeDraft } from "./drafts";

export type ShownPrompt = BoardPrompt & { isRef?: boolean };

/* ------------------------------------------------------------ the chip */

/**
 * "For Toa Hermitage · Change", or "Answering for the room" with a button to
 * the check-in. Both buttons move only this screen (`look`), never the room.
 */
export function ProjectFor({ props }: { props: StageProps }) {
  const { board, stages, myProject, look } = props;
  const checkin = stageIndexOf(stages, "checkin");
  const cardId = myCardId(myProject);
  if (cardId != null && myProject?.kind === "project") {
    const name = board.projects.find((p) => p.id === cardId)?.name ?? myProject.name;
    return (
      <div className="sb-for">
        <span className="sb-for-chip">{fillCopy(PROMPT_COPY.forProject, { name })}</span>
        {checkin >= 0 ? (
          <button type="button" className="sb-btn sb-small sb-ghost" aria-label={`${PROMPT_COPY.change} project`} onClick={() => look(checkin)}>{PROMPT_COPY.change}</button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="sb-for sb-for-room">
      {myProject?.kind === "learn" ? <span className="sb-for-chip">{CHECKIN_COPY.learnChip}</span> : null}
      <p className="sb-for-text">{PROMPT_COPY.forRoom}</p>
      {checkin >= 0 ? (
        <button type="button" className="sb-btn sb-small" onClick={() => look(checkin)}>{PROMPT_COPY.tapProject}</button>
      ) : null}
    </div>
  );
}

/** The chip belongs on a stage that asks anything for a project. */
export function asksForProject(prompts: readonly ShownPrompt[]): boolean {
  return prompts.some((p) => p.scope === "project" && !p.anonymous && p.mode !== "private");
}

/**
 * A stage's quote panel and plain lines. With a quote, the lines sit under it
 * as a bridge (`part="top"`); without one, they are a footer under the
 * questions (`part="foot"`).
 */
export function StageExtras({ stage, part }: { stage: BoardStage; part: "top" | "foot" }) {
  const notes = stage.notes ?? [];
  if (part === "top") {
    if (!stage.quote) return null;
    return (
      <>
        <blockquote className="sb-quote"><p>{stage.quote}</p></blockquote>
        {notes.map((n) => <p key={n} className="sb-stage-note">{n}</p>)}
      </>
    );
  }
  if (stage.quote || !notes.length) return null;
  return <>{notes.map((n) => <p key={n} className="sb-stage-note">{n}</p>)}</>;
}

/* ----------------------------------------------------- questions any time */

/** "Questions any time": a question for the wall from any prompt or needs stage. */
export function AskFoot({ props }: { props: StageProps }) {
  const { week, index, canWrite, actions, myProject } = props;
  if (!canWrite || !canAskFrom(week, index)) return null;
  const projectId = myCardId(myProject);
  return (
    <div className="sb-ask-foot">
      <p className="sb-hint">{PROMPT_COPY.askFoot}</p>
      <QuickAdd
        placeholder={PROMPT_COPY.askPlaceholder}
        max={BOARD_LIMITS.note}
        label="Add a question for the wall"
        button
        onAdd={(text) => actions.ask({ text, stageIndex: index, projectId })}
      />
    </div>
  );
}

/** Every question from the session, with its project's name. Facilitators mark each Answered. */
export function QuestionWall({ props, unansweredFirst = false }: { props: StageProps; unansweredFirst?: boolean }) {
  const { board, facilitator, mine, actions } = props;
  let asks = newestFirst(board.items.filter((i) => i.kind === "ask"));
  if (unansweredFirst) asks = [...asks.filter((q) => !q.chosen), ...asks.filter((q) => q.chosen)];
  if (!asks.length) return <p className="sb-empty">Questions show up here as people ask them.</p>;
  /** Take a question back; focus moves to the one beside it, or to what's left in its section, never to the page. */
  const takeBackQuestion = (button: HTMLElement, id: number) => {
    const li = button.closest("li");
    const section = button.closest("section");
    const next = li?.nextElementSibling?.querySelector<HTMLElement>("button") ?? li?.previousElementSibling?.querySelector<HTMLElement>("button") ?? null;
    void actions.removeItem(id);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        // The last question gone can take its whole section with it: then the box for a new question.
        const inSection = section?.isConnected ? section.querySelector<HTMLElement>("textarea, input, button, h3[tabindex]") : null;
        const to = next?.isConnected ? next : inSection ?? document.querySelector<HTMLElement>(".sb-ask-foot textarea, .sb-ask-foot input");
        to?.focus();
      });
    }
  };
  return (
    <ul className="sb-questions">
      {asks.map((q) => {
        const removable = facilitator || isMineRow(mine, q.id);
        return (
          <li key={q.id} className={`sb-q-item${q.chosen ? " sb-answered" : ""}${q.hidden ? " sb-r-hidden" : ""}`}>
            <p className="sb-q-text">{q.text}</p>
            <div className="sb-q-meta">
              <span className="sb-from">{cardName(board, q.projectId, PROMPT_COPY.fromRoom)}</span>
              <span className="sb-row">
                {facilitator ? (
                  <button type="button" className="sb-toggle" aria-pressed={q.chosen} disabled={q.id < 0} onClick={() => actions.curateItem({ itemId: q.id, chosen: !q.chosen })}>
                    {q.chosen ? PROMPT_COPY.answered : PROMPT_COPY.markAnswered}
                  </button>
                ) : q.chosen ? <span className="sb-badge">{PROMPT_COPY.answered}</span> : null}
                {removable ? (
                  <button type="button" className="sb-x" aria-label={`Take back "${q.text}"`} onClick={(ev) => takeBackQuestion(ev.currentTarget, q.id)}>×</button>
                ) : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AskBlock({ p, props }: { p: ShownPrompt; props: StageProps }) {
  const { canWrite, actions, index, myProject } = props;
  const headId = useId();
  const projectId = projectIdFor(p, myProject);
  return (
    <section className="sb-prompt" aria-labelledby={headId}>
      <h3 id={headId} className="sb-q-t">{p.title}</h3>
      {p.hint ? <p className="sb-hint">{p.hint}</p> : null}
      {canWrite ? (
        <QuickAdd
          placeholder={p.placeholder ?? PROMPT_COPY.askPlaceholder}
          max={BOARD_LIMITS.note}
          label="Add a question for the wall"
          button
          onAdd={(text) => actions.ask({ text, stageIndex: index, projectId })}
        />
      ) : null}
      <QuestionWall props={props} unansweredFirst={!!p.isRef} />
    </section>
  );
}

/* ------------------------------------------------------------------ picks */

/**
 * Tap a choice. One-answer prompts replace your pick; many-answer prompts take
 * up to `max`. Counts beside a choice are how many people (on this card, or
 * the room for an anonymous prompt) picked it, never who.
 */
export function PickBlock({ p, props, compact = false, after, title, onPick }: {
  p: ShownPrompt;
  props: StageProps;
  compact?: boolean;
  /** Drawn under the choices with this person's picks (the rung's meaning, say). */
  after?: (picked: string[]) => ReactNode;
  /** A shorter heading than the prompt's own, for a row inside a card. */
  title?: string;
  /** Week 4 on: a tap that first copies last week's answer across (../week4/game.ts). */
  onPick?: (option: string, on: boolean) => void;
}) {
  const { board, mine, actions, canWrite, myProject } = props;
  const headId = useId();
  const [tip, setTip] = useState<string | null>(null);
  const projectId = projectIdFor(p, myProject);
  const options = p.options ?? [];
  const max = promptMax(p);
  const anonymous = !!p.anonymous;
  const anonPick = anonymous ? mine.anon.get(p.key) ?? null : null;
  const picked = anonymous ? (anonPick ? [anonPick] : []) : myAnswerRows(board.items, mine, p.key, projectId).map((r) => r.text);
  const counts: Record<string, number> = {};
  if (anonymous) Object.assign(counts, board.answerCounts?.[p.key] ?? {});
  else for (const r of answerRows(shownRows(board), p.key, projectId)) counts[r.text] = (counts[r.text] ?? 0) + 1;
  const tipText = options.find((o) => o.key === tip)?.tip;
  return (
    <section className={`sb-prompt${compact ? " sb-compact" : ""}`}>
      <div className="sb-prompt-head">
        <h3 id={headId} className="sb-q-t">{title ?? p.title}</h3>
        {max > 1 && max < options.length ? <span className="sb-count">{picked.length} of {max}</span> : null}
      </div>
      {p.hint ? <p className="sb-hint">{p.hint}</p> : null}
      <div className="sb-opts" role="group" aria-labelledby={headId}>
        {options.map((o) => {
          const on = picked.includes(o.key);
          const n = counts[o.key] ?? 0;
          return (
            <button
              key={o.key}
              type="button"
              className="sb-opt"
              aria-pressed={on}
              disabled={!canWrite}
              onClick={() => {
                setTip(o.tip ? o.key : null);
                if (onPick) onPick(o.key, !on);
                else void actions.answerPick({ key: p.key, option: o.key, on: !on, projectId });
              }}
            >
              <span className="sb-opt-t">{o.label}</span>
              {o.small ? <small className="sb-opt-small">{o.small}</small> : null}
              {n > 0 ? <span className="sb-opt-n">{n}<span className="sr-only"> picked this</span></span> : null}
            </button>
          );
        })}
      </div>
      {tipText ? <p className="sb-tip">{tipText}</p> : null}
      {anonymous ? <p className="sb-hint">{PROMPT_COPY.countsOnly}</p> : null}
      {after ? after(picked) : null}
      <PromptLink p={p} />
    </section>
  );
}

/* ------------------------------------------------------------------ notes */

function PromptLink({ p }: { p: ShownPrompt }) {
  if (!p.link) return null;
  return <a className="sb-link sb-prompt-link" href={p.link.href} target="_blank" rel="noopener noreferrer">{p.link.label}{NEW_TAB}</a>;
}

/** A one-line answer you can change: your line (or, on a stage that brings it back, your project's) fills it. */
function NoteOne({ current, label, placeholder, disabled, onSave, draftKey }: {
  current: string;
  label: string;
  placeholder?: string;
  disabled: boolean;
  onSave: (text: string) => Promise<unknown>;
  /** Unsaved words survive the stage unmounting (page memory only, ./drafts). */
  draftKey: string;
}) {
  const [draft, setDraft] = useState(() => readDraft(draftKey) ?? current);
  const [dirty, setDirty] = useState(() => readDraft(draftKey) != null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(current);
  }, [current, dirty]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = foldSpokenPunctuation(draft);
    if (!v || busy) return;
    setBusy(true);
    try {
      const r = await onSave(v);
      if (r != null) {
        setDirty(false);
        setSaved(true);
        dropDraft(draftKey);
      }
    } finally {
      setBusy(false);
    }
  };
  const change = (v: string) => {
    setDraft(v);
    setDirty(true);
    setSaved(false);
    writeDraft(draftKey, v);
  };
  const unchanged = draft.trim() === current.trim();
  return (
    <>
      <form className="sb-add sb-note-one" onSubmit={submit}>
        {/* A textarea so a long line and its example wrap on a phone instead of
            running off the edge ("A planting festival in place of the v").
            Still one line: Enter saves, and a pasted line break becomes a space. */}
        <textarea
          className="sb-field"
          rows={1}
          value={draft}
          onChange={(e) => change(e.target.value.replace(/[\r\n]+/g, " "))}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          enterKeyHint="done"
          placeholder={placeholder}
          maxLength={BOARD_LIMITS.note}
          aria-label={label}
          autoComplete="off"
          disabled={disabled}
        />
        <BoardMic label={speakLabel(label)} value={draft} onChange={change} disabled={disabled || busy} />
        <button className="sb-btn" type="submit" disabled={disabled || busy || !draft.trim() || unchanged}>Save</button>
      </form>
      {saved && !dirty ? <p className="sb-saved" role="status">{PROMPT_COPY.saved}</p> : null}
    </>
  );
}

function NoteBlock({ p, props, onNote, after }: {
  p: ShownPrompt;
  props: StageProps;
  /** Week 4 on: a save that first copies last week's lines across. */
  onNote?: (text: string) => Promise<unknown>;
  /** Drawn under the field (last week's lines, say). */
  after?: ReactNode;
}) {
  const { board, mine, actions, canWrite, facilitator, myProject } = props;
  const headId = useId();
  const projectId = projectIdFor(p, myProject);
  const max = promptMax(p);
  const shown = shownRows(board);
  const myRows = newestFirst(myAnswerRows(board.items, mine, p.key, projectId));
  // A stage that brings a line back ("Polish your first line") fills the
  // field with the project's latest line when this person hasn't written one.
  const current = myRows[0]?.text ?? (p.isRef ? newestFirst(answerRows(shown, p.key, projectId))[0]?.text ?? "" : "");
  const wall = newestFirst(shown.filter((i) => i.kind === "answer" && i.block === p.key));
  const save = (text: string) => (onNote ? onNote(text) : actions.answerNote({ key: p.key, text, projectId }));
  /** Take a line back, then put focus on the line beside it, or the field, so it never drops to the page. */
  const takeBack = (button: HTMLElement, id: number) => {
    const li = button.closest("li");
    const section = button.closest("section");
    const next = li?.nextElementSibling?.querySelector<HTMLElement>("button") ?? li?.previousElementSibling?.querySelector<HTMLElement>("button") ?? null;
    void actions.removeItem(id);
    // The line leaves the screen at once (the write paints first), so focus moves then.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => (next?.isConnected ? next : section?.querySelector<HTMLElement>("textarea, input, button"))?.focus());
    }
  };
  return (
    <section className="sb-prompt" aria-labelledby={headId}>
      <div className="sb-prompt-head">
        <h3 id={headId} className="sb-q-t">{p.title}</h3>
        {max > 1 ? <span className="sb-count">{myRows.length} of {max}</span> : null}
      </div>
      {p.hint ? <p className="sb-hint">{p.hint}</p> : null}
      {canWrite ? (
        max === 1
          ? <NoteOne current={current} label={p.title} placeholder={p.placeholder} disabled={!canWrite} onSave={save} draftKey={`note:${p.key}:${projectId ?? "room"}`} />
          : <QuickAdd placeholder={p.placeholder ?? "Type and press Enter"} max={BOARD_LIMITS.note} label={p.title} button onAdd={save} />
      ) : null}
      <PromptLink p={p} />
      {after}
      {wall.length ? (
        <ul className="sb-wall">
          {wall.map((r) => {
            const removable = facilitator || isMineRow(mine, r.id);
            return (
              <li key={r.id} className="sb-wall-item">
                <span className="sb-wall-t">{r.text}</span>
                {p.scope === "project" ? <span className="sb-from">{cardName(board, r.projectId, PROMPT_COPY.fromRoom)}</span> : null}
                {removable ? (
                  <button type="button" className="sb-x" aria-label={`Take back "${r.text}"`} onClick={(ev) => takeBack(ev.currentTarget, r.id)}>×</button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- dispatch */

export function PromptBlock({ p, props, onNote, noteAfter }: {
  p: ShownPrompt;
  props: StageProps;
  onNote?: (text: string) => Promise<unknown>;
  noteAfter?: ReactNode;
}) {
  switch (p.mode) {
    case "private":
      return <PrivateCard p={p} />;
    case "ask":
      return <AskBlock p={p} props={props} />;
    case "pick":
      return <PickBlock p={p} props={props} />;
    default:
      return <NoteBlock p={p} props={props} onNote={onNote} after={noteAfter} />;
  }
}
