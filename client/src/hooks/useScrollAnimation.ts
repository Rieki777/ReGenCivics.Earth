import { useEffect, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);

  // A CALLBACK ref, not a plain one, and the difference is load-bearing.
  //
  // With a plain ref the effect below runs once with ref.current === null for any
  // component that returns null on its first render, and its dependency array is
  // three stable primitives, so it never runs again. The node mounts later, no
  // observer is ever attached, isVisible stays false forever, and every counter
  // driven by it sits at zero.
  //
  // That is exactly what happened to the gallery's impact strip: it returns null
  // while the campaigns query is still loading, so on every fresh page load the
  // combined-impact panel read "0 live campaigns, $0 pledged so far, 0 places".
  // Navigating away and back served the query from cache, the strip had data on
  // its first render, and the numbers appeared, which is why it looked
  // intermittent rather than broken.
  //
  // A callback ref fires when the node actually attaches, so the effect re-runs
  // then.
  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback((element: T | null) => setNode(element), []);

  useEffect(() => {
    const element = node;
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
  }, [node, threshold, rootMargin, triggerOnce]);

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
