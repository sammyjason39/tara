// src/core/services/finance/logService.ts
import { v4 as uuidv4 } from "uuid";

export type AuditLog = {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string; // ISO string
};

// Mock in-memory log store
const logs: AuditLog[] = [];

/**
 * LogService provides audit logging functionality for finance module
 */
export const logService = {
  /**
   * Create a new log entry
   */
  log: (
    tenantId: string,
    userId: string,
    action: string,
    details: string = "",
  ) => {
    const logEntry: AuditLog = {
      id: uuidv4(),
      tenantId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    logs.push(logEntry);
    console.log("[LogService] Log created:", logEntry);
    return logEntry;
  },

  /**
   * List all logs for a tenant
   * Can later be extended to filter by user, date range, or action
   */
  listLogs: (tenantId: string): AuditLog[] => {
    return (Array.isArray(logs) ? logs : []).filter((log) => log.tenantId === tenantId);
  },

  /**
   * Find logs by userId
   */
  listLogsByUser: (tenantId: string, userId: string): AuditLog[] => {
    return (Array.isArray(logs) ? logs : []).filter(
      (log) => log.tenantId === tenantId && log.userId === userId,
    );
  },

  /**
   * Clear all logs (mock only, for testing)
   */
  clearLogs: (tenantId?: string) => {
    if (tenantId) {
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].tenantId === tenantId) logs.splice(i, 1);
      }
    } else {
      logs.length = 0;
    }
  },
};
