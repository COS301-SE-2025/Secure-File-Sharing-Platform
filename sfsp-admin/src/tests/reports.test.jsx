import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import Reports from "../ui/reports/Reports";

jest.mock('../api/api_config', () => ({
  adminFetch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();

  jest.mocked(require('../api/api_config').adminFetch)
    .mockImplementation((url) => {
      if (url.includes('reports')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 1,
              type: 'Spam',
              reported_user: 'user1@example.com',
              assignee: '',
              status: 'Pending',
              priority: 'Low',
              created_at: '2025-09-28T12:00:00Z',
              info: 'Spamming the system',
            },
          ],
        });
      }
      if (url.includes('report-stats')) {
        return Promise.resolve({
          success: true,
          data: { pending: 1, underReview: 0, resolved: 0, critical: 0, thisWeek: 1 },
        });
      }
      if (url.includes('assignees')) {
        return Promise.resolve({
          success: true,
          data: [{ id: 1, username: 'admin1' }],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('Reports Component', () => {
  test('renders header and title', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText(/Reports Management/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ Add New Report/i })).toBeInTheDocument();
    });
  });

  test('renders reports table after fetch', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Spam')).toBeInTheDocument();
    });
  });

  test('renders stats cards correctly', async () => {
    render(<Reports />);
    await waitFor(() => {
      const statsGrid = document.querySelector('.stats-grid');
      expect(within(statsGrid).getByText('Pending')).toBeInTheDocument();
      expect(within(statsGrid).getByText('Under Review')).toBeInTheDocument();
      expect(within(statsGrid).getByText('Resolved')).toBeInTheDocument();
      expect(within(statsGrid).getByText('Critical')).toBeInTheDocument();
      expect(within(statsGrid).getByText('This Week')).toBeInTheDocument();
    });
  });

  test('opens and closes Add New Report modal', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument(); // Ensure component is loaded
    });
    const addButton = screen.getByRole('button', { name: /\+ Add New Report/i });
    fireEvent.click(addButton);

    expect(screen.getByRole('heading', { name: /Add New Report/i })).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('heading', { name: /Add New Report/i })).not.toBeInTheDocument();
  });

  test('filters reports by search term', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search reports/i);
    fireEvent.change(searchInput, { target: { value: 'user1' } });

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.queryByText('user2@example.com')).not.toBeInTheDocument(); // Ensure non-matching user is not present
    });
  });

  test('filters reports by status', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const filtersContainer = document.querySelector('.filters');
    const statusDropdown = within(filtersContainer).getByRole('combobox');
    fireEvent.change(statusDropdown, { target: { value: 'pending' } });

    const table = screen.getByRole('table');
    await waitFor(() => {
      const pendingCell = within(table).getByText('Pending');
      expect(pendingCell).toBeInTheDocument();
      expect(pendingCell.closest('tr')).toHaveTextContent('user1@example.com'); // Ensure correct row
    });
  });

  test('opens and closes report details modal', async () => {
    render(<Reports />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText(/Report Details/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Report Details/i)).not.toBeInTheDocument();
    });
  });
});