/**
 * The ready gate (response doc §12). These are the rules that must hold
 * identically on the web, in the Telegram bot, and in any future API, which is
 * why they are pure functions with no database in sight.
 */
import { describe, it, expect } from "vitest";
import { canTransition, readyHash, promotionBlockers } from "./lib/brain-gate";

const base = {
  kind: "build",
  ask: "Add search to the Material Library",
  doneWhen: "A search box filters the list",
  repo: "game-amora",
  surface: "admin/material-library",
  trust: "owner",
} as const;

describe("brain state machine", () => {
  it("allows the normal path raw -> shaped -> ready -> in_flight -> done_claimed -> done", () => {
    expect(canTransition("raw", "shaped")).toBe(true);
    expect(canTransition("shaped", "ready")).toBe(true);
    expect(canTransition("ready", "in_flight")).toBe(true);
    expect(canTransition("in_flight", "done_claimed")).toBe(true);
    expect(canTransition("done_claimed", "done")).toBe(true);
  });

  it("allows park from anywhere but done, and unpark to raw", () => {
    expect(canTransition("raw", "parked")).toBe(true);
    expect(canTransition("ready", "parked")).toBe(true);
    expect(canTransition("done", "parked")).toBe(false);
    expect(canTransition("parked", "raw")).toBe(true);
  });

  it("never jumps raw to ready or raw to done", () => {
    expect(canTransition("raw", "ready")).toBe(false);
    expect(canTransition("raw", "done")).toBe(false);
  });

  it("lets a wrongly-closed item be reopened in one step (17.14)", () => {
    expect(canTransition("done", "in_flight")).toBe(true);
  });
});

describe("promotionBlockers", () => {
  it("passes a fully shaped owner item", () => {
    expect(promotionBlockers(base)).toEqual([]);
  });

  it("blocks external items until the owner rewrites the ask", () => {
    expect(promotionBlockers({ ...base, trust: "external" })).toContain(
      "external source: rewrite the ask in your own words first",
    );
  });

  it("blocks a missing ask, done_when, kind, and a build without a repo", () => {
    expect(promotionBlockers({ ...base, ask: null })).toContain("missing ask");
    expect(promotionBlockers({ ...base, ask: "   " })).toContain("missing ask");
    expect(promotionBlockers({ ...base, doneWhen: null })).toContain("missing done_when");
    expect(promotionBlockers({ ...base, kind: "unsorted" })).toContain("missing kind");
    expect(promotionBlockers({ ...base, repo: null })).toContain("missing repo");
  });

  it("does not demand a repo for a non-build kind", () => {
    expect(promotionBlockers({ ...base, kind: "todo", repo: null })).toEqual([]);
  });
});

describe("readyHash", () => {
  it("hashes the fields a session would act on, and nothing else", () => {
    const h1 = readyHash(base);
    expect(h1).toHaveLength(64);
    expect(readyHash({ ...base, ask: "different ask" })).not.toBe(h1);
    expect(readyHash({ ...base, doneWhen: "different" })).not.toBe(h1);
    expect(readyHash({ ...base, repo: "regen-civics" })).not.toBe(h1);
    expect(readyHash({ ...base, surface: "elsewhere" })).not.toBe(h1);
  });

  it("does not collide across field boundaries", () => {
    // With a space separator these two would hash the same.
    const a = readyHash({ ask: "a b", doneWhen: "c", repo: null, surface: null });
    const b = readyHash({ ask: "a", doneWhen: "b c", repo: null, surface: null });
    expect(a).not.toBe(b);
  });

  it("treats a null field and an empty string as the same receipt", () => {
    expect(readyHash({ ...base, surface: null })).toBe(readyHash({ ...base, surface: "" }));
  });
});
