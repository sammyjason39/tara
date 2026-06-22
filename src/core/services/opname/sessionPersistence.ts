import { OpnameSession } from "@/core/types/inventory/inventory";

/**
 * Storage key pattern for opname sessions.
 * Uses tenant_id to isolate sessions per tenant.
 */
const SESSION_KEY_PREFIX = "opname_session_";

/**
 * Get the localStorage key for a specific tenant's session.
 */
export const getSessionKey = (tenantId: string): string => {
  return `${SESSION_KEY_PREFIX}${tenantId}`;
};

/**
 * Save an opname session to localStorage.
 * Logs errors but does not throw to avoid blocking operations.
 */
export const saveOpnameSession = (session: OpnameSession, tenantId: string): void => {
  try {
    if (typeof window === "undefined") return;
    
    const key = getSessionKey(tenantId);
    const data = {
      ...session,
      lastUpdated: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("[OpnameSession] Failed to save session:", error);
  }
};

/**
 * Load an opname session from localStorage.
 * Returns null if no session exists or if parsing fails.
 */
export const loadOpnameSession = (tenantId: string): OpnameSession | null => {
  try {
    if (typeof window === "undefined") return null;
    
    const key = getSessionKey(tenantId);
    const data = window.localStorage.getItem(key);
    
    if (!data) return null;
    
    const session = JSON.parse(data) as OpnameSession;
    
    // Validate required fields exist
    const requiredFields = [
      "cycleId",
      "locationId",
      "entries",
      "unresolvedBarcodes",
      "anomalies",
      "newItems",
      "createdAt",
      "lastUpdated",
    ];
    
    const isValid = requiredFields.every((field) => field in session);
    if (!isValid) {
      console.warn("[OpnameSession] Invalid session structure, clearing");
      window.localStorage.removeItem(key);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("[OpnameSession] Failed to load session:", error);
    return null;
  }
};

/**
 * Clear the opname session from localStorage.
 * Logs errors but does not throw.
 */
export const clearOpnameSession = (tenantId: string): void => {
  try {
    if (typeof window === "undefined") return;
    
    const key = getSessionKey(tenantId);
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("[OpnameSession] Failed to clear session:", error);
  }
};
