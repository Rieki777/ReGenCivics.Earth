/**
 * The live session board's data (ADR-68). Every open page polls one small
 * number (`sessionBoard.version`) and fetches the whole board only when it
 * moves, so a room of thirty people costs a few tiny requests a second.
 *
 * A tap paints on the cached board in the same turn (`boardWriter`), then the
 * save runs behind it. While a save is in flight the version poll does not
 * refetch, so a slower response cannot flip a chip back. When the queue is
 * idle, one read brings in everyone else's taps. A failed save that nothing
 * newer replaced rolls the cache back and says so.
 *
 * Guests have no account, so the browser keeps a random key that owns what
 * they write. It is the same key the Season Schedule uses, so one person is
 * one person across both pages. It only travels in mutation bodies, never in
 * a URL or a log. Once someone signs in on a browser that holds a key, that
 * key's rows move to their account (`useClaimGuest`), so their answers show
 * on their profile under Submissions.
 *
 * Week 3 onward (API_CONTRACT section 4): the project this person tapped
 * (`myProject`, kept per week in this browser), answers to each stage's
 * prompts (`answerPick`, `answerNote`), questions for the wall (`ask`), and
 * checking in with a project (`checkIn`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PROMPT_COPY,
  askBlock,
  boardStages,
  promptFull,
  promptMax,
  promptsForWeek,
  type BoardOfferKey,
  type NoteItemKind,
} from "@shared/sessionBoard";
import type { CardRef, CarryData } from "@shared/boardCarry";
import { NEEDS_KEYS, perNeedKeys } from "@shared/humanNeeds";
import { SUBMISSIONS_COPY } from "@shared/boardEntries";
import {
  adjustAnswerCount,
  adjustCheckins,
  adjustMap,
  adjustVotes,
  createBoardWriter,
  ensureProject,
  patchBoardAction,
  patchItem,
  patchProject,
  removeItems,
  type BoardWriter,
} from "./boardWriter";

const VOTER_KEY_STORAGE = "season-voter-key";
const VOTER_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const NAME_STORAGE = "session-board:name";
const LAST_PROJECT_STORAGE = "session-board:last-project";
const projectStorageKey = (week: number) => `session-board:project:${week}`;

function randomKeyBody(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }
}

/** A random id this browser keeps. It is a bearer credential. */
export function sessionVoterKey(): string {
  const fresh = "s" + randomKeyBody();
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && VOTER_KEY_RE.test(existing)) return existing;
    window.localStorage.setItem(VOTER_KEY_STORAGE, fresh);
  } catch {
    // Private windows and blocked storage: the key lives for this page load only.
  }
  return fresh;
}

/** The key this browser already keeps, or null. Never makes one. */
function storedVoterKey(): string | null {
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    return existing && VOTER_KEY_RE.test(existing) ? existing : null;
  } catch {
    return null;
  }
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: keep it for this visit only */
  }
}

function dropStored(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing was kept */
  }
}

/**
 * The project this browser checked in with on an earlier week, for "Last week
 * you were with X. Same today?" (Week 4 on). Null when it was this week or
 * nothing is kept.
 */
export function readLastProject(week: number): CardRef | null {
  try {
    const raw = JSON.parse(readStored(LAST_PROJECT_STORAGE) || "null") as { name?: unknown; cardId?: unknown; week?: unknown } | null;
    if (!raw || typeof raw.name !== "string" || typeof raw.cardId !== "number" || typeof raw.week !== "number") return null;
    if (raw.week >= week || raw.cardId <= 0) return null;
    return { week: raw.week, cardId: raw.cardId, name: raw.name };
  } catch {
    return null;
  }
}

/** What a board carries from earlier weeks (shared/boardCarry.ts), for the Week 4 stages. */
export type BoardCarry = {
  /** True on a week whose board reads earlier weeks' answers. */
  on: boolean;
  data: CarryData | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  /** Earlier cards this person played for, newest first (from the server). */
  earlier: CardRef[];
  /** The earlier card this browser last checked in with, if any. */
  last: CardRef | null;
};

/** The project this person is answering for today, or "here to learn", or not chosen yet. */
export type MyProject = { kind: "project"; cardId: number; name: string } | { kind: "learn" } | null;

/** What this browser remembers for a week. `undefined` means nothing kept yet. */
function readMyProject(week: number): MyProject | undefined {
  const raw = readStored(projectStorageKey(week));
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as { cardId?: unknown; name?: unknown; learn?: unknown };
    if (v && v.learn === true) return { kind: "learn" };
    if (v && typeof v.cardId === "number" && v.cardId > 0 && typeof v.name === "string") {
      return { kind: "project", cardId: v.cardId, name: v.name };
    }
  } catch {
    /* an old or broken value: treat as nothing kept */
  }
  return undefined;
}

function writeMyProject(week: number, p: MyProject) {
  if (!p) dropStored(projectStorageKey(week));
  else if (p.kind === "learn") writeStored(projectStorageKey(week), JSON.stringify({ learn: true }));
  else writeStored(projectStorageKey(week), JSON.stringify({ cardId: p.cardId, name: p.name }));
}

export type Mine = {
  itemIds: Set<number>;
  projectIds: Set<number>;
  votes: Set<number>;
  hands: Set<number>;
  /** Offers this person raised a hand for ("coach", "build"). */
  offers: Set<string>;
  /** This person's own anonymous answers, key to option. The board shows the room only counts. */
  anon: Map<string, string>;
  /** Cards this person checked in with on this board. */
  checkins: Set<number>;
};

const emptyMine = (): Mine => ({
  itemIds: new Set(),
  projectIds: new Set(),
  votes: new Set(),
  hands: new Set(),
  offers: new Set(),
  anon: new Map(),
  checkins: new Set(),
});

function errorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message;
  if (msg && !/^\[|fetch|network/i.test(msg)) return msg;
  return "That didn't save. Check your connection and try again.";
}

/** Temp rows painted before a save have negative ids, distinct even within one millisecond. */
let tempSeq = 0;
function nextTempId(): number {
  tempSeq = (tempSeq + 1) % 1000;
  return -(Date.now() * 1000 + tempSeq);
}

/**
 * Answers that one take-back can cascade through (a human need, its seed and
 * its per-need answers) share one queue per project, so a seed never reaches
 * the server before its pick, and an un-pick never lands before an answer it
 * should have taken with it. Every other prompt queues on its own.
 */
function answerQueue(key: string | null, projectId: number | null): string {
  const k = key ?? "";
  const family = k === NEEDS_KEYS.pick || k === NEEDS_KEYS.seed || /^[ngbm]-/.test(k) ? "needs" : k;
  return `answer:${family}:${projectId ?? "room"}`;
}

type ProjectWrite = {
  projectId: number;
  name?: string;
  place?: string;
  url?: string;
  phase?: "seed" | "root" | "sprout" | "grow" | "fruit" | null;
  whereNow?: string;
  ready?: string[];
  nextMove?: string;
};

type CurateProjectWrite = {
  projectId: number;
  shared?: boolean;
  hidden?: boolean;
  applicationId?: number | null;
};

type CurateItemWrite = {
  itemId: number;
  theme?: "people" | "decide" | "money" | "land" | "story" | "tools" | "care" | null;
  chosen?: boolean;
  roomVotes?: number;
  hidden?: boolean;
};

type ClaimOutcome = { moved: number; merged: number };

/** One claim per signed-in person per page load, shared by every hook that asks. */
const claims = new Map<number, { promise: Promise<ClaimOutcome | null>; settled: boolean }>();

const CLAIM_DECLINED_STORAGE = (userId: number) => `session-board:claim-declined:${userId}`;

/**
 * Sonner draws toast buttons 24px tall. These two decide whose answers move,
 * often on a phone, so they get a full 44px target (pnpm ui:audit, 2026-10-14).
 * Inline, because the toast renders outside every page's stylesheet scope.
 */
const CLAIM_BUTTON = { minHeight: 44, height: "auto", paddingInline: 14, fontSize: 14 } as const;

/**
 * "We found N answers given as a guest in this browser. Add them?" Resolves
 * "yes", "no" (Not mine), or "later" when the toast is closed without a choice.
 */
function askToClaim(rows: number): Promise<"yes" | "no" | "later"> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: "yes" | "no" | "later") => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      toast(rows === 1 ? SUBMISSIONS_COPY.claimAskOne : SUBMISSIONS_COPY.claimAsk.replace("{n}", String(rows)), {
        duration: Infinity,
        action: { label: SUBMISSIONS_COPY.claimYes, onClick: () => done("yes") },
        cancel: { label: SUBMISSIONS_COPY.claimNo, onClick: () => done("no") },
        actionButtonStyle: CLAIM_BUTTON,
        cancelButtonStyle: CLAIM_BUTTON,
        onDismiss: () => done("later"),
      });
    } catch {
      done("later");
    }
  });
}

/**
 * Offers to bring this browser's guest rows onto the signed-in person's
 * profile, once per page load. It reads useAuth() itself and acts only once a
 * user is known, including a sign-in that happens on this page through
 * AuthDialog (no reload). It READS `season-voter-key` and never mints one: no
 * stored key, no call. It asks first (a count only, nothing moves), because a
 * shared tablet or family laptop holds other people's guest answers too; only
 * a yes claims. "Not mine" is remembered for that account and key in this
 * browser. A failed claim is silent and is offered again on the next page
 * load. `onClaimed` hears about a claim that finished while this hook was
 * mounted.
 */
export function useClaimGuest(onClaimed?: (r: ClaimOutcome) => void): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const claimM = trpc.sessionBoard.claimGuest.useMutation();
  const countM = trpc.sessionBoard.guestRows.useMutation();
  const utils = trpc.useUtils();
  const mutateRef = useRef(claimM.mutateAsync);
  mutateRef.current = claimM.mutateAsync;
  const countRef = useRef(countM.mutateAsync);
  countRef.current = countM.mutateAsync;
  const utilsRef = useRef(utils);
  utilsRef.current = utils;
  const cbRef = useRef(onClaimed);
  cbRef.current = onClaimed;

  useEffect(() => {
    if (!userId) return;
    let entry = claims.get(userId);
    let fresh = false;
    if (!entry) {
      const voterKey = storedVoterKey();
      if (!voterKey) return;
      if (readStored(CLAIM_DECLINED_STORAGE(userId)) === voterKey) return;
      fresh = true;
      const made: { promise: Promise<ClaimOutcome | null>; settled: boolean } = { promise: Promise.resolve(null), settled: false };
      made.promise = (async (): Promise<ClaimOutcome | null> => {
        const { rows } = await countRef.current({ voterKey });
        if (rows <= 0) return null;
        const answer = await askToClaim(rows);
        if (answer === "no") writeStored(CLAIM_DECLINED_STORAGE(userId), voterKey);
        if (answer !== "yes") return null;
        const r = await mutateRef.current({ voterKey });
        // Whichever view claimed, a profile list cached before the claim is now
        // out of date: mark it so the Submissions tab reads the moved rows.
        if (r.moved > 0 || r.merged > 0) void utilsRef.current.sessionBoard.mySubmissions.invalidate();
        return { moved: r.moved, merged: r.merged };
      })()
        .catch(() => null)
        .finally(() => {
          made.settled = true;
        });
      claims.set(userId, made);
      entry = made;
    }
    // Claimed earlier on this page load, before this view mounted: nothing new to report.
    if (entry.settled && !fresh) return;
    let live = true;
    void entry.promise.then((r) => {
      if (live && r) cbRef.current?.(r);
    });
    return () => {
      live = false;
    };
  }, [userId]);
}

/** The check-in tiles, refetched when the board's version moves (at most every 10 s). */
export function useCheckInTiles(week: number, version: number | undefined) {
  const q = trpc.sessionBoard.checkInOptions.useQuery(
    { week },
    { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  );
  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;
  const fetchedAt = q.dataUpdatedAt;
  const seen = useRef(version);
  useEffect(() => {
    if (version == null) return;
    if (seen.current == null) {
      seen.current = version;
      return;
    }
    if (seen.current === version) return;
    seen.current = version;
    const wait = Math.max(0, 10_000 - (Date.now() - (fetchedAt || 0)));
    const t = setTimeout(() => void refetchRef.current(), wait);
    return () => clearTimeout(t);
  }, [version, fetchedAt]);
  return {
    tiles: q.data?.tiles ?? [],
    loading: q.isLoading,
    /** True when the tiles couldn't load and none are cached, so the page says so instead of "nobody's here". */
    failed: q.isError && !q.data,
    retry: () => void refetchRef.current(),
  };
}

export function useSessionBoard(week: number) {
  const utils = trpc.useUtils();
  const voterKey = useMemo(sessionVoterKey, []);
  const [displayName, setDisplayNameState] = useState(() => readStored(NAME_STORAGE));
  const setDisplayName = useCallback((v: string) => {
    setDisplayNameState(v);
    writeStored(NAME_STORAGE, v);
  }, []);
  const prompts = useMemo(() => promptsForWeek(week), [week]);

  const versionQ = trpc.sessionBoard.version.useQuery(
    { week },
    { refetchInterval: 2500, refetchIntervalInBackground: false, staleTime: 0, retry: 1 },
  );
  const boardQ = trpc.sessionBoard.get.useQuery(
    { week },
    { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  );

  // Week 4 on: what each card carries from earlier weeks. Read again when the
  // board moves (a check-in or a facilitator's confirm can add a link), at
  // most every 4 seconds.
  const carries = useMemo(() => boardStages(week).some((s) => s.kind === "needs" && s.step === "carry"), [week]);
  const carryQ = trpc.sessionBoard.carry.useQuery(
    { week },
    { enabled: carries, staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  );
  const carryRefetch = useRef(carryQ.refetch);
  carryRefetch.current = carryQ.refetch;
  const carrySeen = useRef<number | undefined>(undefined);
  // Read through a ref: as a dependency, an older fetch landing would clear the
  // timer for a newer version and the refresh would never run.
  const carryAt = useRef(0);
  carryAt.current = carryQ.dataUpdatedAt;
  const boardVersionForCarry = versionQ.data?.version;
  useEffect(() => {
    if (!carries || boardVersionForCarry == null) return;
    if (carrySeen.current == null) {
      carrySeen.current = boardVersionForCarry;
      return;
    }
    if (carrySeen.current === boardVersionForCarry) return;
    carrySeen.current = boardVersionForCarry;
    const wait = Math.max(0, 4_000 - (Date.now() - (carryAt.current || 0)));
    const t = setTimeout(() => void carryRefetch.current(), wait);
    return () => clearTimeout(t);
  }, [carries, boardVersionForCarry]);

  const syncRef = useRef<() => void>(() => {});
  const failRef = useRef<(err: unknown, info: { latest: boolean }) => void>(() => {});
  const writer = useMemo(
    () => createBoardWriter({
      onIdle: () => {
        syncRef.current();
        if (mineDirty.current) refreshMineRef.current();
      },
      onFail: (err, info) => failRef.current(err, info),
    }),
    [week],
  );
  const writerRef = useRef<BoardWriter>(writer);
  writerRef.current = writer;

  // The last board we know the server confirmed. Optimistic paints do not
  // replace it, so a failed save can put that picture back.
  const serverSnap = useRef(boardQ.data ?? null);
  useEffect(() => {
    if (boardQ.data?.week === week && !serverSnap.current && writer.inflight() === 0) {
      serverSnap.current = boardQ.data;
    }
  }, [boardQ.data, writer, week]);

  const sync = useCallback(() => {
    const current = writerRef.current;
    if (current.inflight() > 0) return;
    const seen = current.epoch();
    void (async () => {
      try {
        const fresh = await utils.client.sessionBoard.get.query({ week });
        if (writerRef.current.epoch() !== seen || writerRef.current.inflight() > 0) return;
        serverSnap.current = fresh;
        utils.sessionBoard.get.setData({ week }, fresh);
        utils.sessionBoard.version.setData({ week }, { version: fresh.version, status: fresh.status });
      } catch {
        /* the next version poll tries again */
      }
    })();
  }, [utils, week]);
  syncRef.current = sync;

  // Fetch the board again whenever the version it was read at falls behind,
  // unless a tap is still saving. That response would be older than the chip.
  const liveVersion = versionQ.data?.version;
  const boardVersion = boardQ.data?.version;
  useEffect(() => {
    if (liveVersion == null || boardVersion == null) return;
    if (liveVersion === boardVersion) return;
    if (writer.inflight() > 0) return;
    sync();
  }, [liveVersion, boardVersion, writer, sync]);

  // Everyone counts from the server's clock, so the breath and the timers match.
  const offset = useRef(0);
  useEffect(() => {
    if (boardQ.data) offset.current = boardQ.data.serverNow - boardQ.dataUpdatedAt;
  }, [boardQ.data, boardQ.dataUpdatedAt]);
  const serverNow = useCallback(() => Date.now() + offset.current, []);

  // What this person has on the board. The ref is the same picture, readable
  // in the same turn as a tap, so two quick taps decide from each other.
  const [mine, setMineState] = useState<Mine>(emptyMine);
  const mineRef = useRef<Mine>(mine);
  const setMine = useCallback((fn: (m: Mine) => Mine) => {
    const next = fn(mineRef.current);
    mineRef.current = next;
    setMineState(next);
  }, []);
  const [whoCheckins, setWhoCheckins] = useState<number[]>([]);
  const [whoEarlier, setWhoEarlier] = useState<CardRef[]>([]);
  const whoami = trpc.sessionBoard.whoami.useMutation();
  const whoamiRef = useRef(whoami.mutateAsync);
  whoamiRef.current = whoami.mutateAsync;
  // A read that came back while a tap was still saving is set aside, and read
  // again once the writer is idle, so `mine` never stays at this visit's rows.
  const mineDirty = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshMine = useCallback((retry = true) => {
    mineDirty.current = false;
    void whoamiRef.current({ week, voterKey })
      .then((r) => {
        if (writerRef.current.inflight() > 0) {
          mineDirty.current = true;
          return;
        }
        setMine(() => ({
          itemIds: new Set(r.itemIds),
          projectIds: new Set(r.projectIds),
          votes: new Set(r.votes),
          hands: new Set(r.hands),
          offers: new Set(r.offers),
          anon: new Map(r.anon.map((a) => [a.key, a.option] as const)),
          checkins: new Set(r.checkins),
        }));
        setWhoCheckins(r.checkins);
        setWhoEarlier(r.earlier ?? []);
      })
      .catch(() => {
        // The page still works; edit and take-back offers stay hidden until
        // one retry a few seconds on brings them in.
        if (!retry) return;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          refreshMineRef.current(false);
        }, 4000);
      });
  }, [week, voterKey, setMine]);
  const refreshMineRef = useRef(refreshMine);
  refreshMineRef.current = refreshMine;
  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);
  useEffect(() => {
    setMine(() => emptyMine());
    setWhoCheckins([]);
    setWhoEarlier([]);
    refreshMine();
  }, [refreshMine, setMine]);
  // Signing in (or out) on this page changes who "mine" is: the server now
  // counts the account's rows too, so read them again.
  const { user: authUser } = useAuth();
  const authId = authUser?.id ?? null;
  const seenAuth = useRef(authId);
  useEffect(() => {
    if (seenAuth.current === authId) return;
    seenAuth.current = authId;
    refreshMine();
    syncRef.current();
  }, [authId, refreshMine]);

  // The project this person tapped, kept per week in this browser.
  const [picked, setPicked] = useState<MyProject | undefined>(() => readMyProject(week));
  const pickedWeek = useRef(week);
  useEffect(() => {
    if (pickedWeek.current === week) return;
    pickedWeek.current = week;
    setPicked(readMyProject(week));
  }, [week]);
  const setMyProject = useCallback((p: MyProject) => {
    setPicked(p);
    writeMyProject(pickedWeek.current, p);
  }, []);
  const projects = boardQ.data?.week === week ? boardQ.data.projects : null;
  const myProject = useMemo<MyProject>(() => {
    const lastCheckin = (): MyProject => {
      if (!projects) return null;
      for (let i = whoCheckins.length - 1; i >= 0; i--) {
        const card = projects.find((p) => p.id === whoCheckins[i] && !p.hidden);
        if (card) return { kind: "project", cardId: card.id, name: card.name };
      }
      return null;
    };
    // Nothing kept in this browser: a signed-in person on a new device
    // carries on with the project they last checked in with.
    if (picked === undefined) return lastCheckin();
    if (picked?.kind === "project" && projects) {
      // A card that is gone or hidden (merged into another, say) falls to the
      // card this person's check-in now sits on, else to no pick.
      const card = projects.find((p) => p.id === picked.cardId);
      if (!card || card.hidden) return lastCheckin();
      return { kind: "project", cardId: card.id, name: card.name };
    }
    return picked;
  }, [picked, projects, whoCheckins]);
  // When the tapped card is hidden (a facilitator merged it), the check-in
  // moved with its answers: read where it went.
  const pickedGone = picked?.kind === "project" && !!projects && !projects.some((p) => p.id === picked.cardId && !p.hidden);
  useEffect(() => {
    if (pickedGone) refreshMine();
  }, [pickedGone, refreshMine]);

  const paint = useCallback((fn: (old: NonNullable<typeof boardQ.data>) => NonNullable<typeof boardQ.data>) => {
    utils.sessionBoard.get.setData({ week }, (old) => (old ? fn(old) : old));
  }, [utils, week]);

  failRef.current = (err, info) => {
    if (!info.latest) return;
    toast.error(errorMessage(err));
    // This job is still counted, so 1 means nothing else is saving.
    if (writerRef.current.inflight() <= 1 && serverSnap.current) {
      utils.sessionBoard.get.setData({ week }, serverSnap.current);
      refreshMine();
    }
  };

  // Rows that come over from a guest key once this person says yes. Whatever
  // moved, read "mine" again under the account's key.
  useClaimGuest((r) => {
    refreshMine();
    if (r.moved <= 0) return;
    sync();
    toast.success(SUBMISSIONS_COPY.claimed);
  });

  const addItemM = trpc.sessionBoard.addItem.useMutation();
  const removeItemM = trpc.sessionBoard.removeItem.useMutation();
  const addProjectM = trpc.sessionBoard.addProject.useMutation();
  const updateProjectM = trpc.sessionBoard.updateProject.useMutation();
  const voteM = trpc.sessionBoard.vote.useMutation();
  const handM = trpc.sessionBoard.hand.useMutation();
  const offerM = trpc.sessionBoard.offer.useMutation();
  const actM = trpc.sessionBoard.act.useMutation();
  const curateItemM = trpc.sessionBoard.curateItem.useMutation();
  const curateProjectM = trpc.sessionBoard.curateProject.useMutation();
  const promoteM = trpc.sessionBoard.promote.useMutation();
  const importM = trpc.sessionBoard.importRegister.useMutation();
  const statusM = trpc.sessionBoard.setStatus.useMutation();
  const answerM = trpc.sessionBoard.answer.useMutation();
  const checkInM = trpc.sessionBoard.checkIn.useMutation();
  const mergeProjectM = trpc.sessionBoard.mergeProject.useMutation();
  const confirmCarryM = trpc.sessionBoard.confirmCarry.useMutation();

  const name = displayName.trim() || undefined;
  const projectWrites = useRef(new Map<number, ProjectWrite>());
  const curateWrites = useRef(new Map<number, CurateProjectWrite>());
  const itemWrites = useRef(new Map<number, CurateItemWrite>());
  const seenWeek = useRef(week);
  if (seenWeek.current !== week) {
    seenWeek.current = week;
    serverSnap.current = null;
    projectWrites.current.clear();
    curateWrites.current.clear();
    itemWrites.current.clear();
  }

  const actions = useMemo(() => {
    const board = () => utils.sessionBoard.get.getData({ week }) ?? null;
    type Board = NonNullable<ReturnType<typeof board>>;
    type Item = Board["items"][number];

    const stamp = (v: unknown) => {
      const t = new Date(v as string | number | Date).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const rank = (id: number) => (id < 0 ? 1e18 - id : id);
    /** This person's answer rows for a key and project, newest first. */
    const myAnswers = (b: Board | null, key: string, projectId: number | null): Item[] => {
      if (!b) return [];
      const m = mineRef.current;
      return b.items
        .filter((i) => i.kind === "answer" && i.block === key && (i.projectId ?? null) === projectId && m.itemIds.has(i.id))
        .sort((a, z) => stamp(z.createdAt) - stamp(a.createdAt) || rank(z.id) - rank(a.id));
    };
    /** What un-picking a human need takes with it: the seed on it and its per-need answers. */
    const needCascade = (b: Board | null, projectId: number | null, needId: string): number[] => {
      if (!b) return [];
      const m = mineRef.current;
      const per = new Set(perNeedKeys(needId));
      return b.items
        .filter((i) => i.kind === "answer" && (i.projectId ?? null) === projectId && m.itemIds.has(i.id)
          && ((i.block === NEEDS_KEYS.seed && i.text === needId) || per.has(i.block ?? "")))
        .map((i) => i.id);
    };
    const answerRow = (id: number, key: string, text: string, projectId: number | null): Item => ({
      id,
      kind: "answer",
      text,
      projectId,
      block: key,
      theme: null,
      chosen: false,
      votes: 0,
      roomVotes: 0,
      fromItemId: null,
      hidden: false,
      displayName: name ?? null,
      createdAt: new Date(),
    });
    const forget = (ids: Iterable<number>) => {
      const list = Array.from(ids);
      if (list.length === 0) return;
      setMine((m) => {
        const itemIds = new Set(m.itemIds);
        for (const id of list) itemIds.delete(id);
        return { ...m, itemIds };
      });
    };
    const swapTemp = (tempId: number, id: number) => {
      paint((b) => ({ ...b, items: b.items.map((item) => (item.id === tempId ? { ...item, id } : item)) }));
      setMine((m) => {
        const itemIds = new Set(m.itemIds);
        itemIds.delete(tempId);
        itemIds.add(id);
        return { ...m, itemIds };
      });
    };
    const remember = (ref: string, cardId: number, cardName: string) => {
      writeStored(LAST_PROJECT_STORAGE, JSON.stringify({ name: cardName, cardId, ref, week }));
    };
    const markHere = (cardId: number) => {
      if (mineRef.current.checkins.has(cardId)) return;
      setMine((m) => ({ ...m, checkins: new Set(m.checkins).add(cardId) }));
      paint((b) => adjustCheckins(b, cardId, 1));
    };

    /** Each of these resolves null when the write failed (the error is already on screen). */
    const addItem = async (input: { kind: NoteItemKind; text: string; projectId?: number; block?: string }) => {
      const tempId = nextTempId();
      const { done } = writer.fifo(`add:${tempId}`, () => {
        paint((b) => ({
          ...b,
          items: [...b.items, {
            id: tempId,
            kind: input.kind,
            text: input.text,
            projectId: input.projectId ?? null,
            block: input.block ?? null,
            theme: null,
            chosen: false,
            votes: 0,
            roomVotes: 0,
            fromItemId: null,
            hidden: false,
            displayName: name ?? null,
            createdAt: new Date(),
          }],
        }));
        setMine((m) => ({ ...m, itemIds: new Set(m.itemIds).add(tempId) }));
      }, async () => {
        const r = await addItemM.mutateAsync({ week, voterKey, displayName: name, ...input });
        if (r.id) swapTemp(tempId, r.id);
        return r;
      });
      const result = await done;
      if (!result.ok) forget([tempId]);
      return result.ok ? result.value : null;
    };

    return {
      addItem,
      removeItem: (itemId: number) => {
        if (itemId < 0) return Promise.resolve(false);
        const b = board();
        const item = b?.items.find((i) => i.id === itemId);
        const isAnswer = item?.kind === "answer";
        const cascade = isAnswer && item.block === NEEDS_KEYS.pick && mineRef.current.itemIds.has(itemId)
          ? needCascade(b, item.projectId ?? null, item.text)
          : [];
        const queue = isAnswer ? answerQueue(item.block, item.projectId ?? null) : `item-remove:${itemId}`;
        const { done } = writer.fifo(queue, () => {
          paint((bb) => removeItems(bb, [itemId, ...cascade]));
          forget([itemId, ...cascade]);
        }, async () => {
          const r = await removeItemM.mutateAsync({ week, voterKey, itemId });
          if (r.removedIds.length) {
            paint((bb) => removeItems(bb, r.removedIds));
            forget(r.removedIds);
          }
          return r;
        });
        return done.then((result) => result.ok);
      },

      /**
       * Pick or un-pick an option on a pick prompt. Resolves true when the
       * pick stands (or was already there), false when it was refused or
       * failed. Room-scope and anonymous prompts never carry a project.
       */
      answerPick: async (input: { key: string; option: string; on: boolean; projectId: number | null }): Promise<boolean> => {
        const p = prompts.get(input.key);
        if (!p || p.mode !== "pick") return false;
        const pid = p.scope === "room" || p.anonymous ? null : input.projectId;
        const { key, option, on } = input;
        const queue = answerQueue(key, pid);
        const send = () => answerM.mutateAsync({
          op: "pick", week, voterKey, key, projectId: pid, option, on, displayName: p.anonymous ? undefined : name,
        });

        if (p.anonymous) {
          // The rows never reach the page: paint the room's counts and this person's own pick.
          const current = mineRef.current.anon.get(key) ?? null;
          if (on && current === option) return true;
          if (!on && current !== option) return true;
          const { done } = writer.fifo(queue, () => {
            setMine((m) => {
              const anon = new Map(m.anon);
              if (on) anon.set(key, option); else anon.delete(key);
              return { ...m, anon };
            });
            paint((b) => {
              let next = adjustAnswerCount(b, key, option, on ? 1 : -1);
              if (on && current) next = adjustAnswerCount(next, key, current, -1);
              return next;
            });
          }, send);
          return (await done).ok;
        }

        const b = board();
        const rows = myAnswers(b, key, pid);
        if (on) {
          if (rows.some((r) => r.text === option)) return true;
          if (key === NEEDS_KEYS.seed && !myAnswers(b, NEEDS_KEYS.pick, pid).some((r) => r.text === option)) {
            toast.error(PROMPT_COPY.pickFirst);
            return false;
          }
          if (promptMax(p) === 1 && rows.length > 0) {
            const row = rows[0];
            const { done } = writer.fifo(queue, () => {
              paint((bb) => patchItem(bb, row.id, { text: option, createdAt: new Date() }));
            }, async () => {
              const r = await send();
              if (r.removedIds.length) {
                paint((bb) => removeItems(bb, r.removedIds));
                forget(r.removedIds);
              }
              return r;
            });
            return (await done).ok;
          }
          if (rows.length >= promptMax(p)) {
            toast.error(promptFull(p));
            return false;
          }
          const tempId = nextTempId();
          const { done } = writer.fifo(queue, () => {
            paint((bb) => ({ ...bb, items: [...bb.items, answerRow(tempId, key, option, pid)] }));
            setMine((m) => ({ ...m, itemIds: new Set(m.itemIds).add(tempId) }));
          }, async () => {
            const r = await send();
            if (r.id) swapTemp(tempId, r.id);
            return r;
          });
          const result = await done;
          if (!result.ok) forget([tempId]);
          return result.ok;
        }

        const gone = rows.filter((r) => r.text === option).map((r) => r.id);
        const cascade = key === NEEDS_KEYS.pick ? needCascade(b, pid, option) : [];
        const { done } = writer.fifo(queue, () => {
          paint((bb) => removeItems(bb, [...gone, ...cascade]));
          forget([...gone, ...cascade]);
        }, async () => {
          const r = await send();
          if (r.removedIds.length) {
            paint((bb) => removeItems(bb, r.removedIds));
            forget(r.removedIds);
          }
          return r;
        });
        return (await done).ok;
      },

      /** Words for a note prompt. A prompt with room for one replaces the line in place. */
      answerNote: async (input: { key: string; text: string; projectId: number | null; fresh?: boolean }): Promise<{ id: number } | null> => {
        const p = prompts.get(input.key);
        if (!p || p.mode !== "note") return null;
        const text = input.text.replace(/\s+/g, " ").trim();
        if (!text) return null;
        const pid = p.scope === "room" || p.anonymous ? null : input.projectId;
        const queue = answerQueue(input.key, pid);
        const send = () => answerM.mutateAsync({
          op: "note", week, voterKey, key: input.key, projectId: pid, text, displayName: p.anonymous ? undefined : name,
          ...(input.fresh ? { fresh: true } : {}),
        });
        const rows = myAnswers(board(), input.key, pid);
        if (promptMax(p) === 1 && rows.length > 0) {
          const row = rows[0];
          const { done } = writer.fifo(queue, () => {
            paint((bb) => patchItem(bb, row.id, { text, createdAt: new Date() }));
          }, async () => {
            const r = await send();
            if (r.removedIds.length) {
              paint((bb) => removeItems(bb, r.removedIds));
              forget(r.removedIds);
            }
            return r;
          });
          const result = await done;
          return result.ok ? { id: result.value.id ?? row.id } : null;
        }
        if (rows.length >= promptMax(p)) {
          toast.error(promptFull(p));
          return null;
        }
        const tempId = nextTempId();
        const { done } = writer.fifo(queue, () => {
          paint((bb) => ({ ...bb, items: [...bb.items, answerRow(tempId, input.key, text, pid)] }));
          setMine((m) => ({ ...m, itemIds: new Set(m.itemIds).add(tempId) }));
        }, async () => {
          const r = await send();
          if (r.id) swapTemp(tempId, r.id);
          return r;
        });
        const result = await done;
        if (!result.ok) {
          forget([tempId]);
          return null;
        }
        return result.value.id ? { id: result.value.id } : null;
      },

      /** A question for the wall, from this stage, kept with the tapped project when there is one. */
      ask: async (input: { text: string; stageIndex: number; projectId: number | null }): Promise<{ id: number } | null> => {
        const r = await addItem({
          kind: "ask",
          text: input.text,
          block: askBlock(input.stageIndex),
          projectId: input.projectId ?? undefined,
        });
        return r?.id ? { id: r.id } : null;
      },

      /**
       * Check in with a tile. A tile that is already a card here sets the pick
       * at once and saves the mark behind it; any other tile waits for the
       * server to find or make the card.
       */
      checkIn: async (ref: string, tile?: { name: string; cardId: number | null }): Promise<{ cardId: number; name: string } | null> => {
        if (tile?.cardId != null && tile.cardId > 0) {
          const cardId = tile.cardId;
          setMyProject({ kind: "project", cardId, name: tile.name });
          remember(ref, cardId, tile.name);
          writer.fifo("checkin", () => markHere(cardId), () => checkInM.mutateAsync({ week, voterKey, ref }));
          return { cardId, name: tile.name };
        }
        const { done } = writer.fifo("checkin", () => {}, () => checkInM.mutateAsync({ week, voterKey, ref }));
        const result = await done;
        if (!result.ok) return null;
        const { cardId, name: cardName } = result.value;
        paint((b) => ensureProject(b, {
          id: cardId,
          name: cardName,
          place: null,
          url: null,
          phase: null,
          whereNow: null,
          ready: [],
          nextMove: null,
          shared: false,
          hidden: false,
          applicationId: null,
          displayName: null,
        }));
        markHere(cardId);
        setMyProject({ kind: "project", cardId, name: cardName });
        remember(ref, cardId, cardName);
        return { cardId, name: cardName };
      },

      addProject: async (input: { name: string; place?: string; url?: string }) => {
        const tempId = nextTempId();
        const { done } = writer.fifo(`add-project:${tempId}`, () => {
          paint((b) => ({
            ...b,
            projects: [...b.projects, {
              id: tempId,
              name: input.name,
              place: input.place ?? null,
              url: input.url ?? null,
              phase: null,
              whereNow: null,
              ready: [],
              nextMove: null,
              shared: false,
              hidden: false,
              applicationId: null,
              displayName: name ?? null,
            }],
          }));
        }, async () => {
          const r = await addProjectM.mutateAsync({ week, voterKey, displayName: name, ...input });
          if (r.id) {
            paint((b) => ({
              ...b,
              projects: b.projects.map((p) => (p.id === tempId ? { ...p, id: r.id } : p)),
            }));
            setMine((m) => ({ ...m, projectIds: new Set(m.projectIds).add(r.id) }));
          }
          return r;
        });
        const result = await done;
        return result.ok ? result.value : null;
      },
      updateProject: (input: ProjectWrite) => {
        const id = input.projectId;
        const merged = { ...(projectWrites.current.get(id) ?? { projectId: id }), ...input };
        projectWrites.current.set(id, merged);
        const { done } = writer.coalesce(`project:${id}`, merged, () => {
          paint((b) => patchProject(b, id, input));
        }, async (body) => {
          if (projectWrites.current.get(id) === body) projectWrites.current.delete(id);
          await updateProjectM.mutateAsync({ week, voterKey, ...body });
        });
        return done;
      },
      vote: (itemId: number, on: boolean) => {
        writer.coalesce(`vote:${itemId}`, on, () => {
          setMine((m) => {
            const votes = new Set(m.votes);
            if (on) votes.add(itemId); else votes.delete(itemId);
            return { ...m, votes };
          });
          paint((b) => adjustVotes(b, itemId, on ? 1 : -1));
        }, (next) => voteM.mutateAsync({ week, voterKey, itemId, on: next }));
      },
      hand: (forWeek: number, on: boolean) => {
        writer.coalesce(`hand:${forWeek}`, on, () => {
          setMine((m) => {
            const hands = new Set(m.hands);
            if (on) hands.add(forWeek); else hands.delete(forWeek);
            return { ...m, hands };
          });
          paint((b) => adjustMap(b, "hands", forWeek, on ? 1 : -1));
        }, (next) => handM.mutateAsync({ week, voterKey, forWeek, on: next }));
      },
      offer: (key: BoardOfferKey, on: boolean) => {
        writer.coalesce(`offer:${key}`, on, () => {
          setMine((m) => {
            const offers = new Set(m.offers);
            if (on) offers.add(key); else offers.delete(key);
            return { ...m, offers };
          });
          paint((b) => adjustMap(b, "offers", key, on ? 1 : -1));
        }, (next) => offerM.mutateAsync({ week, voterKey, offer: key, on: next }));
      },
      /** The sign-up already wrote the vote. Paint the hand without writing it again. */
      paintOffer: (key: BoardOfferKey) => {
        if (mineRef.current.offers.has(key)) return;
        setMine((m) => {
          const offers = new Set(m.offers);
          offers.add(key);
          return { ...m, offers };
        });
        paint((b) => adjustMap(b, "offers", key, 1));
      },
      act: (action: Parameters<typeof actM.mutate>[0]["action"]) => {
        writer.fifo("act", () => {
          paint((b) => patchBoardAction(b, action, serverNow()));
        }, () => actM.mutateAsync({ week, action }));
      },
      curateItem: (input: CurateItemWrite) => {
        const id = input.itemId;
        const merged = { ...(itemWrites.current.get(id) ?? { itemId: id }), ...input };
        itemWrites.current.set(id, merged);
        writer.coalesce(`item:${id}`, merged, () => {
          const { itemId: _itemId, ...patch } = input;
          paint((b) => patchItem(b, id, patch));
        }, async (body) => {
          if (itemWrites.current.get(id) === body) itemWrites.current.delete(id);
          await curateItemM.mutateAsync({ week, ...body });
        });
      },
      curateProject: (input: CurateProjectWrite) => {
        const id = input.projectId;
        const merged = { ...(curateWrites.current.get(id) ?? { projectId: id }), ...input };
        curateWrites.current.set(id, merged);
        writer.coalesce(`curate:${id}`, merged, () => {
          const { projectId: _projectId, ...patch } = input;
          paint((b) => patchProject(b, id, patch));
        }, async (body) => {
          if (curateWrites.current.get(id) === body) curateWrites.current.delete(id);
          await curateProjectM.mutateAsync({ week, ...body });
        });
      },
      /** Facilitator: move a stray card's answers and check-ins onto the card to keep, then hide the stray. */
      mergeProject: (projectId: number, intoId: number) => {
        if (projectId === intoId || projectId < 0 || intoId < 0) return;
        writer.fifo(`merge:${projectId}`, () => {
          paint((b) => ({
            ...b,
            projects: b.projects.map((p) => (p.id === projectId ? { ...p, hidden: true } : p)),
            items: b.items.map((i) => (i.projectId === projectId ? { ...i, projectId: intoId } : i)),
          }));
        }, async () => {
          const r = await mergeProjectM.mutateAsync({ week, projectId, intoId });
          toast.success(`Merged. ${r.moved} ${r.moved === 1 ? "answer or check-in" : "answers and check-ins"} moved over.`);
          return r;
        });
      },
      /**
       * Facilitator: a card here is (fromCardId > 0) or isn't (0) the same
       * project as an earlier week's card found by its name; null takes the
       * link back. The carry read follows once the save lands.
       */
      confirmCarry: (cardId: number, fromCardId: number | null) => {
        writer.fifo(`carry:${cardId}`, () => {
          paint((b) => patchBoardAction(b, { type: "carry", cardId, from: fromCardId, by: "facilitator" }, serverNow()));
        }, async () => {
          const r = await confirmCarryM.mutateAsync({ week, cardId, fromCardId });
          void utils.sessionBoard.carry.invalidate({ week });
          return r;
        });
      },
      promote: (itemId: number) => {
        writer.fifo(`promote:${itemId}`, () => {}, () => promoteM.mutateAsync({ week, itemId }));
      },
      importRegister: () => {
        writer.fifo("import", () => {}, async () => {
          const r = await importM.mutateAsync({ week });
          toast.success(r.added ? `${r.added} project${r.added === 1 ? "" : "s"} brought into the circle.` : "Everyone on the register is already in the circle.");
        });
      },
      setStatus: (status: "open" | "closed") => {
        writer.fifo("status", () => {
          paint((b) => ({ ...b, status }));
        }, () => statusM.mutateAsync({ week, status }));
      },
    };
  }, [
    week, voterKey, name, prompts, writer, paint, serverNow, utils, setMine, setMyProject,
    addItemM, removeItemM, addProjectM, updateProjectM, voteM, handM, offerM, actM, curateItemM,
    curateProjectM, promoteM, importM, statusM, answerM, checkInM, mergeProjectM, confirmCarryM,
  ]);

  const carry = useMemo<BoardCarry>(() => ({
    on: carries,
    data: carryQ.data ?? null,
    loading: carries && carryQ.isLoading,
    failed: carries && carryQ.isError && !carryQ.data,
    retry: () => void carryRefetch.current(),
    earlier: whoEarlier,
    last: readLastProject(week),
  }), [carries, carryQ.data, carryQ.isLoading, carryQ.isError, whoEarlier, week]);

  return {
    board: boardQ.data ?? null,
    loading: boardQ.isLoading,
    error: boardQ.error,
    serverNow,
    mine,
    actions,
    displayName,
    setDisplayName,
    myProject,
    setMyProject,
    carry,
  };
}

export type SessionBoardData = NonNullable<ReturnType<typeof useSessionBoard>["board"]>;
export type BoardActions = ReturnType<typeof useSessionBoard>["actions"];
export type BoardProject = SessionBoardData["projects"][number];
export type BoardItem = SessionBoardData["items"][number];
