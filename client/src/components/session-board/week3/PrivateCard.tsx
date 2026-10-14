/**
 * "Just for you. Right now, about my project, I feel ___ because I need ___."
 *
 * Rye, 2026-10-13: this card never leaves the person's screen. Its words live
 * in this component's state and this page's memory (./drafts, so the room
 * moving on doesn't wipe them) and nowhere else: no tRPC call, no localStorage
 * or sessionStorage, nothing in the URL. The field sits outside any form, has
 * no name and sets autoComplete="off", so the browser's form history keeps
 * nothing either. The dictation mic is allowed (Rye's call): DictationButton
 * uses the browser's own speech service and posts nothing to our server, so
 * the hint stays true. week3.test.tsx checks that typing and tapping words
 * makes no request and no storage write.
 */
import { useId, useRef, useState } from "react";
import type { BoardPrompt } from "@shared/sessionBoard";
import { BoardMic, NEW_TAB } from "./parts";
import { readDraft, writeDraft } from "./drafts";

/** Tap a word in: after "need" it follows with a space, otherwise with a comma. */
export function addFeelWord(text: string, word: string): string {
  const t = text.replace(/\s+$/, "");
  if (!t) return word;
  const w = word.toLowerCase();
  if (/\bneed$/i.test(t) || /[.,;:]$/.test(t)) return `${t} ${w}`;
  return `${t}, ${w}`;
}

export function PrivateCard({ p }: { p: Pick<BoardPrompt, "title" | "hint" | "placeholder" | "followup" | "words" | "link"> & { key?: string } }) {
  const draftKey = `private:${p.key ?? p.title}`;
  const [text, setTextState] = useState(() => readDraft(draftKey) ?? "");
  const setText = (next: string | ((t: string) => string)) => {
    setTextState((t) => {
      const v = typeof next === "function" ? next(t) : next;
      writeDraft(draftKey, v);
      return v;
    });
  };
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const headId = useId();
  const hintId = useId();
  return (
    <section className="sb-prompt sb-private" aria-labelledby={headId}>
      <h3 id={headId} className="sb-q-t">{p.title}</h3>
      {p.hint ? <p id={hintId} className="sb-private-hint">{p.hint}</p> : null}
      <div className="sb-dictate">
        <textarea
          ref={fieldRef}
          className="sb-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={p.placeholder}
          aria-labelledby={headId}
          aria-describedby={p.hint ? hintId : undefined}
          autoComplete="off"
          rows={3}
        />
        <BoardMic label="Speak into your private card" value={text} onChange={setText} targetRef={fieldRef} />
      </div>
      {p.words?.length ? (
        <div className="sb-feel-words" role="group" aria-label="Words to tap in">
          {p.words.map((w) => (
            <button key={w} type="button" className="sb-word" onClick={() => { setText((t) => addFeelWord(t, w)); fieldRef.current?.focus(); }}>{w}</button>
          ))}
        </div>
      ) : null}
      {text.trim() && p.followup ? <p className="sb-hint">{p.followup}</p> : null}
      {p.link ? (
        <a className="sb-link sb-prompt-link" href={p.link.href} target="_blank" rel="noopener noreferrer">{p.link.label}{NEW_TAB}</a>
      ) : null}
    </section>
  );
}
