import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState, ReactNode } from "react";

// ============================================
// MYCELIUM NETWORK - Connecting lines that grow between elements
// ============================================
export function MyceliumBackground({ className = "" }: { className?: string }) {
  const [paths, setPaths] = useState<{ id: number; d: string; delay: number }[]>([]);
  
  useEffect(() => {
    // Generate organic, branching paths
    const generatePaths = () => {
      const newPaths = [];
      for (let i = 0; i < 12; i++) {
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        let d = `M ${startX} ${startY}`;
        
        // Create organic branching path
        let x = startX;
        let y = startY;
        const segments = 4 + Math.floor(Math.random() * 4);
        
        for (let j = 0; j < segments; j++) {
          const controlX1 = x + (Math.random() - 0.5) * 30;
          const controlY1 = y + (Math.random() - 0.5) * 30;
          x += (Math.random() - 0.5) * 40;
          y += (Math.random() - 0.5) * 40;
          d += ` Q ${controlX1} ${controlY1} ${x} ${y}`;
        }
        
        newPaths.push({
          id: i,
          d,
          delay: i * 0.3
        });
      }
      setPaths(newPaths);
    };
    
    generatePaths();
  }, []);

  return (
    <svg 
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="myceliumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(125, 216, 125, 0.3)" />
          <stop offset="50%" stopColor="rgba(212, 165, 116, 0.2)" />
          <stop offset="100%" stopColor="rgba(125, 216, 125, 0.1)" />
        </linearGradient>
      </defs>
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          fill="none"
          stroke="url(#myceliumGradient)"
          strokeWidth="0.15"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 3, delay: path.delay, ease: "easeOut" },
            opacity: { duration: 0.5, delay: path.delay }
          }}
        />
      ))}
      {/* Nodes at intersections */}
      {paths.map((path, i) => (
        <motion.circle
          key={`node-${i}`}
          cx={path.d.split(' ')[1]}
          cy={path.d.split(' ')[2]}
          r="0.4"
          fill="rgba(125, 216, 125, 0.5)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: path.delay + 0.5, duration: 0.5 }}
        />
      ))}
    </svg>
  );
}

// ============================================
// SPROUTING ANIMATION - Elements unfurl like leaves or ferns
// ============================================
export function SproutReveal({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ 
        opacity: 0, 
        scale: 0.8, 
        y: 30,
        rotateX: -15
      }}
      animate={isInView ? { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        rotateX: 0
      } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.34, 1.56, 0.64, 1] // Organic spring-like easing
      }}
      style={{ transformOrigin: "bottom center" }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ORGANIC BREATHING - Gentle pulsing like a forest at dawn
// ============================================
export function OrganicBreathing({ 
  children, 
  className = "",
  intensity = 1 
}: { 
  children: ReactNode; 
  className?: string;
  intensity?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1 + (0.02 * intensity), 1],
        opacity: [1, 0.95, 1]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ROOT GROWTH - Decorative roots spreading from edges
// ============================================
export function GrowingRoots({ 
  position = "bottom",
  color = "rgba(26, 71, 42, 0.2)"
}: { 
  position?: "top" | "bottom" | "left" | "right";
  color?: string;
}) {
  const rootPaths = [
    "M 0 100 Q 10 80 5 60 Q 0 40 8 20",
    "M 20 100 Q 25 75 18 50 Q 22 30 15 10",
    "M 40 100 Q 45 85 38 70 Q 42 55 35 40 Q 40 25 32 10",
    "M 60 100 Q 55 80 62 60 Q 58 40 65 20",
    "M 80 100 Q 85 75 78 55 Q 82 35 75 15",
    "M 100 100 Q 95 85 98 65 Q 92 45 97 25"
  ];

  const getTransform = () => {
    switch (position) {
      case "top": return "rotate(180deg)";
      case "left": return "rotate(90deg)";
      case "right": return "rotate(-90deg)";
      default: return "none";
    }
  };

  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ transform: getTransform() }}
    >
      {rootPaths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 2,
            delay: i * 0.2,
            ease: "easeOut"
          }}
        />
      ))}
    </svg>
  );
}

// ============================================
// FLOATING SPORES - Organic particle system
// ============================================
export function FloatingSpores({ 
  count = 20,
  className = "" 
}: { 
  count?: number;
  className?: string;
}) {
  const [spores, setSpores] = useState<{ id: number; x: number; size: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    const newSpores = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5
    }));
    setSpores(newSpores);
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {spores.map((spore) => (
        <motion.div
          key={spore.id}
          className="absolute rounded-full"
          style={{
            left: `${spore.x}%`,
            width: spore.size,
            height: spore.size,
            background: `radial-gradient(circle, rgba(125, 216, 125, 0.6) 0%, rgba(125, 216, 125, 0) 70%)`
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ 
            y: "-10vh", 
            opacity: [0, 0.8, 0.8, 0],
            x: [0, Math.sin(spore.id) * 30, 0]
          }}
          transition={{
            duration: spore.duration,
            delay: spore.delay,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// VINE BORDER - Animated vine growing around elements
// ============================================
export function VineBorder({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg 
        className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Main vine path around the border */}
        <motion.path
          d="M 5 0 Q 0 5 0 15 L 0 85 Q 0 95 5 100 L 95 100 Q 100 95 100 85 L 100 15 Q 100 5 95 0 L 5 0"
          fill="none"
          stroke="rgba(74, 124, 89, 0.4)"
          strokeWidth="0.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        {/* Small leaves along the vine */}
        {[15, 35, 55, 75, 95].map((pos, i) => (
          <motion.ellipse
            key={i}
            cx={i % 2 === 0 ? 2 : 98}
            cy={pos}
            rx="2"
            ry="1"
            fill="rgba(125, 216, 125, 0.5)"
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.5 + i * 0.2, duration: 0.4 }}
          />
        ))}
      </svg>
      {children}
    </div>
  );
}

// ============================================
// SEED TO TREE - Growth transformation animation
// ============================================
export function GrowthTransform({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ 
        scale: 0.3, 
        opacity: 0,
        filter: "blur(10px)"
      }}
      animate={isInView ? { 
        scale: 1, 
        opacity: 1,
        filter: "blur(0px)"
      } : {}}
      transition={{
        duration: 1.2,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// RIPPLE EFFECT - Water ripple on hover/click
// ============================================
export function RippleEffect({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
  };

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={handleClick}>
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(125, 216, 125, 0.4) 0%, transparent 70%)"
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}
      {children}
    </div>
  );
}

// ============================================
// PHOTOSYNTHESIS GLOW - Soft pulsing green glow
// ============================================
export function PhotosynthesisGlow({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        boxShadow: [
          "0 0 20px rgba(125, 216, 125, 0.2)",
          "0 0 40px rgba(125, 216, 125, 0.4)",
          "0 0 20px rgba(125, 216, 125, 0.2)"
        ]
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

// ============================================
// UNFURLING FERN - Spiral unfurl animation
// ============================================
export function UnfurlingFern({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ 
        opacity: 0, 
        rotate: -180,
        scale: 0.5
      }}
      animate={isInView ? { 
        opacity: 1, 
        rotate: 0,
        scale: 1
      } : {}}
      transition={{
        duration: 1,
        ease: [0.34, 1.56, 0.64, 1]
      }}
      style={{ transformOrigin: "center center" }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// NETWORK PULSE - Pulsing connection lines
// ============================================
export function NetworkPulse({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <motion.stop
            offset="0%"
            animate={{
              stopColor: ["rgba(125, 216, 125, 0)", "rgba(125, 216, 125, 0.8)", "rgba(125, 216, 125, 0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.stop
            offset="50%"
            animate={{
              stopColor: ["rgba(125, 216, 125, 0.8)", "rgba(125, 216, 125, 0)", "rgba(125, 216, 125, 0.8)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.stop
            offset="100%"
            animate={{
              stopColor: ["rgba(125, 216, 125, 0)", "rgba(125, 216, 125, 0.8)", "rgba(125, 216, 125, 0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </linearGradient>
      </defs>
      {/* Horizontal pulse lines */}
      <line x1="0" y1="30" x2="100" y2="30" stroke="url(#pulseGradient)" strokeWidth="0.2" />
      <line x1="0" y1="70" x2="100" y2="70" stroke="url(#pulseGradient)" strokeWidth="0.2" />
      {/* Vertical pulse lines */}
      <line x1="30" y1="0" x2="30" y2="100" stroke="url(#pulseGradient)" strokeWidth="0.2" />
      <line x1="70" y1="0" x2="70" y2="100" stroke="url(#pulseGradient)" strokeWidth="0.2" />
    </svg>
  );
}
