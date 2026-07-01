import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestDetailModal, questDetailsData } from './QuestDetailModal';

// Mock tooltip components to simplify rendering
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/QuestProgressTracker', () => ({
  QuestProgressTracker: ({ questId }: any) => (
    <div data-testid="quest-progress-tracker">{questId}</div>
  ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    playerProfiles: {
      me: {
        useQuery: () => ({ data: null }),
      },
      completeQuest: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    hyphaBridge: {
      createFromQuest: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    quest: {
      logCompletion: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1 },
    isAuthenticated: true,
    loading: false,
  }),
}));

const sampleQuest = questDetailsData['quest-0'];

describe('QuestDetailModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest title', () => {
    render(<QuestDetailModal quest={sampleQuest} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Quest 0: Fire')).toBeDefined();
  });

  it('renders quest description', () => {
    render(<QuestDetailModal quest={sampleQuest} isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/Discover and articulate/i)).toBeDefined();
  });

  it('renders close button', () => {
    render(<QuestDetailModal quest={sampleQuest} isOpen={true} onClose={onClose} />);
    // There should be a button that closes the modal (the X button)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    render(<QuestDetailModal quest={sampleQuest} isOpen={true} onClose={onClose} />);
    const buttons = screen.getAllByRole('button');
    // First button is typically the close button
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<QuestDetailModal quest={sampleQuest} isOpen={false} onClose={onClose} />);
    expect(screen.queryByText('Quest 0: Fire')).toBeNull();
  });

  it('does not render when quest is null', () => {
    render(<QuestDetailModal quest={null} isOpen={true} onClose={onClose} />);
    expect(screen.queryByText('Quest 0: Fire')).toBeNull();
  });

  it('shows rewards', () => {
    render(<QuestDetailModal quest={sampleQuest} isOpen={true} onClose={onClose} />);
    expect(screen.getByText('+111')).toBeDefined();
  });
});
