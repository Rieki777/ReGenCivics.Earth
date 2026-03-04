/**
 * PulsingGlow Component
 * Subtle breathing/pulsing glow animation for buttons and icons
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PulsingGlowProps {
  children: ReactNode;
  className?: string;
  color?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export default function PulsingGlow({ 
  children, 
  className = "",
  color = "#7dd87d",
  intensity = 'medium'
}: PulsingGlowProps) {
  const glowSizes = {
    subtle: { min: '0px', max: '10px' },
    medium: { min: '0px', max: '20px' },
    strong: { min: '5px', max: '30px' }
  };

  const glow = glowSizes[intensity];

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      animate={{
        filter: [
          `drop-shadow(0 0 ${glow.min} ${color}40)`,
          `drop-shadow(0 0 ${glow.max} ${color}60)`,
          `drop-shadow(0 0 ${glow.min} ${color}40)`,
        ],
        opacity: [0.9, 1, 0.9]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

// Animated icon wrapper with rotation
export function SpinningIcon({ 
  children, 
  className = "",
  duration = 20
}: { 
  children: ReactNode; 
  className?: string;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ rotate: 360 }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {children}
    </motion.div>
  );
}

// Bouncing animation for playful elements
export function BouncingElement({ 
  children, 
  className = "",
  delay = 0
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ 
        y: [0, -8, 0],
      }}
      transition={{
        duration: 2,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}
