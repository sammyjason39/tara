import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ──────────────────────────────────────────────────────────────────
const { mockRegisterUser, mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ registerUser: mockRegisterUser, login: mockLogin }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import Register from "./Register";

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

const fillValid = () => {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
  fireEvent.change(screen.getByLabelText(/work email/i), {
    target: { value: "ada@company.com" },
  });
  fireEvent.change(screen.getByLabelText(/access credential/i), {
    target: { value: "supersecret" },
  });
};

describe("Register page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 3.8, 12.3
  it("shows per-field validation messages and does not submit when required fields are empty", async () => {
    renderRegister();

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/work email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  // Validates: Requirements 3.8, 12.3
  it("rejects a password shorter than 8 characters", async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "ada@company.com" },
    });
    fireEvent.change(screen.getByLabelText(/access credential/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  // Validates: Requirements 3.8, 10.4 (focus-first-invalid)
  it("moves focus to the first invalid field on submit", async () => {
    renderRegister();
    const firstName = screen.getByLabelText(/first name/i);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(firstName).toHaveFocus());
  });

  // Validates: Requirements 3.7
  it("submits valid input to registerUser", async () => {
    mockRegisterUser.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue({ success: true });
    renderRegister();

    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@company.com",
          password: "supersecret",
        }),
      ),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/core/dashboard"));
  });

  // Validates: Requirements 3.4, 12.3 (failure feedback preserves input)
  it("shows a feedback message and preserves input when registration fails", async () => {
    mockRegisterUser.mockResolvedValue({ success: false, error: "Email already in use" });
    renderRegister();

    fillValid();
    const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/email already in use/i)).toBeInTheDocument();
    expect(emailInput.value).toBe("ada@company.com");
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
