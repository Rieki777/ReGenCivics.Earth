import { describe, expect, it } from "vitest";
import { recordingSeries } from "./recordingLibrary";

describe("recordingSeries", () => {
  it("groups season 2, open sessions, and SEEDS", () => {
    expect(recordingSeries({ title: "S2E2 Incubator Overview", eventTitle: "Week 2: Incubator Overview" })).toBe("season2");
    expect(recordingSeries({ title: "ReGen Civics: Open Session", eventTitle: "Open Access Session" })).toBe("open");
    expect(recordingSeries({ title: "SEEDS community call 2023" })).toBe("seeds");
    expect(recordingSeries({ title: "Notes from the dock" })).toBe("other");
  });
});
