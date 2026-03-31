/**
 * LazyImage
 * Shows nothing (or a shimmer placeholder) until the image has fully loaded.
 * Drop-in replacement for <img> on any page that has images that pop in visibly.
 *
 * Usage:
 *   <LazyImage src="/hero.jpg" alt="Hero" className="w-full h-64 object-cover" />
 */

import { useState, useRef } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Aspect ratio placeholder while loading, e.g. "16/9" or "1/1". Defaults to no placeholder. */
  aspect?: string;
  /** Custom placeholder element shown while loading */
  placeholder?: React.ReactNode;
  /** Fallback image URL if src fails to load */
  fallbackSrc?: string;
}

export function LazyImage({ src, alt, className = "", aspect, placeholder, fallbackSrc, style, ...rest }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If image is already cached and decoded, mark as loaded immediately
  const handleRef = (el: HTMLImageElement | null) => {
    (imgRef as any).current = el;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  };

  const defaultPlaceholder = (
    <div
      className="animate-pulse bg-gradient-to-r from-[#1a472a]/10 via-[#4a7c59]/10 to-[#1a472a]/10 rounded"
      style={{ aspectRatio: aspect || "16/9", width: "100%" }}
    />
  );

  // When image fails: try fallback, or show a styled placeholder
  const errorFallback = (
    <div
      className="flex items-center justify-center bg-gradient-to-br from-[#1a472a]/20 to-[#4a7c59]/20 rounded text-[#1a472a]/40"
      style={{ aspectRatio: aspect || "16/9", width: "100%" }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );

  return (
    <span className="block relative" style={aspect ? { aspectRatio: aspect } : undefined}>
      {!loaded && !failed && (placeholder ?? defaultPlaceholder)}
      {failed && !fallbackSrc && errorFallback}
      <img
        ref={handleRef}
        src={failed && fallbackSrc ? fallbackSrc : src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0 w-full h-full"}`}
        style={style}
        loading="lazy"
        onLoad={() => { setLoaded(true); setFailed(false); }}
        onError={() => {
          if (!failed && fallbackSrc) {
            // Try fallback image
            setFailed(true);
            setLoaded(false);
          } else {
            // No fallback or fallback also failed
            setFailed(true);
            setLoaded(true);
          }
        }}
        {...rest}
      />
    </span>
  );
}

export default LazyImage;
