import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import Reports from "../ui/reports/Reports";

// Mock fetch globally
beforeEach(() => {
    global.fetch = jest.fn((url) => {
        if (url.includes("reports")) {
            return Promise.resolve({
                json: () => Promise.resolve({
                    data: [
                        {
                            id: 1,
                            type: "Spam",
                            reported_user: "user1@example.com",
                            assignee: "",
                            status: "Pending",
                            priority: "Low",
                            created_at: "2025-09-28T12:00:00Z",
                            info: "Spamming the system"
                        }
                    ]
                }),
            });
        }
        if (url.includes("report-stats")) {
            return Promise.resolve({
                json: () => Promise.resolve({ data: { pending: 1, underReview: 0, resolved: 0, critical: 0, thisWeek: 1 } }),
            });
        }
        if (url.includes("assignees")) {
            return Promise.resolve({
                json: () => Promise.resolve({ data: [{ id: 1, username: "admin1" }] }),
            });
        }
        return Promise.resolve({ json: () => Promise.resolve({ data: [] }) });
    });
});

afterEach(() => {
    jest.resetAllMocks();
});

describe("Reports Component", () => {

    test("renders header and title", () => {
        render(<Reports />);
        expect(screen.getByText(/Reports Management/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /\+ Add New Report/i })).toBeInTheDocument();
    });

    test("renders reports table after fetch", async () => {
        render(<Reports />);
        await waitFor(() => {
            expect(screen.getByText("user1@example.com")).toBeInTheDocument();
            expect(screen.getByText("Spam")).toBeInTheDocument();
        });
    });

    test("renders stats cards correctly", async () => {
        render(<Reports />);
        const statsGrid = document.querySelector(".stats-grid");
        expect(within(statsGrid).getByText("Pending")).toBeInTheDocument();

        expect(within(statsGrid).getByText("Pending")).toBeInTheDocument();
        expect(within(statsGrid).getByText("Under Review")).toBeInTheDocument();
        expect(within(statsGrid).getByText("Resolved")).toBeInTheDocument();
        expect(within(statsGrid).getByText("Critical")).toBeInTheDocument();
        expect(within(statsGrid).getByText("This Week")).toBeInTheDocument();
    });


    test("opens and closes Add New Report modal", () => {
        render(<Reports />);
        const addButton = screen.getByRole("button", { name: /\+ Add New Report/i });
        fireEvent.click(addButton);

        expect(screen.getByRole("heading", { name: /Add New Report/i })).toBeInTheDocument();

        const cancelButton = screen.getByRole("button", { name: /Cancel/i });
        fireEvent.click(cancelButton);

        expect(screen.queryByRole("heading", { name: /Add New Report/i })).not.toBeInTheDocument();
    });

    test("filters reports by search term", async () => {
        render(<Reports />);
        await waitFor(() => {
            const searchInput = screen.getByPlaceholderText(/Search reports/i);
            fireEvent.change(searchInput, { target: { value: "user1" } });
            expect(screen.getByText("user1@example.com")).toBeInTheDocument();
        });
    });

    test("filters reports by status", async () => {
        render(<Reports />);

        // Use querySelector + within instead of getByClassName
        const filtersContainer = document.querySelector(".filters");
        expect(filtersContainer).toBeInTheDocument();

        const statusDropdown = within(filtersContainer).getByRole("combobox");
        fireEvent.change(statusDropdown, { target: { value: "pending" } });

        const table = screen.getByRole("table");
        await waitFor(() => {
            expect(within(table).getByText("Pending")).toBeInTheDocument();
        });
    });

    test("opens and closes report details modal", async () => {
        render(<Reports />);
        await waitFor(() => {
            const viewButton = screen.getByRole("button", { name: /View/i });
            fireEvent.click(viewButton);

            expect(screen.getByText(/Report Details/i)).toBeInTheDocument();

            const closeButton = screen.getByRole("button", { name: /Close/i });
            fireEvent.click(closeButton);

            expect(screen.queryByText(/Report Details/i)).not.toBeInTheDocument();
        });
    });

});
