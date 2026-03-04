import { useEffect, useRef, useState } from 'react';

/**
 * Simplified Chakra Scroll Animation
 * A clean, stable animation that reveals text as user scrolls
 */
export function ChakraScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionHeight = containerRef.current.offsetHeight;
      
      // Calculate progress from 0 to 1 as section scrolls through viewport
      const scrolled = windowHeight - rect.top;
      const total = windowHeight + sectionHeight;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simple opacity calculations based on scroll progress
  const headerOpacity = scrollProgress < 0.3 ? scrollProgress / 0.3 : 1;
  const humanOpacity = scrollProgress > 0.15 ? Math.min(1, (scrollProgress - 0.15) / 0.3) : 0;
  const text1Opacity = scrollProgress > 0.5 ? Math.min(1, (scrollProgress - 0.5) / 0.2) : 0;
  const text2Opacity = scrollProgress > 0.7 ? Math.min(1, (scrollProgress - 0.7) / 0.2) : 0;

  // Chakra colors
  const chakras = [
    { color: '#9b59b6', y: 8 },   // Crown - violet
    { color: '#6366f1', y: 18 },  // Third Eye - indigo
    { color: '#00bcd4', y: 30 },  // Throat - cyan
    { color: '#7dd87d', y: 44 },  // Heart - green
    { color: '#f1c40f', y: 58 },  // Solar Plexus - yellow
    { color: '#e67e22', y: 72 },  // Sacral - orange
    { color: '#e74c3c', y: 85 },  // Root - red
  ];

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[200vh] bg-gradient-to-b from-[#0a2818] via-[#1a472a] to-[#0a2818]"
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        
        {/* Header text */}
        <div 
          className="absolute top-20 text-center px-4 transition-opacity duration-300"
          style={{ opacity: headerOpacity }}
        >
          <h2 
            className="text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 italic"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            As you go, just remember...
          </h2>
        </div>

        {/* Simple glowing background circle */}
        <div 
          className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full transition-all duration-500"
          style={{ 
            opacity: humanOpacity * 0.3,
            background: 'radial-gradient(circle, rgba(125,216,125,0.3) 0%, transparent 70%)',
            transform: `scale(${1 + scrollProgress * 0.3})`,
          }}
        />

        {/* Human silhouette with chakras */}
        <div 
          className="relative z-10 transition-all duration-300"
          style={{ 
            opacity: humanOpacity,
            transform: `scale(${0.9 + humanOpacity * 0.1})`,
          }}
        >
          <svg 
            viewBox="0 0 100 200" 
            className="w-32 md:w-40 lg:w-48 h-auto"
            style={{ filter: 'drop-shadow(0 0 20px rgba(125, 216, 125, 0.4))' }}
          >
            {/* Simple human silhouette */}
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd87d" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#1a472a" stopOpacity="0.4"/>
              </linearGradient>
            </defs>
            
            {/* Head */}
            <ellipse cx="50" cy="15" rx="12" ry="14" fill="url(#bodyGrad)" />
            
            {/* Neck */}
            <rect x="46" y="28" width="8" height="10" fill="url(#bodyGrad)" />
            
            {/* Torso */}
            <path 
              d="M30 38 L70 38 L65 100 L35 100 Z" 
              fill="url(#bodyGrad)" 
            />
            
            {/* Arms */}
            <path d="M30 40 Q15 60 20 85" stroke="url(#bodyGrad)" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <path d="M70 40 Q85 60 80 85" stroke="url(#bodyGrad)" strokeWidth="8" fill="none" strokeLinecap="round"/>
            
            {/* Legs */}
            <path d="M40 100 L35 170" stroke="url(#bodyGrad)" strokeWidth="10" strokeLinecap="round"/>
            <path d="M60 100 L65 170" stroke="url(#bodyGrad)" strokeWidth="10" strokeLinecap="round"/>
            
            {/* Chakra points */}
            {chakras.map((chakra, i) => (
              <g key={i}>
                <circle 
                  cx="50" 
                  cy={chakra.y} 
                  r="4" 
                  fill={chakra.color}
                  style={{ 
                    filter: `drop-shadow(0 0 8px ${chakra.color})`,
                    opacity: humanOpacity,
                  }}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Reveal text 1 */}
        <div 
          className="absolute bottom-40 md:bottom-44 text-center px-4 transition-opacity duration-500"
          style={{ opacity: text1Opacity }}
        >
          <p 
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#7dd87d]"
            style={{ 
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 30px rgba(125, 216, 125, 0.5)',
            }}
          >
            Regeneration happens within
          </p>
        </div>

        {/* Reveal text 2 */}
        <div 
          className="absolute bottom-24 md:bottom-28 text-center px-4 transition-opacity duration-500"
          style={{ opacity: text2Opacity }}
        >
          <p 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white"
            style={{ 
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 40px rgba(125, 216, 125, 0.6)',
            }}
          >
            You
          </p>
        </div>

        {/* Simple floating particles - reduced count */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#7dd87d] animate-pulse"
              style={{
                left: `${10 + (i * 6)}%`,
                top: `${20 + (i * 4) % 60}%`,
                opacity: 0.3 + (i % 3) * 0.2,
                animationDelay: `${i * 0.3}s`,
                animationDuration: '3s',
              }}
            />
          ))}
        </div>

        {/* Scroll indicator */}
        {scrollProgress < 0.3 && (
          <div className="absolute bottom-8 text-white/50 text-sm animate-bounce">
            ↓ Scroll to Activate ↓
          </div>
        )}
      </div>
    </section>
  );
}

export default ChakraScrollAnimation;
