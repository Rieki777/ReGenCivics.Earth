/**
 * The live session board's data (ADR-68). Every open page polls one small
 * number (`sessionBoard.version`) and fetches the whole board only when it
 * moves, so a room of thirty people costs a few tiny requests a second.
 *
 * Guests have no account, so the browser keeps a random key that owns what
 * they write. It is the same key the Season Schedule uses, so one person is
 * one person across both pages. It only travels in mutation bodies.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
};

const emptyMine = (): Mine => ({ itemIds: new Set(), projectIds: new Set(), votes: new Set(), hands: new Set() });

function errorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message;
  if (msg && !/^\[|fetch|network/i.test(msg)) return msg;
  return "That didn't save. Check your connection and try again.";
}

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

  // Fetch the board again whenever the version it was read at falls behind.
  const liveVersion = versionQ.data?.version;
  const boardVersion = boardQ.data?.version;
  const refetchBoard = boardQ.refetch;
  useEffect(() => {
    if (liveVersion == null || boardVersion == null) return;
    if (liveVersion !== boardVersion && !boardQ.isFetching) void refetchBoard();
  }, [liveVersion, boardVersion, boardQ.isFetching, refetchBoard]);

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
  useEffect(() => {
    let cancelled = false;
    whoamiRef.current({ week, voterKey })
      .then((r) => {
        if (cancelled) return;
        setMine({
          itemIds: new Set(r.itemIds),
          projectIds: new Set(r.projectIds),
          votes: new Set(r.votes),
          hands: new Set(r.hands),
        });
      })
      .catch(() => {
        /* the page still works; edit and take-back offers just stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [week, voterKey]);

  const after = useCallback(() => {
    void utils.sessionBoard.get.invalidate({ week });
    void utils.sessionBoard.version.invalidate({ week });
  }, [utils, week]);
  const onError = useCallback((err: unknown) => toast.error(errorMessage(err)), []);

  const addItemM = trpc.sessionBoard.addItem.useMutation({ onSettled: after, onError });
  const removeItemM = trpc.sessionBoard.removeItem.useMutation({ onSettled: after, onError });
  const addProjectM = trpc.sessionBoard.addProject.useMutation({ onSettled: after, onError });
  const updateProjectM = trpc.sessionBoard.updateProject.useMutation({ onSettled: after, onError });
  const voteM = trpc.sessionBoard.vote.useMutation({ onSettled: after, onError });
  const handM = trpc.sessionBoard.hand.useMutation({ onSettled: after, onError });
  const actM = trpc.sessionBoard.act.useMutation({
    onSuccess: (r) => {
      utils.sessionBoard.get.setData({ week }, (old) => (old ? { ...old, state: r.state } : old));
    },
    onSettled: after,
    onError,
  });
  const curateItemM = trpc.sessionBoard.curateItem.useMutation({ onSettled: after, onError });
  const curateProjectM = trpc.sessionBoard.curateProject.useMutation({ onSettled: after, onError });
  const promoteM = trpc.sessionBoard.promote.useMutation({ onSettled: after, onError });
  const importM = trpc.sessionBoard.importRegister.useMutation({
    onSuccess: (r) => toast.success(r.added ? `${r.added} project${r.added === 1 ? "" : "s"} brought into the circle.` : "Everyone on the register is already in the circle."),
    onSettled: after,
    onError,
  });
  const statusM = trpc.sessionBoard.setStatus.useMutation({ onSettled: after, onError });

  const name = displayName.trim() || undefined;

  const actions = useMemo(() => ({
    /** Each of these resolves null when the write failed (the error is already on screen). */
    addItem: async (input: { kind: "arrive" | "leave" | "pain" | "opp" | "game"; text: string; projectId?: number; block?: "aim" | "players" | "quests" | "flows" | "decide" }) => {
      try {
        const r = await addItemM.mutateAsync({ week, voterKey, displayName: name, ...input });
        if (r.id) setMine((m) => ({ ...m, itemIds: new Set(m.itemIds).add(r.id) }));
        return r;
      } catch {
        return null;
      }
    },
    removeItem: async (itemId: number) => {
      try {
        await removeItemM.mutateAsync({ week, voterKey, itemId });
      } catch {
        return null;
      }
      setMine((m) => {
        const itemIds = new Set(m.itemIds);
        itemIds.delete(itemId);
        return { ...m, itemIds };
      });
      return true;
    },
    addProject: async (input: { name: string; place?: string; url?: string }) => {
      try {
        const r = await addProjectM.mutateAsync({ week, voterKey, displayName: name, ...input });
        if (r.id) setMine((m) => ({ ...m, projectIds: new Set(m.projectIds).add(r.id) }));
        return r;
      } catch {
        return null;
      }
    },
    updateProject: (input: {
      projectId: number;
      name?: string;
      place?: string;
      url?: string;
      phase?: "seed" | "root" | "sprout" | "grow" | "fruit" | null;
      whereNow?: string;
      ready?: string[];
      nextMove?: string;
    }) => updateProjectM.mutateAsync({ week, voterKey, ...input }).catch(() => null),
    vote: async (itemId: number, on: boolean) => {
      setMine((m) => {
        const votes = new Set(m.votes);
        if (on) votes.add(itemId); else votes.delete(itemId);
        return { ...m, votes };
      });
      try {
        await voteM.mutateAsync({ week, voterKey, itemId, on });
      } catch {
        setMine((m) => {
          const votes = new Set(m.votes);
          if (on) votes.delete(itemId); else votes.add(itemId);
          return { ...m, votes };
        });
      }
    },
    hand: async (forWeek: number, on: boolean) => {
      setMine((m) => {
        const hands = new Set(m.hands);
        if (on) hands.add(forWeek); else hands.delete(forWeek);
        return { ...m, hands };
      });
      try {
        await handM.mutateAsync({ week, voterKey, forWeek, on });
      } catch {
        setMine((m) => {
          const hands = new Set(m.hands);
          if (on) hands.delete(forWeek); else hands.add(forWeek);
          return { ...m, hands };
        });
      }
    },
    act: (action: Parameters<typeof actM.mutate>[0]["action"]) => actM.mutate({ week, action }),
    curateItem: (input: { itemId: number; theme?: "people" | "decide" | "money" | "land" | "story" | "tools" | "care" | null; chosen?: boolean; roomVotes?: number; hidden?: boolean }) =>
      curateItemM.mutate({ week, ...input }),
    curateProject: (input: { projectId: number; shared?: boolean; hidden?: boolean; applicationId?: number | null }) =>
      curateProjectM.mutate({ week, ...input }),
    promote: (itemId: number) => promoteM.mutate({ week, itemId }),
    importRegister: () => importM.mutate({ week }),
    setStatus: (status: "open" | "closed") => statusM.mutate({ week, status }),
  }), [week, voterKey, name, addItemM, removeItemM, addProjectM, updateProjectM, voteM, handM, actM, curateItemM, curateProjectM, promoteM, importM, statusM]);

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
