import { render, screen, fireEvent } from "@testing-library/react";
import { QueryBoundary, DEFAULT_QUERY_WATCHDOG_MS } from "./QueryBoundary";

// Mock @tanstack/react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

describe("QueryBoundary", () => {
  const mockRefetch = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders LoadingSkeleton while isLoading is true", () => {
    const mockQuery = {
      isLoading: true,
      isError: false,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders ErrorState when isError is true", () => {
    const mockQuery = {
      isLoading: false,
      isError: true,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't load this data/i)).toBeInTheDocument();
  });

  it("renders ErrorState when watchdog expires", async () => {
    jest.useFakeTimers();

    const mockQuery = {
      isLoading: true,
      isError: false,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any} watchdogMs={1000}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();

    // Fast-forward time past watchdog deadline
    jest.advanceTimersByTime(1001);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't load this data/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("calls refetch on retry", () => {
    const mockQuery = {
      isLoading: false,
      isError: true,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders EmptyState when data is null", () => {
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/Nothing here yet/i)).toBeInTheDocument();
  });

  it("renders EmptyState when data is undefined", () => {
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: undefined,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders EmptyState when data is empty array", () => {
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: [],
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders populated content when data is present", () => {
    const mockData = { id: 1, name: "Test Item" };
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: mockData,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content: {JSON.stringify(data)}</div>}
      </QueryBoundary>
    );

    expect(screen.getByText(/Content: {.*"id":1,"name":"Test Item".*}/i)).toBeInTheDocument();
    expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("renders custom loading component", () => {
    const mockQuery = {
      isLoading: true,
      isError: false,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any} loading={<div>Custom Loading</div>}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );

    expect(screen.getByText("Custom Loading")).toBeInTheDocument();
  });

  it("renders custom empty component", () => {
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: [],
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any} empty={<div>Custom Empty</div>}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );

    expect(screen.getByText("Custom Empty")).toBeInTheDocument();
  });

  it("renders custom error component", () => {
    const mockQuery = {
      isLoading: false,
      isError: true,
      data: null,
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary query={mockQuery as any} error={<div>Custom Error</div>}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );

    expect(screen.getByText("Custom Error")).toBeInTheDocument();
  });

  it("uses custom isEmpty function", () => {
    const mockQuery = {
      isLoading: false,
      isError: false,
      data: { count: 0 },
      refetch: mockRefetch,
    };

    render(
      <QueryBoundary 
        query={mockQuery as any} 
        isEmpty={(data) => (data as any).count === 0}
      >
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("total mapping: only one state renders at a time", () => {
    // Test loading state
    let mockQuery = {
      isLoading: true,
      isError: false,
      data: null,
      refetch: mockRefetch,
    };
    const { container: container1 } = render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );
    
    expect(container1.querySelector("[data-testid='loading-skeleton']")).toBeInTheDocument();
    expect(container1.querySelector("[data-testid='empty-state']")).not.toBeInTheDocument();
    expect(container1.querySelector("[data-testid='error-state']")).not.toBeInTheDocument();

    // Test error state
    mockQuery = {
      isLoading: false,
      isError: true,
      data: null,
      refetch: mockRefetch,
    };
    const { container: container2 } = render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );
    
    expect(container2.querySelector("[data-testid='loading-skeleton']")).not.toBeInTheDocument();
    expect(container2.querySelector("[data-testid='empty-state']")).not.toBeInTheDocument();
    expect(container2.querySelector("[data-testid='error-state']")).toBeInTheDocument();

    // Test populated state
    mockQuery = {
      isLoading: false,
      isError: false,
      data: { id: 1 },
      refetch: mockRefetch,
    };
    const { container: container3 } = render(
      <QueryBoundary query={mockQuery as any}>
        {(data) => <div>Content</div>}
      </QueryBoundary>
    );
    
    expect(container3.querySelector("[data-testid='loading-skeleton']")).not.toBeInTheDocument();
    expect(container3.querySelector("[data-testid='empty-state']")).not.toBeInTheDocument();
    expect(container3.querySelector("[data-testid='error-state']")).not.toBeInTheDocument();
    expect(container3.getByText("Content")).toBeInTheDocument();
  });
});