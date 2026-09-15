// The contract version and its documented history must not drift apart. The
// number is what a village keys its wording on; the table is what a person
// reads to learn what the number means. If someone bumps one without the other,
// this is the test that notices.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HUB_CONTRACT } from "../shared/hubContract";
import { metaRouter } from "./routes/meta";

const doc = readFileSync("docs/CROWDPOOL_HUB_CONTRACT.md", "utf8");

describe("hub contract version", () => {
  it("is a map of positive integers", () => {
    for (const [surface, version] of Object.entries(HUB_CONTRACT)) {
      expect(Number.isInteger(version), `${surface} must be an integer`).toBe(true);
      expect(version, `${surface} must be at least 1`).toBeGreaterThanOrEqual(1);
    }
  });

  it("has every current crowdpool version explained in the contract doc", () => {
    // The history table in section 6 has one row per version, `| 2 | ...`.
    for (let v = 1; v <= HUB_CONTRACT.crowdpool; v++) {
      expect(doc, `docs/CROWDPOOL_HUB_CONTRACT.md must carry a row for crowdpool version ${v}`)
        .toMatch(new RegExp(`^\\| ${v} \\|`, "m"));
    }
    // And no row promises a version the code does not serve yet.
    expect(doc).not.toMatch(new RegExp(`^\\| ${HUB_CONTRACT.crowdpool + 1} \\|`, "m"));
  });

  it("serves the constant, with or without an input object", async () => {
    const caller = metaRouter.createCaller({} as never);
    expect(await caller.contract()).toEqual(HUB_CONTRACT);
    expect(await caller.contract({})).toEqual(HUB_CONTRACT);
  });
});
