import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Users from '../ui/users/Users';

// Mock adminFetch
jest.mock('../api/api_config', () => ({
  adminFetch: jest.fn(),
}));

jest.useFakeTimers();

const mockUsers = [
  {
    id: 1,
    username: 'user1',
    email: 'user1@example.com',
    role: 'general',
    avatar_url: '',
    is_verified: true,
    active: true,
    created_at: '2023-10-01T12:00:00Z',
  },
  {
    id: 2,
    username: 'admin1',
    email: 'admin1@example.com',
    role: 'admin',
    avatar_url: 'http://example.com/avatar.png',
    is_verified: false,
    active: false,
    blocked_info: { reason: 'Violation', severity: 'High', blocked_by: 'admin', blocked_date: '2023-10-02T12:00:00Z' },
  },
];

beforeEach(() => {
  jest.mocked(require('../api/api_config').adminFetch).mockClear();
  jest.clearAllTimers();
  localStorage.setItem('user', JSON.stringify({ email: 'admin@example.com' }));
});

afterEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('renders stats and users table', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => {
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('admin1')).toBeInTheDocument();
  });
});

test('opens and closes Admin modal', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  const manageButton = screen.getByText('Manage');
  fireEvent.click(manageButton);

  await waitFor(() => {
    expect(screen.getByText('Manage Admin Users')).toBeInTheDocument();
  });

  const backdrop = screen.getByText('Manage Admin Users').closest('.modal-backdrop');
  fireEvent.click(backdrop);

  await waitFor(() => {
    expect(screen.queryByText('Manage Admin Users')).not.toBeInTheDocument();
  });
});

test('filters users by search term', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  const searchInput = screen.getByPlaceholderText('Search users...');
  fireEvent.change(searchInput, { target: { value: 'admin1' } });

  await waitFor(() => {
    expect(screen.getByText('admin1')).toBeInTheDocument();
    expect(screen.queryByText('user1')).not.toBeInTheDocument();
  });
});

test('handles delete user action', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({ success: true });

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText('user1'));

  const deleteButton = screen.getAllByTitle('Delete User')[0];
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText('user1 has been removed from the system')).toBeInTheDocument();
    expect(screen.queryByText('user1')).not.toBeInTheDocument();
  });
});

test('handles failed delete user', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({ success: false, message: 'Cannot delete user' });

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText('user1'));

  const deleteButton = screen.getAllByTitle('Delete User')[0];
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText('Cannot delete user')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Cannot delete user')).not.toBeInTheDocument();
  });
});

test('handles delete user network error', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockRejectedValueOnce(new Error('Network error'));

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText('user1'));

  const deleteButton = screen.getAllByTitle('Delete User')[0];
  await act(async () => {
    fireEvent.click(deleteButton);
  });

  await waitFor(() => {
    expect(screen.getByText('Failed to delete user')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Failed to delete user')).not.toBeInTheDocument();
  });
});

test('opens and closes info modal', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  const infoButton = screen.getAllByTitle('View Info')[0];
  fireEvent.click(infoButton);

  await waitFor(() => {
    expect(screen.getByText('user1 Info')).toBeInTheDocument();
    expect(screen.getByText('@user1')).toBeInTheDocument();
  });

  const closeButton = screen.getByText('Close');
  fireEvent.click(closeButton);

  await waitFor(() => {
    expect(screen.queryByText('user1 Info')).not.toBeInTheDocument();
  });
});

test('sends message to user', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({ success: true });

  await act(async () => {
    render(<Users />);
  });

  const messageButton = screen.getAllByTitle('Send Message')[0];
  fireEvent.click(messageButton);

  const subjectInput = screen.getByPlaceholderText('Subject');
  const messageInput = screen.getByPlaceholderText('Type your message here...');
  fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
  fireEvent.change(messageInput, { target: { value: 'Test Message' } });

  const sendButton = screen.getByText('Send');
  await act(async () => {
    fireEvent.click(sendButton);
  });

  await waitFor(() => {
    expect(screen.getByText('Message sent to user1')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Message sent to user1')).not.toBeInTheDocument();
  });
});

test('blocks user with reason and severity', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({
      success: true,
      user: {
        id: 1,
        blocked_info: { reason: 'Violation', severity: 'Medium', blocked_by: 'admin', blocked_date: '2023-10-03T12:00:00Z' },
      },
    });

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle('Block User')[0];
  fireEvent.click(blockButton);

  await waitFor(() => {
    expect(screen.getByText('Block User: user1')).toBeInTheDocument();
  });

  const reasonInput = screen.getByPlaceholderText('Enter reason');
  fireEvent.change(reasonInput, { target: { value: 'Violation' } });

  const severitySelect = screen.getByRole('combobox');
  fireEvent.change(severitySelect, { target: { value: 'Medium' } });

  const blockButtonModal = screen.getByText('Block User');
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() => {
    expect(screen.getByText('User user1 blocked successfully')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('User user1 blocked successfully')).not.toBeInTheDocument();
  });
});

test('handles block user with missing reason', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle('Block User')[0];
  fireEvent.click(blockButton);

  const blockButtonModal = screen.getByText('Block User');
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() => {
    expect(screen.getByText('Please enter a reason')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Please enter a reason')).not.toBeInTheDocument();
  });
});

test('handles block user network error', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockRejectedValueOnce(new Error('Network error'));

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle('Block User')[0];
  fireEvent.click(blockButton);

  const reasonInput = screen.getByPlaceholderText('Enter reason');
  fireEvent.change(reasonInput, { target: { value: 'Violation' } });

  const blockButtonModal = screen.getByText('Block User');
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() => {
    expect(screen.getByText('Failed to block user')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Failed to block user')).not.toBeInTheDocument();
  });
});

test('creates new admin user', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({
      success: true,
      user: {
        id: 3,
        username: 'newadmin',
        email: 'newadmin@example.com',
        role: 'admin',
        avatar_url: '',
      },
    });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText('Manage'));

  const usernameInput = screen.getByPlaceholderText('Enter username');
  const emailInput = screen.getByPlaceholderText('Enter email');
  fireEvent.change(usernameInput, { target: { value: 'newadmin' } });
  fireEvent.change(emailInput, { target: { value: 'newadmin@example.com' } });

  const createButton = screen.getByText('Create Admin');
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() => {
    expect(screen.getByText('newadmin has been granted admin privileges')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('newadmin has been granted admin privileges')).not.toBeInTheDocument();
  });
});

test('handles create admin with missing fields', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText('Manage'));

  const createButton = screen.getByText('Create Admin');
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() => {
    expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
  });
});

test('handles create admin network error', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockRejectedValueOnce(new Error('Network error'));

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText('Manage'));

  const usernameInput = screen.getByPlaceholderText('Enter username');
  const emailInput = screen.getByPlaceholderText('Enter email');
  fireEvent.change(usernameInput, { target: { value: 'newadmin' } });
  fireEvent.change(emailInput, { target: { value: 'newadmin@example.com' } });

  const createButton = screen.getByText('Create Admin');
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() => {
    expect(screen.getByText('Failed to create admin')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Failed to create admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Admin Users')).not.toBeInTheDocument();
  });
});

test('changes user role', async () => {
  jest.mocked(require('../api/api_config').adminFetch)
    .mockResolvedValueOnce({ success: true, users: mockUsers })
    .mockResolvedValueOnce({ success: true, totalUsers: 2, adminUsers: 1 })
    .mockResolvedValueOnce({ success: true, message: 'Role updated' });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText('Manage'));

  const roleSelect = screen.getAllByRole('combobox')[0];
  await act(async () => {
    fireEvent.change(roleSelect, { target: { value: 'general' } });
  });

  await waitFor(() => {
    expect(screen.getByText('Role updated')).toBeInTheDocument();
  });

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Role updated')).not.toBeInTheDocument();
  });
});

