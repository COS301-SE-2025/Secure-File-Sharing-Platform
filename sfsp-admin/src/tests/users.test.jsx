import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import Users from "../ui/users/Users";

global.fetch = jest.fn();
jest.useFakeTimers();

const mockUsers = [
  {
    id: 1,
    username: "user1",
    email: "user1@example.com",
    role: "general",
    avatar_url: "",
    is_verified: true,
    active: true,
    created_at: "2023-10-01T12:00:00Z",
  },
  {
    id: 2,
    username: "admin1",
    email: "admin1@example.com",
    role: "admin",
    avatar_url: "http://example.com/avatar.png",
    is_verified: false,
    active: false,
    blocked_info: { reason: "Violation", severity: "High", blocked_by: "admin", blocked_date: "2023-10-02T12:00:00Z" },
  },
];

beforeEach(() => {
  fetch.mockClear();
  jest.clearAllTimers();
});

test("renders stats and users table", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  expect(await screen.findByText("Total Users")).toBeInTheDocument();
  expect(await screen.findByText((content, node) => node.tagName === "STRONG" && content === "2")).toBeInTheDocument();
  expect(await screen.findByText((content, node) => node.tagName === "STRONG" && content === "1")).toBeInTheDocument();
  expect(await screen.findByText("user1")).toBeInTheDocument();
  expect(await screen.findByText("admin1")).toBeInTheDocument();
});

test("opens and closes Admin modal", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  const manageButton = screen.getByText("Manage");
  fireEvent.click(manageButton);

  expect(await screen.findByText("Manage Admin Users")).toBeInTheDocument();

  const backdrop = screen.getByText("Manage Admin Users").closest(".modal-backdrop");
  fireEvent.click(backdrop);

  await waitFor(() => {
    expect(screen.queryByText("Manage Admin Users")).not.toBeInTheDocument();
  });
});

test("filters users by search term", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  const searchInput = screen.getByPlaceholderText("Search users...");
  fireEvent.change(searchInput, { target: { value: "admin1" } });

  await waitFor(() => {
    expect(screen.getByText("admin1")).toBeInTheDocument();
    expect(screen.queryByText("user1")).not.toBeInTheDocument();
  });
});

test("handles delete user action", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText("user1"));

  const deleteButton = screen.getAllByTitle("Delete User")[0];
  fireEvent.click(deleteButton);

  await waitFor(() =>
    expect(screen.getByText("user1 has been removed from the system")).toBeInTheDocument()
  );
  expect(screen.queryByText("user1")).not.toBeInTheDocument();
});

test("handles failed fetch users", async () => {
  fetch.mockRejectedValueOnce(new Error("Network error"));

  await act(async () => {
    render(<Users />);
  });

  expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/admin/users");
  expect(screen.queryByText("user1")).not.toBeInTheDocument();
});


test("handles failed delete user", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, message: "Cannot delete user" }) });

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText("user1"));

  const deleteButton = screen.getAllByTitle("Delete User")[0];
  fireEvent.click(deleteButton);

  await waitFor(() =>
    expect(screen.getByText("Cannot delete user")).toBeInTheDocument()
  );
});

test("handles delete user network error", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockRejectedValueOnce(new Error("Network error"));

  await act(async () => {
    render(<Users />);
  });

  await waitFor(() => screen.getByText("user1"));

  const deleteButton = screen.getAllByTitle("Delete User")[0];
  fireEvent.click(deleteButton);

  await waitFor(() =>
    expect(screen.getByText("Failed to delete user")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Failed to delete user")).not.toBeInTheDocument();
  });
});

test("opens and closes info modal", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  const infoButton = screen.getAllByTitle("View Info")[0];
  fireEvent.click(infoButton);

  expect(await screen.findByText("user1 Info")).toBeInTheDocument();
  expect(screen.getByText("@user1")).toBeInTheDocument();

  const closeButton = screen.getByText("Close");
  fireEvent.click(closeButton);

  await waitFor(() => {
    expect(screen.queryByText("user1 Info")).not.toBeInTheDocument();
  });
});

test("sends message to user", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

  await act(async () => {
    render(<Users />);
  });

  const messageButton = screen.getAllByTitle("Send Message")[0];
  fireEvent.click(messageButton);

  const subjectInput = screen.getByPlaceholderText("Subject");
  const messageInput = screen.getByPlaceholderText("Type your message here...");
  fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
  fireEvent.change(messageInput, { target: { value: "Test Message" } });

  const sendButton = screen.getByText("Send");
  await act(async () => {
    fireEvent.click(sendButton);
  });

  await waitFor(() =>
    expect(screen.getByText("Message sent to user1")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Message sent to user1")).not.toBeInTheDocument();
  });
});

test("blocks user with reason and severity", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: {
          id: 1,
          blocked_info: { reason: "Violation", severity: "Medium", blocked_by: "admin", blocked_date: "2023-10-03T12:00:00Z" },
        },
      }),
    });

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle("Block User")[0];
  fireEvent.click(blockButton);

  expect(await screen.findByText("Block User: user1")).toBeInTheDocument();

  const reasonInput = screen.getByPlaceholderText("Enter reason");
  fireEvent.change(reasonInput, { target: { value: "Violation" } });

  const severitySelect = screen.getByRole("combobox");
  fireEvent.change(severitySelect, { target: { value: "Medium" } });

  const blockButtonModal = screen.getByText("Block User");
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() =>
    expect(screen.getByText("User user1 blocked successfully")).toBeInTheDocument()
  );
});

test("handles block user with missing reason", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle("Block User")[0];
  fireEvent.click(blockButton);

  const blockButtonModal = screen.getByText("Block User");
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() =>
    expect(screen.getByText("Please enter a reason")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Please enter a reason")).not.toBeInTheDocument();
  });
});

test("handles block user network error", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockRejectedValueOnce(new Error("Network error"));

  await act(async () => {
    render(<Users />);
  });

  const blockButton = screen.getAllByTitle("Block User")[0];
  fireEvent.click(blockButton);

  const reasonInput = screen.getByPlaceholderText("Enter reason");
  fireEvent.change(reasonInput, { target: { value: "Violation" } });

  const blockButtonModal = screen.getByText("Block User");
  await act(async () => {
    fireEvent.click(blockButtonModal);
  });

  await waitFor(() =>
    expect(screen.getByText("Failed to block user")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Failed to block user")).not.toBeInTheDocument();
  });
});

test("creates new admin user", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: {
          id: 3,
          username: "newadmin",
          email: "newadmin@example.com",
          role: "admin",
          avatar_url: "",
        },
      }),
    });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText("Manage"));

  const usernameInput = screen.getByPlaceholderText("Enter username");
  const emailInput = screen.getByPlaceholderText("Enter email");
  fireEvent.change(usernameInput, { target: { value: "newadmin" } });
  fireEvent.change(emailInput, { target: { value: "newadmin@example.com" } });

  const createButton = screen.getByText("Create Admin");
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() =>
    expect(screen.getByText("newadmin has been granted admin privileges")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("newadmin has been granted admin privileges")).not.toBeInTheDocument();
  });
});

test("handles create admin with missing fields", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText("Manage"));

  const createButton = screen.getByText("Create Admin");
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() =>
    expect(screen.getByText("Please fill in all fields")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Please fill in all fields")).not.toBeInTheDocument();
  });
});

test("handles create admin network error", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockRejectedValueOnce(new Error("Network error"));

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText("Manage"));

  const usernameInput = screen.getByPlaceholderText("Enter username");
  const emailInput = screen.getByPlaceholderText("Enter email");
  fireEvent.change(usernameInput, { target: { value: "newadmin" } });
  fireEvent.change(emailInput, { target: { value: "newadmin@example.com" } });

  const createButton = screen.getByText("Create Admin");
  await act(async () => {
    fireEvent.click(createButton);
  });

  await waitFor(() =>
    expect(screen.getByText("Failed to create admin")).toBeInTheDocument()
  );

  await waitFor(() => {
    expect(screen.queryByText("Manage Admin Users")).not.toBeInTheDocument();
  });
});

test("changes user role", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: "Role updated" }) });

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText("Manage"));

  const roleSelect = screen.getAllByRole("combobox")[0];
  fireEvent.change(roleSelect, { target: { value: "general" } });

  await waitFor(() =>
    expect(screen.getByText("Role updated")).toBeInTheDocument()
  );

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText("Role updated")).not.toBeInTheDocument();
  });
});

test("handles role change network error", async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, users: mockUsers }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, totalUsers: 2, adminUsers: 1 }) })
    .mockRejectedValueOnce(new Error("Network error"));

  await act(async () => {
    render(<Users />);
  });

  fireEvent.click(screen.getByText("Manage"));

  const roleSelect = screen.getAllByRole("combobox")[0];
  fireEvent.change(roleSelect, { target: { value: "general" } });

  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/api/admin/users/role",
    expect.objectContaining({ method: "POST" })
  );
});

