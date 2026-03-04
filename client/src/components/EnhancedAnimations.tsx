/**
 * Enhanced Organic Animations for ReGen Civics
 * High-quality, natural animations for professional polish
 */

import { motion, useInView, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState, ReactNode } from "react";

// ============================================
// 1. MORPHING BLOB BACKGROUND - Organic flowing shapes
// ============================================
export function MorphingBlob({ 
  className = "",
  color1 = "rgba(125, 216, 125, 0.15)",
  color2 = "rgba(74, 124, 89, 0.1)",
  size = 400
}: { 
  className?: string;
  color1?: string;
  color2?: string;
  size?: number;
}) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color1} 0%, ${color2} 50%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.2, 1.1, 1.3, 1],
          x: [0, 30, -20, 40, 0],
          y: [0, -20, 30, -10, 0],
          borderRadius: ["60% 40% 30% 70%", "30% 60% 70% 40%", "50% 60% 30% 60%", "60% 40% 60% 40%", "60% 40% 30% 70%"]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          left: size * 0.3,
          top: size * 0.2,
          background: `radial-gradient(circle, ${color2} 0%, ${color1} 50%, transparent 70%)`,
        }}
        animate={{
          scale: [1.1, 1, 1.2, 0.9, 1.1],
          x: [0, -40, 20, -30, 0],
          y: [0, 30, -20, 10, 0],
          borderRadius: ["40% 60% 60% 40%", "60% 40% 30% 70%", "40% 60% 70% 30%", "70% 30% 50% 50%", "40% 60% 60% 40%"]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
    </div>
  );
}

// ============================================
// 2. SPRING HOVER CARD - Natural bounce on interaction
// ============================================
export function SpringHoverCard({ 
  children, 
  className = "",
  hoverScale = 1.02,
  tapScale = 0.98
}: { 
  children: ReactNode; 
  className?: string;
  hoverScale?: number;
  tapScale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale: hoverScale,
        y: -5,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 17
        }
      }}
      whileTap={{ 
        scale: tapScale,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 17
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// 3. GRADIENT SHIMMER - Subtle color shifting
// ============================================
export function GradientShimmer({ 
  children, 
  className = "",
  colors = ["#1a472a", "#2d5a3d", "#4a7c59", "#2d5a3d", "#1a472a"]
}: { 
  children: ReactNode; 
  className?: string;
  colors?: string[];
}) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(90deg, ${colors.join(", ")})`
      }}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// 4. PARALLAX FLOAT - Elements float at different speeds
// ============================================
export function ParallaxFloat({ 
  children, 
  className = "",
  speed = 0.5,
  direction = "up"
}: { 
  children: ReactNode; 
  className?: string;
  speed?: number;
  direction?: "up" | "down";
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const multiplier = direction === "up" ? -1 : 1;
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed * multiplier, -100 * speed * multiplier]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y: smoothY }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// 5. MAGNETIC BUTTON - Follows cursor on hover
// ============================================
export function MagneticButton({ 
  children, 
  className = "",
  strength = 0.3
}: { 
  children: ReactNode; 
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// 6. STAGGERED WAVE REVEAL - Elements reveal in wave pattern
// ============================================
export function WaveReveal({ 
  children, 
  className = "",
  delay = 0,
  index = 0
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
  index?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ 
        opacity: 0, 
        y: 40,
        rotateX: -10
      }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0,
        rotateX: 0
      } : {}}
      transition={{
        duration: 0.7,
        delay: delay + (index * 0.1),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      style={{ perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// 7. GLOWING ORB - Ambient floating light
// ============================================
export function GlowingOrb({ 
  className = "",
  color = "rgba(125, 216, 125, 0.4)",
  size = 100,
  duration = 8
}: { 
  className?: string;
  color?: string;
  size?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(20px)"
      }}
      animate={{
        x: [0, 50, -30, 40, 0],
        y: [0, -40, 30, -20, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
        opacity: [0.6, 0.8, 0.5, 0.7, 0.6]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}

// ============================================
// BONUS: TEXT REVEAL - Character by character reveal
// ============================================
export function TextReveal({ 
  text, 
  className = "",
  delay = 0
}: { 
  text: string; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block mr-[0.25em]">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.4,
                delay: delay + (wordIndex * 0.1) + (charIndex * 0.03),
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

// ============================================
// BONUS: BREATHING ICON - Gentle pulse for icons
// ============================================
export function BreathingIcon({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.1, 1],
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
