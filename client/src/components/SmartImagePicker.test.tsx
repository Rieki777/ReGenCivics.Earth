import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartImagePicker } from './SmartImagePicker';

// Mock trpc
vi.mock('@/lib/trpc', () => ({
  trpc: {
    files: { upload: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    images: { generate: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
  },
}));

// Mock auth
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}));

describe('SmartImagePicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with upload mode by default', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} label="Test Image" />);
    expect(screen.getByText('Test Image')).toBeDefined();
    expect(screen.getByText('Upload')).toBeDefined();
    expect(screen.getByText('Generate')).toBeDefined();
    expect(screen.getByText('URL')).toBeDefined();
  });

  it('shows drag-and-drop zone in upload mode', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} />);
    expect(screen.getByText('Drop an image here, or click to browse')).toBeDefined();
  });

  it('shows preview when value is set', () => {
    render(<SmartImagePicker value="https://example.com/image.webp" onChange={mockOnChange} />);
    const img = screen.getByAltText('Selected image');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/image.webp');
  });

  it('clears value when remove button is clicked', () => {
    render(<SmartImagePicker value="https://example.com/image.webp" onChange={mockOnChange} />);
    fireEvent.click(screen.getByLabelText('Remove image'));
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('switches to URL mode', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('URL'));
    expect(screen.getByPlaceholderText('https://example.com/image.webp')).toBeDefined();
  });

  it('switches to generate mode', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(screen.getByPlaceholderText('Describe the image you want...')).toBeDefined();
    expect(screen.getByText('3 generations remaining')).toBeDefined();
  });

  it('hides generate tab when hideGenerate is true', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} hideGenerate />);
    expect(screen.queryByText('Generate')).toBeNull();
  });

  it('applies light theme classes', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} theme="light" />);
    // Light theme uses different background
    const dropzone = screen.getByText('Drop an image here, or click to browse').closest('[role="button"]');
    expect(dropzone?.className).toContain('bg-');
  });

  it('validates URL input requires http prefix', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('URL'));
    const input = screen.getByPlaceholderText('https://example.com/image.webp');
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.click(screen.getByText('Use'));
    expect(screen.getByText('Enter a full URL starting with http.')).toBeDefined();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('accepts valid URL', () => {
    render(<SmartImagePicker value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('URL'));
    const input = screen.getByPlaceholderText('https://example.com/image.webp');
    fireEvent.change(input, { target: { value: 'https://example.com/photo.webp' } });
    fireEvent.click(screen.getByText('Use'));
    expect(mockOnChange).toHaveBeenCalledWith('https://example.com/photo.webp');
  });
});
