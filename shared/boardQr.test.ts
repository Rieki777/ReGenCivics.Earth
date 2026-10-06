/**
 * The week-board QR encodes the canonical https URL of that week, and a
 * decoder can read it back from the same modules the page draws.
 */
import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { qrDarkPath, qrMatrix, qrRaster } from "./boardQr";
import { sessionBoardShareUrl } from "./sessionBoard";

function decode(text: string): string | null {
  const raster = qrRaster(text, 4);
  const found = jsQR(raster.data, raster.width, raster.height);
  return found?.data ?? null;
}

describe("session board QR", () => {
  it("encodes each week's canonical https URL, with a quiet zone", () => {
    for (const week of [2, 7, 13]) {
      const url = sessionBoardShareUrl(week);
      expect(url).toBe(`https://regencivics.earth/season2/week/${week}`);
      const matrix = qrMatrix(url);
      expect(matrix.size).toBeGreaterThan(20);
      // A finder sits in the top-left, inside the quiet zone the SVG adds.
      expect(matrix.dark(0, 0)).toBe(true);
      expect(decode(url)).toBe(url);
      const path = qrDarkPath(matrix);
      const runs = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
      let covered = 0;
      for (const run of runs) {
        expect(run[3]).toBe(run[4]);
        covered += Number(run[3]);
      }
      let dark = 0;
      for (let y = 0; y < matrix.size; y++) {
        for (let x = 0; x < matrix.size; x++) if (matrix.dark(x, y)) dark++;
      }
      expect(covered).toBe(dark);
    }
  });
});
