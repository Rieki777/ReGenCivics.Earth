/**
 * Page Loading Spinner
 * Uses the Seed of Life sacred geometry icon as a loading indicator
 * for page transitions and initial page loads
 */

import { SeedOfLifeIcon } from './SeedOfLifeIcon';

interface PageLoadingSpinnerProps {
  isLoading: boolean;
  message?: string;
}

export function PageLoadingSpinner({ 
  isLoading, 
  message = "Growing possibilities..." 
}: PageLoadingSpinnerProps) {
  return (
    <div className={`page-loading-overlay ${!isLoading ? 'hidden' : ''}`}>
      <div className="loading-spinner-container">
        <SeedOfLifeIcon 
          size={80} 
          spinning={true}
          animate={false}
          className="text-white/90 drop-shadow-lg"
        />
        <p className="loading-text">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 * A smaller version for use within components (buttons, cards, etc.)
 */
export function InlineLoadingSpinner({ 
  size = 24,
  className = ''
}: { 
  size?: number;
  className?: string;
}) {
  return (
    <SeedOfLifeIcon 
      size={size} 
      spinning={true}
      animate={false}
      className={`inline-block ${className}`}
    />
  );
}

export default PageLoadingSpinner;
