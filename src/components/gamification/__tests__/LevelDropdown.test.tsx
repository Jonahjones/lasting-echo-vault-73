import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { LevelDropdown } from '../LevelDropdown';
import { useGamification } from '@/hooks/useGamification';
import { useGamificationCelebration } from '@/contexts/GamificationCelebrationContext';
import { useAuth } from '@/contexts/AuthContext';

// Mock the hooks
vi.mock('@/hooks/useGamification');
vi.mock('@/contexts/GamificationCelebrationContext');
vi.mock('@/contexts/AuthContext');
vi.mock('@/integrations/supabase/client');

const mockUseGamification = useGamification as Mock;
const mockUseGamificationCelebration = useGamificationCelebration as Mock;
const mockUseAuth = useAuth as Mock;

const mockUserGamification = {
  id: '1',
  user_id: 'user-1',
  total_xp: 150,
  current_level: 2,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
};

const mockBadge = {
  id: '2',
  level_required: 2,
  name: 'Memory Keeper',
  description: 'Building your legacy collection',
  svg_icon: '<svg><circle cx="12" cy="12" r="10"/></svg>',
  color: '#06B6D4',
  created_at: '2024-01-01'
};

const defaultMockGamification = {
  userGamification: mockUserGamification,
  getCurrentBadge: vi.fn(() => mockBadge),
  getLevelProgress: vi.fn(() => ({
    progress: 60,
    xpInLevel: 60,
    xpForNextLevel: 100
  })),
  loading: false
};

const defaultMockCelebration = {
  xpAnimation: {
    isAnimating: false,
    xpGained: 0,
    showProgress: false,
    animationId: ''
  }
};

const defaultMockAuth = {
  user: { id: 'user-1', email: 'test@example.com' }
};

describe('LevelDropdown', () => {
  beforeEach(() => {
    mockUseGamification.mockReturnValue(defaultMockGamification);
    mockUseGamificationCelebration.mockReturnValue(defaultMockCelebration);
    mockUseAuth.mockReturnValue(defaultMockAuth);
  });

  it('renders the trigger element correctly', () => {
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByTestId('level-badge');
    expect(trigger).toBeInTheDocument();
  });

  it('toggles dropdown on click', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    
    // Initially closed
    expect(screen.queryByText('Memory Keeper')).not.toBeInTheDocument();
    
    // Click to open
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Memory Keeper')).toBeInTheDocument();
    });
    
    // Click again to close
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.queryByText('Memory Keeper')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    
    // Focus and press Enter
    trigger.focus();
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText('Memory Keeper')).toBeInTheDocument();
    });
    
    // Press Escape to close
    await user.keyboard('{Escape}');
    
    await waitFor(() => {
      expect(screen.queryByText('Memory Keeper')).not.toBeInTheDocument();
    });
  });

  it('supports space key to toggle', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    
    // Focus and press Space
    trigger.focus();
    await user.keyboard(' ');
    
    await waitFor(() => {
      expect(screen.getByText('Memory Keeper')).toBeInTheDocument();
    });
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <LevelDropdown>
          <div data-testid="level-badge">Level 2</div>
        </LevelDropdown>
        <div data-testid="outside-element">Outside</div>
      </div>
    );

    const trigger = screen.getByRole('button');
    const outsideElement = screen.getByTestId('outside-element');
    
    // Open dropdown
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Memory Keeper')).toBeInTheDocument();
    });
    
    // Click outside
    await user.click(outsideElement);
    
    await waitFor(() => {
      expect(screen.queryByText('Memory Keeper')).not.toBeInTheDocument();
    });
  });

  it('displays correct user level information', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Memory Keeper')).toBeInTheDocument();
      expect(screen.getByText('60/100 XP')).toBeInTheDocument();
    });
  });

  it('shows progress bar for non-max level users', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Progress to Level 3')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('40 XP needed for next level')).toBeInTheDocument();
    });
  });

  it('shows max level achievement for level 5 users', async () => {
    const user = userEvent.setup();
    
    mockUseGamification.mockReturnValue({
      ...defaultMockGamification,
      userGamification: {
        ...mockUserGamification,
        current_level: 5,
        total_xp: 1000
      }
    });
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 5</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Maximum Level Reached!')).toBeInTheDocument();
      expect(screen.getByText('Total XP: 1,000')).toBeInTheDocument();
    });
  });

  it('displays XP animation when active', async () => {
    const user = userEvent.setup();
    
    mockUseGamificationCelebration.mockReturnValue({
      xpAnimation: {
        isAnimating: true,
        xpGained: 15,
        showProgress: true,
        animationId: 'test-123'
      }
    });
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('+15 XP')).toBeInTheDocument();
      expect(screen.getByText('Great job! Keep going!')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(trigger).toHaveAttribute('aria-label');
    expect(trigger).toHaveAttribute('tabIndex', '0');
  });

  it('updates aria-expanded when dropdown opens', async () => {
    const user = userEvent.setup();
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Level 2</div>
      </LevelDropdown>
    );

    const trigger = screen.getByRole('button');
    
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    
    await user.click(trigger);
    
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('handles loading state correctly', () => {
    mockUseGamification.mockReturnValue({
      ...defaultMockGamification,
      loading: true,
      userGamification: null
    });
    
    render(
      <LevelDropdown>
        <div data-testid="level-badge">Loading...</div>
      </LevelDropdown>
    );

    const trigger = screen.getByLabelText('Loading level information');
    expect(trigger).toBeInTheDocument();
  });
}); 