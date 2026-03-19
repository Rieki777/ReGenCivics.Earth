/**
 * MycelialBackground Component
 * Creates a subtle light green mycelium thread pattern that connects across pages
 */
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function MycelialBackground() {
  const skipAnim = useReducedMotion();
  if (skipAnim) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30"
      aria-hidden="true"
      style={{ willChange: 'opacity' }}
    >
      <svg 
        className="w-full h-full" 
        viewBox="0 0 1920 1080" 
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="myceliumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd87d" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#5cb85c" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#7dd87d" stopOpacity="0.4"/>
          </linearGradient>
          <filter id="myceliumGlow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main mycelium network threads */}
        <g filter="url(#myceliumGlow)">
          {/* Horizontal flowing threads */}
          <path
            d="M-50 200 Q 200 180, 400 220 T 800 200 T 1200 240 T 1600 200 T 2000 220"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="1.5"
            className="animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <path
            d="M-50 400 Q 300 380, 500 420 T 900 400 T 1300 440 T 1700 400 T 2000 420"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
          <path
            d="M-50 600 Q 250 620, 450 580 T 850 620 T 1250 580 T 1650 620 T 2000 580"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="1.2"
            className="animate-pulse"
            style={{ animationDuration: '9s', animationDelay: '1s' }}
          />
          <path
            d="M-50 800 Q 350 780, 550 820 T 950 800 T 1350 840 T 1750 800 T 2000 820"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDuration: '11s', animationDelay: '3s' }}
          />
          
          {/* Vertical connecting threads */}
          <path
            d="M300 0 Q 320 200, 280 400 T 320 600 T 280 800 T 320 1100"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.8"
            className="animate-pulse"
            style={{ animationDuration: '12s' }}
          />
          <path
            d="M700 0 Q 680 250, 720 450 T 680 650 T 720 850 T 680 1100"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.8"
            className="animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '4s' }}
          />
          <path
            d="M1100 0 Q 1120 200, 1080 400 T 1120 600 T 1080 800 T 1120 1100"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.8"
            className="animate-pulse"
            style={{ animationDuration: '11s', animationDelay: '2s' }}
          />
          <path
            d="M1500 0 Q 1480 250, 1520 450 T 1480 650 T 1520 850 T 1480 1100"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.8"
            className="animate-pulse"
            style={{ animationDuration: '13s', animationDelay: '1s' }}
          />
          
          {/* Branching threads */}
          <path
            d="M400 220 Q 450 300, 500 350 T 600 450"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
          <path
            d="M800 200 Q 850 280, 900 320 T 1000 400"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
          <path
            d="M1200 240 Q 1150 320, 1100 380 T 1000 480"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
          <path
            d="M500 420 Q 550 500, 600 550 T 700 650"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
          <path
            d="M900 400 Q 950 480, 1000 530 T 1100 630"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
          <path
            d="M1300 440 Q 1250 520, 1200 580 T 1100 680"
            fill="none"
            stroke="url(#myceliumGradient)"
            strokeWidth="0.6"
          />
        </g>
        
        {/* Node points where threads connect */}
        {[
          { x: 400, y: 220 }, { x: 800, y: 200 }, { x: 1200, y: 240 }, { x: 1600, y: 200 },
          { x: 500, y: 420 }, { x: 900, y: 400 }, { x: 1300, y: 440 }, { x: 1700, y: 400 },
          { x: 450, y: 580 }, { x: 850, y: 620 }, { x: 1250, y: 580 }, { x: 1650, y: 620 },
          { x: 550, y: 820 }, { x: 950, y: 800 }, { x: 1350, y: 840 }, { x: 1750, y: 800 },
          { x: 300, y: 400 }, { x: 700, y: 450 }, { x: 1100, y: 400 }, { x: 1500, y: 450 },
        ].map((node, i) => (
          <circle
            key={i}
            cx={node.x}
            cy={node.y}
            r="3"
            fill="#7dd87d"
            opacity="0.4"
            className="animate-pulse"
            style={{ animationDuration: `${3 + (i % 4)}s`, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

export default MycelialBackground;
