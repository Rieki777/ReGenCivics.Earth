/**
 * PathCardImage - Cross-fade illustrations for the 4 Paths to Play cards
 * Each card cross-fades between a default and activated illustration on hover/tap.
 * Additional CSS overlay effects enhance the transition.
 * 
 * Desktop: CSS group-hover from parent card
 * Mobile: tap-to-toggle via React state
 * All animations reverse smoothly (1s blend)
 */
import { useState, useCallback } from "react";

type CardType = "fund" | "land" | "ally" | "play";

interface PathCardImageProps {
  cardId: CardType;
  image: string;
  activatedImage: string;
  title: string;
  accentColor: string;
}

export function PathCardImage({ cardId, image, activatedImage, title, accentColor }: PathCardImageProps) {
  const [tapped, setTapped] = useState(false);

  // Mobile tap toggle (only for touch devices)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTapped(prev => !prev);
  }, []);

  return (
    <div
      className={`path-card-image path-card-${cardId} ${tapped ? "is-tapped" : ""}`}
      onTouchEnd={handleTouchEnd}
    >
      {/* Default illustration (visible by default, fades out on hover) */}
      <img
        src={image}
        alt={title}
        className="path-card-img path-card-img-default"
        loading="eager"
        decoding="async"
        draggable={false}
      />

      {/* Activated illustration (hidden by default, fades in on hover) */}
      <img
        src={activatedImage}
        alt={`${title} - activated`}
        className="path-card-img path-card-img-activated"
        loading="lazy"
        decoding="async"
        draggable={false}
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
