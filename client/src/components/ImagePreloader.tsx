/**
 * ImagePreloader Component
 * Preloads images before rendering children.
 * Displays the TaoSpinner with quotes while images load.
 *
 * Usage:
 *   <ImagePreloader images={[url1, url2]}>
 *     <MyPage />
 *   </ImagePreloader>
 *
 * Or use the hook:
 *   const imagesReady = useImagePreload([url1, url2]);
 *   if (!imagesReady) return <TaoSpinner />;
 */
import { useState, useEffect } from 'react';
import { TaoSpinner } from '@/components/TaoSpinner';
import { cdnImg } from '@/lib/utils';

// Home page path card images (kept for backwards compatibility)
const HOME_IMAGES = [
  cdnImg('https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.webp'),
  cdnImg('https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.webp'),
  cdnImg('https://assets.regencivics.earth/yqqImtZyZVyKlZyO.webp'),
  cdnImg('https://assets.regencivics.earth/mgXrrAJIIHwfFWah.webp'),
  cdnImg('https://assets.regencivics.earth/xlNRfxzajiAdMyaP.webp'),
  cdnImg('https://assets.regencivics.earth/HQpqacLKyIAkXOdS.webp'),
  cdnImg('https://assets.regencivics.earth/LAizfmKwiZguwYMz.webp'),
  cdnImg('https://assets.regencivics.earth/qDmGFHsBFPyCECbM.webp'),
];

function preloadImages(urls: string[]): Promise<void> {
  if (!urls.length) return Promise.resolve();
  return new Promise((resolve) => {
    let done = 0;
    const finish = () => { if (++done === urls.length) resolve(); };
    urls.forEach((src) => {
      const img = new window.Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    });
  });
}

/** Hook version: returns true once all given URLs are loaded */
export function useImagePreload(images: string[]): boolean {
  const [ready, setReady] = useState(images.length === 0);
  const key = images.join(',');
  useEffect(() => {
    if (!images.length) { setReady(true); return; }
    setReady(false);
    preloadImages(images).then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ready;
}

interface ImagePreloaderProps {
  children: React.ReactNode;
  /** Images to preload. Defaults to Home page path card images if omitted. */
  images?: string[];
  /** Also block render on these loading flags (e.g. from tRPC queries) */
  loading?: boolean;
}

export function ImagePreloader({ children, images = HOME_IMAGES, loading = false }: ImagePreloaderProps) {
  // Preload images in the background — don't block render
  useImagePreload(images);

  if (loading) {
    return <TaoSpinner fullPage size={80} />;
  }

  return <>{children}</>;
}

export default ImagePreloader;
