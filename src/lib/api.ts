const BASE = "/api";

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("tara-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("tara-token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchAuthenticatedBlobUrl(path: string): Promise<string> {
  const token = localStorage.getItem("tara-token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    localStorage.removeItem("tara-token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`Failed to load resource: ${res.status}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T = any>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
