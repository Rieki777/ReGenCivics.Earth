/**
 * Additional Animation Components
 * More fun animations spread throughout the site
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";

// 1. Shimmer/Sparkle effect for text or badges
export function ShimmerText({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{ display: 'inline-block' }}
    >
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}

// 2. Floating/Hovering animation for cards or images
export function FloatingCard({ 
  children, 
  className = "",
  amplitude = 10,
  duration = 4
}: { 
  children: ReactNode; 
  className?: string;
  amplitude?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-amplitude, amplitude, -amplitude],
        rotate: [-1, 1, -1]
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

// 3. Ripple effect for buttons/interactive elements
export function RippleButton({ 
  children, 
  className = "",
  color = "#7dd87d"
}: { 
  children: ReactNode; 
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ border: `2px solid ${color}` }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
}

// 4. Staggered fade-in for lists/grids
export function StaggeredContainer({ 
  children, 
  className = "",
  staggerDelay = 0.1
}: { 
  children: ReactNode; 
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.5 }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// 5. Rotating border gradient effect
export function GlowingBorder({ 
  children, 
  className = "",
  colors = ["#7dd87d", "#d4a574", "#e07a5f", "#7dd87d"]
}: { 
  children: ReactNode; 
  className?: string;
  colors?: string[];
}) {
  return (
    <motion.div
      className={`relative p-[3px] rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(90deg, ${colors.join(', ')})`
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <div className="bg-white rounded-2xl h-full">
        {children}
      </div>
    </motion.div>
  );
}

// 6. Typewriter effect for text
export function TypewriterText({ 
  text, 
  className = "",
  speed = 50
}: { 
  text: string; 
  className?: string;
  speed?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * (speed / 1000) }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// 7. Parallax scroll effect
export function ParallaxSection({ 
  children, 
  className = "",
  speed = 0.5
}: { 
  children: ReactNode; 
  className?: string;
  speed?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ y: 0 }}
      whileInView={{ y: -30 * speed }}
      viewport={{ once: false, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// 8. Counter animation for numbers
export function AnimatedCounter({ 
  value, 
  className = "",
  duration = 2
}: { 
  value: number; 
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}
