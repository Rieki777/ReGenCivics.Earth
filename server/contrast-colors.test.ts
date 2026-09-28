/**
 * The contrast audit's color parsing (scripts/contrast-colors.mjs). The audit
 * injects these functions into every page it measures, so a gap here is a gap
 * in every report: until 2026-09-27 they read only rgb(), which turned a
 * bg-white/95 card transparent (21 false failures on /loi) and skipped all
 * oklch-colored text.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { COLOR_FNS_SRC, avgGradientColor, parseColor } from "../scripts/contrast-colors.mjs";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { CHECKER_SRC } from "../scripts/contrast-audit.mjs";

type Rgba = { r: number; g: number; b: number; a: number };

function round(c: Rgba | null) {
  return c && { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: Math.round(c.a * 1000) / 1000 };
}

describe("parseColor", () => {
  it("reads legacy rgb and rgba", () => {
    expect(round(parseColor("rgb(26, 71, 42)"))).toEqual({ r: 26, g: 71, b: 42, a: 1 });
    expect(round(parseColor("rgba(26, 71, 42, 0.75)"))).toEqual({ r: 26, g: 71, b: 42, a: 0.75 });
    expect(round(parseColor("rgba(0, 0, 0, 0)"))).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("reads the oklab() Chrome reports for bg-white/95", () => {
    expect(round(parseColor("oklab(0.999994 0.0000455678 0.0000200868 / 0.95)"))).toEqual({ r: 255, g: 255, b: 255, a: 0.95 });
  });

  it("reads oklch() theme tokens and palette colors", () => {
    expect(round(parseColor("oklch(1 0 0)"))).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(round(parseColor("oklch(0 0 0)"))).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    // The cream body text on the dark pages.
    expect(round(parseColor("oklch(0.95 0.01 85)"))).toEqual({ r: 241, g: 238, b: 231, a: 1 });
  });

  it("reads color(srgb) and declines what it cannot place", () => {
    expect(round(parseColor("color(srgb 1 0.5 0 / 0.5)"))).toEqual({ r: 255, g: 128, b: 0, a: 0.5 });
    expect(parseColor("color(display-p3 1 0 0)")).toBeNull();
    expect(parseColor("transparent")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("avgGradientColor", () => {
  it("keeps an opaque gradient opaque", () => {
    expect(round(avgGradientColor("linear-gradient(in oklab, rgb(26, 71, 42) 0%, rgb(13, 40, 24) 100%)"))).toEqual({
      r: 20,
      g: 56,
      b: 33,
      a: 1,
    });
  });

  it("keeps a faint tint faint (the footer card, from-[#d4a574]/15 to-[#4a7c59]/10)", () => {
    const tint = avgGradientColor(
      "linear-gradient(to right bottom, oklab(0.754057 0.0331773 0.0785563 / 0.15) 0%, oklab(0.540639 -0.0686999 0.0354407 / 0.1) 100%)",
    );
    expect(tint?.a).toBeCloseTo(0.125, 3);
  });

  it("returns null when there are no color stops", () => {
    expect(avgGradientColor("none")).toBeNull();
    expect(avgGradientColor("url(/a.png)")).toBeNull();
  });
});

describe("injection", () => {
  it("puts every color function into the page checker, and the checker still compiles", () => {
    for (const name of ["function num", "function srgbFromOklab", "function parseColor", "function avgGradientColor"]) {
      expect(COLOR_FNS_SRC).toContain(name);
      expect(CHECKER_SRC).toContain(name);
    }
    expect(() => new Function(CHECKER_SRC)).not.toThrow();
  });
});
