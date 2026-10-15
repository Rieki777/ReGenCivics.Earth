/**
 * Week 4, "Your Game, built": every project's Game, Week 3 and today
 * together, read aloud one project at a time (the next project reflects back
 * one thing it would play: Templeofroots.com asked for peer review). The
 * project this person tapped comes first, with its "Copy for Village OS";
 * every other card can be copied too, since the board is public and a
 * teammate may be the one at the keyboard.
 */
import { useMemo } from "react";
import { NEEDS_COPY, resolvedPrompts } from "@shared/sessionBoard";
import { gameLines } from "@shared/villageOsCard";
import type { StageProps } from "../stages";
import { myCardId } from "../week3/answers";
import { PromptBlock } from "../week3/PromptBlock";
import { Week4Frame, sourceLine } from "./CarryStage";
import { CopyForVillageOS } from "./CopyForVillageOS";
import { gameOf, useGameRows } from "./game";

export function BuiltStage(props: StageProps) {
  const { board, week, index, myProject, carry } = props;
  const rows = useGameRows(props);
  const mineId = myCardId(myProject);
  const prompts = resolvedPrompts(week, index);
  const fromWeek = carry.data?.fromWeeks[0] ?? week - 1;
  const cards = useMemo(() => {
    const list = board.projects
      .filter((p) => !p.hidden)
      .map((p) => {
        const link = carry.data?.cards.find((c) => c.cardId === p.id) ?? null;
        return { id: p.id, name: p.name, link, game: gameOf(rows, p.id, link) };
      })
      .filter((c) => c.game.view.answered || c.game.cards.seats.length || c.game.cards.own.length);
    if (mineId != null) list.sort((a, b) => Number(b.id === mineId) - Number(a.id === mineId));
    return list;
  }, [board.projects, carry.data, rows, mineId]);

  return (
    <Week4Frame props={props}>
      <div className="sb-prompts">{prompts.map((p) => <PromptBlock key={p.key} p={p} props={props} />)}</div>
      <section className="sb-room" aria-labelledby="sb-built-h">
        <h3 id="sb-built-h" className="sb-h3">{NEEDS_COPY.roomCards}</h3>
        {cards.length ? (
          <ul className="sb-pcards sb-built-cards">
            {cards.map((c) => (
              <li key={c.id} className={`sb-panel sb-pcard${c.id === mineId ? " sb-pcard-mine" : ""}`}>
                <h4 className="sb-pcard-name">{c.name}</h4>
                <p className="sb-label">{sourceLine(c.link, fromWeek)}</p>
                <ul className="sb-pcard-lines">
                  {gameLines(c.game.view, c.game.cards).map((line, i) => <li key={i}>{line}</li>)}
                </ul>
                <CopyForVillageOS props={props} game={{ ...c.game, cardId: c.id }} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="sb-empty">{NEEDS_COPY.noCards}</p>
        )}
      </section>
    </Week4Frame>
  );
}
