/**
 * SmartImage — an <img> that never renders a broken box.
 *
 * On error it swaps to a fallback image if given, otherwise to a quiet
 * on-brand gradient placeholder with a small leaf glyph. While the real image
 * loads it shows a soft shimmer. Lazy and async-decoded by default, so it is
 * also a small performance win on cellular.
 *
 * Drop-in for <img>: pass src, alt, className as usual.
 */
import { useState } from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  src: string;
  alt: string;
  /** Optional replacement image used before the branded placeholder. */
  fallbackSrc?: string;
  /** Aspect ratio helper, e.g. "16/9" or "3/4". Applied as Tailwind aspect. */
  ratioClassName?: string;
}

export function SmartImage({
  src,
  alt,
  fallbackSrc,
  className,
  ratioClassName,
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [currentSrc, setCurrentSrc] = useState(src);

  const onError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setStatus("loading");
      return;
    }
    setStatus("error");
  };

  if (status === "error") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#16291d] via-[#1a472a] to-[#0f2117]",
          ratioClassName,
          className
        )}
      >
        <Leaf className="w-8 h-8 text-[#7dd87d]/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", ratioClassName, className)}>
      {status === "loading" && (
        <div className="absolute inset-0 bg-[#16291d] motion-safe:animate-pulse" aria-hidden="true" />
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={() => setStatus("loaded")}
        onError={onError}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          status === "loaded" ? "opacity-100" : "opacity-0"
        )}
        {...rest}
      />
    </div>
  );
}

export default SmartImage;
