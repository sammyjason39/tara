import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useModuleList, useModuleMutation } from "./useModuleQuery";
import type { PaginatedResponse } from "./useModuleQuery";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiRequest = vi.fn();

vi.mock("@/core/api/apiClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  ApiError: class ApiError extends Error {
    status: number;
    data: unknown;
    constructor(message: string, status: number, data: unknown = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

vi.mock("@/core/security/session", () => ({
  useSession: () => ({
    user_id: "user-1",
    tenant_id: "tenant-1",
    location_id: "loc-1",
    role: "admin",
    department_id: "dept-1",
    permissions: [],
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---------------------------------------------------------------------------
// Tests: PaginatedResponse<T> interface
// ---------------------------------------------------------------------------

describe("PaginatedResponse<T>", () => {
  it("correctly types a paginated response object", () => {
    const response: PaginatedResponse<{ id: string; name: string }> = {
      data: [{ id: "1", name: "Item 1" }],
      totalCount: 1,
      currentPage: 1,
      pageSize: 50,
      totalPages: 1,
    };

    expect(response.data).toHaveLength(1);
    expect(response.totalCount).toBe(1);
    expect(response.currentPage).toBe(1);
    expect(response.pageSize).toBe(50);
    expect(response.totalPages).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: useModuleList
// ---------------------------------------------------------------------------

describe("useModuleList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiRequest with correct endpoint and GET method", async () => {
    const mockData: PaginatedResponse<{ id: string }> = {
      data: [{ id: "1" }],
      totalCount: 1,
      currentPage: 1,
      pageSize: 50,
      totalPages: 1,
    };
    mockApiRequest.mockResolvedValueOnce(mockData);

    const { result } = renderHook(
      () => useModuleList<{ id: string }>("/inventory/items"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/inventory/items",
      "GET",
      expect.objectContaining({ user_id: "user-1", tenant_id: "tenant-1" })
    );
    expect(result.current.data).toEqual(mockData);
  });

  it("appends page and pageSize as query params", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [],
      totalCount: 0,
      currentPage: 2,
      pageSize: 20,
      totalPages: 0,
    });

    const { result } = renderHook(
      () => useModuleList("/items", { page: 2, pageSize: 20 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/items?page=2&pageSize=20",
      "GET",
      expect.any(Object)
    );
  });

  it("appends filters as query params", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const { result } = renderHook(
      () => useModuleList("/items", { filters: { status: "active", category: "electronics" } }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledPath = mockApiRequest.mock.calls[0][0] as string;
    expect(calledPath).toContain("status=active");
    expect(calledPath).toContain("category=electronics");
  });

  it("does not fetch when enabled is false", async () => {
    renderHook(
      () => useModuleList("/items", {}, { enabled: false }),
      { wrapper: createWrapper() }
    );

    // Wait a tick to make sure no call is made
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: useModuleMutation
// ---------------------------------------------------------------------------

describe("useModuleMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiRequest with correct method and body on mutate", async () => {
    const mockResponse = { id: "new-1", name: "Created" };
    mockApiRequest.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useModuleMutation<{ name: string }, { id: string; name: string }>(
        "/items",
        "POST",
        ["/items"]
      ),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ name: "Created" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/items",
      "POST",
      expect.objectContaining({ user_id: "user-1" }),
      { name: "Created" }
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it("supports PUT method", async () => {
    mockApiRequest.mockResolvedValueOnce({ id: "1", name: "Updated" });

    const { result } = renderHook(
      () => useModuleMutation<{ name: string }, { id: string; name: string }>(
        "/items/1",
        "PUT",
        ["/items"]
      ),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ name: "Updated" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/items/1",
      "PUT",
      expect.any(Object),
      { name: "Updated" }
    );
  });

  it("supports DELETE method", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(
      () => useModuleMutation<{ id: string }, { success: boolean }>(
        "/items/1",
        "DELETE",
        ["/items"]
      ),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ id: "1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/items/1",
      "DELETE",
      expect.any(Object),
      { id: "1" }
    );
  });

  it("invalidates specified query keys on success", async () => {
    mockApiRequest.mockResolvedValueOnce({ id: "1" });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(
      () => useModuleMutation<{ name: string }, { id: string }>(
        "/items",
        "POST",
        ["/items", "/inventory/balances"]
      ),
      { wrapper }
    );

    result.current.mutate({ name: "Test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["/items"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["/inventory/balances"] });
  });
});
