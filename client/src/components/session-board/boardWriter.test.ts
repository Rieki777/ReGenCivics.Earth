/**
 * Taps paint before the save, and a burst of toggles cannot flip back to an
 * earlier payload when the slower request returns.
 */
import { describe, expect, it } from "vitest";
import { defaultBoardState } from "@shared/sessionBoard";
import {
  adjustMap,
  adjustVotes,
  applyBoardPrefill,
  createBoardWriter,
  dropProjectPrefill,
  patchBoardAction,
  patchProject,
  type BoardPrefillPaint,
} from "./boardWriter";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("optimistic board paints", () => {
  it("paints in the same turn, well under a frame, while the save is still pending", () => {
    let ready: string[] = [];
    const writer = createBoardWriter({ onIdle() {}, onFail() {} });
    const samples: number[] = [];
    for (let i = 0; i < 40; i++) {
      const next = i % 2 === 0 ? ["legal"] : ["legal", "land"];
      const { paintedMs } = writer.coalesce(
        "project:1",
        next,
        () => {
          ready = next;
        },
        () => new Promise(() => {}),
      );
      samples.push(paintedMs);
    }
    expect(ready).toEqual(["legal", "land"]);
    const max = Math.max(...samples);
    expect(max).toBeLessThan(16);
    // The old handler awaited the mutation before the chip could change, so a
    // save this slow painted only after it. 120ms stands in for a round trip.
    const roundTripMs = 120;
    const oldPaintAt = roundTripMs;
    expect(oldPaintAt).toBeGreaterThanOrEqual(120);
    expect(max).toBeLessThan(oldPaintAt);
  });

  it("sends toggles in order and leaves the chip on the newest value", async () => {
    let board = { projects: [{ id: 7, ready: [] as string[], phase: null as string | null }] };
    const sent: string[][] = [];
    let releaseFirst: () => void = () => {};
    const hold = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const writer = createBoardWriter({ onIdle() {}, onFail() {} });

    writer.coalesce(
      "project:7",
      ["legal"],
      () => {
        board = patchProject(board, 7, { ready: ["legal"] });
      },
      async (ready) => {
        calls += 1;
        if (calls === 1) await hold;
        sent.push([...ready]);
      },
    );
    await flush();
    writer.coalesce(
      "project:7",
      ["legal", "land"],
      () => {
        board = patchProject(board, 7, { ready: ["legal", "land"] });
      },
      async (ready) => {
        sent.push([...ready]);
      },
    );

    expect(board.projects[0].ready).toEqual(["legal", "land"]);
    releaseFirst();
    await flush();
    await flush();
    expect(sent).toEqual([["legal"], ["legal", "land"]]);
    expect(board.projects[0].ready).toEqual(["legal", "land"]);
    expect(writer.inflight()).toBe(0);
  });

  it("does not report a failure that a newer toggle already replaced", async () => {
    const failures: boolean[] = [];
    let releaseFirst: (err: Error) => void = () => {};
    const hold = new Promise<void>((_resolve, reject) => {
      releaseFirst = reject;
    });
    let calls = 0;
    const writer = createBoardWriter({
      onIdle() {},
      onFail(_err, info) {
        failures.push(info.latest);
      },
    });
    writer.coalesce("project:3", ["a"], () => {}, async () => {
      calls += 1;
      if (calls === 1) await hold;
    });
    await flush();
    const second = writer.coalesce("project:3", ["a", "b"], () => {}, async () => {});
    releaseFirst(new Error("nope"));
    await second.done;
    await flush();
    expect(failures).toEqual([false]);
  });

  it("reports a failed save when nothing newer replaced it", async () => {
    const failures: boolean[] = [];
    const writer = createBoardWriter({
      onIdle() {},
      onFail(_err, info) {
        failures.push(info.latest);
      },
    });
    const job = writer.coalesce("project:3", ["a"], () => {}, async () => {
      throw new Error("offline");
    });
    await expect(job.done).resolves.toBe(false);
    expect(failures).toEqual([true]);
  });

  it("runs facilitator actions in order and drops the ones waiting after a failure", async () => {
    const ran: string[] = [];
    let releaseFirst: (err: Error) => void = () => {};
    const hold = new Promise<void>((_resolve, reject) => {
      releaseFirst = reject;
    });
    const writer = createBoardWriter({ onIdle() {}, onFail() {} });
    const now = 1_700_000_000_000;
    let state = defaultBoardState(2);
    const first = writer.fifo("act", () => {
      state = patchBoardAction({ state }, { type: "go", stage: 1 }, now).state;
    }, async () => {
      ran.push("go");
      await hold;
    });
    const second = writer.fifo("act", () => {
      state = patchBoardAction({ state }, { type: "breath", run: true }, now).state;
    }, async () => {
      ran.push("breath");
    });
    expect(state.stage).toBe(1);
    expect(state.breath.startedAt).toBe(now);
    releaseFirst(new Error("nope"));
    await expect(first.done).resolves.toEqual({ ok: false });
    await expect(second.done).resolves.toEqual({ ok: false });
    expect(ran).toEqual(["go"]);

    const third = writer.fifo("act", () => {}, async () => {
      ran.push("again");
    });
    await expect(third.done).resolves.toEqual({ ok: true, value: undefined });
    expect(ran).toEqual(["go", "again"]);
  });

  it("moves vote and hand counts immediately, and never below zero", () => {
    let board = {
      items: [{ id: 4, votes: 1 }],
      hands: { 3: 2 } as Record<number, number>,
      offers: {} as Record<string, number>,
    };
    board = adjustVotes(board, 4, 1);
    board = adjustVotes(board, 4, -1);
    board = adjustVotes(board, 4, -1);
    board = adjustVotes(board, 4, -1);
    board = adjustMap(board, "hands", 3, 1);
    board = adjustMap(board, "hands", 3, -3);
    board = adjustMap(board, "offers", "coach", 1);
    expect(board.items[0].votes).toBe(0);
    expect(board.hands[3]).toBeUndefined();
    expect(board.offers.coach).toBe(1);
  });
});

function emptyCard() {
  return {
    projects: [{
      id: 3,
      place: null as string | null,
      url: null as string | null,
      phase: null as string | null,
      whereNow: null as string | null,
      ready: [] as string[],
      applicationId: null as number | null,
      prefillFields: [] as string[],
    }],
    items: [] as Array<{ id: number; kind: string; text: string; projectId: number | null; prefilled: boolean }>,
  };
}

describe("presenter card prefill paint", () => {
  const filled: BoardPrefillPaint = {
    projectId: 3,
    applicationId: 9,
    place: "Ubud, Indonesia",
    url: "https://amora.earth",
    phase: "sprout",
    whereNow: "Land: The land is owned.",
    ready: ["land", "legal"],
    pain: { id: 41, text: "The road washes out in the rains." },
    prefillFields: ["place", "url", "phase", "whereNow", "ready", "pain"],
  };

  it("fills an empty card and marks those fields", () => {
    const board = applyBoardPrefill(emptyCard(), filled);
    const project = board.projects[0];
    expect(project.place).toBe("Ubud, Indonesia");
    expect(project.phase).toBe("sprout");
    expect(project.ready).toEqual(["land", "legal"]);
    expect(project.applicationId).toBe(9);
    expect(project.prefillFields).toEqual(["place", "url", "phase", "whereNow", "ready", "pain"]);
    expect(board.items).toEqual([
      expect.objectContaining({ id: 41, kind: "pain", prefilled: true, text: "The road washes out in the rains." }),
    ]);
  });

  it("leaves text that was typed while the fill was in flight", () => {
    const card = emptyCard();
    card.projects[0].place = "typed live";
    card.projects[0].whereNow = "already on the card";
    card.projects[0].ready = ["care"];
    card.items.push({ id: 2, kind: "pain", text: "said in the room", projectId: 3, prefilled: false });
    const board = applyBoardPrefill(card, filled);
    const project = board.projects[0];
    expect(project.place).toBe("typed live");
    expect(project.whereNow).toBe("already on the card");
    expect(project.ready).toEqual(["care"]);
    expect(project.phase).toBe("sprout");
    expect(project.url).toBe("https://amora.earth");
    expect(project.prefillFields).toEqual(["url", "phase"]);
    expect(board.items.map((item) => item.text)).toEqual(["said in the room"]);
  });

  it("keeps a mark the card already shows when the server still lists it", () => {
    const card = emptyCard();
    card.projects[0].place = "Ubud, Indonesia";
    card.projects[0].prefillFields = ["place"];
    const board = applyBoardPrefill(card, {
      projectId: 3,
      applicationId: 9,
      prefillFields: ["place"],
    });
    expect(board.projects[0].place).toBe("Ubud, Indonesia");
    expect(board.projects[0].prefillFields).toEqual(["place"]);
  });

  it("clears a mark in the same paint as an edit", () => {
    const card = emptyCard();
    card.projects[0].prefillFields = ["place", "whereNow", "ready"];
    const board = dropProjectPrefill(card, 3, { whereNow: "rewritten" });
    expect(board.projects[0].prefillFields).toEqual(["place", "ready"]);
  });
});
