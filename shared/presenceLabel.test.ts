import { describe, expect, it } from "vitest";
import { PRESENCE_SOFT_MAX, presenceLabel } from "./presenceLabel";

describe("presenceLabel", () => {
  it("hides the badge while count is unknown", () => {
    expect(presenceLabel(null)).toBeNull();
    expect(presenceLabel(undefined)).toBeNull();
    expect(presenceLabel(Number.NaN)).toBeNull();
    expect(presenceLabel(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("invites the first visitor at zero", () => {
    expect(presenceLabel(0)).toBe("Be the first here");
    expect(presenceLabel(-1)).toBe("Be the first here");
    expect(presenceLabel(-0.5)).toBe("Be the first here");
  });

  it("uses soft wording for 1..PRESENCE_SOFT_MAX without showing a number", () => {
    for (let n = 1; n <= PRESENCE_SOFT_MAX; n++) {
      expect(presenceLabel(n)).toBe("A few folks here now");
      expect(presenceLabel(n)).not.toMatch(/\d/);
    }
  });

  it("shows the exact count at 5 and above", () => {
    expect(presenceLabel(PRESENCE_SOFT_MAX + 1)).toBe("5 here now");
    expect(presenceLabel(5)).toBe("5 here now");
    expect(presenceLabel(12)).toBe("12 here now");
    expect(presenceLabel(50)).toBe("50 here now");
  });

  it("floors fractional counts and never invents padding", () => {
    expect(presenceLabel(4.9)).toBe("A few folks here now");
    expect(presenceLabel(5.1)).toBe("5 here now");
  });
});
