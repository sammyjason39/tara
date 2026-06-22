import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ──────────────────────────────────────────────────────────────────
const { mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ForgotPasswordModal pulls in the api client + toast; keep them inert here.
vi.mock("@/core/api/apiClient", () => ({ apiRequest: vi.fn() }));

import Login from "./Login";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 3.8, 12.3
  it("shows per-field validation messages and does not submit when fields are empty", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /initialize access/i }));

    expect(await screen.findByText(/work email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // Validates: Requirements 3.8, 12.3
  it("validates email format and blocks submit on an invalid email", async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /initialize access/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // Validates: Requirements 3.8, 10.4 (focus-first-invalid)
  it("moves focus to the first invalid field on submit", async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/work email/i);

    fireEvent.click(screen.getByRole("button", { name: /initialize access/i }));

    await waitFor(() => expect(emailInput).toHaveFocus());
  });

  // Validates: Requirements 3.7, 12.2
  it("submits valid credentials and navigates to the landing route on success", async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "user@company.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /initialize access/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@company.com",
        password: "secret123",
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/core/dashboard"));
  });

  // Validates: Requirements 3.4, 12.3 (failure feedback preserves input)
  it("shows a feedback message and preserves entered input when login fails", async () => {
    mockLogin.mockResolvedValue({ success: false, error: "Invalid credentials" });
    renderLogin();

    const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "user@company.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /initialize access/i }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/invalid credentials/i)).toBeInTheDocument();

    // Input is preserved so the user can retry without re-entering.
    expect(emailInput.value).toBe("user@company.com");
    expect(passwordInput.value).toBe("wrongpass");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
