import { describe, expect, it } from "vitest";
import { addsElements } from "./addsElements";

const record = (...nodes: Node[]) => ({ addedNodes: nodes } as unknown as MutationRecord);

describe("addsElements", () => {
  it("ignores a batch that only swaps text, as a controlled textarea does per keystroke", () => {
    expect(addsElements([record(document.createTextNode("a")), record()])).toBe(false);
  });

  it("sees an element anywhere in the batch", () => {
    expect(addsElements([record(document.createTextNode("a")), record(document.createElement("div"))])).toBe(true);
  });
});
