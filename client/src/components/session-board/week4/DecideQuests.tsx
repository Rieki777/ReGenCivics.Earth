/**
 * Week 4, "Who decides what" and "Your first quest".
 *
 * Who decides what: each of the project's circles decides what's its own (a
 * card per circle: what it decides on), and a few things the whole project
 * decides together, how it decides those, and one first agreement. Last
 * week's "how do you want to decide" comes forward under its row until today
 * has an answer.
 *
 * Your first quest: up to three each, every one tagged to the human need it
 * grows.
 */
import { useState } from "react";
import { CARRY_COPY } from "@shared/boardCarry";
import { CARD_COPY, circleLabel } from "@shared/boardCards";
import { DECIDE_OPTIONS } from "@shared/humanNeeds";
import { fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { myCardId } from "../week3/answers";
import { PickBlock, PromptBlock } from "../week3/PromptBlock";
import { CardItem, DecideForm, QuestForm, hasCardDraft, newCardDraftKey, saveCard, useFocusBack } from "./CardForms";
import { Week4Frame } from "./CarryStage";
import { lastWeekValue, useMyGame } from "./game";
import { needChoices, ownCircleNames, projectCircles } from "./SeatsStage";

/** The "Another circle" form's place, beside one form per circle. */
const ANY = "__any__";

function NoProject({ props }: { props: StageProps }) {
  return (
    <Week4Frame props={props}>
      <p className="sb-panel">{props.myProject?.kind === "learn" ? CARRY_COPY.learn : CARRY_COPY.noProjectHere}</p>
    </Week4Frame>
  );
}

export function DecideStage(props: StageProps) {
  const { week, index, canWrite, myProject } = props;
  const { rows, game } = useMyGame(props);
  const pid = myCardId(myProject);
  // A decide form left half-written reopens with its words (CardForms.tsx drafts).
  const [adding, setAdding] = useState<string | null>(
    () => projectCircles(game).find((c) => hasCardDraft(newCardDraftKey("decide", pid, c))) ?? (hasCardDraft(newCardDraftKey("decide", pid, "any")) ? ANY : null),
  );
  const focus = useFocusBack();
  const close = (key: string) => () => {
    setAdding(null);
    focus.back(key);
  };
  if (pid == null) return <NoProject props={props} />;
  const prompts = resolvedPrompts(week, index).filter((p) => !p.card);
  const circles = projectCircles(game);
  const ownCircles = ownCircleNames(game);
  const decided = (c: string) => game.cards.decide.filter((d) => d.card.circle === c);
  const others = game.cards.decide.filter((d) => !circles.includes(d.card.circle));

  return (
    <Week4Frame props={props}>
      <div className="sb-need-sections">
        {circles.map((c, i) => (
          <section key={c} className="sb-need-section" aria-labelledby={`sb-dec-${i}`}>
            <h3 id={`sb-dec-${i}`} className="sb-seed-head" tabIndex={-1}>{circleLabel(c)}</h3>
            {decided(c).length ? (
              <ul className="sb-card-list">
                {decided(c).map((e) => (
                  <CardItem
                    key={e.rowId}
                    props={props}
                    kind="decide"
                    entry={e}
                    own={game.own}
                    edit={(done, draftKey) => <DecideForm draftKey={draftKey} circle={c} initial={e.card} circlesFirst={circles} ownCircles={ownCircles} onSave={(card) => saveCard(props, "decide", card, e.key)} onCancel={done} />}
                  />
                ))}
              </ul>
            ) : null}
            {canWrite ? (
              adding === c ? (
                <DecideForm draftKey={newCardDraftKey("decide", pid, c)} circle={c} circlesFirst={circles} ownCircles={ownCircles} onSave={(card) => saveCard(props, "decide", card, null)} onCancel={close(c)} />
              ) : (
                <button ref={focus.ref(c)} type="button" className="sb-btn" aria-label={`${CARD_COPY.decide.add}: ${circleLabel(c)}`} onClick={() => setAdding(c)}>{CARD_COPY.decide.add}</button>
              )
            ) : null}
          </section>
        ))}
        {others.length ? (
          <section className="sb-need-section" aria-labelledby="sb-dec-other">
            <h3 id="sb-dec-other" className="sb-seed-head">Other circles</h3>
            <ul className="sb-card-list">
              {others.map((e) => <CardItem key={e.rowId} props={props} kind="decide" entry={e} own={game.own} />)}
            </ul>
          </section>
        ) : null}
        {canWrite ? (
          adding === ANY ? (
            <DecideForm draftKey={newCardDraftKey("decide", pid, "any")} circlesFirst={circles} ownCircles={ownCircles} onSave={(card) => saveCard(props, "decide", card, null)} onCancel={close(ANY)} />
          ) : (
            <button ref={focus.ref(ANY)} type="button" className="sb-btn sb-ghost" onClick={() => setAdding(ANY)}>{circles.length ? "Another circle" : CARD_COPY.decide.add}</button>
          )
        ) : null}
      </div>
      <div className="sb-prompts">
        {prompts.map((p) =>
          p.key === "decide-aim" ? (
            <PickBlock
              key={p.key}
              p={p}
              props={props}
              after={(picked) => {
                const last = picked.length ? null : lastWeekValue(rows, "decide-aim", pid);
                const label = DECIDE_OPTIONS.find((o) => o.key === last)?.label;
                return label ? <p className="sb-hint">{fillCopy(CARRY_COPY.lastWeek, { value: label })}</p> : null;
              }}
            />
          ) : (
            <PromptBlock key={p.key} p={p} props={props} />
          ),
        )}
      </div>
    </Week4Frame>
  );
}

export function QuestsStage(props: StageProps) {
  const { canWrite, myProject } = props;
  const { game } = useMyGame(props);
  const pid = myCardId(myProject);
  const [adding, setAdding] = useState(() => hasCardDraft(newCardDraftKey("quest", pid)));
  const focus = useFocusBack();
  const close = () => {
    setAdding(false);
    focus.back("quest");
  };
  if (pid == null) return <NoProject props={props} />;
  const needs = needChoices(game);
  return (
    <Week4Frame props={props}>
      <section className="sb-room" aria-label="Quests">
        {game.cards.quests.length ? (
          <ul className="sb-card-list">
            {game.cards.quests.map((e) => (
              <CardItem
                key={e.rowId}
                props={props}
                kind="quest"
                entry={e}
                own={game.own}
                edit={(done, draftKey) => <QuestForm draftKey={draftKey} initial={e.card} needs={needChoices(game, e.card.need)} onSave={(card) => saveCard(props, "quest", card, e.key)} onCancel={done} />}
              />
            ))}
          </ul>
        ) : null}
        {canWrite ? (
          adding || !game.cards.quests.length ? (
            <QuestForm
              draftKey={newCardDraftKey("quest", pid)}
              needs={needs}
              focusFirst={adding}
              onSave={(card) => saveCard(props, "quest", card, null)}
              onCancel={game.cards.quests.length ? close : undefined}
              onSaved={close}
            />
          ) : (
            <button ref={focus.ref("quest")} type="button" className="sb-btn" onClick={() => setAdding(true)}>{CARD_COPY.quest.add}</button>
          )
        ) : null}
      </section>
    </Week4Frame>
  );
}
