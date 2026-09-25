import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartImage } from './SmartImage';

describe('SmartImage', () => {
  it('follows a new src instead of keeping the first one', () => {
    // /team renders its seed roles, then the DB roles in another order, into
    // the same card slots. Each slot must show the image it is given now.
    const { rerender } = render(<SmartImage src="/images/roles/a-card.webp" alt="portrait" />);
    expect(screen.getByAltText('portrait').getAttribute('src')).toBe('/images/roles/a-card.webp');

    rerender(<SmartImage src="/images/roles/b-card.webp" alt="portrait" />);
    expect(screen.getByAltText('portrait').getAttribute('src')).toBe('/images/roles/b-card.webp');
  });

  it('tries again with a new src after the old one failed', () => {
    const { rerender } = render(<SmartImage src="/missing.webp" alt="portrait" />);
    fireEvent.error(screen.getByAltText('portrait'));
    // The placeholder replaces the <img> on error.
    expect(screen.getByRole('img', { name: 'portrait' }).tagName).toBe('DIV');

    rerender(<SmartImage src="/images/roles/b-card.webp" alt="portrait" />);
    const img = screen.getByAltText('portrait');
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('/images/roles/b-card.webp');
  });

  it('still falls back once, then shows the placeholder', () => {
    render(<SmartImage src="/missing.webp" fallbackSrc="/fallback.webp" alt="portrait" />);
    fireEvent.error(screen.getByAltText('portrait'));
    expect(screen.getByAltText('portrait').getAttribute('src')).toBe('/fallback.webp');
    fireEvent.error(screen.getByAltText('portrait'));
    expect(screen.getByRole('img', { name: 'portrait' }).tagName).toBe('DIV');
  });
});
