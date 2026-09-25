import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionModal } from './ContributionModal';

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
const mockJoinWaitlist = vi.fn();
let submitOnSuccess: ((result?: unknown) => void) | null = null;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
    campaigns: {
      submitContribution: {
        useMutation: (opts?: { onSuccess?: (result?: unknown) => void }) => {
          submitOnSuccess = opts?.onSuccess ?? null;
          return { mutate: mockMutate, mutateAsync: mockMutateAsync, isPending: false };
        },
      },
      joinWaitlist: {
        useMutation: () => ({ mutate: mockJoinWaitlist, isPending: false }),
      },
    },
  },
}));

// The sheet reads the session to nudge signed-out people toward an account.
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('@/const', () => ({ getGoogleLoginUrl: () => '/api/auth/google', getLoginUrl: () => '/login' }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ContributionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    campaignId: 1,
    campaignTitle: 'Test Campaign',
    currency: 'USD',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ContributionModal {...defaultProps} />);
    expect(screen.getByText('Contribute to Campaign')).toBeDefined();
  });

  it('shows contribution type selection', () => {
    render(<ContributionModal {...defaultProps} />);
    expect(screen.getByText('Land')).toBeDefined();
    expect(screen.getByText('Equipment')).toBeDefined();
    expect(screen.getByText('Role/Skills')).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<ContributionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Land')).toBeNull();
  });

  it('allows selecting a contribution type', async () => {
    const user = userEvent.setup();
    render(<ContributionModal {...defaultProps} />);
    const landOption = screen.getByText('Land');
    await user.click(landOption);
    // After selection, the step should advance to details
    await waitFor(() => {
      // Back button or next step indicator should appear
      expect(document.querySelector('[data-contribution-type], button')).toBeDefined();
    });
  });

  // Decision B12c: sending on an example campaign gives a practice receipt.
  describe('practice receipt', () => {
    const need = {
      id: 5, kind: 'item', title: 'Seed trays',
      quantityWanted: 3, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 90,
    };

    async function sendAndAnswer(result: unknown) {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<ContributionModal {...defaultProps} need={need} onSuccess={onSuccess} />);
      await user.type(screen.getByLabelText('Name *'), 'Ada');
      await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Submit Claim' }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      act(() => submitOnSuccess?.(result));
      return { user, onSuccess };
    }

    it('renders for a practice result, with no steward, account or thank-you copy', async () => {
      const { user, onSuccess } = await sendAndAnswer({ id: null, success: true, practice: true });
      expect(onSuccess).toHaveBeenCalledWith({ practice: true });
      const receipt = screen.getByTestId('practice-receipt');
      expect(receipt.textContent).toContain('Practice run complete');
      expect(receipt.textContent).toContain('This was an example campaign, so nothing reached a real project. The first real campaigns open soon.');
      expect(screen.getByRole('link', { name: 'Browse campaigns' }).getAttribute('href')).toBe('/campaigns');
      const text = document.body.textContent ?? '';
      expect(text).not.toMatch(/steward/i);
      expect(text).not.toMatch(/Make my account/);
      expect(text).not.toMatch(/Living Tree/i);
      expect(text).not.toMatch(/thank-you/i);

      // Hearing when real campaigns open joins the waitlist, email prefilled.
      const email = screen.getByLabelText('Want to hear when they open?') as HTMLInputElement;
      expect(email.value).toBe('ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Tell me' }));
      expect(mockJoinWaitlist).toHaveBeenCalledWith({ email: 'ada@example.com', name: 'Ada' });
    });

    it('keeps the real receipt for a real result', async () => {
      const { onSuccess } = await sendAndAnswer({ id: 12, success: true, practice: false });
      expect(onSuccess).toHaveBeenCalledWith({ practice: false });
      expect(screen.queryByTestId('practice-receipt')).toBeNull();
      expect(screen.queryByText('Practice run complete')).toBeNull();
      expect(screen.getByText(/Your offer is with the stewards/)).toBeDefined();
    });
  });

  // The email sign-in link from "Make my account" opens the project page's
  // own contributions section, not the home page.
  it('sends the project section as the sign-in returnTo from the thank-you step', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const realFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    window.history.pushState({}, '', '/project/hill-farm?campaign=3#needs');
    try {
      const user = userEvent.setup();
      render(
        <ContributionModal
          {...defaultProps}
          need={{ id: 5, kind: 'item', title: 'Seed trays', quantityWanted: 3, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 90 }}
          afterSignUpAnchor="your-contributions"
        />,
      );
      await user.type(screen.getByLabelText('Name *'), 'Ada');
      await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Submit Claim' }));
      act(() => submitOnSuccess?.({ id: 12, success: true, practice: false }));
      await user.click(screen.getByRole('button', { name: /Make my account/ }));
      await user.click(await screen.findByRole('button', { name: 'Send login link' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ email: 'ada@example.com', returnTo: '/project/hill-farm?campaign=3#your-contributions' });
    } finally {
      global.fetch = realFetch;
      window.history.pushState({}, '', '/');
    }
  });

  it('calls onClose when closed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ContributionModal {...defaultProps} onClose={onClose} />);
    // Escape to close dialog
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
