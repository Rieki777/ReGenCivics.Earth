import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Routes assets.regencivics.earth URLs through the server-side /api/img proxy.
 * The CDN is IP-allowlisted to Railway only, so browsers get 403 directly.
 * All client-side image references must go through this function.
 */
export function cdnImg(url: string, widthPx?: number, quality = 85): string {
  if (!url || !url.includes("assets.regencivics.earth")) return url;
  const params = new URLSearchParams({ url });
  if (widthPx) params.set("w", String(widthPx));
  params.set("q", String(quality));
  return `/api/img?${params.toString()}`;
}

/**
 * Resolves any R2 asset URL so it's loadable by the browser.
 * - assets.regencivics.earth URLs are routed through /storage/ (direct R2 proxy)
 * - Other URLs pass through unchanged.
 * Use this for avatars, banners, and any user-uploaded image where you
 * don't need Sharp optimization (cdnImg does optimization).
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.includes("assets.regencivics.earth")) {
    // Extract the path after the domain and route through the server proxy
    try {
      const parsed = new URL(url);
      return `/storage${parsed.pathname}`;
    } catch {
      // If URL parsing fails, try a simple string replace
      return url.replace(/https?:\/\/assets\.regencivics\.earth/, "/storage");
    }
  }
  return url;
}
