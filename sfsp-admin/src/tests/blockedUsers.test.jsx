import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BlockedUsers from '../ui/blockedUsers/BlockedUsers';

// Mock adminFetch
jest.mock('../api/api_config', () => ({
  adminFetch: jest.fn(),
}));

jest.useFakeTimers();

const mockBlockedUsers = [
  {
    id: 1,
    username: 'user1',
    email: 'user1@example.com',
    avatar: '',
    blocked_info: {
      reason: 'Spam',
      severity: 'High',
      blocked_by: 'admin',
      blocked_date: '2023-10-01T12:00:00Z',
    },
  },
  {
    id: 2,
    username: 'user2',
    email: 'user2@example.com',
    avatar: 'http://example.com/avatar.png',
    blocked_info: {
      reason: 'Policy Violation',
      severity: 'Medium',
      blocked_by: 'admin',
      blocked_date: '2023-10-02T12:00:00Z',
    },
  },
];

const mockStats = {
  success: true,
  total: 2,
  high: 1,
  medium: 1,
  low: 0,
};

beforeEach(() => {
  jest.mocked(require('../api/api_config').adminFetch).mockClear();
  jest.clearAllTimers();
  localStorage.setItem('user', JSON.stringify({ email: 'admin@example.com', token: 'mock-token' }));
});

afterEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('BlockedUsers Component', () => {

  test('renders stats correctly', async () => {
    jest.mocked(require('../api/api_config').adminFetch)
      .mockResolvedValueOnce({ success: true, users: mockBlockedUsers })
      .mockResolvedValueOnce(mockStats);

    await act(async () => {
      render(<BlockedUsers />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stat-total')).toHaveTextContent('2');
      expect(screen.getByTestId('stat-high')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-medium')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-low')).toHaveTextContent('0');
    });
  });


  test('filters users by search term', async () => {
    jest.mocked(require('../api/api_config').adminFetch)
      .mockResolvedValueOnce({ success: true, users: mockBlockedUsers })
      .mockResolvedValueOnce(mockStats);

    await act(async () => {
      render(<BlockedUsers />);
    });

    const searchInput = screen.getByPlaceholderText('Search blocked users...');
    fireEvent.change(searchInput, { target: { value: 'user1' } });

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.queryByText('user2')).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'Policy' } });

    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.queryByText('user1')).not.toBeInTheDocument();
    });
  });

  test('handles unblock user action', async () => {
    jest.mocked(require('../api/api_config').adminFetch)
      .mockResolvedValueOnce({ success: true, users: mockBlockedUsers })
      .mockResolvedValueOnce(mockStats)
      .mockResolvedValueOnce({ success: true });

    await act(async () => {
      render(<BlockedUsers />);
    });

    await waitFor(() => screen.getByText('user1'));

    const unblockButton = screen.getAllByText('Unblock')[0];
    await act(async () => {
      fireEvent.click(unblockButton);
    });

    await waitFor(() => {
      expect(screen.getByText('user1 has been restored to active status')).toBeInTheDocument();
      expect(screen.queryByText('user1')).not.toBeInTheDocument();
      expect(screen.getByTestId('stat-total')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-high')).toHaveTextContent('0');
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText('user1 has been restored to active status')).not.toBeInTheDocument();
    });
  });

  test('handles failed unblock user action', async () => {
    jest.mocked(require('../api/api_config').adminFetch)
      .mockResolvedValueOnce({ success: true, users: mockBlockedUsers })
      .mockResolvedValueOnce(mockStats)
      .mockResolvedValueOnce({ success: false, message: 'Cannot unblock user' });

    await act(async () => {
      render(<BlockedUsers />);
    });

    await waitFor(() => screen.getByText('user1'));

    const unblockButton = screen.getAllByText('Unblock')[0];
    await act(async () => {
      fireEvent.click(unblockButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('user1 has been restored to active status')).not.toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });

  test('handles unblock user network error', async () => {
    jest.mocked(require('../api/api_config').adminFetch)
      .mockResolvedValueOnce({ success: true, users: mockBlockedUsers })
      .mockResolvedValueOnce(mockStats)
      .mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      render(<BlockedUsers />);
    });

    await waitFor(() => screen.getByText('user1'));

    const unblockButton = screen.getAllByText('Unblock')[0];
    await act(async () => {
      fireEvent.click(unblockButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('user1 has been restored to active status')).not.toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });
});