import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressMapMini } from './ProgressMapMini';

// Mock useProgressMap to return controlled data
vi.mock('./useProgressMap', () => ({
  useProgressMap: () => ({
    paths: [
      { pathId: 'land', completed: 2, total: 5, percent: 40, nodeStates: new Map(), nextNode: null },
      { pathId: 'ally', completed: 0, total: 5, percent: 0, nodeStates: new Map(), nextNode: null },
      { pathId: 'play', completed: 3, total: 6, percent: 50, nodeStates: new Map(), nextNode: null },
      { pathId: 'fund', completed: 1, total: 7, percent: 14, nodeStates: new Map(), nextNode: null },
    ],
    totalCompleted: 6,
    totalNodes: 23,
    overallPercent: 26,
    completedSet: new Set(),
    markCompleted: vi.fn(),
    trackPageVisit: vi.fn(),
  }),
}));

describe('ProgressMapMini', () => {
  const mockOnExpand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 path names', () => {
    render(<ProgressMapMini onExpand={mockOnExpand} />);
    expect(screen.getByText('Land')).toBeDefined();
    expect(screen.getByText('Ally')).toBeDefined();
    expect(screen.getByText('Play')).toBeDefined();
    expect(screen.getByText('Fund')).toBeDefined();
  });

  it('shows overall completion percentage', () => {
    render(<ProgressMapMini onExpand={mockOnExpand} />);
    expect(screen.getByText('26% explored')).toBeDefined();
  });

  it('shows View Map link', () => {
    render(<ProgressMapMini onExpand={mockOnExpand} />);
    expect(screen.getByText('View Map')).toBeDefined();
  });

  it('calls onExpand when View Map is clicked', () => {
    render(<ProgressMapMini onExpand={mockOnExpand} />);
    fireEvent.click(screen.getByText('View Map'));
    expect(mockOnExpand).toHaveBeenCalledOnce();
  });

  it('renders correct number of dot indicators per path', () => {
    const { container } = render(<ProgressMapMini onExpand={mockOnExpand} />);
    // Each path renders dots equal to its total nodes (5+5+7+7 = 24)
    const dots = container.querySelectorAll('.rounded-full.w-1\\.5');
    expect(dots.length).toBe(24);
  });
});
