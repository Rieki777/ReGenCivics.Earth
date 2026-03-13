/**
 * ReadingProgress - Thin progress bar at top of page showing scroll progress
 * Applied to long-form content pages (BlogPost, Opportunity, Fund, etc.)
 */
import { useState, useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-[#7dd87d] origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

export default ReadingProgress;
