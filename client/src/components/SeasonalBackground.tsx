/**
 * SeasonalBackground - Scroll-based seasonal background transitions
 * Crossfades between Spring, Summer, Fall, and Winter backgrounds as user scrolls
 */

import { useState, useEffect, useRef } from "react";

interface SeasonalBackgroundProps {
  springRef: React.RefObject<HTMLDivElement | null>;
  summerRef: React.RefObject<HTMLDivElement | null>;
  fallRef: React.RefObject<HTMLDivElement | null>;
  winterRef: React.RefObject<HTMLDivElement | null>;
}

export function SeasonalBackground({ springRef, summerRef, fallRef, winterRef }: SeasonalBackgroundProps) {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'fall' | 'winter'>('spring');
  const [transitionProgress, setTransitionProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      
      // Get positions of each season section
      const springTop = springRef.current?.offsetTop ?? 0;
      const summerTop = summerRef.current?.offsetTop ?? Infinity;
      const fallTop = fallRef.current?.offsetTop ?? Infinity;
      const winterTop = winterRef.current?.offsetTop ?? Infinity;
      
      // Determine current season based on scroll position
      // Add offset to trigger change slightly before reaching the section
      const offset = viewportHeight * 0.3;
      
      if (scrollY + offset >= winterTop) {
        setCurrentSeason('winter');
      } else if (scrollY + offset >= fallTop) {
        setCurrentSeason('fall');
      } else if (scrollY + offset >= summerTop) {
        setCurrentSeason('summer');
      } else {
        setCurrentSeason('spring');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [springRef, summerRef, fallRef, winterRef]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Spring Background */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          currentSeason === 'spring' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img 
          src="https://assets.regencivics.earth/HqkwLOeDYdCpbwla.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/80" />
      </div>
      
      {/* Summer Background */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          currentSeason === 'summer' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img 
          src="https://assets.regencivics.earth/hSCSMzfMvNBVNdFX.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/80" />
      </div>
      
      {/* Fall Background */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          currentSeason === 'fall' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img 
          src="https://assets.regencivics.earth/ZhVLJNePNkZErikp.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/80" />
      </div>
      
      {/* Winter Background */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          currentSeason === 'winter' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img 
          src="https://assets.regencivics.earth/TdRIxUeJvpmoVwvP.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/80" />
      </div>
      
      {/* Season indicator */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-[#1a472a]/10 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${
            currentSeason === 'spring' ? 'bg-pink-400' :
            currentSeason === 'summer' ? 'bg-green-500' :
            currentSeason === 'fall' ? 'bg-orange-500' :
            'bg-blue-300'
          }`} />
          <span className="text-sm font-medium text-[#1a472a] capitalize">{currentSeason}</span>
        </div>
      </div>
    </div>
  );
}
