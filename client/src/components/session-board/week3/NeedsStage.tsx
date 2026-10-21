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
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import { NEEDS_COPY, PROMPT_COPY, WEEK4_COPY, fillCopy, resolvedPrompts } from "@shared/sessionBoard";
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
import { CARRY_COPY, firstChangeCopy, withCarried } from "@shared/boardCarry";
import type { BoardItem, SessionBoardData } from "../useSessionBoard";
import type { StageProps } from "../stages";
import { cardName, myAnswerRows, myCardId, oldestFirst, shownRows, stageIndexOf } from "./answers";
import { StageHead, plural } from "./parts";
import { AskFoot, PickBlock, ProjectFor, PromptBlock, StageExtras, type ShownPrompt } from "./PromptBlock";
import { AsksStage } from "../week4/AsksStage";
import { CarryPending, CarryStage, CarryWait, startedFresh } from "../week4/CarryStage";
import { NeedsConfirm } from "../week4/NeedsConfirm";
import { SeatsStage } from "../week4/SeatsStage";
import { DecideStage, QuestsStage } from "../week4/DecideQuests";
import { BuiltStage } from "../week4/BuiltStage";
import { gameOf, onlyCarried, type GameRow } from "../week4/game";
import { OwnNeedCircles } from "../week4/OwnNeedCircles";

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

/**
 * Every `needs` stage. A board that carries earlier weeks' answers (Week 4
 * on, ../week4/) draws its own steps; the circles step is shared, and reads
 * each card with its earlier weeks merged in.
 */
export function NeedsStage(props: StageProps) {
  const step = props.stages[props.index].step;
  const [, setFresh] = useState(0);
  if (props.carry?.on) {
    if (step === "carry") return <CarryStage {...props} />;
    // Last week's questions writes nothing for a project; it shows its own wait while they load.
    if (step === "asks") return <AsksStage {...props} />;
    // Nothing here writes until last week's answers are in: a tap made before
    // they load would replace them for everyone (a change replaces last week's).
    if (props.carry.loading || props.carry.failed || !props.carry.data) return <CarryWait {...props} />;
    // A card found only by its name waits for the facilitator's yes: answered
    // first, today's answers would replace Week 3's once it links, and the
    // human-needs group would drop last week's other seeds with them.
    const pid = myCardId(props.myProject);
    const link = pid != null ? props.carry.data.cards.find((c) => c.cardId === pid) : undefined;
    if (link?.match === "suggested" && step !== "room" && !startedFresh(pid)) {
      return <CarryPending props={props} link={link} onFresh={() => setFresh((n) => n + 1)} />;
    }
    if (step === "confirm") return <NeedsConfirm {...props} />;
    if (step === "seats") return <SeatsStage {...props} />;
    if (step === "decide") return <DecideStage {...props} />;
    if (step === "quests") return <QuestsStage {...props} />;
    if (step === "room") return <BuiltStage {...props} />;
  }
  return <NeedsWalk {...props} />;
}

function NeedsWalk(props: StageProps) {
  const { board, week, stages, index, myProject, carry } = props;
  const stage = stages[index];
  const prompts = resolvedPrompts(week, index);
  const byKey = new Map<string, ShownPrompt>(prompts.map((p) => [p.key, p]));
  const rows = useMemo(
    () => (carry?.on ? (withCarried(shownRows(board), carry.data) as BoardItem[]) : shownRows(board)),
    [board, carry?.on, carry?.data],
  );
  const pid = myCardId(myProject);
  const view = useMemo(() => projectView(rows, pid), [rows, pid]);
  // Week 4 on: the project's own human needs, which get their circles on a card.
  const link = carry?.on && pid != null ? carry.data?.cards.find((c) => c.cardId === pid) ?? null : null;
  const game = useMemo(() => (carry?.on && pid != null ? gameOf(rows as GameRow[], pid, link) : null), [carry?.on, rows, pid, link]);
  const summary = useMemo(() => needsSummary(rows), [rows]);
  /** Last week's answers for a key on this card, while nobody has answered it today. */
  const lastWeek = (key: string): string[] => {
    if (!carry?.on || pid == null || !onlyCarried(rows as GameRow[], key, pid)) return [];
    const texts = rows.filter((r) => r.kind === "answer" && r.block === key && r.projectId === pid).map((r) => r.text);
    return texts.filter((t, i) => texts.indexOf(t) === i);
  };
  const block = (key: string, compact = false) => {
    const p = byKey.get(key);
    if (!p) return null;
    if (!carry?.on || pid == null || p.anonymous) return <PromptBlock key={key} p={p} props={props} />;
    // A board that carries earlier weeks: last week's answer shows under the
    // question until today has one, and the first change copies the rest of it
    // across, so one tap never wipes what the project said last week.
    if (p.mode === "pick") {
      const many = (p.max ?? 1) > 1;
      return (
        <PickBlock
          key={key}
          p={p}
          props={props}
          compact={compact}
          after={(picked) => {
            const last = picked.length ? [] : lastWeek(key);
            const words = last.map((v) => p.options?.find((o) => o.key === v)?.label ?? v);
            return words.length ? <p className="sb-hint">{fillCopy(CARRY_COPY.lastWeek, { value: words.join(", ") })}</p> : null;
          }}
          onPick={many ? (option, on) => {
            const copy = firstChangeCopy(rows as GameRow[], key, pid, { option, on });
            for (const o of copy) void props.actions.answerPick({ key, option: o, on: true, projectId: pid });
            if (on) void props.actions.answerPick({ key, option, on: true, projectId: pid });
            else if (!copy.length) void props.actions.answerPick({ key, option, on: false, projectId: pid });
          } : undefined}
        />
      );
    }
    if (p.mode === "note" && (p.max ?? 1) > 1) {
      const last = lastWeek(key);
      return (
        <PromptBlock
          key={key}
          p={p}
          props={props}
          noteAfter={last.length ? <p className="sb-hint">{fillCopy(CARRY_COPY.lastWeek, { value: last.join("; ") })}</p> : null}
          onNote={async (text) => {
            const max = p.max ?? 1;
            if (last.length >= max) {
              // Last week's lines fill this person's room: carry every one that fits,
              // say which can't come across, and keep the new words in the field.
              const lost = last.slice(max);
              if (lost.length && typeof window !== "undefined" && typeof window.confirm === "function") {
                let ok = true;
                try {
                  ok = window.confirm(fillCopy(WEEK4_COPY.circlesFull, { max, lost: lost.join("; ") }));
                } catch {
                  ok = true;
                }
                if (!ok) return null;
              }
              for (const line of last.slice(0, max)) void props.actions.answerNote({ key, text: line, projectId: pid });
              toast(fillCopy(WEEK4_COPY.circlesCarried, { text }));
              return null;
            }
            // Last week's lines become this person's first, then the new one.
            for (const line of last) void props.actions.answerNote({ key, text: line, projectId: pid });
            return props.actions.answerNote({ key, text, projectId: pid });
          }}
        />
      );
    }
    return <PromptBlock key={key} p={p} props={props} />;
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
  } else if (stage.step === "circles") {
    // The project's own human needs, seeds first, each asking which circles meet it (Rye, 2026-10-14).
    const seeds = seedsFor(board, props, view);
    const picked = [...seeds, ...view.needs.map((n) => n.id).filter((id) => !seeds.includes(id))];
    const own = game ? [...game.own.entries()] : [];
    body = (
      <>
        {picked.length || own.length ? (
          <ul className="sb-seed-cards">
            {picked.map((id) => (
              <li key={id}>
                <SeedCard id={id} step="circles" props={props} byKey={byKey} view={view} pick={carry?.on ? block : undefined} />
              </li>
            ))}
            {game ? own.map(([key, label]) => (
              <li key={key}>
                <OwnNeedCircles props={props} game={game} need={key} label={label} />
              </li>
            )) : null}
          </ul>
        ) : (
          <NoSeeds props={props} />
        )}
        <div className="sb-prompts">{["circles-own", "circles", "players", "players-now", "shape", "shape-line"].map((k) => block(k))}</div>
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
        <div className="sb-prompts">{extra.map((k) => block(k))}</div>
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

function SeedCard({ id, step, props, byKey, view, pick }: {
  id: HumanNeedId;
  step: "depth" | "meet" | "circles";
  props: StageProps;
  byKey: Map<string, ShownPrompt>;
  view: ProjectView;
  /** The stage's own block for a key (a board that carries earlier weeks copies last week's picks). */
  pick?: (key: string, compact?: boolean) => ReactNode;
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
      ) : step === "circles" ? (
        pick ? pick(`c-${id}`, true) : row(`c-${id}`)
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
