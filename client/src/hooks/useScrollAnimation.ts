import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

// Animation class helper
export function getAnimationClass(
  isVisible: boolean,
  animation: 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale-in' | 'blur-in' = 'fade-in',
  delay: number = 0
): string {
  const baseClasses = 'transition-all duration-700 ease-out';
  const delayClass = delay > 0 ? `delay-${delay}` : '';
  
  if (!isVisible) {
    switch (animation) {
      case 'fade-in':
        return `${baseClasses} opacity-0`;
      case 'slide-up':
        return `${baseClasses} opacity-0 translate-y-8`;
      case 'slide-left':
        return `${baseClasses} opacity-0 translate-x-8`;
      case 'slide-right':
        return `${baseClasses} opacity-0 -translate-x-8`;
      case 'scale-in':
        return `${baseClasses} opacity-0 scale-95`;
      case 'blur-in':
        return `${baseClasses} opacity-0 blur-sm`;
      default:
        return `${baseClasses} opacity-0`;
    }
  }
  
  return `${baseClasses} ${delayClass} opacity-100 translate-y-0 translate-x-0 scale-100 blur-0`;
}
