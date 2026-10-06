/**
 * Optimistic writes for the session board.
 *
 * A tap paints first, in the same turn, then the save runs in the background.
 * Writes for one key stay in order. A newer payload for that key replaces one
 * that has not started, so a burst of toggles cannot land out of order and
 * flip the chip back. A failed save reports only when it is still the latest
 * attempt. The caller refetches once nothing is in flight, and ignores a
 * response that started before a newer tap (see `epoch`).
 */
import { applyBoardAction, type BoardAction, type BoardState } from "@shared/sessionBoard";

export function patchProject<B extends { projects: Array<{ id: number }> }>(
  board: B,
  projectId: number,
  patch: object,
): B {
  let changed = false;
  const projects = board.projects.map((p) => {
    if (p.id !== projectId) return p;
    changed = true;
    return { ...p, ...patch };
  });
  return changed ? { ...board, projects } : board;
}

export function patchItem<B extends { items: Array<{ id: number }> }>(
  board: B,
  itemId: number,
  patch: object,
): B {
  let changed = false;
  const items = board.items.map((item) => {
    if (item.id !== itemId) return item;
    changed = true;
    return { ...item, ...patch };
  });
  return changed ? { ...board, items } : board;
}

export function adjustVotes<B extends { items: { id: number; votes: number }[] }>(
  board: B,
  itemId: number,
  delta: number,
): B {
  return {
    ...board,
    items: board.items.map((item) =>
      item.id === itemId ? { ...item, votes: Math.max(0, item.votes + delta) } : item,
    ),
  };
}

/** Hands and offers are count maps. A count of zero drops the key. */
export function adjustMap<B extends Record<string, unknown>>(
  board: B,
  field: "hands" | "offers",
  key: number | string,
  delta: number,
): B {
  const current = (board[field] ?? {}) as Record<string, number>;
  const next = { ...current };
  const n = Math.max(0, (next[String(key)] ?? 0) + delta);
  if (n === 0) delete next[String(key)];
  else next[String(key)] = n;
  return { ...board, [field]: next };
}

export function patchBoardAction<B extends { state: BoardState }>(
  board: B,
  action: BoardAction,
  now: number,
): B {
  return { ...board, state: applyBoardAction(board.state, action, now) };
}

/** What `prefillBoardProject` tells the page it wrote. */
export type BoardPrefillPaint = {
  projectId: number;
  applicationId: number | null;
  place?: string;
  url?: string;
  phase?: string;
  whereNow?: string;
  ready?: string[];
  pain?: { id: number; text: string };
  prefillFields: readonly string[];
};

type PrefillProject = {
  id: number;
  place: string | null;
  url: string | null;
  phase: string | null;
  whereNow: string | null;
  ready: string[];
  applicationId: number | null;
  prefillFields: string[];
};

type PrefillItem = {
  id: number;
  kind: string;
  text: string;
  projectId: number | null;
  prefilled: boolean;
};

const TEXT_FIELDS = ["place", "url", "phase", "whereNow"] as const;

function blankText(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function sameReady(current: readonly string[], incoming: readonly string[] | undefined): boolean {
  if (!incoming || current.length !== incoming.length) return false;
  return current.every((key, i) => key === incoming[i]);
}

/**
 * Paint a prefill onto the cached card. A field that already has text, a
 * phase, a readiness set, or a pain note stays as it is. Marks come back
 * only for fields this response filled, or ones the card already showed as
 * prefilled and the server still does.
 */
export function applyBoardPrefill<
  P extends PrefillProject,
  I extends PrefillItem,
  B extends { projects: P[]; items: I[] },
>(board: B, prefill: BoardPrefillPaint | null | undefined): B {
  if (!prefill) return board;
  const project = board.projects.find((p) => p.id === prefill.projectId);
  if (!project) return board;

  const localMarks = new Set(project.prefillFields);
  const serverMarks = new Set(prefill.prefillFields);
  const marks: string[] = [];
  const patch: Partial<P> = {};

  for (const field of TEXT_FIELDS) {
    const incoming = prefill[field];
    const current = project[field];
    if (incoming && blankText(current)) {
      (patch as Record<string, string>)[field] = incoming;
      if (serverMarks.has(field)) marks.push(field);
    } else if (serverMarks.has(field) && localMarks.has(field) && (!incoming || current === incoming)) {
      marks.push(field);
    }
  }

  if (prefill.ready?.length && project.ready.length === 0) {
    patch.ready = [...prefill.ready] as P["ready"];
    if (serverMarks.has("ready")) marks.push("ready");
  } else if (serverMarks.has("ready") && localMarks.has("ready") && sameReady(project.ready, prefill.ready ?? project.ready)) {
    marks.push("ready");
  }

  if (prefill.applicationId != null && project.applicationId == null) {
    patch.applicationId = prefill.applicationId as P["applicationId"];
  }

  let items = board.items;
  if (prefill.pain && serverMarks.has("pain")) {
    const pains = board.items.filter((item) => item.kind === "pain" && item.projectId === prefill.projectId);
    if (pains.length === 0) {
      items = [
        ...board.items,
        {
          id: prefill.pain.id,
          kind: "pain",
          text: prefill.pain.text,
          projectId: prefill.projectId,
          block: null,
          theme: null,
          chosen: false,
          votes: 0,
          roomVotes: 0,
          fromItemId: null,
          hidden: false,
          displayName: null,
          prefilled: true,
          createdAt: new Date(),
        } as unknown as I,
      ];
      marks.push("pain");
    } else if (pains.some((item) => item.prefilled) && localMarks.has("pain")) {
      marks.push("pain");
    }
  }

  return {
    ...board,
    projects: board.projects.map((p) => (p.id === project.id ? { ...p, ...patch, prefillFields: marks } : p)),
    items,
  };
}

/** An edit of a field clears its prefilled mark in the same paint as the value. */
export function dropProjectPrefill<B extends { projects: Array<{ id: number; prefillFields: string[] }> }>(
  board: B,
  projectId: number,
  input: { place?: unknown; url?: unknown; phase?: unknown; whereNow?: unknown; ready?: unknown },
): B {
  const drop: string[] = TEXT_FIELDS.filter((field) => input[field] !== undefined);
  if (input.ready !== undefined) drop.push("ready");
  if (!drop.length) return board;
  const gone = new Set<string>(drop);
  return {
    ...board,
    projects: board.projects.map((p) =>
      p.id === projectId
        ? { ...p, prefillFields: p.prefillFields.filter((field) => !gone.has(field)) }
        : p,
    ),
  };
}

export type WriteFailure = { latest: boolean };

type Slot = {
  payload: unknown;
  send: (payload: unknown) => Promise<unknown>;
  /** True when this payload was saved, or a newer one took its place. */
  resolve: (ok: boolean) => void;
};

type Hooks = {
  onIdle: () => void;
  /** `latest` is false when a newer write for that key already replaced this one. */
  onFail: (err: unknown, info: WriteFailure) => void;
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Two lanes. `coalesce` keeps the newest payload for a key (toggles, fields).
 * `fifo` runs jobs in order and, on failure, drops the ones still waiting
 * (facilitator actions, where skipping the middle would apply the wrong one).
 */
export function createBoardWriter(hooks: Hooks) {
  let inflight = 0;
  let epoch = 0;
  const slots = new Map<string, Slot>();
  const looping = new Set<string>();
  const tails = new Map<string, Promise<void>>();
  /** Bumps when a job fails, so anything already queued for that key is dropped. */
  const generation = new Map<string, number>();

  const bump = () => {
    epoch += 1;
  };

  const settle = () => {
    inflight -= 1;
    if (inflight === 0) hooks.onIdle();
  };

  return {
    inflight: () => inflight,
    /** Increments on every paint. A sync that started earlier is stale. */
    epoch: () => epoch,

    coalesce<T>(
      key: string,
      payload: T,
      paint: () => void,
      send: (payload: T) => Promise<unknown>,
    ): { paintedMs: number; done: Promise<boolean> } {
      const t0 = nowMs();
      bump();
      paint();
      const paintedMs = nowMs() - t0;
      let resolve!: (ok: boolean) => void;
      const done = new Promise<boolean>((res) => {
        resolve = res;
      });
      const previous = slots.get(key);
      if (previous) previous.resolve(true);
      slots.set(key, {
        payload,
        send: send as (payload: unknown) => Promise<unknown>,
        resolve,
      });
      if (!looping.has(key)) {
        looping.add(key);
        inflight += 1;
        void (async () => {
          try {
            while (slots.has(key)) {
              const slot = slots.get(key)!;
              slots.delete(key);
              try {
                await slot.send(slot.payload);
                slot.resolve(true);
              } catch (err) {
                const latest = !slots.has(key);
                hooks.onFail(err, { latest });
                slot.resolve(!latest);
              }
            }
          } finally {
            looping.delete(key);
            settle();
          }
        })();
      }
      return { paintedMs, done };
    },

    fifo<T>(
      key: string,
      paint: () => void,
      job: () => Promise<T>,
    ): { paintedMs: number; done: Promise<{ ok: true; value: T } | { ok: false }> } {
      const t0 = nowMs();
      bump();
      paint();
      const paintedMs = nowMs() - t0;
      const gen = generation.get(key) ?? 0;
      inflight += 1;
      let resolve!: (result: { ok: true; value: T } | { ok: false }) => void;
      const done = new Promise<{ ok: true; value: T } | { ok: false }>((res) => {
        resolve = res;
      });
      const prev = tails.get(key) ?? Promise.resolve();
      const run = prev.then(async () => {
        if ((generation.get(key) ?? 0) !== gen) {
          resolve({ ok: false });
          return;
        }
        try {
          resolve({ ok: true, value: await job() });
        } catch (err) {
          generation.set(key, gen + 1);
          hooks.onFail(err, { latest: true });
          resolve({ ok: false });
        }
      }).finally(settle);
      tails.set(key, run.then(() => {}, () => {}));
      return { paintedMs, done };
    },
  };
}

export type BoardWriter = ReturnType<typeof createBoardWriter>;
