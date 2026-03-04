/**
 * FlipCard Component
 * Interactive flip card that reveals bullet points on hover/click
 * Features smooth fade-in animation on page load with staggered delays
 * Desktop: Click to expand card 300% with readable bullet points
 * Mobile: Tap to flip as before
 */

import { useState, useEffect, useRef } from 'react';
import { LucideIcon, X } from 'lucide-react';

interface BulletPoint {
  icon: LucideIcon;
  text: string;
}

interface FlipCardProps {
  frontIcon: LucideIcon;
  title: string;
  subtitle: string;
  bullets: BulletPoint[];
  className?: string;
  animationDelay?: number;
}

export function FlipCard({ 
  frontIcon: FrontIcon, 
  title, 
  subtitle, 
  bullets, 
  className = '',
  animationDelay = 0 
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Close expanded card on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    if (isExpanded) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isExpanded]);

  const handleClick = () => {
    // On desktop (md+), toggle expanded overlay
    if (window.innerWidth >= 768) {
      setIsExpanded(!isExpanded);
    } else {
      // On mobile, flip as before
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <>
      {/* Normal card */}
      <div 
        ref={cardRef}
        className={`group perspective-1000 cursor-pointer transition-all duration-700 ease-out ${className} ${
          isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-8 scale-95'
        }`}
        onClick={handleClick}
        onMouseEnter={() => { if (window.innerWidth < 768) setIsFlipped(true); }}
        onMouseLeave={() => { if (window.innerWidth < 768) setIsFlipped(false); }}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front of card */}
          <div 
            className="absolute inset-0 backface-hidden bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 text-center flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 rounded-full bg-gradient-to-br from-[#ffd700] to-[#7dd87d] flex items-center justify-center shadow-lg">
              <FrontIcon className="w-4 h-4 md:w-6 md:h-6 text-[#1a472a]" />
            </div>
            <h4 className="font-bold text-white text-xs md:text-base" style={{ fontFamily: 'var(--font-display)' }}>{title}</h4>
            <p className="text-white/70 text-[10px] md:text-sm leading-tight">{subtitle}</p>
            <div className="absolute top-1 right-1 md:top-2 md:right-2 text-[8px] md:text-xs font-semibold">
              <span className="bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] bg-clip-text text-transparent animate-gradient-text" style={{backgroundSize: '200% auto'}}>tap</span>
            </div>
          </div>

          {/* Back of card (mobile only) */}
          <div 
            className="absolute inset-0 backface-hidden bg-[#7dd87d]/20 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 rotate-y-180 overflow-hidden flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="space-y-0.5 md:space-y-1">
              {bullets.map((bullet, index) => {
                const BulletIcon = bullet.icon;
                return (
                  <div key={index} className="flex items-start gap-1 md:gap-1.5">
                    <BulletIcon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                    <span className="text-white/90 text-[8px] md:text-[11px] leading-tight">{bullet.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded overlay (desktop only) */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 hidden md:flex items-center justify-center"
          onClick={() => setIsExpanded(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#1a472a]/70 backdrop-blur-sm" />
          
          {/* Expanded card */}
          <div 
            className="relative z-10 w-[420px] max-w-[90vw] bg-gradient-to-br from-[#1a472a] to-[#2d5a3f] rounded-2xl p-8 shadow-2xl shadow-[#7dd87d]/20 border border-[#7dd87d]/30 animate-in zoom-in-75 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffd700] to-[#7dd87d] flex items-center justify-center shadow-lg">
                <FrontIcon className="w-8 h-8 text-[#1a472a]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
                <p className="text-white/70 text-base">{subtitle}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#7dd87d]/50 to-transparent mb-6" />

            {/* Expanded bullet points - much larger and readable */}
            <div className="space-y-4">
              {bullets.map((bullet, index) => {
                const BulletIcon = bullet.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BulletIcon className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <span className="text-white/90 text-lg leading-relaxed">{bullet.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FlipCard;
