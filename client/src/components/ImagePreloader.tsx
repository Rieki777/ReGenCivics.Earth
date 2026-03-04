/**
 * ImagePreloader Component
 * Preloads all path card images before showing the ProgressiveOnboarding component
 * Displays a loading screen with Tao Te Ching quotes while images load
 */
import { useState, useEffect } from 'react';
import { TaoSpinner } from '@/components/TaoSpinner';

const pathCardImages = [
  // Fund path
  'https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png',
  'https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png',
  // Land path
  'https://assets.regencivics.earth/yqqImtZyZVyKlZyO.png',
  'https://assets.regencivics.earth/mgXrrAJIIHwfFWah.png',
  // Ally path
  'https://assets.regencivics.earth/xlNRfxzajiAdMyaP.png',
  'https://assets.regencivics.earth/HQpqacLKyIAkXOdS.png',
  // Play path
  'https://assets.regencivics.earth/LAizfmKwiZguwYMz.png',
  'https://assets.regencivics.earth/qDmGFHBsFPyCECbM.png',
];

interface ImagePreloaderProps {
  children: React.ReactNode;
}

export function ImagePreloader({ children }: ImagePreloaderProps) {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = pathCardImages.length;

    const preloadImage = (src: string) => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            setImagesLoaded(true);
          }
          resolve(true);
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            setImagesLoaded(true);
          }
          resolve(false);
        };
        img.src = src;
      });
    };

    // Start preloading all images
    pathCardImages.forEach(preloadImage);
  }, []);

  if (!imagesLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#0f2818] px-4">
        <div className="flex flex-col items-center gap-8">
          <TaoSpinner size={80} />
          <p className="text-white/80 text-center text-sm md:text-base max-w-md leading-relaxed">
            Preparing your journey...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ImagePreloader;
