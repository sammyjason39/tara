import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  QueryStateWrapper,
  LoadingSpinner,
  QueryErrorState,
  QueryEmptyState,
  QUERY_TIMEOUT_MS,
} from "./QueryStateWrapper";

describe("LoadingSpinner", () => {
  it("renders immediately with role=status and aria-busy", () => {
    render(<LoadingSpinner />);
    const el = screen.getByTestId("loading-spinner");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-busy", "true");
  });

  it("has an accessible label via sr-only text", () => {
    render(<LoadingSpinner label="Fetching records" />);
    expect(screen.getByText("Fetching records")).toBeInTheDocument();
  });
});

describe("QueryErrorState", () => {
  it("renders with role=alert and displays error message", () => {
    render(<QueryErrorState message="Network failed" onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network failed")).toBeInTheDocument();
  });

  it("renders retry button that calls onRetry", () => {
    const onRetry = vi.fn();
    render(<QueryErrorState message="Oops" onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<QueryErrorState message="Oops" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("QueryEmptyState", () => {
  it("renders descriptive empty message", () => {
    render(<QueryEmptyState message="No payments found" />);
    expect(screen.getByTestId("query-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No payments found")).toBeInTheDocument();
  });

  it("uses default message when none provided", () => {
    render(<QueryEmptyState />);
    expect(
      screen.getByText("No records are available for this view."),
    ).toBeInTheDocument();
  });
});

describe("QueryStateWrapper", () => {
  const defaultProps = {
    isLoading: false,
    isError: false,
    isEmpty: false,
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children when data is available (not loading, not error, not empty)", () => {
    render(
      <QueryStateWrapper {...defaultProps}>
        <div>Real Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByText("Real Content")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("query-error-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("query-empty-state")).not.toBeInTheDocument();
  });

  it("renders LoadingSpinner when isLoading is true", () => {
    render(
      <QueryStateWrapper {...defaultProps} isLoading={true}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders ErrorState when isError is true", () => {
    const error = { message: "Server error", status: 500, name: "ApiError" } as any;
    render(
      <QueryStateWrapper {...defaultProps} isError={true} error={error}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByTestId("query-error-state")).toBeInTheDocument();
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders ErrorState with retry button that calls onRetry", () => {
    const onRetry = vi.fn();
    render(
      <QueryStateWrapper {...defaultProps} isError={true} onRetry={onRetry}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    const btn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders EmptyState when isEmpty is true", () => {
    render(
      <QueryStateWrapper {...defaultProps} isEmpty={true}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByTestId("query-empty-state")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders EmptyState with custom message", () => {
    render(
      <QueryStateWrapper
        {...defaultProps}
        isEmpty={true}
        emptyMessage="No invoices available"
      >
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByText("No invoices available")).toBeInTheDocument();
  });

  it("error takes precedence over loading", () => {
    render(
      <QueryStateWrapper {...defaultProps} isLoading={true} isError={true}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByTestId("query-error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  it("switches to error state after 30s timeout (Requirement 9.7)", () => {
    render(
      <QueryStateWrapper {...defaultProps} isLoading={true}>
        <div>Content</div>
      </QueryStateWrapper>,
    );
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(QUERY_TIMEOUT_MS + 1);
    });

    expect(screen.getByTestId("query-error-state")).toBeInTheDocument();
    expect(
      screen.getByText(/timed out after 30 seconds/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("resets timeout when loading completes", () => {
    const { rerender } = render(
      <QueryStateWrapper {...defaultProps} isLoading={true}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    // Data arrives before timeout
    rerender(
      <QueryStateWrapper {...defaultProps} isLoading={false}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    // Advance past what would have been the timeout
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    // Should show content, not error
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByTestId("query-error-state")).not.toBeInTheDocument();
  });

  it("retry resets timeout state and calls onRetry", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <QueryStateWrapper {...defaultProps} isLoading={true} onRetry={onRetry}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    // Timeout fires
    act(() => {
      vi.advanceTimersByTime(QUERY_TIMEOUT_MS + 1);
    });

    expect(screen.getByTestId("query-error-state")).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // After retry, re-render with loading=true to simulate refetch
    rerender(
      <QueryStateWrapper {...defaultProps} isLoading={true} onRetry={onRetry}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    // Should be back to loading (timeout was reset)
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("supports custom timeoutMs", () => {
    render(
      <QueryStateWrapper {...defaultProps} isLoading={true} timeoutMs={5000}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByTestId("query-error-state")).toBeInTheDocument();
  });

  it("does not timeout when timeoutMs is 0", () => {
    render(
      <QueryStateWrapper {...defaultProps} isLoading={true} timeoutMs={0}>
        <div>Content</div>
      </QueryStateWrapper>,
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    // Should still show loading, not error
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("exports QUERY_TIMEOUT_MS as 30000", () => {
    expect(QUERY_TIMEOUT_MS).toBe(30_000);
  });
});
