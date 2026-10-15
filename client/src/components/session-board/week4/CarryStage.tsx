/**
 * Week 4, stage 4, "Your Week 3 card": what the project said last week,
 * brought forward (shared/boardCarry.ts), what's still missing and where
 * today answers it, last week's move and the questions still open.
 *
 * A card found only by its name carries nothing until a facilitator says it
 * is the same project; the facilitator answers that here, for every card
 * waiting, without tapping each one.
 */
import { useState, type ReactNode } from "react";
import { CARRY_COPY, mergeCarried, type CardCarry, type CarryData } from "@shared/boardCarry";
import { fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import { projectCardLines, projectView, type AnswerRow } from "@shared/humanNeeds";
import { cardGaps } from "@shared/villageOsCard";
import type { StageProps } from "../stages";
import { cardName, myCardId, newestFirst, stageIndexOf } from "../week3/answers";
import { StageHead } from "../week3/parts";
import { AskFoot, ProjectFor, PromptBlock, StageExtras } from "../week3/PromptBlock";
import { useMyGame } from "./game";

/** The head, the project chip and the foot every Week 4 needs stage shares. */
export function Week4Frame({ props, children }: { props: StageProps; children: ReactNode }) {
  const { week, stages, index } = props;
  const stage = stages[index];
  return (
    <>
      <StageHead stages={stages} index={index} title={stage.name} lede={stage.lede} week={week}>
        <ProjectFor props={props} />
      </StageHead>
      <StageExtras stage={stage} part="top" />
      {children}
      <StageExtras stage={stage} part="foot" />
      <AskFoot props={props} />
    </>
  );
}

/** A Week 4 stage while last week's answers load, or after they failed to. */
export function CarryWait(props: StageProps) {
  const { carry } = props;
  return (
    <Week4Frame props={props}>
      {carry.failed ? (
        <div className="sb-panel sb-noseeds" role="alert">
          <p>{CARRY_COPY.loadFailed}</p>
          <button type="button" className="sb-btn" onClick={carry.retry}>{CARRY_COPY.retry}</button>
        </div>
      ) : (
        <p className="sb-empty" role="status">{CARRY_COPY.loading}</p>
      )}
    </Week4Frame>
  );
}

/** "From Week 3, linked by your application." and the rest, for one card's carry. */
export function sourceLine(link: CardCarry | null, fromWeek: number): string {
  if (!link) return fillCopy(CARRY_COPY.none, { week: fromWeek });
  const week = link.from[0]?.week ?? link.suggested[0]?.week ?? fromWeek;
  switch (link.match) {
    case "application":
    case "carried":
    case "yours":
    case "confirmed":
      return fillCopy(CARRY_COPY.found[link.match], { week });
    case "suggested":
      return fillCopy(CARRY_COPY.suggested, { week, name: link.suggested[0]?.name ?? "" });
    case "declined":
      return CARRY_COPY.declined;
    default:
      return fillCopy(CARRY_COPY.none, { week: fromWeek });
  }
}

/**
 * What a card said on the earlier weeks only, newest week first for each
 * key: the read straight from the earlier boards, so a key answered again
 * today still shows what was said last week.
 */
export function earlierRows(carry: CarryData | null, link: CardCarry | null, cardId: number) {
  if (!carry || !link?.from.length) return [];
  return mergeCarried([], carry.rows, cardId, new Set(link.from.map((f) => f.cardId)));
}

/**
 * The facilitator's yes or no for a card found only by its name, and, once
 * answered, the line that says so with an Undo. The buttons rest until the
 * carry read catches up, so a second tap can't land on top of the first.
 */
export function ConfirmMatch({ props, link }: { props: StageProps; link: CardCarry }) {
  const [said, setSaid] = useState<"yes" | "no" | null>(null);
  const ref = link.suggested[0] ?? link.from[0];
  if (!ref) return null;
  const name = cardName(props.board, link.cardId, "");
  if (said) {
    return (
      <div className="sb-confirm" role="status">
        <p>{said === "yes" ? fillCopy(CARRY_COPY.confirmed, { week: ref.week }) : CARRY_COPY.declinedDone}</p>
        <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => { props.actions.confirmCarry(link.cardId, null); setSaid(null); }}>{CARRY_COPY.undo}</button>
      </div>
    );
  }
  return (
    <div className="sb-confirm">
      <p>{fillCopy(CARRY_COPY.confirmAsk, { name: ref.name, week: ref.week })}{name && name !== ref.name ? ` (${name} here)` : ""}</p>
      <div className="sb-row">
        <button type="button" className="sb-btn sb-small" onClick={() => { props.actions.confirmCarry(link.cardId, ref.cardId); setSaid("yes"); }}>{CARRY_COPY.confirmYes}</button>
        <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => { props.actions.confirmCarry(link.cardId, 0); setSaid("no"); }}>{CARRY_COPY.confirmNo}</button>
      </div>
    </div>
  );
}

/** For the facilitator: every card that carries by a recorded link, with a way to undo it. */
function LinkedCards({ props }: { props: StageProps }) {
  const links = (props.carry.data?.cards ?? []).filter((c) => c.match === "carried" || c.match === "yours" || c.match === "confirmed" || c.match === "declined");
  if (!links.length) return null;
  return (
    <details className="sb-panel sb-care">
      <summary>{CARRY_COPY.linkedTitle}</summary>
      <ul className="sb-gap-list">
        {links.map((c) => {
          const name = cardName(props.board, c.cardId, "");
          const from = c.from[0];
          return (
            <li key={c.cardId} className="sb-gap">
              <span>{c.match === "declined" ? fillCopy(CARRY_COPY.linkedNone, { name }) : fillCopy(CARRY_COPY.linkedLine, { name, from: from?.name ?? "", week: from?.week ?? "" })}</span>
              <button
                type="button"
                className="sb-btn sb-small sb-ghost"
                aria-label={`${c.match === "declined" ? CARRY_COPY.linkAgain : CARRY_COPY.unlink}: ${name}`}
                onClick={() => props.actions.confirmCarry(c.cardId, c.match === "declined" ? null : 0)}
              >
                {c.match === "declined" ? CARRY_COPY.linkAgain : CARRY_COPY.unlink}
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function CarryStage(props: StageProps) {
  const { board, stages, index, week, myProject, facilitator, carry, look } = props;
  const { game } = useMyGame(props);
  const cardId = myCardId(myProject);
  const fromWeek = carry.data?.fromWeeks[0] ?? week - 1;
  const prompts = resolvedPrompts(week, index);
  const waiting = facilitator ? (carry.data?.cards ?? []).filter((c) => c.match === "suggested") : [];
  const gaps = cardId != null ? cardGaps(game.view, game.cards) : [];
  const before = cardId != null ? earlierRows(carry.data, game.link, cardId) : [];
  const lastMove = newestFirst(before.filter((r) => r.block === "move"))[0]?.text ?? null;
  const asks = carry.data?.asks ?? [];

  let card: ReactNode;
  if (carry.loading) card = <p className="sb-empty">{CARRY_COPY.loading}</p>;
  else if (carry.failed) {
    card = (
      <div className="sb-panel sb-noseeds">
        <p>{CARRY_COPY.loadFailed}</p>
        <button type="button" className="sb-btn" onClick={carry.retry}>{CARRY_COPY.retry}</button>
      </div>
    );
  } else if (cardId == null) {
    card = <p className="sb-panel">{myProject?.kind === "learn" ? CARRY_COPY.learn : CARRY_COPY.noProject}</p>;
  } else {
    // What was said last week only: today's answers show on today's stages.
    const lastWeek = projectView(before as readonly AnswerRow[], cardId);
    const lines = projectCardLines(lastWeek);
    card = (
      <section className="sb-panel sb-carried" aria-labelledby="sb-carried-h">
        <p className="sb-label">{sourceLine(game.link, fromWeek)}</p>
        <h3 id="sb-carried-h" className="sb-pcard-name">{cardName(board, cardId, "")}</h3>
        {lastWeek.answered ? (
          <ul className="sb-pcard-lines">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        ) : null}
        {lastMove ? (
          <p className="sb-carried-move"><strong>{CARRY_COPY.moveLast}:</strong> {lastMove}</p>
        ) : null}
      </section>
    );
  }

  return (
    <Week4Frame props={props}>
      {waiting.length ? (
        <section className="sb-panel sb-confirm-list" aria-label="Cards found by name">
          {waiting.map((c) => <ConfirmMatch key={c.cardId} props={props} link={c} />)}
        </section>
      ) : null}
      {facilitator ? <LinkedCards props={props} /> : null}
      {card}
      {cardId != null && !carry.loading && !carry.failed ? (
        <section className="sb-panel sb-gaps" aria-labelledby="sb-gaps-h">
          <h3 id="sb-gaps-h" className="sb-h3">{CARRY_COPY.gaps}</h3>
          {gaps.length ? (
            <ul className="sb-gap-list">
              {gaps.map((g) => {
                const at = stageIndexOf(stages, "needs", g.step);
                return (
                  <li key={g.key} className="sb-gap">
                    <span>{g.label}</span>
                    {at >= 0 ? (
                      <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => look(at)}>
                        {fillCopy(CARRY_COPY.goTo, { stage: stages[at].name })}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{CARRY_COPY.gapsNone}</p>
          )}
        </section>
      ) : null}
      <div className="sb-prompts">{prompts.map((p) => <PromptBlock key={p.key} p={p} props={props} />)}</div>
      {asks.length || carry.data ? (
        <section className="sb-room" aria-labelledby="sb-open-asks-h">
          <h3 id="sb-open-asks-h" className="sb-h3">{fillCopy(CARRY_COPY.openAsks, { week: fromWeek })}</h3>
          {asks.length ? (
            <ul className="sb-questions">
              {newestFirst(asks).map((q) => (
                <li key={q.id} className="sb-q-item">
                  <p className="sb-q-text">{q.text}</p>
                  {q.project ? <div className="sb-q-meta"><span className="sb-from">{q.project}</span></div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="sb-empty">{fillCopy(CARRY_COPY.openAsksNone, { week: fromWeek })}</p>
          )}
        </section>
      ) : null}
    </Week4Frame>
  );
}
