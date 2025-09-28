import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../ui/dashboard/Dashboard";

// Mock fetch globally
beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch.mockRestore();
});

beforeEach(() => {
  localStorage.setItem(
    "user",
    JSON.stringify({ email: "testuser@example.com" })
  );
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      json: () => {
        if (url.includes("announcements")) {
          return Promise.resolve({
            success: true,
            announcements: [
              {
                id: 1,
                title: "Announcement 1",
                content: "Details",
                user: "testuser@example.com",
                severity: "success",
                created_at: "2023-10-01T12:00:00Z",
              },
              {
                id: 2,
                title: "Announcement 2",
                content: "Warning",
                user: "testuser@example.com",
                severity: "medium",
                created_at: "2023-10-02T12:00:00Z",
              },
              {
                id: 3,
                title: "Announcement 3",
                content: "Danger",
                user: "otheruser@example.com",
                severity: "high",
                created_at: "2023-10-03T12:00:00Z",
              },
            ],
          });
        } else if (url.includes("stats")) {
          return Promise.resolve({
            success: true,
            stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
          });
        }
      },
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe("Dashboard Component", () => {
  test("renders stats correctly", async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    expect(await screen.findByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("Blocked Users")).toBeInTheDocument();
    expect(screen.getByText("Pending Reports")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("renders announcements with correct severity colors", async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const activityItems = document.querySelectorAll(".activity-item");
      expect(activityItems.length).toBe(3);
      expect(activityItems[0].querySelector(".dot.success")).toBeInTheDocument();
      expect(activityItems[1].querySelector(".dot.warning")).toBeInTheDocument();
      expect(activityItems[2].querySelector(".dot.danger")).toBeInTheDocument();
    });
  });

  // test("handles failed fetch stats", async () => {
  //   fetch.mockRejectedValueOnce(new Error("Network error"));

  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/admin/dashboard/stats");
  //   expect(screen.getByText("0")).toBeInTheDocument(); // Fallback value
  // });

  test("handles failed fetch announcements", async () => {
    fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
        }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/admin/announcements");
    expect(document.querySelectorAll(".activity-item").length).toBe(0);
  });

  // test("quick actions navigate to correct pages", async () => {
  //   const mockNavigate = jest.fn();
  //   jest.spyOn(require("react-router-dom"), "useNavigate").mockReturnValue(mockNavigate);

  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   const viewAllUsersBtn = screen.getByText(/View All Users/i);
  //   const manageBlockedBtn = screen.getByText(/Manage Blocked Users/i);
  //   const reviewReportsBtn = screen.getByText(/Review Reports/i);

  //   fireEvent.click(viewAllUsersBtn);
  //   fireEvent.click(manageBlockedBtn);
  //   fireEvent.click(reviewReportsBtn);

  //   expect(mockNavigate).toHaveBeenCalledWith("/users");
  //   expect(mockNavigate).toHaveBeenCalledWith("/blocked-users");
  //   expect(mockNavigate).toHaveBeenCalledWith("/reports");
  // });

  // test("opens and closes announcement info modal", async () => {
  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   const infoBtn = await screen.findAllByText("i")[0];
  //   fireEvent.click(infoBtn);

  //   await waitFor(() => {
  //     expect(screen.getByText("Announcement Details")).toBeInTheDocument();
  //     expect(screen.getByText("Announcement 1")).toBeInTheDocument();
  //   });

  //   const closeBtn = screen.getByText("Close");
  //   fireEvent.click(closeBtn);

  //   await waitFor(() => {
  //     expect(screen.queryByText("Announcement Details")).not.toBeInTheDocument();
  //   });
  // });

  // test("adds new announcement", async () => {
  //   fetch.mockResolvedValueOnce({
  //     json: async () => ({
  //       success: true,
  //       announcement: {
  //         id: 4,
  //         action: "New Action",
  //         info: "New Info",
  //         user: "testuser@example.com",
  //         severity: "success",
  //         created_at: "2023-10-04T12:00:00Z",
  //       },
  //     }),
  //   });

  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   const addBtn = screen.getByText("+");
  //   fireEvent.click(addBtn);

  //   const actionInput = screen.getByPlaceholderText("Action");
  //   const infoInput = screen.getByPlaceholderText("Info");
  //   const severitySelect = screen.getByRole("combobox");

  //   fireEvent.change(actionInput, { target: { value: "New Action" } });
  //   fireEvent.change(infoInput, { target: { value: "New Info" } });
  //   fireEvent.change(severitySelect, { target: { value: "success" } });

  //   const addButton = screen.getByText("Add");
  //   await act(async () => {
  //     fireEvent.click(addButton);
  //   });

  //   await waitFor(() => {
  //     expect(screen.getByText("New Action")).toBeInTheDocument();
  //   });
  // });

  test("handles add announcement with missing action", async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByText("+");
    fireEvent.click(addBtn);

    const addButton = screen.getByText("Add");
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(screen.getByText("Add Announcement")).toBeInTheDocument(); // Modal stays open
  });

  test("handles add announcement network error", async () => {
    fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          announcements: [
            {
              id: 1,
              title: "Announcement 1",
              content: "Details",
              user: "testuser@example.com",
              severity: "success",
              created_at: "2023-10-01T12:00:00Z",
            },
          ],
        }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByText("+");
    fireEvent.click(addBtn);

    const actionInput = screen.getByPlaceholderText("Action");
    fireEvent.change(actionInput, { target: { value: "New Action" } });

    const addButton = screen.getByText("Add");
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("New Action")).not.toBeInTheDocument();
    });
  });

  test("opens and closes manage announcements modal", async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const manageBtn = screen.getByText("Manage");
    fireEvent.click(manageBtn);

    expect(await screen.findByText("Manage Your Announcements")).toBeInTheDocument();

    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Manage Your Announcements")).not.toBeInTheDocument();
    });
  });

  // test("deletes announcement", async () => {
  //   fetch.mockResolvedValueOnce({
  //     json: async () => ({ success: true }),
  //   });

  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   const manageBtn = screen.getByText("Manage");
  //   fireEvent.click(manageBtn);

  //   const deleteBtn = await screen.findAllByRole("button", { name: "" })[0]; // Trash2 button
  //   await act(async () => {
  //     fireEvent.click(deleteBtn);
  //   });

  //   await waitFor(() => {
  //     expect(screen.queryByText("Announcement 1")).not.toBeInTheDocument();
  //   });
  // });

  // test("handles delete announcement network error", async () => {
  //   fetch
  //     .mockResolvedValueOnce({
  //       json: async () => ({
  //         success: true,
  //         stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
  //       }),
  //     })
  //     .mockResolvedValueOnce({
  //       json: async () => ({
  //         success: true,
  //         announcements: [
  //           {
  //             id: 1,
  //             title: "Announcement 1",
  //             content: "Details",
  //             user: "testuser@example.com",
  //             severity: "success",
  //             created_at: "2023-10-01T12:00:00Z",
  //           },
  //         ],
  //       }),
  //     })
  //     .mockRejectedValueOnce(new Error("Network error"));

  //   await act(async () => {
  //     render(
  //       <BrowserRouter>
  //         <Dashboard />
  //       </BrowserRouter>
  //     );
  //   });

  //   const manageBtn = screen.getByText("Manage");
  //   fireEvent.click(manageBtn);

  //   const deleteBtn = await screen.findAllByRole("button", { name: "" })[0]; // Trash2 button
  //   await act(async () => {
  //     fireEvent.click(deleteBtn);
  //   });

  //   await waitFor(() => {
  //     expect(screen.getByText("Announcement 1")).toBeInTheDocument(); // Still present
  //   });
  // });

  test("renders no announcements message in manage modal", async () => {
    fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          stats: { totalUsers: 10, blockedUsers: 2, pendingReports: 1 },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, announcements: [] }),
      });

    await act(async () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
    });

    const manageBtn = screen.getByText("Manage");
    fireEvent.click(manageBtn);

    expect(await screen.findByText("No announcements posted by you.")).toBeInTheDocument();
  });
});
