import { SessionContext } from "@/core/security/session";
import { API_BASE_URL } from "@/lib/api-config";

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public data: any = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions {
  responseType?: "json" | "blob";
  correlationId?: string;
  tenantId?: string;
}

export async function apiRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  session?: SessionContext | null,
  body?: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { responseType = "json", correlationId, tenantId } = options;
  
  const headers: Record<string, string> = {};

  // For FormData, we let the browser set the Content-Type with boundary
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (correlationId) {
    headers["x-correlation-id"] = correlationId;
  }

  // Support JV Mirror Mode via localStorage
  const jvContextStr = localStorage.getItem('zenvix_jv_context');
  let jvContext = null;
  try {
    if (jvContextStr) jvContext = JSON.parse(jvContextStr);
  } catch (e) {
    console.error("Failed to parse JV context", e);
  }

  const finalTenantId = tenantId || jvContext?.hostTenantId || session?.tenant_id;
  if (finalTenantId) {
    headers["x-tenant-id"] = finalTenantId;
  }

  if (jvContext?.branchId) {
    headers["x-branch-id"] = jvContext.branchId;
  }

  if (session) {
    headers["x-actor-id"] = session.user_id;
    headers["x-user-role"] = session.role;
    if (session.location_id) {
      headers["x-location-id"] = session.location_id;
    }
    if (session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
  }

  console.log(`[apiClient] Request: ${method} ${API_BASE_URL}${path}`, {
    tenantHeader: headers["x-tenant-id"],
    hasAuth: !!headers["Authorization"],
    responseType
  });

  const fetchBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: fetchBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.detail ||
      errorData.message ||
      `API request failed with status ${response.status}`;

    console.error(
      `[apiClient] Error ${response.status}: ${message}`,
      errorData,
    );
    throw new ApiError(message, response.status, errorData);
  }

  if (responseType === "blob") {
    return (await response.blob()) as unknown as T;
  }

  const result = await response.json().catch(() => ({}));

  // 🛡️ DEFENSIVE MAPPING GATES
  // If the result contains data AND meta (pagination), merge them if possible or return root
  if (result && typeof result === "object") {
    const hasData = result.data !== undefined;
    const hasMeta = result.meta !== undefined;

    if (hasData && hasMeta) {
      if (Array.isArray(result.data)) {
        // Return the array with meta attached to match the frontend "paginated array" pattern
        return Object.assign(result.data, { meta: result.meta }) as T;
      }
      return (result.data || {}) as T;
    }
    
    if (hasData) {
      // If data is null or undefined, but exists, return a safe fallback based on expected type T
      return (result.data ?? {}) as T;
    }
  }

  // Ensure we never return undefined for a successful response
  return (result ?? {}) as T;
}
