/**
 * WCAG contrast for the few places a colour is chosen in code rather than in
 * a stylesheet: the need cards paint their verb button, value and kind chip
 * in the capital's own colour. Pure; no DOM.
 */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** "#rrggbb" or "#rgb" to [r, g, b]; null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Relative luminance, WCAG 2.x. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` laid over `bg` at `alpha` (0 to 1), as an opaque colour. */
export function mix(fg: string, bg: string, alpha: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  return toHex([0, 1, 2].map((i) => f[i] * alpha + b[i] * (1 - alpha)) as [number, number, number]);
}

/**
 * The colour, darkened toward black just enough to reach `min` contrast
 * against white. White text on it, and it as text on white, then read at
 * that ratio. The default 5.2 leaves room for the same colour as text on its
 * own 10% tint (the kind chip), which still clears 4.5.
 */
export function inkOnWhite(hex: string, min = 5.2): string {
  if (!parseHex(hex)) return hex;
  if (contrastRatio(hex, "#ffffff") >= min) return hex.toLowerCase();
  for (let step = 1; step <= 100; step++) {
    const c = mix("#000000", hex, step / 100);
    if (contrastRatio(c, "#ffffff") >= min) return c;
  }
  return "#000000";
}
