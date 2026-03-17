/**
 * Page Transition Component
 * Wraps page content with smooth enter/exit animations
 * PageTransition uses framer-motion (runs once per page load, not a scroll-heavy cost).
 * All other helpers use CSS / data-reveal for scroll-triggered animations.
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Smooth fade + slide up transition — kept as framer-motion (one-time page enter)
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for organic feel
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scroll-triggered reveal — passthrough wrapper that adds data-reveal attribute
export function ScrollRevealMotion({
  children,
  className = "",
  direction = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "scale";
  delay?: number;
}) {
  const revealAttr = direction === "left" ? "left"
    : direction === "right" ? "right"
    : direction === "scale" ? "scale"
    : ""; // default empty string = fade-up

  return (
    <div
      data-reveal={revealAttr}
      data-reveal-delay={delay ? String(Math.round(delay * 1000)) : undefined}
      className={className}
    >
      {children}
    </div>
  );
}

// Hover scale card — CSS only
export function HoverCard({ children, className = "" }: { children: ReactNode; className?: string; scale?: number }) {
  return (
    <div className={`hover:scale-[1.02] hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer ${className}`}>
      {children}
    </div>
  );
}

// Pulse element — CSS animation class
export function PulseElement({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-pulse-green ${className}`}>
      {children}
    </div>
  );
}

// Float element — decorative, render children as-is
export function FloatElement({ children, className = "" }: { children: ReactNode; className?: string; amplitude?: number; duration?: number }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Glow pulse — decorative, render children as-is
export function GlowPulse({ children, className = "" }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Animated counter — plain span rendering the value
export function AnimatedCounter({ value, className = "" }: { value: number; duration?: number; className?: string }) {
  return (
    <span className={className}>
      {value.toLocaleString()}
    </span>
  );
}

// Stagger container — children animate via useGlobalScrollReveal data-reveal attributes
export function StaggerContainer({ children, className = "" }: { children: ReactNode; className?: string; staggerDelay?: number }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
