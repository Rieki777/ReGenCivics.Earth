/**
 * Week 4, "Circles for each human need": the circles that meet a human need
 * of the project's own. The ten ask this on their own picks (c-<need>),
 * which only know the ten; one of the project's own is a small card
 * (shared/boardCards.ts "meets"), one per person per human need, so its
 * circles reach the Village OS card's need links like the ten's do.
 *
 * Each person's taps are their own card: a tap adds or takes off a circle,
 * and taking off the last one takes the card back.
 */
import { useId, useState, type CSSProperties } from "react";
import { meetsCircles } from "@shared/boardCards";
import { CIRCLES, OWN_CIRCLE } from "@shared/humanNeeds";
import { WEEK4_COPY } from "@shared/sessionBoard";
import type { StageProps } from "../stages";
import { saveCard } from "./CardForms";
import { isMyCard, type Game } from "./game";

const CHOICES = [...CIRCLES.map((c) => ({ key: c.key as string, label: c.label as string })), { key: OWN_CIRCLE.key as string, label: OWN_CIRCLE.label as string }];

export function OwnNeedCircles({ props, game, need, label }: { props: StageProps; game: Game; need: string; label: string }) {
  const headId = useId();
  const [busy, setBusy] = useState(false);
  const mineCard = game.cards.meets.find((e) => e.card.need === need && isMyCard(props.mine, e.rowId)) ?? null;
  const picked = mineCard ? meetsCircles(mineCard.card) : [];
  const counts = game.circlesFor[need] ?? {};

  const toggle = async (key: string) => {
    if (busy || !props.canWrite) return;
    const next = picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key];
    setBusy(true);
    try {
      if (!next.length) {
        if (mineCard) await props.actions.removeItem(mineCard.rowId);
      } else {
        await saveCard(props, "meets", { need, circles: next.join(",") }, mineCard?.key ?? null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="sb-seed-card" style={{ ["--sb-hue" as string]: "var(--sb-spring)" } as CSSProperties} aria-label={label}>
      <h3 className="sb-seed-head">
        <span className="sb-hue-dot" aria-hidden="true" />
        {label}
      </h3>
      <section className="sb-prompt sb-compact">
        <div className="sb-prompt-head">
          <h4 id={headId} className="sb-q-t">{WEEK4_COPY.ownNeedCircles}</h4>
        </div>
        <div className="sb-opts" role="group" aria-labelledby={headId} aria-busy={busy || undefined}>
          {CHOICES.map((o) => {
            const on = picked.includes(o.key);
            const n = counts[o.key] ?? 0;
            return (
              <button key={o.key} type="button" className="sb-opt" aria-pressed={on} disabled={!props.canWrite} onClick={() => void toggle(o.key)}>
                <span className="sb-opt-t">{o.label}</span>
                {n > 0 ? <span className="sb-opt-n">{n}<span className="sr-only"> picked this</span></span> : null}
              </button>
            );
          })}
        </div>
      </section>
    </article>
  );
}
