import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import BlockedUsers from "../ui/blockedUsers/blockedUsers.jsx";
import React from "react";

jest.mock("lucide-react", () => ({
  UserX: () => <div data-testid="icon-userx" />,
  Search: () => <div data-testid="icon-search" />,
  RotateCcw: () => <div data-testid="icon-rotate" />,
  Shield: () => <div data-testid="icon-shield" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />
}));

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

const blockedUsersMock = [
  {
    id: 1,
    username: "John Doe",
    email: "john@example.com",
    blocked_info: {
      reason: "Spam",
      severity: "High",
      blockedDate: "2025-09-28",
      blockedBy: "Admin"
    }
  },
  {
    id: 2,
    username: "Jane Smith",
    email: "jane@example.com",
    blocked_info: {
      reason: "Policy Violation",
      severity: "Medium",
      blockedDate: "2025-09-27",
      blockedBy: "Admin"
    }
  }
];

const statsMock = {
  total: 2,
  high: 1,
  medium: 1,
  low: 0
};

test("renders blocked users and stats correctly", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ success: true, users: blockedUsersMock })
    })
    .mockResolvedValueOnce({
      json: async () => ({ success: true, ...statsMock })
    });

  render(<BlockedUsers />);

  await waitFor(() => {
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  expect(screen.getByTestId("stat-total")).toHaveTextContent("2");
  expect(screen.getByTestId("stat-high")).toHaveTextContent("1");
  expect(screen.getByTestId("stat-medium")).toHaveTextContent("1");
  expect(screen.getByTestId("stat-low")).toHaveTextContent("0");

});

test("filters users based on search term", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ success: true, users: blockedUsersMock })
    })
    .mockResolvedValueOnce({
      json: async () => ({ success: true, ...statsMock })
    });

  render(<BlockedUsers />);

  const searchInput = screen.getByPlaceholderText("Search blocked users...");

  fireEvent.change(searchInput, { target: { value: "Jane" } });

  await waitFor(() => {
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });
});

test("unblocks a user and updates stats", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ success: true, users: blockedUsersMock })
    })
    .mockResolvedValueOnce({
      json: async () => ({ success: true, ...statsMock })
    })
    .mockResolvedValueOnce({
      json: async () => ({ success: true })
    });

  render(<BlockedUsers />);

  await waitFor(() => screen.getByText("John Doe"));

  const unblockButton = screen.getAllByText("Unblock")[0];

  fireEvent.click(unblockButton);

  await waitFor(() => {
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.getByText("John Doe has been restored to active status")).toBeInTheDocument();
  });

  expect(screen.getByTestId("stat-total")).toHaveTextContent("1"); 
  expect(screen.getByTestId("stat-high")).toHaveTextContent("0");
});
