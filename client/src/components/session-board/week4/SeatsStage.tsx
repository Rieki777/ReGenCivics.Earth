/**
 * Week 4, "Seats in each circle": need first (Rye, 2026-10-14). For each of
 * the project's human needs, seeds first and its own at the end, the circles
 * that meet it and the seats that do the meeting. A seat is a card with
 * Rye's six fields (shared/boardCards.ts); the head of each human need counts
 * its seats and how many are held, the same count Village OS keeps (seats
 * needed against seats filled, per need).
 *
 * Also here: "What would help most with your seats?", which tells us what
 * to build in Village OS next. And the circles and decide stages read the
 * same circle list, built by `projectCircles`.
 */
import { useState, type CSSProperties } from "react";
import { CARRY_COPY } from "@shared/boardCarry";
import { CARD_COPY, circleLabel, needKeyLabel, type CardEntry } from "@shared/boardCards";
import { CIRCLES, HUMAN_NEED_IDS, OWN_CIRCLE, humanNeedById } from "@shared/humanNeeds";
import { WEEK4_COPY, fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import { ownCircleName } from "@shared/villageOsCard";
import type { StageProps } from "../stages";
import { myCardId, stageIndexOf } from "../week3/answers";
import { plural } from "../week3/parts";
import { PromptBlock } from "../week3/PromptBlock";
import { CardItem, SeatForm, hasCardDraft, newCardDraftKey, saveCard, useFocusBack, type Choice } from "./CardForms";
import { Week4Frame } from "./CarryStage";
import { useMyGame, type Game } from "./game";

const hueStyle = (id: string): CSSProperties => ({ ["--sb-hue" as string]: humanNeedById(id)?.hue ?? "var(--sb-spring)" });

/** The project's own circles by name: named on the circles stage, or given to a seat or a decision. */
export function ownCircleNames(game: Game): string[] {
  const names: string[] = [];
  const add = (n: string) => {
    const t = n.trim();
    if (t && !names.some((x) => x.toLowerCase() === t.toLowerCase())) names.push(t);
  };
  for (const line of game.view.circlesOwn) add(ownCircleName(line));
  for (const s of game.cards.seats) if (s.card.circle.startsWith("own:")) add(s.card.circle.slice(4));
  for (const d of game.cards.decide) if (d.card.circle.startsWith("own:")) add(d.card.circle.slice(4));
  return names;
}

/** Every circle the project has named, as card values ("food", "own:Kitchen"): started with, meeting a human need, holding a seat, its own. */
export function projectCircles(game: Game): string[] {
  const out: string[] = [];
  const add = (c: string) => {
    if (c && c !== OWN_CIRCLE.key && !out.includes(c)) out.push(c);
  };
  for (const c of CIRCLES) if ((game.view.circles[c.key] ?? 0) > 0) add(c.key);
  for (const tally of Object.values(game.circlesFor)) for (const k of Object.keys(tally)) add(k);
  for (const s of game.cards.seats) add(s.card.circle);
  for (const name of ownCircleNames(game)) add(`own:${name}`);
  return out;
}

/** The project's human needs as choices for a select, in the order the stages walk them. */
export function needChoices(game: Game, also?: string): Choice[] {
  // A project that hasn't named its human needs yet still gets the ten to choose from.
  const keys = game.needOrder.length ? [...game.needOrder] : [...HUMAN_NEED_IDS];
  if (also && !keys.includes(also)) keys.push(also);
  return keys.map((k) => ({ key: k, label: needKeyLabel(k, game.own) }));
}

export function SeatsStage(props: StageProps) {
  const { stages, index, week, myProject, canWrite, look } = props;
  const { game } = useMyGame(props);
  const pid = myCardId(myProject);
  const prompts = resolvedPrompts(week, index).filter((p) => !p.card);
  // A seat form left half-written reopens with its words (CardForms.tsx drafts).
  const [adding, setAdding] = useState<string | null>(() => game.needOrder.find((n) => hasCardDraft(newCardDraftKey("seat", pid, n))) ?? null);
  const focus = useFocusBack();

  if (pid == null) {
    return (
      <Week4Frame props={props}>
        <p className="sb-panel">{myProject?.kind === "learn" ? CARRY_COPY.learn : CARRY_COPY.noProjectHere}</p>
      </Week4Frame>
    );
  }

  const needsAt = stageIndexOf(stages, "needs", "confirm");
  const ownCircles = ownCircleNames(game);
  const started = CIRCLES.filter((c) => (game.view.circles[c.key] ?? 0) > 0).map((c) => c.key as string);
  const seatsFor = (need: string) => game.cards.seats.filter((s) => s.card.need === need);
  const elsewhere = game.cards.seats.filter((s) => !game.needOrder.includes(s.card.need));

  const seatList = (list: readonly CardEntry<"seat">[]) => (
    <ul className="sb-card-list">
      {list.map((e) => (
        <CardItem
          key={e.rowId}
          props={props}
          kind="seat"
          entry={e}
          own={game.own}
          edit={(close, draftKey) => (
            <SeatForm
              draftKey={draftKey}
              initial={e.card}
              needs={needChoices(game, e.card.need)}
              circlesFirst={circlesFirstFor(game, e.card.need, started)}
              ownCircles={ownCircles}
              onSave={(card) => saveCard(props, "seat", card, e.key)}
              onCancel={close}
            />
          )}
        />
      ))}
    </ul>
  );

  return (
    <Week4Frame props={props}>
      {game.needOrder.length ? (
        <div className="sb-need-sections">
          {game.needOrder.map((need) => {
            const seats = seatsFor(need);
            const held = seats.filter((s) => s.card.heldBy !== "open").length;
            const circles = Object.keys(game.circlesFor[need] ?? {});
            return (
              <section key={need} className="sb-need-section" style={hueStyle(need)} aria-labelledby={`sb-seats-${need}`}>
                <header className="sb-need-head">
                  <h3 id={`sb-seats-${need}`} className="sb-seed-head" tabIndex={-1}>
                    <span className="sb-hue-dot" aria-hidden="true" />
                    {needKeyLabel(need, game.own)}
                    {game.view.seeds.includes(need as never) ? <span className="sb-seed-chip">Seed</span> : null}
                  </h3>
                  <span className="sb-seat-count">
                    {fillCopy(WEEK4_COPY.seatsPerNeed, { seats: plural(seats.length, "seat", "seats"), held })}
                  </span>
                </header>
                {circles.length ? (
                  <p className="sb-hint">Met by {circles.map((k) => (k === OWN_CIRCLE.key ? OWN_CIRCLE.label.toLowerCase() : circleLabel(k))).join(", ")}</p>
                ) : null}
                {seats.length ? seatList(seats) : <p className="sb-empty">{CARD_COPY.seat.none}</p>}
                {canWrite ? (
                  adding === need ? (
                    <SeatForm
                      draftKey={newCardDraftKey("seat", pid, need)}
                      need={need}
                      needs={needChoices(game)}
                      circlesFirst={circlesFirstFor(game, need, started)}
                      ownCircles={ownCircles}
                      onSave={(card) => saveCard(props, "seat", card, null)}
                      onCancel={() => {
                        setAdding(null);
                        focus.back(need);
                      }}
                    />
                  ) : (
                    <button ref={focus.ref(need)} type="button" className="sb-btn" aria-label={`${CARD_COPY.seat.add} for ${needKeyLabel(need, game.own)}`} onClick={() => setAdding(need)}>
                      {CARD_COPY.seat.add}
                    </button>
                  )
                ) : null}
              </section>
            );
          })}
          {elsewhere.length ? (
            <section className="sb-need-section" aria-labelledby="sb-seats-other">
              <h3 id="sb-seats-other" className="sb-seed-head">Other seats</h3>
              {seatList(elsewhere)}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="sb-panel sb-noseeds">
          <p>{fillCopy(WEEK4_COPY.noNeeds, { stage: stages[needsAt]?.name ?? "" })}</p>
          {needsAt >= 0 ? <button type="button" className="sb-btn" onClick={() => look(needsAt)}>{fillCopy(CARRY_COPY.goTo, { stage: stages[needsAt].name })}</button> : null}
        </div>
      )}
      <div className="sb-prompts">{prompts.map((p) => <PromptBlock key={p.key} p={p} props={props} />)}</div>
    </Week4Frame>
  );
}

/** The circles a seat for this human need is offered first: the ones that meet it, then the ones the project starts with. */
function circlesFirstFor(game: Game, need: string, started: readonly string[]): string[] {
  const meets = Object.keys(game.circlesFor[need] ?? {}).filter((k) => k !== OWN_CIRCLE.key);
  return [...meets, ...started.filter((k) => !meets.includes(k))];
}
