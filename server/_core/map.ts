/**
 * Google Maps API server-side helper
 * Requires GOOGLE_MAPS_API_KEY env var.
 */

const MAPS_BASE = "https://maps.googleapis.com";

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${MAPS_BASE}${endpoint}`);
  url.searchParams.append("key", getApiKey());

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
  });

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Maps API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

// Common type helpers
export type LatLng = { lat: number; lng: number };
export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
