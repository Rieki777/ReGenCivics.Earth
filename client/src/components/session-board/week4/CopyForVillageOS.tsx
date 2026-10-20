/**
 * "Copy for Village OS" (Week 4 on): one project's card, Week 3 and today
 * together, in Village OS's own words (shared/villageOsCard.ts). Its `needs`
 * list is exactly the body of Village OS's needs scope write, so a founder
 * with a village pastes it on What this village is for; the rest is for
 * Village OS's paste step to offer one by one.
 *
 * The copy happens in the click (clipboard needs the user's gesture); when the
 * browser refuses, the card opens below with its text selected.
 */
import { useMemo, useRef, useState } from "react";
import { WEEK4_COPY } from "@shared/sessionBoard";
import { toVillageOsCard, villageOsCardText } from "@shared/villageOsCard";
import type { StageProps } from "../stages";
import { cardName } from "../week3/answers";
import type { Game } from "./game";

/**
 * The card's text is built only when someone opens it or taps Copy, so a room
 * of cards on "Your Game, built" costs nothing until a project wants its own.
 */
export function CopyForVillageOS({ props, game }: { props: StageProps; game: Game & { cardId: number } }) {
  const { board, week } = props;
  const name = cardName(board, game.cardId, "");
  const build = () => {
    const weeks = [week, ...new Set((game.link?.from ?? []).map((f) => f.week))];
    const project = board.projects.find((p) => p.id === game.cardId);
    return villageOsCardText(toVillageOsCard({ project: name, applicationId: project?.applicationId ?? null, weeks, view: game.view, cards: game.cards }));
  };
  const [said, setSaid] = useState("");
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const text = useMemo(() => (open ? build() : ""), [open, game, week, board.projects]);
  const preRef = useRef<HTMLPreElement | null>(null);

  const selectIt = () => {
    setOpen(true);
    setSaid(WEEK4_COPY.copyFailed);
    // Select once the card is open, so a keyboard copy takes it.
    setTimeout(() => {
      const pre = preRef.current;
      if (!pre || typeof window === "undefined") return;
      try {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        /* the text is on screen to select by hand */
      }
    }, 0);
  };

  const copy = () => {
    try {
      if (!navigator.clipboard?.writeText) {
        selectIt();
        return;
      }
      navigator.clipboard.writeText(build()).then(() => setSaid(WEEK4_COPY.copied), selectIt);
    } catch {
      selectIt();
    }
  };

  return (
    <section className="sb-panel sb-vos-copy" aria-label={`${WEEK4_COPY.copy}: ${name}`}>
      <p className="sb-hint">{WEEK4_COPY.copyHint}</p>
      <div className="sb-row">
        <button type="button" className="sb-btn sb-primary" aria-label={`${WEEK4_COPY.copy}: ${name}`} onClick={copy}>{WEEK4_COPY.copy}</button>
        <p className="sb-saved" role="status" aria-live="polite">{said}</p>
      </div>
      <details className="sb-vos-json" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{WEEK4_COPY.showCopy}</summary>
        <pre ref={preRef} tabIndex={0}>{text}</pre>
      </details>
    </section>
  );
}
