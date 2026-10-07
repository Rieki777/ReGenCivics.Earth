import { describe, expect, it } from "vitest";
import { createSingleFlight } from "./singleFlight";

describe("createSingleFlight", () => {
  it("refuses a second start until the first job finishes", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let runs = 0;
    const start = createSingleFlight(async () => {
      runs += 1;
      await gate;
    });
    expect(start()).toEqual({ started: true });
    expect(start()).toEqual({ started: false });
    expect(runs).toBe(1);
    release();
    await new Promise((r) => setTimeout(r, 0));
    expect(start()).toEqual({ started: true });
    release();
  });
});
