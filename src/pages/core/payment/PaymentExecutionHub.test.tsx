import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PaymentProvider, PaymentTransaction } from "@/core/types/payment/payment";

/**
 * Component tests for the Payment workspace — Core Page_Group (task 8.5).
 *
 * Focus areas:
 * - Contract gating on PaymentExecutionHub: Approve is enabled ONLY for the current
 *   Backend_Contract value `REQUEST_CREATED` and disabled for every other status
 *   (Requirements 6.1, 13.3).
 * - Statuses render through `statusLabel` (e.g. "Request Created", "Approved")
 *   rather than the raw enum literal (Requirement 6.4/6.6 surfaced here).
 * - Action feedback: a successful control action surfaces a Feedback_Message
 *   (Requirements 3.5, 3.3).
 * - Empty_State on zero records (Requirement 4.3).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
const session = {
  user_id: "pay-test-user",
  tenant_id: "tenant-demo",
  location_id: "LOC-HQ",
  role: "SUPERADMIN",
  department_id: "FINANCE",
  permissions: [],
};

vi.mock("@/core/security/session", () => ({
  useSession: () => session,
  ensureTenant: vi.fn(),
}));

const {
  mockListProviders,
  mockListTransactions,
  mockApproveRequest,
  mockSelectProvider,
  mockExecutePayment,
  mockConfirmSettlement,
  mockRejectRequest,
  mockCreateExecutionRequest,
} = vi.hoisted(() => ({
  mockListProviders: vi.fn(),
  mockListTransactions: vi.fn(),
  mockApproveRequest: vi.fn(),
  mockSelectProvider: vi.fn(),
  mockExecutePayment: vi.fn(),
  mockConfirmSettlement: vi.fn(),
  mockRejectRequest: vi.fn(),
  mockCreateExecutionRequest: vi.fn(),
}));

vi.mock("@/core/services/payment/paymentService", () => ({
  paymentService: {
    listProviders: mockListProviders,
    listTransactions: mockListTransactions,
    approveRequest: mockApproveRequest,
    selectProvider: mockSelectProvider,
    executePayment: mockExecutePayment,
    confirmSettlement: mockConfirmSettlement,
    rejectRequest: mockRejectRequest,
    createExecutionRequest: mockCreateExecutionRequest,
  },
}));

import PaymentExecutionHub from "./PaymentExecutionHub";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const PROVIDERS: PaymentProvider[] = [
  {
    id: "BANK_BCA",
    tenantId: "tenant-demo",
    name: "Bank BCA",
    channels: ["BANK_TRANSFER"],
    status: "HEALTHY",
    maxAmountPerTxn: 1_000_000_000,
    settlementSlaHours: 24,
    priority: 1,
    lastHeartbeatAt: "2026-01-01T00:00:00.000Z",
  },
];

function makeTx(
  id: string,
  status: PaymentTransaction["status"],
  overrides: Partial<PaymentTransaction> = {},
): PaymentTransaction {
  return {
    id,
    tenantId: "tenant-demo",
    type: "VENDOR_PAYOUT",
    amount: 1000,
    currency: "IDR",
    destination: `dest-${id}`,
    source: "Finance",
    channel: "BANK_TRANSFER",
    providerId: "BANK_BCA",
    idempotencyKey: `idem-${id}`,
    status,
    retryAttempts: [],
    createdBy: "pay-test-user",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const renderHub = () => render(<PaymentExecutionHub />);

beforeEach(() => {
  vi.clearAllMocks();
  mockListProviders.mockResolvedValue(PROVIDERS);
  mockListTransactions.mockResolvedValue([]);
});

describe("PaymentExecutionHub — contract gating", () => {
  // Validates: Requirements 6.1, 13.3
  it("enables Approve ONLY for REQUEST_CREATED and disables it for every other status", async () => {
    const transactions = [
      makeTx("TX-REQ", "REQUEST_CREATED"),
      makeTx("TX-APP", "APPROVED"),
      makeTx("TX-PRV", "PROVIDER_SELECTED"),
      makeTx("TX-EXE", "EXECUTING"),
      makeTx("TX-SPN", "SETTLEMENT_PENDING"),
      makeTx("TX-STL", "SETTLED"),
      makeTx("TX-REJ", "REJECTED"),
    ];
    mockListTransactions.mockResolvedValue(transactions);

    renderHub();

    // Wait for the async fetch to populate the execution queue.
    await screen.findByText("TX-REQ");

    const approveButtons = screen.getAllByRole("button", { name: /^approve$/i });
    expect(approveButtons).toHaveLength(transactions.length);

    // Row order matches the transactions fixture order.
    const [reqCreated, ...others] = approveButtons;
    expect(reqCreated).toBeEnabled();
    others.forEach((btn) => expect(btn).toBeDisabled());
  });

  // Validates: Requirements 6.1, 13.3 (obsolete APPROVAL_PENDING must NOT enable Approve)
  it("keeps Approve disabled for the obsolete APPROVAL_PENDING value", async () => {
    mockListTransactions.mockResolvedValue([
      makeTx("TX-OLD", "APPROVAL_PENDING" as PaymentTransaction["status"]),
    ]);

    renderHub();
    await screen.findByText("TX-OLD");

    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDisabled();
  });

  // Validates: Requirements 6.4, 6.6 (statuses render through statusLabel, not raw enum)
  it("renders statuses through statusLabel as human labels", async () => {
    mockListTransactions.mockResolvedValue([
      makeTx("TX-REQ", "REQUEST_CREATED"),
      makeTx("TX-APP", "APPROVED"),
    ]);

    renderHub();
    await screen.findByText("TX-REQ");

    expect(screen.getByText("Request Created")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    // The raw contract literal must never be surfaced as the status label.
    expect(screen.queryByText("REQUEST_CREATED")).not.toBeInTheDocument();
  });
});

describe("PaymentExecutionHub — action feedback", () => {
  // Validates: Requirements 3.5, 3.3 (Feedback_Message on a successful control action)
  it("shows a success Feedback_Message after approving a REQUEST_CREATED payment", async () => {
    mockListTransactions.mockResolvedValue([makeTx("TX-REQ", "REQUEST_CREATED")]);

    renderHub();
    await screen.findByText("TX-REQ");

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    expect(mockApproveRequest).toHaveBeenCalledTimes(1);
    const alert = await screen.findByText(/payment approved/i);
    expect(alert).toBeInTheDocument();
  });

  // Validates: Requirements 3.5 (Feedback_Message on create request submit)
  it("shows a success Feedback_Message after creating an execution request", async () => {
    renderHub();
    // No records yet — wait for the initial fetch to settle.
    await screen.findByText(/no execution requests/i);

    fireEvent.change(screen.getByPlaceholderText(/destination/i), {
      target: { value: "Acme Vendor" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^amount$/i), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create request/i }));

    expect(mockCreateExecutionRequest).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/created\./i)).toBeInTheDocument();
  });
});

describe("PaymentExecutionHub — empty state", () => {
  // Validates: Requirements 4.3 (Empty_State on zero records)
  it("renders the Empty_State when there are no execution requests", async () => {
    mockListTransactions.mockResolvedValue([]);

    renderHub();

    const empty = await screen.findByTestId("empty-state");
    expect(within(empty).getByText(/no execution requests/i)).toBeInTheDocument();
    // An Empty_State must not present a retry control (that's the Error_State's job).
    expect(within(empty).queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});
