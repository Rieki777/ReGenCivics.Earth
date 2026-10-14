/**
 * Pieces every stage of a live session board shares (ADR-68): the stage
 * header and its slide links, the mic, the one-line add, the chips. They live
 * here so stages.tsx and the Week 3 stages beside this file can both import
 * them without importing each other (stages.tsx re-exports the Week 3 stages).
 */
import { Fragment, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { PROMPT_COPY, fillCopy, stageSlides, type BoardStage } from "@shared/sessionBoard";
import { DictationButton, dictationSupported } from "@/components/admin/dictation";
import type { BoardActions, BoardItem, Mine } from "../useSessionBoard";
import { foldSpokenPunctuation } from "../spokenStage";

export const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * "On screen: slide 6 · slide 7 · slide 12", then "If there's time:" and
 * "Go deeper:". Each slide opens the week's deck in a new tab. A slide whose
 * page id is still a placeholder (the clean deck's new slides 1 and 2, until
 * their ids land in WEEK3_DECK) shows its number with no link.
 */
/**
 * The stage's slides as pictures on the page (Rye, 2026-10-14: built right
 * in, so nobody waits on the deck), each opening that slide in the deck; then
 * the slides' videos as direct links; then any pictures the stage carries.
 * Pictures load lazily, so a phone fetches only the stage it is on.
 */
function SlideMedia({ week, stage }: { week: number; stage: BoardStage }) {
  const shown = stageSlides(week, stage).filter((s) => !s.deeper && s.img);
  const videos = (stage.videos ?? []).filter((v) => v.href);
  const pictures = stage.pictures ?? [];
  if (!shown.length && !videos.length && !pictures.length) return null;
  return (
    <div className="sb-media">
      {shown.length ? (
        <ul className="sb-slide-strip" aria-label={PROMPT_COPY.onScreen.replace(":", "")}>
          {shown.map((s) => {
            const alt = fillCopy(PROMPT_COPY.slideAlt, { n: s.n });
            const img = <img src={s.img!} alt={alt} loading="lazy" decoding="async" width={960} height={540} />;
            return (
              <li key={s.n} className={s.also ? "sb-slide-thumb sb-slide-also" : "sb-slide-thumb"}>
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={fillCopy(PROMPT_COPY.openSlide, { n: s.n })}>{img}</a>
                ) : img}
                <span className="sb-slide-num" aria-hidden="true">{s.n}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {videos.length ? (
        <div className="sb-videos">
          <span className="sb-slides-label">{PROMPT_COPY.videos}</span>
          <ul>
            {videos.map((v) => (
              <li key={v.href + v.label}>
                <a className="sb-link sb-video-link" href={v.href} target="_blank" rel="noopener noreferrer">{v.label}{NEW_TAB}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pictures.map((p) => (
        <figure key={p.src + p.caption} className="sb-picture">
          <img src={p.src} alt={p.alt} loading="lazy" decoding="async" width={960} height={540} />
          <figcaption>{p.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function SlideLine({ week, stage }: { week: number; stage: BoardStage }) {
  const slides = stageSlides(week, stage);
  if (!slides.length) return <SlideMedia week={week} stage={stage} />;
  const groups = [
    { key: "on", label: PROMPT_COPY.onScreen, list: slides.filter((s) => !s.also && !s.deeper) },
    { key: "also", label: PROMPT_COPY.also, list: slides.filter((s) => s.also && !s.deeper) },
    { key: "deeper", label: PROMPT_COPY.deeper, list: slides.filter((s) => s.deeper) },
  ].filter((g) => g.list.length > 0);
  return (
    <>
    <SlideMedia week={week} stage={stage} />
    <p className="sb-slides">
      {groups.map((g) => (
        <span key={g.key} className="sb-slides-group">
          <span className="sb-slides-label">{g.label}</span>
          {g.list.map((s, i) => {
            const words = fillCopy(PROMPT_COPY.slide, { n: s.n });
            return (
              <Fragment key={s.n}>
                {i > 0 ? <span className="sb-slides-dot" aria-hidden="true">·</span> : null}
                {s.href ? (
                  <a className="sb-link sb-slide-link" href={s.href} target="_blank" rel="noopener noreferrer">{words}{NEW_TAB}</a>
                ) : (
                  <span className="sb-slide-plain">{words}</span>
                )}
              </Fragment>
            );
          })}
        </span>
      ))}
    </p>
    </>
  );
}

export function StageHead({ stages, index, title, lede, week, children }: {
  stages: BoardStage[];
  index: number;
  title: string;
  lede?: ReactNode;
  /** When given, the stage's slides show under the lede. */
  week?: number;
  children?: ReactNode;
}) {
  return (
    <header className="sb-head">
      <p className="sb-kicker">Stage {index + 1} of {stages.length} · {stages[index].min} min</p>
      <h1 className="sb-title">{title}</h1>
      {lede ? <p className="sb-lede">{lede}</p> : null}
      {week != null ? <SlideLine week={week} stage={stages[index]} /> : null}
      {children}
    </header>
  );
}

export function speakLabel(label: string): string {
  return label.startsWith("Add ") ? `Speak ${label.slice(4)}` : `Speak into ${label}`;
}

/** The shared admin mic, hidden when this browser cannot listen. */
export function BoardMic({
  value,
  onChange,
  targetRef,
  label,
  disabled,
  onListeningChange,
}: {
  value: string;
  onChange: (next: string) => void;
  targetRef?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  label: string;
  disabled?: boolean;
  onListeningChange?: (listening: boolean) => void;
}) {
  if (!dictationSupported()) return null;
  return (
    <DictationButton
      className="sb-mic"
      errorAlign="end"
      label={label}
      value={value}
      onChange={onChange}
      targetRef={targetRef}
      disabled={disabled}
      onListeningChange={onListeningChange}
    />
  );
}

/** One input that adds a note on Enter, or when the mic is turned off. */
export function QuickAdd({ placeholder, max, label, onAdd, button = false, buttonLabel = "Add" }: {
  placeholder: string;
  max: number;
  label: string;
  onAdd: (text: string) => Promise<unknown> | void;
  button?: boolean;
  buttonLabel?: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const commit = async (raw: string) => {
    const v = foldSpokenPunctuation(raw);
    if (!v || busy) return;
    setBusy(true);
    try {
      const r = await onAdd(v);
      if (r != null) setText("");
    } catch {
      /* Leave the words in the field when the add fails. */
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void commit(text);
  };
  return (
    <form className="sb-add" onSubmit={submit}>
      <input ref={fieldRef} className="sb-field" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={max} aria-label={label} autoComplete="off" />
      <BoardMic
        label={speakLabel(label)}
        value={text}
        targetRef={fieldRef}
        disabled={busy}
        onChange={setText}
        onListeningChange={(on) => {
          if (!on && textRef.current.trim()) void commit(textRef.current);
        }}
      />
      {button ? <button className="sb-btn" type="submit" disabled={busy}>{buttonLabel}</button> : null}
    </form>
  );
}

/** Notes as chips, with take-back for the writer and the facilitator. */
export function Chips({ items, mine, facilitator, actions, className = "sb-chips" }: { items: BoardItem[]; mine: Mine; facilitator: boolean; actions: BoardActions; className?: string }) {
  return (
    <ul className={className}>
      {items.map((i) => {
        const removable = facilitator || mine.itemIds.has(i.id);
        return (
          <li key={i.id} className={`sb-chip${removable ? " sb-has-x" : ""}${i.hidden ? " sb-r-hidden" : ""}`}>
            <span className="sb-chip-t">{i.text}</span>
            {removable ? (
              <button type="button" className="sb-x" aria-label={`Take back "${i.text}"`} onClick={() => void actions.removeItem(i.id)}>×</button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** A one-line field with the mic beside it. */
export function SpokenLine({ value, onChange, placeholder, max, label, autoComplete = "off" }: {
  value: string; onChange: (v: string) => void; placeholder: string; max: number; label: string; autoComplete?: string;
}) {
  const fieldRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="sb-dictate">
      <input ref={fieldRef} className="sb-field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} aria-label={label} autoComplete={autoComplete} />
      <BoardMic label={speakLabel(label)} value={value} onChange={onChange} targetRef={fieldRef} />
    </div>
  );
}
