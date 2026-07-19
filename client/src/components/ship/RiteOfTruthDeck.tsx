/**
 * The Rite of Truth deck (Saturday rite, Sanctuary of Love season). Lives inside
 * the Captain's Book at /ship/voyage#rite-of-truth. The crew pulls a card, sits
 * by the fire, and takes turns answering the prompt.
 *
 * The draw is ceremonial, never scored, and touches no tokens or server state.
 * Within a browser session the deck is walked once without repeats: each draw
 * removes that card, so 33 pulls show the whole deck exactly once, then it
 * reshuffles whole. A new session (new tab, closed and reopened) starts a fresh
 * shuffle. State is held in sessionStorage so a card survives a navigation away
 * and back, and clears when the session ends.
 */
import { useCallback, useEffect, useState } from "react";
import { Flame, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shipImg } from "@/pages/ship/shipShared";
import { RITE_OF_TRUTH_CARDS, RITE_DECK_SIZE, type RiteCard } from "@/data/riteOfTruthCards";

const STORAGE_KEY = "ship.rite-of-truth.v1";

interface DeckState {
  /** Card ids in the current shuffled order. */
  order: number[];
  /** How many have been drawn from the current order. */
  pos: number;
  /** The id showing now, or null before the first draw. */
  current: number | null;
}

const ALL_IDS = RITE_OF_TRUTH_CARDS.map((c) => c.id);

/** Fisher-Yates on a copy. Browser Math.random is fine here (ceremonial, not secure). */
function shuffle(ids: number[]): number[] {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readState(): DeckState {
  if (typeof window === "undefined") return { order: [], pos: 0, current: null };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: [], pos: 0, current: null };
    const parsed = JSON.parse(raw) as Partial<DeckState>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter((n) => ALL_IDS.includes(n)) : [];
    const pos = typeof parsed.pos === "number" ? parsed.pos : 0;
    const current = typeof parsed.current === "number" ? parsed.current : null;
    // If the stored deck no longer matches the card set (deck edited), reset.
    if (order.length !== RITE_DECK_SIZE) return { order: [], pos: 0, current: null };
    return { order, pos: Math.min(Math.max(pos, 0), order.length), current };
  } catch {
    return { order: [], pos: 0, current: null };
  }
}

function writeState(state: DeckState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage can throw in private mode; the draw still works in-memory.
  }
}

/**
 * The draw hook. Returns the current card, how far through this pass the crew is,
 * and actions to draw the next card or reshuffle the whole deck.
 */
function useRiteDraw() {
  const [state, setState] = useState<DeckState>(() => ({ order: [], pos: 0, current: null }));

  // Hydrate from sessionStorage after mount (keeps SSR/first paint stable).
  useEffect(() => {
    setState(readState());
  }, []);

  const update = useCallback((next: DeckState) => {
    setState(next);
    writeState(next);
  }, []);

  const draw = useCallback(() => {
    setState((prev) => {
      let { order, pos } = prev;
      // Start of a session, or the whole deck has been walked: reshuffle.
      if (order.length !== RITE_DECK_SIZE || pos >= order.length) {
        order = shuffle(ALL_IDS);
        pos = 0;
      }
      const id = order[pos];
      const next: DeckState = { order, pos: pos + 1, current: id };
      writeState(next);
      return next;
    });
  }, []);

  const reshuffle = useCallback(() => {
    update({ order: shuffle(ALL_IDS), pos: 0, current: null });
  }, [update]);

  const current: RiteCard | null =
    state.current == null ? null : RITE_OF_TRUTH_CARDS.find((c) => c.id === state.current) ?? null;

  return {
    current,
    /** How many cards have been drawn in the current pass (1..33). */
    drawn: state.pos,
    /** Cards still unseen in the current pass. */
    remaining: state.order.length === RITE_DECK_SIZE ? RITE_DECK_SIZE - state.pos : RITE_DECK_SIZE,
    passComplete: state.order.length === RITE_DECK_SIZE && state.pos >= RITE_DECK_SIZE,
    draw,
    reshuffle,
  };
}

function DepthTag({ depth }: { depth: RiteCard["depth"] }) {
  const deep = depth === "Deep";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest " +
        (deep
          ? "bg-[#2a2350] text-[#c9c0ff] dark:bg-[#c9c0ff]/15 dark:text-[#d7cfff]"
          : "bg-[#ffd700]/20 text-[#8a6a0b] dark:bg-[#ffd700]/15 dark:text-[#ffe07a]")
      }
    >
      {deep ? <Flame className="w-3 h-3" aria-hidden="true" /> : <Sparkles className="w-3 h-3" aria-hidden="true" />}
      {depth}
    </span>
  );
}

/** The card face. The art degrades to a themed card-back if the image is missing. */
function RiteCardFace({ card }: { card: RiteCard }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <figure className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-[#ffd700]/40 bg-gradient-to-b from-[#1c2a1f] to-[#0d1712] shadow-[0_0_40px_rgba(255,215,0,0.18)]">
      <div className="relative aspect-[2/3] w-full">
        {imgErr ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#2f5d3a] via-[#4a7c59] to-[#8a5a2b] text-white/85 p-6 text-center">
            <Flame className="w-10 h-10 text-[#ffd700]" aria-hidden="true" />
            <span className="font-serif text-2xl leading-tight">{card.title}</span>
            <span className="text-xs uppercase tracking-widest text-white/60">Art coming aboard</span>
          </div>
        ) : (
          <img
            src={shipImg(card.image)}
            alt={`Oracle card: ${card.title}`}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <figcaption className="space-y-3 p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-widest text-[#ffd700]/80">{card.section}</p>
          <DepthTag depth={card.depth} />
        </div>
        <h3 className="font-serif text-2xl font-bold leading-tight">{card.title}</h3>
        <p className="border-l-2 border-[#ffd700]/50 pl-3 text-sm italic text-white/75">{card.epigraph}</p>
        <p className="text-base leading-relaxed text-white/95">{card.prompt}</p>
      </figcaption>
    </figure>
  );
}

export function RiteOfTruthDeck() {
  const { current, drawn, remaining, passComplete, draw, reshuffle } = useRiteDraw();

  return (
    <div className="max-w-2xl">
      <p className="text-foreground/80 mb-5">
        Pull a card, sit by the fire, and take turns. This is the day the week has been softening you for. The draw is
        just a ritual, nothing is scored. The deck walks all {RITE_DECK_SIZE} cards once before any repeats, then it
        shuffles fresh.
      </p>

      {current ? (
        <RiteCardFace card={current} />
      ) : (
        <div className="mx-auto flex w-full max-w-sm aspect-[2/3] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-[#ffd700]/40 bg-gradient-to-b from-[#1c2a1f] to-[#0d1712] p-8 text-center text-white/80">
          <Flame className="w-12 h-12 text-[#ffd700]" aria-hidden="true" />
          <p className="font-serif text-xl">The deck is shuffled and waiting.</p>
          <p className="text-sm text-white/60">Draw when the crew is ready.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={draw} className="min-h-11 bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d]">
          <Flame className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {current ? "Draw the next card" : "Draw a card"}
        </Button>
        {drawn > 0 && (
          <Button onClick={reshuffle} variant="outline" className="min-h-11">
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" /> Reshuffle the deck
          </Button>
        )}
        {drawn > 0 && (
          <p className="text-sm text-muted-foreground">
            {passComplete
              ? `All ${RITE_DECK_SIZE} drawn this pass. The next draw shuffles a fresh deck.`
              : `${drawn} of ${RITE_DECK_SIZE} drawn, ${remaining} still in the deck.`}
          </p>
        )}
      </div>
    </div>
  );
}
