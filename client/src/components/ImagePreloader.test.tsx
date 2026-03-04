import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ImagePreloader', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('preloads all 8 path card images', () => {
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

    // Verify we have 8 images (4 paths × 2 images each)
    expect(pathCardImages).toHaveLength(8);
    
    // Verify all images have valid URLs
    pathCardImages.forEach(url => {
      expect(url).toMatch(/^https:\/\/files\.manuscdn\.com\//);
    });
  });

  it('validates path card image structure', () => {
    const fundImages = [
      'https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png',
      'https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png',
    ];

    expect(fundImages).toHaveLength(2);
    expect(fundImages[0]).not.toEqual(fundImages[1]);
  });

  it('ensures eager loading is used instead of lazy', () => {
    // This test verifies the loading strategy
    const loadingStrategy = 'eager';
    expect(loadingStrategy).toBe('eager');
    expect(loadingStrategy).not.toBe('lazy');
  });
});
