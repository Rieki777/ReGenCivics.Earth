/**
 * QuestCarousel - Netflix-style horizontal scrolling carousel for quest cards
 * Features:
 * - Smooth horizontal scroll with snap points
 * - Left/right navigation arrows (hidden on mobile, visible on hover on desktop)
 * - Peek effect showing partial next card to hint at more content
 * - Touch/swipe friendly on mobile
 * - Responsive card sizing
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestCarouselProps {
  children: React.ReactNode[];
  /** Show a "see all" count badge */
  totalCount?: number;
}

export function QuestCarousel({ children, totalCount }: QuestCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    
    // Also check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);
    
    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, children.length]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Scroll by approximately one card width + gap
    const cardWidth = el.querySelector('[data-carousel-item]')?.clientWidth || 300;
    const scrollAmount = cardWidth + 24; // card width + gap
    
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!children || children.length === 0) return null;

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Left arrow - desktop only */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1a472a]/90 text-white flex items-center justify-center shadow-lg transition-all duration-300 hover:bg-[#1a472a] hover:scale-110 ${
            isHovering ? 'opacity-100 -translate-x-1' : 'opacity-0 translate-x-2'
          } hidden md:flex`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* Right arrow - desktop only */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#1a472a]/90 text-white flex items-center justify-center shadow-lg transition-all duration-300 hover:bg-[#1a472a] hover:scale-110 ${
            isHovering ? 'opacity-100 translate-x-1' : 'opacity-0 -translate-x-2'
          } hidden md:flex`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4 md:-mx-0 md:px-0"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`
          .quest-carousel-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        {children.map((child, index) => (
          <div
            key={index}
            data-carousel-item
            className="snap-start flex-shrink-0 w-[85vw] sm:w-[300px] md:w-[320px] lg:w-[340px]"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Scroll indicators - mobile only */}
      {children.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          <ScrollDots scrollRef={scrollRef} itemCount={children.length} />
        </div>
      )}

      {/* Fade edges to hint at more content */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-4 w-8 md:w-16 bg-gradient-to-r from-[#f0ebe3] to-transparent pointer-events-none z-[5] hidden md:block" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-4 w-8 md:w-16 bg-gradient-to-l from-[#f0ebe3] to-transparent pointer-events-none z-[5] hidden md:block" />
      )}
    </div>
  );
}

/** Dot indicators for mobile that track scroll position */
function ScrollDots({ scrollRef, itemCount }: { scrollRef: React.RefObject<HTMLDivElement | null>; itemCount: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      const cardWidth = el.querySelector('[data-carousel-item]')?.clientWidth || 300;
      const gap = 16;
      const index = Math.round(el.scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(index, itemCount - 1));
    };
    
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef, itemCount]);

  // Show max 7 dots, compress if more
  const maxDots = Math.min(itemCount, 7);
  
  return (
    <>
      {Array.from({ length: maxDots }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === activeIndex
              ? 'w-6 h-2 bg-[#7dd87d]'
              : 'w-2 h-2 bg-[#1a472a]/30'
          }`}
        />
      ))}
    </>
  );
}

export default QuestCarousel;
