/**
 * PageBackground Component v5
 * - Uses CSS background-image with background-size: cover for guaranteed full coverage
 * - Separate desktop/mobile images via responsive switching
 * - Smooth parallax scrolling via background-position
 * - Theme-specific particle animations
 * - Themed loading transitions
 * - No more "image shorter than content" issues
 */

import { useEffect, useRef, useState, useMemo } from "react";

const particleScale = typeof window !== "undefined" && window.innerWidth < 768 ? 1 / 3 : 1;

// ─── Theme Animation Types ───────────────────────────────────────────────
export type PageTheme =
  | "forest"
  | "ocean"
  | "garden"
  | "sky"
  | "magic"
  | "cosmos"
  | "cosmos-forest";

/** Per-section overlay config for fine-grained control */
export interface SectionOverlay {
  /** CSS selector or data-section value to identify this section */
  id: string;
  /** Overlay opacity for this section (0-1) */
  opacity: number;
}

interface PageBackgroundProps {
  backgroundImage: string;
  mobileBackgroundImage?: string;
  children: React.ReactNode;
  overlayOpacity?: number;
  parallax?: boolean;
  parallaxSpeed?: number;
  className?: string;
  overlayColor?: string;
  /** Bottom color of the background image for blending (RGB) */
  blendColor?: string;
  /** Theme for page-specific animations */
  theme?: PageTheme;
  /** Per-section overlay opacity values for fine-tuned control.
   *  Each entry maps a section (by order, top to bottom) to its overlay opacity.
   *  Gradient transitions are automatically applied between sections. */
  sectionOverlays?: SectionOverlay[];
  /** Low-res blur placeholder image URL for progressive loading */
  blurPlaceholder?: string;
  /** Mobile low-res blur placeholder */
  mobileBlurPlaceholder?: string;
  /** Vertical background position offset to hide creases (e.g., "-20%") */
  backgroundPositionY?: string;
  /** When true, background scrolls WITH page content instead of being viewport-fixed.
   *  Use this for pages with tall narrative backgrounds (e.g. Home) so the visual
   *  journey reveals top-to-bottom as the user scrolls. Default is false (fixed). */
  scrollWithPage?: boolean;
  /** How the background image fits inside the container.
   *  "cover" (default) scales the image to cover the entire container, cropping as needed.
   *  "tile-vertical" anchors image to 100% width, preserves aspect ratio, repeats vertically.
   *    Ideal for tall multi-panel illustrations on very tall pages (e.g. Home) where you
   *    want the image at native horizontal resolution (no upscaling or cropping) and the
   *    vertical composition loops back to the top naturally. */
  backgroundFit?: "cover" | "tile-vertical" | "contain-width";
  /** When set, renders a subtle dark "glassy" wash over the whole background
   *  image to improve text legibility without obscuring the art. Accepts
   *  either a boolean (true = default 0.22 opacity) or a number between 0
   *  and 1 for custom opacity. Rendered above the image and below the
   *  per-section overlays. */
  glassOverlay?: boolean | number;
}

// ─── Theme-Specific Animated Particles ───────────────────────────────────

function ForestParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(30 * particleScale) }, (_, i) => ({
      id: i,
      type: i < 15 ? "firefly" : "leaf",
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 8 + Math.random() * 20,
      size: i < 15 ? 3 + Math.random() * 4 : 8 + Math.random() * 12,
      opacity: 0.15 + Math.random() * 0.5,
      drift: -30 + Math.random() * 60,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) =>
        p.type === "firefly" ? (
          <div
            key={p.id}
            className="absolute rounded-full animate-firefly"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: "rgba(255, 230, 100, 0.7)",
              boxShadow: `0 0 ${p.size * 3}px rgba(255, 230, 100, 0.5), 0 0 ${p.size * 6}px rgba(255, 200, 50, 0.2)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ) : (
          <div
            key={p.id}
            className="absolute animate-falling-leaf"
            style={{
              left: `${p.left}%`,
              top: `-${p.size}px`,
              width: `${p.size}px`,
              height: `${p.size * 0.7}px`,
              backgroundColor: ["rgba(125, 216, 125, 0.4)", "rgba(180, 220, 100, 0.35)", "rgba(100, 180, 80, 0.3)"][p.id % 3],
              borderRadius: "0 50% 50% 50%",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: p.opacity,
              ["--drift" as string]: `${p.drift}px`,
            }}
          />
        )
      )}
    </div>
  );
}

// Leaves-only variant used for the middle slice of the landing page (forest
// canopy through community + orchard). Same falling-leaf visual as the leaf
// half of ForestParticles, no fireflies.
function LeavesOnlyParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 10 + Math.random() * 18,
      size: 8 + Math.random() * 12,
      opacity: 0.2 + Math.random() * 0.45,
      drift: -30 + Math.random() * 60,
      colorIdx: i % 3,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-falling-leaf"
          style={{
            left: `${p.left}%`,
            top: `-${p.size}px`,
            width: `${p.size}px`,
            height: `${p.size * 0.7}px`,
            backgroundColor: [
              "rgba(125, 216, 125, 0.4)",
              "rgba(180, 220, 100, 0.35)",
              "rgba(100, 180, 80, 0.3)",
            ][p.colorIdx],
            borderRadius: "0 50% 50% 50%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function OceanParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(25 * particleScale) }, (_, i) => ({
      id: i,
      type: i < 10 ? "lightray" : i < 18 ? "fish" : "bubble-tiny",
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 10 + Math.random() * 20,
      size: i < 10 ? 2 + Math.random() * 3 : i < 18 ? 6 + Math.random() * 8 : 3 + Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.3,
    }))
  );
  const lightrays = useMemo(() => particles.filter(p => p.type === "lightray"), [particles]);
  const fish = useMemo(() => particles.filter(p => p.type === "fish"), [particles]);
  const bubbles = useMemo(() => particles.filter(p => p.type === "bubble-tiny"), [particles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {lightrays.map((p) => (
        <div
          key={p.id}
          className="absolute animate-light-ray"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: `${40 + Math.random() * 80}px`,
            height: "40%",
            background: `linear-gradient(to bottom, rgba(200, 230, 255, ${p.opacity}) 0%, transparent 100%)`,
            transform: `rotate(${-5 + Math.random() * 10}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {fish.map((p) => (
        <div
          key={p.id}
          className="absolute animate-swimming-fish"
          style={{
            left: `-${p.size * 2}px`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.5}px`,
            backgroundColor: ["rgba(100, 200, 255, 0.3)", "rgba(255, 180, 100, 0.25)", "rgba(200, 150, 255, 0.2)"][p.id % 3],
            borderRadius: "60% 40% 40% 60%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
          }}
        />
      ))}
      {bubbles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-tiny-rise"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: `${p.size}px`,
            height: `${p.size}px`,
            border: "1px solid rgba(200, 230, 255, 0.2)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

function GardenParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(25 * particleScale) }, (_, i) => ({
      id: i,
      type: i < 12 ? "butterfly" : "pollen",
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 12 + Math.random() * 20,
      size: i < 12 ? 8 + Math.random() * 10 : 2 + Math.random() * 4,
      opacity: 0.15 + Math.random() * 0.4,
      drift: -40 + Math.random() * 80,
    }))
  );
  const butterflies = useMemo(() => particles.filter(p => p.type === "butterfly"), [particles]);
  const pollen = useMemo(() => particles.filter(p => p.type === "pollen"), [particles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {butterflies.map((p) => (
        <div
          key={p.id}
          className="absolute animate-butterfly"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            background: ["rgba(255, 180, 200, 0.4)", "rgba(200, 150, 255, 0.35)", "rgba(255, 220, 100, 0.3)"][p.id % 3],
            borderRadius: "50% 50% 20% 20%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
      {pollen.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-pollen-drift"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: "rgba(255, 240, 180, 0.5)",
            boxShadow: `0 0 ${p.size * 2}px rgba(255, 240, 180, 0.3)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

function SkyParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(20 * particleScale) }, (_, i) => ({
      id: i,
      type: i < 10 ? "cloud" : "energy",
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 25,
      size: i < 10 ? 40 + Math.random() * 80 : 4 + Math.random() * 6,
      opacity: 0.05 + Math.random() * 0.15,
    }))
  );

  const clouds = useMemo(() => particles.filter(p => p.type === "cloud"), [particles]);
  const energies = useMemo(() => particles.filter(p => p.type === "energy"), [particles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {clouds.map((p) => (
        <div
          key={p.id}
          className="absolute animate-cloud-drift"
          style={{
            left: `-${p.size}px`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.4}px`,
            background: `radial-gradient(ellipse, rgba(200, 230, 255, ${p.opacity}) 0%, transparent 70%)`,
            borderRadius: "50%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {energies.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-energy-pulse"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: "rgba(0, 220, 255, 0.4)",
            boxShadow: `0 0 ${p.size * 3}px rgba(0, 220, 255, 0.3)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity * 2,
          }}
        />
      ))}
    </div>
  );
}

function MagicParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(30 * particleScale) }, (_, i) => ({
      id: i,
      type: i < 15 ? "sparkle" : "magic-trail",
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 6 + Math.random() * 15,
      size: i < 15 ? 3 + Math.random() * 5 : 2 + Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.5,
      drift: -50 + Math.random() * 100,
    }))
  );
  const sparkles = useMemo(() => particles.filter(p => p.type === "sparkle"), [particles]);
  const trails = useMemo(() => particles.filter(p => p.type === "magic-trail"), [particles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {sparkles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-sparkle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: ["rgba(255, 215, 0, 0.6)", "rgba(200, 150, 255, 0.5)", "rgba(100, 255, 200, 0.5)"][p.id % 3],
            boxShadow: `0 0 ${p.size * 2}px ${["rgba(255, 215, 0, 0.4)", "rgba(200, 150, 255, 0.3)", "rgba(100, 255, 200, 0.3)"][p.id % 3]}`,
            borderRadius: "50%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {trails.map((p) => (
        <div
          key={p.id}
          className="absolute animate-magic-trail"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size * 8}px`,
            background: `linear-gradient(to bottom, rgba(200, 150, 255, ${p.opacity}) 0%, transparent 100%)`,
            borderRadius: "50%",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// Cosmos: shooting stars streaking across a twinkling night sky.
// Mix of slow-drifting twinkles (ambient starlight) and fast diagonal
// shooting-star streaks (rare, bright moments).
function CosmosParticles() {
  const [particles] = useState(() =>
    Array.from({ length: Math.round(26 * particleScale) }, (_, i) => ({
      id: i,
      // 20 twinkles (ambient), 6 shooting stars (moments). Comet count cut
      // roughly in half so the sky mostly twinkles with occasional streaks.
      type: i < 20 ? "twinkle" : "shooting",
      left: Math.random() * 100,
      // Shooting stars start in the upper ~27% of the cosmos container so
      // they visibly originate from the sky, not from the rooftops of the
      // village panel below. Twinkles can be anywhere.
      top: i < 20 ? Math.random() * 100 : Math.random() * 27,
      // Delay window widened so fewer comets are spread across more time,
      // which doubles the average gap between visible streaks.
      delay: Math.random() * 30,
      // Shooters: 6-11s total animation so the brief visible portion
      // (~20% of the keyframe) maps to ~1.2-2.2s of on-screen comet,
      // with long dead time between flashes so the sky mostly twinkles.
      duration: i < 20 ? 3 + Math.random() * 5 : 6 + Math.random() * 5,
      size: i < 20 ? 1.5 + Math.random() * 2.5 : 2 + Math.random() * 2,
      opacity: i < 20 ? 0.3 + Math.random() * 0.5 : 0.7 + Math.random() * 0.3,
      // shooting-star angle: mostly top-left to bottom-right, with variation
      angle: 15 + Math.random() * 25,
      // shooting-star travel distance, shorter so streaks feel like
      // brief flashes rather than full-screen sweeps
      travel: 22 + Math.random() * 24,
    }))
  );
  const twinkles = useMemo(() => particles.filter(p => p.type === "twinkle"), [particles]);
  const shooters = useMemo(() => particles.filter(p => p.type === "shooting"), [particles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {twinkles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-star-twinkle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            boxShadow: `0 0 ${p.size * 3}px rgba(200, 220, 255, 0.6), 0 0 ${p.size * 6}px rgba(180, 200, 255, 0.25)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
          }}
        />
      ))}
      {shooters.map((p) => (
        <div
          key={p.id}
          className="absolute animate-shooting-star"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${90 + Math.random() * 80}px`,
            height: `${p.size}px`,
            background: "linear-gradient(90deg, transparent 0%, rgba(200, 220, 255, 0.25) 30%, rgba(255, 255, 255, 0.95) 85%, rgba(255, 255, 255, 1) 100%)",
            borderRadius: "999px",
            boxShadow: `0 0 ${p.size * 4}px rgba(200, 220, 255, 0.7), 0 0 ${p.size * 8}px rgba(180, 200, 255, 0.3)`,
            opacity: 0,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationFillMode: "backwards",
            ["--angle" as string]: `${p.angle}deg`,
            ["--travel" as string]: `${p.travel}vw`,
          }}
        />
      ))}
    </div>
  );
}

// Cosmos + Forest: layered theme for the landing page. Animations are tied
// to the 10-panel vertical illustration of the background:
//   - Top ~12% (the starry village panel): cosmos particles (shooting stars,
//     twinkles)
//   - Next 50% of the page (12% to 62%: the forest canopy, deep forest,
//     community, and orchard panels): falling leaves only
//   - Below 62% (pollinator meadow, underground soil, mycelium, roots to
//     Earth): no particles. The underground and cosmic sections stay still.
// Each inner component renders with absolute inset-0 so it fills whichever
// container wraps it.
function CosmosForestParticles() {
  // Cosmos zone extends to 22% so shooting-star streaks finish their fade-out
  // within the container. Previously h-[12%] clipped comets mid-trajectory and
  // created a visible horizontal line. Leaves still start at 12% (canopy
  // panel), so 12-22% naturally overlaps comets fading + early leaves falling.
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[22%] overflow-hidden pointer-events-none z-10">
        <CosmosParticles />
      </div>
      <div className="absolute inset-x-0 top-[12%] h-[50%] overflow-hidden pointer-events-none z-10">
        <LeavesOnlyParticles />
      </div>
    </>
  );
}

// Theme particle selector
function ThemeParticles({ theme }: { theme: PageTheme }) {
  switch (theme) {
    case "forest": return <ForestParticles />;
    case "ocean": return <OceanParticles />;
    case "garden": return <GardenParticles />;
    case "sky": return <SkyParticles />;
    case "magic": return <MagicParticles />;
    case "cosmos": return <CosmosParticles />;
    case "cosmos-forest": return <CosmosForestParticles />;
    default: return <ForestParticles />;
  }
}

// ─── Themed Loading Shimmer ──────────────────────────────────────────────

function ThemedLoadingShimmer({ theme, overlayColor }: { theme: PageTheme; overlayColor: string }) {
  const shimmerConfig = useMemo(() => {
    switch (theme) {
      case "forest": return { accent: "rgba(125, 216, 125, 0.15)", icon: "🌿" };
      case "ocean": return { accent: "rgba(100, 200, 255, 0.15)", icon: "🌊" };
      case "garden": return { accent: "rgba(255, 180, 200, 0.15)", icon: "🌸" };
      case "sky": return { accent: "rgba(0, 220, 255, 0.15)", icon: "☁️" };
      case "magic": return { accent: "rgba(200, 150, 255, 0.15)", icon: "✨" };
      case "cosmos": return { accent: "rgba(200, 220, 255, 0.18)", icon: "✨" };
      case "cosmos-forest": return { accent: "rgba(200, 220, 255, 0.18)", icon: "✨" };
      default: return { accent: "rgba(125, 216, 125, 0.15)", icon: "🌿" };
    }
  }, [theme]);

  return (
    <div
      className="absolute inset-0 z-[1] flex items-center justify-center"
      style={{ backgroundColor: `rgb(${overlayColor})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            110deg,
            rgba(${overlayColor}, 1) 0%,
            rgba(${overlayColor}, 1) 40%,
            ${shimmerConfig.accent} 50%,
            rgba(${overlayColor}, 1) 60%,
            rgba(${overlayColor}, 1) 100%
          )`,
          backgroundSize: "200% 100%",
          animation: "bg-shimmer 2s ease-in-out infinite",
        }}
      />
      <div className="relative z-10 text-4xl animate-pulse opacity-60">
        {shimmerConfig.icon}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

// ─── Per-Section Overlay with Gradient Transitions ─────────────────────

function SectionOverlayLayer({
  overlayColor,
  overlayOpacity,
  sectionOverlays,
  containerRef,
}: {
  overlayColor: string;
  overlayOpacity: number;
  sectionOverlays?: SectionOverlay[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // On mobile: skip the per-scroll DOM query entirely, use a static gradient instead.
    // The getBoundingClientRect() loop on every scroll frame causes layout thrashing on mobile.
    const isMobileDevice = window.innerWidth < 768;
    if (!sectionOverlays || sectionOverlays.length === 0 || !containerRef.current || !overlayRef.current) return;
    if (isMobileDevice) return;

    let ticking = false;
    const updateOverlay = () => {
      if (!containerRef.current || !overlayRef.current) return;

      const container = containerRef.current;
      const containerHeight = container.scrollHeight;
      if (containerHeight === 0) return;

      // Find all <section> elements inside the content layer
      const sections = container.querySelectorAll(".page-bg-content > section, .page-bg-content > div > section, .page-bg-content > * > section");
      
      // Build gradient stops based on section positions and their overlay values
      const stops: string[] = [];
      
      if (sections.length === 0 || sectionOverlays.length === 0) {
        // Fallback: use the default gradient
        overlayRef.current.style.background = `linear-gradient(to bottom, rgba(${overlayColor}, ${overlayOpacity * 0.7}) 0%, rgba(${overlayColor}, ${overlayOpacity * 0.55}) 15%, rgba(${overlayColor}, ${overlayOpacity * 0.6}) 50%, rgba(${overlayColor}, ${overlayOpacity * 0.75}) 85%, rgba(${overlayColor}, 0.9) 100%)`;
        return;
      }

      // Map each section to its position percentage and overlay value
      const containerRect = container.getBoundingClientRect();
      const sectionPositions: { pctStart: number; pctMid: number; pctEnd: number; opacity: number }[] = [];

      sections.forEach((section, i) => {
        const rect = section.getBoundingClientRect();
        const relTop = rect.top - containerRect.top;
        const relBottom = relTop + rect.height;
        const pctStart = (relTop / containerHeight) * 100;
        const pctMid = ((relTop + rect.height / 2) / containerHeight) * 100;
        const pctEnd = (relBottom / containerHeight) * 100;
        
        // Use the matching sectionOverlay or fall back to default
        const overlayConfig = sectionOverlays[i];
        const opacity = overlayConfig ? overlayConfig.opacity : overlayOpacity;
        
        sectionPositions.push({ pctStart, pctMid, pctEnd, opacity });
      });

      // Build smooth gradient with transition zones between sections
      // Start with a slightly stronger overlay at the very top
      stops.push(`rgba(${overlayColor}, ${(sectionPositions[0]?.opacity ?? overlayOpacity) * 0.85}) 0%`);

      sectionPositions.forEach((pos, i) => {
        // Main section opacity at its midpoint
        stops.push(`rgba(${overlayColor}, ${pos.opacity}) ${pos.pctMid.toFixed(1)}%`);
        
        // If there's a next section, create a smooth transition in the gap
        if (i < sectionPositions.length - 1) {
          const next = sectionPositions[i + 1];
          const transitionPct = (pos.pctEnd + next.pctStart) / 2;
          const transitionOpacity = (pos.opacity + next.opacity) / 2;
          stops.push(`rgba(${overlayColor}, ${transitionOpacity}) ${transitionPct.toFixed(1)}%`);
        }
      });

      // End with a strong overlay at the bottom for footer blending
      const lastOpacity = sectionPositions[sectionPositions.length - 1]?.opacity ?? overlayOpacity;
      stops.push(`rgba(${overlayColor}, ${Math.min(lastOpacity * 1.2, 0.92)}) 95%`);
      stops.push(`rgba(${overlayColor}, 0.92) 100%`);

      overlayRef.current.style.background = `linear-gradient(to bottom, ${stops.join(", ")})`;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateOverlay();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial calculation after a brief delay to let sections render
    const timer = setTimeout(updateOverlay, 100);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateOverlay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateOverlay);
    };
  }, [sectionOverlays, overlayColor, overlayOpacity, containerRef]);

  // If no per-section overlays, use the classic static gradient
  if (!sectionOverlays || sectionOverlays.length === 0) {
    return (
      <div
        className="absolute inset-0 z-[3]"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(${overlayColor}, ${overlayOpacity * 0.7}) 0%,
            rgba(${overlayColor}, ${overlayOpacity * 0.55}) 10%,
            rgba(${overlayColor}, ${overlayOpacity * 0.55}) 30%,
            rgba(${overlayColor}, ${overlayOpacity * 0.6}) 50%,
            rgba(${overlayColor}, ${overlayOpacity * 0.65}) 70%,
            rgba(${overlayColor}, ${overlayOpacity * 0.75}) 90%,
            rgba(${overlayColor}, 1) 100%
          )`,
        }}
      />
    );
  }

  return <div ref={overlayRef} className="absolute inset-0 z-[3]" />;
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function PageBackground({
  backgroundImage,
  mobileBackgroundImage,
  children,
  overlayOpacity = 0.5,
  parallax = true,
  parallaxSpeed = 0.3,
  className = "",
  overlayColor = "26, 71, 42",
  blendColor,
  theme = "forest",
  sectionOverlays,
  blurPlaceholder,
  mobileBlurPlaceholder,
  backgroundPositionY = "top",
  scrollWithPage = false,
  backgroundFit = "cover",
  glassOverlay,
}: PageBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [mobileBgLoaded, setMobileBgLoaded] = useState(false);
  const [blurLoaded, setBlurLoaded] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [mobileBgFailed, setMobileBgFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const effectiveBlendColor = blendColor || overlayColor;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Preload blur placeholder first (tiny, loads fast)
  useEffect(() => {
    const placeholderUrl = isMobile && mobileBlurPlaceholder ? mobileBlurPlaceholder : blurPlaceholder;
    if (placeholderUrl) {
      const img = new window.Image();
      img.onload = () => setBlurLoaded(true);
      img.src = placeholderUrl;
    }
  }, [blurPlaceholder, mobileBlurPlaceholder, isMobile]);

  // Preload desktop background image
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setBgLoaded(true);
    img.onerror = () => setBgFailed(true);
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Preload mobile background image
  useEffect(() => {
    if (mobileBackgroundImage) {
      const img = new window.Image();
      img.onload = () => setMobileBgLoaded(true);
      img.onerror = () => setMobileBgFailed(true);
      img.src = mobileBackgroundImage;
    }
  }, [mobileBackgroundImage]);

  // JS parallax, translates background at parallaxSpeed so it moves slower than content.
  // Only runs on desktop when parallax=true and scrollWithPage=false.
  // Uses requestAnimationFrame + translateY for GPU-accelerated smooth scroll on all browsers
  // including iOS Safari (which breaks background-attachment: fixed).
  useEffect(() => {
    if (!parallax || scrollWithPage || isMobile) return;
    let ticking = false;
    const update = () => {
      if (!bgRef.current) return;
      bgRef.current.style.transform = `translateY(${window.scrollY * (1 - parallaxSpeed)}px)`;
      ticking = false;
    };
    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      if (bgRef.current) bgRef.current.style.transform = "";
    };
  }, [parallax, scrollWithPage, isMobile, parallaxSpeed]);

  const isLoaded = isMobile && mobileBackgroundImage ? mobileBgLoaded : bgLoaded;
  const isFailed = isMobile && mobileBackgroundImage ? mobileBgFailed : bgFailed;
  const activeImage = isMobile && mobileBackgroundImage ? mobileBackgroundImage : backgroundImage;
  const activePlaceholder = isMobile && mobileBlurPlaceholder ? mobileBlurPlaceholder : blurPlaceholder;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: `rgb(${effectiveBlendColor})` }}
    >
      {/* Themed loading shimmer - only show if no blur placeholder and still loading */}
      {!isLoaded && !blurLoaded && !isFailed && <ThemedLoadingShimmer theme={theme} overlayColor={overlayColor} />}

      {/* Blur placeholder layer - shows while full image loads.
          When full image fails, remove blur so placeholder shows at native resolution. */}
      {activePlaceholder && !isLoaded && blurLoaded && (
        <div
          className="absolute inset-0 z-[1] transition-all duration-500 opacity-100"
          style={{
            backgroundImage: `url(${activePlaceholder})`,
            backgroundSize: "cover",
            backgroundPosition: `center ${backgroundPositionY || "top"}`,
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "scroll",
            filter: isFailed ? "none" : "blur(20px)",
            transform: isFailed ? "none" : "scale(1.1)",
          }}
        />
      )}

      {/* Fallback: if no blur placeholder either, show solid color bg */}
      {!activePlaceholder && !isLoaded && isFailed && (
        <div
          className="absolute inset-0 z-[1]"
          style={{ backgroundColor: `rgb(${effectiveBlendColor})` }}
        />
      )}

      {/* Full-res background image layer */}
      {/* scrollWithPage=true: image scrolls 1:1 with content */}
      {/* scrollWithPage=false + parallax=true (default): JS translateY creates smooth depth parallax */}
      <div
        ref={bgRef}
        className={`absolute z-[2] transition-opacity duration-1000 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          inset: "0",
          backgroundImage: `url(${activeImage})`,
          backgroundSize:
            backgroundFit === "tile-vertical" || backgroundFit === "contain-width"
              ? "100% auto"
              : "cover",
          backgroundPosition:
            backgroundFit === "tile-vertical" || backgroundFit === "contain-width"
              ? `center top`
              : `center ${backgroundPositionY || "top"}`,
          backgroundRepeat:
            backgroundFit === "tile-vertical" ? "repeat-y" : "no-repeat",
          backgroundAttachment: "scroll",
          willChange: parallax && !scrollWithPage && !isMobile ? "transform" : "auto",
        }}
      />

      {/* Glassy wash over the whole background. Combines a real backdrop
          blur (so the image feels like it lives BEHIND a glass window)
          with a cool-tinted radial wash and a soft highlight band across
          the top. The blur is intentionally small so content stays
          recognizable while feeling pushed behind glass, and the cool
          tint unifies the whole page without the old dark vignette look.
          Stays above the image and below per-section overlays and
          particles so authored overlays and animated elements remain
          crisp. */}
      {glassOverlay && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            // Minimal blur + slight desaturation = "glass window" feel
            // without destroying the art. Values kept small for mobile
            // GPU performance; browsers without backdrop-filter support
            // just see the cool tint gradient below.
            backdropFilter: "blur(2px) saturate(0.92)",
            WebkitBackdropFilter: "blur(2px) saturate(0.92)",
            background: (() => {
              const base =
                typeof glassOverlay === "number" ? glassOverlay : 0.22;
              const center = Math.max(0, base - 0.08);
              const edge = Math.min(1, base + 0.04);
              // Cool dark blueish radial wash (center lighter so text
              // sits in the calm middle, edges slightly heavier for
              // vignette) + a soft highlight band at the very top to
              // read as a glass reflection.
              return [
                `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 18%)`,
                `radial-gradient(ellipse at center, rgba(18, 32, 42, ${center}) 0%, rgba(14, 26, 36, ${base}) 55%, rgba(8, 18, 28, ${edge}) 100%)`,
              ].join(", ");
            })(),
          }}
        />
      )}

      {/* Per-section overlay with gradient transitions */}
      <SectionOverlayLayer
        overlayColor={overlayColor}
        overlayOpacity={overlayOpacity}
        sectionOverlays={sectionOverlays}
        containerRef={containerRef}
      />

      {/* Theme-specific particles. Previously disabled on mobile to avoid
          scroll jank, but every effect (comets, leaves, fireflies, sparkles)
          is CSS-driven so there's no per-frame JS work. Enabling them on
          mobile per Rye's 2026-04-27 ask. The prefers-reduced-motion check
          inside AmbientParticles still suppresses motion for users who
          explicitly opted out. */}
      <ThemeParticles theme={theme} />

      {/* Content layer */}
      <div className="relative z-20 page-bg-content">
        {children}
      </div>
    </div>
  );
}

export { ForestParticles, OceanParticles, GardenParticles, SkyParticles, MagicParticles, ThemeParticles };
export type { PageBackgroundProps };
