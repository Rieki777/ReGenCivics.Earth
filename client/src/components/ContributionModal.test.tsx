import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionModal, lendDateErrors, serverDateField, type ContributionNeed } from './ContributionModal';
import { FOLLOW, GIVE_LEND, LINK, OFFER_FORM, OFFER_LIMIT, TOKEN_HELD_LINE, TOKEN_LINE, TOKEN_PRACTICE_LINE, LOAN_RISK_LINE } from '@shared/crowdpoolCopy';
import { dayBefore, localToday } from '@shared/crowdpoolNeedAction';

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
const mockJoinWaitlist = vi.fn();
const mockFollowProject = vi.fn();
const mockUnfollowProject = vi.fn();
const mockSubscribeByEmail = vi.fn();
let submitOnSuccess: ((result?: unknown) => void) | null = null;
let submitOnError: ((error: { message: string; data?: { code?: string } }) => void) | null = null;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } }, projects: { getPublic: { invalidate: vi.fn() } } }),
    campaigns: {
      submitContribution: {
        useMutation: (opts?: { onSuccess?: (result?: unknown) => void; onError?: (error: { message: string }) => void }) => {
          submitOnSuccess = opts?.onSuccess ?? null;
          submitOnError = opts?.onError ?? null;
          return { mutate: mockMutate, mutateAsync: mockMutateAsync, isPending: false };
        },
      },
      joinWaitlist: {
        useMutation: () => ({ mutate: mockJoinWaitlist, isPending: false }),
      },
      // The receipts' Follow is the one FollowControl (build spec 2026-09-27, section 12.5).
      followProject: {
        useMutation: () => ({ mutate: mockFollowProject, isPending: false }),
      },
      unfollowProject: {
        useMutation: () => ({ mutate: mockUnfollowProject, isPending: false }),
      },
      subscribeByEmail: {
        useMutation: () => ({ mutate: mockSubscribeByEmail, isPending: false }),
      },
    },
  },
}));

// The sheet reads the session to nudge signed-out people toward an account.
// Signed out unless a test sets authState.signedIn.
const authState = vi.hoisted(() => ({ signedIn: false }));
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => authState.signedIn
    ? { user: { id: 5, name: 'Ada', email: 'ada@example.com' }, isAuthenticated: true }
    : { user: null, isAuthenticated: false },
}));
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
    authState.signedIn = false;
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

    it('the send button is white on the deep green, well past 4.5:1', () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      const send = screen.getByRole('button', { name: 'Send my offer' });
      expect(send.className).toContain('bg-[#1a472a]');
      expect(send.className).toContain('text-white');
      expect(send.className).not.toContain('bg-[#4a7c59]');
    });

    it('carries the ref a share link landed with, after the address dropped it', async () => {
      // captureReferral stored it on landing; useReferralCapture then took
      // ?ref= out of the URL, as it does for every old /campaign/:id?ref= link.
      window.sessionStorage.setItem('regen-referral', JSON.stringify({ ref: 'revuxref1', landingUrl: '/campaign/1597' }));
      window.history.replaceState({}, '', '/project/c1597-harmony-valley-ecovillage?campaign=1597#need-2677');
      try {
        const user = userEvent.setup();
        render(<ContributionModal {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: /Materials or supplies/ }));
        fillContact();
        fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Compost' } });
        await user.click(screen.getByRole('button', { name: 'Send my offer' }));
        expect(mockMutate.mock.calls[0][0]).toMatchObject({ referredBy: 'revuxref1' });
      } finally {
        window.sessionStorage.removeItem('regen-referral');
        window.history.replaceState({}, '', '/');
      }
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

  // Build spec 2026-10-01, section 7.2: each date's problem on its own field.
  describe('lendDateErrors', () => {
    const today = '2026-09-25';
    it('a past from', () => {
      expect(lendDateErrors({ until: '2026-12-01', from: '2026-09-24', today })).toEqual({ from: GIVE_LEND.pastDate });
    });
    it('a past until', () => {
      expect(lendDateErrors({ until: '2026-09-24', from: '', today })).toEqual({ until: GIVE_LEND.pastDate });
      expect(lendDateErrors({ until: '2026-09-01', from: '2026-08-01', today })).toEqual({ from: GIVE_LEND.pastDate, until: GIVE_LEND.pastDate });
    });
    it('a missing until', () => {
      expect(lendDateErrors({ until: '', from: '', today })).toEqual({ until: GIVE_LEND.missingUntil });
    });
    it('an until before from', () => {
      expect(lendDateErrors({ until: '2026-10-01', from: '2026-11-01', today })).toEqual({ until: GIVE_LEND.untilBeforeFrom });
    });
    it('an until before the need starts', () => {
      expect(lendDateErrors({ until: '2026-10-01', from: '', neededFrom: '2026-12-01', today })).toEqual({ until: GIVE_LEND.untilBeforeNeed });
    });
    it('fine, today included', () => {
      expect(lendDateErrors({ until: '2026-12-31', from: '2026-10-01', neededFrom: '2026-10-01', today })).toEqual({});
      expect(lendDateErrors({ until: today, from: today, today })).toEqual({});
    });
  });

  describe('serverDateField', () => {
    const today = '2026-09-25';
    it('puts a date refusal on its field, and anything else on none', () => {
      expect(serverDateField(GIVE_LEND.pastDate, { from: '', until: '2026-09-01', today })).toBe('until');
      expect(serverDateField(GIVE_LEND.pastDate, { from: '2026-09-01', until: '2026-12-01', today })).toBe('from');
      expect(serverDateField(GIVE_LEND.missingUntil, { from: '', until: '', today })).toBe('until');
      expect(serverDateField(GIVE_LEND.untilBeforeFrom, { from: '2026-11-01', until: '2026-10-01', today })).toBe('until');
      expect(serverDateField(GIVE_LEND.untilBeforeNeed, { from: '', until: '2026-10-01', today })).toBe('until');
      expect(serverDateField('This need is already filled.', { from: '', until: '', today })).toBeNull();
    });
  });

  describe('offer dates never start in the past', () => {
    const pastNeed: ContributionNeed = {
      id: 9, kind: 'item', title: 'Wheelbarrow', quantityWanted: 1, quantityClaimed: 0, quantityDelivered: 0,
      estimatedValue: 100, acceptsGift: 0, acceptsLoan: 1, neededFrom: '2020-03-01', neededUntil: '2020-06-30',
    };

    it('a need whose dates have passed prefills from today and leaves until empty', () => {
      render(<ContributionModal {...defaultProps} need={pastNeed} />);
      const today = localToday();
      const from = screen.getByLabelText('Available from') as HTMLInputElement;
      const until = screen.getByLabelText('Until *') as HTMLInputElement;
      expect(from.value).toBe(today);
      expect(until.value).toBe('');
      expect(from.min).toBe(today);
      expect(until.min).toBe(today);
    });

    it('a need with no start leaves from empty, and keeps an end still ahead', () => {
      render(<ContributionModal {...defaultProps} need={{ ...pastNeed, neededFrom: null, neededUntil: '2099-06-30' }} />);
      expect((screen.getByLabelText('Available from') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Until *') as HTMLInputElement).value).toBe('2099-06-30');
    });

    it('a past until is refused on the field, which takes the focus', async () => {
      render(<ContributionModal {...defaultProps} need={pastNeed} />);
      fillContact();
      const until = screen.getByLabelText('Until *') as HTMLInputElement;
      fireEvent.change(until, { target: { value: dayBefore(localToday()) } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText(GIVE_LEND.pastDate)).toBeDefined();
      expect(until).toHaveAttribute('aria-invalid', 'true');
      expect(until).toHaveAttribute('aria-describedby', 'lend-until-error');
      await waitFor(() => expect(until).toHaveFocus());
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('a past from shows its own message under the from field', async () => {
      render(<ContributionModal {...defaultProps} need={{ ...pastNeed, neededUntil: '2099-06-30' }} />);
      fillContact();
      const from = screen.getByLabelText('Available from') as HTMLInputElement;
      fireEvent.change(from, { target: { value: '2020-01-01' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      const error = document.getElementById('lend-from-error');
      expect(error?.textContent).toBe(GIVE_LEND.pastDate);
      expect(from).toHaveAttribute('aria-describedby', 'lend-from-error');
      await waitFor(() => expect(from).toHaveFocus());
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("the server's past-date refusal lands on the field too, with every value kept", async () => {
      render(<ContributionModal {...defaultProps} need={{ ...pastNeed, neededUntil: '2099-06-30' }} />);
      fillContact();
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      act(() => submitOnError?.({ message: GIVE_LEND.pastDate, data: { code: 'BAD_REQUEST' } }));
      const until = screen.getByLabelText('Until *') as HTMLInputElement;
      expect(document.getElementById('lend-until-error')?.textContent).toBe(GIVE_LEND.pastDate);
      await waitFor(() => expect(until).toHaveFocus());
      expect(toastMock.error).toHaveBeenCalledWith(GIVE_LEND.pastDate);
      expect(screen.queryByTestId('offer-submit-error')).toBeNull();
      expect((screen.getByLabelText('Name *') as HTMLInputElement).value).toBe('Ada');
    });
  });

  describe('field errors', () => {
    it('an empty Send says "Add your name." under the name and focuses it', async () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      const name = screen.getByLabelText('Name *');
      expect(screen.getByText(OFFER_FORM.nameMissing)).toBeDefined();
      expect(screen.getByText(OFFER_FORM.emailMissing)).toBeDefined();
      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(name).toHaveAttribute('aria-describedby', 'offer-name-error');
      expect(document.getElementById('offer-name-error')).toHaveAttribute('role', 'alert');
      await waitFor(() => expect(name).toHaveFocus());
      expect(mockMutate).not.toHaveBeenCalled();
      expect(toastMock.error).not.toHaveBeenCalled();
      // Typing in the field takes its message away.
      fireEvent.change(name, { target: { value: 'Ada' } });
      expect(screen.queryByText(OFFER_FORM.nameMissing)).toBeNull();
    });

    it('an email that is not complete gets its own message, and focus when the name is fine', async () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Ada' } });
      fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'ada@example' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText(OFFER_FORM.emailInvalid)).toBeDefined();
      await waitFor(() => expect(screen.getByLabelText('Email *')).toHaveFocus());
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('a missing title, bad hours, bad months and a bad value each show on their field', async () => {
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /Time or a skill/ }));
      fillContact();
      fireEvent.change(screen.getByLabelText('Hours/Week'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Duration (months)'), { target: { value: '500' } });
      fireEvent.change(screen.getByLabelText('Roughly what is it worth? (optional)'), { target: { value: '-5' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(screen.getByText(OFFER_FORM.titleMissing)).toBeDefined();
      expect(screen.getByText(OFFER_FORM.hours(168))).toBeDefined();
      expect(screen.getByText(OFFER_FORM.months)).toBeDefined();
      expect(screen.getByText(OFFER_FORM.value)).toBeDefined();
      // The title comes first on the sheet, so it takes the focus.
      await waitFor(() => expect(screen.getByLabelText('Title *')).toHaveFocus());
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('a refusal that belongs to no field keeps the form and shows above Send', () => {
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      fillContact();
      fireEvent.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      const message = OFFER_LIMIT.connection(12);
      act(() => submitOnError?.({ message, data: { code: 'TOO_MANY_REQUESTS' } }));
      const block = screen.getByTestId('offer-submit-error');
      expect(block).toHaveAttribute('role', 'alert');
      expect(block.textContent).toBe(message);
      const send = screen.getByRole('button', { name: 'Send my offer' });
      expect(block.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(toastMock.error).toHaveBeenCalledWith(message);
      // Nothing typed is lost.
      expect((screen.getByLabelText('Name *') as HTMLInputElement).value).toBe('Ada');
      expect((screen.getByLabelText('Email *') as HTMLInputElement).value).toBe('ada@example.com');
      expect(screen.queryByTestId('receipt')).toBeNull();
      // Sending again clears it until the server answers.
      fireEvent.click(send);
      expect(screen.queryByTestId('offer-submit-error')).toBeNull();
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
      // No project key given: no Follow. The account card carries the held-token line.
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

    it('opens at its top, so "Offer sent" and the email line are the first thing seen (review 2026-09-28)', async () => {
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      await user.type(screen.getByLabelText('Name *'), 'Ada');
      await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
      // The person scrolled down the long form to reach Send my offer.
      const sheet = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
      let top = 543;
      Object.defineProperty(sheet, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => { top = v; } });
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
      expect(top).toBe(543);
      act(() => submitOnSuccess?.({ id: 12, success: true, practice: false }));
      expect(screen.getByTestId('receipt')).toBeDefined();
      expect(top).toBe(0);
    });

    it('draws Close in white on its green, the contrast that reads (review 2026-09-28: 4.04:1 before)', async () => {
      await sendAndAnswer({ id: 12, success: true, practice: false });
      const close = within(screen.getByTestId('receipt')).getByRole('button', { name: 'Close' });
      expect(close.className).toContain('bg-[#4a7c59]');
      expect(close.className).toContain('text-white');
      expect(close.className).not.toContain('text-primary-foreground');
    });

    it('raises no toast of its own: the receipt is the confirmation', async () => {
      await sendAndAnswer({ id: 12, success: true, practice: false });
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  // Build spec 2026-09-27, section 10.5: the private status link.
  describe('the status link on the receipt', () => {
    const statusPath = `/offer#${'A'.repeat(43)}`;

    it('shows above the account card when signed out, with the link, a copy button and when it works', async () => {
      const { user } = await sendAndAnswer({ id: 12, success: true, practice: false, statusPath });
      const block = screen.getByTestId('receipt-status-link');
      expect(block.textContent).toContain(LINK.receiptLead);
      expect(block.textContent).toContain(LINK.receiptHelp);
      const link = within(block).getByRole('link', { name: LINK.receiptOpen });
      expect(link.getAttribute('href')).toBe(statusPath);
      // A plain link: a fresh page load, so the app clears the fragment first.
      expect(link.getAttribute('target')).toBeNull();
      const account = screen.getByRole('button', { name: /Make my account/ });
      expect(block.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      await user.click(within(block).getByRole('button', { name: LINK.copy }));
      expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}${statusPath}`);
      expect(toastMock.success).toHaveBeenCalledWith(LINK.copied);
    });

    it('does not show when the server issued no link', async () => {
      await sendAndAnswer({ id: 12, success: true, practice: false, statusPath: null });
      expect(screen.queryByTestId('receipt-status-link')).toBeNull();
    });

    it('never shows on the practice receipt', async () => {
      await sendAndAnswer({ id: null, success: true, practice: true });
      expect(screen.getByTestId('practice-receipt')).toBeDefined();
      expect(screen.queryByTestId('receipt-status-link')).toBeNull();
      expect(document.body.textContent).not.toContain(LINK.receiptOpen);
    });

    it('never shows for someone signed in', async () => {
      authState.signedIn = true;
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} need={seedTrays} />);
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
      act(() => submitOnSuccess?.({ id: 12, success: true, practice: false, statusPath }));
      expect(screen.getByTestId('receipt')).toBeDefined();
      expect(screen.queryByTestId('receipt-status-link')).toBeNull();
    });
  });

  // Build spec 2026-09-27, section 12.5: Follow on the real receipt follows the project.
  describe('Follow on the real receipt', () => {
    const statusPath = `/offer#${'B'.repeat(43)}`;

    it('signed out: Follow opens the email follow prefilled with the address just used, sent only on a tap', async () => {
      const { user } = await sendAndAnswer({ id: 12, success: true, practice: false, statusPath }, { projectKey: '12-hill-farm' });
      const receipt = screen.getByTestId('receipt');
      const follow = within(receipt).getByRole('button', { name: FOLLOW.followProject('Hill Farm') });
      expect(follow).toHaveAttribute('aria-expanded', 'false');
      // Nothing is sent until they choose to.
      expect(mockSubscribeByEmail).not.toHaveBeenCalled();
      await user.click(follow);
      expect(follow).toHaveAttribute('aria-expanded', 'true');
      expect(receipt.textContent).toContain(FOLLOW.emailIntro('Hill Farm'));
      const email = within(receipt).getByLabelText(FOLLOW.emailLabel) as HTMLInputElement;
      expect(email.value).toBe('ada@example.com');
      await user.click(within(receipt).getByRole('button', { name: FOLLOW.emailSubmit }));
      expect(mockSubscribeByEmail).toHaveBeenCalledWith({ campaignId: 1, email: 'ada@example.com' });
      expect(mockFollowProject).not.toHaveBeenCalled();
      // Follow sits with Share and Close, above the status link and the account card.
      const block = screen.getByTestId('receipt-status-link');
      const account = within(receipt).getByRole('button', { name: /Make my account/ });
      expect(follow.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(block.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('signed in: one tap follows the project by its key', async () => {
      authState.signedIn = true;
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} need={seedTrays} projectKey="12-hill-farm" />);
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
      act(() => submitOnSuccess?.({ id: 12, success: true, practice: false }));
      const follow = within(screen.getByTestId('receipt')).getByRole('button', { name: FOLLOW.followProject('Hill Farm') });
      expect(follow).toHaveAttribute('aria-pressed', 'false');
      await user.click(follow);
      expect(mockFollowProject).toHaveBeenCalledWith({ key: '12-hill-farm' });
      expect(within(screen.getByTestId('receipt')).getByRole('button', { name: FOLLOW.followingProject('Hill Farm') }))
        .toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
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

      // Hearing when real campaigns open: the Follow control in season mode
      // joins the waitlist, email prefilled with the address just used.
      expect(within(receipt).getByText(FOLLOW.practiceHeading)).toBeDefined();
      const email = within(receipt).getByLabelText(FOLLOW.emailLabel) as HTMLInputElement;
      expect(email.value).toBe('ada@example.com');
      await user.click(within(receipt).getByRole('button', { name: FOLLOW.seasonSubmit }));
      expect(mockJoinWaitlist).toHaveBeenCalledWith({ email: 'ada@example.com' });
      // An example project can't be followed: no project Follow on this receipt.
      expect(within(receipt).queryByRole('button', { name: /^Follow/ })).toBeNull();
      expect(mockSubscribeByEmail).not.toHaveBeenCalled();
      expect(mockFollowProject).not.toHaveBeenCalled();
    });

    it('signed in, the practice receipt offers one button, with the account email', async () => {
      authState.signedIn = true;
      const user = userEvent.setup();
      render(<ContributionModal {...defaultProps} need={seedTrays} projectKey="c1-hill-farm" isExample />);
      await user.click(screen.getByRole('button', { name: 'Send my offer' }));
      act(() => submitOnSuccess?.({ id: null, success: true, practice: true }));
      const receipt = screen.getByTestId('practice-receipt');
      expect(within(receipt).queryByLabelText(FOLLOW.emailLabel)).toBeNull();
      expect(receipt.textContent).toContain(FOLLOW.seasonBodySignedIn('ada@example.com'));
      await user.click(within(receipt).getByRole('button', { name: FOLLOW.seasonSignedIn }));
      expect(mockJoinWaitlist).toHaveBeenCalledWith({ email: 'ada@example.com' });
      expect(mockFollowProject).not.toHaveBeenCalled();
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
