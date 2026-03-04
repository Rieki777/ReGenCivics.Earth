/**
 * Flower of Life Icon Component
 * A sacred geometry pattern representing interconnection and creation
 * Used for the "Play the Game" menu
 */

import React from 'react';

interface FlowerOfLifeIconProps {
  className?: string;
  size?: number;
}

export function FlowerOfLifeIcon({ className = '', size = 24 }: FlowerOfLifeIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* Central circle */}
      <circle cx="50" cy="50" r="15" />
      
      {/* Six surrounding circles forming the flower pattern */}
      <circle cx="50" cy="35" r="15" />
      <circle cx="62.99" cy="42.5" r="15" />
      <circle cx="62.99" cy="57.5" r="15" />
      <circle cx="50" cy="65" r="15" />
      <circle cx="37.01" cy="57.5" r="15" />
      <circle cx="37.01" cy="42.5" r="15" />
      
      {/* Outer ring of circles */}
      <circle cx="50" cy="20" r="15" opacity="0.5" />
      <circle cx="75.98" cy="35" r="15" opacity="0.5" />
      <circle cx="75.98" cy="65" r="15" opacity="0.5" />
      <circle cx="50" cy="80" r="15" opacity="0.5" />
      <circle cx="24.02" cy="65" r="15" opacity="0.5" />
      <circle cx="24.02" cy="35" r="15" opacity="0.5" />
    </svg>
  );
}

export default FlowerOfLifeIcon;
