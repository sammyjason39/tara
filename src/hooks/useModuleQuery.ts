/**
 * Shared TanStack Query hook patterns for all modules.
 *
 * Provides:
 * - `PaginatedResponse<T>` — standard pagination envelope matching backend response
 * - `useModuleList<T>` — paginated list query with 30s staleTime
 * - `useModuleMutation<TInput, TOutput>` — generic mutation with cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Standard paginated response envelope matching backend pagination structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface ModuleListParams {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// useModuleList
// ---------------------------------------------------------------------------

/**
 * Generic paginated list query hook.
 *
 * Uses a 30s staleTime to match the backend cache TTL, preventing unnecessary
 * refetches while keeping data reasonably fresh.
 *
 * @param endpoint - API path (e.g. "/inventory/items")
 * @param params   - Pagination and filter parameters
 * @param options  - Additional query options (enabled, etc.)
 */
export function useModuleList<T>(
  endpoint: string,
  params: ModuleListParams = {},
  options?: { enabled?: boolean }
) {
  const session = useSession();

  const queryParams = buildQueryString(params);
  const fullPath = queryParams ? `${endpoint}?${queryParams}` : endpoint;

  return useQuery<PaginatedResponse<T>, ApiError>({
    queryKey: [endpoint, params],
    queryFn: () => apiRequest<PaginatedResponse<T>>(fullPath, "GET", session),
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

// ---------------------------------------------------------------------------
// useModuleMutation
// ---------------------------------------------------------------------------

/**
 * Generic mutation hook with automatic cache invalidation on success.
 *
 * Invalidates all query keys specified in `invalidateKeys` after a successful
 * mutation, ensuring list views reflect the latest data.
 *
 * @param endpoint       - API path (e.g. "/inventory/items")
 * @param method         - HTTP method for the mutation
 * @param invalidateKeys - Query key prefixes to invalidate on success
 */
export function useModuleMutation<TInput, TOutput>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  invalidateKeys: string[]
) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<TOutput, ApiError, TInput>({
    mutationFn: (data) =>
      apiRequest<TOutput>(endpoint, method, session, data),
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQueryString(params: ModuleListParams): string {
  const parts: string[] = [];

  if (params.page != null) {
    parts.push(`page=${params.page}`);
  }
  if (params.pageSize != null) {
    parts.push(`pageSize=${params.pageSize}`);
  }
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value != null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
  }

  return parts.join("&");
}
