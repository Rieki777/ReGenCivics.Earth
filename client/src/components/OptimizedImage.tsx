/**
 * OptimizedImage Component
 * Lazy loading, smooth fade-in, srcset support, and aspect-ratio placeholder
 */

import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  /** srcset string e.g. "img-400.webp 400w, img-800.webp 800w" */
  srcSet?: string;
  sizes?: string;
  /** Aspect ratio placeholder (e.g. "16/9") — prevents layout shift */
  aspectRatio?: string;
  width?: number;
  height?: number;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  style,
  priority = false,
  srcSet,
  sizes,
  aspectRatio,
  width,
  height,
  fetchPriority,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const imgStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      srcSet={isInView && srcSet ? srcSet : undefined}
      sizes={sizes}
      data-src={src}
      alt={alt}
      width={width}
      height={height}
      className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={imgStyle}
      onLoad={() => setIsLoaded(true)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={fetchPriority ?? (priority ? 'high' : 'auto')}
    />
  );
}

export default OptimizedImage;
