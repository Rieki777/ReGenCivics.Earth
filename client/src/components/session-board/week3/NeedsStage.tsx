/**
 * A `needs` stage (Week 3): the ten human needs cards, walked in four steps
 * (shared/humanNeeds.ts, keyed to Village OS's own ids so Week 4 is a paste).
 *
 * - pick: tap every human need the project is here to meet, plant three seeds.
 * - depth: for each seed, today, the goal in three years, and who it's for.
 * - meet: for each seed, who will meet it on the land.
 * - room: every project's card, read aloud.
 *
 * Seeds are this person's own (on the card they tapped); with none, the
 * project's. Every room view reads `shownRows` (no hidden row, nothing on a
 * hidden card) through projectView and needsSummary, so a facilitator's
 * screen counts what everyone else's counts. Views count people and projects,
 * never names.
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { NEEDS_COPY, PROMPT_COPY, fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import {
  HUMAN_NEEDS,
  HUMAN_NEED_IDS,
  MEET_WAYS,
  NEED_RUNGS,
  SEEDS_PER_PERSON,
  humanNeedById,
  isHumanNeedId,
  needShort,
  perNeedKeys,
  needsSummary,
  othersLine,
  projectCardLines,
  projectView,
  rungLabel,
  rungMeaning,
  type HumanNeedId,
  type NeedsSummary,
  type ProjectView,
  type SingleAnswer,
} from "@shared/humanNeeds";
import type { BoardItem, SessionBoardData } from "../useSessionBoard";
import type { StageProps } from "../stages";
import { cardName, myAnswerRows, myCardId, oldestFirst, shownRows, stageIndexOf } from "./answers";
import { StageHead, plural } from "./parts";
import { AskFoot, PickBlock, ProjectFor, PromptBlock, StageExtras, type ShownPrompt } from "./PromptBlock";

const hueStyle = (id: string): CSSProperties => ({ ["--sb-hue" as string]: humanNeedById(id)?.hue ?? "var(--sb-spring)" });

/** "2 of you say Unmet." under a row, when the project's people differ. */
function Differ({ answer, label }: { answer: SingleAnswer | undefined; label: (v: string) => string }) {
  if (!answer?.others.length) return null;
  return <p className="sb-hint">{othersLine(answer.others, label)}</p>;
}

/** This person's seeds on their card, in planting order; with none, the project's. */
function seedsFor(board: SessionBoardData, props: StageProps, view: ProjectView): HumanNeedId[] {
  const pid = myCardId(props.myProject);
  const mine: HumanNeedId[] = [];
  for (const r of oldestFirst(myAnswerRows(board.items, props.mine, "top", pid))) {
    if (isHumanNeedId(r.text) && !mine.includes(r.text)) mine.push(r.text);
  }
  return mine.length ? mine : view.seeds;
}

export function NeedsStage(props: StageProps) {
  const { board, week, stages, index, myProject } = props;
  const stage = stages[index];
  const prompts = resolvedPrompts(week, index);
  const byKey = new Map<string, ShownPrompt>(prompts.map((p) => [p.key, p]));
  const rows = useMemo(() => shownRows(board), [board]);
  const pid = myCardId(myProject);
  const view = useMemo(() => projectView(rows, pid), [rows, pid]);
  const summary = useMemo(() => needsSummary(rows), [rows]);
  const block = (key: string) => {
    const p = byKey.get(key);
    return p ? <PromptBlock key={key} p={p} props={props} /> : null;
  };

  let body: ReactNode;
  if (stage.step === "pick") {
    body = (
      <>
        <PickNeeds props={props} view={view} />
        <div className="sb-prompts">{block("other")}</div>
        <AcrossRoom summary={summary} view={view} name={pid != null ? cardName(board, pid, "") : ""} />
      </>
    );
  } else if (stage.step === "depth" || stage.step === "meet") {
    const seeds = seedsFor(board, props, view);
    const extra = stage.step === "depth" ? ["whole", "pulse-a"] : ["want", "pulse-b"];
    body = (
      <>
        {seeds.length ? (
          <ul className="sb-seed-cards">
            {seeds.map((id) => (
              <li key={id}>
                <SeedCard id={id} step={stage.step === "depth" ? "depth" : "meet"} props={props} byKey={byKey} view={view} />
              </li>
            ))}
          </ul>
        ) : (
          <NoSeeds props={props} />
        )}
        <div className="sb-prompts">{extra.map(block)}</div>
        {stage.step === "depth" ? <Ladder board={board} rows={rows} /> : <Leans summary={summary} />}
      </>
    );
  } else {
    body = (
      <>
        <div className="sb-prompts">{prompts.map((p) => <PromptBlock key={p.key} p={p} props={props} />)}</div>
        <RoomCards board={board} rows={rows} mineId={pid} />
      </>
    );
  }

  return (
    <>
      <StageHead stages={stages} index={index} title={stage.name} lede={stage.lede} week={week}>
        <ProjectFor props={props} />
      </StageHead>
      <StageExtras stage={stage} part="top" />
      {body}
      <StageExtras stage={stage} part="foot" />
      <AskFoot props={props} />
    </>
  );
}

/* ---------------------------------------------------------- pick and plant */

function PickNeeds({ props, view }: { props: StageProps; view: ProjectView }) {
  const { board, mine, actions, canWrite, myProject } = props;
  const pid = myCardId(myProject);
  const picks = new Set(myAnswerRows(board.items, mine, "needs", pid).map((r) => r.text));
  const seedRows = oldestFirst(myAnswerRows(board.items, mine, "top", pid));
  const seeds = new Set(seedRows.map((r) => r.text));
  const left = Math.max(0, Math.min(SEEDS_PER_PERSON, SEEDS_PER_PERSON - seeds.size));
  const people = new Map(view.needs.map((n) => [n.id as string, n.people]));
  /** Un-picking takes the seed and the per-need answers with it, so ask first when there are any. */
  const unpick = (id: string, label: string): boolean => {
    const cascades = board.items.some((i) => i.kind === "answer" && (i.projectId ?? null) === pid && mine.itemIds.has(i.id)
      && ((i.block === "top" && i.text === id) || perNeedKeys(id).includes(i.block ?? "")));
    if (!cascades || typeof window === "undefined" || typeof window.confirm !== "function") return true;
    try {
      return window.confirm(fillCopy(NEEDS_COPY.unpickAsk, { need: label }));
    } catch {
      return true;
    }
  };
  return (
    <section className="sb-needs-pick" aria-label="The ten human needs">
      <div className="sb-seeds-row">
        <span className="sb-label" aria-live="polite">{NEEDS_COPY.seedsLeft[left]}</span>
        {seedRows.map((r) => (
          <span key={r.id} className="sb-seed-chip" style={hueStyle(r.text)}>{needShort(r.text)}</span>
        ))}
      </div>
      <ul className="sb-needs-grid">
        {HUMAN_NEEDS.map((n) => {
          const picked = picks.has(n.id);
          const seeded = seeds.has(n.id);
          const count = people.get(n.id) ?? 0;
          return (
            <li key={n.id} className={`sb-need${picked ? " sb-need-on" : ""}${seeded ? " sb-need-seeded" : ""}`} style={hueStyle(n.id)}>
              <button
                type="button"
                className="sb-need-pick"
                aria-pressed={picked}
                disabled={!canWrite}
                onClick={() => {
                  if (picked && !unpick(n.id, n.label)) return;
                  void actions.answerPick({ key: "needs", option: n.id, on: !picked, projectId: pid });
                }}
              >
                <span className="sb-need-label">{n.label}</span>
                <span className="sb-need-plain">{n.plain}</span>
                <small className="sb-need-deck">{n.deck}</small>
                <span className="sb-need-state" aria-hidden="true">{picked ? NEEDS_COPY.picked : NEEDS_COPY.pick}</span>
              </button>
              {picked || count > 0 ? (
                <div className="sb-need-foot">
                  {picked ? (
                    <button
                      type="button"
                      className="sb-seed"
                      aria-pressed={seeded}
                      aria-label={`${seeded ? NEEDS_COPY.planted : NEEDS_COPY.plant}: ${n.label}`}
                      disabled={!canWrite}
                      onClick={() => void actions.answerPick({ key: "top", option: n.id, on: !seeded, projectId: pid })}
                    >
                      {seeded ? NEEDS_COPY.planted : NEEDS_COPY.plant}
                    </button>
                  ) : null}
                  {count > 0 ? <span className="sb-need-n">{fillCopy(NEEDS_COPY.people, { n: count })}</span> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Across the room": one bar per human need, by projects. Then this project's own so far. */
function AcrossRoom({ summary, view, name }: { summary: NeedsSummary; view: ProjectView; name: string }) {
  const max = Math.max(1, ...summary.needs.map((n) => n.projects));
  const order = (id: string) => HUMAN_NEED_IDS.indexOf(id as HumanNeedId);
  const sorted = [...summary.needs].sort((a, b) => b.projects - a.projects || b.seeds - a.seeds || order(a.id) - order(b.id));
  return (
    <section className="sb-panel sb-room" aria-labelledby="sb-across-h">
      <h3 id="sb-across-h" className="sb-h3">{NEEDS_COPY.acrossRoom}</h3>
      {name && view.needs.length ? (
        <p className="sb-room-own">
          <strong>{fillCopy(NEEDS_COPY.soFar, { name })}</strong>{" "}
          {view.needs.map((n, i) => `${needShort(n.id)} (${i === 0 ? fillCopy(NEEDS_COPY.people, { n: n.people }) : n.people})`).join(", ")}
        </p>
      ) : null}
      <ul className="sb-bars">
        {sorted.map((n) => (
          <li key={n.id} className={`sb-bar${n.projects === 0 ? " sb-bar-zero" : ""}`} style={hueStyle(n.id)}>
            <span className="sb-bar-t">
              {fillCopy(NEEDS_COPY.acrossRoomRow, {
                need: needShort(n.id),
                projects: plural(n.projects, "project", "projects"),
                seeds: plural(n.seeds, "seed", "seeds"),
              })}
            </span>
            <span className="sb-bar-track" aria-hidden="true">
              <span className="sb-bar-fill" style={{ width: `${Math.round((n.projects / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------- one card per seed */

function NoSeeds({ props }: { props: StageProps }) {
  const pick = stageIndexOf(props.stages, "needs", "pick");
  const back = pick >= 0 ? pick : Math.max(0, props.index - 1);
  // Name the stage: on "Who meets each need" the stage before is Living ways.
  const stage = props.stages[back]?.name ?? "";
  return (
    <div className="sb-panel sb-noseeds">
      <p>{fillCopy(NEEDS_COPY.noSeeds, { stage })}</p>
      <button type="button" className="sb-btn" onClick={() => props.look(back)}>{fillCopy(NEEDS_COPY.goBack, { stage })}</button>
    </div>
  );
}

function SeedCard({ id, step, props, byKey, view }: {
  id: HumanNeedId;
  step: "depth" | "meet";
  props: StageProps;
  byKey: Map<string, ShownPrompt>;
  view: ProjectView;
}) {
  const need = humanNeedById(id);
  const per = view.perNeed[id];
  const row = (key: string, after?: (picked: string[]) => ReactNode) => {
    const p = byKey.get(key);
    return p ? <PickBlock key={key} p={p} props={props} compact after={after} /> : null;
  };
  const wayLabel = (v: string) => MEET_WAYS.find((w) => w.key === v)?.label ?? v;
  return (
    <article className="sb-seed-card" style={hueStyle(id)} aria-label={need?.label ?? id}>
      <h3 className="sb-seed-head">
        <span className="sb-hue-dot" aria-hidden="true" />
        {need?.label ?? id}
      </h3>
      {step === "depth" ? (
        <>
          {row(`n-${id}`, () => <Differ answer={per?.today} label={rungLabel} />)}
          {row(`g-${id}`, (picked) => {
            const rung = picked[0] ?? per?.goal.value ?? null;
            return (
              <>
                {rung ? <p className="sb-rung-meaning">{rungMeaning(rung, id)}</p> : null}
                <Differ answer={per?.goal} label={rungLabel} />
              </>
            );
          })}
          {row(`b-${id}`, () => <Differ answer={per?.breadth} label={(v) => `${v}%`} />)}
        </>
      ) : (
        row(`m-${id}`, () => <Differ answer={per?.meet} label={wayLabel} />)
      )}
    </article>
  );
}

/* ------------------------------------------------------------ room views */

/** "The room's ladder": each project's seed, from where its people are today to its goal. */
function Ladder({ board, rows }: { board: SessionBoardData; rows: BoardItem[] }) {
  const rungIndex = (v: string | null | undefined) => {
    const i = NEED_RUNGS.findIndex((r) => r.key === v);
    return i >= 0 ? i : null;
  };
  const entries = board.projects
    .filter((p) => !p.hidden)
    .flatMap((p) => {
      const v = projectView(rows, p.id);
      return v.seeds.map((id) => ({ project: p, id, today: v.perNeed[id]?.today.value ?? null, goal: v.perNeed[id]?.goal.value ?? null }));
    })
    .filter((e) => e.today || e.goal);
  return (
    <section className="sb-panel sb-room" aria-labelledby="sb-ladder-h">
      <h3 id="sb-ladder-h" className="sb-h3">{NEEDS_COPY.ladder}</h3>
      {entries.length ? (
        <>
          <p className="sb-ladder-legend" aria-hidden="true">{NEED_RUNGS.map((r) => <span key={r.key}>{r.label}</span>)}</p>
          <ul className="sb-ladder">
            {entries.map((e) => {
              const t = rungIndex(e.today);
              const g = rungIndex(e.goal);
              const lo = Math.min(t ?? g ?? 0, g ?? t ?? 0);
              const hi = Math.max(t ?? g ?? 0, g ?? t ?? 0);
              const words = [e.today ? `${rungLabel(e.today)} today` : null, e.goal ? `${rungLabel(e.goal)} in three years` : null].filter(Boolean).join(", ");
              // Today is a hollow ring, the goal a solid cell, and the words show too,
              // so a goal below today reads plainly.
              return (
                <li key={`${e.project.id}-${e.id}`} className="sb-ladder-row" style={hueStyle(e.id)}>
                  <span className="sb-ladder-name">{e.project.name} · {needShort(e.id)}</span>
                  <span className="sb-ladder-track" role="img" aria-label={words}>
                    {NEED_RUNGS.map((r, i) => (
                      <span key={r.key} className={`sb-ladder-cell${i >= lo && i <= hi ? " sb-on" : ""}${i === g ? " sb-goal" : ""}${i === t && i !== g ? " sb-rung-today" : ""}`} />
                    ))}
                  </span>
                  <span className="sb-hint" aria-hidden="true">{words}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="sb-empty">Each seed shows here once its project marks today and the goal.</p>
      )}
    </section>
  );
}

/** "The room leans": seeds per way of meeting a human need, across every project. */
function Leans({ summary }: { summary: NeedsSummary }) {
  const counts = MEET_WAYS.map((w) => ({ w, n: summary.meet[w.key] ?? 0 })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <section className="sb-panel sb-room" aria-labelledby="sb-leans-h">
      <h3 id="sb-leans-h" className="sb-h3">{NEEDS_COPY.leans}</h3>
      <ul className="sb-bars">
        {counts.map(({ w, n }) => (
          <li key={w.key} className={`sb-bar${n === 0 ? " sb-bar-zero" : ""}`}>
            <span className="sb-bar-t">{w.label} · {n}</span>
            <span className="sb-bar-track" aria-hidden="true">
              <span className="sb-bar-fill" style={{ width: `${Math.round((n / max) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Stage 13: every project's card, read from its answers. Yours first. */
function RoomCards({ board, rows, mineId }: { board: SessionBoardData; rows: BoardItem[]; mineId: number | null }) {
  const cards: { id: number | null; name: string; view: ProjectView }[] = board.projects
    .filter((p) => !p.hidden)
    .map((p) => ({ id: p.id as number | null, name: p.name, view: projectView(rows, p.id) }))
    .filter((c) => c.view.answered);
  const room = projectView(rows, null);
  if (room.needs.length || room.purpose.latest) cards.push({ id: null, name: PROMPT_COPY.fromRoom, view: room });
  if (mineId != null) cards.sort((a, b) => Number(b.id === mineId) - Number(a.id === mineId));
  return (
    <section className="sb-room" aria-labelledby="sb-cards-h">
      <h3 id="sb-cards-h" className="sb-h3">{NEEDS_COPY.roomCards}</h3>
      {cards.length ? (
        <ul className="sb-pcards">
          {cards.map((c) => (
            <li key={c.id ?? "room"} className={`sb-panel sb-pcard${c.id != null && c.id === mineId ? " sb-pcard-mine" : ""}`}>
              <h4 className="sb-pcard-name">{c.name}</h4>
              <ul className="sb-pcard-lines">
                {projectCardLines(c.view).map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sb-empty">{NEEDS_COPY.noCards}</p>
      )}
    </section>
  );
}
