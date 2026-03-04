/**
 * HeroIllustration - Scroll-triggered illustration for persona page heroes
 * Shows the default illustration, then cross-fades to the activated version
 * when the user scrolls to the hero section (with a configurable delay).
 * 
 * Reuses the same illustration pairs from the homepage path cards.
 */
import { useState, useEffect, useRef } from "react";
import "./HeroIllustration.css";

type HeroType = "fund" | "land" | "ally" | "play";

interface HeroIllustrationProps {
  heroType: HeroType;
  defaultImage: string;
  activatedImage: string;
  alt: string;
  /** Delay in ms before the activation animation starts after scroll-into-view */
  activationDelay?: number;
  className?: string;
}

export function HeroIllustration({
  heroType,
  defaultImage,
  activatedImage,
  alt,
  activationDelay = 800,
  className = "",
}: HeroIllustrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  // Intersection Observer: detect when the hero scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  // Delayed activation after becoming visible
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setIsActivated(true), activationDelay);
    return () => clearTimeout(timer);
  }, [isVisible, activationDelay]);

  return (
    <div
      ref={containerRef}
      className={`hero-illustration hero-illust-${heroType} ${isVisible ? "is-visible" : ""} ${isActivated ? "is-activated" : ""} ${className}`}
    >
      {/* Default illustration */}
      <img
        src={defaultImage}
        alt={alt}
        className="hero-illust-img hero-illust-default"
        loading="eager"
        draggable={false}
      />

      {/* Activated illustration */}
      <img
        src={activatedImage}
        alt={`${alt} - activated`}
        className="hero-illust-img hero-illust-activated"
        loading="eager"
        draggable={false}
      />

      {/* Per-type overlay effects */}
      {heroType === "fund" && (
        <div className="hero-fx hero-fx-fund">
          <div className="hero-fund-glow" />
          <div className="hero-fund-rays" />
        </div>
      )}

      {heroType === "land" && (
        <div className="hero-fx hero-fx-land">
          <div className="hero-land-grow" />
          <div className="hero-land-sparkles">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="hero-land-spark" style={{
                '--spark-delay': `${i * 0.12}s`,
                '--spark-x': `${20 + Math.random() * 60}%`,
                '--spark-y': `${10 + Math.random() * 60}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}

      {heroType === "ally" && (
        <div className="hero-fx hero-fx-ally">
          <div className="hero-ally-orb" />
          <div className="hero-ally-beam" />
          <div className="hero-ally-particles">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="hero-ally-particle" style={{
                '--particle-delay': `${i * 0.08}s`,
                '--particle-x': `${25 + Math.random() * 50}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}

      {heroType === "play" && (
        <div className="hero-fx hero-fx-play">
          <div className="hero-play-trail">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="hero-play-sparkle" style={{
                '--sparkle-delay': `${i * 0.12}s`,
                '--sparkle-y': `${25 + Math.random() * 50}%`,
                '--sparkle-x': `${30 + Math.random() * 45}%`,
              } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroIllustration;
