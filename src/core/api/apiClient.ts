import { SessionContext } from "@/core/security/session";
import { API_BASE_URL } from "@/lib/api-config";

export async function apiRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  session?: SessionContext,
  body?: unknown,
  tenantId?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const finalTenantId = tenantId || session?.tenantId;
  if (finalTenantId) {
    // Map tenant-demo to comp-demo-a for backend consistency
    headers["x-tenant-id"] =
      finalTenantId === "tenant-demo" ? "comp-demo-a" : finalTenantId;
  }

  if (session) {
    headers["x-actor-id"] = session.userId;
    headers["x-user-role"] = session.role;
    if (session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed with status ${response.status}`,
    );
  }

  const result = await response.json();
  return result.data as T;
}
