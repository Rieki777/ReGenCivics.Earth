/**
 * Page Transition Component
 * Wraps page content with smooth enter/exit animations
 * Uses framer-motion for buttery smooth transitions
 */

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Smooth fade + slide up transition
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

// Staggered children animation - each child fades in sequentially
export function StaggerContainer({ children, className = "", staggerDelay = 0.08 }: { children: ReactNode; className?: string; staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scroll-triggered reveal animation
export function ScrollRevealMotion({ 
  children, 
  className = "",
  direction = "up",
  delay = 0,
}: { 
  children: ReactNode; 
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
}) {
  const directionMap = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover scale animation for interactive cards
export function HoverCard({ children, className = "", scale = 1.02 }: { children: ReactNode; className?: string; scale?: number }) {
  return (
    <motion.div
      whileHover={{ scale, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation for CTAs and important elements
export function PulseElement({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{ 
        boxShadow: [
          "0 0 0 0 rgba(125, 216, 125, 0.4)",
          "0 0 0 10px rgba(125, 216, 125, 0)",
          "0 0 0 0 rgba(125, 216, 125, 0)",
        ],
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Counter animation for numbers
export function AnimatedCounter({ value, duration = 1.5, className = "" }: { value: number; duration?: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  );
}

// Floating animation for decorative elements
export function FloatElement({ children, className = "", amplitude = 8, duration = 4 }: { children: ReactNode; className?: string; amplitude?: number; duration?: number }) {
  return (
    <motion.div
      animate={{ 
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{ 
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Glow pulse for badges and highlights
export function GlowPulse({ children, className = "", color = "rgba(125, 216, 125, 0.3)" }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 5px ${color}`,
          `0 0 20px ${color}`,
          `0 0 5px ${color}`,
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
