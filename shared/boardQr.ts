/**
 * QR matrix for a session-board link. Drawn by the week page as SVG, and
 * rasterized in tests so a decoder can confirm the URL. No image service.
 */
import QRCode from "qrcode";

/** Quiet zone, in modules. Four is the smallest a scanner can rely on. */
export const QR_QUIET = 4;
/** Dark modules. Forest ink on white, so a projected code still scans. */
export const QR_DARK = "#0a1f14";
export const QR_LIGHT = "#ffffff";

export type QrMatrix = {
  /** Modules on one side, not counting the quiet zone. */
  size: number;
  /** True when that module is dark. Coordinates sit inside the code. */
  dark: (x: number, y: number) => boolean;
};

/**
 * One SVG path of the dark modules, joined into horizontal runs.
 * Separate squares leave hairline gaps when the CSS size is not a whole
 * number of pixels per module, and a phone scanner misses the code.
 */
export function qrDarkPath(matrix: QrMatrix): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    let x = 0;
    while (x < matrix.size) {
      if (!matrix.dark(x, y)) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < matrix.size && matrix.dark(x, y)) x++;
      const w = x - x0;
      parts.push(`M${x0 + QR_QUIET} ${y + QR_QUIET}h${w}v1h-${w}z`);
    }
  }
  return parts.join("");
}

/** High error correction: a fold or a glare on a projection still scans. */
export function qrMatrix(text: string): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  return {
    size,
    dark: (x, y) => x >= 0 && y >= 0 && x < size && y < size && !!qr.modules.get(x, y),
  };
}

/**
 * One raster of the same matrix the SVG draws: quiet zone, dark ink on white,
 * `scale` pixels per module. A decoder reads this in tests.
 */
export function qrRaster(
  text: string,
  scale = 4,
): { data: Uint8ClampedArray; width: number; height: number } {
  const matrix = qrMatrix(text);
  const modules = matrix.size + QR_QUIET * 2;
  const width = modules * scale;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const my = Math.floor(y / scale) - QR_QUIET;
    for (let x = 0; x < width; x++) {
      const mx = Math.floor(x / scale) - QR_QUIET;
      const on = matrix.dark(mx, my);
      const i = (y * width + x) * 4;
      data[i] = on ? 0x0a : 0xff;
      data[i + 1] = on ? 0x1f : 0xff;
      data[i + 2] = on ? 0x14 : 0xff;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}
