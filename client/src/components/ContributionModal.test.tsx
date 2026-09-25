import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionModal, lendDateError, type ContributionNeed } from './ContributionModal';
import { TOKEN_HELD_LINE, TOKEN_LINE, TOKEN_PRACTICE_LINE, LOAN_RISK_LINE } from '@shared/crowdpoolCopy';

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
const mockJoinWaitlist = vi.fn();
const mockFollow = vi.fn();
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
      follow: {
        useMutation: () => ({ mutate: mockFollow, isPending: false }),
      },
    },
  },
}));

// The sheet reads the session to nudge signed-out people toward an account.
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('@/const', () => ({ getGoogleLoginUrl: () => '/api/auth/google', getLoginUrl: () => '/login' }));

const { toastMock } = vi.hoisted(() => ({ toastMock: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => ({ toast: toastMock }));

const seedTrays: ContributionNeed = {
  id: 5, kind: 'item', title: 'Seed trays',
  quantityWanted: 3, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 90,
};

describe('ContributionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    campaignId: 1,
    campaignTitle: 'Test Campaign',
    currency: 'USD',
    onSuccess: vi.fn(),
    projectName: 'Hill Farm',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function fillContact() {
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'ada@example.com' } });
  }

  describe('the freeform sheet', () => {
    it('opens as "Offer something else" with the five kinds of offer and no Crypto', () => {
      render(<ContributionModal {...defaultProps} />);
      expect(screen.getByText('Offer something else')).toBeDefined();
      expect(screen.getByText('What would you like to offer?')).toBeDefined();
      for (const label of ['Land', 'A tool or piece of equipment', 'Time or a skill', 'Materials or supplies', 'A knowledge session']) {
        expect(screen.getByRole('button', { name: new RegExp(label) })).toBeDefined();
      }
      expect(screen.queryByText(/Crypto/)).toBeNull();
    });

    it('does not render when closed', () => {
      render(<ContributionModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Land')).toBeNull();
    });

    it('keeps an optional rough value, relabelled, and sends 0 when it is left blank', async () => {
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /Materials or supplies/ }));
      expect(screen.getByLabelText('Roughly what is it worth? (optional)')).toBeDefined();
      expect(screen.getByText("The stewards use this to see the whole ask. Leave it blank if you're not sure.")).toBeDefined();
      fillContact();
      fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Compost' } });
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ contributionType: 'resource', estimatedValue: 0 });
      expect(mockMutate.mock.calls[0][0].offerMode).toBeUndefined();
    });
  });

  describe('sheet copy by verb', () => {
    it.each([
      [{ ...seedTrays }, 'Offer Seed trays', 'Your offer goes to the stewards of Test Campaign.', 'Send my offer'],
      [{ ...seedTrays, kind: 'role', title: 'Cook', quantityWanted: 1 }, 'Apply for Cook', 'Your application goes to the stewards of Test Campaign.', 'Send my application'],
      [{ ...seedTrays, kind: 'shift', title: 'Planting day' }, 'Sign up for Planting day', 'Your sign-up goes to the stewards of Test Campaign.', 'Sign me up'],
    ])('%o', (need, title, description, submit) => {
      render(<ContributionModal {...defaultProps} need={need} />);
      expect(screen.getByRole('heading', { name: title })).toBeDefined();
      expect(screen.getByText(description)).toBeDefined();
      expect(screen.getByRole('button', { name: submit })).toBeDefined();
      expect(document.body.textContent).not.toMatch(/Claim|Submit|USDC|pledge/);
    });

    it('has no value field on an offer against a need (the server sets it)', () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      expect(screen.queryByLabelText(/worth|Estimated Value/i)).toBeNull();
    });

    it("shows the project's token line above the send button", () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      const token = screen.getByText(TOKEN_LINE('Hill Farm'));
      const send = screen.getByRole('button', { name: 'Send my offer' });
      expect(token.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('an example campaign shows the practice token line instead', () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} isExample />);
      expect(screen.getByText(TOKEN_PRACTICE_LINE)).toBeDefined();
      expect(screen.queryByText(TOKEN_LINE('Hill Farm'))).toBeNull();
    });
  });

  describe('give or lend', () => {
    const tractor: ContributionNeed = {
      id: 8, kind: 'item', title: 'Tractor', quantityWanted: 1, quantityClaimed: 0, quantityDelivered: 0,
      estimatedValue: 9000, acceptsGift: 1, acceptsLoan: 1, neededFrom: '2099-03-01', neededUntil: '2099-06-30',
    };

    it('asks give or lend first, with nothing chosen, and will not send without a choice', () => {
      render(<ContributionModal {...defaultProps} need={tractor} />);
      const group = screen.getByRole('group', { name: 'Give it or lend it?' });
      const radios = within(group).getAllByRole('radio') as HTMLInputElement[];
      expect(radios.map((r) => r.checked)).toEqual([false, false]);
      expect(within(group).getByLabelText('Give it')).toBeDefined();
      expect(within(group).getByLabelText('Lend it')).toBeDefined();
      fillContact();
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText('Choose give or lend.')).toBeDefined();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('a gift sends give and no dates', () => {
      render(<ContributionModal {...defaultProps} need={tractor} />);
      fillContact();
      fireEvent.click(screen.getByLabelText('Give it'));
      expect(screen.queryByLabelText(/Until/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ offerMode: 'give', lendUntil: undefined, availableFrom: undefined });
    });

    it('lending shows the dates, prefilled from the need, the fixed risk line and one condition field', () => {
      render(<ContributionModal {...defaultProps} need={tractor} />);
      fireEvent.click(screen.getByLabelText('Lend it'));
      expect((screen.getByLabelText('Available from') as HTMLInputElement).value).toBe('2099-03-01');
      expect((screen.getByLabelText('Until *') as HTMLInputElement).value).toBe('2099-06-30');
      expect(screen.getByText(LOAN_RISK_LINE)).toBeDefined();
      const terms = screen.getByLabelText("Condition and anything you've agreed") as HTMLInputElement;
      expect(terms.maxLength).toBe(300);
      fillContact();
      fireEvent.change(terms, { target: { value: 'Serviced in May' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({
        offerMode: 'lend', availableFrom: '2099-03-01', lendUntil: '2099-06-30', lendTerms: 'Serviced in May', campaignItemId: 8,
      });
    });

    it('says on the field when the loan dates do not work', () => {
      render(<ContributionModal {...defaultProps} need={tractor} />);
      fillContact();
      fireEvent.click(screen.getByLabelText('Lend it'));
      fireEvent.change(screen.getByLabelText('Until *'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText('Add the date it needs to come back.')).toBeDefined();
      fireEvent.change(screen.getByLabelText('Available from'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Until *'), { target: { value: '2099-02-01' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText('The loan ends before the project needs it. Pick a later date.')).toBeDefined();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('a loan-only need says so and goes straight to the loan fields', () => {
      render(<ContributionModal {...defaultProps} need={{ ...tractor, kind: 'loan', acceptsGift: 0, acceptsLoan: 1 }} />);
      expect(screen.getByText('The project would take this on loan. It comes back to you.')).toBeDefined();
      expect(screen.queryByRole('group', { name: 'Give it or lend it?' })).toBeNull();
      fillContact();
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ offerMode: 'lend', lendUntil: '2099-06-30' });
    });

    it('a gift-only need adds no control', () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      expect(screen.queryByRole('group', { name: 'Give it or lend it?' })).toBeNull();
      expect(screen.queryByLabelText(/Until/)).toBeNull();
    });
  });

  describe('lendDateError', () => {
    it('mirrors the server checks', () => {
      const today = '2026-09-25';
      expect(lendDateError({ until: '', from: '', today })).toBe('Add the date it needs to come back.');
      expect(lendDateError({ until: '2026-09-01', from: '', today })).toBe("The loan can't end before it starts.");
      expect(lendDateError({ until: '2026-10-01', from: '2026-11-01', today })).toBe("The loan can't end before it starts.");
      expect(lendDateError({ until: '2026-10-01', from: '', neededFrom: '2026-12-01', today })).toBe('The loan ends before the project needs it. Pick a later date.');
      expect(lendDateError({ until: '2026-12-31', from: '2026-10-01', neededFrom: '2026-10-01', today })).toBeNull();
    });
  });

  async function sendAndAnswer(result: unknown, extra: Record<string, unknown> = {}) {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<ContributionModal {...defaultProps} need={seedTrays} onSuccess={onSuccess} {...extra} />);
    await user.type(screen.getByLabelText('Name *'), 'Ada');
    await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send my offer' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    act(() => submitOnSuccess?.(result));
    return { user, onSuccess };
  }

  describe('the receipt', () => {
    it('reads in order: heading, when the stewards answer, the token, the completion rule, when it counts', async () => {
      await sendAndAnswer({ id: 12, success: true, practice: false }, {
        completionLine: 'Complete means the money half and the in-kind half both land by 14 March 2027.',
        sharePath: '/project/c1-hill-farm?campaign=1#need-5',
      });
      const receipt = screen.getByTestId('receipt');
      expect(within(receipt).getByRole('status').textContent).toContain('Offer sent');
      const text = receipt.textContent ?? '';
      const order = [
        'Offer sent',
        "The stewards will answer you. We'll email you at ada@example.com when they do.",
        TOKEN_LINE('Hill Farm'),
        TOKEN_HELD_LINE,
        'Complete means the money half and the in-kind half both land by 14 March 2027.',
        'An offer counts toward the campaign once the stewards accept it.',
      ].map((s) => text.indexOf(s));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(text).not.toMatch(/Delivery is when it counts|reviews your pledge|Claim Submitted|Contribution Submitted/);
      expect(within(receipt).getByRole('button', { name: /Share this need/ })).toBeDefined();
      expect(within(receipt).getByRole('button', { name: 'Close' })).toBeDefined();
      // Signed out: no Follow here; the account card carries the held-token line.
      expect(within(receipt).queryByRole('button', { name: /Follow/ })).toBeNull();
      expect(within(receipt).getByRole('button', { name: /Make my account/ })).toBeDefined();
    });

    it('copies the need link from "Share this need"', async () => {
      const { user } = await sendAndAnswer({ id: 12, success: true, practice: false }, { sharePath: '/project/c1-hill-farm?campaign=1#need-5' });
      // user-event puts its own clipboard in place at setup; read it back.
      await user.click(screen.getByRole('button', { name: /Share this need/ }));
      expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/project/c1-hill-farm?campaign=1#need-5`);
      expect(toastMock.success).toHaveBeenCalledWith('Link copied');
    });

    it('raises no toast of its own: the receipt is the confirmation', async () => {
      await sendAndAnswer({ id: 12, success: true, practice: false });
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  // Decision B12c: sending on an example campaign gives a practice receipt.
  describe('practice receipt', () => {
    it('renders for a practice result, with no steward, account or thank-you copy', async () => {
      const { user, onSuccess } = await sendAndAnswer({ id: null, success: true, practice: true });
      expect(onSuccess).toHaveBeenCalledWith({ practice: true });
      const receipt = screen.getByTestId('practice-receipt');
      expect(receipt.textContent).toContain('Practice run complete');
      expect(receipt.textContent).toContain('This was an example campaign, so nothing reached a real project. The first real campaigns open soon.');
      expect(receipt.textContent).toContain(TOKEN_PRACTICE_LINE);
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
      expect(screen.getByTestId('receipt')).toBeDefined();
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
      render(<ContributionModal {...defaultProps} need={seedTrays} afterSignUpAnchor="your-contributions" />);
      await user.type(screen.getByLabelText('Name *'), 'Ada');
      await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
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
