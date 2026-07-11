/**
 * "My voyage" — a lightweight, client-side voyage builder. Crews add pins from
 * the map into an ordered list held in localStorage (no account needed), see it
 * drawn as a dashed route, and export it as GPX or open it in Google Maps to
 * navigate in their own app. The concierge itinerary is the server-side cousin;
 * this is the hand-built one anyone can start from the map.
 */
export type VoyagePin = { id: number; slug: string; name: string; type: string; lat: number; lng: number };

const KEY = "ship_voyage_v1";

export function loadVoyage(): VoyagePin[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVoyage(pins: VoyagePin[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pins));
    window.dispatchEvent(new CustomEvent("ship-voyage-changed"));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function addToVoyage(pin: VoyagePin): VoyagePin[] {
  const pins = loadVoyage();
  if (pins.some((p) => p.id === pin.id)) return pins;
  const next = [...pins, pin];
  saveVoyage(next);
  return next;
}

export function removeFromVoyage(id: number): VoyagePin[] {
  const next = loadVoyage().filter((p) => p.id !== id);
  saveVoyage(next);
  return next;
}

export function clearVoyage(): void {
  saveVoyage([]);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build a GPX 1.1 document: each stop a waypoint, plus an ordered route. */
export function voyageToGpx(pins: VoyagePin[]): string {
  const wpts = pins
    .map((p) => `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(p.name)}</name><type>${escapeXml(p.type)}</type></wpt>`)
    .join("\n");
  const rtepts = pins
    .map((p) => `    <rtept lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(p.name)}</name></rtept>`)
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="ReGen Ship" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata><name>ReGen Ship voyage</name></metadata>\n` +
    `${wpts}\n` +
    `  <rte><name>ReGen Ship voyage</name>\n${rtepts}\n  </rte>\n` +
    `</gpx>\n`
  );
}

export function downloadVoyageGpx(pins: VoyagePin[]): void {
  const blob = new Blob([voyageToGpx(pins)], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "regen-ship-voyage.gpx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Google Maps directions URL through the ordered stops (nav in the user's app). */
export function voyageToGoogleMapsUrl(pins: VoyagePin[]): string {
  if (pins.length === 0) return "https://www.google.com/maps";
  const pts = pins.map((p) => `${p.lat},${p.lng}`);
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
}
