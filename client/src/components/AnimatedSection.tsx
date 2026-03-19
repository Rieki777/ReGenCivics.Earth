import { ReactNode, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from "@/hooks/useReducedMotion";

type AnimationType = 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale-in' | 'blur-in';

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
  threshold?: number;
  staggerChildren?: boolean;
  staggerDelay?: number;
}

export function AnimatedSection({
  children,
  animation = 'fade-in',
  delay = 0,
  className = '',
  as: Component = 'div',
  threshold = 0.1,
  staggerChildren = false,
  staggerDelay = 100,
}: AnimatedSectionProps) {
  const skipAnim = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  const getInitialStyles = (): React.CSSProperties => {
    if (skipAnim) return {};

    const base: React.CSSProperties = {
      transition: `all 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-in':
          return { ...base, opacity: 0 };
        case 'slide-up':
          return { ...base, opacity: 0, transform: 'translateY(40px)' };
        case 'slide-left':
          return { ...base, opacity: 0, transform: 'translateX(40px)' };
        case 'slide-right':
          return { ...base, opacity: 0, transform: 'translateX(-40px)' };
        case 'scale-in':
          return { ...base, opacity: 0, transform: 'scale(0.95)' };
        case 'blur-in':
          return { ...base, opacity: 0, filter: 'blur(8px)' };
        default:
          return { ...base, opacity: 0 };
      }
    }

    return {
      ...base,
      opacity: 1,
      transform: 'translateY(0) translateX(0) scale(1)',
      filter: 'blur(0)',
    };
  };

  return (
    <Component
      ref={ref as any}
      className={className}
      style={getInitialStyles()}
    >
      {children}
    </Component>
  );
}

// Staggered animation container for lists/grids
interface StaggeredContainerProps {
  children: ReactNode[];
  animation?: AnimationType;
  baseDelay?: number;
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
}

export function StaggeredContainer({
  children,
  animation = 'slide-up',
  baseDelay = 0,
  staggerDelay = 100,
  className = '',
  itemClassName = '',
}: StaggeredContainerProps) {
  const skipAnim = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  const getItemStyles = (index: number): React.CSSProperties => {
    if (skipAnim) return {};

    const delay = baseDelay + index * staggerDelay;
    const base: React.CSSProperties = {
      transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-in':
          return { ...base, opacity: 0 };
        case 'slide-up':
          return { ...base, opacity: 0, transform: 'translateY(30px)' };
        case 'slide-left':
          return { ...base, opacity: 0, transform: 'translateX(30px)' };
        case 'slide-right':
          return { ...base, opacity: 0, transform: 'translateX(-30px)' };
        case 'scale-in':
          return { ...base, opacity: 0, transform: 'scale(0.9)' };
        default:
          return { ...base, opacity: 0 };
      }
    }

    return {
      ...base,
      opacity: 1,
      transform: 'translateY(0) translateX(0) scale(1)',
    };
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div key={index} className={itemClassName} style={getItemStyles(index)}>
          {child}
        </div>
      ))}
    </div>
  );
}

export default AnimatedSection;
