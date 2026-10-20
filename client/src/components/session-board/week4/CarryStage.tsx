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
import { CARRY_COPY, mergeCarried, type CardCarry, type CardRef, type CarryData } from "@shared/boardCarry";
import { WEEK4_COPY, fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import { projectView, type AnswerRow } from "@shared/humanNeeds";
import { cardGaps, cardLinesWithNeeds } from "@shared/villageOsCard";
import type { StageProps } from "../stages";
import { cardName, myCardId, newestFirst, shownRows, stageIndexOf } from "../week3/answers";
import { StageHead } from "../week3/parts";
import { AskFoot, ProjectFor, PromptBlock, StageExtras } from "../week3/PromptBlock";
import { useMyGame } from "./game";
import { SayRegion } from "./say";

/**
 * The head, the project chip and the foot every Week 4 needs stage shares,
 * the live region its card forms speak through (./say.tsx), and, for the
 * facilitator, the cards still waiting on a "same project?" answer, so a card
 * that arrives late is confirmed on whatever stage the room is on.
 */
export function Week4Frame({ props, children, lede }: { props: StageProps; children: ReactNode; lede?: string }) {
  const { week, stages, index, facilitator, carry } = props;
  const stage = stages[index];
  // Stage 4 lists them itself, beside the cards already linked.
  const waiting = facilitator && stage.step !== "carry" ? waitingCards(carry.data) : [];
  return (
    <SayRegion>
      <StageHead stages={stages} index={index} title={stage.name} lede={lede ?? stage.lede} week={week}>
        <ProjectFor props={props} />
      </StageHead>
      <StageExtras stage={stage} part="top" />
      {waiting.length ? <WaitingCards props={props} waiting={waiting} /> : null}
      {children}
      <StageExtras stage={stage} part="foot" />
      <AskFoot props={props} />
    </SayRegion>
  );
}

/** The cards waiting on the facilitator: found only by their name, or matching a card another one here already carries. */
function waitingCards(data: CarryData | null | undefined): CardCarry[] {
  return (data?.cards ?? []).filter((c) => c.match === "suggested" || (c.carriedBy && !c.from.length));
}

/** For the facilitator: each card found only by its name, with its yes or no. */
function WaitingCards({ props, waiting }: { props: StageProps; waiting: readonly CardCarry[] }) {
  return (
    <section className="sb-panel sb-confirm-list" aria-label={WEEK4_COPY.waitingTitle}>
      {waiting.map((c) => <ConfirmMatch key={c.cardId} props={props} link={c} />)}
    </section>
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

/**
 * A participant who chose to start a card found only by its name without
 * waiting for the facilitator: kept per card for this tab (sessionStorage),
 * so the stages stay open for them as the room moves.
 */
const freshKey = (cardId: number) => `sb-week4-fresh:${cardId}`;

export function startedFresh(cardId: number | null): boolean {
  if (cardId == null) return false;
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(freshKey(cardId)) === "1";
  } catch {
    return false;
  }
}

function startFresh(cardId: number): void {
  try {
    sessionStorage.setItem(freshKey(cardId), "1");
  } catch {
    // Storage blocked: the choice holds until the stage changes.
  }
}

/**
 * A Week 4 write stage for a card that is still only "suggested": its Week 3
 * answers aren't on it yet, and an answer given now would replace last week's
 * for that question once the facilitator says yes. So the stage waits, says
 * why, and lets a participant start without Week 3 on purpose. The
 * facilitator answers in the list above (Week4Frame), on any stage.
 */
export function CarryPending({ props, link, onFresh }: { props: StageProps; link: CardCarry; onFresh: () => void }) {
  const fromWeek = props.carry.data?.fromWeeks[0] ?? props.week - 1;
  const cardId = link.cardId;
  return (
    <Week4Frame props={props}>
      <div className="sb-panel sb-carry-pending">
        <p>{sourceLine(link, fromWeek)}</p>
        <p>{WEEK4_COPY.pending}</p>
        {props.canWrite && !props.facilitator ? (
          <button
            type="button"
            className="sb-btn"
            onClick={() => {
              startFresh(cardId);
              onFresh();
            }}
          >
            {WEEK4_COPY.startFresh}
          </button>
        ) : null}
      </div>
    </Week4Frame>
  );
}

/**
 * Whether a card has nothing from an earlier week and isn't waiting on a
 * facilitator (a name match to confirm, or a second card for a project
 * another card here already carries, to merge): a project new today.
 */
export function isFreshCard(props: Pick<StageProps, "carry">, link: CardCarry | null, cardId: number | null): boolean {
  return cardId != null && !props.carry.loading && !props.carry.failed && !!props.carry.data && !link?.from.length && link?.match !== "suggested" && !link?.carriedBy;
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
  const [said, setSaid] = useState<{ yes: CardRef } | { no: true } | null>(null);
  const name = cardName(props.board, link.cardId, "");
  // Another card here carries the only match: the two cards are one project, so the facilitator merges them.
  if (link.carriedBy && !link.suggested.length) {
    const e = link.carriedBy.earlier;
    return (
      <div className="sb-confirm">
        <p>
          <strong>{name}</strong>: {fillCopy(CARRY_COPY.carriedBy, { other: link.carriedBy.name, name: e.name, week: e.week })}
        </p>
      </div>
    );
  }
  const refs = link.suggested.length ? link.suggested : link.from;
  if (!refs.length) return null;
  if (said) {
    return (
      <div className="sb-confirm" role="status">
        <p>{"yes" in said ? fillCopy(CARRY_COPY.confirmed, { week: said.yes.week }) : CARRY_COPY.declinedDone}</p>
        <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => { props.actions.confirmCarry(link.cardId, null); setSaid(null); }}>{CARRY_COPY.undo}</button>
      </div>
    );
  }
  const yes = (ref: CardRef) => () => {
    props.actions.confirmCarry(link.cardId, ref.cardId);
    setSaid({ yes: ref });
  };
  const no = () => {
    props.actions.confirmCarry(link.cardId, 0);
    setSaid({ no: true });
  };
  // Answers given today on this card win over Week 3's for the same questions once it links: say so before the yes.
  const answeredToday = shownRows(props.board).some((r) => r.kind === "answer" && r.projectId === link.cardId && (r.block === "needs" || r.block === "top"));
  const here = name && name !== refs[0].name ? ` (${name} here)` : "";
  if (refs.length > 1) {
    // Two earlier cards share the name (a stray and the real one): the facilitator picks, each told apart by its answers.
    return (
      <div className="sb-confirm">
        <p>{fillCopy(CARRY_COPY.confirmPickAsk, { name: name || refs[0].name, week: refs[0].week })}</p>
        {answeredToday ? <p className="sb-hint">{WEEK4_COPY.confirmReplaces}</p> : null}
        <div className="sb-row">
          {refs.map((r) => (
            <button key={r.cardId} type="button" className="sb-btn sb-small" onClick={yes(r)}>
              {r.answers === 1
                ? fillCopy(CARRY_COPY.confirmPickYesOne, { name: r.name, week: r.week })
                : fillCopy(CARRY_COPY.confirmPickYes, { name: r.name, week: r.week, answers: r.answers ?? 0 })}
            </button>
          ))}
          <button type="button" className="sb-btn sb-small sb-ghost" onClick={no}>{CARRY_COPY.confirmNone}</button>
        </div>
      </div>
    );
  }
  const ref = refs[0];
  return (
    <div className="sb-confirm">
      <p>{fillCopy(CARRY_COPY.confirmAsk, { name: ref.name, week: ref.week })}{here}</p>
      {answeredToday ? <p className="sb-hint">{WEEK4_COPY.confirmReplaces}</p> : null}
      <div className="sb-row">
        <button type="button" className="sb-btn sb-small" onClick={yes(ref)}>{CARRY_COPY.confirmYes}</button>
        <button type="button" className="sb-btn sb-small sb-ghost" onClick={no}>{CARRY_COPY.confirmNo}</button>
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
  // A project with nothing from last week isn't asked about last week's move.
  const fresh = isFreshCard(props, game.link, cardId);
  const prompts = resolvedPrompts(week, index).filter((p) => !fresh || (p.key !== "moved" && p.key !== "moved-line"));
  const waiting = facilitator ? waitingCards(carry.data) : [];
  const gaps = cardId != null ? cardGaps(game.view, game.cards) : [];
  const before = cardId != null ? earlierRows(carry.data, game.link, cardId) : [];
  const lastMove = newestFirst(before.filter((r) => r.block === "move"))[0]?.text ?? null;
  // The questions Week 3 still has open; "Last week's questions" shows them all.
  const asks = (carry.data?.asks ?? []).filter((q) => !q.chosen);

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
    const lines = cardLinesWithNeeds(lastWeek, new Set(game.own.keys()));
    // A short "found" line reads as a label; the longer sentences (not found, waiting, declined) as a sentence.
    const found = !!game.link?.from.length;
    card = (
      <section className="sb-panel sb-carried" aria-labelledby="sb-carried-h">
        {found ? <p className="sb-label">{sourceLine(game.link, fromWeek)}</p> : <p>{sourceLine(game.link, fromWeek)}</p>}
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
    <Week4Frame props={props} lede={fresh ? WEEK4_COPY.carryFresh : undefined}>
      {waiting.length ? (
        <WaitingCards props={props} waiting={waiting} />
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
