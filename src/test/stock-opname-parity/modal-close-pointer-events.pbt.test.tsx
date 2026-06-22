/**
 * Property-Based Test — Stock Opname Parity
 * Spec: .kiro/specs/stock-opname-parity
 *
 * Property 1: Modal close never leaves page locked
 *   Validates: Requirements 3, 3.1, 3.3, 3.4
 *
 * This test uses fast-check to verify that after UnresolvedBarcodesModal closes
 * via any path (close button, overlay click, Escape key, Quick Register success),
 * document.body always has pointer-events: auto.
 *
 * TEST METHODOLOGY:
 *   - Generate arbitrary modal open/close sequences covering all exit paths
 *   - After each close operation, assert document.body.style.pointerEvents === 'auto'
 *   - Run ≥100 iterations as specified in task 8.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import fc from "fast-check";

// --- Mocks (hoisted) -------------------------------------------------------

const mockOnClose = vi.fn();
const mockOnFlagAnomalies = vi.fn();
const mockOnItemsRegistered = vi.fn();

const mockSession = {
  tenant_id: "tenant_1",
  user_id: "user_1",
  location_id: "loc_1",
  department_id: "dept_1",
  role: "OWNER",
  permissions: [],
};

// Mock retailService.batchCreateItemsJson
vi.mock("@/core/services/retail/retailService", () => ({
  retailService: {
    batchCreateItemsJson: vi.fn(),
    listCategories: vi.fn(),
  },
}));

// Mock session context
vi.mock("@/core/security/session", () => ({
  useSession: vi.fn(() => mockSession),
}));

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { UnresolvedBarcodesModal } from "@/components/shared/UnresolvedBarcodesModal";

const rs = retailService as unknown as {
  batchCreateItemsJson: ReturnType<typeof vi.fn>;
  listCategories: ReturnType<typeof vi.fn>;
};

// --- Setup/Teardown --------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockOnClose.mockClear();
  mockOnFlagAnomalies.mockClear();
  mockOnItemsRegistered.mockClear();
  (useSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSession);
  // Reset pointer-events before each test
  resetBodyPointerEvents();
});

afterEach(() => {
  cleanup();
  // Ensure document.body pointer-events is reset after each test
  resetBodyPointerEvents();
});

// --- Helper: Check pointer-events on body ---------------------------------

function getBodyPointerEvents(): string {
  return document.body.style.pointerEvents || "auto";
}

function resetBodyPointerEvents(): void {
  document.body.style.pointerEvents = "";
}

// --- Test: Modal close never leaves page locked ----------------------------

describe("Property 1: Modal close never leaves page locked", () => {
  it("closes cleanly via all paths with pointer-events: auto on document.body", async () => {
    const unresolvedBarcodes = ["BARCODE-001", "BARCODE-002", "BARCODE-003"];

    fc.assert(
      fc.property(
        fc.oneof(
          // Close via close button (X) - always closes
          fc.constant("closeButton"),
          // Quick Register success with ALL barcodes selected - should close modal
          fc.constant("quickRegisterSuccessFull"),
          // Flagging all items as anomalies - should close modal
          fc.constant("flagAnomaliesFull")
        ).map((operation) => ({ operation })),
        async ({ operation }) => {
          // Reset before test
          resetBodyPointerEvents();
          expect(getBodyPointerEvents()).toBe("auto");

          // Render modal with isOpen=true
          render(
            <UnresolvedBarcodesModal
              isOpen={true}
              onClose={mockOnClose}
              unresolvedBarcodes={unresolvedBarcodes}
              onFlagAnomalies={mockOnFlagAnomalies}
              onItemsRegistered={mockOnItemsRegistered}
              categoryOptions={[]}
            />
          );

          // Verify modal is open
          await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
          });

          // Perform the chosen operation
          if (operation === "closeButton") {
            // Click the close button (X in top-right)
            const closeBtn = screen.getByLabelText(/Close/);
            act(() => {
              closeBtn.click();
            });
          } else if (operation === "quickRegisterSuccessFull") {
            // Mock successful Quick Register response
            rs.batchCreateItemsJson.mockResolvedValue({
              success: true,
              data: [
                { id: "item-1", sku: "BARCODE-001" },
                { id: "item-2", sku: "BARCODE-002" },
                { id: "item-3", sku: "BARCODE-003" },
              ],
            });

            // Select ALL barcodes and click Quick Register
            const selectAllBtn = screen.getByRole("button", { name: /select all/i });
            act(() => {
              selectAllBtn.click();
            });

            const quickRegisterBtn = screen.getByText(/Quick Register/i);
            act(async () => {
              quickRegisterBtn.click();
            });
          } else if (operation === "flagAnomaliesFull") {
            // Select ALL barcodes and click Flag as Anomalies
            const selectAllBtn = screen.getByRole("button", { name: /select all/i });
            act(() => {
              selectAllBtn.click();
            });

            const flagBtn = screen.getByText(/Flag as Anomalies/i);
            act(() => {
              flagBtn.click();
            });
          }

          // Wait for modal to close (all selected operations should close)
          await waitFor(
            () => {
              expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            },
            { timeout: 3000 }
          );

          // Verify document.body pointer-events is 'auto' after close
          const pointerEvents = getBodyPointerEvents();
          expect(pointerEvents).toBe("auto");
          
          // Verify onClose was called
          expect(mockOnClose).toHaveBeenCalled();
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });
});

// --- Additional: Direct pointer-events manipulation test -------------------

describe("Property 1 (direct): document.body.pointerEvents", () => {
  it("always returns 'auto' after UnresolvedBarcodesModal closes", async () => {
    const unresolvedBarcodes = ["TEST-001"];

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("closeButton"),
          fc.constant("overlayClick"),
          fc.constant("escapeKey")
        ).map((operation) => ({ operation })),
        async ({ operation }) => {
          // Ensure clean state before test
          resetBodyPointerEvents();

          render(
            <UnresolvedBarcodesModal
              isOpen={true}
              onClose={mockOnClose}
              unresolvedBarcodes={unresolvedBarcodes}
              onFlagAnomalies={mockOnFlagAnomalies}
              onItemsRegistered={mockOnItemsRegistered}
              categoryOptions={[]}
            />
          );

          // Verify modal is open
          await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
          });

          // Perform close operation
          if (operation === "closeButton") {
            act(() => {
              screen.getByLabelText(/Close/).click();
            });
          } else if (operation === "overlayClick") {
            const overlay = screen.getByTestId("radix-portal-overlay");
            if (overlay) {
              act(() => {
                overlay.click();
              });
            }
          } else if (operation === "escapeKey") {
            act(() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            });
          }

          // Verify modal closed
          await waitFor(
            () => {
              expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            },
            { timeout: 3000 }
          );

          // Direct assertion on document.body.pointerEvents
          const pointerEvents = getBodyPointerEvents();
          expect(pointerEvents).toBe("auto");
        }
      ),
      { numRuns: 100, verbose: true }
    );
  });
});
