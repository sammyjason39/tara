/**
 * Centralized API Configuration
 *
 * In development, we use the Vite proxy (/api) to avoid CORS issues.
 * In production (Render), we use the VITE_API_URL environment variable.
 */

const getApiBaseUrl = () => {
  // Check for the environment variable defined in Render/Vite/Railway
  // Standardizing on VITE_API_URL, but keeping VITE_API_BASE_URL for compatibility
  const envUrl =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  if (envUrl && envUrl !== "") {
    const sanitizedUrl = envUrl.replace(/\/$/, "");
    console.log(
      "%c[api-config] 🚀 API ROUTING ACTIVE",
      "background: #10b981; color: white; padding: 2px 4px; border-radius: 4px;",
      sanitizedUrl,
    );
    return sanitizedUrl;
  }

  // fallback to local proxy path
  console.warn(
    "%c[api-config] ⚠️ FALLBACK TO LOCAL PROXY",
    "background: #f59e0b; color: white; padding: 2px 4px; border-radius: 4px;",
    "If you are on Vercel, check that VITE_API_URL is set in Settings.",
  );
  return "/api";
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to build full API URLs
 * @param path The endpoint path (e.g., "/auth/login")
 */
export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
