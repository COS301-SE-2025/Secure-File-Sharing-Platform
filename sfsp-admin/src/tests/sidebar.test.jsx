import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "../../src/ui/components/sidebar/Sidebar";
import "@testing-library/jest-dom";

window.open = jest.fn();
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => (store[key] = value.toString())),
    removeItem: jest.fn((key) => delete store[key]),
    clear: jest.fn(() => (store = {})),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

const userMock = {
  username: "John Doe",
  email: "john@example.com",
};

describe("Sidebar Component", () => {
  beforeEach(() => {
    window.open.mockClear();
    mockNavigate.mockClear();
    localStorageMock.clear();
    render(
      <BrowserRouter>
        <Sidebar user={userMock} />
      </BrowserRouter>
    );
  });

  test("renders navigation links and profile info", () => {
    const sidebar = screen.getByRole("complementary"); 
    expect(within(sidebar).getByText("Dashboard")).toBeInTheDocument();
    expect(within(sidebar).getByText("Users")).toBeInTheDocument();
    expect(within(sidebar).getByText("Blocked Users")).toBeInTheDocument();
    expect(within(sidebar).getByText("Reports")).toBeInTheDocument();

    const profileSection = document.querySelector(".sidebar-profile");
    expect(within(profileSection).getByText("John Doe")).toBeInTheDocument();
    expect(within(profileSection).getByText("john@example.com")).toBeInTheDocument();
    expect(within(profileSection).getByText("JD")).toBeInTheDocument(); // Initials
  });

  test("collapses and expands sidebar on logo click", () => {
    const logo = screen.getByAltText("SecureShare Logo");

    expect(screen.getByText("SecureShare")).toBeInTheDocument();
    expect(screen.getByText("Admin Portal")).toBeInTheDocument();

    fireEvent.click(logo);
    expect(screen.queryByText("SecureShare")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Portal")).not.toBeInTheDocument();
    expect(document.querySelector(".sidebar")).toHaveClass("collapsed");

    fireEvent.click(logo);
    expect(screen.getByText("SecureShare")).toBeInTheDocument();
    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
    expect(document.querySelector(".sidebar")).not.toHaveClass("collapsed");
  });

  test("opens external website", () => {
    const websiteBtn = screen.getByRole("button", { name: /Open Website/i });
    fireEvent.click(websiteBtn);
    expect(window.open).toHaveBeenCalledWith("https://secureshare.co.za", "_blank");
  });

  test("handles logout in expanded sidebar", () => {
    const profileSection = document.querySelector(".sidebar-profile");
    const logoutBtn = within(profileSection).getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutBtn);

    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("handles logout in collapsed sidebar", () => {
    const logo = screen.getByAltText("SecureShare Logo");
    fireEvent.click(logo); 

    const profileSection = document.querySelector(".sidebar-profile");
    const logoutBtn = within(profileSection).getByRole("button", { name: "" }); 
    fireEvent.click(logoutBtn);

    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(localStorage.removeItem).toHaveBeenCalledWith("token");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });


});
