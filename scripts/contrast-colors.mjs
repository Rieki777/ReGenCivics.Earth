/**
 * Color parsing for the contrast audit (scripts/contrast-audit.mjs).
 *
 * These functions run inside the audited page: the audit injects their source
 * with Function.prototype.toString, so each may call only the others in this
 * file and browser built-ins. They live here as real code so a test can
 * exercise them (server/contrast-colors.test.ts).
 *
 * Computed colors come back as rgb()/rgba() and, for Tailwind 4 opacity
 * modifiers (bg-white/95) and oklch theme tokens, as oklab(), oklch() or
 * color(srgb ...). Until 2026-09-27 the audit read only rgb(): it treated a
 * bg-white/95 card as transparent, measured its dark text against the dark
 * page behind it (21 false failures on /loi), and silently skipped every
 * element whose own text color was oklch.
 */

// A CSS number. "50%" scales by pctScale (default 1); "none" is 0.
export function num(s, fallback, pctScale) {
  if (s === undefined) return fallback;
  if (s === "none") return 0;
  if (s.endsWith("%")) return (parseFloat(s) / 100) * (pctScale === undefined ? 1 : pctScale);
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : fallback;
}

// OKLab to sRGB 0-255 (Ottosson's matrices), clamped to the gamut.
export function srgbFromOklab(L, A, B) {
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v)) * 255;
  });
}

// A computed color string as { r, g, b } 0-255 and alpha 0-1, or null.
export function parseColor(str) {
  if (!str) return null;
  const m = str.match(/(rgba?|oklab|oklch|color)\(([^)]+)\)/);
  if (!m) return null;
  const fn = m[1];
  let body = m[2].trim();
  let alpha = 1;
  if (body.includes("/")) {
    const halves = body.split("/");
    body = halves[0].trim();
    alpha = num(halves[1].trim(), 1);
  }
  const parts = body.split(/[\s,]+/).filter(Boolean);
  if (fn === "rgb" || fn === "rgba") {
    if (parts.length === 4) alpha = num(parts[3], 1);
    return { r: num(parts[0], 0, 255), g: num(parts[1], 0, 255), b: num(parts[2], 0, 255), a: alpha };
  }
  if (fn === "color") {
    if (parts[0] !== "srgb") return null; // display-p3 and friends: not measured
    return { r: num(parts[1], 0) * 255, g: num(parts[2], 0) * 255, b: num(parts[3], 0) * 255, a: alpha };
  }
  let rgb;
  if (fn === "oklab") {
    rgb = srgbFromOklab(num(parts[0], 0), num(parts[1], 0, 0.4), num(parts[2], 0, 0.4));
  } else {
    const C = num(parts[1], 0, 0.4);
    const H = (num(parts[2], 0) * Math.PI) / 180;
    rgb = srgbFromOklab(num(parts[0], 0), C * Math.cos(H), C * Math.sin(H));
  }
  return { r: rgb[0], g: rgb[1], b: rgb[2], a: alpha };
}

// The average of a gradient's stops, alpha included: bg-gradient from-x/15
// to-y/10 is a faint tint over whatever is behind it, not an opaque mid-tone.
export function avgGradientColor(bgImage) {
  if (!bgImage || bgImage === "none") return null;
  const stops = [...bgImage.matchAll(/(?:rgba?|oklab|oklch|color)\([^)]+\)/g)].map((m) => parseColor(m[0])).filter(Boolean);
  if (stops.length === 0) return null;
  const w = stops.reduce((sum, c) => sum + c.a, 0);
  if (w === 0) return null;
  return {
    r: stops.reduce((sum, c) => sum + c.r * c.a, 0) / w,
    g: stops.reduce((sum, c) => sum + c.g * c.a, 0) / w,
    b: stops.reduce((sum, c) => sum + c.b * c.a, 0) / w,
    a: w / stops.length,
  };
}

/** Source of all four, injected into the audited page. */
export const COLOR_FNS_SRC = [num, srgbFromOklab, parseColor, avgGradientColor].map((f) => f.toString()).join("\n");
