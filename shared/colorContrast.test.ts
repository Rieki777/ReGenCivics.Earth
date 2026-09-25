import { describe, expect, it } from "vitest";
import { contrastRatio, inkOnWhite, mix, parseHex } from "./colorContrast";
import { CAPITAL_COLORS } from "./crowdpoolingTaxonomy";

describe("contrastRatio", () => {
  it("matches the WCAG reference points", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // The review's measurements on the need cards, white text on the capital colour.
    expect(contrastRatio("#ffffff", CAPITAL_COLORS.social)).toBeCloseTo(3.09, 1);
    expect(contrastRatio("#ffffff", CAPITAL_COLORS.living)).toBeCloseTo(3.24, 1);
  });

  it("parses short and long hex, and refuses anything else", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("1a472a")).toEqual([26, 71, 42]);
    expect(parseHex("red")).toBeNull();
  });
});

describe("inkOnWhite on every capital colour", () => {
  for (const [capital, color] of Object.entries(CAPITAL_COLORS)) {
    it(`${capital}: white text on it, and it as text on white or on its own tint, all read at 4.5:1 or better`, () => {
      const ink = inkOnWhite(color);
      expect(contrastRatio("#ffffff", ink)).toBeGreaterThanOrEqual(4.5);
      // The kind chip: the ink as text on the capital colour at 10% over white.
      expect(contrastRatio(ink, mix(color, "#ffffff", 0x1a / 255))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("leaves a colour that already reads alone", () => {
    expect(inkOnWhite("#1a472a")).toBe("#1a472a");
  });
});

describe("the offer sheet's send button", () => {
  it("white on the deep green reads well past 4.5:1", () => {
    expect(contrastRatio("#ffffff", "#1a472a")).toBeGreaterThanOrEqual(4.5);
  });
});
