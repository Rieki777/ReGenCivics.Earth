import { describe, expect, it } from "vitest";
import { parseSlots, serializeSlots } from "./routes/interopSessions";

describe("interop slot lists", () => {
  it("parses a single legacy slot", () => {
    expect(parseSlots("wed")).toEqual(["wed"]);
  });

  it("parses a comma list in canonical order and drops unknown keys", () => {
    expect(parseSlots("thu, tue,fri,,")).toEqual(["tue", "thu"]);
  });

  it("treats empty and null as no slots", () => {
    expect(parseSlots("")).toEqual([]);
    expect(parseSlots(null)).toEqual([]);
  });

  it("serializes deduplicated, ordered, and within the column width", () => {
    const stored = serializeSlots(["thu", "tue", "wed", "tue"]);
    expect(stored).toBe("tue,wed,thu");
    expect(stored.length).toBeLessThanOrEqual(24);
  });
});
