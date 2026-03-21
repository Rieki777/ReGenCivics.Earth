// A simple blur-up image that shows a tiny placeholder until the full image loads
import React, { useState } from 'react';

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string; // fallback color while loading
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  style?: React.CSSProperties;
}

export function BlurImage({
  src,
  alt,
  className = '',
  placeholderColor = '#1c1917',
  width,
  height,
  loading = 'lazy',
  fetchPriority,
  decoding,
  style,
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: placeholderColor, ...style }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        {...(fetchPriority ? { fetchPriority } : {})}
        {...(decoding ? { decoding } : {})}
        {...(width ? { width } : {})}
        {...(height ? { height } : {})}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
