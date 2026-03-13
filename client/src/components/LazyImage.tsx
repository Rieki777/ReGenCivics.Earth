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
}

export function LazyImage({ src, alt, className = "", aspect, placeholder, style, ...rest }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
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

  return (
    <span className="block relative" style={aspect ? { aspectRatio: aspect } : undefined}>
      {!loaded && (placeholder ?? defaultPlaceholder)}
      <img
        ref={handleRef}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0 w-full h-full"}`}
        style={style}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </span>
  );
}

export default LazyImage;
