import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../ui/dashboard/Dashboard';

// Mock adminFetch
jest.mock('../api/api_config', () => ({
  adminFetch: jest.fn(),
}));

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ email: 'testuser@example.com' }));
  jest.clearAllMocks();
  jest.mocked(require('../api/api_config').adminFetch).mockImplementation((url, options = {}) => {
    if (url.includes('/dashboard/stats')) {
      return Promise.resolve({
        success: true,
        stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
      });
    }
    if (url.includes('/announcements') && !options.method) {
      return Promise.resolve({
        success: true,
        announcements: [
          {
            id: 1,
            action: 'Announcement 1',
            info: 'Details',
            user: 'testuser@example.com',
            severity: 'success',
            created_at: '2023-10-01T12:00:00Z',
          },
          {
            id: 2,
            action: 'Announcement 2',
            info: 'Warning',
            user: 'testuser@example.com',
            severity: 'medium',
            created_at: '2023-10-02T12:00:00Z',
          },
          {
            id: 3,
            action: 'Announcement 3',
            info: 'Danger',
            user: 'otheruser@example.com',
            severity: 'high',
            created_at: '2023-10-03T12:00:00Z',
          },
        ],
      });
    }
    if (url.includes('/announcements') && options.method === 'POST') {
      return Promise.resolve({
        success: true,
        announcement: {
          id: 4,
          action: options.body.action,
          info: options.body.info || 'No details',
          user: 'testuser@example.com',
          severity: options.body.severity,
          created_at: '2023-10-04T12:00:00Z',
        },
      });
    }
    if (url.includes('/announcements') && options.method === 'DELETE') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: true, announcements: [] });
  });
});

afterEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('Dashboard Component', () => {
  test('renders header and open website button', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Secure file sharing administration portal')).toBeInTheDocument();
      expect(screen.getByText('Open Website')).toBeInTheDocument();
    });
  });

  test('renders stats correctly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Blocked Users')).toBeInTheDocument();
      expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  test('renders announcements with correct severity colors', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const activityItems = document.querySelectorAll('.activity-item');
      expect(activityItems.length).toBe(3);
      expect(activityItems[0].querySelector('.dot.success')).toBeInTheDocument();
      expect(activityItems[1].querySelector('.dot.warning')).toBeInTheDocument();
      expect(activityItems[2].querySelector('.dot.danger')).toBeInTheDocument();
      expect(screen.getByText('Announcement 1')).toBeInTheDocument();
      expect(screen.getByText('Announcement 2')).toBeInTheDocument();
      expect(screen.getByText('Announcement 3')).toBeInTheDocument();
    });
  });

  test('handles failed fetch stats', async () => {
    jest.mocked(require('../api/api_config').adminFetch).mockImplementation((url) => {
      if (url.includes('/dashboard/stats')) {
        throw new Error('Network error');
      }
      return Promise.resolve({
        success: true,
        announcements: [],
      });
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Blocked Users')).toBeInTheDocument();
      expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBe(3);
    });
  });

  test('handles add announcement with missing action', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByText('+');
    fireEvent.click(addBtn);

    const addButton = screen.getByText('Add');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Add Announcement')).toBeInTheDocument();
    });
  });


  test('handles add announcement network error', async () => {
    jest.mocked(require('../api/api_config').adminFetch).mockImplementation((url, options = {}) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({
          success: true,
          stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
        });
      }
      if (url.includes('/announcements') && !options.method) {
        return Promise.resolve({
          success: true,
          announcements: [
            {
              id: 1,
              action: 'Announcement 1',
              info: 'Details',
              user: 'testuser@example.com',
              severity: 'success',
              created_at: '2023-10-01T12:00:00Z',
            },
          ],
        });
      }
      if (url.includes('/announcements') && options.method === 'POST') {
        throw new Error('Network error');
      }
      return Promise.resolve({ success: true, announcements: [] });
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByText('+');
    fireEvent.click(addBtn);

    const actionInput = screen.getByPlaceholderText('Action');
    fireEvent.change(actionInput, { target: { value: 'New Announcement' } });

    const addButton = screen.getByText('Add');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('New Announcement')).not.toBeInTheDocument();
    });
  });

  test('opens and closes manage announcements modal', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const manageBtn = screen.getByText('Manage');
    fireEvent.click(manageBtn);

    expect(await screen.findByText('Manage Your Announcements')).toBeInTheDocument();

    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Manage Your Announcements')).not.toBeInTheDocument();
    });
  });

  test('renders no announcements message in manage modal', async () => {
    jest.mocked(require('../api/api_config').adminFetch).mockImplementation((url) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({
          success: true,
          stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
        });
      }
      return Promise.resolve({ success: true, announcements: [] });
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const manageBtn = screen.getByText('Manage');
    fireEvent.click(manageBtn);

    expect(await screen.findByText('No announcements posted by you.')).toBeInTheDocument();
  });

});