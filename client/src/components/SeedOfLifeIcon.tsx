/**
 * Seed of Life Icon
 * Sacred geometry symbol representing creation and interconnection
 * Features smooth rotation animation on hover with CSS keyframes
 */

interface SeedOfLifeIconProps {
  className?: string;
  size?: number;
  animate?: boolean;
  spinning?: boolean; // For loading spinner use
}

export function SeedOfLifeIcon({ 
  className = '', 
  size = 32, 
  animate = true,
  spinning = false 
}: SeedOfLifeIconProps) {
  // Determine animation class based on props
  const animationClass = spinning 
    ? 'animate-seed-spin' 
    : animate 
      ? 'seed-of-life-hover' 
      : '';

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={`${className} ${animationClass}`}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      {/* Center circle */}
      <circle cx="50" cy="50" r="16" />
      
      {/* Six surrounding circles forming the Seed of Life pattern */}
      <circle cx="50" cy="34" r="16" />
      <circle cx="63.86" cy="42" r="16" />
      <circle cx="63.86" cy="58" r="16" />
      <circle cx="50" cy="66" r="16" />
      <circle cx="36.14" cy="58" r="16" />
      <circle cx="36.14" cy="42" r="16" />
      
      {/* Outer boundary circle */}
      <circle cx="50" cy="50" r="32" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export default SeedOfLifeIcon;
