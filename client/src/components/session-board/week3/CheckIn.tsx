/**
 * Stage 2, "Tap your project" (Rye, 2026-10-13: anyone can tap any project,
 * no sign-in needed).
 *
 * Tiles are derived live on the server (`checkInOptions`): this board's cards,
 * then earlier weeks' cards, then public Season 2 applications with no card
 * here yet, so self-paced visitors always see current projects and nobody has
 * to import anything. A tap finds or creates this board's card and checks the
 * person in; the pick lives in this browser, and every later answer and
 * question carries it. "Add your project" checks you in too, and "I'm here to
 * learn today" answers for the room.
 *
 * Guests read where their answers go (`CHECKIN_COPY.saved`) and get the site's
 * own sign-in. Signing in claims this browser's guest rows for the account
 * (useClaimGuest, in the hook), so they show on the profile under Submissions.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BOARD_LIMITS, CHECKIN_COPY, fillCopy, foldProjectName, tileRef } from "@shared/sessionBoard";
import { AuthDialog } from "@/components/AuthDialog";
import { trpc } from "@/lib/trpc";
import { useCheckInTiles } from "../useSessionBoard";
import type { StageProps } from "../stages";
import { myCardId } from "./answers";
import { NEW_TAB, SpokenLine, StageHead } from "./parts";

/** One tile, as `sessionBoard.checkInOptions` returns it (API_CONTRACT.md 3.6). */
export type CheckInTile = {
  ref: string;
  name: string;
  place: string | null;
  cardId: number | null;
  from: "board" | "application" | "earlier";
  fromWeek: number | null;
  here: number;
};

/** Above this many tiles, a filter box shows. */
export const TILE_FILTER_AT = 12;

/** Tiles whose folded name holds the folded query; yours first, the server's order kept otherwise. */
export function filterTiles<T extends { name: string; cardId: number | null }>(tiles: readonly T[], query: string, yours: (t: T) => boolean): T[] {
  const q = foldProjectName(query);
  const hit = q ? tiles.filter((t) => foldProjectName(t.name).includes(q)) : [...tiles];
  return [...hit.filter(yours), ...hit.filter((t) => !yours(t))];
}

function AddAndCheckIn({ props, onDone }: { props: StageProps; onDone: () => void }) {
  const { actions, displayName, setDisplayName } = props;
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const r = await actions.addProject({ name: n, place: place.trim() || undefined });
      const id = r?.id;
      if (id) {
        // A new card gets its check-in mark too, so it counts as here, on the
        // Close and on this person's profile (contract check 14).
        await actions.checkIn(tileRef({ from: "board", cardId: id }), { name: n, cardId: id });
        setName("");
        setPlace("");
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-panel sb-add-project" onSubmit={submit}>
      <p className="sb-label">Add your project</p>
      <SpokenLine value={name} onChange={setName} placeholder={CHECKIN_COPY.addName} max={BOARD_LIMITS.projectName} label={CHECKIN_COPY.addName} />
      <SpokenLine value={place} onChange={setPlace} placeholder={CHECKIN_COPY.addPlace} max={BOARD_LIMITS.place} label={CHECKIN_COPY.addPlace} />
      <SpokenLine value={displayName} onChange={setDisplayName} placeholder={CHECKIN_COPY.addYourName} max={BOARD_LIMITS.displayName} label="Your name" autoComplete="name" />
      <button className="sb-btn sb-primary" type="submit" disabled={busy || !name.trim()}>{busy ? CHECKIN_COPY.joining : CHECKIN_COPY.addButton}</button>
      <p className="sb-hint">
        {CHECKIN_COPY.addHint}{" "}
        <a className="sb-link" href="/apply" target="_blank" rel="noopener noreferrer">{CHECKIN_COPY.applyLink}{NEW_TAB}</a>
      </p>
    </form>
  );
}

/**
 * Facilitators only: link a card to its application, merge a stray into the
 * card to keep (its answers and check-ins move with it), and hide a card
 * nobody has answered on.
 */
function CardCare({ props }: { props: StageProps }) {
  const { board, actions } = props;
  const apps = board.facilitatorLists?.applications ?? [];
  if (!board.projects.length) return null;
  const kept = board.projects.filter((p) => !p.hidden && p.id > 0);
  return (
    <details className="sb-panel sb-care">
      <summary>Facilitators: link, merge and hide cards</summary>
      <p className="sb-hint">{CHECKIN_COPY.care}</p>
      <ul className="sb-care-list">
        {board.projects.map((p) => (
          <li key={p.id} className={p.hidden ? "sb-r-hidden" : undefined}>
            <span className="sb-care-name">{p.name}</span>
            <span className="sb-row">
              {apps.length ? (
                <select className="sb-field" aria-label={`${CHECKIN_COPY.linkSelect}: ${p.name}`} value={p.applicationId ?? ""} onChange={(e) => actions.curateProject({ projectId: p.id, applicationId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{CHECKIN_COPY.linkSelect}</option>
                  {apps.map((a) => <option key={a.id} value={a.id}>{a.projectName}</option>)}
                </select>
              ) : null}
              {!p.hidden && p.id > 0 && kept.length > 1 ? (
                <select
                  className="sb-field"
                  aria-label={`${CHECKIN_COPY.mergeSelect}: ${p.name}`}
                  value=""
                  onChange={(e) => {
                    const into = Number(e.target.value);
                    if (into > 0) actions.mergeProject(p.id, into);
                  }}
                >
                  <option value="">{CHECKIN_COPY.mergeSelect}</option>
                  {kept.filter((k) => k.id !== p.id).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              ) : null}
              <button type="button" className="sb-btn sb-small sb-ghost" aria-label={`${p.hidden ? "Show it" : "Hide it"}: ${p.name}`} onClick={() => actions.curateProject({ projectId: p.id, hidden: !p.hidden })}>
                {p.hidden ? "Show it" : "Hide it"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function CheckIn(props: StageProps) {
  const { board, week, stages, index, facilitator, canWrite, mine, actions, myProject, setMyProject, displayName, setDisplayName, signedIn } = props;
  const stage = stages[index];
  const { tiles, loading, failed, retry } = useCheckInTiles(week, board.version);
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const utils = trpc.useUtils();
  const pickedId = myCardId(myProject);
  const showTiles = choosing || myProject == null;
  // After a pick, bring "You're with ..." into view (on a phone the tiles were
  // above the fold) and move focus there, since the tapped tile is gone. After
  // "Change project", focus goes to the first tile. The first render moves nothing.
  const pickedRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<HTMLUListElement | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!showTiles) {
      pickedRef.current?.scrollIntoView?.({ block: "nearest" });
      pickedRef.current?.focus?.({ preventScroll: true });
    } else {
      tilesRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus?.({ preventScroll: true });
    }
  }, [showTiles]);
  const yours = (t: CheckInTile) => t.cardId != null && (t.cardId === pickedId || mine.projectIds.has(t.cardId));
  const shown = filterTiles(tiles as CheckInTile[], query, yours);

  const tap = async (t: CheckInTile) => {
    if (pending || !canWrite) return;
    setPending(t.ref);
    // A tile that is already a card here checks in at once; the hook saves the mark behind it.
    if (t.cardId != null) setChoosing(false);
    try {
      const r = await actions.checkIn(t.ref, { name: t.name, cardId: t.cardId });
      if (r) {
        setChoosing(false);
        setAdding(false);
      }
    } finally {
      setPending(null);
    }
  };

  const pickedName = myProject?.kind === "project"
    ? board.projects.find((p) => p.id === myProject.cardId)?.name ?? myProject.name
    : null;

  return (
    <>
      <StageHead stages={stages} index={index} title={stage.name} lede={stage.lede} week={week} />
      {/* Always mounted, so a screen reader hears the pick when it changes. */}
      <p className="sr-only" aria-live="polite">{pickedName ? fillCopy(CHECKIN_COPY.picked, { name: pickedName }) : myProject?.kind === "learn" ? CHECKIN_COPY.learnChip : ""}</p>
      <div className="sb-checkin">
        <div className="sb-col">
          {!showTiles && myProject ? (
            <div ref={pickedRef} className="sb-panel sb-picked" tabIndex={-1}>
              {pickedName ? (
                <p className="sb-picked-name">{fillCopy(CHECKIN_COPY.picked, { name: pickedName })}</p>
              ) : (
                <>
                  <span className="sb-for-chip">{CHECKIN_COPY.learnChip}</span>
                  <p>{CHECKIN_COPY.learnLine}</p>
                </>
              )}
              <button type="button" className="sb-btn sb-ghost" onClick={() => setChoosing(true)}>{CHECKIN_COPY.change}</button>
              <label className="sb-hint" htmlFor="sb-checkin-name">{CHECKIN_COPY.nameField}</label>
              <input id="sb-checkin-name" className="sb-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={BOARD_LIMITS.displayName} autoComplete="name" placeholder={CHECKIN_COPY.addYourName} />
            </div>
          ) : null}

          {showTiles ? (
            <>
              {tiles.length > TILE_FILTER_AT ? (
                <input
                  type="search"
                  className="sb-field sb-tile-filter"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={CHECKIN_COPY.filter}
                  aria-label={CHECKIN_COPY.filter}
                  autoComplete="off"
                />
              ) : null}
              {shown.length ? (
                <ul ref={tilesRef} className="sb-tiles" aria-label="Projects at the table">
                  {shown.map((t) => {
                    const picked = t.cardId != null && t.cardId === pickedId;
                    const busy = pending === t.ref;
                    return (
                      <li key={t.ref}>
                        <button
                          type="button"
                          className="sb-tile"
                          aria-pressed={picked}
                          aria-busy={busy || undefined}
                          disabled={!canWrite || (pending != null && !busy)}
                          onClick={() => void tap(t)}
                        >
                          <span className="sb-tile-top">
                            <span className="sb-tile-name">{t.name}</span>
                            {yours(t) ? <span className="sb-tile-tag">{CHECKIN_COPY.yours}</span> : null}
                          </span>
                          {t.place ? <span className="sb-tile-place">{t.place}</span> : null}
                          {busy || t.here > 0 ? (
                            <span className="sb-tile-meta">{busy ? CHECKIN_COPY.joining : fillCopy(CHECKIN_COPY.here, { n: t.here })}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : failed ? (
                <p className="sb-empty">
                  {CHECKIN_COPY.loadFailed}{" "}
                  <button type="button" className="sb-btn sb-small" onClick={retry}>{CHECKIN_COPY.retry}</button>
                </p>
              ) : (
                <p className="sb-empty">{loading ? "Finding the projects..." : query ? "No project by that name yet. Add yours below." : CHECKIN_COPY.empty}</p>
              )}
              {canWrite ? (
                <div className="sb-row sb-checkin-more">
                  <button type="button" className="sb-btn" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>{CHECKIN_COPY.add}</button>
                  <button
                    type="button"
                    className="sb-btn sb-ghost"
                    aria-pressed={myProject?.kind === "learn"}
                    onClick={() => { setMyProject({ kind: "learn" }); setChoosing(false); setAdding(false); }}
                  >
                    {CHECKIN_COPY.learn}
                  </button>
                </div>
              ) : null}
              {adding && canWrite ? <AddAndCheckIn props={props} onDone={() => { setAdding(false); setChoosing(false); }} /> : null}
            </>
          ) : null}
        </div>

        <aside className="sb-col sb-checkin-side">
          <div className="sb-panel sb-saved-where">
            <p>{CHECKIN_COPY.saved}</p>
            {signedIn ? null : (
              <button type="button" className="sb-link sb-signin" onClick={() => setAuthOpen(true)}>{CHECKIN_COPY.signIn}</button>
            )}
          </div>
          <p className="sb-hint">{CHECKIN_COPY.footnote}</p>
          {facilitator ? <CardCare props={props} /> : null}
        </aside>
      </div>
      {signedIn ? null : (
        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          onLogin={() => {
            // signedIn flips, and the hook's useClaimGuest brings this browser's answers along.
            void utils.auth.me.invalidate();
            setAuthOpen(false);
          }}
        />
      )}
    </>
  );
}
