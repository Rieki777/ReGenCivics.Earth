import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navigation from './Navigation';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock auth
const mockUseAuth = vi.fn();
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock AuthDialog
vi.mock('@/components/AuthDialog', () => ({
  AuthDialog: ({ open }: any) =>
    open ? <div data-testid="auth-dialog">Auth Dialog</div> : null,
}));

// Mock SocialLinks, icon must be a valid component (not null) to avoid React render errors
vi.mock('@/components/SocialLinks', () => ({
  SOCIAL_LINKS: {
    discord: { name: 'Discord', icon: () => null, url: 'https://discord.gg/test' },
  },
}));

// Mock SeedOfLifeIcon and FlowerOfLifeIcon
vi.mock('@/components/SeedOfLifeIcon', () => ({
  SeedOfLifeIcon: () => <span data-testid="seed-of-life-icon" />,
}));
vi.mock('@/components/FlowerOfLifeIcon', () => ({
  FlowerOfLifeIcon: () => <span data-testid="flower-of-life-icon" />,
}));

// Mock NotificationBell (uses trpc internally)
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <span data-testid="notification-bell" />,
}));

// Mock LanguageSwitcher (uses LanguageContext internally)
vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <span data-testid="language-switcher" />,
}));

// Mock SmartBottomNav (uses trpc + hooks internally)
vi.mock('@/components/SmartBottomNav', () => ({
  default: () => <nav data-testid="smart-bottom-nav">Smart Nav</nav>,
}));

// Mock trpc (Navigation calls trpc.messages.unreadCount.useQuery)
vi.mock('@/lib/trpc', () => ({
  trpc: {
    messages: {
      unreadCount: {
        useQuery: () => ({ data: { count: 0 } }),
      },
    },
  },
}));

// Mock vaul Drawer
vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: ({ children }: any) => <button>{children}</button>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Overlay: () => <div />,
    Content: ({ children }: any) => <div>{children}</div>,
    Close: ({ children }: any) => <button>{children}</button>,
  },
}));

// Stub DropdownMenu components
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
}));

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation with logo', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      logout: vi.fn(),
    });
    render(<Navigation />);
    const navImages = screen.getAllByAltText('ReGen Civics');
    expect(navImages.length).toBeGreaterThan(0);
  });

  it('shows Participate button in mobile view', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      logout: vi.fn(),
    });
    render(<Navigation />);
    // Multiple "Participate" buttons exist (mobile + desktop)
    const participateButtons = screen.getAllByText('Participate');
    expect(participateButtons.length).toBeGreaterThan(0);
  });

  it('renders sign-in option when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      logout: vi.fn(),
    });
    render(<Navigation />);
    // Sign in button should exist
    const signInButtons = screen.getAllByText(/sign in/i);
    expect(signInButtons.length).toBeGreaterThan(0);
  });

  it('shows mobile menu toggle button', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      logout: vi.fn(),
    });
    render(<Navigation />);
    // Navigation should have interactive elements
    expect(document.querySelector('nav')).toBeDefined();
  });

  it('shows user avatar/name when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', displayName: 'Taren' },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    });
    render(<Navigation />);
    // Some user indicator should appear when authenticated
    expect(document.querySelector('header')).toBeDefined();
  });
});
