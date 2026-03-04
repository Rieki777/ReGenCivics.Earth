/**
 * HoverCard - Wrapper that adds consistent hover micro-interactions
 * Subtle scale, shadow elevation, and border glow
 * Uses framer-motion for smooth 60fps animations
 */
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  /** Scale factor on hover (default 1.02) */
  scale?: number;
  /** Whether to add the green glow border on hover */
  glow?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export function HoverCard({
  children,
  className = "",
  scale = 1.02,
  glow = true,
  onClick,
}: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        scale,
        boxShadow: glow
          ? "0 8px 30px rgba(125, 216, 125, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)"
          : "0 8px 30px rgba(0, 0, 0, 0.15)",
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={`transition-colors ${glow ? "hover:border-[#7dd87d]/40" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export default HoverCard;
