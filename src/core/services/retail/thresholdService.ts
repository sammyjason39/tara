import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";

export interface OperationalThreshold {
  id: string;
  metric: "REVENUE_MIN" | "STAFFING_MIN" | "LATENCY_MAX" | "ORDER_SURGE_MAX";
  value: number;
  unit: "currency" | "count" | "ms" | "percent";
  status: "NORMAL" | "WARNING" | "CRITICAL";
}

export interface ThresholdViolation {
  id: string;
  thresholdId: string;
  currentValue: number;
  timestamp: string;
  severity: "HIGH" | "CRITICAL";
  message: string;
}

export const thresholdService = {
  /**
   * Fetch all thresholds for the current tenant/location
   */
  async getThresholds(session: SessionContext, locationId?: string): Promise<OperationalThreshold[]> {
    return apiRequest<OperationalThreshold[]>(
      `/v1/retail/governance/thresholds?locationId=${locationId || ""}`, 
      "GET", 
      session
    );
  },

  /**
   * Update a specific operational threshold
   */
  async updateThreshold(
    session: SessionContext, 
    thresholdId: string, 
    value: number
  ): Promise<OperationalThreshold> {
    return apiRequest<OperationalThreshold>(
      `/v1/retail/governance/thresholds/${thresholdId}`, 
      "PATCH", 
      session, 
      { value }
    );
  },

  /**
   * Get active violations across the global network
   */
  async getActiveViolations(session: SessionContext): Promise<ThresholdViolation[]> {
    return apiRequest<ThresholdViolation[]>("/v1/retail/governance/violations", "GET", session);
  },

  /**
   * Resolve a violation and dismiss the alert
   */
  async resolveViolation(session: SessionContext, violationId: string, resolution: string): Promise<boolean> {
    return apiRequest<{ success: boolean }>(
      `/v1/retail/governance/violations/${violationId}/resolve`, 
      "POST", 
      session, 
      { resolution }
    ).then(res => res.success);
  }
};
