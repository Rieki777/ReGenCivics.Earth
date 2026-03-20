import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthDialog } from './AuthDialog';

// Mock the const module to avoid import issues
vi.mock('@/const', () => ({
  getGoogleLoginUrl: () => '/api/auth/google',
  getLoginUrl: () => '/login',
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AuthDialog', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it('renders when open is true', () => {
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    expect(screen.getByText('Sign in to continue')).toBeDefined();
  });

  it('does not render dialog content when open is false', () => {
    render(<AuthDialog open={false} onLogin={mockOnLogin} />);
    expect(screen.queryByText('Sign in to continue')).toBeNull();
  });

  it('shows email input', () => {
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toBeDefined();
  });

  it('email input accepts text', async () => {
    const user = userEvent.setup();
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    await user.type(emailInput, 'test@example.com');
    expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
  });

  it('shows validation error for invalid email', async () => {
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    // Use fireEvent to bypass HTML5 constraint validation in jsdom
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined();
    });
  });

  it('shows success state after valid form submission', async () => {
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Check your email!')).toBeDefined();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Too many requests' }),
    });
    render(<AuthDialog open={true} onLogin={mockOnLogin} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Too many requests')).toBeDefined();
    });
  });

  it('shows custom title when provided', () => {
    render(<AuthDialog open={true} onLogin={mockOnLogin} title="Join the Community" />);
    expect(screen.getByText('Join the Community')).toBeDefined();
  });
});
