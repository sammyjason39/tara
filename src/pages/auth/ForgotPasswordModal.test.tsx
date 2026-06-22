import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ──────────────────────────────────────────────────────────────────
const { mockApiRequest, mockToast } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/core/api/apiClient", () => ({ apiRequest: mockApiRequest }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

// Login owns the Recovery trigger + the modal, so it exercises real focus in/out.
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: vi.fn() }) }));

import Login from "./Login";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

describe("ForgotPasswordModal — dialog focus in/out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 3.6, 10.4
  it("moves focus into the dialog on open and releases the dialog on close", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /recovery/i });
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    // Focus moves into the dialog content on open (focus trap engaged).
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // Dismiss the dialog; its content (and focus trap) is removed.
    // NOTE: Radix restores focus to the trigger in a real browser; that
    // restoration path is exercised by the Playwright e2e suite, since jsdom
    // does not run the focus-scope restore. Here we assert the trap is released.
    fireEvent.click(screen.getByRole("button", { name: /cancel and return/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});

describe("ForgotPasswordModal — submit feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 3.4, 12.4
  it("surfaces a feedback message when the account is not found", async () => {
    mockApiRequest.mockResolvedValue({ exists: false });

    render(<ForgotPasswordModal isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/name@company\.com/i), {
      target: { value: "missing@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v1/auth/verify-email",
        "POST",
        null,
        { email: "missing@company.com" },
      ),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      ),
    );
    // Stays on the email step since the account was not found.
    expect(screen.getByText(/account recovery/i)).toBeInTheDocument();
  });

  // Validates: Requirements 3.4, 12.4
  it("advances to the reset step when the account exists", async () => {
    mockApiRequest.mockResolvedValue({ exists: true });

    render(<ForgotPasswordModal isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/name@company\.com/i), {
      target: { value: "ada@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/secure reset/i)).toBeInTheDocument();
  });

  // Validates: Requirements 3.4, 12.4
  it("completes the reset flow and shows the success feedback", async () => {
    // First call: verify-email -> exists; second call: reset-password.
    mockApiRequest
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({});

    render(<ForgotPasswordModal isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/name@company\.com/i), {
      target: { value: "ada@company.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await screen.findByText(/secure reset/i);

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "newsecret" } });
    fireEvent.change(passwordInputs[1], { target: { value: "newsecret" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        "/v1/auth/reset-password-direct",
        "POST",
        null,
        { email: "ada@company.com", newPassword: "newsecret" },
      ),
    );
    expect(await screen.findByText(/all set/i)).toBeInTheDocument();
  });
});
