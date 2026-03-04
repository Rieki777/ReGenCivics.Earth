/**
 * TextCarousel Component
 * Animated text carousel similar to SEEDS website
 * Cycles through phrases with a fade/slide animation
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TextCarouselProps {
  phrases: string[];
  interval?: number;
  className?: string;
}

export default function TextCarousel({ 
  phrases, 
  interval = 3000,
  className = ""
}: TextCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length);
    }, interval);

    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  return (
    <span className={`inline-block relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            duration: 0.5,
            ease: "easeInOut"
          }}
          className="inline-block"
        >
          {phrases[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
