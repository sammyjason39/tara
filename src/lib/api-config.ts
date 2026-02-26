/**
 * Centralized API Configuration
 *
 * In development, we use the Vite proxy (/api) to avoid CORS issues.
 * In production (Render), we use the VITE_API_URL environment variable.
 */

const getApiBaseUrl = () => {
  // Check for the environment variable defined in Render/Vite
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Remove trailing slash if present
    return envUrl.replace(/\/$/, "");
  }

  // fallback to local proxy path
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
