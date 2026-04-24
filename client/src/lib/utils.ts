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

/**
 * Compact a number for display in small boxes. 1,234 -> "1.2K",
 * 1,500,000 -> "1.5M", 0..999 stays literal. Keeps one decimal when
 * abbreviated, drops trailing zeroes so 1000 reads as "1K" not "1.0K".
 * Negative numbers are preserved with the sign prefix.
 */
export function formatCompactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1_000) return `${sign}${Math.round(abs)}`;
  const trim = (v: number) => {
    const fixed = v.toFixed(1);
    return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  };
  if (abs < 1_000_000) return `${sign}${trim(abs / 1_000)}K`;
  if (abs < 1_000_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  return `${sign}${trim(abs / 1_000_000_000)}B`;
}

/**
 * Exact human-readable form with thousands separators. 1234567 -> "1,234,567".
 * Used inside the token detail dialog to show precise counts.
 */
export function formatExactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}
