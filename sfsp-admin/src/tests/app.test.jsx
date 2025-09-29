import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../ui/App";
import { BrowserRouter } from "react-router-dom";

global.fetch = jest.fn();
jest.useFakeTimers();

jest.mock("../ui/components/designs/appBack.jsx", () => {
    return function MockLightRays(props) {
        return <div data-testid="light-rays" {...props} />;
    };
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.clear();
});

const renderApp = () =>
    render(
        <BrowserRouter>
            <App />
        </BrowserRouter>
    );

test("renders credentials form initially", () => {
    renderApp();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
});

test("handles successful login and switches to OTP step", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    });

    await waitFor(() => {
        expect(
            screen.getByText(/Please enter the 6-digit code from your email/i)
        ).toBeInTheDocument();
    });
});

test("back button resets to credentials", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });
    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    await waitFor(() => {
        expect(
            screen.getByText(/Please enter the 6-digit code from your email/i)
        ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "" })); 
    expect(
        screen.getByPlaceholderText(/Enter your email/i)
    ).toBeInTheDocument();
    expect(
        screen.getByPlaceholderText(/Enter your password/i)
    ).toBeInTheDocument();
});

test("handles OTP input and submission", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    const otpInputs = screen.getAllByRole("textbox");
    ["1", "2", "3", "4", "5", "6"].forEach((digit, i) => {
        fireEvent.change(otpInputs[i], { target: { value: digit } });
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Verify & Login/i }))
    );

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", expect.any(Object));
    });
});

test("shows toast on invalid OTP", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: false, message: "Wrong OTP" }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    const otpInputs = screen.getAllByRole("textbox");
    ["1", "2", "3", "4", "5", "6"].forEach((digit, i) => {
        fireEvent.change(otpInputs[i], { target: { value: digit } });
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Verify & Login/i }))
    );

    await waitFor(() => {
        expect(
            screen.getByText(/Verification failed: Wrong OTP/i)
        ).toBeInTheDocument();
    });
});

test("handles OTP paste functionality", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    const otpInputs = screen.getAllByRole("textbox");
    const mockClipboardData = {
        getData: jest.fn(() => "123456"),
    };

    fireEvent.paste(otpInputs[0], {
        clipboardData: mockClipboardData,
    });

    await waitFor(() => {
        expect(otpInputs[0]).toHaveValue("1");
        expect(otpInputs[1]).toHaveValue("2");
        expect(otpInputs[2]).toHaveValue("3");
        expect(otpInputs[3]).toHaveValue("4");
        expect(otpInputs[4]).toHaveValue("5");
        expect(otpInputs[5]).toHaveValue("6");
    });
});

test("handles OTP key navigation with ArrowLeft and ArrowRight", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    const otpInputs = screen.getAllByRole("textbox");
    otpInputs[2].focus(); 

    fireEvent.keyDown(otpInputs[2], { key: "ArrowLeft" });
    await waitFor(() => {
        expect(document.activeElement).toBe(otpInputs[1]); 
    });

    fireEvent.keyDown(otpInputs[1], { key: "ArrowRight" });
    await waitFor(() => {
        expect(document.activeElement).toBe(otpInputs[2]); 
    });
});

test("shows toast on login network error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    await waitFor(() => {
        expect(
            screen.getByText(/Login failed. Please try again./i)
        ).toBeInTheDocument();
    });
});

test("shows toast on OTP send failure", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: false, message: "Failed to send OTP" }),
        });

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    await waitFor(() => {
        expect(
            screen.getByText(/Could not send OTP: Failed to send OTP/i)
        ).toBeInTheDocument();
    });
});

test("shows toast on OTP verification network error", async () => {
    fetch
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    token: "abc123",
                    user: { id: 1, email: "a@b.com", username: "admin" },
                },
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

    renderApp();
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
        target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
        target: { value: "password123" },
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Continue/i }))
    );

    const otpInputs = screen.getAllByRole("textbox");
    ["1", "2", "3", "4", "5", "6"].forEach((digit, i) => {
        fireEvent.change(otpInputs[i], { target: { value: digit } });
    });

    await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /Verify & Login/i }))
    );

    await waitFor(() => {
        expect(
            screen.getByText(/An error occurred while verifying OTP/i)
        ).toBeInTheDocument();
    });
});