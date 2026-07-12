/**
 * The Inner Compass: chart a voyage with the intuition that moves before
 * conscious awareness. Players design their own printable treasure map (the
 * token types they care about, the day rings, the chakra points if they
 * wish), print it big at any print shop, and dowse it with a pendulum under
 * one intention: the best timeline. Or they talk it out with the First Mate.
 * Or both.
 *
 * The poster is built as a deterministic SVG (buildPosterSvg, pure and
 * testable) and rasterized to a print-ready PNG entirely client-side. No
 * third-party imagery: the print is our own illustrated game board, drawn
 * from the same data as the live map.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow } from "./shipShared";
import {
  TYPE_META, ANCHORAGE, VOYAGE_DAYS, VOYAGE_RADIUS_MILES, crowMilesForDays,
  withinVoyageRange, litChakraPoints,
} from "./shipMapConfig";
import type { MapPin } from "./shipMapLayers";

// ── Poster geometry ───────────────────────────────────────────────────────────

export type PosterSize = { key: string; label: string; wIn: number; hIn: number };
export const POSTER_SIZES: PosterSize[] = [
  { key: "letter", label: 'Letter · 8.5 × 11"', wIn: 8.5, hIn: 11 },
  { key: "18x24", label: '18 × 24" poster', wIn: 18, hIn: 24 },
  { key: "24x36", label: '24 × 36" poster', wIn: 24, hIn: 36 },
];
const DPI = 150;

export type PosterOptions = {
  pins: MapPin[];
  types: string[];               // token types to draw
  includeChakras: boolean;
  wIn: number;
  hIn: number;
  dateLabel: string;             // deterministic input, e.g. "July 2026"
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Build the printable board as an SVG string. Pure: same inputs, same poster.
 * Local equirectangular projection centered on the anchorage; the horizon
 * circle spans the poster width.
 */
export function buildPosterSvg(o: PosterOptions): string {
  const W = Math.round(o.wIn * DPI);
  const H = Math.round(o.hIn * DPI);
  const margin = Math.round(W * 0.07);
  const titleBand = Math.round(H * 0.09);
  const radiusPx = Math.round((W - 2 * margin) / 2);
  const cx = Math.round(W / 2);
  const cy = margin + titleBand + radiusPx;
  const ink = "#22392a";
  const gold = "#8a5f22";
  const goldSoft = "#a8752f";

  // Degrees → px. One degree of latitude is ~69 miles.
  const radiusDegLat = VOYAGE_RADIUS_MILES / 69;
  const pxPerDegLat = radiusPx / radiusDegLat;
  const cosLat = Math.cos((ANCHORAGE[0] * Math.PI) / 180);
  const px = (lat: number, lng: number): [number, number] => [
    cx + (lng - ANCHORAGE[1]) * cosLat * pxPerDegLat,
    cy - (lat - ANCHORAGE[0]) * pxPerDegLat,
  ];

  const tokenR = Math.max(4, W * 0.0035);
  const chosen = new Set(o.types);
  const pins = o.pins.filter(
    (p) => chosen.has(p.type) && Number.isFinite(p.lat) && Number.isFinite(p.lng) && withinVoyageRange(p.lat, p.lng),
  );
  const counts = new Map<string, number>();
  for (const p of pins) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  // Parchment + frame.
  parts.push(`<rect width="${W}" height="${H}" fill="#f2e9d4"/>`);
  parts.push(`<rect x="${margin / 3}" y="${margin / 3}" width="${W - (2 * margin) / 3}" height="${H - (2 * margin) / 3}" fill="none" stroke="${ink}" stroke-width="${Math.max(3, W * 0.004)}"/>`);
  parts.push(`<rect x="${margin / 3 + W * 0.008}" y="${margin / 3 + W * 0.008}" width="${W - (2 * margin) / 3 - 2 * W * 0.008}" height="${H - (2 * margin) / 3 - 2 * W * 0.008}" fill="none" stroke="${goldSoft}" stroke-width="${Math.max(1.5, W * 0.0015)}"/>`);

  // Title band.
  const f = (n: number) => Math.round(n);
  parts.push(`<text x="${cx}" y="${margin + titleBand * 0.38}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${f(W * 0.045)}" fill="${ink}" letter-spacing="2">THE TREASURE MAP</text>`);
  parts.push(`<text x="${cx}" y="${margin + titleBand * 0.62}" text-anchor="middle" font-family="Georgia, serif" font-size="${f(W * 0.017)}" fill="${ink}" opacity="0.85">A ${VOYAGE_DAYS}-day sail from the anchorage · Ashland, Cascadia</text>`);
  parts.push(`<text x="${cx}" y="${margin + titleBand * 0.85}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${f(W * 0.0135)}" fill="${gold}">“Show me the voyage that brings the most growth and love. Show me my best timeline.”</text>`);

  // Map face + rings.
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${radiusPx}" fill="#eee1c2" stroke="${gold}" stroke-width="${Math.max(3, W * 0.0035)}"/>`);
  for (let day = 1; day < VOYAGE_DAYS; day++) {
    const r = (crowMilesForDays(day) / VOYAGE_RADIUS_MILES) * radiusPx;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${f(r)}" fill="none" stroke="${goldSoft}" stroke-width="${Math.max(1.5, W * 0.0015)}" stroke-dasharray="${f(W * 0.004)} ${f(W * 0.008)}"/>`);
    parts.push(`<text x="${cx}" y="${f(cy - r - W * 0.006)}" text-anchor="middle" font-family="Georgia, serif" font-size="${f(W * 0.011)}" fill="${gold}" letter-spacing="1.5">DAY ${day}</text>`);
  }
  parts.push(`<text x="${cx}" y="${f(cy - radiusPx - W * 0.006)}" text-anchor="middle" font-family="Georgia, serif" font-size="${f(W * 0.011)}" fill="${gold}" letter-spacing="1.5">DAY ${VOYAGE_DAYS} · THE HORIZON</text>`);

  // Cardinal letters.
  const card = f(W * 0.018);
  parts.push(`<text x="${cx}" y="${f(cy - radiusPx + card * 1.4)}" text-anchor="middle" font-family="Georgia, serif" font-size="${card}" fill="${ink}" opacity="0.7">N</text>`);
  parts.push(`<text x="${cx}" y="${f(cy + radiusPx - card * 0.7)}" text-anchor="middle" font-family="Georgia, serif" font-size="${card}" fill="${ink}" opacity="0.7">S</text>`);
  parts.push(`<text x="${f(cx + radiusPx - card)}" y="${f(cy + card * 0.35)}" text-anchor="middle" font-family="Georgia, serif" font-size="${card}" fill="${ink}" opacity="0.7">E</text>`);
  parts.push(`<text x="${f(cx - radiusPx + card)}" y="${f(cy + card * 0.35)}" text-anchor="middle" font-family="Georgia, serif" font-size="${card}" fill="${ink}" opacity="0.7">W</text>`);

  // Tokens (color-keyed to the legend; verified solid, unverified dashed).
  for (const p of pins) {
    const meta = TYPE_META[p.type] ?? { ring: "#2f5d3a" };
    const [x, y] = px(p.lat, p.lng);
    const dash = p.isVerified ? "" : ` stroke-dasharray="${(tokenR * 0.9).toFixed(1)} ${(tokenR * 0.7).toFixed(1)}"`;
    const op = p.isVerified ? 1 : 0.55;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${tokenR.toFixed(1)}" fill="#fffdf3" fill-opacity="${op}" stroke="${meta.ring}" stroke-opacity="${op}" stroke-width="${(tokenR * 0.4).toFixed(1)}"${dash}/>`);
  }

  // Chakra nodes with glow, joined by the energy line.
  if (o.includeChakras) {
    const lit = litChakraPoints();
    if (lit.length > 1) {
      const d = lit.map((c, i) => `${i === 0 ? "M" : "L"} ${px(c.lat, c.lng)[0].toFixed(1)} ${px(c.lat, c.lng)[1].toFixed(1)}`).join(" ");
      parts.push(`<path d="${d}" fill="none" stroke="#8a5fc9" stroke-width="${Math.max(1.5, W * 0.0015)}" stroke-dasharray="2 ${f(W * 0.006)}" opacity="0.8"/>`);
    }
    for (const c of lit) {
      const [x, y] = px(c.lat, c.lng);
      const r = tokenR * 2.1;
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.7).toFixed(1)}" fill="${c.color}" opacity="0.18"/>`);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c.color}" stroke="#fffdf3" stroke-width="${(tokenR * 0.5).toFixed(1)}"/>`);
      parts.push(`<text x="${(x + r * 1.6).toFixed(1)}" y="${(y + r * 0.4).toFixed(1)}" font-family="Georgia, serif" font-size="${f(W * 0.012)}" fill="${ink}">${esc(c.name)} · ${esc(c.place ?? "")}</text>`);
    }
  }

  // The anchorage: a small compass rose.
  {
    const [x, y] = px(ANCHORAGE[0], ANCHORAGE[1]);
    const r = tokenR * 2.6;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#12241a" stroke="#c9a227" stroke-width="${(tokenR * 0.5).toFixed(1)}"/>`);
    parts.push(`<polygon points="${x},${(y - r * 0.75).toFixed(1)} ${(x + r * 0.18).toFixed(1)},${y} ${x},${(y + r * 0.75).toFixed(1)} ${(x - r * 0.18).toFixed(1)},${y}" fill="#c9a227"/>`);
    parts.push(`<polygon points="${(x - r * 0.75).toFixed(1)},${y} ${x},${(y - r * 0.18).toFixed(1)} ${(x + r * 0.75).toFixed(1)},${y} ${x},${(y + r * 0.18).toFixed(1)}" fill="#e6e0c8"/>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${(y + r + W * 0.014).toFixed(1)}" text-anchor="middle" font-family="Georgia, serif" font-size="${f(W * 0.013)}" fill="${ink}">The Anchorage · Ashland</text>`);
  }

  // Legend.
  const legendTop = cy + radiusPx + Math.round(H * 0.03);
  const colW = Math.round((W - 2 * margin) / 2);
  const lineH = Math.round(W * 0.021);
  const legendTypes = o.types.filter((t) => TYPE_META[t]);
  legendTypes.forEach((t, i) => {
    const meta = TYPE_META[t];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = margin + col * colW;
    const ly = legendTop + row * lineH;
    parts.push(`<circle cx="${lx + tokenR * 1.5}" cy="${ly - tokenR * 0.6}" r="${tokenR.toFixed(1)}" fill="#fffdf3" stroke="${meta.ring}" stroke-width="${(tokenR * 0.4).toFixed(1)}"/>`);
    parts.push(`<text x="${lx + tokenR * 4}" y="${ly}" font-family="Georgia, serif" font-size="${f(W * 0.0135)}" fill="${ink}">${esc(meta.emoji)} ${esc(meta.label)} · ${counts.get(t) ?? 0}</text>`);
  });
  const legendRows = Math.ceil(legendTypes.length / 2);
  const noteY = legendTop + legendRows * lineH + Math.round(lineH * 0.6);
  parts.push(`<text x="${margin}" y="${noteY}" font-family="Georgia, serif" font-size="${f(W * 0.011)}" fill="${ink}" opacity="0.8">Solid tokens are verified treasure. Dashed tokens wait for a crew to confirm them in the field.</text>`);
  if (o.includeChakras) {
    parts.push(`<text x="${margin}" y="${noteY + lineH * 0.8}" font-family="Georgia, serif" font-size="${f(W * 0.011)}" fill="${ink}" opacity="0.8">Chakra points are symbolic energy centers of the region. Focus, release, clear, and heal as you visit each one.</text>`);
  }

  // Footer.
  parts.push(`<text x="${cx}" y="${H - margin / 1.6}" text-anchor="middle" font-family="Georgia, serif" font-size="${f(W * 0.0105)}" fill="${ink}" opacity="0.75">regencivics.earth/ship/map · Map data © OpenStreetMap contributors (ODbL) · Printed for the Inner Compass practice · ${esc(o.dateLabel)}</text>`);

  parts.push(`</svg>`);
  return parts.join("\n");
}

/** Rasterize the SVG to a print-ready PNG and download it. */
export function downloadPosterPng(svg: string, wPx: number, hPx: number, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = wPx;
        canvas.height = hPx;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        ctx.drawImage(img, 0, 0, wPx, hPx);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) { reject(new Error("could not rasterize")); return; }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(png);
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 10000);
          resolve();
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("could not load poster svg")); };
    img.src = url;
  });
}

// ── The section on the map page ───────────────────────────────────────────────

export function InnerCompassSection({ pins, activeTypes, onClose }: {
  pins: MapPin[];
  activeTypes: Set<string>;
  onClose: () => void;
}) {
  const allTypes = Object.keys(TYPE_META);
  const [types, setTypes] = useState<Set<string>>(activeTypes.size > 0 ? new Set(activeTypes) : new Set(allTypes));
  const [includeChakras, setIncludeChakras] = useState(true);
  const [sizeKey, setSizeKey] = useState("18x24");
  const [busy, setBusy] = useState(false);

  const inRangeCount = useMemo(
    () => pins.filter((p) => types.has(p.type) && Number.isFinite(p.lat) && Number.isFinite(p.lng) && withinVoyageRange(p.lat, p.lng)).length,
    [pins, types],
  );

  const toggle = (t: string) => setTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  async function generate() {
    const size = POSTER_SIZES.find((s) => s.key === sizeKey) ?? POSTER_SIZES[1];
    if (types.size === 0) { toast.error("Choose at least one kind of token for your map."); return; }
    setBusy(true);
    try {
      const dateLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const svg = buildPosterSvg({ pins, types: [...types], includeChakras, wIn: size.wIn, hIn: size.hIn, dateLabel });
      await downloadPosterPng(svg, Math.round(size.wIn * DPI), Math.round(size.hIn * DPI), `inner-compass-treasure-map-${size.key}.png`);
      toast.success("Your map is ready. Take the PNG to any print shop.");
    } catch {
      toast.error("Could not build the poster on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ShipSection className="bg-[#8a5fc9]/8">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between">
          <ShipEyebrow>🧭 Inner Compass</ShipEyebrow>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <h2 className="text-2xl font-bold mb-3">Chart by Inner Compass</h2>
        <p className="text-foreground/85 mb-3">
          There is an awareness in you that moves before thinking does. The Inner Compass practice charts your voyage with it.
          A pendulum works because tiny muscle movements below conscious awareness swing it; hold one over your printed map, and
          the deeper current in you points the way.
        </p>
        <ol className="space-y-2 mb-4 text-foreground/85 list-decimal list-inside">
          <li><strong>Design your map.</strong> Choose the tokens you want on your board below: springs, land projects, boondocks, whatever calls you.</li>
          <li><strong>Print it big.</strong> Download the poster and take it to a UPS, Staples, or a local print shop. 18 × 24 inches sits well under a pendulum.</li>
          <li><strong>Set the intention.</strong> Sit over the map and ask for the journey that brings the most growth and love. We call it your best timeline. Let the pendulum swing, and mark where it pulls.</li>
          <li><strong>Or talk it out.</strong> The First Mate knows this bioregion and will chart with you. Many voyagers do both and see where the two agree.</li>
        </ol>
        <p className="text-sm text-muted-foreground mb-4">Have fun with it. The whole point is that you live your best timeline.</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${types.has(t) ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "border-[#4a7c59]/30 hover:bg-[#4a7c59]/10"}`}
            >
              {TYPE_META[t].emoji} {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={includeChakras} onChange={(e) => setIncludeChakras(e.target.checked)} /> Chakra points
          </label>
          <select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Poster size">
            {POSTER_SIZES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
          <span className="text-sm text-muted-foreground">{inRangeCount} tokens on your board</span>
        </div>
        <Button onClick={generate} disabled={busy} className="bg-[#8a5fc9] hover:brightness-95">
          {busy ? "Drawing your map…" : "Download your printable map"}
        </Button>
      </div>
    </ShipSection>
  );
}
