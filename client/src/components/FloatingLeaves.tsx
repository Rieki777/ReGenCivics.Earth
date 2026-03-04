/**
 * FloatingLeaves Component
 * Ambient floating leaf particles for a playful regenerative feel
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  type: 'leaf' | 'seed' | 'flower';
}

interface FloatingLeavesProps {
  count?: number;
  className?: string;
}

const LeafSVG = ({ size, type }: { size: number; type: string }) => {
  if (type === 'seed') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="8" rx="4" ry="6" fill="#7dd87d" opacity="0.7" />
        <path d="M12 14 Q10 18 12 22 Q14 18 12 14" fill="#5a9a5a" opacity="0.6" />
      </svg>
    );
  }
  if (type === 'flower') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="#d4a574" />
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <ellipse
            key={i}
            cx={12 + 5 * Math.cos((angle * Math.PI) / 180)}
            cy={12 + 5 * Math.sin((angle * Math.PI) / 180)}
            rx="3"
            ry="4"
            fill="#e07a5f"
            opacity="0.6"
            transform={`rotate(${angle} ${12 + 5 * Math.cos((angle * Math.PI) / 180)} ${12 + 5 * Math.sin((angle * Math.PI) / 180)})`}
          />
        ))}
      </svg>
    );
  }
  // Default leaf
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 Q4 8 4 16 Q8 20 12 22 Q16 20 20 16 Q20 8 12 2"
        fill="#7dd87d"
        opacity="0.7"
      />
      <path
        d="M12 6 L12 18"
        stroke="#5a9a5a"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
};

export default function FloatingLeaves({ count = 12, className = "" }: FloatingLeavesProps) {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    const types: Array<'leaf' | 'seed' | 'flower'> = ['leaf', 'seed', 'flower'];
    const newLeaves: Leaf[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: 16 + Math.random() * 16,
      rotation: Math.random() * 360,
      type: types[Math.floor(Math.random() * types.length)],
    }));
    setLeaves(newLeaves);
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{ left: `${leaf.x}%`, top: -50 }}
          initial={{ y: -50, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [leaf.rotation, leaf.rotation + 180],
            x: [0, Math.sin(leaf.id) * 100],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <LeafSVG size={leaf.size} type={leaf.type} />
        </motion.div>
      ))}
    </div>
  );
}
