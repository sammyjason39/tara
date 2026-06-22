import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { UnresolvedBarcodesModal } from "@/components/shared/UnresolvedBarcodesModal";

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

describe("UnresolvedBarcodesModal - Page Lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.pointerEvents = "";
  });

  it("closes without leaving page locked - close button", async () => {
    render(
      <UnresolvedBarcodesModal
        isOpen={true}
        onClose={mockOnClose}
        unresolvedBarcodes={["TEST-001"]}
        onFlagAnomalies={mockOnFlagAnomalies}
        onItemsRegistered={mockOnItemsRegistered}
        categoryOptions={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click close button (button at index 5 with X icon)
    const dialog = screen.getByRole("dialog");
    const closeButtons = dialog.querySelectorAll('button');
    expect(closeButtons.length).toBeGreaterThan(5);
    
    const xButton = closeButtons[5];
    expect(xButton.innerHTML).toContain('lucide-x');
    
    act(() => {
      xButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Verify page is not locked
    expect(document.body.style.pointerEvents).toBe("");
    expect(mockOnClose).toHaveBeenCalled();
  });
});
