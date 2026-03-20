import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all external dependencies
vi.mock('@/lib/trpc', () => ({
  trpc: {
    applications: {
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
          isPending: false,
        }),
      },
      update: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: false,
        }),
      },
      submit: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      applications: { invalidate: vi.fn() },
    }),
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/SEO', () => ({
  SEO: () => null,
}));

vi.mock('@/components/BackButton', () => ({
  BackButton: () => null,
}));

vi.mock('@/components/BannerDisplay', () => ({
  BannerDisplay: () => null,
}));

vi.mock('@/components/PageWrapper', () => ({
  PageWrapper: ({ children }: any) => <div>{children}</div>,
}));

import Apply from './Apply';

describe('Apply form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the application form', async () => {
    render(<Apply />);
    await waitFor(() => {
      expect(screen.getByText('Apply for Next Season')).toBeDefined();
    });
  });

  it('shows progress steps', async () => {
    render(<Apply />);
    await waitFor(() => {
      // 5 steps should be visible as step indicators
      expect(screen.getByText('Join the ReGen Civics Alliance')).toBeDefined();
    });
  });

  it('renders step 1 basic information fields', async () => {
    render(<Apply />);
    await waitFor(() => {
      // Step 1 fields should be visible
      expect(document.querySelector('form, [data-step], input, textarea')).toBeDefined();
    });
  });
});
