/**
 * Seed of Life Spinner
 * Animated loading spinner using the Seed of Life sacred geometry
 * Features smooth rotation and pulsing effects
 */

import { useState, useEffect } from 'react';

interface SeedOfLifeSpinnerProps {
  size?: number;
  className?: string;
}

// Playful loading messages that rotate
const loadingMessages = [
  "Growing possibilities...",
  "Planting seeds of change...",
  "Nurturing connections...",
  "Cultivating abundance...",
  "Weaving the web of life...",
];

export function SeedOfLifeSpinner({ size = 48, className = '' }: SeedOfLifeSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        width={size} 
        height={size}
        className="animate-seed-spin"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
      >
        {/* Center circle - pulses */}
        <circle 
          cx="50" cy="50" r="16" 
          className="text-current"
          style={{ 
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        
        {/* Six surrounding circles - staggered opacity animation */}
        <circle cx="50" cy="34" r="16" className="text-current" style={{ opacity: 0.9 }} />
        <circle cx="63.86" cy="42" r="16" className="text-current" style={{ opacity: 0.8 }} />
        <circle cx="63.86" cy="58" r="16" className="text-current" style={{ opacity: 0.7 }} />
        <circle cx="50" cy="66" r="16" className="text-current" style={{ opacity: 0.6 }} />
        <circle cx="36.14" cy="58" r="16" className="text-current" style={{ opacity: 0.5 }} />
        <circle cx="36.14" cy="42" r="16" className="text-current" style={{ opacity: 0.4 }} />
        
        {/* Outer boundary circle */}
        <circle cx="50" cy="50" r="32" strokeWidth="1" opacity="0.3" className="text-current" />
      </svg>
    </div>
  );
}

export function PageLoadingSpinner({ showMessage = true }: { showMessage?: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Rotate through loading messages
  useEffect(() => {
    if (!showMessage) return;
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [showMessage]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <SeedOfLifeSpinner size={80} className="text-[#7dd87d] mb-6" />
        {showMessage && (
          <p 
            className="text-[#7dd87d]/90 font-medium transition-opacity duration-300" 
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {loadingMessages[messageIndex]}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline spinner for buttons and small spaces
 */
export function InlineSpinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={`animate-seed-spin inline-block ${className}`}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <circle cx="50" cy="50" r="16" />
      <circle cx="50" cy="34" r="16" opacity="0.7" />
      <circle cx="63.86" cy="42" r="16" opacity="0.5" />
      <circle cx="63.86" cy="58" r="16" opacity="0.3" />
      <circle cx="50" cy="66" r="16" opacity="0.5" />
      <circle cx="36.14" cy="58" r="16" opacity="0.7" />
      <circle cx="36.14" cy="42" r="16" opacity="0.9" />
    </svg>
  );
}

export default SeedOfLifeSpinner;
