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
 * Routes assets.regencivics.earth URLs through /api/img so they get
 * Sharp optimization (resize, webp, quality) just like cdnImg does.
 * Other URLs pass through unchanged.
 * Use this for avatars, banners, and any user-uploaded image.
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.includes("assets.regencivics.earth")) {
    // Route through /api/img for Sharp optimization (same proxy cdnImg uses)
    const params = new URLSearchParams({ url });
    params.set("q", "85");
    return `/api/img?${params.toString()}`;
  }
  return url;
}
