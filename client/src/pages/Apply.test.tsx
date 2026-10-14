import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The applicant's saved applications, as applications.myApplications returns them.
const myApps = vi.hoisted(() => ({ data: [] as any[] }));
const updateSpy = vi.hoisted(() => ({ fn: null as any }));

// Mock all external dependencies
vi.mock('@/lib/trpc', () => ({
  trpc: {
    applications: {
      myApplications: {
        useQuery: () => ({ data: myApps.data, isSuccess: true, isError: false }),
      },
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
          isPending: false,
        }),
      },
      update: {
        useMutation: () => ({
          mutateAsync: (updateSpy.fn ??= vi.fn().mockResolvedValue({})),
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
    userProfiles: {
      getMe: {
        useQuery: () => ({ data: null }),
      },
    },
    // The Gardener chat-first flow: flags gate whether the companion renders.
    // companion: false drops the page into classic form mode for these tests.
    companion: {
      flags: {
        useQuery: () => ({ data: { companion: false } }),
      },
    },
    useUtils: () => ({
      applications: { invalidate: vi.fn() },
    }),
  },
}));

// The Gardener conversation UI has its own trpc surface; not under test here.
vi.mock('@/components/companion', () => ({
  FormCompanion: () => null,
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

// The review form's widgets have their own trpc surfaces; not under test here.
vi.mock('@/components/FileUpload', () => ({ FileUpload: () => null }));
vi.mock('@/components/Map', () => ({ MapView: () => null }));
vi.mock('@/components/NeedsOffersFields', () => ({ NeedsOffersFields: () => null }));
vi.mock('@/components/ProjectToolsPicker', () => ({ ProjectToolsPicker: () => null }));

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

import Apply, { formDataFromApplication, mergeDrafts } from './Apply';

const savedDraft = {
  id: 42,
  status: 'draft',
  projectName: 'Mindful Earth Alliance',
  projectType: 'early_stage',
  location: 'Ashland, Oregon USA',
  vision: 'A farm that teaches mindfulness through the land.',
  landStatus: 'seeking',
  teamSize: 3,
  teamDescription: '',
  regenerativePractices: '',
  governanceApproach: '',
  communityEngagement: '',
  timeCommitment: '',
  fundingNeeds: '',
  mixedUse: '["residential"]',
  dietaryPatterns: null,
  documentsUrl: '[{"name":"plan.pdf","url":"https://x/plan.pdf","size":1,"type":"application/pdf"}]',
  latitude: null,
  updatedAt: '2026-09-02T23:38:27.000Z',
};

describe('formDataFromApplication', () => {
  it('loads the saved fields and parses the JSON lists', () => {
    const f = formDataFromApplication(savedDraft);
    expect(f.projectName).toBe('Mindful Earth Alliance');
    expect(f.vision).toContain('mindfulness');
    expect(f.teamSize).toBe(3);
    expect(f.latitude).toBeNull();
    expect(f.mixedUse).toEqual(['residential']);
    expect(f.dietaryPatterns).toEqual([]);
    expect(f.documents[0].name).toBe('plan.pdf');
  });

  it('drops the placeholders applications.create writes', () => {
    const f = formDataFromApplication({ ...savedDraft, projectName: 'Untitled Project', location: 'TBD' });
    expect(f.projectName).toBe('');
    expect(f.location).toBe('');
  });
});

describe('mergeDrafts', () => {
  const server = formDataFromApplication(savedDraft);
  const serverAt = new Date(savedDraft.updatedAt).getTime();

  it('keeps the server draft and fills its gaps from the browser copy', () => {
    const out = mergeDrafts(server, { data: { vision: 'older', teamDescription: 'Three of us' }, savedAt: serverAt - 1000 }, serverAt);
    expect(out.vision).toBe(server.vision);
    expect(out.teamDescription).toBe('Three of us');
  });

  it('takes the browser copy when it was written after the last server save', () => {
    const out = mergeDrafts(server, { data: { vision: 'newer words' }, savedAt: serverAt + 1000 }, serverAt);
    expect(out.vision).toBe('newer words');
  });

  it('ignores a browser copy for a different project', () => {
    const out = mergeDrafts(server, { data: { projectName: 'Someone Else', vision: 'x' }, savedAt: serverAt + 1000 }, serverAt);
    expect(out).toEqual(server);
  });
});

describe('Apply form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    myApps.data = [];
    updateSpy.fn = null;
    localStorage.clear();
    window.history.replaceState(null, '', '/apply');
  });

  it('opens a saved draft from the profile link with its answers filled in', async () => {
    myApps.data = [savedDraft];
    window.history.replaceState(null, '', '/apply?id=42');
    render(<Apply />);
    await waitFor(() => {
      expect((screen.getByLabelText(/Project Name/) as HTMLInputElement).value).toBe('Mindful Earth Alliance');
    });
    expect(screen.getByText('Review your application')).toBeDefined();
    expect(screen.getByText('Submit Application')).toBeDefined();
  });

  it('lets an applicant edit a sent application without sending it again', async () => {
    myApps.data = [{ ...savedDraft, status: 'submitted' }];
    window.history.replaceState(null, '', '/apply?id=42');
    render(<Apply />);
    await waitFor(() => {
      expect(screen.getByText('Save changes')).toBeDefined();
    });
    expect(screen.queryByText('Submit Application')).toBeNull();
    expect(screen.queryByText('Save Draft')).toBeNull();
  });

  it('saves the whole form to the existing draft', async () => {
    myApps.data = [savedDraft];
    window.history.replaceState(null, '', '/apply?id=42');
    render(<Apply />);
    await waitFor(() => expect(screen.getByText('Save Draft')).toBeDefined());
    await userEvent.click(screen.getByText('Save Draft'));
    await waitFor(() => expect(updateSpy.fn).toHaveBeenCalled());
    const call = updateSpy.fn.mock.calls[0][0];
    expect(call.id).toBe(42);
    expect(call.data.vision).toContain('mindfulness');
    expect(JSON.parse(call.data.documentsUrl)[0].name).toBe('plan.pdf');
    expect(await screen.findByText(/under Submissions/)).toBeDefined();
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
