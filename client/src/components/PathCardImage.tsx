/**
 * PathCardImage - Cross-fade illustrations for the 4 Paths to Play cards
 * Each card cross-fades between a default and activated illustration on hover/tap.
 * Additional CSS overlay effects enhance the transition.
 * 
 * Desktop: CSS group-hover from parent card
 * Mobile: tap-to-toggle via React state
 * All animations reverse smoothly (1s blend)
 */
import { useState, useCallback, useMemo } from "react";
import { cdnImg } from "@/lib/utils";

type CardType = "fund" | "land" | "ally" | "play";

interface PathCardImageProps {
  /** When true, forces the activated image visible regardless of tap state.
   *  Used by ProgressiveOnboarding to flip the image when "More" expands. */
  forceActivated?: boolean;
  cardId: CardType;
  image: string;
  activatedImage: string;
  title: string;
  accentColor: string;
}

// Extract original R2 URL from a /api/img proxy URL
function getOriginalUrl(proxyUrl: string): string | null {
  if (!proxyUrl.includes('/api/img')) return null;
  try {
    const params = new URLSearchParams(proxyUrl.split('?')[1]);
    return params.get('url');
  } catch { return null; }
}

// Build srcSet string for multiple widths
function buildSrcSet(proxyUrl: string, widths: number[], quality = 75): string {
  const originalUrl = getOriginalUrl(proxyUrl);
  if (!originalUrl) return '';
  return widths.map(w => `${cdnImg(originalUrl, w, quality)} ${w}w`).join(', ');
}

export function PathCardImage({ cardId, image, activatedImage, title, accentColor, forceActivated = false }: PathCardImageProps) {
  const [tapped, setTapped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activatedError, setActivatedError] = useState(false);

  const defaultSrcSet = useMemo(() => buildSrcSet(image, [240, 480, 720]), [image]);
  const activatedSrcSet = useMemo(() => buildSrcSet(activatedImage, [240, 480, 720]), [activatedImage]);

  // Mobile tap toggle (only for touch devices)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTapped(prev => !prev);
  }, []);

  // On image error: try stripping the proxy (load original R2 URL directly as fallback)
  const handleImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // If the /api/img proxy failed, try the original R2 URL directly
    if (img.src.includes('/api/img') && !imgError) {
      const params = new URLSearchParams(img.src.split('?')[1]);
      const originalUrl = params.get('url');
      if (originalUrl) {
        setImgError(true);
        img.src = originalUrl;
      }
    }
  }, [imgError]);

  const handleActivatedError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.includes('/api/img') && !activatedError) {
      const params = new URLSearchParams(img.src.split('?')[1]);
      const originalUrl = params.get('url');
      if (originalUrl) {
        setActivatedError(true);
        img.src = originalUrl;
      }
    }
  }, [activatedError]);

  return (
    <div
      className={`path-card-image path-card-${cardId} ${(tapped || forceActivated) ? "is-tapped" : ""}`}
      onTouchEnd={handleTouchEnd}
    >
      {/* Default illustration (visible by default, fades out on hover) */}
      <img
        src={image}
        srcSet={defaultSrcSet || undefined}
        sizes="(max-width: 768px) 168px, 237px"
        alt={title}
        className="path-card-img path-card-img-default"
        width="237"
        height="237"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        onError={handleImgError}
      />

      {/* Activated illustration (hidden by default, fades in on hover) */}
      <img
        src={activatedImage}
        srcSet={activatedSrcSet || undefined}
        sizes="(max-width: 768px) 168px, 237px"
        alt={`${title} - activated`}
        className="path-card-img path-card-img-activated"
        width="237"
        height="237"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
        onError={handleActivatedError}
      />

      {/* Per-card overlay effects (enhance the cross-fade) */}
      {cardId === "fund" && (
        <div className="path-fx path-fx-fund">
          <div className="fund-glow" />
          <div className="fund-rays" />
        </div>
      )}

      {cardId === "land" && (
        <div className="path-fx path-fx-land">
          <div className="land-grow" />
          <div className="land-sparkles">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="land-spark" style={{ 
                '--spark-delay': `${i * 0.15}s`,
                '--spark-x': `${30 + Math.random() * 40}%`,
                '--spark-y': `${15 + Math.random() * 50}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}

      {cardId === "ally" && (
        <div className="path-fx path-fx-ally">
          <div className="ally-orb-glow" />
          <div className="ally-beam" />
          <div className="ally-beam-wide" />
          <div className="ally-particles">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="ally-particle" style={{
                '--particle-delay': `${i * 0.1}s`,
                '--particle-x': `${30 + Math.random() * 40}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}

      {cardId === "play" && (
        <div className="path-fx path-fx-play">
          <div className="play-trail">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="play-sparkle" style={{
                '--sparkle-delay': `${i * 0.15}s`,
                '--sparkle-y': `${30 + Math.random() * 40}%`,
                '--sparkle-x': `${40 + Math.random() * 35}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PathCardImage;
