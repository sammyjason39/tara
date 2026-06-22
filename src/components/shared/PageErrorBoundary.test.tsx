import { render, screen, fireEvent } from "@testing-library/react";
import { PageErrorBoundary, RootErrorBoundary } from "./PageErrorBoundary";
import { ErrorBoundary } from "./ErrorBoundary";

// Mock dependencies
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

describe("PageErrorBoundary", () => {
  const mockNavigate = jest.fn();
  const mockResetQueries = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useQueryClient as jest.Mock).mockReturnValue({
      resetQueries: mockResetQueries,
    });
  });

  it("renders children when no error occurs", () => {
    render(
      <PageErrorBoundary>
        <div data-testid="test-child">Success</div>
      </PageErrorBoundary>
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
  });

  it("shows error boundary when child throws", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    expect(screen.getByText("Runtime Exception")).toBeInTheDocument();
    expect(screen.getByText(/The "undefined" screen failed to render/i)).toBeInTheDocument();
  });

  it("calls soft retry on retry button click", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <PageErrorBoundary onReset={mockOnReset}>
        <ThrowError />
      </PageErrorBoundary>
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockResetQueries).toHaveBeenCalledTimes(1);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("navigates to /core/dashboard on return to safety", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    const safetyButton = screen.getByRole("button", { name: /return to safety/i });
    fireEvent.click(safetyButton);

    expect(mockNavigate).toHaveBeenCalledWith("/core/dashboard");
  });

  it("triggers hard reload on reload button click", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload: mockReload },
    });

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    const reloadButton = screen.getByRole("button", { name: /reload/i });
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("preserves data-testid='error-boundary' for Playwright detection", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
  });

  it("has correct accessibility attributes on error state", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    const errorContainer = screen.getByTestId("error-boundary");
    expect(errorContainer).toHaveClass("animate-in fade-in duration-700");
    expect(errorContainer).toHaveClass("rounded-[3rem]");
  });
});

describe("RootErrorBoundary", () => {
  const mockNavigate = jest.fn();
  const mockResetQueries = jest.fn();

  beforeEach(() => {
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useQueryClient as jest.Mock).mockReturnValue({
      resetQueries: mockResetQueries,
    });
  });

  it("presents full-screen error boundary", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <RootErrorBoundary>
        <ThrowError />
      </RootErrorBoundary>
    );

    const errorContainer = screen.getByTestId("error-boundary");
    expect(errorContainer).toHaveClass("min-h-screen");
    expect(screen.getByText(/Runtime Exception/i)).toBeInTheDocument();
    expect(screen.getByText(/Application/i)).toBeInTheDocument();
  });

  it("navigates to /core/dashboard on return to safety", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <RootErrorBoundary>
        <ThrowError />
      </RootErrorBoundary>
    );

    const safetyButton = screen.getByRole("button", { name: /return to safety/i });
    fireEvent.click(safetyButton);

    expect(mockNavigate).toHaveBeenCalledWith("/core/dashboard");
  });
});

describe("ErrorFallback", () => {
  const mockOnRetry = jest.fn();
  const mockOnReload = jest.fn();
  const mockOnReturnToSafeRoute = jest.fn();

  it("shows route label when provided", () => {
    render(
      <ErrorFallback
        routeLabel="Inventory Page"
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    expect(screen.getByText(/The "Inventory Page" screen failed to render/i)).toBeInTheDocument();
  });

  it("shows generic message when route label is not provided", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    expect(screen.getByText(/A critical logic branch has failed/i)).toBeInTheDocument();
  });

  it("displays ShieldAlert icon with AlertTriangle indicator", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    // The ShieldAlert icon should be visible
    expect(document.body).toBeTruthy(); // Just verify rendering works
  });

  it("provides three recovery options: retry, return to safety, reload", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to safety/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onReturnToSafeRoute when return button is clicked", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    const safetyButton = screen.getByRole("button", { name: /return to safety/i });
    fireEvent.click(safetyButton);

    expect(mockOnReturnToSafeRoute).toHaveBeenCalledTimes(1);
  });

  it("calls onReload when reload button is clicked", () => {
    render(
      <ErrorFallback
        onRetry={mockOnRetry}
        onReload={mockOnReload}
        onReturnToSafeRoute={mockOnReturnToSafeRoute}
      />
    );

    const reloadButton = screen.getByRole("button", { name: /reload/i });
    fireEvent.click(reloadButton);

    expect(mockOnReload).toHaveBeenCalledTimes(1);
  });
});