/**
 * Week 4, "Last week's questions" (Rye, 2026-10-20: "start it off with
 * answering all the questions added to last week's page so we're addressing
 * the topics the community is adding").
 *
 * Every question added to Week 3's board, oldest first, with its project.
 * The facilitator's Answered writes Week 3's own flag (the question lives
 * there), so the mark shows on Week 3's board and in the export too. Then the
 * notes people asked us to cover, and anything asked today. The closing
 * questions stage lists whatever is still open (`EarlierAsks onlyOpen`).
 *
 * Everyone's screen re-reads the questions every 20 seconds on this stage:
 * an Answered on Week 3 doesn't move Week 4's version, which is what the
 * carry read follows otherwise.
 */
import { useEffect, useRef, useState } from "react";
import { CARRY_COPY, type CarriedAsk } from "@shared/boardCarry";
import { PROMPT_COPY, WEEK4_COPY, fillCopy } from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { QuestionWall } from "../week3/PromptBlock";
import { Week4Frame } from "./CarryStage";

const REFRESH_MS = 20_000;

const stamp = (q: CarriedAsk) => new Date(q.createdAt as string).getTime() || 0;

/** The earlier week's questions, oldest first, with this screen's own Answered taps over the last read. */
function useEarlierAsks(props: StageProps) {
  const { carry } = props;
  const [marks, setMarks] = useState<ReadonlyMap<number, boolean>>(new Map());
  const asks = [...(carry.data?.asks ?? [])]
    .sort((a, b) => stamp(a) - stamp(b) || a.id - b.id)
    .map((q) => ({ ...q, chosen: marks.get(q.id) ?? q.chosen }));
  const mark = (id: number, chosen: boolean) => setMarks((m) => new Map(m).set(id, chosen));
  return { asks, mark };
}

/** Re-read the earlier week's questions while this stage is on screen. */
function useRefresh(props: StageProps) {
  const retry = useRef(props.carry.retry);
  retry.current = props.carry.retry;
  const on = props.carry.on;
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => retry.current(), REFRESH_MS);
    return () => clearInterval(t);
  }, [on]);
}

/**
 * The earlier week's questions as a list. The facilitator taps Answered on
 * each; everyone else sees the mark. `onlyOpen` leaves out the answered ones
 * and draws nothing when none are left.
 */
export function EarlierAsks({ props, onlyOpen = false }: { props: StageProps; onlyOpen?: boolean }) {
  const { carry, facilitator, actions, week } = props;
  const { asks, mark } = useEarlierAsks(props);
  const fromWeek = carry.data?.fromWeeks[0] ?? week - 1;
  const list = onlyOpen ? asks.filter((q) => !q.chosen) : asks;
  if (!list.length) return onlyOpen ? null : <p className="sb-empty">{fillCopy(WEEK4_COPY.asksNone, { week: fromWeek })}</p>;
  const toggle = (q: CarriedAsk & { chosen: boolean }) => {
    const chosen = !q.chosen;
    mark(q.id, chosen);
    void actions.answerEarlierAsk({ week: q.week, itemId: q.id, chosen }).then((ok) => {
      if (!ok) mark(q.id, !chosen);
    });
  };
  return (
    <ul className="sb-questions">
      {list.map((q) => (
        <li key={q.id} className={`sb-q-item${q.chosen ? " sb-answered" : ""}`}>
          <p className="sb-q-text">{q.text}</p>
          <div className="sb-q-meta">
            <span className="sb-from">{q.project ?? PROMPT_COPY.fromRoom}</span>
            {facilitator ? (
              <button type="button" className="sb-toggle" aria-pressed={q.chosen} aria-label={`${q.chosen ? PROMPT_COPY.answered : PROMPT_COPY.markAnswered}: ${q.text}`} onClick={() => toggle(q)}>
                {q.chosen ? PROMPT_COPY.answered : PROMPT_COPY.markAnswered}
              </button>
            ) : q.chosen ? (
              <span className="sb-badge">{PROMPT_COPY.answered}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** On the closing questions stage: the earlier week's questions still open, if any. */
export function OpenEarlierAsks({ props }: { props: StageProps }) {
  const { carry, week } = props;
  useRefresh(props);
  const open = (carry.data?.asks ?? []).some((q) => !q.chosen);
  if (!carry.on || !open) return null;
  return (
    <section className="sb-room" aria-labelledby="sb-open-earlier-h">
      <h3 id="sb-open-earlier-h" className="sb-h3">{fillCopy(WEEK4_COPY.asksOpenLater, { week: carry.data?.fromWeeks[0] ?? week - 1 })}</h3>
      <EarlierAsks props={props} onlyOpen />
    </section>
  );
}

export function AsksStage(props: StageProps) {
  const { carry, board, week } = props;
  useRefresh(props);
  const fromWeek = carry.data?.fromWeeks[0] ?? week - 1;
  const total = carry.data?.asks.length ?? 0;
  const answered = (carry.data?.asks ?? []).filter((q) => q.chosen).length;
  const today = board.items.some((i) => i.kind === "ask" && !i.hidden);
  return (
    <Week4Frame props={props}>
      <section className="sb-room" aria-labelledby="sb-asks-h">
        <h3 id="sb-asks-h" className="sb-h3">{fillCopy(WEEK4_COPY.asksFrom, { week: fromWeek })}</h3>
        {carry.loading ? (
          <p className="sb-empty" role="status">{CARRY_COPY.loading}</p>
        ) : carry.failed ? (
          <div className="sb-panel sb-noseeds" role="alert">
            <p>{CARRY_COPY.loadFailed}</p>
            <button type="button" className="sb-btn" onClick={carry.retry}>{CARRY_COPY.retry}</button>
          </div>
        ) : (
          <>
            {total ? <p className="sb-hint">{fillCopy(WEEK4_COPY.answeredCount, { answered, total })}</p> : null}
            <EarlierAsks props={props} />
          </>
        )}
      </section>
      {board.notes.length ? (
        <section className="sb-panel sb-room" aria-labelledby="sb-asks-cover-h">
          <h3 id="sb-asks-cover-h" className="sb-h3">{WEEK4_COPY.asksCover}</h3>
          <ul className="sb-asked">
            {board.notes.map((n, i) => (
              <li key={i}>
                <p>{n.topic}</p>
                {n.projectName || n.displayName ? <span>{[n.displayName, n.projectName].filter(Boolean).join(", ")}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {today ? (
        <section className="sb-room" aria-labelledby="sb-asks-today-h">
          <h3 id="sb-asks-today-h" className="sb-h3">{WEEK4_COPY.asksToday}</h3>
          <QuestionWall props={props} unansweredFirst />
        </section>
      ) : null}
    </Week4Frame>
  );
}
