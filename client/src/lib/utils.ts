import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Routes assets.regencivics.earth URLs through the server-side /api/img proxy.
 * The CDN is IP-allowlisted to Railway only — browsers get 403 directly.
 * All client-side image references must go through this function.
 */
export function cdnImg(url: string, widthPx?: number, quality = 85): string {
  if (!url || !url.includes("assets.regencivics.earth")) return url;
  const params = new URLSearchParams({ url });
  if (widthPx) params.set("w", String(widthPx));
  params.set("q", String(quality));
  return `/api/img?${params.toString()}`;
}
