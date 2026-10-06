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
