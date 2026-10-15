/**
 * Week 4, stage 5, "Your human needs" (Rye, 2026-10-14: need first, and
 * projects can change and add whatever human needs they're pursuing).
 *
 * The project's human needs and seeds come forward from Week 3. A change
 * today replaces last week's answer for that question, so the first change
 * to a list the project only has from last week copies last week's list as
 * this person's own, with the change made (shared/boardCarry.ts
 * `firstChangeCopy`). Each seed then gets today, the goal and who it's for;
 * a human need of the project's own is a card with its goal and breadth.
 */
import { useState } from "react";
import { toast } from "sonner";
import { CARRY_COPY, firstChangeCopy } from "@shared/boardCarry";
import { CARD_COPY, type OwnNeedCard } from "@shared/boardCards";
import { NEEDS_COPY, fillCopy, resolvedPrompts } from "@shared/sessionBoard";
import {
  BREADTH_STOPS,
  HUMAN_NEEDS,
  customNeedKey,
  NEED_RUNGS,
  SEEDS_PER_PERSON,
  WHOLE_STOPS,
  humanNeedById,
  needShort,
  rungMeaning,
  type HumanNeedId,
} from "@shared/humanNeeds";
import type { CSSProperties } from "react";
import type { StageProps } from "../stages";
import { myAnswerRows, myCardId } from "../week3/answers";
import { PickBlock, type ShownPrompt } from "../week3/PromptBlock";
import { CardItem, OwnNeedForm, saveCard } from "./CardForms";
import { Week4Frame } from "./CarryStage";
import { CopyForVillageOS } from "./CopyForVillageOS";
import { lastWeekValue, onlyCarried, useMyGame, type GameRow } from "./game";

/** Words only this stage uses. */
export const CONFIRM_COPY = {
  keepOne: "Pick the human needs you're keeping first, then take this one off.",
  someoneElse: "Someone else on your team picked this one. Ask them, or the facilitator, to take it off.",
  seedFirst: "Plant another seed first, then take this one back.",
  fromLastWeek: "From last week",
  ownTitle: "Human needs of your own",
  ownNone: "None yet. Add any human need your project is pursuing that isn't one of the ten.",
} as const;

const hueStyle = (id: string): CSSProperties => ({ ["--sb-hue" as string]: humanNeedById(id)?.hue ?? "var(--sb-spring)" });

const label = (list: readonly { key: string; label: string }[], key: string | null) => (key ? list.find((o) => o.key === key)?.label ?? key : "");

export function NeedsConfirm(props: StageProps) {
  const { board, mine, actions, canWrite, myProject, week, index } = props;
  const { rows, game } = useMyGame(props);
  const pid = myCardId(myProject);
  const byKey = new Map<string, ShownPrompt>(resolvedPrompts(week, index).map((p) => [p.key, p]));
  const projectPicks = game.view.needs.map((n) => n.id as string);
  const seeds = game.view.seeds as string[];
  const myPicks = new Set(myAnswerRows(board.items, mine, "needs", pid).map((r) => r.text));
  const mySeeds = new Set(myAnswerRows(board.items, mine, "top", pid).map((r) => r.text));
  const [adding, setAdding] = useState<Partial<OwnNeedCard> | null>(null);

  const [busy, setBusy] = useState(false);
  const pick = (key: "needs" | "top", option: string, on: boolean) => () => actions.answerPick({ key, option, on, projectId: pid });

  /**
   * Run a change as one batch: every write is queued at once (they paint
   * together and save in order on one queue), the grid stays locked until the
   * last one lands, and a failed save drops the ones behind it.
   */
  const run = async (writes: (() => Promise<boolean>)[]) => {
    if (busy || !writes.length) return;
    setBusy(true);
    try {
      await Promise.all(writes.map((w) => w()));
    } finally {
      setBusy(false);
    }
  };
  /** Make these human needs this person's own picks today (skipping ones already theirs). */
  const pickAll = (options: readonly string[]) => options.filter((o) => !myPicks.has(o)).map((o) => pick("needs", o, true));

  const toggleNeed = (id: string) => {
    if (pid == null || busy) return;
    if (!projectPicks.includes(id)) {
      void run([...pickAll(firstChangeCopy(rows, "needs", pid, { option: id, on: true })), pick("needs", id, true)]);
      return;
    }
    if (onlyCarried(rows, "needs", pid)) {
      // Last week's list becomes today's, minus this one. Its carried seed and
      // answers stay behind with it (shared/boardCarry.ts mergeCarried).
      const keep = firstChangeCopy(rows, "needs", pid, { option: id, on: false });
      if (!keep.length) {
        toast(CONFIRM_COPY.keepOne);
        return;
      }
      void run(pickAll(keep));
      return;
    }
    if (myPicks.has(id)) void run([pick("needs", id, false)]);
    else toast(CONFIRM_COPY.someoneElse);
  };

  const toggleSeed = (id: string) => {
    if (pid == null || busy) return;
    // The seeds the card shows (three at most, ranked), which a first change copies.
    const shown = seeds;
    const needsFirst = onlyCarried(rows, "needs", pid) ? pickAll(firstChangeCopy(rows, "needs", pid, { option: id, on: true })) : [];
    if (shown.includes(id)) {
      if (onlyCarried(rows, "top", pid)) {
        const keep = shown.filter((s) => s !== id);
        if (!keep.length) {
          toast(CONFIRM_COPY.seedFirst);
          return;
        }
        const mineAfterCopy = new Set([...myPicks, ...(onlyCarried(rows, "needs", pid) ? firstChangeCopy(rows, "needs", pid, { option: id, on: true }) : [])]);
        void run([...needsFirst, ...keep.filter((s) => !mineAfterCopy.has(s)).map((s) => pick("needs", s, true)), ...keep.map((s) => pick("top", s, true))]);
        return;
      }
      if (mySeeds.has(id)) void run([pick("top", id, false)]);
      else toast(CONFIRM_COPY.someoneElse);
      return;
    }
    // Planting: the human need has to be this person's pick first.
    const writes = [...needsFirst];
    const mineAfterCopy = new Set([...myPicks, ...(onlyCarried(rows, "needs", pid) ? firstChangeCopy(rows, "needs", pid, { option: id, on: true }) : [])]);
    if (!mineAfterCopy.has(id)) writes.push(pick("needs", id, true));
    if (onlyCarried(rows, "top", pid)) {
      if (shown.length >= SEEDS_PER_PERSON) {
        toast(byKey.get("top")?.full ?? "Three seeds each. Take one back to move it.");
        return;
      }
      for (const s of shown) {
        if (!mineAfterCopy.has(s)) writes.push(pick("needs", s, true));
        writes.push(pick("top", s, true));
      }
    }
    writes.push(pick("top", id, true));
    void run(writes);
  };

  if (pid == null) {
    return (
      <Week4Frame props={props}>
        <p className="sb-panel">{myProject?.kind === "learn" ? CARRY_COPY.learn : CARRY_COPY.noProjectHere}</p>
      </Week4Frame>
    );
  }

  const left = Math.max(0, SEEDS_PER_PERSON - seeds.length);
  const carriedNeeds = onlyCarried(rows, "needs", pid);
  const otherNamed = [game.view.other.latest, ...game.view.other.others]
    .map((w) => (w ?? "").trim())
    .filter((w, i, all) => w && all.indexOf(w) === i && !game.own.has(customNeedKey(w)));

  return (
    <Week4Frame props={props}>
      <section className="sb-needs-pick" aria-label="The ten human needs">
        <div className="sb-seeds-row">
          <span className="sb-label" aria-live="polite">{NEEDS_COPY.seedsLeft[Math.min(3, left)]}</span>
          {seeds.map((id) => <span key={id} className="sb-seed-chip" style={hueStyle(id)}>{needShort(id)}</span>)}
          {carriedNeeds ? <span className="sb-hint">{CONFIRM_COPY.fromLastWeek}</span> : null}
        </div>
        <ul className="sb-needs-grid">
          {HUMAN_NEEDS.map((n) => {
            const picked = projectPicks.includes(n.id);
            const seeded = seeds.includes(n.id);
            return (
              <li key={n.id} className={`sb-need${picked ? " sb-need-on" : ""}${seeded ? " sb-need-seeded" : ""}`} style={hueStyle(n.id)}>
                <button type="button" className="sb-need-pick" aria-pressed={picked} aria-busy={busy || undefined} disabled={!canWrite || busy} onClick={() => toggleNeed(n.id)}>
                  <span className="sb-need-label">{n.label}</span>
                  <span className="sb-need-plain">{n.plain}</span>
                  <small className="sb-need-deck">{n.deck}</small>
                  <span className="sb-need-state" aria-hidden="true">{picked ? NEEDS_COPY.picked : NEEDS_COPY.pick}</span>
                </button>
                {picked ? (
                  <div className="sb-need-foot">
                    <button
                      type="button"
                      className="sb-seed"
                      aria-pressed={seeded}
                      aria-label={`${seeded ? NEEDS_COPY.planted : NEEDS_COPY.plant}: ${n.label}`}
                      disabled={!canWrite || busy}
                      onClick={() => toggleSeed(n.id)}
                    >
                      {seeded ? NEEDS_COPY.planted : NEEDS_COPY.plant}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sb-panel sb-room" aria-labelledby="sb-own-h">
        <h3 id="sb-own-h" className="sb-h3">{CONFIRM_COPY.ownTitle}</h3>
        {game.cards.own.length ? (
          <ul className="sb-card-list">
            {game.cards.own.map((e) => (
              <CardItem
                key={e.rowId}
                props={props}
                kind="own"
                entry={e}
                own={game.own}
                edit={(close) => <OwnNeedForm initial={e.card} onSave={(card) => saveCard(props, "own", card, e.key)} onCancel={close} />}
              />
            ))}
          </ul>
        ) : (
          <p className="sb-hint">{CONFIRM_COPY.ownNone}</p>
        )}
        {otherNamed.map((w) => (
          <p key={w} className="sb-row sb-own-suggest">
            <span>{fillCopy(CARD_COPY.own.lastWeek, { label: w })}</span>
            {canWrite ? <button type="button" className="sb-btn sb-small" onClick={() => setAdding({ label: w, breadth: "100" })}>{CARD_COPY.own.addLastWeek}</button> : null}
          </p>
        ))}
        {canWrite ? (
          adding ? (
            <OwnNeedForm key={JSON.stringify(adding)} initial={adding} onSave={(card) => saveCard(props, "own", card, null)} onCancel={() => setAdding(null)} />
          ) : (
            <button type="button" className="sb-btn" onClick={() => setAdding({})}>{CARD_COPY.own.add}</button>
          )
        ) : null}
      </section>

      {seeds.length ? (
        <ul className="sb-seed-cards">
          {seeds.map((id) => (
            <li key={id}>
              <SeedDepth id={id as HumanNeedId} props={props} byKey={byKey} rows={rows} pid={pid} />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="sb-prompts">
        {byKey.get("whole") ? (
          <PickBlock
            p={byKey.get("whole")!}
            props={props}
            after={(picked) => {
              const last = picked.length ? null : lastWeekValue(rows, "whole", pid);
              return last ? <p className="sb-hint">{fillCopy(CARRY_COPY.lastWeek, { value: label(WHOLE_STOPS, last) })}</p> : null;
            }}
          />
        ) : null}
      </div>

      <CopyForVillageOS props={props} game={{ ...game, cardId: pid }} />
    </Week4Frame>
  );
}

/** One seed: today, the goal and who it's for, with last week's answer under each until it changes. */
function SeedDepth({ id, props, byKey, rows, pid }: { id: HumanNeedId; props: StageProps; byKey: Map<string, ShownPrompt>; rows: readonly GameRow[]; pid: number }) {
  const need = humanNeedById(id);
  const row = (key: string, list: readonly { key: string; label: string }[], meaning = false) => {
    const p = byKey.get(key);
    if (!p) return null;
    return (
      <PickBlock
        key={key}
        p={p}
        props={props}
        compact
        after={(picked) => {
          const last = picked.length ? null : lastWeekValue(rows, key, pid);
          const rung = picked[0] ?? last;
          return (
            <>
              {meaning && rung ? <p className="sb-rung-meaning">{rungMeaning(rung, id)}</p> : null}
              {last ? <p className="sb-hint">{fillCopy(CARRY_COPY.lastWeek, { value: label(list, last) })}</p> : null}
            </>
          );
        }}
      />
    );
  };
  return (
    <article className="sb-seed-card" style={hueStyle(id)} aria-label={need?.label ?? id}>
      <h3 className="sb-seed-head">
        <span className="sb-hue-dot" aria-hidden="true" />
        {need?.label ?? id}
      </h3>
      {row(`n-${id}`, NEED_RUNGS)}
      {row(`g-${id}`, NEED_RUNGS, true)}
      {row(`b-${id}`, BREADTH_STOPS)}
    </article>
  );
}
