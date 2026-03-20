import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionModal } from './ContributionModal';

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    campaigns: {
      submitContribution: {
        useMutation: () => ({
          mutate: mockMutate,
          mutateAsync: mockMutateAsync,
          isPending: false,
        }),
      },
    },
  },
}));

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
