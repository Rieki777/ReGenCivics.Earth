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
 * one person across both pages. It only travels in mutation bodies.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { BoardOfferKey } from "@shared/sessionBoard";
import {
  adjustMap,
  adjustVotes,
  applyBoardPrefill,
  createBoardWriter,
  dropProjectPrefill,
  patchBoardAction,
  patchItem,
  patchProject,
  type BoardWriter,
} from "./boardWriter";

const VOTER_KEY_STORAGE = "season-voter-key";
const NAME_STORAGE = "session-board:name";

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
function readVoterKey(): string {
  const fresh = "s" + randomKeyBody();
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    window.localStorage.setItem(VOTER_KEY_STORAGE, fresh);
  } catch {
    // Private windows and blocked storage: the key lives for this page load only.
  }
  return fresh;
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

export type Mine = {
  itemIds: Set<number>;
  projectIds: Set<number>;
  votes: Set<number>;
  hands: Set<number>;
  /** Offers this person raised a hand for ("coach", "build"). */
  offers: Set<string>;
};

const emptyMine = (): Mine => ({ itemIds: new Set(), projectIds: new Set(), votes: new Set(), hands: new Set(), offers: new Set() });

function errorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message;
  if (msg && !/^\[|fetch|network/i.test(msg)) return msg;
  return "That didn't save. Check your connection and try again.";
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

export function useSessionBoard(week: number) {
  const utils = trpc.useUtils();
  const voterKey = useMemo(readVoterKey, []);
  const [displayName, setDisplayNameState] = useState(() => readStored(NAME_STORAGE));
  const setDisplayName = useCallback((v: string) => {
    setDisplayNameState(v);
    writeStored(NAME_STORAGE, v);
  }, []);

  const versionQ = trpc.sessionBoard.version.useQuery(
    { week },
    { refetchInterval: 2500, refetchIntervalInBackground: false, staleTime: 0, retry: 1 },
  );
  const boardQ = trpc.sessionBoard.get.useQuery(
    { week },
    { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  );

  const syncRef = useRef<() => void>(() => {});
  const failRef = useRef<(err: unknown, info: { latest: boolean }) => void>(() => {});
  const writer = useMemo(
    () => createBoardWriter({
      onIdle: () => syncRef.current(),
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

  // What this person has on the board.
  const [mine, setMine] = useState<Mine>(emptyMine);
  const whoami = trpc.sessionBoard.whoami.useMutation();
  const whoamiRef = useRef(whoami.mutateAsync);
  whoamiRef.current = whoami.mutateAsync;
  const refreshMine = useCallback(() => {
    void whoamiRef.current({ week, voterKey })
      .then((r) => {
        if (writerRef.current.inflight() > 0) return;
        setMine({
          itemIds: new Set(r.itemIds),
          projectIds: new Set(r.projectIds),
          votes: new Set(r.votes),
          hands: new Set(r.hands),
          offers: new Set(r.offers),
        });
      })
      .catch(() => {
        /* the page still works; edit and take-back offers just stay hidden */
      });
  }, [week, voterKey]);
  useEffect(() => {
    refreshMine();
  }, [refreshMine]);

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

  const actions = useMemo(() => ({
    /** Each of these resolves null when the write failed (the error is already on screen). */
    addItem: async (input: { kind: "arrive" | "leave" | "pain" | "opp" | "game"; text: string; projectId?: number; block?: "aim" | "players" | "quests" | "flows" | "decide" }) => {
      const tempId = -Date.now();
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
            prefilled: false,
            createdAt: new Date(),
          }],
        }));
      }, async () => {
        const r = await addItemM.mutateAsync({ week, voterKey, displayName: name, ...input });
        if (r.id) {
          paint((b) => ({
            ...b,
            items: b.items.map((item) => (item.id === tempId ? { ...item, id: r.id } : item)),
          }));
          setMine((m) => ({ ...m, itemIds: new Set(m.itemIds).add(r.id) }));
        }
        return r;
      });
      const result = await done;
      return result.ok ? result.value : null;
    },
    removeItem: (itemId: number) => {
      const { done } = writer.fifo(`item-remove:${itemId}`, () => {
        paint((b) => {
          const item = b.items.find((row) => row.id === itemId);
          const next = { ...b, items: b.items.filter((row) => row.id !== itemId) };
          if (!item?.prefilled || item.projectId == null) return next;
          return {
            ...next,
            projects: next.projects.map((p) =>
              p.id === item.projectId ? { ...p, prefillFields: p.prefillFields.filter((field) => field !== "pain") } : p,
            ),
          };
        });
        setMine((m) => {
          const itemIds = new Set(m.itemIds);
          itemIds.delete(itemId);
          return { ...m, itemIds };
        });
      }, () => removeItemM.mutateAsync({ week, voterKey, itemId }));
      return done.then((result) => result.ok);
    },
    addProject: async (input: { name: string; place?: string; url?: string }) => {
      const tempId = -Date.now();
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
            prefillFields: [],
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
        paint((b) => dropProjectPrefill(patchProject(b, id, input), id, input));
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
    act: (action: Parameters<typeof actM.mutate>[0]["action"]) => {
      writer.fifo("act", () => {
        paint((b) => patchBoardAction(b, action, serverNow()));
      }, async () => {
        const r = await actM.mutateAsync({ week, action });
        if (r.prefill) paint((b) => applyBoardPrefill(b, r.prefill));
        return r;
      });
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
        const r = await curateProjectM.mutateAsync({ week, ...body });
        if (r.prefill) paint((b) => applyBoardPrefill(b, r.prefill));
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
  }), [week, voterKey, name, writer, paint, serverNow, addItemM, removeItemM, addProjectM, updateProjectM, voteM, handM, offerM, actM, curateItemM, curateProjectM, promoteM, importM, statusM]);

  return {
    board: boardQ.data ?? null,
    loading: boardQ.isLoading,
    error: boardQ.error,
    serverNow,
    mine,
    actions,
    displayName,
    setDisplayName,
  };
}

export type SessionBoardData = NonNullable<ReturnType<typeof useSessionBoard>["board"]>;
export type BoardActions = ReturnType<typeof useSessionBoard>["actions"];
export type BoardProject = SessionBoardData["projects"][number];
export type BoardItem = SessionBoardData["items"][number];
